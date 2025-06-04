import { Elysia } from 'elysia'
import { prisma } from '../lib/db'
import { ocrQueue } from '../lib/ocr-queue'
import { promises as fs } from 'fs'
import path from 'path'

export const mangaRoutes = new Elysia({ prefix: '/api' })
  .get('/manga', async () => {
    const manga = await prisma.manga.findMany({
      orderBy: [
        { lastReadAt: { sort: 'desc', nulls: 'last' } },
        { createdAt: 'desc' }
      ],
      select: {
        id: true,
        title: true,
        type: true,
        number: true,
        author: true,
        thumbnail: true,
        currentPage: true,
        lastReadAt: true,
        createdAt: true,
        _count: {
          select: { pages: true }
        }
      }
    })
    
    return manga.map(m => ({
      ...m,
      totalPages: m._count.pages,
      progressPercent: m._count.pages > 0 ? Math.round((m.currentPage / m._count.pages) * 100) : 0
    }))
  })
  
  .get('/manga/:id', async ({ params }) => {
    const manga = await prisma.manga.findUnique({
      where: { id: params.id },
      include: {
        pages: {
          orderBy: { pageNum: 'asc' },
          select: {
            id: true,
            pageNum: true,
            imagePath: true,
            ocrStatus: true
          }
        }
      }
    })
    
    if (!manga) {
      throw new Error('Manga not found')
    }
    
    return manga
  })
  
  .delete('/manga/:id', async ({ params }) => {
    const manga = await prisma.manga.findUnique({
      where: { id: params.id },
      include: {
        pages: true
      }
    })
    
    if (!manga) {
      throw new Error('Manga not found')
    }
    
    // Delete manga directory and all images
    const uploadDir = path.join('uploads', params.id)
    try {
      await fs.rm(uploadDir, { recursive: true, force: true })
    } catch (error) {
      console.warn(`Failed to delete upload directory ${uploadDir}:`, error)
    }
    
    // Delete from database (pages will be deleted automatically due to cascade)
    await prisma.manga.delete({
      where: { id: params.id }
    })
    
    return { success: true, message: 'Manga deleted successfully' }
  })

  .post('/manga/:id/remove-ocr', async ({ params }) => {
    // Get all pages for this manga
    const pages = await prisma.page.findMany({
      where: { mangaId: params.id },
      select: { id: true }
    })

    if (pages.length === 0) {
      return { success: true, message: 'No pages found for this manga' }
    }

    // Delete all text blocks for these pages
    await prisma.textBlock.deleteMany({
      where: { 
        pageId: { 
          in: pages.map(p => p.id) 
        } 
      }
    })

    // Reset all pages to PENDING status
    await prisma.page.updateMany({
      where: { mangaId: params.id },
      data: {
        ocrStatus: 'PENDING',
        ocrStartedAt: null,
        ocrCompletedAt: null,
        imageWidth: null,
        imageHeight: null
      }
    })

    // Add all pages back to the OCR queue
    const allPages = await prisma.page.findMany({
      where: { mangaId: params.id },
      select: { 
        id: true, 
        mangaId: true, 
        pageNum: true, 
        imagePath: true 
      },
      orderBy: { pageNum: 'asc' }
    })

    for (const page of allPages) {
      ocrQueue.addPage(page.id, page.mangaId, page.pageNum, page.imagePath, 'normal')
    }

    return { 
      success: true, 
      message: `OCR data removed for ${pages.length} pages. They will be re-processed automatically.`,
      pageCount: pages.length
    }
  })

  .put('/manga/:id/last-read', async ({ params }) => {
    // Update last read timestamp when manga is opened
    const manga = await prisma.manga.findUnique({
      where: { id: params.id }
    })
    
    if (!manga) {
      throw new Error('Manga not found')
    }
    
    await prisma.manga.update({
      where: { id: params.id },
      data: { lastReadAt: new Date() }
    })
    
    return { success: true }
  })

  .put('/manga/:id/progress', async ({ params, body }) => {
    const { currentPage } = body as { currentPage: number }
    
    if (typeof currentPage !== 'number' || currentPage < 0) {
      throw new Error('Invalid currentPage value')
    }
    
    // Verify manga exists and currentPage is within valid range
    const manga = await prisma.manga.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: { pages: true }
        }
      }
    })
    
    if (!manga) {
      throw new Error('Manga not found')
    }
    
    if (currentPage >= manga._count.pages) {
      throw new Error('currentPage exceeds total pages')
    }
    
    // Update reading progress and last read timestamp
    await prisma.manga.update({
      where: { id: params.id },
      data: { 
        currentPage,
        lastReadAt: new Date()
      }
    })
    
    return { 
      success: true, 
      currentPage,
      progressPercent: Math.round((currentPage / manga._count.pages) * 100)
    }
  })