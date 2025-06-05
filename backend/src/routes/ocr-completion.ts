import { Elysia } from 'elysia'
import { prisma } from '../lib/db'

export const ocrCompletionRoutes = new Elysia({ prefix: '/api/notifications' })
  .get('/ocr-completion', async () => {
    // Get the most recent unread completion status
    const status = await prisma.ocrCompletionStatus.findFirst({
      where: { status: 'unread' },
      orderBy: { createdAt: 'desc' }
    })

    return status
  })

  .delete('/ocr-completion', async () => {
    // Mark all unread completion statuses as dismissed
    await prisma.ocrCompletionStatus.updateMany({
      where: { status: 'unread' },
      data: { status: 'dismissed' }
    })

    return { success: true, message: 'Completion status dismissed' }
  })