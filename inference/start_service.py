#!/usr/bin/env python3
"""
Startup script for the manga inference service.
Run this to start the FastAPI inference service on configurable port.
"""

import os
import sys
import subprocess
from pathlib import Path

def main():
    # Get port from environment variable, default to 8847
    port = os.getenv('INFERENCE_PORT', '8847')
    
    # Change to the src directory where main.py is located
    src_dir = Path(__file__).parent / "src"
    
    print(f"Starting inference service on port {port}")
    
    # Run uvicorn with the main app
    try:
        subprocess.run([
            sys.executable, "-m", "uvicorn", 
            "main:app",
            "--host", "0.0.0.0",
            "--port", port,
            "--reload"
        ], cwd=src_dir, check=True)
    except KeyboardInterrupt:
        print("\nInference service stopped.")
    except Exception as e:
        print(f"Error starting inference service: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()