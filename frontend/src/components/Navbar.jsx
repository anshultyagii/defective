import React from "react";
import "./Navbar.css";

export default function Navbar({
  activePage,
  onNavigate,
  isDataLoaded,
  onLoadDemo,
  onResetData,
}) {
  return (
    <header className="orbit-navbar">
      <div className="orbit-nav-container">
        {/* Brand */}
        <div
          className="orbit-brand"
          onClick={() => onNavigate(1, "page-1")}
          role="button"
          tabIndex={0}
        >
          <div className="orbit-logo-icon">
            <svg viewBox="0 0 32 32" fill="none" className="orbit-svg-icon">
              <circle cx="16" cy="16" r="5" fill="#78aaff" />
              <ellipse
                cx="16"
                cy="16"
                rx="14"
                ry="6"
                stroke="rgba(120, 170, 255, 0.6)"
                strokeWidth="1.5"
                transform="rotate(-25 16 16)"
              />
              <circle cx="28" cy="11" r="2" fill="#bcd4ff" />
            </svg>
          </div>
          <div className="orbit-brand-text">
            <div className="orbit-brand-title">ORBIT</div>
            <div className="orbit-brand-sub">AI Component Screening</div>
          </div>
        </div>

        {/* Center Nav Links */}
        <nav className="orbit-nav-links">
          <button
            className={`orbit-nav-link ${activePage === 1 ? "active" : ""}`}
            onClick={() => onNavigate(1)}
          >
            Overview
          </button>
          <button
            className="orbit-nav-link"
            onClick={() => onNavigate(1, "page-1-upload")}
          >
            Data Intake
          </button>
          <button
            className={`orbit-nav-link ${activePage === 2 ? "active" : ""}`}
            onClick={() => onNavigate(2)}
          >
            Features
          </button>
          <button
            className={`orbit-nav-link ${activePage === 3 ? "active" : ""}`}
            onClick={() => onNavigate(3)}
          >
            Mission Dashboard
            {isDataLoaded && <span className="orbit-nav-badge">Active</span>}
          </button>
        </nav>

        {/* Right Actions */}
        <div className="orbit-nav-actions">
          <div className="orbit-status-pill">
            <span className={`orbit-pulse-dot ${isDataLoaded ? "dot-active" : "dot-standby"}`} />
            <span className="orbit-status-text">
              {isDataLoaded ? "Dataset Ingested" : "Awaiting Input"}
            </span>
          </div>

          {isDataLoaded && (
            <button className="orbit-btn-secondary" onClick={onResetData}>
              Clear Data
            </button>
          )}

          <button
            className={`orbit-btn-cta ${activePage === 3 ? "active-cta" : ""}`}
            onClick={() => onNavigate(activePage === 1 ? 3 : 1)}
          >
            {activePage === 1 ? "Open Dashboard →" : "← Back to Intake"}
          </button>
        </div>
      </div>
    </header>
  );
}
