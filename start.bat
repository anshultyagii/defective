@echo off
setlocal enabledelayedexpansion

echo ==========================================================
echo     ORBIT Mission Screening Platform (Windows Launcher)   
echo ==========================================================

cd /d "%~dp0"
set "ROOT_DIR=%~dp0"
set "BACKEND_DIR=%ROOT_DIR%backend"
set "FRONTEND_DIR=%ROOT_DIR%frontend"

:: Check Python
where python >nul 2>&1
if %ERRORLEVEL% neq 0 (
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
    python -m venv .venv
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

:: 3. Launch Backend in dedicated window
echo [*] Launching Python FastAPI Backend on port 8000...
start "ORBIT-Backend" cmd /k "cd /d ""%BACKEND_DIR%"" && .venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

:: 4. Open default web browser after short delay
start "" "http://localhost:5173"

echo.
echo ==========================================================
echo  ORBIT is now running!
echo  Local Dashboard:    http://localhost:5173
echo  Backend Swagger UI: http://localhost:8000/docs
echo ==========================================================
echo.

:: 5. Start Vite Frontend (Foreground)
cd /d "%FRONTEND_DIR%"
call npx vite --host 0.0.0.0 --port 5173
