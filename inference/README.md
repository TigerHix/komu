# Inference

FastAPI-based HTTP service for AI-powered manga text detection and OCR processing.

## Quick Start

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Start Service

#### Linux / WSL / macOS
```bash
./start_service.sh
```

#### Windows
```cmd
start_service.bat
```

## API Endpoints

### Health Check
```
GET /health
```
Returns service status and configuration.

**Response:**
```json
{
  "status": "healthy",
  "service": "manga-inference",
  "config": {
    "debug_images_enabled": true
  }
}
```

### OCR Processing
```
POST /ocr
Content-Type: multipart/form-data
Body: 
  - file (required): Image file
  - text_detection (optional): Boolean, default true
  - original_path (optional): String, original file path for debug image naming
```
Processes manga images with configurable text detection and OCR.

**Parameters:**
- `file`: Image file to process (required)
- `text_detection`: If `true` (default), detects text blocks then extracts text. If `false`, extracts text from entire image
- `original_path`: Optional original file path for debug image naming

**Response (with text_detection=true):**
```json
{
  "success": true,
  "textBlocks": [
    {
      "bbox": [x1, y1, x2, y2],
      "width": 100,
      "height": 50,
      "vertical": false,
      "font_size": 24.5,
      "lines": 2,
      "confidence": 1.0,
      "text": "Extracted text from all lines",
      "text_lines": ["Line 1 text", "Line 2 text"]
    }
  ],
  "imageSize": {"width": 1200, "height": 1800},
  "debug": ["Found 5 text blocks", "..."],
  "debugImagePath": "/path/to/debug_image.jpg"
}
```

**Response (with text_detection=false):**
```json
{
  "success": true,
  "text": "Extracted text from entire image",
  "imageSize": {"width": 1200, "height": 1800},
  "method": "direct_ocr"
}
```

## Environment Variables

### GENERATE_DEBUG_IMAGES
- **Default:** `true`
- **Values:** `true` | `false`
- **Description:** Generate debug images with highlighted text blocks

Debug images are saved next to the original image with `_debug` suffix:
- Original: `page-5.jpg`
- Debug: `page-5_debug.jpg`
