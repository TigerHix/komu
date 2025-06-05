#!/usr/bin/env python3
"""
Inference service for manga processing AI tasks.
Provides HTTP API endpoints for OCR, text detection, and future AI features.
"""

import os
import sys
import json
import tempfile
from pathlib import Path
from typing import Dict, List, Any, Optional
from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

# Add the project root to Python path so comic_text_detector can be imported
current_dir = Path(__file__).parent.absolute()
project_root = current_dir.parent.parent
sys.path.insert(0, str(project_root))

# Set the comic_text_detector path for model files
comic_detector_path = project_root / "packages" / "comic_text_detector"

# Environment configuration
GENERATE_DEBUG_IMAGES = os.getenv('GENERATE_DEBUG_IMAGES', 'true').lower() == 'true'

print(f"🚀 Starting Manga Inference Service")
print(f"📊 Configuration:")
print(f"   - Project root: {project_root}")
print(f"   - Comic detector path: {comic_detector_path}")
print(f"   - Debug images enabled: {GENERATE_DEBUG_IMAGES}")
print(f"   - Model path: {comic_detector_path / 'data' / 'comictextdetector.pt.onnx'}")

# Global model instances (initialize once to avoid repeated downloads)
text_detector = None
manga_ocr = None

def initialize_models():
    """Initialize models once on startup to avoid repeated downloads"""
    global text_detector, manga_ocr
    
    if text_detector is None or manga_ocr is None:
        print("🔄 Initializing AI models...")
        
        try:
            import torch
            from comic_text_detector.inference import TextDetector
            from manga_ocr import MangaOcr
            
            # Initialize TextDetector
            model_path = comic_detector_path / "data" / "comictextdetector.pt.onnx"
            if not model_path.exists():
                raise Exception(f"Model file not found: {model_path}")
            
            cuda = torch.cuda.is_available()
            device = 'cuda' if cuda else 'cpu'
            print(f"   - Using device: {device}")
            
            text_detector = TextDetector(
                model_path=str(model_path),
                input_size=1024,
                device=device,
                act='leaky'
            )
            print("   ✅ Text detector loaded")
            
            # Initialize manga-ocr (this will download model on first use)
            print("   🔄 Loading manga-ocr model (may download on first use)...")
            manga_ocr = MangaOcr()
            print("   ✅ Manga OCR loaded")
            
            print("🎯 All models ready!")
            
        except Exception as e:
            print(f"❌ Failed to initialize models: {e}")
            raise e

print(f"🎯 Ready to process OCR requests!")

app = FastAPI(
    title="Manga Inference Service",
    description="AI-powered text detection and OCR for manga pages",
    version="1.0.0"
)

# Configure CORS
# Get configurable ports from environment
FRONTEND_PORT = os.getenv('FRONTEND_PORT', '5847')
BACKEND_PORT = os.getenv('BACKEND_PORT', '3847')

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        f"http://localhost:{FRONTEND_PORT}",
        f"http://localhost:{BACKEND_PORT}",
        "http://localhost:5173",  # Legacy frontend port for compatibility
        "http://localhost:3001"   # Legacy backend port for compatibility
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    """Initialize models on startup"""
    print("🚀 Initializing models on startup...")
    initialize_models()

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy", 
        "service": "manga-inference",
        "config": {
            "debug_images_enabled": GENERATE_DEBUG_IMAGES
        }
    }

@app.post("/ocr/detect")
async def detect_text(file: UploadFile = File(...), original_path: Optional[str] = Form(None)):
    """
    Detect text blocks in manga page image.
    Returns bounding boxes and metadata for detected text regions.
    """
    print(f"DEBUG: OCR endpoint called with file: {file.filename}")
    print(f"DEBUG: File content type: {file.content_type}")
    print(f"DEBUG: Original path parameter: {original_path}")
    
    # Ensure models are initialized
    initialize_models()
    
    if not file.content_type or not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    # Save uploaded file to temporary location
    with tempfile.NamedTemporaryFile(delete=False, suffix='.jpg') as tmp_file:
        content = await file.read()
        tmp_file.write(content)
        tmp_file_path = tmp_file.name
        print(f"DEBUG: Saved uploaded file to temp path: {tmp_file_path}")
    
    try:
        print(f"DEBUG: Starting OCR detection for: {tmp_file_path}")
        # Run OCR detection, pass original path for debug image if provided
        debug_image_base_path = original_path if original_path else tmp_file_path
        result = run_ocr_detection(tmp_file_path, debug_image_base_path)
        print(f"DEBUG: OCR detection completed successfully")
        return result
    except Exception as e:
        print(f"DEBUG: OCR detection failed with error: {e}")
        raise HTTPException(status_code=500, detail=f"OCR processing failed: {str(e)}")
    finally:
        # Clean up temporary file
        if os.path.exists(tmp_file_path):
            os.unlink(tmp_file_path)
            print(f"DEBUG: Cleaned up temp file: {tmp_file_path}")

