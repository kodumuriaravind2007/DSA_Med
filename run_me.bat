@echo off
setlocal

title MedTree X Launcher
cd /d "%~dp0"

echo ===============================================================================
echo        MedTree X -- Intelligent Hospital Record and Patient Flow Management
echo                  B.Tech Data Structures and Algorithms Project
echo ===============================================================================
echo.

:: 1. Check Python
echo [*] Checking Python environment...
if exist "%~dp0venv\Scripts\python.exe" (
    echo     [OK] Found virtual environment Python in .\venv
) else (
    where python >nul 2>nul
    if %errorlevel% neq 0 (
        echo     [ERROR] Python was not found in PATH or in .\venv folder.
        echo     Please install Python 3.10 or higher.
        pause
        exit /b 1
    )
    echo     [INFO] Using system Python from PATH.
)

:: 2. Check Node and npm
echo [*] Checking Node.js and npm...
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo     [ERROR] Node.js and npm were not found in your PATH.
    echo     Please install Node.js v18 or higher from https://nodejs.org/
    pause
    exit /b 1
)
echo     [OK] Node.js and npm detected.

:: 3. Check frontend node_modules
if not exist "%~dp0frontend\node_modules" (
    echo [*] Frontend dependencies not found. Installing packages with npm install...
    cd /d "%~dp0frontend"
    call npm install
    cd /d "%~dp0"
    echo     [OK] Frontend dependencies installed.
) else (
    echo     [OK] Frontend dependencies are installed.
)

echo.
echo ===============================================================================
echo   Starting MedTree X Servers...
echo ===============================================================================
echo.

:: 4. Start Backend Server in separate window
echo [1/2] Launching FastAPI Backend on http://127.0.0.1:8000 ...
start "MedTree X Backend" "%~dp0start_backend.bat"

:: 5. Wait for backend startup
echo [*] Waiting 3 seconds for backend initialization...
ping 127.0.0.1 -n 4 > nul

:: 6. Start Frontend Server in separate window
echo [2/2] Launching Vite React Frontend on http://localhost:5173 ...
start "MedTree X Frontend" "%~dp0start_frontend.bat"

:: 7. Wait 2 seconds and launch default browser
ping 127.0.0.1 -n 3 > nul
echo [*] Opening MedTree X in your default web browser...
start http://localhost:5173

echo.
echo ===============================================================================
echo   MEDTREE X IS NOW RUNNING!
echo ===============================================================================
echo.
echo   [Web Application]    http://localhost:5173
echo   [API Documentation]  http://127.0.0.1:8000/docs
echo   [API Health Check]   http://127.0.0.1:8000/api/health
echo   [Real-time Stream]   ws://127.0.0.1:8000/ws
echo.
echo   DEMO CREDENTIALS:
echo   -----------------------------------------------------------------------------
echo   Role          Username        Password        Persona
echo   -----------------------------------------------------------------------------
echo   Doctor        dr_smith        doctor123       Dr. Ayesha Mukherjee (Emergency)
echo   Doctor        dr_sharma       doctor123       Dr. Vikram Sethi (Cardiology)
echo   Nurse         nurse_sarah     nurse123        Nurse Sarah Jenkins, RN
echo   Patient       patient101      password123     Sara Khan (Priority 1)
echo   Patient       patient102      password123     David Miller
echo   Receptionist  receptionist    reception123    Elena Rostova
echo   Admin         admin           admin123        Chief Operations Officer
echo   -----------------------------------------------------------------------------
echo.
echo   NOTE: Two separate terminal windows have been opened for the Backend and Frontend.
echo   Keep them open while using the application.
echo   To stop the servers, simply close those terminal windows or press Ctrl+C in them.
echo ===============================================================================
echo.
pause
