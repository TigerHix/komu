import { Elysia } from 'elysia'
import { ocrQueue } from '../lib/ocr-queue'
import { prisma } from '../lib/db'

export const readerRoutes = new Elysia({ prefix: '/api' })
  .post('/reader/view-page/:pageId', async ({ params }) => {
    // Called when user views a page for 1+ seconds
    const page = await prisma.page.findUnique({
      where: { id: params.pageId },
      select: { 
        id: true, 
        mangaId: true, 
        pageNum: true, 
        imagePath: true, 
        ocrStatus: true 
      }
    })
    
    if (!page) {
      throw new Error('Page not found')
    }
    
    // If page is not yet OCR'd, prioritize it
    if (page.ocrStatus === 'PENDING') {
      ocrQueue.addPage(page.id, page.mangaId, page.pageNum, page.imagePath, 'high')
    } else if (page.ocrStatus === 'FAILED') {
      // Also prioritize failed pages that user is viewing
      ocrQueue.addPage(page.id, page.mangaId, page.pageNum, page.imagePath, 'high')
    }
    
    return { success: true, status: page.ocrStatus }
  })