import { Elysia, t } from 'elysia'
import { prisma } from '../lib/db'
import { processPdf } from '../lib/pdf-processor'
import { ocrQueue } from '../lib/ocr-queue'
import { promises as fs } from 'fs'
import path from 'path'

export const uploadRoutes = new Elysia({ prefix: '/api' })
  .post('/upload', async ({ body }) => {
    console.log('Uploading file started')
    const { file } = body as { file: File }
    
    if (!file || file.type !== 'application/pdf') {
      throw new Error('Please upload a PDF file')
    }

    // Create unique manga ID
    const mangaId = `manga_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    // Save uploaded PDF temporarily
    const tempPath = path.join('uploads', 'temp', `${mangaId}.pdf`)
    await fs.mkdir(path.dirname(tempPath), { recursive: true })
    
    const arrayBuffer = await file.arrayBuffer()
    await fs.writeFile(tempPath, new Uint8Array(arrayBuffer))

    try {
      console.log('Processing PDF upload:', file.name, 'Size:', file.size)
      // Process PDF to images
      const imagePaths = await processPdf(tempPath, mangaId)
      
      // Get filename without extension for title
      const title = file.name.replace(/\.pdf$/i, '')
      
      // Create manga record
      const manga = await prisma.manga.create({
        data: {
          id: mangaId,
          title,
          type: 'Volume',
          thumbnail: imagePaths[0] ? `/uploads/${mangaId}/page-1.jpg` : null,
          pages: {
            create: imagePaths.map((imagePath, index) => ({
              pageNum: index + 1,
              imagePath: `/uploads/${mangaId}/page-${index + 1}.jpg`,
              ocrStatus: 'PENDING'
            }))
          }
        },
        include: {
          pages: true
        }
      })

      // Queue all pages for OCR processing
      for (const page of manga.pages) {
        ocrQueue.addPage(page.id, page.mangaId, page.pageNum, page.imagePath, 'normal')
      }

      return {
        id: manga.id,
        title: manga.title,
        thumbnail: manga.thumbnail
      }
    } catch (error: any) {
      console.error('Error processing upload:', error)
      
      // Clean up files on error
      try {
        await fs.unlink(tempPath)
      } catch (cleanupError) {
        console.error('Failed to cleanup temp file:', cleanupError)
      }
      
      if (error.message?.includes('GraphicsMagick/ImageMagick')) {
        throw new Error('ImageMagick is not installed. Please install it with: sudo apt install imagemagick')
      }
      
      throw new Error('Failed to process PDF: ' + error.message)
    }
  }, {
    body: t.Object({
      file: t.File()
    }),
    type: 'formdata'
  })