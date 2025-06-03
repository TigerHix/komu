import { Elysia } from 'elysia'
import { ocrQueue } from '../lib/ocr-queue'
import { prisma } from '../lib/db'

export const ocrManagementRoutes = new Elysia({ prefix: '/api' })
  .get('/ocr/progress', async () => {
    return ocrQueue.getProgress()
  })
  
  .post('/ocr/pause', async () => {
    ocrQueue.pause()
    return { success: true, message: 'OCR processing paused' }
  })
  
  .post('/ocr/resume', async () => {
    ocrQueue.resume()
    return { success: true, message: 'OCR processing resumed' }
  })
  
  .post('/ocr/prioritize/:pageId', async ({ params }) => {
    ocrQueue.setPriority(params.pageId)
    return { success: true, message: 'Page prioritized for OCR' }
  })
  
  .get('/ocr/page/:pageId/status', async ({ params }) => {
    const page = await prisma.page.findUnique({
      where: { id: params.pageId },
      select: { ocrStatus: true, ocrStartedAt: true, ocrCompletedAt: true }
    })
    
    if (!page) {
      throw new Error('Page not found')
    }
    
    return page
  })
  
  .get('/ocr/page/:pageId/results', async ({ params }) => {
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
  
  .post('/ocr/retry/:pageId', async ({ params }) => {
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
    ocrQueue.addPage(page.id, page.mangaId, page.pageNum, page.imagePath, 'high')
    
    return { success: true, message: 'Page queued for retry' }
  })

  .post('/ocr/retry-failed', async () => {
    // Get all failed pages
    const failedPages = await prisma.page.findMany({
      where: { ocrStatus: 'FAILED' },
      select: {
        id: true,
        mangaId: true,
        pageNum: true,
        imagePath: true
      }
    })

    if (failedPages.length === 0) {
      return { success: true, message: 'No failed pages to retry', retriedCount: 0 }
    }

    // Reset all failed pages to pending
    await prisma.page.updateMany({
      where: { ocrStatus: 'FAILED' },
      data: { 
        ocrStatus: 'PENDING',
        ocrStartedAt: null,
        ocrCompletedAt: null
      }
    })

    // Clear existing text blocks for failed pages
    await prisma.textBlock.deleteMany({
      where: { 
        pageId: { 
          in: failedPages.map(p => p.id) 
        } 
      }
    })

    // Add all failed pages back to queue with high priority
    for (const page of failedPages) {
      ocrQueue.addPage(page.id, page.mangaId, page.pageNum, page.imagePath, 'high')
    }

    // Clear any existing completion status
    await prisma.ocrCompletionStatus.updateMany({
      where: { status: 'unread' },
      data: { status: 'dismissed' }
    })

    return { 
      success: true, 
      message: `${failedPages.length} failed pages queued for retry`,
      retriedCount: failedPages.length
    }
  })
  
  .get('/ocr/concurrency', async () => {
    return {
      current: ocrQueue.getConcurrency(),
      max: ocrQueue.getMaxConcurrency()
    }
  })
  
  .post('/ocr/concurrency/:value', async ({ params }) => {
    const value = parseInt(params.value)
    if (isNaN(value) || value < 1) {
      throw new Error('Invalid concurrency value')
    }
    
    ocrQueue.setConcurrency(value)
    return { 
      success: true, 
      message: `Concurrency set to ${value}`,
      current: ocrQueue.getConcurrency()
    }
  })