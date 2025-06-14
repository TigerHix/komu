import { Elysia, t } from 'elysia'
import { promptLoader } from '../lib/prompt-loader'
import { prisma } from '../lib/db'

interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

interface ChatRequest {
  messages: ChatMessage[]
  selectedText: string
  sentence: string
  isWholeSentence: boolean
  language?: string
  mangaId?: string
}

export const chatRoutes = new Elysia({ prefix: '/api/explanations' })
  .post('/', async ({ body, set }) => {
    try {
      const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
      if (!OPENROUTER_API_KEY) {
        set.status = 500
        return { error: 'OpenRouter API key not configured' }
      }

      const { messages, selectedText, sentence, isWholeSentence, language = 'en', mangaId } = body as ChatRequest

      // Get manga metadata if mangaId is provided
      let mangaTitle: string | undefined
      let mangaDescription: string | undefined
      
      if (mangaId) {
        const manga = await prisma.manga.findUnique({
          where: { id: mangaId },
          select: { title: true, author: true, type: true }
        })
        
        if (manga) {
          mangaTitle = manga.title || undefined
          mangaDescription = manga.author ? `Author: ${manga.author}` : undefined
          if (manga.type && mangaDescription) {
            mangaDescription += ` | Type: ${manga.type}`
          } else if (manga.type) {
            mangaDescription = `Type: ${manga.type}`
          }
        }
      }

      // Build the conversation with proper context
      const contextualMessages: ChatMessage[] = []
      
      // Add system prompt
      contextualMessages.push({
        role: 'system',
        content: promptLoader.getSystemPrompt(language, mangaTitle, mangaDescription)
      })
      
      // Add user prompt with context - different prompts for whole sentence vs partial selection
      const userPrompt = isWholeSentence 
        ? promptLoader.getUserPrompt('whole-sentence', sentence, undefined, language, mangaTitle)
        : promptLoader.getUserPrompt('partial-selection', sentence, selectedText, language, mangaTitle)
      
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

      const result = await response.json() as any
      
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
      isWholeSentence: t.Boolean(),
      language: t.Optional(t.String()),
      mangaId: t.Optional(t.String())
    })
  })

  .post('/stream', async ({ body, set }) => {
    try {
      const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
      if (!OPENROUTER_API_KEY) {
        set.status = 500
        return { error: 'OpenRouter API key not configured' }
      }

      const { messages, selectedText, sentence, isWholeSentence, language = 'en', mangaId } = body as ChatRequest

      // Get manga metadata if mangaId is provided
      let mangaTitle: string | undefined
      let mangaDescription: string | undefined
      
      if (mangaId) {
        const manga = await prisma.manga.findUnique({
          where: { id: mangaId },
          select: { title: true, author: true, type: true }
        })
        
        if (manga) {
          mangaTitle = manga.title || undefined
          mangaDescription = manga.author ? `Author: ${manga.author}` : undefined
          if (manga.type && mangaDescription) {
            mangaDescription += ` | Type: ${manga.type}`
          } else if (manga.type) {
            mangaDescription = `Type: ${manga.type}`
          }
        }
      }

      // Build the conversation with proper context
      const contextualMessages: ChatMessage[] = []
      
      // Add system prompt
      contextualMessages.push({
        role: 'system',
        content: promptLoader.getSystemPrompt(language, mangaTitle, mangaDescription)
      })
      
      // Add user prompt with context - different prompts for whole sentence vs partial selection
      const userPrompt = isWholeSentence 
        ? promptLoader.getUserPrompt('whole-sentence', sentence, undefined, language, mangaTitle)
        : promptLoader.getUserPrompt('partial-selection', sentence, selectedText, language, mangaTitle)
      
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
      isWholeSentence: t.Boolean(),
      language: t.Optional(t.String()),
      mangaId: t.Optional(t.String())
    })
  })

  .post('/emoticon', async ({ body, set }) => {
    try {
      const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
      if (!OPENROUTER_API_KEY) {
        set.status = 500
        return { error: 'OpenRouter API key not configured' }
      }

      const { lastAssistantMessage } = body as { lastAssistantMessage: string }

      // Build the emoticon selection messages
      const emoticonMessages: ChatMessage[] = [
        {
          role: 'system',
          content: 'You are tasked with selecting an appropriate emoticon based on the content and mood of the assistant message.'
        },
        {
          role: 'user',
          content: `Here is the assistant's message: "${lastAssistantMessage}"\n\n${promptLoader.getEmoticonPrompt()}`
        }
      ]

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
          messages: emoticonMessages,
          temperature: 0.3, // Lower temperature for more consistent emoticon selection
          max_tokens: 50,
          stream: false
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('OpenRouter API error for emoticon selection:', response.status, errorText)
        set.status = 500
        return { error: 'Failed to select emoticon from AI service' }
      }

      const result = await response.json() as any
      
      if (!result.choices || !result.choices[0] || !result.choices[0].message) {
        console.error('Unexpected OpenRouter response format for emoticon:', result)
        set.status = 500
        return { error: 'Invalid response from AI service for emoticon selection' }
      }

      const selectedEmoticon = result.choices[0].message.content.trim()
      
      return {
        emoticon: selectedEmoticon,
        usage: result.usage
      }

    } catch (error) {
      console.error('Emoticon selection error:', error)
      set.status = 500
      return { error: 'Internal server error during emoticon selection' }
    }
  }, {
    body: t.Object({
      lastAssistantMessage: t.String()
    })
  })