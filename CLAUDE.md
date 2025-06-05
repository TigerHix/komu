# Komu Manga Reader - Claude Code Memory

## 🎯 Project Overview
Self-hosted manga reader web application for Japanese language learning. Microservices architecture with TypeScript frontend/backend and Python OCR services. Features Apple-level design polish with full PWA support and advanced touch interactions.

## 🏗️ Architecture

### Frontend - Port 5847
- **Stack**: React 18 + TypeScript + Vite + shadcn/ui + framer-motion + react-zoom-pan-pinch + react-window
- **Features**: Real-time OCR progress, WebSocket integration, 3 reading modes, Apple-style animations, PWA optimization

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
komu/
├── frontend/             # React app (port 5847)
├── backend/              # Elysia API (port 3847)  
├── inference/            # Python OCR service (port 8847)
├── packages/             # External dependencies & forks
│   ├── comic_text_detector/  # Text detection models & scripts
│   ├── ichiran/              # Japanese tokenization service
│   └── react-sheet-slide/    # Forked PWA-optimized sheet component
└── CLAUDE.md             # This file
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
ICHIRAN_PATH=../packages/ichiran
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

- ✅ **PDF Upload**: Drag & drop with automatic JPG conversion (PDF and images only)
- ✅ **OCR Processing**: Background queue with real-time progress
- ✅ **Reader Interface**: RTL/LTR/scroll modes with zoom/pan
- ✅ **Text Overlays**: Interactive Japanese text extraction
- ✅ **AI Metadata**: OpenRouter API for author/description suggestions
- ✅ **Debug Mode**: Visual OCR validation with bounding boxes
- ✅ **WebSocket Updates**: Real-time status and progress
- ✅ **Library Management**: Grid view with thumbnails and long-press edit mode
- ✅ **Custom Scrolling**: Virtualized vertical scrolling with zoom/pan support
- ✅ **Apple-Style UI**: Framer Motion animations, SF Pro typography, Apple design system
- ✅ **Full PWA Support**: True edge-to-edge on iOS, dynamic status bar, notch embrace

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

## 📱 iOS & PWA Optimizations

### True Full-Screen PWA (iOS Notch Embrace)
- **Viewport**: `initial-scale=1, viewport-fit=cover` with notch support
- **Status Bar**: `black-translucent` for content behind status bar
- **CSS Hack**: `min-height: calc(100% + env(safe-area-inset-top))` prevents white bars
- **Safe Areas**: Automatic padding with `env(safe-area-inset-*)` values
- **Dynamic Theme**: Reader mode uses black status bar, library uses accent color

### PWA Implementation
```css
/* Full-screen PWA hack for iOS */
@media (display-mode: standalone) {
  html {
    min-height: calc(100% + env(safe-area-inset-top));
    padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);
    background-attachment: fixed;
  }
}
```

### Advanced Touch Handling
- **Scroll vs Tap Detection**: 10px movement threshold cancels navigation
- **Long Press**: Native `onTouchStart/End/Move/Cancel` events for iOS compatibility
- **Touch Movement Tracking**: Prevents accidental actions during scroll gestures
- **Haptic Feedback**: `navigator.vibrate(50)` for tactile responses

### iOS-Specific Optimizations
- **Body Scroll Lock**: Complete isolation in Reader mode prevents library scroll bleed-through
- **Touch Actions**: Disabled bounce scrolling, tap highlights, text selection
- **Safe Areas**: PWA-only safe area padding using `@media (display-mode: standalone)`
- **Viewport**: Dynamic viewport height (`100dvh`) for proper mobile sizing

## 🎯 Library Interface

### Card Interaction System
- **Desktop**: Hover for edit/delete buttons with scale animations
- **Mobile**: Long-press reveals sliding edit interface
- **Animation Physics**: Dynamic button container height measurement
- **Touch Safety**: Scroll gesture detection prevents accidental navigation

### Long Press Edit Mode
```typescript
// iOS-compatible long press with gesture cancellation
onTouchStart: Record touch position, start 500ms timeout
onTouchMove: Cancel if movement > 10px (scroll detection)
onTouchEnd: Navigate if no long press active and no scroll detected
```

### Cover Transition System
- **App Store Style**: Full-screen cover overlay with backdrop blur
- **Bottom Navigation**: Auto-hide during transitions with DOM detection
- **Physics**: Spring animations with 400 stiffness, 25-30 damping
- **Fallback**: Direct navigation for manga without thumbnails

## 🎯 Text Overlay System

### Smart Visibility
- **Default**: Text boxes invisible (hover-only discovery)
- **Grammar Mode**: Selected text block highlighted with green border
- **Selective Highlighting**: Only clicked block remains visible during analysis
- **State Management**: `selectedBlockIndex` tracks active text block across all components

### Text Popout Animation (NEW)
- **Component**: `TextPopoutModal.tsx` - Apple-style popout animation for selected text blocks
- **Features**: Canvas-based image cropping, spring physics animations, automatic sizing
- **Animation Flow**:
  1. **Initial**: Scales from original text position (0.1 scale)
  2. **Spring Physics**: 500 stiffness, 30 damping for natural movement
  3. **Dynamic Sizing**: Respects aspect ratio with min/max constraints
  4. **Sheet Integration**: Fades out smoothly as bottom sheet expands using `sheetProgress`
- **Technical Details**:
  - Canvas cropping with 10px padding around text bounding box
  - Automatic cleanup of blob URLs to prevent memory leaks
  - Green border glow effect with radial gradient overlay
  - Responsive sizing (max 400px width, 40% screen height)
  - Z-index coordination with other modal elements
