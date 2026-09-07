#!/usr/bin/env bash

# Resolve root project directory
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"

echo "=========================================================="
echo "    🛰️  Starting ORBIT Mission Screening Platform         "
echo "=========================================================="

# Detect OS
OS_NAME="$(uname -s)"
case "$OS_NAME" in
  Darwin*) PLATFORM="macOS" ;;
  Linux*)  PLATFORM="Linux" ;;
  MINGW*|MSYS*|CYGWIN*) PLATFORM="Windows-Bash" ;;
  *) PLATFORM="Unix" ;;
esac
echo "Detected Operating System: $PLATFORM"

# Determine LAN IP for multi-device network access (phones, tablets, other PCs)
LAN_IP=""
if [ "$PLATFORM" = "macOS" ]; then
  LAN_IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null)
elif [ "$PLATFORM" = "Linux" ]; then
  LAN_IP=$(hostname -I 2>/dev/null | awk '{print $1}')
fi

# Locate Python command (python3 or python)
PYTHON_BIN=""
if command -v python3 >/dev/null 2>&1; then
  PYTHON_BIN="python3"
elif command -v python >/dev/null 2>&1; then
  PYTHON_BIN="python"
else
  echo "❌ Error: Python is not installed or not in PATH."
  echo "Please install Python 3.10+ from https://www.python.org"
  exit 1
fi

# Locate Node / NPM
if ! command -v npm >/dev/null 2>&1; then
  echo "❌ Error: npm / Node.js is not installed or not in PATH."
  echo "Please install Node.js from https://nodejs.org"
  exit 1
fi

# 1. Setup Backend Environment if needed
if [ ! -d "$BACKEND_DIR/.venv" ]; then
  echo "📦 Initializing Python virtual environment in backend/.venv..."
  (cd "$BACKEND_DIR" && "$PYTHON_BIN" -m venv .venv)
fi

UVICORN_EXEC="$BACKEND_DIR/.venv/bin/uvicorn"
if [ ! -f "$UVICORN_EXEC" ] && [ -f "$BACKEND_DIR/.venv/Scripts/uvicorn.exe" ]; then
  UVICORN_EXEC="$BACKEND_DIR/.venv/Scripts/uvicorn.exe"
fi

if [ ! -f "$UVICORN_EXEC" ]; then
  echo "📦 Installing backend Python dependencies..."
  if [ -f "$BACKEND_DIR/.venv/bin/pip" ]; then
    "$BACKEND_DIR/.venv/bin/pip" install -r "$BACKEND_DIR/requirements.txt"
  elif [ -f "$BACKEND_DIR/.venv/Scripts/pip.exe" ]; then
    "$BACKEND_DIR/.venv/Scripts/pip.exe" install -r "$BACKEND_DIR/requirements.txt"
  else
    "$PYTHON_BIN" -m pip install -r "$BACKEND_DIR/requirements.txt"
  fi
fi

# 2. Setup Frontend Dependencies if needed
if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
  echo "📦 Installing frontend Node dependencies..."
  (cd "$FRONTEND_DIR" && npm install)
fi

# 3. Check & Start Python FastAPI Backend (Port 8000)
# Bind to 0.0.0.0 so other devices on network can connect
PORT_8000_BUSY=0
if command -v lsof >/dev/null 2>&1; then
  lsof -i :8000 >/dev/null 2>&1 && PORT_8000_BUSY=1
elif command -v ss >/dev/null 2>&1; then
  ss -tuln | grep -q ":8000 " && PORT_8000_BUSY=1
fi

if [ "$PORT_8000_BUSY" -eq 1 ]; then
  echo "✔ Backend ML API is already active on port 8000"
else
  echo "⚡ Launching FastAPI ML Backend on http://0.0.0.0:8000..."
  if [ -f "$UVICORN_EXEC" ]; then
    (cd "$BACKEND_DIR" && "$UVICORN_EXEC" app.main:app --host 0.0.0.0 --port 8000 --reload) &
    BACKEND_PID=$!
  else
    (cd "$BACKEND_DIR" && "$PYTHON_BIN" -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload) &
    BACKEND_PID=$!
  fi
  sleep 2
fi

# Cleanup on exit (Ctrl+C)
cleanup() {
  echo ""
  echo "Shutting down ORBIT..."
  if [ -n "$BACKEND_PID" ]; then
    kill "$BACKEND_PID" 2>/dev/null
  fi
  exit 0
}
trap cleanup SIGINT SIGTERM

# 4. Open default browser
open_browser() {
  sleep 2
  if [ "$PLATFORM" = "macOS" ]; then
    open "http://localhost:5173" 2>/dev/null
  elif command -v xdg-open >/dev/null 2>&1; then
    xdg-open "http://localhost:5173" 2>/dev/null
  elif command -v sensible-browser >/dev/null 2>&1; then
    sensible-browser "http://localhost:5173" 2>/dev/null
  fi
}
open_browser &

echo ""
echo "🚀 ORBIT Mission Screening Platform is ready!"
echo "   ▶ Local Access:    http://localhost:5173"
if [ -n "$LAN_IP" ]; then
  echo "   ▶ Network Access:  http://$LAN_IP:5173 (Phones, Tablets, Other PCs)"
fi
echo "   ▶ Backend API:     http://localhost:8000/docs"
echo ""

# 5. Start Vite Frontend (Port 5173, Host 0.0.0.0)
cd "$FRONTEND_DIR"
npx vite --host 0.0.0.0 --port 5173
