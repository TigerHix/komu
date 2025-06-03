@echo off
echo Starting Manga Inference Service...
echo.

REM Get the directory where this batch file is located
set "SCRIPT_DIR=%~dp0"
set "PROJECT_ROOT=%SCRIPT_DIR%.."
set "VENV_PATH=%PROJECT_ROOT%\.venv"

REM Check if virtual environment exists
if not exist "%VENV_PATH%\Scripts\activate.bat" (
    echo Error: Virtual environment not found at %VENV_PATH%
    echo Please create the virtual environment first:
    echo   cd %PROJECT_ROOT%
    echo   python -m venv .venv
    echo   .venv\Scripts\activate
    echo   pip install -r inference\requirements.txt
    pause
    exit /b 1
)

echo Activating virtual environment...
call "%VENV_PATH%\Scripts\activate.bat"

echo Installing/updating FastAPI dependencies...
pip install fastapi uvicorn python-multipart requests

REM Set default environment variables if not already set
if not defined GENERATE_DEBUG_IMAGES set GENERATE_DEBUG_IMAGES=true

echo.
echo Starting inference service on http://localhost:8000
echo Health check: http://localhost:8000/health
echo OCR endpoint: http://localhost:8000/ocr/detect
echo.
echo Environment:
echo   GENERATE_DEBUG_IMAGES=%GENERATE_DEBUG_IMAGES% (default: true)
echo   Debug images will be saved next to original images with _debug suffix
echo.
echo Press Ctrl+C to stop the service
echo.

REM Change to src directory and start the service
cd /d "%SCRIPT_DIR%src"
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload

pause