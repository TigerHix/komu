# Komu Manga Reader - Development Guide

## Overview
Self-hosted manga reader for Japanese language learning. Microservices architecture with TypeScript frontend/backend and Python OCR services.

## Architecture
- **Frontend**: React 18 + Vite + shadcn/ui + framer-motion (Port 5847)
- **Backend**: Elysia + Bun + SQLite + Prisma (Port 3847)
- **Inference**: FastAPI + manga-ocr + comic_text_detector (Port 8847)
- **Ichiran**: Common Lisp + PostgreSQL (Docker)

## Quick Start
```bash
# Dependencies
curl -fsSL https://bun.sh/install | bash
sudo apt install imagemagick

# Install & setup
cd frontend && bun install
cd ../backend && bun install && bunx prisma generate && bunx prisma db push
cd ../inference && source ../.venv/bin/activate && pip install -r requirements.txt

# Start services
cd backend && bun run dev      # Terminal 1
cd frontend && bun run dev     # Terminal 2  
cd inference && ./start_service.sh  # Terminal 3
```

## Key Features
- **PDF Upload**: Drag & drop with JPG conversion
- **OCR Processing**: Background queue with real-time progress
- **Reading Modes**: RTL/LTR/scroll with zoom/pan
- **Text Overlays**: Interactive Japanese text extraction + editing
- **Grammar Analysis**: Japanese tokenization with furigana
- **PWA Support**: Full-screen iOS experience with notch embrace
- **Apple-Style UI**: SF Pro typography, spring animations
- **Internationalization**: English/Chinese support with localStorage persistence

## Reading Modes

### RTL/LTR (Swiper-based)
- Page-by-page navigation with zoom
- Arrow keys, click zones, swipe gestures
- SVG text overlays with zoom sync

### Scrolling (Custom)
- Virtualized vertical scrolling with react-window
- Smart zoom/pan: Scale=1.0 native scroll, >1.0 zoom mode
- Dynamic height calculation based on aspect ratios

## Text System
- **OCR Pipeline**: comic_text_detector → manga-ocr → text extraction
- **Edit Flow**: Click text → grammar analysis → edit button → save → cache update
- **Cache Management**: Direct OCR service cache updates for immediate refresh
- **Grammar Analysis**: Ichiran tokenization with POS highlighting
- **Component Structure**: GrammarBreakdown uses SentenceDisplay, TokenDetails, ExplainInterface, EditTextModal

## iOS/PWA Optimizations
```css
/* Full-screen PWA */
@media (display-mode: standalone) {
  html {
    min-height: calc(100% + env(safe-area-inset-top));
    padding: env(safe-area-inset-*);
  }
}
```
- Native touch events for long press (500ms timeout)
- 10px movement threshold for scroll vs tap detection
- Dynamic status bar theme (black in reader, accent in library)

## Package Management
```
packages/
├── comic_text_detector/    # Text detection models
├── ichiran/               # Japanese tokenization  
└── react-sheet-slide/     # Forked PWA-optimized sheets
```
**Note**: Migrated from git submodules to regular directories for better dependency management.

## Environment Variables
```bash
# Backend .env
BACKEND_PORT=3847
OPENROUTER_API_KEY=your_key_here
ICHIRAN_PATH=../packages/ichiran

# Frontend .env  
FRONTEND_PORT=5847
VITE_BACKEND_PORT=3847

# Inference .env
INFERENCE_PORT=8847
GENERATE_DEBUG_IMAGES=true
```

## 🎨 Design System

### Apple-Inspired Design Language
- **Typography**: SF Pro Display/Text with semantic size classes (apple-title-2, apple-body, etc.)
- **Color System**: Semantic tokens with dark mode support
- **Motion**: Framer Motion with spring physics (stiffness: 400-500, damping: 25-30)
- **Touch Feedback**: Haptic feedback, iOS-style press states, gesture handling

### Animation Patterns
- **Card Interactions**: App Store-style bounce animations with scale and overshoot
- **Page Transitions**: Cover-based transitions with backdrop blur
- **Long Press**: iOS-native touch events with 500ms timeout, scroll gesture cancellation
- **UI Transitions**: Staggered reveals, smooth slide-ins with proper easing

### Typography Scale (Apple Human Interface Guidelines)
```css
.apple-title-2: 28px/34px, weight 700, tracking 0.36px
.apple-headline: 17px/22px, weight 600, tracking -0.43px
.apple-body: 17px/22px, weight 400, tracking -0.43px
.apple-callout: 16px/21px, weight 400, tracking -0.32px
.apple-caption-1: 12px/16px, weight 400, tracking 0px
```
## Development Guidelines
1. Use Bun for TypeScript/JavaScript projects
2. Follow Apple Human Interface Guidelines for design
3. Use framer-motion with spring physics (stiffness: 400-500, damping: 25-30)
4. Implement scroll detection for mobile gesture safety
5. Native touch events for iOS compatibility
6. Direct OCR cache updates instead of API refetching
7. Extract complex components into composable modules (utils/, hooks/, components/)

