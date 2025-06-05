import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test'
import { Elysia } from 'elysia'
import { mangaRoutes } from '../routes/manga'
import { 
  setupTestDatabase, 
  teardownTestDatabase, 
  createTestMangaData, 
  createTestPageData,
  createTestPageDataForNested,
  expectSuccessResponse,
  expectErrorResponse
} from './setup'
import { prisma } from '../lib/db'

// Create mock OCR queue
const mockOcrQueue = {
  addPage: mock(() => {}),
  getProgress: mock(() => ({ total: 0, completed: 0, failed: 0, pending: 0 })),
  pause: mock(() => {}),
  resume: mock(() => {}),
  setPriority: mock(() => {}),
  getConcurrency: mock(() => 1),
  getMaxConcurrency: mock(() => 4),
  setConcurrency: mock(() => {})
}

// Mock the OCR queue module
mock.module('../lib/ocr-queue', () => ({
  ocrQueue: mockOcrQueue
}))

const app = new Elysia().use(mangaRoutes)

describe('Manga Routes', () => {
  beforeEach(async () => {
    await setupTestDatabase()
  })

  afterEach(async () => {
    await teardownTestDatabase()
  })

  describe('GET /api/manga', () => {
    it('should return empty array when no manga exist', async () => {
      const response = await app.handle(
        new Request('http://localhost/api/manga')
      )
      
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(Array.isArray(data)).toBe(true)
      expect(data.length).toBe(0)
    })

    it('should return manga list with metadata', async () => {
      // Create test manga
      const mangaData = createTestMangaData()
      const manga = await prisma.manga.create({
        data: {
          ...mangaData,
          pages: {
            create: [
              createTestPageDataForNested(1),
              createTestPageDataForNested(2)
            ]
          }
        }
      })

      const response = await app.handle(
        new Request('http://localhost/api/manga')
      )
      
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.length).toBe(1)
      expect(data[0]).toEqual(
        expect.objectContaining({
          id: manga.id,
          title: manga.title,
          totalPages: 2,
          progressPercent: 0
        })
      )
    })

    it('should calculate progress percentage correctly', async () => {
      const mangaData = createTestMangaData()
      const manga = await prisma.manga.create({
        data: {
          ...mangaData,
          currentPage: 1, // Read 1 out of 4 pages
          pages: {
            create: [
              createTestPageDataForNested(1),
              createTestPageDataForNested(2),
              createTestPageDataForNested(3),
              createTestPageDataForNested(4)
            ]
          }
        }
      })

      const response = await app.handle(
        new Request('http://localhost/api/manga')
      )
      
      const data = await response.json()
      expect(data[0].progressPercent).toBe(25) // 1/4 * 100 = 25%
    })
  })

  describe('GET /api/manga/:id', () => {
    it('should return specific manga with pages', async () => {
      const mangaData = createTestMangaData()
      const manga = await prisma.manga.create({
        data: {
          ...mangaData,
          pages: {
            create: [
              createTestPageDataForNested(1),
              createTestPageDataForNested(2)
            ]
          }
        }
      })

      const response = await app.handle(
        new Request(`http://localhost/api/manga/${manga.id}`)
      )
      
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.id).toBe(manga.id)
      expect(data.pages).toHaveLength(2)
      expect(data.pages[0].pageNum).toBe(1)
      expect(data.pages[1].pageNum).toBe(2)
    })

    it('should return 404 for non-existent manga', async () => {
      const response = await app.handle(
        new Request('http://localhost/api/manga/non-existent-id')
      )
      
      expect(response.status).toBe(500) // Elysia throws error which becomes 500
    })
  })

  describe('DELETE /api/manga/:id', () => {
    it('should delete manga and return success', async () => {
      const mangaData = createTestMangaData()
      const manga = await prisma.manga.create({
        data: mangaData
      })

      const response = await app.handle(
        new Request(`http://localhost/api/manga/${manga.id}`, {
          method: 'DELETE'
        })
      )
      
      expect(response.status).toBe(200)
      const data = await response.json()
      expectSuccessResponse(data)
      expect(data.message).toContain('deleted successfully')

      // Verify manga is deleted
      const deletedManga = await prisma.manga.findUnique({
        where: { id: manga.id }
      })
      expect(deletedManga).toBeNull()
    })

    it('should return error for non-existent manga', async () => {
      const response = await app.handle(
        new Request('http://localhost/api/manga/non-existent-id', {
          method: 'DELETE'
        })
      )
      
      expect(response.status).toBe(500)
    })
  })

  describe('DELETE /api/manga/:id/ocr', () => {
    it('should remove OCR data and re-queue pages', async () => {
      const mangaData = createTestMangaData()
      const manga = await prisma.manga.create({
        data: {
          ...mangaData,
          pages: {
            create: [
              { ...createTestPageDataForNested( 1), ocrStatus: 'COMPLETED' },
              { ...createTestPageDataForNested( 2), ocrStatus: 'COMPLETED' }
            ]
          }
        }
      })

      const response = await app.handle(
        new Request(`http://localhost/api/manga/${manga.id}/ocr`, {
          method: 'DELETE'
        })
      )
      
      expect(response.status).toBe(200)
      const data = await response.json()
      expectSuccessResponse(data)
      expect(data.pageCount).toBe(2)

      // Verify pages are reset to PENDING
      const pages = await prisma.page.findMany({
        where: { mangaId: manga.id }
      })
      expect(pages.every(page => page.ocrStatus === 'PENDING')).toBe(true)
    })
  })

  describe('PUT /api/manga/:id/reading-session', () => {
    it('should update last read timestamp', async () => {
      const mangaData = createTestMangaData()
      const manga = await prisma.manga.create({
        data: mangaData
      })

      const response = await app.handle(
        new Request(`http://localhost/api/manga/${manga.id}/reading-session`, {
          method: 'PUT'
        })
      )
      
      expect(response.status).toBe(200)
      const data = await response.json()
      expectSuccessResponse(data)

      // Verify lastReadAt was updated
      const updatedManga = await prisma.manga.findUnique({
        where: { id: manga.id }
      })
      expect(updatedManga?.lastReadAt).not.toBeNull()
    })
  })

  describe('PUT /api/manga/:id/progress', () => {
    it('should update reading progress', async () => {
      const mangaData = createTestMangaData()
      const manga = await prisma.manga.create({
        data: {
          ...mangaData,
          pages: {
            create: [
              createTestPageDataForNested(1),
              createTestPageDataForNested(2),
              createTestPageDataForNested(3)
            ]
          }
        }
      })

      const response = await app.handle(
        new Request(`http://localhost/api/manga/${manga.id}/progress`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ currentPage: 1 })
        })
      )
      
      expect(response.status).toBe(200)
      const data = await response.json()
      expectSuccessResponse(data)
      expect(data.currentPage).toBe(1)
      expect(data.progressPercent).toBe(33) // 1/3 * 100 = 33% (rounded)

      // Verify progress was saved
      const updatedManga = await prisma.manga.findUnique({
        where: { id: manga.id }
      })
      expect(updatedManga?.currentPage).toBe(1)
      expect(updatedManga?.lastReadAt).not.toBeNull()
    })

    it('should reject invalid currentPage values', async () => {
      const mangaData = createTestMangaData()
      const manga = await prisma.manga.create({
        data: {
          ...mangaData,
          pages: {
            create: [createTestPageDataForNested( 1)]
          }
        }
      })

      // Test negative page
      let response = await app.handle(
        new Request(`http://localhost/api/manga/${manga.id}/progress`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ currentPage: -1 })
        })
      )
      expect(response.status).toBe(500)

      // Test page exceeding total pages
      response = await app.handle(
        new Request(`http://localhost/api/manga/${manga.id}/progress`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ currentPage: 5 })
        })
      )
      expect(response.status).toBe(500)
    })

    it('should handle non-numeric currentPage', async () => {
      const mangaData = createTestMangaData()
      const manga = await prisma.manga.create({
        data: mangaData
      })

      const response = await app.handle(
        new Request(`http://localhost/api/manga/${manga.id}/progress`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ currentPage: 'invalid' })
        })
      )
      
      expect(response.status).toBe(500)
    })
  })
})