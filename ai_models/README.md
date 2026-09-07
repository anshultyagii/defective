# AI Models Registry

This directory contains the production machine learning models and feature scalers for the **Orbit Burn-In Screening Platform**.

---

## Model Artifacts

| Artifact | Type | Description |
| :--- | :--- | :--- |
| `module_a_classifier.pkl` | `VotingClassifier` | Ensemble soft-voting classifier (**Logistic Regression + Random Forest + Gradient Boosting**) predicting early $0\text{h} \to 24\text{h}$ burn-in anomaly risk. |
| `module_b_regressor.pkl` | `VotingRegressor` | Ensemble regressor (**Ridge + Random Forest + Gradient Boosting**) forecasting continuous degradation drift at $168\text{h}$ end-of-life. |
| `feature_scaler.pkl` | `StandardScaler` | Multi-parametric standardizer fitted on 5 core features. |
| `metadata.json` | Configuration | Model lineage, synchronization timestamps, and Git commit SHA. |

---

## Feature Schema

Models expect the following 5 normalized input features:

1. `RDS_0h` (float): Baseline on-resistance at hour 0.
2. `RDS_24h` (float): Resistance after initial 24 hours of burn-in.
3. `Delta_RDS` (float): Absolute resistance shift ($\Delta R = R_{24h} - R_{0h}$).
4. `Pct_Change_RDS` (float): Relative percentage change $\left(\frac{\Delta R}{R_{0h}} \times 100\right)$.
5. `Max_Temp_Early` (float): Peak junction temperature ($T_j$) recorded during early burn-in.

---

## Thresholds & Decision Matrix

* **Module A Anomaly Score:** Threshold $\ge 0.50$ triggers `FLAG`.
* **Module B 168h Drift Forecast:** Exceeding safety threshold ($\pm 5.0\%$) triggers `FLAG`.
* **Consensus Engine:** Blends Module A and B inferences with Arrhenius thermal limits and $3\sigma$ process bounds into `PASS` or `FLAG` with risk tiers (`LOW`, `MEDIUM`, `HIGH`).