## Common Issues
- **Port Conflicts**: Check PORTS.md
- **Python Environment**: Use `../.venv/bin/activate`
- **iOS Long Press**: Use native touch events, not framer-motion
- **Text Cache**: Use `ocrService.updateTextBlock()` for immediate updates
- **PWA Status Bar**: Dynamic theme-color meta tag required

## Testing

### Test Suite Overview
Comprehensive test coverage with **117 passing tests** across 8 test files using Bun's built-in test framework.

### Test Categories
- **Metadata Routes**: 15 tests - API metadata fetching, suggestions, thumbnails
- **Explanations Routes**: 15 tests - AI chat explanations, streaming, error handling
- **Text Blocks Routes**: 9 tests - Text editing, validation, character handling
- **Upload Routes**: 15 tests - Image/PDF uploads, file validation, error scenarios
- **Pages Routes**: 13 tests - Page viewing, OCR prioritization, status tracking  
- **OCR Routes**: 19 tests - Processing pipeline, queue management, notifications
- **Manga Routes**: 12 tests - CRUD operations, progress tracking, deletion
- **Japanese Routes**: 19 tests - Tokenization, health checks, alternatives

### Running Tests
```bash
# Run all tests
cd backend && bun test

# Run specific test file
bun test src/test/manga.test.ts

# Run specific test pattern
bun test --test-name-pattern="should upload"

# Run with verbose output
bun test --verbose
```

### Test Environment Setup
- **Database**: Isolated `test.db` with automatic cleanup between tests
- **Safety Checks**: Prevents running against production/dev databases
- **Mock Services**: External dependencies (OCR, Ichiran, OpenRouter) fully mocked
- **File System**: Mock fs operations for upload/PDF processing tests

### Key Testing Patterns

#### Database Isolation
```typescript
beforeEach(async () => {
  await setupTestDatabase()  // Clean slate
})

afterEach(async () => {
  await teardownTestDatabase()  // Cleanup
})
```

#### Mock Strategy
```typescript
// Module-level mocking for consistent behavior
mock.module('../lib/ocr-queue', () => ({
  ocrQueue: mockOcrQueue()
}))

// Reset mocks between tests
beforeEach(() => {
  mockService.mockReset()
  mockService.mockResolvedValue(defaultResponse)
})
```

#### Data Factories
```typescript
// Consistent test data creation
createTestMangaData()           // Standalone records
createTestPageDataForNested()   // Nested creation contexts
createTestImageFile('test.jpg') // File uploads
```

#### Error Testing
```typescript
// Mock failures to test error handling
mockService.mockRejectedValueOnce(new Error('Service failed'))
expect(response.status).toBe(500)
expect(data.error).toContain('Failed to process')
```

### Test Data Management
- **Factories**: Consistent test data with unique IDs
- **Cleanup**: Aggressive cleanup between tests for isolation
- **Validation**: Type-safe test data matching production schemas
- **Files**: Mock file objects for upload testing

### Debugging Tests
```bash
# Individual test debugging
bun test src/test/upload.test.ts --test-name-pattern="should handle errors"

# Check mock call history
expect(mockService).toHaveBeenCalledWith(expectedArgs)
expect(mockService).toHaveBeenCalledTimes(2)
```

### Best Practices
1. **Isolation**: Each test runs independently with clean state
2. **Mocking**: Mock external dependencies, test internal logic
3. **Coverage**: Test happy paths, edge cases, and error scenarios  
4. **Speed**: Fast execution with parallel test runs
5. **Clarity**: Descriptive test names and clear assertions

### Common Test Patterns
- **Status Code Validation**: Match actual framework behavior (400 vs 500)
- **Error Message Checking**: Flexible error format handling
- **Mock Verification**: Ensure expected service calls
- **Database State**: Verify data persistence and relationships
- **File Operations**: Test upload, processing, and cleanup flows

## Internationalization (i18n)
- **Library**: react-i18next with browser language detection
- **Languages**: English (en) and Chinese (zh)
- **Storage**: localStorage persistence, English fallback
- **Files**: `src/i18n/index.ts` + `locales/en.json` + `locales/zh.json`
- **Settings**: Language switcher in Settings page

## Database Schema
- **manga**: title, author, type, pages, OCR status
- **pages**: images with ordering and completion status
- **text_blocks**: OCR text with positioning and dimensions