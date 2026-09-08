@echo off
setlocal enabledelayedexpansion

echo ==========================================================
echo     ORBIT Mission Screening Platform (Windows Launcher)
echo ==========================================================

cd /d "%~dp0"
set "ROOT_DIR=%~dp0"
set "BACKEND_DIR=%ROOT_DIR%backend"
set "FRONTEND_DIR=%ROOT_DIR%frontend"

:: Detect LAN IP for multi-device network access
set "LAN_IP="
for /f "tokens=2 delims=:" %%A in ('ipconfig ^| findstr /C:"IPv4 Address"') do (
    if not defined LAN_IP (
        for /f "tokens=*" %%B in ("%%A") do set "LAN_IP=%%B"
    )
)

:: Check Python (prefer python3 if available, fall back to python)
set "PYTHON_CMD="
where python3 >nul 2>&1
if %ERRORLEVEL% equ 0 (
    set "PYTHON_CMD=python3"
) else (
    where python >nul 2>&1
    if %ERRORLEVEL% equ 0 (
        set "PYTHON_CMD=python"
    )
)
if not defined PYTHON_CMD (
    echo [X] Python was not found in PATH!
    echo Please install Python 3.10+ from https://www.python.org/
    pause
    exit /b 1
)

:: Check Node / NPM
where npm >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [X] Node.js / NPM was not found in PATH!
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

:: 1. Setup Backend Python Virtual Environment if missing
if not exist "%BACKEND_DIR%\.venv" (
    echo [*] Creating Python virtual environment in backend\.venv...
    cd /d "%BACKEND_DIR%"
    %PYTHON_CMD% -m venv .venv
    cd /d "%ROOT_DIR%"
)

if not exist "%BACKEND_DIR%\.venv\Scripts\uvicorn.exe" (
    echo [*] Installing backend dependencies from requirements.txt...
    "%BACKEND_DIR%\.venv\Scripts\pip.exe" install -r "%BACKEND_DIR%\requirements.txt"
)

:: 2. Setup Frontend Node modules if missing
if not exist "%FRONTEND_DIR%\node_modules" (
    echo [*] Installing frontend Node dependencies...
    cd /d "%FRONTEND_DIR%"
    call npm install
    cd /d "%ROOT_DIR%"
)

:: 3. Launch Backend in a dedicated window
echo [*] Launching Python FastAPI Backend on port 8000...
start "ORBIT-Backend" /D "%BACKEND_DIR%" "%BACKEND_DIR%\.venv\Scripts\python.exe" -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

:: 4. Open default web browser after short delay (give Vite time to bind)
timeout /t 3 /nobreak >nul
start "" "http://localhost:5173"

echo.
echo ==========================================================
echo  ORBIT is now running!
echo  Local Dashboard:    http://localhost:5173
if defined LAN_IP (
echo  Network Access:     http://!LAN_IP!:5173
)
echo  Backend Swagger UI: http://localhost:8000/docs
echo ==========================================================
echo.

:: 5. Start Vite Frontend (Foreground)
cd /d "%FRONTEND_DIR%"
call npx vite --host 0.0.0.0 --port 5173