@app.post("/ocr/text-only")
async def extract_text_only(file: UploadFile = File(...)):
    """
    Extract text directly from image without text detection.
    Useful for pre-cropped text regions where detection is not needed.
    """
    print(f"DEBUG: Text-only OCR endpoint called with file: {file.filename}")
    
    # Ensure models are initialized
    initialize_models()
    
    if not file.content_type or not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    # Save uploaded file to temporary location
    with tempfile.NamedTemporaryFile(delete=False, suffix='.jpg') as tmp_file:
        content = await file.read()
        tmp_file.write(content)
        tmp_file_path = tmp_file.name
        print(f"DEBUG: Saved uploaded file to temp path: {tmp_file_path}")
    
    try:
        print(f"DEBUG: Starting direct OCR for: {tmp_file_path}")
        result = run_direct_ocr(tmp_file_path)
        print(f"DEBUG: Direct OCR completed successfully")
        return result
    except Exception as e:
        print(f"DEBUG: Direct OCR failed with error: {e}")
        raise HTTPException(status_code=500, detail=f"OCR processing failed: {str(e)}")
    finally:
        # Clean up temporary file
        if os.path.exists(tmp_file_path):
            os.unlink(tmp_file_path)
            print(f"DEBUG: Cleaned up temp file: {tmp_file_path}")

def calculate_tight_bbox_from_lines(blk) -> tuple:
    """
    Calculate a tighter bounding box from the individual text line polygons
    instead of using the rough detection bbox.
    """
    import numpy as np
    
    # Get all text line polygons
    lines = blk.lines_array()
    
    if len(lines) == 0:
        # Fallback to original bbox if no lines
        return blk.xyxy
    
    # Find min/max coordinates across all text line polygons
    all_points = []
    for line in lines:
        all_points.extend(line)
    
    if len(all_points) == 0:
        # Fallback to original bbox if no points
        return blk.xyxy
    
    all_points = np.array(all_points)
    x_min = np.min(all_points[:, 0])
    y_min = np.min(all_points[:, 1])
    x_max = np.max(all_points[:, 0])
    y_max = np.max(all_points[:, 1])
    
    return (x_min, y_min, x_max, y_max)

def run_direct_ocr(image_path: str) -> Dict[str, Any]:
    """
    Run OCR directly on the entire image without text detection.
    Useful for pre-cropped text regions.
    """
    global manga_ocr
    
    try:
        import cv2
        from PIL import Image
        
        # Ensure manga-ocr is initialized
        if manga_ocr is None:
            raise Exception("Manga OCR not initialized. Call initialize_models() first.")
        
        # Load the image
        img = cv2.imread(image_path)
        if img is None:
            raise Exception("Failed to load image")
        
        im_h, im_w = img.shape[:2]
        
        # Convert to PIL Image for manga-ocr
        img_pil = Image.fromarray(cv2.cvtColor(img, cv2.COLOR_BGR2RGB))
        
        # Extract text using manga-ocr directly
        extracted_text = manga_ocr(img_pil)
        
        print(f"DEBUG: Direct OCR extracted text: '{extracted_text}'")
        
        return {
            "success": True,
            "text": extracted_text,
            "imageSize": {"width": int(im_w), "height": int(im_h)},
            "method": "direct_ocr"
        }
        
    except Exception as e:
        import traceback
        raise Exception(f"Direct OCR failed: {str(e)}\n{traceback.format_exc()}")

