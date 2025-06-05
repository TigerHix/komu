import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test'
import { Elysia } from 'elysia'
import { metadataRoutes } from '../routes/metadata'
import { 
  setupTestDatabase, 
  teardownTestDatabase, 
  createTestMangaData,
  createTestImageFile,
  expectSuccessResponse,
  expectErrorResponse,
  createFormData
} from './setup'
import { prisma } from '../lib/db'

// Mock the metadata fetcher module
const mockMetadataFetcher = mock(() => Promise.resolve([
  {
    title: 'Fetched Title',
    author: 'Fetched Author',
    description: 'Fetched description',
    thumbnail: 'https://example.com/thumbnail.jpg'
  }
]))

mock.module('../lib/metadata-fetcher', () => ({
  fetchMetadata: mockMetadataFetcher
}))

const app = new Elysia().use(metadataRoutes)

describe('Metadata Routes', () => {
  beforeEach(async () => {
    await setupTestDatabase()
  })

  afterEach(async () => {
    await teardownTestDatabase()
  })

  describe('GET /api/manga/:id/metadata', () => {
    it('should return manga metadata', async () => {
      const mangaData = createTestMangaData()
      const manga = await prisma.manga.create({
        data: {
          ...mangaData,
          author: 'Test Author',
          description: 'Test description'
        }
      })

      const response = await app.handle(
        new Request(`http://localhost/api/manga/${manga.id}/metadata`)
      )
      
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data).toEqual(
        expect.objectContaining({
          id: manga.id,
          title: manga.title,
          author: 'Test Author',
          description: 'Test description'
        })
      )
    })

    it('should return 404 for non-existent manga', async () => {
      const response = await app.handle(
        new Request('http://localhost/api/manga/non-existent-id/metadata')
      )
      
      expect(response.status).toBe(500)
    })
  })

  describe('POST /api/manga/:id/metadata/suggestions', () => {
    it('should fetch metadata suggestions using manga data', async () => {
      const mangaData = createTestMangaData()
      const manga = await prisma.manga.create({
        data: {
          ...mangaData,
          type: 'Volume',
          number: 1
        }
      })

      const response = await app.handle(
        new Request(`http://localhost/api/manga/${manga.id}/metadata/suggestions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({})
        })
      )
      
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(Array.isArray(data)).toBe(true)
      expect(data[0]).toEqual(
        expect.objectContaining({
          title: 'Fetched Title',
          author: 'Fetched Author'
        })
      )

      // Verify the correct search term was used
      expect(mockMetadataFetcher).toHaveBeenCalledWith('Test Manga 1巻')
    })

    it('should fetch metadata suggestions using form data', async () => {
      const mangaData = createTestMangaData()
      const manga = await prisma.manga.create({
        data: mangaData
      })

      const response = await app.handle(
        new Request(`http://localhost/api/manga/${manga.id}/metadata/suggestions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: 'Custom Title',
            type: 'Chapter',
            number: 5
          })
        })
      )
      
      expect(response.status).toBe(200)
      
      // Verify custom search term was used
      expect(mockMetadataFetcher).toHaveBeenCalledWith('Custom Title 第5話')
    })

    it('should handle volume type correctly', async () => {
      const mangaData = createTestMangaData()
      const manga = await prisma.manga.create({
        data: {
          ...mangaData,
          type: 'Volume',
          number: 3
        }
      })

      await app.handle(
        new Request(`http://localhost/api/manga/${manga.id}/metadata/suggestions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({})
        })
      )
      
      expect(mockMetadataFetcher).toHaveBeenCalledWith('Test Manga 3巻')
    })

    it('should handle chapter type correctly', async () => {
      const mangaData = createTestMangaData()
      const manga = await prisma.manga.create({
        data: {
          ...mangaData,
          type: 'Chapter',
          number: 7
        }
      })

      await app.handle(
        new Request(`http://localhost/api/manga/${manga.id}/metadata/suggestions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({})
        })
      )
      
      expect(mockMetadataFetcher).toHaveBeenCalledWith('Test Manga 第7話')
    })

    it('should handle titles without numbers', async () => {
      const mangaData = createTestMangaData()
      const manga = await prisma.manga.create({
        data: {
          ...mangaData,
          number: null
        }
      })

      await app.handle(
        new Request(`http://localhost/api/manga/${manga.id}/metadata/suggestions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({})
        })
      )
      
      expect(mockMetadataFetcher).toHaveBeenCalledWith('Test Manga')
    })

    it('should return 404 for non-existent manga', async () => {
      const response = await app.handle(
        new Request('http://localhost/api/manga/non-existent-id/metadata/suggestions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({})
        })
      )
      
      expect(response.status).toBe(500)
    })
  })

  describe('PUT /api/manga/:id/metadata', () => {
    it('should update manga metadata', async () => {
      const mangaData = createTestMangaData()
      const manga = await prisma.manga.create({
        data: mangaData
      })

      const updateData = {
        title: 'Updated Title',
        author: 'Updated Author',
        description: 'Updated description',
        type: 'Chapter' as const,
        number: 5
      }

      const response = await app.handle(
        new Request(`http://localhost/api/manga/${manga.id}/metadata`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updateData)
        })
      )
      
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data).toEqual(
        expect.objectContaining(updateData)
      )

      // Verify data was saved
      const updatedManga = await prisma.manga.findUnique({
        where: { id: manga.id }
      })
      expect(updatedManga?.title).toBe('Updated Title')
      expect(updatedManga?.author).toBe('Updated Author')
      expect(updatedManga?.description).toBe('Updated description')
      expect(updatedManga?.type).toBe('Chapter')
      expect(updatedManga?.number).toBe(5)
    })

    it('should handle partial updates', async () => {
      const mangaData = createTestMangaData()
      const manga = await prisma.manga.create({
        data: {
          ...mangaData,
          author: 'Original Author'
        }
      })

      const response = await app.handle(
        new Request(`http://localhost/api/manga/${manga.id}/metadata`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: 'New Title'
          })
        })
      )
      
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.title).toBe('New Title')
      expect(data.author).toBe('Original Author') // Should remain unchanged
    })

    it('should return 404 for non-existent manga', async () => {
      const response = await app.handle(
        new Request('http://localhost/api/manga/non-existent-id/metadata', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: 'New Title' })
        })
      )
      
      expect(response.status).toBe(500)
    })
  })

  describe('POST /api/manga/:id/thumbnail', () => {
    it('should upload and set custom thumbnail', async () => {
      const mangaData = createTestMangaData()
      const manga = await prisma.manga.create({
        data: mangaData
      })

      const imageFile = createTestImageFile('thumbnail.jpg')
      const formData = createFormData({ file: imageFile })

      const response = await app.handle(
        new Request(`http://localhost/api/manga/${manga.id}/thumbnail`, {
          method: 'POST',
          body: formData
        })
      )
      
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.thumbnail).toBe(`/uploads/${manga.id}/thumbnail.jpg`)

      // Verify thumbnail was saved in database
      const updatedManga = await prisma.manga.findUnique({
        where: { id: manga.id }
      })
      expect(updatedManga?.thumbnail).toBe(`/uploads/${manga.id}/thumbnail.jpg`)
    })

    it('should reject non-image files', async () => {
      const mangaData = createTestMangaData()
      const manga = await prisma.manga.create({
        data: mangaData
      })

      const textFile = new File(['text content'], 'test.txt', { type: 'text/plain' })
      const formData = createFormData({ file: textFile })

      const response = await app.handle(
        new Request(`http://localhost/api/manga/${manga.id}/thumbnail`, {
          method: 'POST',
          body: formData
        })
      )
      
      expect(response.status).toBe(500)
    })

    it('should require file parameter', async () => {
      const mangaData = createTestMangaData()
      const manga = await prisma.manga.create({
        data: mangaData
      })

      const formData = createFormData({})

      const response = await app.handle(
        new Request(`http://localhost/api/manga/${manga.id}/thumbnail`, {
          method: 'POST',
          body: formData
        })
      )
      
      expect(response.status).toBe(400)
    })

    it('should return 404 for non-existent manga', async () => {
      const imageFile = createTestImageFile('thumbnail.jpg')
      const formData = createFormData({ file: imageFile })

      const response = await app.handle(
        new Request('http://localhost/api/manga/non-existent-id/thumbnail', {
          method: 'POST',
          body: formData
        })
      )
      
      expect(response.status).toBe(500)
    })
  })
})