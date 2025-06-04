# Manga Reader - Claude Code Memory

## 🎯 Project Overview
Self-hosted manga reader web application for Japanese language learning. Microservices architecture with TypeScript frontend/backend and Python OCR services.

## 🏗️ Architecture

### Frontend - Port 5847
- **Stack**: React 18 + TypeScript + Vite + shadcn/ui + react-zoom-pan-pinch + react-window
- **Features**: Real-time OCR progress, WebSocket integration, 3 reading modes with custom scrolling

### Backend - Port 3847  
- **Stack**: Elysia + Bun + SQLite + Prisma
- **Features**: OCR queue management, PDF processing, AI metadata fetching

### Inference Service - Port 8847
- **Stack**: FastAPI + Python + manga-ocr + comic_text_detector
- **Features**: Japanese text detection/extraction, debug image generation

### Ichiran Service - Docker
- **Stack**: Common Lisp + PostgreSQL
- **Features**: Japanese tokenization, dictionary lookups, conjugation analysis

## 📁 Project Structure
```
/home/tiger/komu/
├── frontend/             # React app (port 5847)
├── backend/              # Elysia API (port 3847)  
├── inference/            # Python OCR service (port 8847)
├── comic_text_detector/  # Git submodule - text detection
├── ichiran/              # Git submodule - tokenization
└── CLAUDE.md            # This file
```

## 🛠️ Quick Start

### Dependencies
```bash
# Install Bun
curl -fsSL https://bun.sh/install | bash

# Install ImageMagick  
sudo apt update && sudo apt install imagemagick

# Install project dependencies
cd frontend && bun install
cd ../backend && bun install

# Setup database
cd backend && bunx prisma generate && bunx prisma db push

# Setup Python environment
cd inference && source ../.venv/bin/activate && pip install -r requirements.txt
```

### Start Services
```bash
# Terminal 1: Backend
cd backend && bun run dev

# Terminal 2: Frontend
cd frontend && bun run dev

# Terminal 3: Inference
cd inference && ./start_service.sh
```

## ⚙️ Configuration

### Environment Variables
**Backend (.env)**
```bash
BACKEND_PORT=3847
FRONTEND_PORT=5847
INFERENCE_PORT=8847
OPENROUTER_API_KEY=your_key_here
ICHIRAN_PATH=../ichiran
```

**Frontend (.env)**
```bash
FRONTEND_PORT=5847
VITE_BACKEND_PORT=3847
```

**Inference (.env)**
```bash
INFERENCE_PORT=8847
GENERATE_DEBUG_IMAGES=true
```

## 🎮 Core Features

- ✅ **PDF Upload**: Drag & drop with automatic JPG conversion
- ✅ **OCR Processing**: Background queue with real-time progress
- ✅ **Reader Interface**: RTL/LTR/scroll modes with zoom/pan
- ✅ **Text Overlays**: Interactive Japanese text extraction
- ✅ **AI Metadata**: OpenRouter API for author/description suggestions
- ✅ **Debug Mode**: Visual OCR validation with bounding boxes
- ✅ **WebSocket Updates**: Real-time status and progress
- ✅ **Library Management**: Grid view with thumbnails
- ✅ **Custom Scrolling**: Virtualized vertical scrolling with zoom/pan support

## 📖 Reading Modes

### RTL/LTR Modes (Swiper-based)
- **Implementation**: SwiperGallery component with Swiper.js
- **Features**: Page-by-page navigation, zoom via `swiper-zoom-target`
- **Navigation**: Arrow keys, click zones, swipe gestures
- **Text Overlays**: SVG overlays with zoom synchronization

### Scrolling Mode (Custom Implementation)
- **Implementation**: ScrollingGallery with react-window + react-zoom-pan-pinch
- **Features**: Continuous vertical scrolling, virtualized rendering
- **Architecture**:
  ```
  TransformWrapper (zoom/pan)
  └── TransformComponent
      └── VariableSizeList (virtualization)
          └── ScrollingSlide components
  ```
- **Smart Interactions**:
  - Scale = 1.0: Native scrolling, panning disabled
  - Scale > 1.0: Zoom/pan enabled, wheel zooms instead of scrolls
- **Performance**: Only renders visible pages + 2 overscan buffer
- **Height Calculation**: Dynamic sizing based on image aspect ratios

### Zoom/Pan Behavior
- **Double-click**: Toggle between 1x ↔ 1.5x zoom
- **Pinch**: Touch zoom with momentum
- **Mouse Wheel**: Conditional behavior based on zoom level
- **Text Overlays**: Synchronized transforms in all modes

## 📋 Database Schema