def run_ocr_detection(image_path: str, debug_image_base_path: str = None) -> Dict[str, Any]:
    """
    Run text detection and extraction on an image using comic-text-detector + manga-ocr.
    Uses global model instances to avoid repeated initialization.
    """
    global text_detector, manga_ocr
    
    try:
        import cv2
        import numpy as np
        from PIL import Image
        
        # Ensure models are initialized
        if text_detector is None or manga_ocr is None:
            raise Exception("Models not initialized. Call initialize_models() first.")
        
        # Load the image
        img = cv2.imread(image_path)
        if img is None:
            raise Exception("Failed to load image")
        
        im_h, im_w = img.shape[:2]
        
        # Run text detection
        mask, mask_refined, blk_list = text_detector(img, refine_mode=1, keep_undetected_mask=True)
        
        # Process the results
        results = []
        debug_info = []
        
        debug_info.append(f"Found {len(blk_list)} text blocks")
        
        for blk_idx, blk in enumerate(blk_list):
            # Calculate tighter bounding box from text line polygons instead of rough detection
            x1, y1, x2, y2 = calculate_tight_bbox_from_lines(blk)
            x1, y1, x2, y2 = int(x1), int(y1), int(x2), int(y2)
            
            # Extract text from each line in the block (following mokuro pattern)
            extracted_lines = []
            for line_idx in range(len(blk.lines)):
                try:
                    # Get text line region crop (similar to mokuro's approach)
                    line_crop = blk.get_transformed_region(img, line_idx, blk.font_size or 20)
                    
                    # Handle vertical text rotation (mokuro pattern)
                    if blk.vertical:
                        line_crop = cv2.rotate(line_crop, cv2.ROTATE_90_CLOCKWISE)
                    
                    # Convert to PIL Image for manga-ocr
                    line_pil = Image.fromarray(cv2.cvtColor(line_crop, cv2.COLOR_BGR2RGB))
                    
                    # Extract text using manga-ocr
                    line_text = manga_ocr(line_pil)
                    extracted_lines.append(line_text)
                    
                except Exception as line_e:
                    debug_info.append(f"Failed to extract text from line {line_idx} in block {blk_idx + 1}: {str(line_e)}")
                    extracted_lines.append("")
            
            # Join all lines in the block
            full_text = "".join(extracted_lines)
            
            # Create result object with native Python types
            result_blk = {
                "bbox": [x1, y1, x2, y2],
                "width": int(x2 - x1),
                "height": int(y2 - y1),
                "vertical": bool(blk.vertical),
                "font_size": float(blk.font_size) if blk.font_size is not None else None,
                "lines": int(len(blk.lines)),
                "confidence": 1.0,
                "text": full_text,
                "text_lines": extracted_lines
            }
            
            results.append(result_blk)
            debug_info.append(f"Block {blk_idx + 1}: bbox=[{x1}, {y1}, {x2}, {y2}] vertical={blk.vertical} font_size={blk.font_size} lines={len(blk.lines)} text='{full_text[:50]}{'...' if len(full_text) > 50 else ''}'")
        
        debug_info.append(f"Final results: {len(results)} text blocks with extracted text")
        
        # Generate debug image if enabled
        debug_image_path = None
        print(f"DEBUG: GENERATE_DEBUG_IMAGES = {GENERATE_DEBUG_IMAGES}")
        if GENERATE_DEBUG_IMAGES:
            # Use debug_image_base_path if provided, otherwise use image_path
            base_path_for_debug = debug_image_base_path if debug_image_base_path else image_path
            print(f"DEBUG: Generating debug image for {image_path}, saving to base path: {base_path_for_debug}")
            debug_image_path = generate_debug_image_with_text(img, blk_list, results, base_path_for_debug, debug_info)
            print(f"DEBUG: Debug image path = {debug_image_path}")
        else:
            print("DEBUG: Debug image generation disabled")
        
        response_data = {
            "success": True,
            "textBlocks": results,
            "imageSize": {"width": int(im_w), "height": int(im_h)},
            "debug": debug_info
        }
        
        if debug_image_path:
            response_data["debugImagePath"] = debug_image_path
            
        return response_data
        
    except Exception as e:
        import traceback
        raise Exception(f"OCR detection failed: {str(e)}\n{traceback.format_exc()}")

