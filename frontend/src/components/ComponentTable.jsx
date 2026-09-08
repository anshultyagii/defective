import React, { useState } from "react";
import "./ComponentTable.css";

function getComponentMetrics(comp) {
  const baselineR = comp.baselineR !== undefined && comp.baselineR !== null
    ? comp.baselineR
    : (comp.onResistanceMOhm ? comp.onResistanceMOhm / 28.0 : 1.0);

  const forecast168h = comp.forecast168h !== undefined && comp.forecast168h !== null
    ? comp.forecast168h
    : (comp.predicted168h !== undefined ? comp.predicted168h : baselineR * 1.05);

  let driftPct = comp.driftPct;
  let driftAbs = comp.driftAbs;

  if (driftPct === undefined || driftPct === null) {
    if (forecast168h !== undefined && baselineR > 0) {
      driftAbs = forecast168h - baselineR;
      driftPct = (driftAbs / baselineR) * 100;
    } else if (comp.voltageDriftV !== undefined) {
      driftAbs = comp.voltageDriftV;
      driftPct = baselineR > 0 ? (driftAbs / baselineR) * 100 : 0;
    } else {
      driftAbs = 0.005;
      driftPct = 0.5;
    }
  }

  if (driftAbs === undefined || driftAbs === null) {
    driftAbs = (driftPct / 100) * baselineR;
  }

  const tempC = comp.tempC !== undefined && comp.tempC !== null ? comp.tempC : 125.0;
  const anomalyScore = comp.anomalyScore !== undefined && comp.anomalyScore !== null ? comp.anomalyScore : 5.0;

  return {
    baselineR,
    forecast168h,
    driftPct,
    driftAbs,
    tempC,
    anomalyScore,
  };
}

export default function ComponentTable({ components, onSelectComponent, standards, chamber }) {
  const [filter, setFilter] = useState("all"); // all | Critical | At Risk | Pass
  const [search, setSearch] = useState("");

  if (!components || components.length === 0) {
    return (
      <div className="glass-card table-empty-card">
        <p className="eyebrow">Component Screening Telemetry</p>
        <p className="table-empty-desc">
          No component telemetry loaded. Ingest batch data or load demo dataset to view unit-level analytics.
        </p>
      </div>
    );
  }

  const filteredComponents = components.filter((comp) => {
    const matchesFilter = filter === "all" || comp.status === filter;
    const matchesSearch =
      comp.id.toLowerCase().includes(search.toLowerCase()) ||
      comp.lot.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const countCrit = components.filter((c) => c.status === "Critical").length;
  const countRisk = components.filter((c) => c.status === "At Risk").length;
  const countPass = components.filter((c) => c.status === "Pass").length;

  return (
    <div className="glass-card component-table-card">
      {/* Top Header */}
      <div className="component-table-header">
        <div>
          <p className="eyebrow eyebrow-tight">Batch Unit Telemetry</p>
          <h3 className="component-table-title">Component-Level Anomaly Breakdown</h3>
        </div>

        {/* Filter Badges */}
        <div className="component-table-controls">
          <div className="search-input-wrap">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              className="table-search-input"
              placeholder="Search ID or Lot..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button className="search-clear-btn" onClick={() => setSearch("")}>
                ✕
              </button>
            )}
          </div>

          <div className="filter-pill-group">
            <button
              className={`filter-pill ${filter === "all" ? "active" : ""}`}
              onClick={() => setFilter("all")}
            >
              All ({components.length})
            </button>
            <button
              className={`filter-pill pill-crit ${filter === "Critical" ? "active" : ""}`}
              onClick={() => setFilter("Critical")}
            >
              Critical ({countCrit})
            </button>
            <button
              className={`filter-pill pill-risk ${filter === "At Risk" ? "active" : ""}`}
              onClick={() => setFilter("At Risk")}
            >
              At Risk ({countRisk})
            </button>
            <button
              className={`filter-pill pill-pass ${filter === "Pass" ? "active" : ""}`}
              onClick={() => setFilter("Pass")}
            >
              Pass ({countPass})
            </button>
          </div>
        </div>
      </div>

      {/* Table Container */}
      <div className="table-responsive">
        <table className="screening-table">
          <thead>
            <tr>
              <th>Component ID</th>
              <th>Lot / Wafer</th>
              <th>Package</th>
              <th>Junction Temp (Tj)</th>
              <th>Baseline (R₀ₕ)</th>
              <th>Drift (ΔR / %)</th>
              <th>168h Forecast</th>
              <th>Anomaly Score</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredComponents.length > 0 ? (
              filteredComponents.map((comp) => {
                const isCrit = comp.status === "Critical";
                const isRisk = comp.status === "At Risk";
                const m = getComponentMetrics(comp);

                return (
                  <tr
                    key={comp.id}
                    className={`table-row ${isCrit ? "row-crit" : isRisk ? "row-risk" : ""}`}
                    onClick={() => onSelectComponent(comp)}
                  >
                    <td className="cell-id">
                      <span className="comp-id-chip">{comp.id}</span>
                    </td>
                    <td className="cell-lot">{comp.lot}</td>
                    <td className="cell-dim">{comp.package || "TO-247-4L"}</td>
                    <td className={`cell-mono ${m.tempC > 150 ? "text-crit" : m.tempC > 135 ? "text-risk" : ""}`}>
                      {m.tempC.toFixed(1)}°C
                    </td>
                    <td className="cell-mono">
                      {m.baselineR.toFixed(3)} Ω
                    </td>
                    <td
                      className={`cell-mono ${
                        Math.abs(m.driftPct) > 5
                          ? "text-crit"
                          : Math.abs(m.driftPct) > 2
                          ? "text-risk"
                          : "text-pass"
                      }`}
                    >
                      {m.driftPct >= 0 ? "+" : ""}{m.driftPct.toFixed(2)}%
                      <span className="drift-sub"> ({m.driftAbs >= 0 ? "+" : ""}{m.driftAbs.toFixed(3)} Ω)</span>
                    </td>
                    <td
                      className={`cell-mono ${
                        isCrit ? "text-crit" : isRisk ? "text-risk" : "text-pass"
                      }`}
                    >
                      {m.forecast168h.toFixed(3)} Ω
                    </td>
                    <td className="cell-mono">
                      {m.anomalyScore.toFixed(1)}%
                    </td>
                    <td>
                      <span
                        className={`status-chip ${
                          isCrit
                            ? "chip-crit"
                            : isRisk
                            ? "chip-risk"
                            : "chip-pass"
                        }`}
                      >
                        {comp.status}
                      </span>
                    </td>
                    <td>
                      <button
                        className="table-action-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectComponent(comp);
                        }}
                      >
                        Inspect →
                      </button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="10" className="table-no-results">
                  No components match the current filter criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="table-footer-info">
        <span>Showing {filteredComponents.length} of {components.length} components</span>
        <span>{standards || "AEC-Q100 / MIL-STD-883"} • {chamber || "In-Situ Burn-In Facility"}</span>
      </div>
    </div>
  );
}
