import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { Elysia } from 'elysia'
import { textBlocksRoutes } from '../routes/text-blocks'
import { prisma } from '../lib/db'
import { 
  setupTestDatabase, 
  teardownTestDatabase, 
  createTestMangaData, 
  createTestPageData, 
  createTestTextBlockData 
} from './setup'

describe('Text Blocks Routes', () => {
  let app: Elysia
  let testManga: any
  let testPage: any
  let testTextBlock: any

  beforeEach(async () => {
    app = new Elysia().use(textBlocksRoutes)
    await setupTestDatabase()
    
    // Create test data
    testManga = await prisma.manga.create({
      data: createTestMangaData()
    })
    
    testPage = await prisma.page.create({
      data: createTestPageData(testManga.id, 1)
    })
    
    testTextBlock = await prisma.textBlock.create({
      data: createTestTextBlockData(testPage.id)
    })
  })

  afterEach(async () => {
    await teardownTestDatabase()
  })

  describe('PUT /api/text-blocks/:id', () => {
    it('should update text block successfully', async () => {
      const updatedText = 'Updated Japanese text'
      
      const response = await app
        .handle(new Request(`http://localhost/api/text-blocks/${testTextBlock.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: updatedText })
        }))
        .then(res => res.json())

      expect(response.success).toBe(true)
      expect(response.textBlock.text).toBe(updatedText)
      expect(response.textBlock.id).toBe(testTextBlock.id)
      
      // Verify in database
      const dbTextBlock = await prisma.textBlock.findUnique({
        where: { id: testTextBlock.id }
      })
      expect(dbTextBlock?.text).toBe(updatedText)
    })

    it('should trim whitespace from text', async () => {
      const textWithWhitespace = '  Trimmed text  '
      
      const response = await app
        .handle(new Request(`http://localhost/api/text-blocks/${testTextBlock.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: textWithWhitespace })
        }))
        .then(res => res.json())

      expect(response.success).toBe(true)
      expect(response.textBlock.text).toBe('Trimmed text')
    })

    it('should return 400 for empty text', async () => {
      const response = await app
        .handle(new Request(`http://localhost/api/text-blocks/${testTextBlock.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: '' })
        }))

      const status = response.status
      const data = await response.json()
      
      expect(status).toBe(400)
      expect(data.error).toBe('Text is required')
    })

    it('should return 400 for whitespace-only text', async () => {
      const response = await app
        .handle(new Request(`http://localhost/api/text-blocks/${testTextBlock.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: '   ' })
        }))

      const status = response.status
      const data = await response.json()
      
      expect(status).toBe(400)
      expect(data.error).toBe('Text is required')
    })

    it('should return 500 for non-existent text block', async () => {
      const response = await app
        .handle(new Request('http://localhost/api/text-blocks/non-existent-id', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: 'Some text' })
        }))

      const status = response.status
      const data = await response.json()
      
      expect(status).toBe(500)
      expect(data.error).toBe('Failed to update text block')
    })

    it('should handle Japanese text correctly', async () => {
      const japaneseText = 'こんにちは世界'
      
      const response = await app
        .handle(new Request(`http://localhost/api/text-blocks/${testTextBlock.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: japaneseText })
        }))
        .then(res => res.json())

      expect(response.success).toBe(true)
      expect(response.textBlock.text).toBe(japaneseText)
    })

    it('should handle special characters and emojis', async () => {
      const specialText = 'Special chars: !@#$%^&*() 😀🎉'
      
      const response = await app
        .handle(new Request(`http://localhost/api/text-blocks/${testTextBlock.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: specialText })
        }))
        .then(res => res.json())

      expect(response.success).toBe(true)
      expect(response.textBlock.text).toBe(specialText)
    })

    it('should validate request parameters', async () => {
      // Missing text field
      const response = await app
        .handle(new Request(`http://localhost/api/text-blocks/${testTextBlock.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({})
        }))

      expect(response.status).toBe(400) // Validation error
    })

    it('should handle very long text', async () => {
      const longText = 'A'.repeat(1000)
      
      const response = await app
        .handle(new Request(`http://localhost/api/text-blocks/${testTextBlock.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: longText })
        }))
        .then(res => res.json())

      expect(response.success).toBe(true)
      expect(response.textBlock.text).toBe(longText)
    })
  })
})