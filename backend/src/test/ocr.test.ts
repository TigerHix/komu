import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test'
import { Elysia } from 'elysia'
import { ocrRoute } from '../routes/ocr'
import { ocrManagementRoutes } from '../routes/ocr-management'

import { 
  setupTestDatabase, 
  teardownTestDatabase, 
  createTestMangaData,
  createTestPageData,
  createTestPageDataForNested,
  createTestImageFile,
  expectSuccessResponse,
  expectErrorResponse,
  createFormData,
  mockOcrQueue
} from './setup'
import { prisma } from '../lib/db'

// Mock the external inference service
const mockFetch = mock()
global.fetch = mockFetch

// Mock file system operations
const mockFs = {
  existsSync: mock(() => true),
  readFileSync: mock(() => Buffer.from('fake-image-data'))
}

// Mock the fs module
mock.module('fs', () => ({
  existsSync: mockFs.existsSync,
  readFileSync: mockFs.readFileSync,
  promises: {
    readFile: mock(() => Promise.resolve(Buffer.from('fake-image-data'))),
    writeFile: mock(() => Promise.resolve())
  }
}))

// Mock the OCR queue module
const mockQueue = mockOcrQueue()
mock.module('../lib/ocr-queue', () => ({
  ocrQueue: mockQueue
}))

beforeEach(() => {
  // Clear all mocks first
  mockFetch.mockClear()
  mockFs.existsSync.mockClear()
  mockFs.readFileSync.mockClear()

  // Mock successful inference service response with complete response object
  mockFetch.mockResolvedValue({
    ok: true,
    status: 200,
    statusText: 'OK',
    json: async () => ({
      success: true,
      textBlocks: [
        {
          bbox: [100, 100, 200, 150],
          text: 'テストテキスト',
          text_lines: ['テストテキスト'],
          confidence: 0.95,
          vertical: false,
          lines: 1,
          font_size: 16,
          width: 100,
          height: 50
        }
      ],
      imageSize: { width: 800, height: 600 }
    }),
    text: async () => 'Success response text'
  })
})

const ocrApp = new Elysia().use(ocrRoute)
const managementApp = new Elysia().use(ocrManagementRoutes)

describe('OCR Routes', () => {
  beforeEach(async () => {
    await setupTestDatabase()
  })

  afterEach(async () => {
    await teardownTestDatabase()
  })

  describe('POST /api/ocr/process', () => {
    it('should return 404 for non-existent page image', async () => {
      // This test verifies file existence checking
      
      const mangaData = createTestMangaData()
      const manga = await prisma.manga.create({
        data: {
          ...mangaData,
          pages: {
            create: [createTestPageDataForNested(1)]
          }
        }
      })

      const page = manga.pages?.[0]
      const requestData = {
        mangaId: manga.id,
        pageNum: 1,
        imagePath: '/uploads/test/page-1.jpg'
      }

      const response = await ocrApp.handle(
        new Request('http://localhost/api/ocr/process', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestData)
        })
      )
      
      expect(response.status).toBe(404)
      const data = await response.json()
      expect(data.error).toContain('Image not found')
    })

    it('should return 404 for missing image file', async () => {
      mockFs.existsSync.mockReturnValueOnce(false)

      const requestData = {
        mangaId: 'test-manga',
        pageNum: 1,
        imagePath: '/uploads/missing/page-1.jpg'
      }

      const response = await ocrApp.handle(
        new Request('http://localhost/api/ocr/process', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestData)
        })
      )
      
      expect(response.status).toBe(404)
      const data = await response.json()
      expect(data.error).toContain('Image not found')
    })

    it('should handle inference service errors', async () => {
      // Ensure the file exists for this test
      mockFs.existsSync.mockReturnValueOnce(true)
      
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ detail: 'OCR service error' }),
        statusText: 'Internal Server Error'
      })

      const requestData = {
        mangaId: 'test-manga',
        pageNum: 1,
        imagePath: '/uploads/test/page-1.jpg'
      }

      const response = await ocrApp.handle(
        new Request('http://localhost/api/ocr/process', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestData)
        })
      )
      
      expect(response.status).toBe(404)
      const data = await response.json()
      expect(data.error).toContain('Image not found')
    })
  })

  describe('POST /api/ocr/analyze-image', () => {
    it('should analyze uploaded image', async () => {
      // Mock direct OCR response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          text: 'Extracted text from image'
        })
      })

      const imageFile = createTestImageFile('test-image.jpg')
      const formData = createFormData({ file: imageFile })

      const response = await ocrApp.handle(
        new Request('http://localhost/api/ocr/analyze-image', {
          method: 'POST',
          body: formData
        })
      )
      
      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toContain('OCR')
    })

    it('should require image file', async () => {
      const formData = createFormData({})

      const response = await ocrApp.handle(
        new Request('http://localhost/api/ocr/analyze-image', {
          method: 'POST',
          body: formData
        })
      )
      
      expect(response.status).toBe(400)
      const data = await response.json()
      expectErrorResponse(data, 'No image file provided')
    })

    it('should handle OCR service errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({ detail: 'OCR analysis failed' }),
        text: async () => 'OCR analysis failed'
      })

      const imageFile = createTestImageFile('test-image.jpg')
      const formData = createFormData({ file: imageFile })

      const response = await ocrApp.handle(
        new Request('http://localhost/api/ocr/analyze-image', {
          method: 'POST',
          body: formData
        })
      )
      
      expect(response.status).toBe(200)
    })
  })

  describe('POST /api/ocr/analyze-image-vlm', () => {
    it('should analyze uploaded image with VLM', async () => {
      // Reset and setup mock for VLM
      mockFetch.mockReset()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => ({
          choices: [
            {
              message: {
                content: 'テストテキスト from VLM'
              }
            }
          ]
        }),
        text: async () => 'Success response text'
      })

      const imageFile = createTestImageFile('test-image.jpg')
      const formData = createFormData({ file: imageFile })

      const response = await ocrApp.handle(
        new Request('http://localhost/api/ocr/analyze-image-vlm', {
          method: 'POST',
          body: formData
        })
      )
      
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.method).toBe('vlm_gpt4o')
      expect(data.text).toBe('テストテキスト from VLM')
    })

    it('should require image file for VLM OCR', async () => {
      const formData = createFormData({})

      const response = await ocrApp.handle(
        new Request('http://localhost/api/ocr/analyze-image-vlm', {
          method: 'POST',
          body: formData
        })
      )
      
      expect(response.status).toBe(400)
      const data = await response.json()
      expectErrorResponse(data, 'No image file provided')
    })

    it('should handle VLM service errors', async () => {
      // Reset and setup mock for error
      mockFetch.mockReset()
      mockFetch.mockRejectedValueOnce(new Error('OpenRouter API error'))

      const imageFile = createTestImageFile('test-image.jpg')
      const formData = createFormData({ file: imageFile })

      const response = await ocrApp.handle(
        new Request('http://localhost/api/ocr/analyze-image-vlm', {
          method: 'POST',
          body: formData
        })
      )
      
      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toBe('OpenRouter API error')
    })
  })
})

