import { Elysia, t } from 'elysia'
import { promptLoader } from '../lib/prompt-loader'

interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

interface ChatRequest {
  messages: ChatMessage[]
  selectedText: string
  sentence: string
  isWholeSentence: boolean
}

export const chatRoutes = new Elysia({ prefix: '/api/explanations' })
  .post('/', async ({ body, set }) => {
    try {
      const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
      if (!OPENROUTER_API_KEY) {
        set.status = 500
        return { error: 'OpenRouter API key not configured' }
      }

      const { messages, selectedText, sentence, isWholeSentence } = body as ChatRequest

      // Build the conversation with proper context
      const contextualMessages: ChatMessage[] = []
      
      // Add system prompt
      contextualMessages.push({
        role: 'system',
        content: promptLoader.getSystemPrompt()
      })
      
      // Add user prompt with context - different prompts for whole sentence vs partial selection
      const userPrompt = isWholeSentence 
        ? promptLoader.getUserPrompt('whole-sentence', sentence)
        : promptLoader.getUserPrompt('partial-selection', sentence, selectedText)
      
      contextualMessages.push({
        role: 'user',
        content: userPrompt
      })

      // Add the conversation history
      contextualMessages.push(...messages)

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'http://localhost:5847',
          'X-Title': 'Komu Manga Reader'
        },
        body: JSON.stringify({
          model: process.env.CHAT_MODEL || 'openai/gpt-4o',
          messages: contextualMessages,
          temperature: 0.7,
          max_tokens: 1000,
          stream: false
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('OpenRouter API error:', response.status, errorText)
        set.status = 500
        return { error: 'Failed to get explanation from AI service' }
      }

      const result = await response.json()
      
      if (!result.choices || !result.choices[0] || !result.choices[0].message) {
        console.error('Unexpected OpenRouter response format:', result)
        set.status = 500
        return { error: 'Invalid response from AI service' }
      }

      return {
        message: result.choices[0].message.content,
        usage: result.usage
      }

    } catch (error) {
      console.error('Chat explanation error:', error)
      set.status = 500
      return { error: 'Internal server error during explanation' }
    }
  }, {
    body: t.Object({
      messages: t.Array(t.Object({
        role: t.Union([t.Literal('user'), t.Literal('assistant'), t.Literal('system')]),
        content: t.String()
      })),
      selectedText: t.String(),
      sentence: t.String(),
      isWholeSentence: t.Boolean()
    })
  })

  .post('/stream', async ({ body, set }) => {
    try {
      const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
      if (!OPENROUTER_API_KEY) {
        set.status = 500
        return { error: 'OpenRouter API key not configured' }
      }

      const { messages, selectedText, sentence, isWholeSentence } = body as ChatRequest

      // Build the conversation with proper context
      const contextualMessages: ChatMessage[] = []
      
      // Add system prompt
      contextualMessages.push({
        role: 'system',
        content: promptLoader.getSystemPrompt()
      })
      
      // Add user prompt with context - different prompts for whole sentence vs partial selection
      const userPrompt = isWholeSentence 
        ? promptLoader.getUserPrompt('whole-sentence', sentence)
        : promptLoader.getUserPrompt('partial-selection', sentence, selectedText)
      
      contextualMessages.push({
        role: 'user',
        content: userPrompt
      })

      // Add the conversation history
      contextualMessages.push(...messages)

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'http://localhost:5847',
          'X-Title': 'Komu Manga Reader'
        },
        body: JSON.stringify({
          model: process.env.CHAT_MODEL || 'openai/gpt-4o',
          messages: contextualMessages,
          temperature: 0.7,
          max_tokens: 1000,
          stream: true
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('OpenRouter API error:', response.status, errorText)
        set.status = 500
        return { error: 'Failed to get explanation from AI service' }
      }

      // Return the stream directly with headers
      return new Response(response.body, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'Access-Control-Allow-Origin': '*'
        }
      })

    } catch (error) {
      console.error('Chat stream error:', error)
      set.status = 500
      return { error: 'Internal server error during streaming' }
    }
  }, {
    body: t.Object({
      messages: t.Array(t.Object({
        role: t.Union([t.Literal('user'), t.Literal('assistant'), t.Literal('system')]),
        content: t.String()
      })),
      selectedText: t.String(),
      sentence: t.String(),
      isWholeSentence: t.Boolean()
    })
  })