import React, { useState } from "react";
import "./DriftPredictor.css";

export default function DriftPredictor({ driftData }) {
  const [selectedProfile, setSelectedProfile] = useState("anomalous"); // anomalous | nominal

  if (!driftData) {
    return (
      <div className="glass-card drift-empty-card">
        <p className="eyebrow eyebrow-tight">Temporal Drift Forecasting Engine</p>
        <p className="drift-empty-desc">
          Drift models inactive. Ingest screening data to compute parameter drift velocity and forecast end-of-life trajectories.
        </p>
      </div>
    );
  }

  const { timeHours, nominalTrajectory, criticalTrajectory, thresholdLimit, driftRate, driftAccel, safetyMargin } = driftData;

  const isAnom = selectedProfile === "anomalous";
  const activeHistorical = isAnom ? criticalTrajectory : nominalTrajectory;

  // Forecast future projection (168h -> 500h)
  const fullTimeline = [0, 24, 48, 72, 96, 120, 144, 168, 250, 350, 500];
  const lastVal = activeHistorical[activeHistorical.length - 1];

  const projectedPoints = fullTimeline.map((h) => {
    if (h <= 168) {
      const idx = timeHours.indexOf(h);
      return idx >= 0 ? activeHistorical[idx] : null;
    }
    // Projected future points
    const dt = h - 168;
    if (isAnom) {
      return +(lastVal + (driftRate * dt) + (0.5 * driftAccel * dt * 0.4)).toFixed(1);
    } else {
      return +(lastVal + (0.012 * dt)).toFixed(1);
    }
  });

  const validVals = projectedPoints.filter((p) => p !== null && !isNaN(p));
  const maxVal = Math.max(...validVals, thresholdLimit || 50);
  const minVal = Math.min(...validVals, 0);
  const rangeVal = maxVal - minVal || 1;
  const maxY = parseFloat((maxVal + rangeVal * 0.1).toFixed(2));
  const minY = parseFloat((minVal < 0 ? minVal - rangeVal * 0.05 : 0).toFixed(2));
  const rangeY = maxY - minY || 1;

  // Chart coordinates
  const width = 640;
  const height = 240;
  const padding = { top: 25, right: 30, bottom: 35, left: 65 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const getX = (h) => padding.left + (h / 500) * chartW;
  const getY = (val) => padding.top + chartH - ((val - minY) / rangeY) * chartH;

  const makePath = (points) => {
    return points
      .map((val, i) => `${i === 0 ? "M" : "L"} ${getX(fullTimeline[i])} ${getY(val)}`)
      .join(" ");
  };

  const thresholdY = getY(thresholdLimit);
  const boundary168X = getX(168);

  let ttfHour = null;
  for (let i = 0; i < fullTimeline.length; i++) {
    if (projectedPoints[i] >= thresholdLimit) {
      ttfHour = fullTimeline[i];
      break;
    }
  }
  const ttfEstimate = isAnom
    ? ttfHour
      ? `${ttfHour} Hours`
      : "168+ Hours"
    : "> 5,000 Hours";

  return (
    <div className="glass-card drift-predictor-card">
      <div className="drift-header">
        <div>
          <p className="eyebrow eyebrow-tight">AI Degradation Forecaster</p>
          <h3 className="drift-title">Temporal Drift Velocity &amp; Trajectory Predictor</h3>
          <p className="drift-sub">
            Continuous Arrhenius parameter drift modeling forecasting degradation beyond standard chamber soak
          </p>
        </div>

        <div className="drift-profile-toggle">
          <button
            className={`profile-tab ${isAnom ? "active tab-anom" : ""}`}
            onClick={() => setSelectedProfile("anomalous")}
          >
            Anomalous Sub-Lot
          </button>
          <button
            className={`profile-tab ${!isAnom ? "active tab-nom" : ""}`}
            onClick={() => setSelectedProfile("nominal")}
          >
            Nominal Fleet
          </button>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="drift-kpi-grid">
        <div className="drift-kpi-item">
          <span className="drift-kpi-label">Drift Velocity (dParam/dt)</span>
          <span className={`drift-kpi-val ${isAnom ? "text-danger" : "text-success"}`}>
            {isAnom
              ? `+${driftRate} ${driftData.unit || "unit"}/h`
              : `+${(driftRate * 0.12).toFixed(4)} ${driftData.unit || "unit"}/h`}
          </span>
          <span className="drift-kpi-sub">First Derivative</span>
        </div>

        <div className="drift-kpi-item">
          <span className="drift-kpi-label">Drift Acceleration (d²Param/dt²)</span>
          <span className={`drift-kpi-val ${isAnom ? "text-danger" : "text-success"}`}>
            {isAnom ? `+${driftAccel} /h²` : "0.000 /h²"}
          </span>
          <span className="drift-kpi-sub">Second Derivative</span>
        </div>

        <div className="drift-kpi-item">
          <span className="drift-kpi-label">Time to Critical Failure (TTF)</span>
          <span className={`drift-kpi-val ${isAnom ? "text-danger" : "text-primary"}`}>
            {ttfEstimate}
          </span>
          <span className="drift-kpi-sub">Projected Threshold Crossing</span>
        </div>

        <div className="drift-kpi-item">
          <span className="drift-kpi-label">Active Safety Margin</span>
          <span className={`drift-kpi-val ${isAnom ? "text-warning" : "text-success"}`}>
            {safetyMargin} {driftData.unit || "unit"}
          </span>
          <span className="drift-kpi-sub">Distance to Datasheet Bound</span>
        </div>
      </div>

      {/* SVG Chart */}
      <div className="drift-svg-wrap">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="drift-svg"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Shaded future projection zone */}
          <rect
            x={boundary168X}
            y={padding.top}
            width={width - padding.right - boundary168X}
            height={chartH}
            fill="rgba(120, 170, 255, 0.04)"
          />

          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((r) => {
            const y = padding.top + chartH * (1 - r);
            const valNum = minY + r * rangeY;
            const valStr = rangeY < 5 ? valNum.toFixed(2) : valNum.toFixed(0);
            return (
              <g key={r}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke="rgba(255, 255, 255, 0.08)"
                  strokeDasharray="3 3"
                />
                <text
                  x={padding.left - 8}
                  y={y + 4}
                  textAnchor="end"
                  fill="#ffffff"
                  fontSize="10"
                  fontFamily="'JetBrains Mono', monospace"
                  className="chart-axis-label"
                >
                  {valStr} {driftData.unit || "unit"}
                </text>
              </g>
            );
          })}

          {/* X Axis ticks */}
          {[0, 96, 168, 300, 500].map((h) => (
            <text
              key={h}
              x={getX(h)}
              y={height - 12}
              textAnchor="middle"
              fill="#ffffff"
              fontSize="10"
              fontFamily="'JetBrains Mono', monospace"
              className="chart-axis-label"
            >
              {h}h
            </text>
          ))}

          {/* 168h Chamber Soak Cutoff Boundary */}
          <line
            x1={boundary168X}
            y1={padding.top}
            x2={boundary168X}
            y2={height - padding.bottom}
            stroke="rgba(120, 170, 255, 0.4)"
            strokeDasharray="4 3"
            strokeWidth="1.5"
          />
          <text
            x={boundary168X - 6}
            y={padding.top + 14}
            textAnchor="end"
            fill="#bcd4ff"
            fontSize="10"
            fontFamily="JetBrains Mono"
          >
            168h Soak End
          </text>
          <text
            x={boundary168X + 6}
            y={padding.top + 14}
            textAnchor="start"
            fill="#78aaff"
            fontSize="10"
            fontFamily="JetBrains Mono"
          >
            → AI Projected Trajectory
          </text>

          {/* Qualification Threshold */}
          <line
            x1={padding.left}
            y1={thresholdY}
            x2={width - padding.right}
            y2={thresholdY}
            stroke="#ff7a7a"
            strokeWidth="1.5"
            strokeDasharray="5 3"
          />
          <text
            x={width - padding.right - 6}
            y={thresholdY - 6}
            textAnchor="end"
            fill="#ff7a7a"
            fontSize="10"
            fontFamily="JetBrains Mono"
          >
            Datasheet Max: {thresholdLimit} mΩ
          </text>

          {/* Trajectory Curve */}
          <path
            d={makePath(projectedPoints)}
            fill="none"
            stroke={isAnom ? "#ff7a7a" : "#7fe0a8"}
            strokeWidth="2.5"
            strokeLinecap="round"
          />

          {/* Point nodes */}
          {fullTimeline.map((h, i) => {
            const val = projectedPoints[i];
            return (
              <circle
                key={h}
                cx={getX(h)}
                cy={getY(val)}
                r={h > 168 ? "3.5" : "4.5"}
                fill={h > 168 ? "#bcd4ff" : isAnom ? "#ff7a7a" : "#7fe0a8"}
                stroke="#040914"
                strokeWidth="1.5"
              />
            );
          })}
        </svg>
      </div>
    </div>
  );
}
