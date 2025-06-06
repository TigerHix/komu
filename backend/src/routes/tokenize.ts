import { Elysia, t } from 'elysia'
import { ichiranService } from '../lib/ichiran-service'

export const tokenizeRoutes = new Elysia({ prefix: '/api/japanese' })
  .post('/tokenize', async ({ body }) => {
    const isVerbose = process.env.VERBOSE_DEBUG === 'true'
    
    if (isVerbose) {
      console.log('🎯 [API] Tokenize endpoint called')
      console.log('🎯 [API] Request body:', JSON.stringify(body, null, 2))
    }
    
    const { text } = body
    if (isVerbose) console.log(`🎯 [API] Extracted text: "${text}"`)
    
    if (!text || typeof text !== 'string') {
      const error = 'Text is required'
      console.error(`❌ [API ERROR] ${error}`)
      throw new Error(error)
    }

    if (text.trim().length === 0) {
      const error = 'Text cannot be empty'
      console.error(`❌ [API ERROR] ${error}`)
      throw new Error(error)
    }

    try {
      if (isVerbose) console.log(`🎯 [API] Calling ichiranService.tokenize for: "${text}"`)
      const result = await ichiranService.tokenize(text)
      if (isVerbose) console.log(`✅ [API] Tokenization successful, returning ${result.tokens?.length || 0} tokens`)
      return result
    } catch (error) {
      console.error('❌ [API ERROR] Tokenization failed:', error)
      
      // Log detailed error information
      if (error instanceof Error && isVerbose) {
        console.error(`❌ [API ERROR] Error name: ${error.name}`)
        console.error(`❌ [API ERROR] Error message: ${error.message}`)
        console.error(`❌ [API ERROR] Error stack: ${error.stack}`)
      }
      
      // Re-throw the error with more context
      throw new Error(`API tokenization failed: ${error instanceof Error ? error.message : String(error)}`)
    }
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