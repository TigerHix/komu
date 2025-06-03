# Manga Reader Project - Claude Code Memory

## 🎯 Project Overview
Self-hosted manga reader web application focused on Japanese language learning. Built with microservices architecture using TypeScript and Python.

## 🏗️ Architecture

### Frontend (React + shadcn/ui) - Port 5847
- **Framework**: React 18 + TypeScript + Vite
- **UI Library**: shadcn/ui components (Radix UI + Tailwind CSS)
- **Features**: Real-time OCR progress, WebSocket integration, connection status monitoring

### Backend (Elysia + TypeScript) - Port 3847
- **Framework**: Elysia (Bun-based)
- **Database**: SQLite + Prisma ORM
- **File Processing**: pdf2pic for PDF → JPG conversion
- **AI Integration**: OpenRouter API for Japanese metadata fetching
- **Features**: OCR queue management, WebSocket communication, automatic startup checks

### Inference Service (FastAPI + Python) - Port 8847
- **Framework**: FastAPI with uvicorn
- **Models**: comic_text_detector + manga-ocr for Japanese text detection/extraction
- **Features**: Debug image generation, model caching, configurable debug mode

### Ichiran Tokenization Service (Docker-based)
- **Framework**: Common Lisp + PostgreSQL via Docker Compose
- **Features**: Superior Japanese text segmentation, dictionary lookups, conjugation analysis
- **Integration**: Self-managing Docker containers, auto-startup, graceful cleanup
- **API**: `/api/tokenize` endpoints in TypeScript backend

## 📁 Project Structure
```
/home/tiger/komu/
├── frontend/                 # React frontend (port 5847)
├── backend/                  # Elysia backend (port 3847)
│   ├── src/routes/          # API endpoints (manga, ocr, reader, etc.)
│   ├── src/lib/             # Core services (ocr-queue, websocket, etc.)
│   ├── prisma/schema.prisma # Database schema
│   └── uploads/             # Manga files & debug images
├── inference/               # FastAPI service (port 8847)
│   ├── src/main.py          # OCR endpoints
│   ├── start_service.sh/.py # Startup scripts
│   └── requirements.txt     # Python dependencies
├── comic_text_detector/     # ML model library
├── mokuro/                  # Mokuro OCR library
├── ichiran/                 # Japanese tokenization service (Docker-based)
├── PORTS.md                 # Port configuration guide
└── CLAUDE.md               # This file
```

## 🗄️ Storage & Data

### Database (SQLite + Prisma)
- **manga**: Metadata (title, author, type, pages, OCR status)
- **pages**: Individual page images with ordering and OCR completion status
- **text_blocks**: OCR text extraction with positioning and dimensions

### File System
- **Images**: `uploads/{mangaId}/page-*.jpg`
- **Debug Images**: `uploads/{mangaId}/page-*_debug.jpg` (when debug enabled)
- **Thumbnails**: Auto-generated from first page

## 🛠️ Development Commands

### Quick Start (3 Services)
```bash
# Terminal 1: Backend
cd backend && bun run dev

# Terminal 2: Frontend  
cd frontend && bun run dev

# Terminal 3: Inference Service
cd inference && ./start_service.sh
```

### Inference Service Configuration
```bash
# Environment variables
export INFERENCE_PORT=8847          # Service port (default: 8847)
export GENERATE_DEBUG_IMAGES=true   # Enable/disable debug images (default: true)
export INFERENCE_SERVICE_URL=http://localhost:8847  # Backend → Inference URL (auto-constructed from port)
```

### Environment Variables
```bash
# Backend (.env)
BACKEND_PORT=3847                           # Backend server port
FRONTEND_PORT=5847                          # Frontend port (for CORS)
INFERENCE_PORT=8847                         # Inference service port
INFERENCE_SERVICE_URL=http://localhost:8847 # Optional, auto-constructed from port
OPENROUTER_API_KEY=your_key_here           # For AI metadata fetching

# Frontend (.env)
FRONTEND_PORT=5847                         # Dev server port
VITE_BACKEND_PORT=3847                     # Backend port (for WebSocket)

# Inference (.env)
INFERENCE_PORT=8847                        # Service port
FRONTEND_PORT=5847                         # Frontend port (for CORS)
BACKEND_PORT=3847                          # Backend port (for CORS)
GENERATE_DEBUG_IMAGES=true                 # Enable debug images

# Ichiran Service (Backend)
ICHIRAN_PATH=../../../ichiran               # Path to ichiran directory (default: ../../../ichiran)
ICHIRAN_CONTAINER_NAME=komu-ichiran-service # Docker container name (default: komu-ichiran-service)
```

