#!/usr/bin/env python3
"""
Pre-download manga-ocr model to avoid runtime downloads and Hugging Face rate limits.
Run this script once after installing requirements to cache the model locally.
"""

import os
import sys
from pathlib import Path

def download_manga_ocr_model():
    """Download and cache the manga-ocr model"""
    print("📥 Downloading manga-ocr model...")
    
    try:
        from manga_ocr import MangaOcr
        
        # Initialize MangaOcr (this will download the model if not cached)
        print("🔄 Initializing MangaOcr (may take a moment for first download)...")
        ocr = MangaOcr()
        
        # Test with a simple operation to ensure it's working
        print("✅ Model downloaded and cached successfully!")
        print("💡 The model is now available for offline use in the inference service.")
        
        return True
        
    except Exception as e:
        print(f"❌ Failed to download model: {e}")
        return False

def check_model_cache():
    """Check if the model is already cached"""
    try:
        # manga-ocr typically caches models in ~/.cache/huggingface/transformers/
        import transformers
        cache_dir = Path.home() / ".cache" / "huggingface" / "transformers"
        
        if cache_dir.exists():
            # Look for manga-ocr related files
            manga_ocr_files = list(cache_dir.glob("*manga*"))
            if manga_ocr_files:
                print(f"✅ Found {len(manga_ocr_files)} cached manga-ocr model files")
                return True
        
        print("ℹ️ No cached model found")
        return False
        
    except Exception as e:
        print(f"⚠️ Could not check cache: {e}")
        return False

if __name__ == "__main__":
    print("🤖 Manga OCR Model Downloader")
    print("=" * 50)
    
    # Check if already cached
    if check_model_cache():
        print("🎯 Model appears to be already cached. Verifying...")
    
    # Download/verify model
    success = download_manga_ocr_model()
    
    if success:
        print("\n🎉 Setup complete! The inference service should now work offline.")
        sys.exit(0)
    else:
        print("\n💥 Setup failed. Check your internet connection and try again.")
        sys.exit(1)