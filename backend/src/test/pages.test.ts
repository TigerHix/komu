import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test'
import { Elysia } from 'elysia'
import { pagesRoutes } from '../routes/pages'
import { 
  setupTestDatabase, 
  teardownTestDatabase, 
  createTestMangaData,
  createTestPageData,
  createTestPageDataForNested,
  createTestTextBlockData,
  expectSuccessResponse,
  expectErrorResponse,
  mockOcrQueue
} from './setup'
import { prisma } from '../lib/db'

// Mock the OCR queue
beforeEach(() => {
  mock.module('../lib/ocr-queue', () => ({
    ocrQueue: mockOcrQueue()
  }))
})

const app = new Elysia().use(pagesRoutes)

describe('Pages Routes', () => {
  beforeEach(async () => {
    await setupTestDatabase()
  })

  afterEach(async () => {
    await teardownTestDatabase()
  })

  describe('POST /api/pages/:pageId/view', () => {
    it('should track page view and prioritize pending OCR', async () => {
      const mangaData = createTestMangaData()
      const manga = await prisma.manga.create({
        data: {
          ...mangaData,
          pages: {
            create: [createTestPageDataForNested(1)]
          }
        }
      })

      const page = await prisma.page.findFirst({
        where: { mangaId: manga.id }
      })

      const response = await app.handle(
        new Request(`http://localhost/api/pages/${page!.id}/view`, {
          method: 'POST'
        })
      )
      
      expect(response.status).toBe(200)
      const data = await response.json()
      expectSuccessResponse(data)
      expect(data.status).toBe('PENDING')
    })

    it('should prioritize failed OCR pages', async () => {
      const mangaData = createTestMangaData()
      const manga = await prisma.manga.create({
        data: {
          ...mangaData,
          pages: {
            create: [{ ...createTestPageDataForNested(1), ocrStatus: 'FAILED' }]
          }
        }
      })

      const page = await prisma.page.findFirst({
        where: { mangaId: manga.id }
      })

      const response = await app.handle(
        new Request(`http://localhost/api/pages/${page!.id}/view`, {
          method: 'POST'
        })
      )
      
      expect(response.status).toBe(200)
      const data = await response.json()
      expectSuccessResponse(data)
      expect(data.status).toBe('FAILED')
    })

    it('should not prioritize completed OCR pages', async () => {
      const mangaData = createTestMangaData()
      const manga = await prisma.manga.create({
        data: {
          ...mangaData,
          pages: {
            create: [{ ...createTestPageDataForNested(1), ocrStatus: 'COMPLETED' }]
          }
        }
      })

      const page = await prisma.page.findFirst({
        where: { mangaId: manga.id }
      })

      const response = await app.handle(
        new Request(`http://localhost/api/pages/${page!.id}/view`, {
          method: 'POST'
        })
      )
      
      expect(response.status).toBe(200)
      const data = await response.json()
      expectSuccessResponse(data)
      expect(data.status).toBe('COMPLETED')
    })

    it('should return error for non-existent page', async () => {
      const response = await app.handle(
        new Request('http://localhost/api/pages/non-existent-id/view', {
          method: 'POST'
        })
      )
      
      expect(response.status).toBe(500)
    })
  })

  describe('POST /api/pages/:pageId/ocr/priority', () => {
    it('should prioritize page for OCR', async () => {
      const mangaData = createTestMangaData()
      const manga = await prisma.manga.create({
        data: {
          ...mangaData,
          pages: {
            create: [createTestPageDataForNested(1)]
          }
        }
      })

      const page = await prisma.page.findFirst({
        where: { mangaId: manga.id }
      })

      const response = await app.handle(
        new Request(`http://localhost/api/pages/${page!.id}/ocr/priority`, {
          method: 'POST'
        })
      )
      
      expect(response.status).toBe(200)
      const data = await response.json()
      expectSuccessResponse(data)
      expect(data.message).toContain('prioritized')
    })
  })

  describe('GET /api/pages/:pageId/ocr/status', () => {
    it('should return page OCR status', async () => {
      const mangaData = createTestMangaData()
      const manga = await prisma.manga.create({
        data: {
          ...mangaData,
          pages: {
            create: [{ 
              ...createTestPageDataForNested(1),
              ocrStatus: 'COMPLETED',
              ocrStartedAt: new Date(),
              ocrCompletedAt: new Date()
            }]
          }
        }
      })

      const page = await prisma.page.findFirst({
        where: { mangaId: manga.id }
      })

      const response = await app.handle(
        new Request(`http://localhost/api/pages/${page!.id}/ocr/status`)
      )
      
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.ocrStatus).toBe('COMPLETED')
      expect(data.ocrStartedAt).toBeDefined()
      expect(data.ocrCompletedAt).toBeDefined()
    })

    it('should return error for non-existent page', async () => {
      const response = await app.handle(
        new Request('http://localhost/api/pages/non-existent-id/ocr/status')
      )
      
      expect(response.status).toBe(500)
    })
  })

  describe('GET /api/pages/:pageId/ocr/results', () => {
    it('should return page OCR results with text blocks', async () => {
      const mangaData = createTestMangaData()
      const manga = await prisma.manga.create({
        data: {
          ...mangaData,
          pages: {
            create: [{ 
              ...createTestPageDataForNested(1),
              ocrStatus: 'COMPLETED',
              imageWidth: 800,
              imageHeight: 600
            }]
          }
        }
      })

      const page = await prisma.page.findFirst({
        where: { mangaId: manga.id }
      })

      // Create text blocks for the page
      const textBlockData = createTestTextBlockData(page!.id)
      await prisma.textBlock.create({
        data: textBlockData
      })

      const response = await app.handle(
        new Request(`http://localhost/api/pages/${page!.id}/ocr/results`)
      )
      
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.ocrStatus).toBe('COMPLETED')
      expect(data.textBlocks).toHaveLength(1)
      expect(data.textBlocks[0].text).toBe('テストテキスト')
      expect(data.textBlocks[0].bbox).toEqual([100, 100, 200, 150])
      expect(data.textBlocks[0].textLines).toEqual(['テストテキスト'])
      expect(data.imageSize).toEqual({ width: 800, height: 600 })
    })

    it('should return results without image size if not available', async () => {
      const mangaData = createTestMangaData()
      const manga = await prisma.manga.create({
        data: {
          ...mangaData,
          pages: {
            create: [{ 
              ...createTestPageDataForNested(1),
              ocrStatus: 'COMPLETED'
              // No imageWidth/imageHeight
            }]
          }
        }
      })

      const page = await prisma.page.findFirst({
        where: { mangaId: manga.id }
      })

      const response = await app.handle(
        new Request(`http://localhost/api/pages/${page!.id}/ocr/results`)
      )
      
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.ocrStatus).toBe('COMPLETED')
      expect(data.textBlocks).toHaveLength(0)
      expect(data.imageSize).toBeNull()
    })

    it('should return error for non-existent page', async () => {
      const response = await app.handle(
        new Request('http://localhost/api/pages/non-existent-id/ocr/results')
      )
      
      expect(response.status).toBe(500)
    })
  })

  describe('POST /api/pages/:pageId/ocr/retry', () => {
    it('should retry failed OCR page', async () => {
      const mangaData = createTestMangaData()
      const manga = await prisma.manga.create({
        data: {
          ...mangaData,
          pages: {
            create: [{ 
              ...createTestPageDataForNested(1),
              ocrStatus: 'FAILED',
              ocrStartedAt: new Date(),
              ocrCompletedAt: new Date()
            }]
          }
        }
      })

      const page = await prisma.page.findFirst({
        where: { mangaId: manga.id }
      })

      // Create some text blocks that should be cleared
      const textBlockData = createTestTextBlockData(page!.id)
      await prisma.textBlock.create({
        data: textBlockData
      })

      const response = await app.handle(
        new Request(`http://localhost/api/pages/${page!.id}/ocr/retry`, {
          method: 'POST'
        })
      )
      
      expect(response.status).toBe(200)
      const data = await response.json()
      expectSuccessResponse(data)
      expect(data.message).toContain('queued for retry')

      // Verify page status was reset
      const updatedPage = await prisma.page.findUnique({
        where: { id: page!.id }
      })
      expect(updatedPage?.ocrStatus).toBe('PENDING')
      expect(updatedPage?.ocrStartedAt).toBeNull()
      expect(updatedPage?.ocrCompletedAt).toBeNull()

      // Verify text blocks were cleared
      const remainingTextBlocks = await prisma.textBlock.findMany({
        where: { pageId: page!.id }
      })
      expect(remainingTextBlocks).toHaveLength(0)
    })

    it('should not retry page that is not in failed state', async () => {
      const mangaData = createTestMangaData()
      const manga = await prisma.manga.create({
        data: {
          ...mangaData,
          pages: {
            create: [{ 
              ...createTestPageDataForNested(1),
              ocrStatus: 'COMPLETED'
            }]
          }
        }
      })

      const page = await prisma.page.findFirst({
        where: { mangaId: manga.id }
      })

      const response = await app.handle(
        new Request(`http://localhost/api/pages/${page!.id}/ocr/retry`, {
          method: 'POST'
        })
      )
      
      expect(response.status).toBe(500)
    })

    it('should return error for non-existent page', async () => {
      const response = await app.handle(
        new Request('http://localhost/api/pages/non-existent-id/ocr/retry', {
          method: 'POST'
        })
      )
      
      expect(response.status).toBe(500)
    })
  })
})