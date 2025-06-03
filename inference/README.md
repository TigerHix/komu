# Manga Inference Service

FastAPI-based HTTP service for AI-powered manga text detection and OCR processing.

## Quick Start

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Pre-download Models (IMPORTANT)
```bash
python download_models.py
```
This downloads and caches the manga-ocr model locally, preventing Hugging Face rate limits (HTTP 429 errors).

### 3. Start Service

#### Windows
```cmd
start_service.bat
```

#### Linux/WSL/macOS
```bash
./start_service.sh
```

## API Endpoints

### Health Check
```
GET /health
```
Returns service status and configuration.

### Text Detection
```
POST /ocr/detect
Content-Type: multipart/form-data
Body: file (image file)
```
Detects text blocks in manga page images.

**Response:**
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
      "confidence": 1.0
    }
  ],
  "imageSize": {"width": 1200, "height": 1800},
  "debug": ["Found 5 text blocks", "..."],
  "debugImagePath": "/path/to/debug_image.jpg"
}
```

## Environment Variables

### GENERATE_DEBUG_IMAGES
- **Default:** `true`
- **Values:** `true` | `false`
- **Description:** Generate debug images with highlighted text blocks

**Examples:**
```bash
# Disable debug images
export GENERATE_DEBUG_IMAGES=false
./start_service.sh

# Enable debug images (default)
export GENERATE_DEBUG_IMAGES=true
./start_service.sh
```

Debug images are saved next to the original image with `_debug` suffix:
- Original: `page-5.jpg`
- Debug: `page-5_debug.jpg`

## Debug Image Features

When enabled, debug images show:
- **Green rectangles:** Text block bounding boxes
- **Red polylines:** Individual text lines within blocks  
- **Numbers:** Text block indices
- **Visual validation:** Verify detection accuracy

## Troubleshooting

### Hugging Face Rate Limits (HTTP 429)
If you see "HTTP Error 429 thrown while requesting ... huggingface.co", run:
```bash
python download_models.py
```
This caches the manga-ocr model locally and eliminates runtime downloads.

### Model Loading Issues
Ensure you've run the model download script and all dependencies are installed.

## Dependencies

Required Python packages:
- `fastapi` - Web framework
- `uvicorn` - ASGI server  
- `python-multipart` - File upload support
- `torch` - PyTorch for ML models
- `opencv-python` - Image processing
- `numpy` - Numerical operations
- `manga-ocr` - Japanese text recognition

## Development

Start in development mode with auto-reload:
```bash
cd src
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8847
# Or use environment variable:
export INFERENCE_PORT=8847
python -m uvicorn main:app --reload --host 0.0.0.0 --port $INFERENCE_PORT
```

## Integration

The backend service calls this inference service via HTTP:

```typescript
// Backend integration example
const response = await fetch('http://localhost:8847/ocr/detect', {
  method: 'POST',
  body: formData  // Contains image file
});
const result = await response.json();
```

## Architecture

```
manga-project/
├── inference/              # This service
│   ├── src/main.py         # FastAPI application
│   ├── start_service.sh    # Linux startup script
│   ├── start_service.bat   # Windows startup script
│   └── requirements.txt    # Python dependencies
├── backend/                # Main backend service
└── comic_text_detector/    # ML model library
```