# ===============================================================================
#       MedTree X -- Intelligent Hospital Record & Patient Flow Management
#                           POWERSHELL LAUNCHER
# ===============================================================================

$Host.UI.RawUI.WindowTitle = "MedTree X Launcher"
$rootDir = $PSScriptRoot
Set-Location -Path $rootDir

Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host "       MedTree X -- Intelligent Hospital Record & Patient Flow Management" -ForegroundColor White
Write-Host "                 B.Tech Data Structures & Algorithms Project" -ForegroundColor Yellow
Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Determine Python executable
Write-Host "[*] Checking Python environment..." -ForegroundColor White
$venvPython = Join-Path $rootDir "venv\Scripts\python.exe"
if (Test-Path $venvPython) {
    $pythonExe = $venvPython
    Write-Host "    [OK] Found virtual environment Python: $pythonExe" -ForegroundColor Green
} else {
    $systemPython = Get-Command python -ErrorAction SilentlyContinue
    if ($null -eq $systemPython) {
        Write-Host "    [ERROR] Python was not found in PATH or in .\venv folder." -ForegroundColor Red
        Write-Host "    Please install Python 3.10+ or set up the virtual environment." -ForegroundColor Red
        Read-Host "Press Enter to exit..."
        exit 1
    }
    $pythonExe = "python"
    Write-Host "    [INFO] Using system Python: $pythonExe" -ForegroundColor Yellow
}

# 2. Check Node / npm
Write-Host "[*] Checking Node.js & npm..." -ForegroundColor White
$npmCmd = Get-Command npm -ErrorAction SilentlyContinue
if ($null -eq $npmCmd) {
    Write-Host "    [ERROR] Node.js and npm were not found in your PATH." -ForegroundColor Red
    Write-Host "    Please install Node.js (v18+) from https://nodejs.org/ to run the frontend." -ForegroundColor Red
    Read-Host "Press Enter to exit..."
    exit 1
}
Write-Host "    [OK] Node.js and npm detected." -ForegroundColor Green

# 3. Check frontend node_modules
$nodeModulesDir = Join-Path $rootDir "frontend\node_modules"
if (-not (Test-Path $nodeModulesDir)) {
    Write-Host "[*] Frontend dependencies not found. Installing packages with npm install..." -ForegroundColor Yellow
    Set-Location -Path (Join-Path $rootDir "frontend")
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "    [ERROR] npm install failed. Please check your network connection." -ForegroundColor Red
        Set-Location -Path $rootDir
        Read-Host "Press Enter to exit..."
        exit 1
    }
    Set-Location -Path $rootDir
    Write-Host "    [OK] Frontend dependencies installed successfully." -ForegroundColor Green
} else {
    Write-Host "    [OK] Frontend dependencies are installed." -ForegroundColor Green
}

# 4. Check if ports 8000 or 5173 are currently in use
Write-Host "[*] Checking network ports (8000 & 5173)..." -ForegroundColor White
$port8000InUse = Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue
if ($port8000InUse) {
    Write-Host "    [WARNING] Port 8000 is already in use (PID: $($port8000InUse[0].OwningProcess)). Backend might already be running." -ForegroundColor Yellow
}

$port5173InUse = Get-NetTCPConnection -LocalPort 5173 -State Listen -ErrorAction SilentlyContinue
if ($port5173InUse) {
    Write-Host "    [WARNING] Port 5173 is already in use (PID: $($port5173InUse[0].OwningProcess)). Frontend might already be running." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host "  Starting MedTree X Servers..." -ForegroundColor White
Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host ""

# 5. Start Backend Process in separate PowerShell window
Write-Host "[1/2] Launching FastAPI Backend on http://127.0.0.1:8000 ..." -ForegroundColor Green
$backendCommand = "`$host.UI.RawUI.WindowTitle = 'MedTree X Backend (Port 8000)'; cd '$rootDir'; `$env:PYTHONPATH='.'; & '$pythonExe' -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $backendCommand

# 6. Wait for backend startup
Write-Host "[*] Waiting 3 seconds for backend initialization..." -ForegroundColor Gray
Start-Sleep -Seconds 3

# 7. Start Frontend Process in separate PowerShell window
Write-Host "[2/2] Launching Vite React Frontend on http://localhost:5173 ..." -ForegroundColor Green
$frontendDir = Join-Path $rootDir "frontend"
$frontendCommand = "`$host.UI.RawUI.WindowTitle = 'MedTree X Frontend (Port 5173)'; cd '$frontendDir'; npm run dev -- --host 0.0.0.0 --port 5173"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $frontendCommand

# 8. Open default browser
Start-Sleep -Seconds 2
Write-Host "[*] Opening MedTree X in your default web browser..." -ForegroundColor Cyan
Start-Process "http://localhost:5173"

Write-Host ""
Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host "  MEDTREE X IS NOW RUNNING!" -ForegroundColor Green
Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  [Web Application]    http://localhost:5173" -ForegroundColor White
Write-Host "  [API Documentation]  http://127.0.0.1:8000/docs" -ForegroundColor White
Write-Host "  [API Health Check]   http://127.0.0.1:8000/api/health" -ForegroundColor White
Write-Host "  [Real-time Stream]   ws://127.0.0.1:8000/ws" -ForegroundColor White
Write-Host ""
Write-Host "  DEMO CREDENTIALS:" -ForegroundColor Yellow
Write-Host "  -----------------------------------------------------------------------------" -ForegroundColor Gray
Write-Host "  Role          Username        Password        Persona" -ForegroundColor Yellow
Write-Host "  -----------------------------------------------------------------------------" -ForegroundColor Gray
Write-Host "  Doctor        dr_smith        doctor123       Dr. Ayesha Mukherjee (Emergency)" -ForegroundColor White
Write-Host "  Doctor        dr_sharma       doctor123       Dr. Vikram Sethi (Cardiology)" -ForegroundColor White
Write-Host "  Nurse         nurse_sarah     nurse123        Nurse Sarah Jenkins, RN" -ForegroundColor White
Write-Host "  Patient       patient101      password123     Sara Khan (Priority 1)" -ForegroundColor White
Write-Host "  Patient       patient102      password123     David Miller" -ForegroundColor White
Write-Host "  Receptionist  receptionist    reception123    Elena Rostova" -ForegroundColor White
Write-Host "  Admin         admin           admin123        Chief Operations Officer" -ForegroundColor White
Write-Host "  -----------------------------------------------------------------------------" -ForegroundColor Gray
Write-Host ""
Write-Host "  NOTE: Two separate PowerShell windows have been opened for the Backend and Frontend." -ForegroundColor Gray
Write-Host "  Keep them open while using the application." -ForegroundColor Gray
Write-Host "  To stop the servers, simply close those terminal windows or press Ctrl+C in them." -ForegroundColor Gray
Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host ""
