import { Elysia } from 'elysia'
import { ocrQueue } from '../lib/ocr-queue'
import { prisma } from '../lib/db'

export const pagesRoutes = new Elysia({ prefix: '/api/pages' })
  .post('/:pageId/view', async ({ params }) => {
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
      await ocrQueue.addPage(page.id, page.mangaId, page.pageNum, page.imagePath, 'high')
    } else if (page.ocrStatus === 'FAILED') {
      // Also prioritize failed pages that user is viewing
      await ocrQueue.addPage(page.id, page.mangaId, page.pageNum, page.imagePath, 'high')
    }
    
    return { success: true, status: page.ocrStatus }
  })

  .post('/:pageId/ocr/priority', async ({ params }) => {
    ocrQueue.setPriority(params.pageId)
    return { success: true, message: 'Page prioritized for OCR' }
  })
  
  .get('/:pageId/ocr/status', async ({ params }) => {
    const page = await prisma.page.findUnique({
      where: { id: params.pageId },
      select: { ocrStatus: true, ocrStartedAt: true, ocrCompletedAt: true }
    })
    
    if (!page) {
      throw new Error('Page not found')
    }
    
    return page
  })
  
  .get('/:pageId/ocr/results', async ({ params }) => {
    const page = await prisma.page.findUnique({
      where: { id: params.pageId },
      include: {
        textBlocks: true
      }
    })
    
    if (!page) {
      throw new Error('Page not found')
    }
    
    // Parse JSON fields back to objects
    const textBlocks = page.textBlocks.map(block => ({
      ...block,
      bbox: JSON.parse(block.bbox),
      textLines: JSON.parse(block.textLines)
    }))
    
    return {
      ocrStatus: page.ocrStatus,
      textBlocks,
      imageSize: page.imageWidth && page.imageHeight ? {
        width: page.imageWidth,
        height: page.imageHeight
      } : null
    }
  })
  
  .post('/:pageId/ocr/retry', async ({ params }) => {
    // Reset failed page to pending and add back to queue
    const page = await prisma.page.findUnique({
      where: { id: params.pageId }
    })
    
    if (!page) {
      throw new Error('Page not found')
    }
    
    if (page.ocrStatus !== 'FAILED') {
      throw new Error('Page is not in failed state')
    }
    
    await prisma.page.update({
      where: { id: params.pageId },
      data: { 
        ocrStatus: 'PENDING',
        ocrStartedAt: null,
        ocrCompletedAt: null
      }
    })
    
    // Clear any existing text blocks
    await prisma.textBlock.deleteMany({
      where: { pageId: params.pageId }
    })
    
    // Add back to queue with high priority
    await ocrQueue.addPage(page.id, page.mangaId, page.pageNum, page.imagePath, 'high')
    
    return { success: true, message: 'Page queued for retry' }
  })