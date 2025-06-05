import { Elysia } from 'elysia'
import { prisma } from '../lib/db'

// STRICT: Prevent tests from running against production/dev databases
if (process.env.NODE_ENV !== 'test') {
  throw new Error('🚨 TESTS MUST RUN WITH NODE_ENV=test! Current: ' + process.env.NODE_ENV)
}

// Double check database URL to ensure it's a test database
const dbUrl = process.env.DATABASE_URL
if (!dbUrl || !dbUrl.includes('test')) {
  throw new Error('🚨 DATABASE_URL must contain "test" for safety! Current: ' + dbUrl)
}

console.log('✅ Test environment verified - using database:', dbUrl)

// Create a test app factory
export function createTestApp() {
  return new Elysia()
}

// Database cleanup utilities
export async function cleanupDatabase() {
  // Delete ALL test data (aggressive cleanup for tests)
  // This ensures clean state between tests
  await prisma.textBlock.deleteMany({})
  await prisma.page.deleteMany({})
  await prisma.manga.deleteMany({})
  await prisma.ocrCompletionStatus.deleteMany({})
}

// Test data factories
export function createTestMangaData() {
  return {
    id: `test_manga_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    title: 'Test Manga',
    type: 'Volume' as const,
    thumbnail: '/test/thumbnail.jpg'
  }
}

export function createTestPageData(mangaId: string, pageNum: number) {
  return {
    id: `test_page_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    mangaId,
    pageNum,
    imagePath: `/test/page-${pageNum}.jpg`,
    ocrStatus: 'PENDING' as const
  }
}

export function createTestPageDataForNested(pageNum: number) {
  return {
    id: `test_page_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    pageNum,
    imagePath: `/test/page-${pageNum}.jpg`,
    ocrStatus: 'PENDING' as const
  }
}

export function createTestTextBlockData(pageId: string) {
  return {
    id: `test_block_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    pageId,
    text: 'テストテキスト',
    bbox: JSON.stringify([100, 100, 200, 150]),
    textLines: JSON.stringify(['テストテキスト']),
    confidence: 0.95,
    vertical: false,
    lines: 1,
    fontSize: 16,
    width: 100,
    height: 50
  }
}

// Mock external services
export function mockIchiranService() {
  return {
    tokenize: (text: string) => Promise.resolve([
      {
        text: 'テスト',
        pos: 'noun',
        reading: 'テスト',
        meaning: 'test'
      }
    ]),
    isAvailable: () => Promise.resolve(true),
    getConfig: () => ({ enabled: true }),
    restart: () => Promise.resolve(),
    getAlternatives: () => Promise.resolve([])
  }
}

export function mockOcrQueue() {
  return {
    addPage: () => {},
    getProgress: () => ({ total: 0, completed: 0, failed: 0, pending: 0 }),
    pause: () => {},
    resume: () => {},
    setPriority: () => {},
    getConcurrency: () => 1,
    getMaxConcurrency: () => 4,
    setConcurrency: () => {}
  }
}

// Helper to create multipart form data for file uploads
export function createFormData(data: Record<string, any>) {
  const formData = new FormData()
  
  for (const [key, value] of Object.entries(data)) {
    if (value instanceof File) {
      formData.append(key, value)
    } else if (Array.isArray(value)) {
      value.forEach(item => formData.append(key, item))
    } else {
      formData.append(key, String(value))
    }
  }
  
  return formData
}

// Create test file objects
export function createTestFile(name: string, content: string, type: string) {
  return new File([content], name, { type })
}

export function createTestImageFile(name: string = 'test.jpg') {
  // Create a minimal JPEG-like binary content
  const content = new Uint8Array([
    0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46,
    0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x48,
    0x00, 0x48, 0x00, 0x00, 0xFF, 0xD9
  ])
  return new File([content], name, { type: 'image/jpeg' })
}

export function createTestPdfFile(name: string = 'test.pdf') {
  // Create a minimal PDF-like binary content
  const content = '%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n%%EOF'
  return new File([content], name, { type: 'application/pdf' })
}

// Assertion helpers
export function expectSuccessResponse(response: any) {
  expect(response.success).toBe(true)
}

export function expectErrorResponse(response: any, message?: string) {
  expect(response.error).toBeDefined()
  if (message) {
    expect(response.error).toContain(message)
  }
}

// Test setup and teardown
export async function setupTestDatabase() {
  await cleanupDatabase()
}

export async function teardownTestDatabase() {
  await cleanupDatabase()
}