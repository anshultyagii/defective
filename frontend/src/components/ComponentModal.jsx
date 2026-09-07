import React from "react";
import "./ComponentModal.css";

export default function ComponentModal({ component, onClose }) {
  if (!component) return null;

  const isCritical = component.status === "Critical";
  const isAtRisk = component.status === "At Risk";

  const baselineR = component.baselineR !== undefined && component.baselineR !== null
    ? component.baselineR
    : (component.onResistanceMOhm ? component.onResistanceMOhm / 28.0 : 1.0);

  const forecast168h = component.forecast168h !== undefined && component.forecast168h !== null
    ? component.forecast168h
    : (component.predicted168h !== undefined ? component.predicted168h : baselineR * 1.05);

  let driftPct = component.driftPct;
  let driftAbs = component.driftAbs;

  if (driftPct === undefined || driftPct === null) {
    if (forecast168h !== undefined && baselineR > 0) {
      driftAbs = forecast168h - baselineR;
      driftPct = (driftAbs / baselineR) * 100;
    } else if (component.voltageDriftV !== undefined) {
      driftAbs = component.voltageDriftV;
      driftPct = baselineR > 0 ? (driftAbs / baselineR) * 100 : 0;
    } else {
      driftAbs = 0.005;
      driftPct = 0.5;
    }
  }

  if (driftAbs === undefined || driftAbs === null) {
    driftAbs = (driftPct / 100) * baselineR;
  }

  const tempC = component.tempC !== undefined && component.tempC !== null ? component.tempC : 125.0;
  const anomalyScore = component.anomalyScore !== undefined && component.anomalyScore !== null ? component.anomalyScore : 5.0;

  const modADecision = component.moduleA || (anomalyScore > 40 ? "FLAG" : "PASS");
  const modBDecision = component.moduleB || (Math.abs(driftPct) > 5 ? "FLAG" : "PASS");

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card glass-card" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-title-wrap">
            <span className="eyebrow eyebrow-tight">Component Telemetry Deep-Dive</span>
            <h2 className="modal-title">{component.id}</h2>
            <div className="modal-subtags">
              <span className="modal-tag">{component.lot}</span>
              <span className="modal-tag">{component.package || "TO-247-4L"}</span>
              <span
                className={`modal-status-badge ${
                  isCritical
                    ? "status-crit"
                    : isAtRisk
                    ? "status-risk"
                    : "status-pass"
                }`}
              >
                {component.status === "Pass" ? "PASSED SCREENING" : `${component.status.toUpperCase()} FLAGGED`}
              </span>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Telemetry Metrics Grid */}
        <div className="modal-metrics-grid">
          <div className="modal-metric">
            <span className="metric-label">Peak Junction Temp (Tj)</span>
            <span className={`metric-val ${tempC > 150 ? "val-crit" : tempC > 135 ? "val-risk" : "val-pass"}`}>
              {tempC.toFixed(1)} °C
            </span>
            <span className="metric-limit">AEC-Q100 Limit: 150.0°C</span>
          </div>

          <div className="modal-metric">
            <span className="metric-label">Baseline Resistance (R₀ₕ)</span>
            <span className="metric-val val-pass">
              {baselineR.toFixed(3)} Ω
            </span>
            <span className="metric-limit">0h In-Situ Reference</span>
          </div>

          <div className="modal-metric">
            <span className="metric-label">In-Situ Drift (ΔR / %)</span>
            <span className={`metric-val ${Math.abs(driftPct) > 5 ? "val-crit" : Math.abs(driftPct) > 2 ? "val-risk" : "val-pass"}`}>
              {driftPct >= 0 ? "+" : ""}{driftPct.toFixed(2)}%
            </span>
            <span className="metric-limit">{driftAbs >= 0 ? "+" : ""}{driftAbs.toFixed(3)} Ω (Spec: ±5%)</span>
          </div>

          <div className="modal-metric">
            <span className="metric-label">168h Forecast (R₁₆₈ₕ)</span>
            <span className={`metric-val ${isCritical ? "val-crit" : isAtRisk ? "val-risk" : "val-pass"}`}>
              {forecast168h.toFixed(3)} Ω
            </span>
            <span className="metric-limit">Module B Regression</span>
          </div>
        </div>

        {/* Multi-Module AI Diagnostic Status */}
        <div className="modal-ai-chips">
          <div className="modal-ai-chip">
            <span className="ai-chip-title">Module A (Spatial / Thermal Outlier):</span>
            <span className={`ai-chip-val ${modADecision === "FLAG" ? "chip-flag" : "chip-nominal"}`}>
              {modADecision} ({anomalyScore.toFixed(0)}% Score)
            </span>
          </div>
          <div className="modal-ai-chip">
            <span className="ai-chip-title">Module B (Degradation Regressor):</span>
            <span className={`ai-chip-val ${modBDecision === "FLAG" ? "chip-flag" : "chip-nominal"}`}>
              {modBDecision} (168h: {forecast168h.toFixed(3)} Ω)
            </span>
          </div>
        </div>

        {/* Root Cause Diagnosis */}
        <div className="modal-section">
          <h4 className="modal-section-title">Physical Failure Mechanism & Diagnostic</h4>
          <p className="modal-section-desc">{component.diagnosis}</p>
        </div>

        {/* Remediation */}
        <div className="modal-section">
          <h4 className="modal-section-title">Quality Engineering Remediation</h4>
          <p className="modal-section-desc modal-remediation">{component.remediation}</p>
        </div>

        {/* Actions */}
        <div className="modal-footer">
          <button className="glass-btn glass-btn--primary" onClick={onClose}>
            Close Telemetry Review
          </button>
        </div>
      </div>
    </div>
  );
}