## 🎮 Features

### ✅ Core Features
- **PDF Upload & Processing**: Drag & drop with automatic JPG conversion
- **AI Metadata Fetching**: OpenRouter API for Japanese author/description suggestions
- **Library Management**: Grid view with thumbnails and inline editing
- **Reader Interface**: 3 reading modes (RTL, LTR, scrolling), zoom/pan constraints, click navigation
- **Production OCR System**: Automatic background processing with queue management
- **Interactive Text Overlays**: Hover popups with Japanese text extraction
- **Real-time Progress**: WebSocket updates for OCR processing status
- **Connection Monitoring**: Automatic reconnection with status overlay
- **Debug Mode**: Visual validation images with bounding boxes

### 📋 Future Features
- **Search Integration**: Full-text search through OCR'd content
- **Reading Progress**: Track page completion and bookmarks
- **Dictionary Integration**: Hover/tap for word definitions
- **Collections**: Organize manga into series
- **User Authentication**: Multi-user support

## 🚀 Production Setup

### System Requirements
- **Bun**: Package manager and runtime for both frontend and backend
- **Python 3.13**: Inference service with manga-ocr, comic_text_detector
- **ImageMagick**: PDF processing
- **NVIDIA GPU**: Optional, for faster OCR processing

### Default Ports (see PORTS.md for configuration)
- **Frontend**: 5847 (dev) / 80,443 (prod)
- **Backend**: 3847
- **Inference**: 8847

### Production Checklist
- [ ] Set up reverse proxy for all 3 services
- [ ] Configure HTTPS and domain routing
- [ ] Set up file backups (database + uploads + debug images)
- [ ] Monitor disk space (manga images + debug images can be large)
- [ ] Configure environment variables for all services

## 🔧 Important Setup Notes

### Initial Setup
```bash
# 1. Install Bun (if not already installed)
curl -fsSL https://bun.sh/install | bash

# 2. Install ImageMagick (required for PDF processing)
sudo apt update && sudo apt install imagemagick

# 3. Install dependencies for frontend and backend
cd frontend && bun install
cd ../backend && bun install

# 4. Setup database
cd backend && bunx prisma generate && bunx prisma db push

# 5. Install Python dependencies for inference service (IMPORTANT: use .venv not venv)
cd inference && source ../.venv/bin/activate && pip install -r requirements.txt
```

### Common Issues
- **Port Conflicts**: Check PORTS.md for configuration. Default ports: Frontend 5847, Backend 3847, Inference 8847
- **Python Virtual Environment**: ALWAYS use `.venv` not `venv` - path is `../.venv/bin/activate`
- **Startup Scripts**: Inference service startup scripts may have hardcoded ports - use environment variables
- **Debug Images**: Check `GENERATE_DEBUG_IMAGES=true` and file permissions in uploads directory
- **Large PDFs**: Background OCR processing handles timeouts automatically
- **CORS**: All API calls use Vite proxy (`/api/*` and `/uploads/*`)
- **Reader Architecture**: Code refactored into modular hooks and components for maintainability

## 🤝 Development Guidelines
1. **Architecture**: Follow microservices pattern - keep backend, inference, and frontend separate
2. **Package Manager**: Use Bun for all TypeScript/JavaScript projects (frontend and backend)
3. **TypeScript**: Use strict typing, avoid `any` types
4. **OCR Processing**: Always use HTTP API calls, never embed Python in TypeScript
5. **Testing**: Test on both desktop and mobile, verify debug images when debugging OCR
6. **Documentation**: Update CLAUDE.md when making architectural changes

---

**Last Updated**: January 2025  
**Status**: Reader Refactored - Clean Modular Architecture with 3 Reading Modes

## 🤖 AI Integration Details

### Metadata Fetching (OpenRouter API)
- **Model**: `openai/gpt-4o-search-preview` with web search
- **Sources**: Amazon.co.jp, Japanese bookstores
- **Output**: Structured JSON with Japanese author names and descriptions

### OCR Text Detection (Inference Service)
- **Models**: `comic_text_detector` + `manga-ocr` for detection and extraction
- **API**: FastAPI service at `http://localhost:8847/ocr/detect`
- **Features**: Bounding box detection, text extraction, debug image generation
- **Debug**: Visual validation with green bboxes and orange text lines
- **Storage**: Debug images saved as `page-*_debug.jpg` in uploads directory