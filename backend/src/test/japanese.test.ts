import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test'
import { Elysia } from 'elysia'
import { tokenizeRoutes } from '../routes/tokenize'
import { 
  setupTestDatabase, 
  teardownTestDatabase,
  expectSuccessResponse,
  expectErrorResponse,
  mockIchiranService
} from './setup'

// Mock the ichiran service
const mockService = mockIchiranService()

mock.module('../lib/ichiran-service', () => ({
  ichiranService: mockService
}))

const app = new Elysia().use(tokenizeRoutes)

describe('Japanese/Tokenize Routes', () => {
  beforeEach(async () => {
    await setupTestDatabase()
  })

  afterEach(async () => {
    await teardownTestDatabase()
  })

  describe('POST /api/japanese/tokenize', () => {
    it('should tokenize Japanese text', async () => {
      const mockTokens = [
        {
          text: 'これ',
          pos: 'pronoun',
          reading: 'コレ',
          meaning: 'this'
        },
        {
          text: 'は',
          pos: 'particle',
          reading: 'ハ',
          meaning: 'topic marker'
        },
        {
          text: 'テスト',
          pos: 'noun',
          reading: 'テスト',
          meaning: 'test'
        }
      ]
      
      mockService.tokenize = mock(() => Promise.resolve(mockTokens))

      const response = await app.handle(
        new Request('http://localhost/api/japanese/tokenize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: 'これはテストです' })
        })
      )
      
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(Array.isArray(data)).toBe(true)
      expect(data).toHaveLength(3)
      expect(data[0]).toEqual(
        expect.objectContaining({
          text: 'これ',
          pos: 'pronoun',
          reading: 'コレ',
          meaning: 'this'
        })
      )
    })

    it('should require text parameter', async () => {
      const response = await app.handle(
        new Request('http://localhost/api/japanese/tokenize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({})
        })
      )
      
      expect(response.status).toBe(400)
    })

    it('should reject empty text', async () => {
      const response = await app.handle(
        new Request('http://localhost/api/japanese/tokenize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: '' })
        })
      )
      
      expect(response.status).toBe(500)
    })

    it('should reject whitespace-only text', async () => {
      const response = await app.handle(
        new Request('http://localhost/api/japanese/tokenize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: '   ' })
        })
      )
      
      expect(response.status).toBe(500)
    })

    it('should handle non-string text parameter', async () => {
      const response = await app.handle(
        new Request('http://localhost/api/japanese/tokenize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: 123 })
        })
      )
      
      expect(response.status).toBe(400)
    })

    it('should handle tokenization service errors', async () => {
      mockService.tokenize = mock(() => Promise.reject(new Error('Tokenization failed')))

      const response = await app.handle(
        new Request('http://localhost/api/japanese/tokenize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: 'これはテストです' })
        })
      )
      
      expect(response.status).toBe(500)
    })
  })

  describe('GET /api/japanese/tokenizer/health', () => {
    it('should return service health status when available', async () => {
      mockService.isAvailable = mock(() => Promise.resolve(true))
      mockService.getConfig = mock(() => ({ enabled: true, host: 'localhost', port: 4001 }))

      const response = await app.handle(
        new Request('http://localhost/api/japanese/tokenizer/health')
      )
      
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data).toEqual(
        expect.objectContaining({
          service: 'ichiran',
          available: true,
          status: 'ready',
          config: expect.objectContaining({
            enabled: true
          })
        })
      )
    })

    it('should return service health status when unavailable', async () => {
      mockService.isAvailable = mock(() => Promise.resolve(false))

      const response = await app.handle(
        new Request('http://localhost/api/japanese/tokenizer/health')
      )
      
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data).toEqual(
        expect.objectContaining({
          service: 'ichiran',
          available: false,
          status: 'unavailable'
        })
      )
    })

    it('should handle health check errors', async () => {
      mockService.isAvailable = mock(() => Promise.reject(new Error('Health check failed')))

      const response = await app.handle(
        new Request('http://localhost/api/japanese/tokenizer/health')
      )
      
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.available).toBe(false)
      expect(data.status).toBe('unavailable')
    })
  })

  describe('GET /api/japanese/tokenizer/config', () => {
    it('should return tokenizer configuration', async () => {
      const mockConfig = {
        enabled: true,
        host: 'localhost',
        port: 4001,
        timeout: 5000
      }
      
      mockService.getConfig = mock(() => mockConfig)

      const response = await app.handle(
        new Request('http://localhost/api/japanese/tokenizer/config')
      )
      
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data).toEqual(mockConfig)
    })
  })

  describe('POST /api/japanese/tokenizer/restart', () => {
    it('should restart tokenizer service successfully', async () => {
      mockService.restart = mock(() => Promise.resolve())

      const response = await app.handle(
        new Request('http://localhost/api/japanese/tokenizer/restart', {
          method: 'POST'
        })
      )
      
      expect(response.status).toBe(200)
      const data = await response.json()
      expectSuccessResponse(data)
      expect(data.message).toContain('restarted successfully')
      expect(mockService.restart).toHaveBeenCalled()
    })

    it('should handle restart errors', async () => {
      mockService.restart = mock(() => Promise.reject(new Error('Restart failed')))

      const response = await app.handle(
        new Request('http://localhost/api/japanese/tokenizer/restart', {
          method: 'POST'
        })
      )
      
      expect(response.status).toBe(500)
    })
  })

  describe('POST /api/japanese/tokenize/alternatives/:text', () => {
    it('should get tokenization alternatives for text', async () => {
      const mockAlternatives = [
        {
          text: '分かる',
          reading: 'ワカル',
          meaning: 'to understand'
        },
        {
          text: '解る',
          reading: 'ワカル',
          meaning: 'to understand'
        }
      ]
      
      mockService.getAlternatives = mock(() => Promise.resolve(mockAlternatives))

      const response = await app.handle(
        new Request('http://localhost/api/japanese/tokenize/alternatives/分かる', {
          method: 'POST'
        })
      )
      
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(Array.isArray(data)).toBe(true)
      expect(data).toHaveLength(2)
      expect(data[0]).toEqual(
        expect.objectContaining({
          text: '分かる',
          reading: 'ワカル',
          meaning: 'to understand'
        })
      )
      expect(mockService.getAlternatives).toHaveBeenCalledWith('分かる')
    })

    it('should handle URL-encoded text', async () => {
      mockService.getAlternatives = mock(() => Promise.resolve([]))

      const encodedText = encodeURIComponent('分かる')
      const response = await app.handle(
        new Request(`http://localhost/api/japanese/tokenize/alternatives/${encodedText}`, {
          method: 'POST'
        })
      )
      
      expect(response.status).toBe(200)
      expect(mockService.getAlternatives).toHaveBeenCalledWith('分かる')
    })

    it('should require text parameter', async () => {
      const response = await app.handle(
        new Request('http://localhost/api/japanese/tokenize/alternatives/', {
          method: 'POST'
        })
      )
      
      expect(response.status).toBe(404) // Route not found
    })

    it('should handle empty text parameter', async () => {
      const response = await app.handle(
        new Request('http://localhost/api/japanese/tokenize/alternatives/ ', {
          method: 'POST'
        })
      )
      
      expect(response.status).toBe(404)
    })

    it('should handle service errors', async () => {
      mockService.getAlternatives = mock(() => Promise.reject(new Error('Alternatives failed')))

      const response = await app.handle(
        new Request('http://localhost/api/japanese/tokenize/alternatives/テスト', {
          method: 'POST'
        })
      )
      
      expect(response.status).toBe(500)
    })
  })

  describe('Integration scenarios', () => {
    it('should handle complex Japanese text with mixed scripts', async () => {
      const complexText = 'これは日本語のテストです。English text also works!'
      const mockTokens = [
        { text: 'これ', pos: 'pronoun', reading: 'コレ', meaning: 'this' },
        { text: 'は', pos: 'particle', reading: 'ハ', meaning: 'topic marker' },
        { text: '日本語', pos: 'noun', reading: 'ニホンゴ', meaning: 'Japanese language' },
        { text: 'の', pos: 'particle', reading: 'ノ', meaning: 'possessive marker' },
        { text: 'テスト', pos: 'noun', reading: 'テスト', meaning: 'test' },
        { text: 'です', pos: 'auxiliary', reading: 'デス', meaning: 'polite copula' }
      ]
      
      mockService.tokenize = mock(() => Promise.resolve(mockTokens))

      const response = await app.handle(
        new Request('http://localhost/api/japanese/tokenize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: complexText })
        })
      )
      
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data).toHaveLength(6)
      expect(mockService.tokenize).toHaveBeenCalledWith(complexText)
    })

    it('should handle kanji with multiple readings', async () => {
      const kanjiText = '今日は晴れです'
      const mockTokens = [
        { text: '今日', pos: 'noun', reading: 'キョウ', meaning: 'today' },
        { text: 'は', pos: 'particle', reading: 'ハ', meaning: 'topic marker' },
        { text: '晴れ', pos: 'noun', reading: 'ハレ', meaning: 'clear weather' },
        { text: 'です', pos: 'auxiliary', reading: 'デス', meaning: 'polite copula' }
      ]
      
      mockService.tokenize = mock(() => Promise.resolve(mockTokens))

      const response = await app.handle(
        new Request('http://localhost/api/japanese/tokenize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: kanjiText })
        })
      )
      
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data[0].text).toBe('今日')
      expect(data[0].reading).toBe('キョウ')
    })
  })
})