@echo off
title MedTree X - Vite Frontend (Port 5173)
cd /d "%~dp0frontend"

echo ===============================================================================
echo   Starting MedTree X Vite React Frontend on http://localhost:5173
echo ===============================================================================
echo.

call npm run dev -- --host 0.0.0.0 --port 5173

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Frontend stopped or crashed with exit code %errorlevel%.
)
echo.
pause
