import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test'
import { Elysia } from 'elysia'
import { chatRoutes } from '../routes/chat'
import { 
  setupTestDatabase, 
  teardownTestDatabase,
  expectSuccessResponse,
  expectErrorResponse
} from './setup'

// Mock the OpenRouter API
const mockFetch = mock()
global.fetch = mockFetch

// Mock environment variable
const originalEnv = process.env.OPENROUTER_API_KEY
beforeEach(() => {
  process.env.OPENROUTER_API_KEY = 'test-api-key'
})

afterEach(() => {
  process.env.OPENROUTER_API_KEY = originalEnv
})

const app = new Elysia().use(chatRoutes)

describe('Explanations Routes', () => {
  beforeEach(async () => {
    await setupTestDatabase()
    mockFetch.mockClear()
  })

  afterEach(async () => {
    await teardownTestDatabase()
  })

  describe('POST /api/explanations/', () => {
    it('should get AI explanation for Japanese text', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: 'This is a detailed explanation of the Japanese text.'
          }
        }],
        usage: {
          prompt_tokens: 50,
          completion_tokens: 100,
          total_tokens: 150
        }
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      const requestBody = {
        messages: [
          {
            role: 'user',
            content: 'What does this mean?'
          }
        ],
        selectedText: '分かる',
        sentence: 'これが分かる。',
        isWholeSentence: false
      }

      const response = await app.handle(
        new Request('http://localhost/api/explanations/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        })
      )
      
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.message).toBe('This is a detailed explanation of the Japanese text.')
      expect(data.usage).toEqual(mockResponse.usage)

      // Verify correct API call was made
      expect(mockFetch).toHaveBeenCalledWith(
        'https://openrouter.ai/api/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-api-key',
            'Content-Type': 'application/json'
          }),
          body: expect.stringContaining('"model":"openai/gpt-4o"')
        })
      )
    })

    it('should include context in system message', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: 'Explanation with context.'
          }
        }],
        usage: { prompt_tokens: 50, completion_tokens: 100, total_tokens: 150 }
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      const requestBody = {
        messages: [],
        selectedText: '今日',
        sentence: '今日は晴れです。',
        isWholeSentence: false
      }

      await app.handle(
        new Request('http://localhost/api/explanations/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        })
      )

      // Verify the system message includes context
      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(callBody.messages[0].content).toContain('今日')
      expect(callBody.messages[0].content).toContain('今日は晴れです。')
      expect(callBody.messages[0].content).toContain('Japanese language expert')
    })

    it('should handle conversation history', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: 'Follow-up explanation.'
          }
        }],
        usage: { prompt_tokens: 75, completion_tokens: 125, total_tokens: 200 }
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      const requestBody = {
        messages: [
          {
            role: 'user',
            content: 'What does 分かる mean?'
          },
          {
            role: 'assistant',
            content: '分かる means "to understand".'
          },
          {
            role: 'user',
            content: 'Can you give me an example?'
          }
        ],
        selectedText: '分かる',
        sentence: 'これが分かる。',
        isWholeSentence: false
      }

      const response = await app.handle(
        new Request('http://localhost/api/explanations/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        })
      )
      
      expect(response.status).toBe(200)

      // Verify conversation history is included
      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(callBody.messages).toHaveLength(4) // System + 3 conversation messages
    })

    it('should require API key', async () => {
      delete process.env.OPENROUTER_API_KEY

      const requestBody = {
        messages: [],
        selectedText: '分かる',
        sentence: 'これが分かる。',
        isWholeSentence: false
      }

      const response = await app.handle(
        new Request('http://localhost/api/explanations/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        })
      )
      
      expect(response.status).toBe(500)
      const data = await response.json()
      expectErrorResponse(data, 'API key not configured')
    })

    it('should handle OpenRouter API errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        text: async () => 'Rate limit exceeded'
      })

      const requestBody = {
        messages: [],
        selectedText: '分かる',
        sentence: 'これが分かる。',
        isWholeSentence: false
      }

      const response = await app.handle(
        new Request('http://localhost/api/explanations/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        })
      )
      
      expect(response.status).toBe(500)
      const data = await response.json()
      expectErrorResponse(data, 'Failed to get explanation')
    })

    it('should handle malformed API responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          // Missing choices array
          usage: { prompt_tokens: 50, completion_tokens: 100, total_tokens: 150 }
        })
      })

      const requestBody = {
        messages: [],
        selectedText: '分かる',
        sentence: 'これが分かる。',
        isWholeSentence: false
      }

      const response = await app.handle(
        new Request('http://localhost/api/explanations/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        })
      )
      
      expect(response.status).toBe(500)
      const data = await response.json()
      expectErrorResponse(data, 'Invalid response')
    })

    it('should validate request body', async () => {
      const invalidRequestBody = {
        // Missing required fields
        messages: []
      }

      const response = await app.handle(
        new Request('http://localhost/api/explanations/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(invalidRequestBody)
        })
      )
      
      expect(response.status).toBe(400)
    })

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const requestBody = {
        messages: [],
        selectedText: '分かる',
        sentence: 'これが分かる。',
        isWholeSentence: false
      }

      const response = await app.handle(
        new Request('http://localhost/api/explanations/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        })
      )
      
      expect(response.status).toBe(500)
      const data = await response.json()
      expectErrorResponse(data, 'Internal server error')
    })
  })

  describe('POST /api/explanations/stream', () => {
    it('should stream AI explanation', async () => {
      // Mock streaming response
      const streamData = [
        'data: {"choices":[{"delta":{"content":"This"}}]}\n\n',
        'data: {"choices":[{"delta":{"content":" is"}}]}\n\n',
        'data: {"choices":[{"delta":{"content":" a streaming response."}}]}\n\n',
        'data: [DONE]\n\n'
      ]

      const mockStream = new ReadableStream({
        start(controller) {
          streamData.forEach(chunk => {
            controller.enqueue(new TextEncoder().encode(chunk))
          })
          controller.close()
        }
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: mockStream
      })

      const requestBody = {
        messages: [],
        selectedText: '分かる',
        sentence: 'これが分かる。',
        isWholeSentence: false
      }

      const response = await app.handle(
        new Request('http://localhost/api/explanations/stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        })
      )
      
      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Type')).toBe('text/event-stream')
      expect(response.headers.get('Cache-Control')).toBe('no-cache')
      expect(response.headers.get('Connection')).toBe('keep-alive')

      // Verify streaming API call was made with correct parameters
      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(callBody.stream).toBe(true)
    })

    it('should set correct streaming headers', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: new ReadableStream({
          start(controller) {
            controller.close()
          }
        })
      })

      const requestBody = {
        messages: [],
        selectedText: '分かる',
        sentence: 'これが分かる。',
        isWholeSentence: false
      }

      const response = await app.handle(
        new Request('http://localhost/api/explanations/stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        })
      )

      expect(response.headers.get('Content-Type')).toBe('text/event-stream')
      expect(response.headers.get('Cache-Control')).toBe('no-cache')
      expect(response.headers.get('Connection')).toBe('keep-alive')
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*')
    })

    it('should handle streaming API errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => 'Internal server error'
      })

      const requestBody = {
        messages: [],
        selectedText: '分かる',
        sentence: 'これが分かる。',
        isWholeSentence: false
      }

      const response = await app.handle(
        new Request('http://localhost/api/explanations/stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        })
      )
      
      expect(response.status).toBe(500)
      const data = await response.json()
      expectErrorResponse(data, 'Failed to get explanation')
    })

    it('should require API key for streaming', async () => {
      delete process.env.OPENROUTER_API_KEY

      const requestBody = {
        messages: [],
        selectedText: '分かる',
        sentence: 'これが分かる。',
        isWholeSentence: false
      }

      const response = await app.handle(
        new Request('http://localhost/api/explanations/stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        })
      )
      
      expect(response.status).toBe(500)
      const data = await response.json()
      expectErrorResponse(data, 'API key not configured')
    })
  })

  describe('Integration scenarios', () => {
    it('should handle complex Japanese text with multiple readings', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: 'The word 今日 can be read as "kyō" (today) or "konnichi" (this day).'
          }
        }],
        usage: { prompt_tokens: 60, completion_tokens: 120, total_tokens: 180 }
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      const requestBody = {
        messages: [],
        selectedText: '今日',
        sentence: '今日は良い天気ですね。',
        isWholeSentence: false
      }

      const response = await app.handle(
        new Request('http://localhost/api/explanations/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        })
      )
      
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.message).toContain('今日')
    })

    it('should handle grammar explanations', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: 'The particle は (wa) marks the topic of the sentence.'
          }
        }],
        usage: { prompt_tokens: 45, completion_tokens: 90, total_tokens: 135 }
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      const requestBody = {
        messages: [],
        selectedText: 'は',
        sentence: '私は学生です。',
        isWholeSentence: false
      }

      const response = await app.handle(
        new Request('http://localhost/api/explanations/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        })
      )
      
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.message).toContain('particle')
    })

    it('should handle long conversations', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: 'Based on our previous discussion about particles...'
          }
        }],
        usage: { prompt_tokens: 200, completion_tokens: 150, total_tokens: 350 }
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      // Simulate a long conversation
      const longConversation = []
      for (let i = 0; i < 10; i++) {
        longConversation.push(
          { role: 'user', content: `Question ${i + 1}` },
          { role: 'assistant', content: `Answer ${i + 1}` }
        )
      }

      const requestBody = {
        messages: longConversation,
        selectedText: 'に',
        sentence: '学校に行きます。',
        isWholeSentence: false
      }

      const response = await app.handle(
        new Request('http://localhost/api/explanations/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        })
      )
      
      expect(response.status).toBe(200)
      
      // Verify the full conversation is sent to the API
      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(callBody.messages.length).toBe(21) // System message + 20 conversation messages
    })
  })
})