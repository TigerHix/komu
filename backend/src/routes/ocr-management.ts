import { Elysia } from 'elysia'
import { ocrQueue } from '../lib/ocr-queue'
import { prisma } from '../lib/db'

export const ocrManagementRoutes = new Elysia({ prefix: '/api/ocr/queue' })
  .get('/progress', async () => {
    return ocrQueue.getProgress()
  })
  
  .post('/pause', async () => {
    ocrQueue.pause()
    return { success: true, message: 'OCR processing paused' }
  })
  
  .post('/resume', async () => {
    ocrQueue.resume()
    return { success: true, message: 'OCR processing resumed' }
  })
  
  .post('/retry-failed', async () => {
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
  
  .get('/concurrency', async () => {
    return {
      current: ocrQueue.getConcurrency(),
      max: ocrQueue.getMaxConcurrency()
    }
  })
  
  .put('/concurrency/:value', async ({ params }) => {
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