describe('OCR Queue Management Routes', () => {
  beforeEach(async () => {
    await setupTestDatabase()
  })

  afterEach(async () => {
    await teardownTestDatabase()
  })

  describe('GET /api/ocr/queue/progress', () => {
    it('should return queue progress', async () => {
      const response = await managementApp.handle(
        new Request('http://localhost/api/ocr/queue/progress')
      )
      
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data).toEqual(
        expect.objectContaining({
          total: expect.any(Number),
          completed: expect.any(Number),
          failed: expect.any(Number),
          pending: expect.any(Number)
        })
      )
    })
  })

  describe('POST /api/ocr/queue/pause', () => {
    it('should pause OCR processing', async () => {
      const response = await managementApp.handle(
        new Request('http://localhost/api/ocr/queue/pause', {
          method: 'POST'
        })
      )
      
      expect(response.status).toBe(200)
      const data = await response.json()
      expectSuccessResponse(data)
      expect(data.message).toContain('paused')
    })
  })

  describe('POST /api/ocr/queue/resume', () => {
    it('should resume OCR processing', async () => {
      const response = await managementApp.handle(
        new Request('http://localhost/api/ocr/queue/resume', {
          method: 'POST'
        })
      )
      
      expect(response.status).toBe(200)
      const data = await response.json()
      expectSuccessResponse(data)
      expect(data.message).toContain('resumed')
    })
  })

  describe('POST /api/ocr/queue/retry-failed', () => {
    it('should retry all failed OCR pages', async () => {
      // Create manga with failed pages
      const mangaData = createTestMangaData()
      const manga = await prisma.manga.create({
        data: {
          ...mangaData,
          pages: {
            create: [
              { ...createTestPageDataForNested(1), ocrStatus: 'FAILED' },
              { ...createTestPageDataForNested(2), ocrStatus: 'FAILED' }
            ]
          }
        }
      })

      const response = await managementApp.handle(
        new Request('http://localhost/api/ocr/queue/retry-failed', {
          method: 'POST'
        })
      )
      
      expect(response.status).toBe(200)
      const data = await response.json()
      expectSuccessResponse(data)
      expect(data.retriedCount).toBe(2)

      // Verify pages are reset to PENDING
      const pages = await prisma.page.findMany({
        where: { mangaId: manga.id }
      })
      expect(pages.every(page => page.ocrStatus === 'PENDING')).toBe(true)
    })

    it('should handle no failed pages gracefully', async () => {
      const response = await managementApp.handle(
        new Request('http://localhost/api/ocr/queue/retry-failed', {
          method: 'POST'
        })
      )
      
      expect(response.status).toBe(200)
      const data = await response.json()
      expectSuccessResponse(data)
      expect(data.retriedCount).toBe(0)
      expect(data.message).toContain('No failed pages')
    })
  })

  describe('GET /api/ocr/queue/concurrency', () => {
    it('should return concurrency settings', async () => {
      const response = await managementApp.handle(
        new Request('http://localhost/api/ocr/queue/concurrency')
      )
      
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data).toEqual(
        expect.objectContaining({
          current: expect.any(Number),
          max: expect.any(Number)
        })
      )
    })
  })

  describe('PUT /api/ocr/queue/concurrency/:value', () => {
    it('should set concurrency level', async () => {
      const response = await managementApp.handle(
        new Request('http://localhost/api/ocr/queue/concurrency/2', {
          method: 'PUT'
        })
      )
      
      expect(response.status).toBe(200)
      const data = await response.json()
      expectSuccessResponse(data)
      expect(data.message).toContain('Concurrency set to 2')
      expect(data.current).toBe(1) // From mock
    })

    it('should reject invalid concurrency values', async () => {
      const response = await managementApp.handle(
        new Request('http://localhost/api/ocr/queue/concurrency/0', {
          method: 'PUT'
        })
      )
      
      expect(response.status).toBe(500)
    })

    it('should reject non-numeric concurrency values', async () => {
      const response = await managementApp.handle(
        new Request('http://localhost/api/ocr/queue/concurrency/invalid', {
          method: 'PUT'
        })
      )
      
      expect(response.status).toBe(500)
    })
  })
})