- **manga**: title, author, type, pages, OCR status
- **pages**: images with ordering and completion status  
- **text_blocks**: OCR text with positioning and dimensions

## 🚀 Production Setup

### System Requirements
- **Bun**: Package manager and runtime
- **Python 3.13**: For inference service
- **ImageMagick**: PDF processing
- **Docker**: For ichiran service
- **NVIDIA GPU**: Optional, faster OCR

### Ports
- Frontend: 5847 (dev) / 80,443 (prod)
- Backend: 3847
- Inference: 8847

### Production Checklist
- [ ] Reverse proxy for all services
- [ ] HTTPS and domain routing
- [ ] File backups (database + uploads)
- [ ] Disk space monitoring
- [ ] Environment variables configured

## 🔧 Common Issues

- **Port Conflicts**: Check PORTS.md for configuration
- **Python Environment**: Use `.venv` not `venv` - path `../.venv/bin/activate`
- **Debug Images**: Enable with `GENERATE_DEBUG_IMAGES=true`
- **CORS**: API calls use Vite proxy (`/api/*` and `/uploads/*`)

## 🤝 Development Guidelines

1. **Architecture**: Microservices - separate frontend, backend, inference
2. **Package Manager**: Use Bun for TypeScript/JavaScript projects
3. **TypeScript**: Strict typing, avoid `any` types
4. **OCR Processing**: HTTP API calls only, no embedded Python
5. **Git Submodules**: Use `git submodule update --remote` to update dependencies

## 🤖 AI Integration

### Metadata Fetching
- **Model**: `openai/gpt-4o-search-preview`
- **Sources**: Amazon.co.jp, Japanese bookstores
- **Output**: Structured JSON with Japanese names/descriptions

### OCR Pipeline
- **Detection**: comic_text_detector for bounding boxes
- **Extraction**: manga-ocr for Japanese text
- **Debug**: Green boxes + orange text overlay
- **Storage**: `page-*_debug.jpg` in uploads

## 📱 iOS & PWA Optimizations

### Progressive Web App Support
- **Manifest**: `/manifest.json` with standalone display mode
- **Add to Home Screen**: Full app experience when launched from iOS home screen
- **Navigation**: SPA routing keeps all navigation within single WebView
- **Icons**: 192x192 and 512x512 PNG icons for home screen

### iOS-Specific Optimizations
- **Status Bar**: Black status bar with proper safe area handling
- **Scrollbar Hiding**: Aggressive webkit scrollbar removal in Reader
- **Touch Handling**: Disabled bounce scrolling, tap highlights, text selection
- **Safe Areas**: PWA-only safe area padding using `@media (display-mode: standalone)`
- **Viewport**: Dynamic viewport height (`100dvh`) for proper mobile sizing

### Key CSS Classes
```css
.ios-full-height {
  height: 100vh;
  height: 100dvh;
  overflow: hidden;
  position: fixed;
  touch-action: none;
}

@media (display-mode: standalone) {
  .pwa-safe-bottom { padding-bottom: max(1rem, env(safe-area-inset-bottom)); }
  .pwa-safe-top { padding-top: max(1rem, env(safe-area-inset-top)); }
  .pwa-safe-x { padding-left/right: max(1rem, env(safe-area-inset-left/right)); }
}
```

## 🎯 Text Overlay System

### Smart Visibility
- **Default**: Text boxes invisible (hover-only discovery)
- **Grammar Mode**: Selected text block highlighted with green border
- **Selective Highlighting**: Only clicked block remains visible during analysis
- **State Management**: `selectedBlockIndex` tracks active text block across all components

### Component Chain
```
Reader.tsx (selectedBlockIndex state)
├── SwiperGallery/ScrollingGallery (pass props)
└── SvgTextOverlay (render based on selection)
```

### Mobile Library Interaction
- **Cover Tap**: Direct navigation to manga reader
- **Title Tap**: Shows Edit/Delete buttons (mobile only)
- **Responsive**: Desktop uses hover, mobile uses tap interaction
- **Accessibility**: Large touch targets for mobile management actions

## 🔄 Scrolling Mode Technical Details

### Height Calculation
- **Constraint**: `Math.min(containerWidth * aspectRatio, windowHeight)`
- **Dynamic Updates**: `resetAfterIndex(0, true)` when image dimensions load
- **Gap Prevention**: Proper aspect ratio calculation eliminates spacing issues
- **First Page**: No special treatment, consistent with all other pages

### Image Loading Timeline
1. **Initial Render**: Uses default 1.4 aspect ratio
2. **OCR Processing**: Real dimensions loaded into `scrollImageSizes`
3. **Auto-Recalculation**: `useEffect` triggers list height updates
4. **Final Layout**: All gaps resolved with actual image dimensions