def generate_debug_image_with_text(img, blk_list, text_results: List[Dict], original_image_path: str, debug_info: List[str]) -> Optional[str]:
    """
    Generate a debug image with text blocks highlighted and extracted text shown.
    Returns the path to the saved debug image.
    """
    try:
        import cv2
        import numpy as np
        from PIL import Image, ImageDraw, ImageFont
        
        print(f"DEBUG: generate_debug_image_with_text called with {len(blk_list)} blocks")
        print(f"DEBUG: Original image path: {original_image_path}")
        
        # Create debug image
        debug_img = img.copy()
        print(f"DEBUG: Image shape: {debug_img.shape}")
        
        # Convert to PIL for better text rendering
        debug_pil = Image.fromarray(cv2.cvtColor(debug_img, cv2.COLOR_BGR2RGB))
        draw = ImageDraw.Draw(debug_pil)
        
        # Try to load a font that supports Japanese characters
        try:
            # Try to use fonts that support Japanese characters
            font_paths = [
                # Use the font from comic_text_detector data first (best for Japanese)
                str(comic_detector_path / "data" / "examples" / "fonts" / "msgothic.ttc"),
                # Japanese fonts
                "/usr/share/fonts/truetype/fonts-japanese-gothic.ttf",
                "/usr/share/fonts/truetype/takao-gothic/TakaoGothic.ttf",
                "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
                # System fonts with Japanese support
                "/System/Library/Fonts/Arial Unicode MS.ttf",
                "/Windows/Fonts/msyh.ttc",
                # Fallback Unicode fonts
                "/usr/share/fonts/truetype/noto/NotoSans-Regular.ttf",
                "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
                "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
                "/Windows/Fonts/arial.ttf"
            ]
            font = None
            for font_path in font_paths:
                if os.path.exists(font_path):
                    try:
                        font = ImageFont.truetype(font_path, 24)
                        print(f"DEBUG: Successfully loaded font: {font_path}")
                        break
                    except Exception as font_e:
                        print(f"DEBUG: Failed to load font {font_path}: {font_e}")
                        continue
            
            if font is None:
                print("DEBUG: No suitable font found, using default font (may not display Japanese correctly)")
                font = ImageFont.load_default()
        except Exception as e:
            print(f"DEBUG: Font loading exception: {e}")
            font = ImageFont.load_default()
        
        for i, (blk, text_result) in enumerate(zip(blk_list, text_results)):
            # Use the same tight bbox calculation as in OCR detection
            x1, y1, x2, y2 = calculate_tight_bbox_from_lines(blk)
            x1, y1, x2, y2 = int(x1), int(y1), int(x2), int(y2)
            print(f"DEBUG: Block {i+1}: [{x1}, {y1}, {x2}, {y2}] text='{text_result['text']}'")
            
            # Draw bounding box rectangle
            color = (0, 255, 0)  # Green for valid text blocks
            draw.rectangle([x1, y1, x2, y2], outline=color, width=3)
            
            # Draw block number
            label = f"{i+1}"
            draw.text((x1, max(y1-25, 5)), label, fill=color, font=font)
            
            # Draw extracted text above or below the bounding box
            extracted_text = text_result.get('text', '')
            if extracted_text:
                # Choose position for text label (above or below box)
                text_y = y1 - 50 if y1 > 50 else y2 + 10
                
                # Truncate long text for display
                display_text = extracted_text[:30] + "..." if len(extracted_text) > 30 else extracted_text
                
                # Draw background rectangle for text
                bbox = draw.textbbox((x1, text_y), display_text, font=font)
                draw.rectangle([bbox[0]-2, bbox[1]-2, bbox[2]+2, bbox[3]+2], fill=(255, 255, 255, 200))
                
                # Draw the extracted text
                draw.text((x1, text_y), display_text, fill=(255, 0, 0), font=font)  # Red text
            
            # Draw individual text lines within the block (in a different color)
            for j, line in enumerate(blk.lines_array()):
                line = line.astype(np.int32)
                # Convert back to cv2 for polylines
                debug_cv2 = cv2.cvtColor(np.array(debug_pil), cv2.COLOR_RGB2BGR)
                cv2.polylines(debug_cv2, [line], True, (255, 165, 0), 2)  # Orange for text lines
                debug_pil = Image.fromarray(cv2.cvtColor(debug_cv2, cv2.COLOR_BGR2RGB))
                draw = ImageDraw.Draw(debug_pil)
        
        # Convert back to cv2 format for saving
        final_debug_img = cv2.cvtColor(np.array(debug_pil), cv2.COLOR_RGB2BGR)
        
        # Save debug image next to original
        original_path = Path(original_image_path)
        debug_path = original_path.parent / f"{original_path.stem}_debug{original_path.suffix}"
        
        print(f"DEBUG: Attempting to save debug image to: {debug_path}")
        print(f"DEBUG: Debug path parent exists: {debug_path.parent.exists()}")
        print(f"DEBUG: Debug path parent writable: {os.access(debug_path.parent, os.W_OK)}")
        
        success = cv2.imwrite(str(debug_path), final_debug_img)
        print(f"DEBUG: cv2.imwrite success: {success}")
        
        if success and debug_path.exists():
            debug_info.append(f"Debug image with text saved to: {debug_path}")
            print(f"DEBUG: Debug image successfully saved to: {debug_path}")
            return str(debug_path)
        else:
            print(f"DEBUG: Failed to save debug image to: {debug_path}")
            debug_info.append(f"Failed to save debug image to: {debug_path}")
            return None
        
    except Exception as e:
        print(f"DEBUG: Exception in generate_debug_image_with_text: {e}")
        import traceback
        traceback.print_exc()
        debug_info.append(f"Failed to generate debug image: {str(e)}")
        return None

def generate_debug_image(img, blk_list, original_image_path: str, debug_info: List[str]) -> Optional[str]:
    """
    Legacy debug image function (kept for compatibility).
    """
    return generate_debug_image_with_text(img, blk_list, [], original_image_path, debug_info)

if __name__ == "__main__":
    port = int(os.getenv('INFERENCE_PORT', '8847'))
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=True,
        log_level="info"
    )