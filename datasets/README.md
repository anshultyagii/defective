# 🛰️ Orbit Burn-In Intelligence — Synthetic Verification Datasets

This directory contains physically-grounded, multi-modal synthetic datasets designed to rigorously verify and benchmark:
1. **Module A** (Spatial & Thermal Anomaly Core — Isolation Forest / LOF / VotingClassifier)
2. **Module B** (Degradation Regressor & Drift Model — Ridge / Gradient Boosting / VotingRegressor)
3. **Fusion Decision Engine** (Multi-module risk scoring & AEC-Q100 / MIL-STD-883 qualification)
4. **Orbit Mission Dashboard & Ingestion Pipeline** (Multi-file drag & drop, time-series telemetry parsing, and unit-level telemetry tables)

---

## 📁 Directory Structure & Dataset Overview

```
synthetic_datasets/
├── 01_ML_Model_Benchmark_Suite/
│   ├── 01_Model_Verification_50_Components.csv   (50-unit multi-lot screening benchmark)
│   ├── 02_Stress_Test_Edge_Cases.csv             (8 boundary/stress test cases)
│   └── 03_Zero_Nominal_Fleet_100pct_Flagged_Lot.csv (25-unit 100% flagged lot - 0 nominal pass)
│
├── 02_Time_Series_Telemetry_Suite/
│   ├── DUT_01_Golden_Healthy_168h.csv            (168h continuous stream - Certified Pass)
│   ├── DUT_02_Thermal_Overstress_Short_168h.csv  (168h thermal punch-through short - Critical)
│   ├── DUT_03_Latent_Wearout_Drift_168h.csv      (168h exponential drift - Critical)
│   └── DUT_04_Gate_Oxide_Rupture_168h.csv        (168h catastrophic resistance surge - Critical)
│
├── 03_Multi_File_Upload_Pack/
│   ├── DUT_01_Certified_Nominal.csv              (Individual unit 1: Pass)
│   ├── DUT_02_Certified_Nominal.csv              (Individual unit 2: Pass)
│   ├── DUT_03_Borderline_Watch.csv               (Individual unit 3: At Risk)
│   ├── DUT_04_Thermal_Excursion.csv              (Individual unit 4: Critical)
│   ├── DUT_05_Gate_Oxide_Rupture.csv             (Individual unit 5: Critical)
│   └── DUT_06_Junction_Short.csv                 (Individual unit 6: Critical)
│
└── verify_models.py                              (Automated verification test runner)
```

---

## 🧪 Benchmark Test Scenarios

### Suite 1: Multi-Component Batch Screening (`01_Model_Verification_50_Components.csv`)
A 50-device master lot screening CSV containing ground-truth classifications across 3 lots:
- **30 Certified Healthy Components (`DUT-NOMINAL-001` to `030`):**
  - Tight parametric baseline (.0 \pm 0.2\,\Omega$), negligible drift ($< 0.5\%$), junction temp -55^\circ	ext{C}$.
  - **Ground Truth:** `PASS` (Low Risk).
- **10 Thermal / Early Spatial Outliers (`DUT-THERMAL-OUTLIER-01` to `10`):**
  - Elevated early thermal resistance (-210^\circ	ext{C}$) or rapid early resistance change (0-30\%$ at 24h).
  - **Ground Truth:** `FLAG` (Module A target, High Risk).
- **6 Latent Degradation Drifters (`DUT-LATENT-DRIFT-01` to `06`):**
  - Pristine at 0h/24h, but exhibiting accelerating non-linear degradation crossing the 5% AEC-Q100 safety envelope.
  - **Ground Truth:** `FLAG` (Module B target, High Risk).
- **4 Catastrophic Failures (`DUT-CATASTROPHIC-...`):**
  - Severe gate oxide rupture (0\%$) or junction punch-through collapse (569X90\%$).
  - **Ground Truth:** `FLAG` / Critical Reject.

### Suite 2: Continuous 168-Hour Sensor Streams
High-resolution time-series sensor telemetry ({	ext{DS(on)}}$, Package Temp, {	ext{DS}}$, Current $, Operating State) across 200 chronological frames:
1. **`DUT_01_Golden_Healthy_168h.csv`:** Baseline zsh.85\,\Omega$, steady ^\circ	ext{C}$, drift $< 0.012\,\Omega$. Verified 100% Pass across all 8 chronological checkpoints.
2. **`DUT_02_Thermal_Overstress_Short_168h.csv`:** Follows NASA thermal overstress physics: junction temp escalates past ^\circ	ext{C} 	o 252^\circ	ext{C}$, causing dielectric punch-through and collapse from zsh.826\,\Omega 	o 0.058\,\Omega$.
3. **`DUT_03_Latent_Wearout_Drift_168h.csv`:** Stable up to 48h, followed by exponential wear-out drift surging past .5\,\Omega$ at 120h and .8\,\Omega$ at 168h.
4. **`DUT_04_Gate_Oxide_Rupture_168h.csv`:** Severe gate oxide breakdown causing resistance explosion from zsh.90\,\Omega 	o 8.95\,\Omega$ (+917%).

### Suite 3: Multi-File Drag & Drop Pack (`03_Multi_File_Upload_Pack/`)
Six separate device files with mixed health states designed specifically to test the **Multi-File Upload** feature in the Orbit UI.
- Drag and drop all 6 files at once into the Data Intake modal.
- Verify that the **Batch Unit Telemetry** table populates with 6 distinct rows, each showing that device's individual peak temperature, resistance, measured drift, and calibrated status (Pass, At Risk, Critical).

---

## 🚀 How to Run Automated Verification

To run the automated validation script against the live FastAPI ML backend:

```bash
# 1. Ensure backend is running
curl -s http://127.0.0.1:8000/health

# 2. Run the verification script
python3 synthetic_datasets/verify_models.py
```

The script will automatically evaluate:
- Confusion Matrix (True Positives, True Negatives, False Positives, False Negatives)
- Accuracy, Precision, Recall, and F1-Score
- Decision breakdown for each failure mode
