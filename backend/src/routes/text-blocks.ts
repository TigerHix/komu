import { Elysia, t } from 'elysia'
import { prisma } from '../lib/db'

export const textBlocksRoutes = new Elysia({ prefix: '/api/text-blocks' })
  .put('/:id', async ({ params, body, set }) => {
    try {
      const { id } = params
      const { text } = body as { text: string }

      if (!text || text.trim() === '') {
        set.status = 400
        return { error: 'Text is required' }
      }

      // Update the text block in the database
      const updatedTextBlock = await prisma.textBlock.update({
        where: { id },
        data: { text: text.trim() }
      })

      return { success: true, textBlock: updatedTextBlock }
    } catch (error) {
      console.error('Failed to update text block:', error)
      set.status = 500
      return { error: 'Failed to update text block' }
    }
  }, {
    params: t.Object({
      id: t.String()
    }),
    body: t.Object({
      text: t.String()
    })
  })