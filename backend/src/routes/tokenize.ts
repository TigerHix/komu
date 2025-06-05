import { Elysia, t } from 'elysia'
import { ichiranService } from '../lib/ichiran-service'

export const tokenizeRoutes = new Elysia({ prefix: '/api/japanese' })
  .post('/tokenize', async ({ body }) => {
    const { text } = body
    
    if (!text || typeof text !== 'string') {
      throw new Error('Text is required')
    }

    if (text.trim().length === 0) {
      throw new Error('Text cannot be empty')
    }

    return await ichiranService.tokenize(text)
  }, {
    body: t.Object({
      text: t.String()
    })
  })
  
  .get('/tokenizer/health', async () => {
    try {
      const available = await ichiranService.isAvailable()
      return {
        service: 'ichiran',
        available,
        status: available ? 'ready' : 'unavailable',
        config: ichiranService.getConfig()
      }
    } catch (error) {
      return {
        service: 'ichiran',
        available: false,
        status: 'unavailable'
      }
    }
  })

  .get('/tokenizer/config', () => {
    return ichiranService.getConfig()
  })

  .post('/tokenizer/restart', async () => {
    try {
      await ichiranService.restart()
      return {
        success: true,
        message: 'Ichiran service restarted successfully'
      }
    } catch (error) {
      throw new Error(`Failed to restart ichiran service: ${error instanceof Error ? error.message : String(error)}`)
    }
  })
  
  .post('/tokenize/alternatives/:text', async ({ params }) => {
    const { text } = params
    
    if (!text) {
      throw new Error('Text parameter is required')
    }

    return await ichiranService.getAlternatives(decodeURIComponent(text))
  })