- **Sheet Integration**: Uses react-sheet-slide fork's `onPositionChange` callback:
  ```typescript
  // In parent component
  const [sheetProgress, setSheetProgress] = useState(0)
  
  <Sheet onPositionChange={(data) => setSheetProgress(data.progress)}>
  <TextPopoutModal sheetProgress={sheetProgress} /> // Fades with sheet expansion
  ```

### Component Chain
```
Reader.tsx (selectedBlockIndex state)
├── SwiperGallery/ScrollingGallery (pass props)
├── SvgTextOverlay (render based on selection)
└── TextPopoutModal (cropped text animation)
```

## 🔄 Scrolling Mode Technical Details

### Height Calculation
- **Constraint**: `Math.min(containerWidth * aspectRatio, windowHeight)`
- **Dynamic Updates**: `resetAfterIndex(0, true)` when image dimensions load
- **Gap Prevention**: Proper aspect ratio calculation eliminates spacing issues
- **Dynamic Measurement**: Button containers measure actual height for perfect animations

### Image Loading Timeline
1. **Initial Render**: Uses default 1.4 aspect ratio
2. **OCR Processing**: Real dimensions loaded into `scrollImageSizes`
3. **Auto-Recalculation**: `useEffect` triggers list height updates
4. **Final Layout**: All gaps resolved with actual image dimensions

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

## 📦 Package Management

### External Dependencies in `/packages/`
- **ichiran**: Moved from git submodule to `/packages/` for better dependency management
- **comic_text_detector**: Moved from git submodule to `/packages/` for better dependency management  
- **react-sheet-slide**: Forked PWA-optimized sheet component (removed safe-area conflicts)

### Repository Structure Migration (RECENT CHANGE)
The project recently migrated from git submodules to a `/packages/` directory structure:
- **Before**: `comic_text_detector/` and `ichiran/` as git submodules in project root
- **After**: `/packages/comic_text_detector/` and `/packages/ichiran/` as regular directories
- **Benefit**: Eliminates submodule complexity while maintaining dependency isolation

### react-sheet-slide Fork Details
**Fork Purpose**: PWA-safe area compatibility + TextPopoutModal integration
- **Original Issue**: Hardcoded `env(safe-area-inset-*)` calculations conflicted with PWA layout
- **Solution**: Removed conflicting safe-area CSS, delegated to global App.css strategy
- **Installation**: `"react-sheet-slide": "file:../packages/react-sheet-slide/packages/react-sheet-slide"`
- **Key Changes**:
  - **CSS**: Modified `sheet.module.css:155` to remove hardcoded safe-area padding conflicts
  - **Types**: Added `SheetPositionData` type for real-time position tracking
  - **Event Handlers**: Added `onPositionChange` and `onDetentChange` props for TextPopoutModal integration
  - **Position Logic**: Real-time calculation of sheet progress (0-1) and active detent detection
  - **Integration**: Enables TextPopoutModal to fade smoothly as bottom sheet expands

**New Props Added**:
```typescript
onPositionChange?: (data: SheetPositionData) => void
onDetentChange?: (detent: string) => void

type SheetPositionData = {
  y: number          // Sheet Y position
  height: number     // Visible sheet height  
  activeDetent: string // 'medium' | 'large'
  progress: number   // 0-1 expansion progress
}
```

### Package Updates
```bash
# No longer using git submodules - packages are regular directories
# Update react-sheet-slide fork by pulling from upstream and applying PWA fixes
cd packages/react-sheet-slide && git pull upstream main
```

## 🔧 Common Issues

- **Port Conflicts**: Check PORTS.md for configuration
- **Python Environment**: Use `.venv` not `venv` - path `../.venv/bin/activate`
- **Debug Images**: Enable with `GENERATE_DEBUG_IMAGES=true`
- **CORS**: API calls use Vite proxy (`/api/*` and `/uploads/*`)
- **iOS Long Press**: Use native touch events, not framer-motion onLongPress
- **PWA Status Bar**: Dynamic theme-color meta tag for proper iOS integration

## 🤝 Development Guidelines

1. **Architecture**: Microservices - separate frontend, backend, inference
2. **Package Manager**: Use Bun for TypeScript/JavaScript projects
3. **TypeScript**: Strict typing, avoid `any` types
4. **OCR Processing**: HTTP API calls only, no embedded Python
5. **Git Submodules**: Use `git submodule update --remote` to update dependencies
6. **Design System**: Follow Apple Human Interface Guidelines
7. **Animations**: Use framer-motion with spring physics for natural feel
8. **Touch Handling**: Implement scroll detection for mobile gesture safety

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

## 🏷️ Key Implementation Notes

### File Format Support
- **Supported**: PDF files and individual images (PNG, JPG, etc.)
- **NOT Supported**: Archive formats (CBZ, CBR, ZIP, RAR) - backend doesn't handle these
- **Import Interface**: Accurately reflects actual backend capabilities

### Animation Architecture
- **Gesture Conflicts**: Avoid whileTap with custom animations, use onTapStart/onTap pattern
- **iOS Compatibility**: Native touch events required for reliable long press
- **Physics**: Spring animations only support 2 keyframes, use phase-based animations for complex sequences
- **Performance**: Use layoutId for smooth shared element transitions

### PWA Best Practices
- **Notch Embrace**: Full-screen experience with proper safe area handling
- **Dynamic Status Bar**: Context-aware theme colors (black in reader, accent in library)
- **Touch Optimization**: Comprehensive gesture detection and cancellation
- **Body Scroll Lock**: Complete reader isolation prevents scroll bleed-through