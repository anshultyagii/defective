# ORBIT Mission Screening Platform - PowerShell Universal Launcher
$ErrorActionPreference = "Stop"
$rootDir = $PSScriptRoot
$backendDir = Join-Path $rootDir "backend"
$frontendDir = Join-Path $rootDir "frontend"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "    ORBIT Mission Screening Platform (PowerShell)        " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# Check Python
if (-not (Get-Command python -ErrorAction SilentlyContinue) -and -not (Get-Command python3 -ErrorAction SilentlyContinue)) {
    Write-Error "Python is not installed or not found in PATH. Please install Python 3.10+ from https://www.python.org"
}
$pythonCmd = if (Get-Command python -ErrorAction SilentlyContinue) { "python" } else { "python3" }

# Check Node
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Error "npm is not installed or not found in PATH. Please install Node.js from https://nodejs.org"
}

# 1. Setup Backend virtual environment
$venvDir = Join-Path $backendDir ".venv"
$pipExe = Join-Path $venvDir "Scripts\pip.exe"
$pythonExe = Join-Path $venvDir "Scripts\python.exe"
if (-not (Test-Path $pipExe)) {
    # Unix fallback if in WSL / PowerShell on Mac/Linux
    $pipExe = Join-Path $venvDir "bin/pip"
    $pythonExe = Join-Path $venvDir "bin/python"
}

if (-not (Test-Path $venvDir)) {
    Write-Host "[*] Creating Python virtual environment..." -ForegroundColor Yellow
    Set-Location $backendDir
    & $pythonCmd -m venv .venv
    Set-Location $rootDir
}

if (-not (Test-Path $pipExe)) {
    $pipExe = if (Test-Path (Join-Path $venvDir "Scripts\pip.exe")) { Join-Path $venvDir "Scripts\pip.exe" } else { Join-Path $venvDir "bin/pip" }
    $pythonExe = if (Test-Path (Join-Path $venvDir "Scripts\python.exe")) { Join-Path $venvDir "Scripts\python.exe" } else { Join-Path $venvDir "bin/python" }
}

$reqFile = Join-Path $backendDir "requirements.txt"
Write-Host "[*] Checking Python dependencies..." -ForegroundColor Yellow
& $pipExe install -q -r $reqFile

# 2. Setup Frontend dependencies
$nodeModules = Join-Path $frontendDir "node_modules"
if (-not (Test-Path $nodeModules)) {
    Write-Host "[*] Installing frontend npm packages..." -ForegroundColor Yellow
    Set-Location $frontendDir
    npm install
    Set-Location $rootDir
}

# 3. Start Backend in separate process
Write-Host "[*] Starting FastAPI Backend on port 8000..." -ForegroundColor Green
$backendJob = Start-Process -FilePath $pythonExe -ArgumentList "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload" -WorkingDirectory $backendDir -PassThru

# 4. Open Browser
Start-Process "http://localhost:5173"

Write-Host "`n🚀 ORBIT Platform is starting!" -ForegroundColor Green
Write-Host "   Local Access:    http://localhost:5173"
Write-Host "   Backend API Docs: http://localhost:8000/docs`n"

# 5. Start Vite Frontend (Foreground)
Set-Location $frontendDir
try {
    npx vite --host 0.0.0.0 --port 5173
} finally {
    if ($backendJob -and -not $backendJob.HasExited) {
        Write-Host "Stopping backend service..." -ForegroundColor Yellow
        Stop-Process -Id $backendJob.Id -Force -ErrorAction SilentlyContinue
    }
}
