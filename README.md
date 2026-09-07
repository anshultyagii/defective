# ORBIT: Intelligent Burn-In Screening & Parametric Drift Forecasting Platform

ORBIT is an AI-powered semiconductor qualification platform designed for mission-critical aerospace, satellite, and defense electronics. It predicts 168-hour end-of-life parametric drift using early 24-hour burn-in telemetry.

---

## 📁 Project Architecture & Directory Structure

```
project_sih_updated/
├── Start_Orbit.command       # macOS Finder one-click launcher
├── start.sh                  # Universal Unix/Linux/macOS master launcher
├── start.bat                 # Windows native one-click batch launcher
├── start.ps1                 # Windows modern PowerShell launcher
├── docker-compose.yml        # Universal Docker container orchestration
├── Zero_Nominal_Fleet_100pct_Flagged_Lot.csv # Stress-test zero-nominal dataset
├── README.md                 # Root project documentation
│
├── frontend/                 # React 18 + Vite 5 Interactive Mission Dashboard
│   ├── Dockerfile            # Frontend container image
│   ├── src/                  # Components, dynamic SVG engines, parsers, services
│   ├── public/               # Static assets & favicons
│   ├── index.html            # Single-page application entry point
│   ├── vite.config.js        # Vite bundler & reverse proxy configuration
│   └── package.json          # Node dependencies
│
├── backend/                  # FastAPI Python microservice
│   ├── Dockerfile            # Backend container image
│   ├── app/                  # Application code (api, core, ml, schemas, services)
│   ├── tests/                # Backend unit and integration tests
│   ├── requirements.txt      # Python dependencies (cross-platform compatible)
│   └── .venv/                # Isolated virtual environment
│
├── ai_models/                # Dedicated AI/ML model registry
│   ├── module_a_classifier.pkl   # VotingClassifier (LR + RF + Gradient Boosting)
│   ├── module_b_regressor.pkl    # VotingRegressor (Ridge + RF + Gradient Boosting)
│   ├── feature_scaler.pkl        # StandardScaler (5-feature normalization)
│   ├── metadata.json             # Model lineage and synchronization status
│   └── README.md                 # AI models architecture documentation
│
└── datasets/                 # Synthetic verification & benchmarking suite
    ├── 01_ML_Model_Benchmark_Suite/   # 50-device production verification & edge cases
    ├── 02_Time_Series_Telemetry_Suite/ # 168h continuous multi-sensor streams
    ├── 03_Multi_File_Upload_Pack/     # Single-device CSVs for drag-and-drop batch upload
    ├── verify_models.py               # Automated Confusion Matrix validation harness
    └── README.md                      # Dataset documentation & test instructions
```

---

## 🚀 Universal Cross-Platform Quick Start

### 🍏 macOS (Apple Silicon M1/M2/M3 & Intel)
* **Desktop 1-Click:** Double-click **`Start_Orbit.command`** in Finder.
* **Or Terminal:**
  ```bash
  ./start.sh
  ```

### 🪟 Windows (Windows 10 / 11)
* **Command Prompt 1-Click:** Double-click **`start.bat`**.
* **Or PowerShell:**
  ```powershell
  Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
  .\start.ps1
  ```

### 🐧 Linux (Ubuntu, Debian, Fedora, Arch, WSL2)
```bash
chmod +x start.sh
./start.sh
```

### 🐳 Universal Container Launch (Any OS with Docker)
```bash
docker compose up --build
```

---

## 📱 Multi-Device & Mobile / Tablet Access (LAN)
The platform binds to `0.0.0.0` on both backend (port 8000) and frontend (port 5173).

To view the mission dashboard from your **iPhone, iPad, Android phone, or secondary PC**:
1. Connect the mobile device to the same Wi-Fi network as your host computer.
2. Open the browser on your device and navigate to:
   ```text
   http://<YOUR_COMPUTER_IP>:5173
   ```
   *(The terminal prints this exact IP address automatically when launching `start.sh` or `start.bat`)*.

---

## 🧪 Model Verification & Automated Benchmarks
Run the automated verification test harness against all production ML models:
```bash
python3 datasets/verify_models.py
```
