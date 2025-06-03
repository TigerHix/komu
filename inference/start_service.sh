#!/bin/bash

echo "Starting Manga Inference Service..."
echo ""

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
VENV_PATH="$PROJECT_ROOT/.venv"

# Check if virtual environment exists
if [ ! -f "$VENV_PATH/bin/activate" ]; then
    echo "Error: Virtual environment not found at $VENV_PATH"
    echo "Please create the virtual environment first:"
    echo "  cd $PROJECT_ROOT"
    echo "  python3 -m venv .venv"
    echo "  source .venv/bin/activate"
    echo "  pip install -r inference/requirements.txt"
    exit 1
fi

echo "Activating virtual environment..."
source "$VENV_PATH/bin/activate"

echo "Installing/updating FastAPI dependencies..."
pip install fastapi uvicorn python-multipart requests

# Set default environment variables if not already set
export GENERATE_DEBUG_IMAGES=${GENERATE_DEBUG_IMAGES:-true}
export INFERENCE_PORT=${INFERENCE_PORT:-8847}

echo ""
echo "Starting inference service on http://localhost:$INFERENCE_PORT"
echo "Health check: http://localhost:$INFERENCE_PORT/health"
echo "OCR endpoint: http://localhost:$INFERENCE_PORT/ocr/detect"
echo ""
echo "Environment:"
echo "  INFERENCE_PORT=$INFERENCE_PORT (default: 8847)"
echo "  GENERATE_DEBUG_IMAGES=$GENERATE_DEBUG_IMAGES (default: true)"
echo "  Debug images will be saved next to original images with _debug suffix"
echo ""
echo "Press Ctrl+C to stop the service"
echo ""

# Change to src directory and start the service
cd "$SCRIPT_DIR/src"
python -m uvicorn main:app --host 0.0.0.0 --port "$INFERENCE_PORT" --reload