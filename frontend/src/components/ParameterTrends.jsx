import React, { useState } from "react";
import "./ParameterTrends.css";

export default function ParameterTrends({ trends }) {
  const [metric, setMetric] = useState("leakage"); // leakage | temp | voltage
  const [hoverPoint, setHoverPoint] = useState(null);

  if (!trends) {
    return (
      <div className="trends-card trends-empty">
        <p className="eyebrow">Parameter Trend Analysis</p>
        <p className="trends-empty-text">
          Telemetry trends unavailable — ingest burn-in sensor time-series to plot parameter degradation curves.
        </p>
      </div>
    );
  }

  const { timeHours, thresholds, leakageNA, temperatureC, voltageDriftV } = trends;

  // Chart coordinate math
  const width = 640;
  const height = 240;
  const padding = { top: 25, right: 30, bottom: 35, left: 55 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  let metricData = {
    title: "Reverse Leakage Current (Idss)",
    unit: "nA",
    threshold: thresholds.maxLeakageNA,
    nominal: leakageNA.nominal,
    atRisk: leakageNA.atRisk,
    critical: leakageNA.critical,
    maxY: 300,
  };

  if (metric === "temp") {
    metricData = {
      title: "Junction Temperature (Tj)",
      unit: "°C",
      threshold: thresholds.maxTempC,
      nominal: temperatureC.nominal,
      atRisk: temperatureC.atRisk,
      critical: temperatureC.critical,
      maxY: 180,
    };
  } else if (metric === "voltage") {
    metricData = {
      title: "Threshold Voltage Drift (ΔVth)",
      unit: "V",
      threshold: thresholds.maxVoltageDriftV,
      nominal: voltageDriftV.nominal,
      atRisk: voltageDriftV.atRisk,
      critical: voltageDriftV.critical,
      maxY: 1.5,
    };
  }

  const allVals = [
    ...(metricData.nominal || []),
    ...(metricData.atRisk || []),
    ...(metricData.critical || []),
    metricData.threshold,
  ].filter((v) => v !== null && !isNaN(v));

  const minVal = allVals.length > 0 ? Math.min(...allVals) : 0;
  const maxVal = allVals.length > 0 ? Math.max(...allVals) : 100;
  const rangeVal = maxVal - minVal || 1;
  const minY = parseFloat((minVal < 0 ? minVal - rangeVal * 0.05 : Math.max(0, minVal - rangeVal * 0.1)).toFixed(2));
  const maxY = parseFloat((maxVal + rangeVal * 0.1).toFixed(2));
  const rangeY = maxY - minY || 1;

  const getX = (i) => padding.left + (i / Math.max(timeHours.length - 1, 1)) * chartW;
  const getY = (val) => padding.top + chartH - ((val - minY) / rangeY) * chartH;

  const makePath = (dataArr) => {
    return dataArr
      .map((val, i) => `${i === 0 ? "M" : "L"} ${getX(i)} ${getY(val)}`)
      .join(" ");
  };

  const thresholdY = getY(metricData.threshold);

  return (
    <div className="trends-card glass-card">
      <div className="trends-header">
        <div>
          <p className="eyebrow eyebrow-tight">AEC-Q101 In-Situ Telemetry</p>
          <h3 className="trends-title">{metricData.title} vs Time</h3>
        </div>

        {/* Switcher Tabs */}
        <div className="trends-tabs">
          <button
            className={`trends-tab ${metric === "leakage" ? "active" : ""}`}
            onClick={() => setMetric("leakage")}
          >
            Leakage Current (nA)
          </button>
          <button
            className={`trends-tab ${metric === "temp" ? "active" : ""}`}
            onClick={() => setMetric("temp")}
          >
            Junction Temp (°C)
          </button>
          <button
            className={`trends-tab ${metric === "voltage" ? "active" : ""}`}
            onClick={() => setMetric("voltage")}
          >
            Voltage Drift (ΔV)
          </button>
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="trends-svg-wrap">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="trends-svg"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <linearGradient id="grad-crit" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ff7a7a" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#ff7a7a" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = padding.top + chartH * (1 - ratio);
            const valNum = minY + ratio * rangeY;
            const val = rangeY < 5 ? valNum.toFixed(2) : valNum.toFixed(0);
            return (
              <g key={ratio}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke="rgba(255, 255, 255, 0.08)"
                  strokeDasharray="3 3"
                />
                <text
                  x={padding.left - 10}
                  y={y + 4}
                  textAnchor="end"
                  className="chart-axis-label"
                >
                  {val} {metricData.unit}
                </text>
              </g>
            );
          })}

          {/* Time axis ticks */}
          {timeHours.map((h, i) => (
            <text
              key={h}
              x={getX(i)}
              y={height - 12}
              textAnchor="middle"
              className="chart-axis-label"
            >
              {h}h
            </text>
          ))}

          {/* Tolerance Threshold Line */}
          {thresholdY >= padding.top && thresholdY <= height - padding.bottom && (
            <>
              <line
                x1={padding.left}
                y1={thresholdY}
                x2={width - padding.right}
                y2={thresholdY}
                stroke="#ffcf7a"
                strokeWidth="1.5"
                strokeDasharray="6 4"
              />
              <text
                x={width - padding.right - 5}
                y={thresholdY - 6}
                textAnchor="end"
                fill="#ffcf7a"
                fontSize="10"
                fontFamily="JetBrains Mono"
              >
                Upper Limit: {metricData.threshold} {metricData.unit}
              </text>
            </>
          )}

          {/* Curves */}
          <path
            d={makePath(metricData.critical)}
            fill="none"
            stroke="#ff7a7a"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <path
            d={makePath(metricData.atRisk)}
            fill="none"
            stroke="#ffbe53"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d={makePath(metricData.nominal)}
            fill="none"
            stroke="#7fe0a8"
            strokeWidth="2"
            strokeLinecap="round"
          />

          {/* Interactive points */}
          {timeHours.map((h, i) => {
            const cx = getX(i);
            const cyCrit = getY(metricData.critical[i]);
            const cyRisk = getY(metricData.atRisk[i]);
            const cyNom = getY(metricData.nominal[i]);

            return (
              <g key={i}>
                <circle
                  cx={cx}
                  cy={cyNom}
                  r="3.5"
                  className="chart-point point-nominal"
                  onMouseEnter={() =>
                    setHoverPoint({
                      hour: h,
                      type: "Nominal Baseline",
                      val: metricData.nominal[i],
                      unit: metricData.unit,
                      x: cx,
                      y: cyNom,
                    })
                  }
                  onMouseLeave={() => setHoverPoint(null)}
                />
                <circle
                  cx={cx}
                  cy={cyRisk}
                  r="4"
                  className="chart-point point-atrisk"
                  onMouseEnter={() =>
                    setHoverPoint({
                      hour: h,
                      type: "At-Risk Population",
                      val: metricData.atRisk[i],
                      unit: metricData.unit,
                      x: cx,
                      y: cyRisk,
                    })
                  }
                  onMouseLeave={() => setHoverPoint(null)}
                />
                <circle
                  cx={cx}
                  cy={cyCrit}
                  r="4.5"
                  className="chart-point point-critical"
                  onMouseEnter={() =>
                    setHoverPoint({
                      hour: h,
                      type: "Critical Fail Precursor",
                      val: metricData.critical[i],
                      unit: metricData.unit,
                      x: cx,
                      y: cyCrit,
                    })
                  }
                  onMouseLeave={() => setHoverPoint(null)}
                />
              </g>
            );
          })}
        </svg>

        {/* Hover Tooltip */}
        {hoverPoint && (
          <div
            className="chart-tooltip"
            style={{
              left: `${(hoverPoint.x / width) * 100}%`,
              top: `${(hoverPoint.y / height) * 100}%`,
            }}
          >
            <div className="tooltip-title">
              {hoverPoint.type} @ {hoverPoint.hour}h
            </div>
            <div className="tooltip-val">
              {hoverPoint.val} {hoverPoint.unit}
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="trends-legend">
        <div className="legend-item">
          <span className="legend-dot dot-nominal" />
          <span>Nominal Population (&lt;5% Risk)</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot dot-atrisk" />
          <span>At-Risk Sub-Lot (&gt;50% Risk)</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot dot-critical" />
          <span>Critical Breakdown (&gt;90% Risk)</span>
        </div>
        <div className="legend-item">
          <span className="legend-line line-threshold" />
          <span>Qualification Boundary</span>
        </div>
      </div>
    </div>
  );
}
