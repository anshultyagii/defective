# ORBIT Mission Screening Platform - PowerShell Universal Launcher
$ErrorActionPreference = "Stop"
$rootDir = $PSScriptRoot
$backendDir = Join-Path $rootDir "backend"
$frontendDir = Join-Path $rootDir "frontend"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "    ORBIT Mission Screening Platform (PowerShell)        " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# Detect OS platform
$isWindows = ($PSVersionTable.PSEdition -eq 'Desktop') -or ($IsWindows -eq $true)

# Determine LAN IP for multi-device network access
$lanIP = $null
if ($isWindows) {
    try {
        $lanIP = (Get-NetIPAddress -AddressFamily IPv4 -InterfaceAlias 'Wi-Fi', 'Ethernet' -ErrorAction SilentlyContinue |
                  Where-Object { $_.IPAddress -notlike '169.*' -and $_.IPAddress -ne '127.0.0.1' } |
                  Select-Object -First 1).IPAddress
    } catch {
        try {
            $lanIP = (Test-Connection -ComputerName $env:COMPUTERNAME -Count 1 -ErrorAction SilentlyContinue).IPV4Address.IPAddressToString
        } catch { }
    }
} else {
    try {
        $lanIP = (hostname -I 2>$null).Trim().Split(' ')[0]
    } catch { }
}

# Check Python
$pythonCmd = $null
if (Get-Command python3 -ErrorAction SilentlyContinue) {
    $pythonCmd = "python3"
} elseif (Get-Command python -ErrorAction SilentlyContinue) {
    $pythonCmd = "python"
} else {
    Write-Error "Python is not installed or not found in PATH. Please install Python 3.10+ from https://www.python.org"
}

# Check Node
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Error "npm is not installed or not found in PATH. Please install Node.js from https://nodejs.org"
}

# 1. Setup Backend virtual environment
$venvDir = Join-Path $backendDir ".venv"

# Determine platform-appropriate venv executable paths
if ($isWindows) {
    $pipExe = Join-Path $venvDir "Scripts" "pip.exe"
    $pythonExe = Join-Path $venvDir "Scripts" "python.exe"
} else {
    $pipExe = Join-Path $venvDir "bin" "pip"
    $pythonExe = Join-Path $venvDir "bin" "python"
}

if (-not (Test-Path $venvDir)) {
    Write-Host "[*] Creating Python virtual environment..." -ForegroundColor Yellow
    Push-Location $backendDir
    & $pythonCmd -m venv .venv
    Pop-Location
}

# Re-detect paths after venv creation (in case platform detection was wrong)
if (-not (Test-Path $pipExe)) {
    if (Test-Path (Join-Path $venvDir "Scripts" "pip.exe")) {
        $pipExe = Join-Path $venvDir "Scripts" "pip.exe"
        $pythonExe = Join-Path $venvDir "Scripts" "python.exe"
    } elseif (Test-Path (Join-Path $venvDir "bin" "pip")) {
        $pipExe = Join-Path $venvDir "bin" "pip"
        $pythonExe = Join-Path $venvDir "bin" "python"
    }
}

$reqFile = Join-Path $backendDir "requirements.txt"
Write-Host "[*] Checking Python dependencies..." -ForegroundColor Yellow
& $pipExe install -q -r $reqFile

# 2. Setup Frontend dependencies
$nodeModules = Join-Path $frontendDir "node_modules"
if (-not (Test-Path $nodeModules)) {
    Write-Host "[*] Installing frontend npm packages..." -ForegroundColor Yellow
    Push-Location $frontendDir
    npm install
    Pop-Location
}

# 3. Start Backend in separate process
Write-Host "[*] Starting FastAPI Backend on port 8000..." -ForegroundColor Green
$backendJob = Start-Process -FilePath $pythonExe -ArgumentList "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload" -WorkingDirectory $backendDir -PassThru

# 4. Open Browser
Start-Process "http://localhost:5173"

Write-Host "`n🚀 ORBIT Platform is starting!" -ForegroundColor Green
Write-Host "   Local Access:    http://localhost:5173"
if ($lanIP) {
    Write-Host "   Network Access:  http://${lanIP}:5173 (Phones, Tablets, Other PCs)"
}
Write-Host "   Backend API Docs: http://localhost:8000/docs`n"

# 5. Start Vite Frontend (Foreground)
Push-Location $frontendDir
try {
    npx vite --host 0.0.0.0 --port 5173
} finally {
    Pop-Location
    if ($backendJob -and -not $backendJob.HasExited) {
        Write-Host "Stopping backend service..." -ForegroundColor Yellow
        Stop-Process -Id $backendJob.Id -Force -ErrorAction SilentlyContinue
    }
}
