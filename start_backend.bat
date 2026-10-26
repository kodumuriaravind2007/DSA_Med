@echo off
title MedTree X - FastAPI Backend (Port 8000)
cd /d "%~dp0"

echo ===============================================================================
echo   Starting MedTree X FastAPI Backend on http://127.0.0.1:8000
echo ===============================================================================
echo.

set "PYTHON_EXE=.\venv\Scripts\python.exe"
if not exist "%PYTHON_EXE%" (
    set "PYTHON_EXE=python"
)

set "PYTHONPATH=."
"%PYTHON_EXE%" -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Backend stopped or crashed with exit code %errorlevel%.
)
echo.
pause
