import React, { useState } from "react";
import "./LandingPage.css";
import spaceBg from "../assets/space-bg.jpg";
import NetworkNodes from "./NetworkNodes";
import Navbar from "./Navbar";
import MultiFileUpload from "./MultiFileUpload";
import DriftPredictor from "./DriftPredictor";
import ComponentTable from "./ComponentTable";
import ComponentModal from "./ComponentModal";
import ReportModal from "./ReportModal";
import mockData from "../data/mockData";

function displayValue(value, suffix = "") {
  if (value === null || value === undefined || value === "") return "—";
  return `${value}${suffix}`;
}

export default function LandingPage() {
  const { hero, features, footer } = mockData;
  const [page, setPage] = useState(1);
  // Default to null so NO results or fake samples are shown without an input dataset
  const [missionData, setMissionData] = useState(null);
  const [selectedComponent, setSelectedComponent] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);

  const isDataLoaded = Boolean(missionData && missionData.id);

  function handleNavigate(targetPage, anchorId) {
    setPage(targetPage);
    if (anchorId) {
      setTimeout(() => {
        document.getElementById(anchorId)?.scrollIntoView({ behavior: "smooth" });
      }, 60);
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function handleResetData() {
    setMissionData(null);
  }

  function handleDataSubmitted(analyzedData) {
    setMissionData(analyzedData);
    setPage(3);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <>
      {/* Base Background Layers */}
      <div
        className="l0-space-bg"
        aria-hidden="true"
        style={{ backgroundImage: `url(${spaceBg})` }}
      />
      <div className="l1-bg-glass" aria-hidden="true" />
      <NetworkNodes />

      {/* Top Glassmorphic Navigation */}
      <Navbar
        activePage={page}
        onNavigate={handleNavigate}
        isDataLoaded={isDataLoaded}
        onResetData={handleResetData}
      />

      <main className="main-content-wrapper">
        {/* ============================ PAGE 1 — HERO & INTAKE ============================ */}
        {page === 1 && (
          <>
            {/* HERO SECTION */}
            <section id="page-1" className="page-section hero-section">
              <div className="l4-content">
                <div className="content-grid">
                  <div className="col-8 hero-copy">
                    <p className="eyebrow">
                      <span className="eyebrow-dot" aria-hidden="true" />
                      {hero.eyebrow}
                    </p>
                    <h1 className="hero-heading">
                      {hero.heading.map((line, i) => (
                        <React.Fragment key={line}>
                          {line}
                          {i < hero.heading.length - 1 && <br />}
                        </React.Fragment>
                      ))}
                    </h1>
                    <p className="hero-sub">{hero.subheading}</p>

                    <div className="hero-cta-row">
                      <button
                        className="glass-btn glass-btn--primary"
                        onClick={() => handleNavigate(1, "page-1-upload")}
                      >
                        {hero.ctaLabel}
                        <span className="btn-arrow" aria-hidden="true">
                          ↓
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* INTAKE / UPLOAD SECTION */}
            <section id="page-1-upload" className="page-section upload-section">
              <div className="l4-content">
                <div className="section-header-block">
                  <p className="eyebrow">Data Ingestion Engine</p>
                  <h2 className="section-heading">Multi-Channel Telemetry Intake</h2>
                  <p className="section-subtext">
                    Upload raw time-series CSVs, chamber logs, or parameter readings to run dynamic defect screening.
                  </p>
                </div>

                <MultiFileUpload
                  onSubmitted={handleDataSubmitted}
                />
              </div>
            </section>
          </>
        )}

        {/* ============================ PAGE 2 — FEATURES (OPENED ONLY VIA TOP NAV) ============================ */}
        {page === 2 && (
          <section id="features-page" className="page-section dedicated-features-section">
            <div className="l4-content">
              <div className="features-top-nav">
                <button
                  className="glass-btn back-btn"
                  onClick={() => handleNavigate(1)}
                >
                  ← Back to Main Page
                </button>
              </div>

              <div className="section-header-block">
                <p className="eyebrow">Platform Architecture</p>
                <h1 className="section-heading">Physics-Informed Anomaly Screening</h1>
                <p className="section-subtext">
                  Multi-tier reliability intelligence combining continuous sensor analysis, degradation trajectory modeling, and dynamic risk scoring.
                </p>
              </div>

              <div className="content-grid features-grid">
                {features.map((feature) => (
                  <div className="col-4" key={feature.index}>
                    <div className="glass-card feature-card">
                      <h3>
                        <span className="feature-index">{feature.index}</span>{" "}
                        {feature.title}
                      </h3>
                      <p>{feature.description}</p>
                      <ul>
                        {feature.points.map((point) => (
                          <li key={point}>{point}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ============================ PAGE 3 — MISSION DASHBOARD ============================ */}
        {page === 3 && (
          <section id="page-3" className="page-section dashboard-section">
            <div className="l4-content">
              {/* If NO dataset has been ingested, show clean empty state without sample/fake results */}
              {!isDataLoaded ? (
                <div className="glass-card empty-dashboard-card">
                  <div className="empty-dashboard-icon-wrap">
                    <svg viewBox="0 0 24 24" fill="none" className="empty-svg-icon">
                      <path
                        d="M3 3V21H21"
                        stroke="#78aaff"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M7 14L12 9L16 13L21 8"
                        stroke="#bcd4ff"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <h2 className="empty-dashboard-title">Awaiting Telemetry Ingestion</h2>
                  <p className="empty-dashboard-desc">
                    The screening dashboard requires an input telemetry dataset to compute anomaly scores, temporal parameter drift, and qualification yield.
                  </p>
                  <button
                    className="glass-btn glass-btn--primary empty-intake-btn"
                    onClick={() => handleNavigate(1, "page-1-upload")}
                  >
                    Go to Data Intake →
                  </button>
                </div>
              ) : (
                <>
                  {/* Dashboard Header Bar */}
                  <div className="dashboard-top-bar glass-card">
                    <div className="dashboard-meta-info">
                      <div className="dashboard-mission-label">
                        <span>Screening Intelligence Run</span>
                        {missionData.isBackendConnected && (
                          <span className="backend-verified-chip">
                            ⚡ Real ML Inference Active
                          </span>
                        )}
                      </div>
                      <h2 className="dashboard-batch-title">
                        {missionData.batchName || "Active Telemetry Batch"}
                      </h2>
                      <div className="dashboard-chip-row">
                        <span className="meta-chip">{missionData.standards}</span>
                        <span className="meta-chip">{missionData.chamber}</span>
                        {missionData.stressConditions && (
                          <span className="meta-chip chip-stress">
                            {missionData.stressConditions}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* KPI Metrics */}
                  <div className="glass-card overview-card">
                    <div className="overview-card-header">
                      <h3 className="overview-heading">Qualification Screening KPIs</h3>
                      <span className="overview-timestamp">
                        {missionData.isBackendConnected
                          ? `Engine: Live FastAPI Microservice (${missionData.modelsUsed || "Ensemble Voting Classifiers + Regressors"})`
                          : "Status: Evaluated via Ingested Telemetry"}
                      </span>
                    </div>
                    <div className="kpi-list">
                      {missionData.kpis.map((kpi) => (
                        <div
                          className={`kpi-item ${kpi.status || ""}`}
                          key={kpi.key}
                        >
                          <span className="kpi-value">
                            {displayValue(kpi.value)}
                          </span>
                          <span className="kpi-label">{kpi.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Findings & Action */}
                  <div className="content-grid findings-action-row">
                    <div className="col-6">
                      <div className="glass-card full-height-card">
                        <p className="eyebrow eyebrow-tight">Diagnostic Findings</p>
                        {missionData.findings && missionData.findings.length > 0 ? (
                          <ul className="finding-list">
                            {missionData.findings.map((finding, idx) => (
                              <li key={idx}>{finding}</li>
                            ))}
                          </ul>
                        ) : (
                          <p className="finding-list-empty">
                            No findings generated. Ingest screening data to compute diagnostics.
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="col-6">
                      <div className="glass-card glass-card--glow full-height-card">
                        <p className="eyebrow eyebrow-tight">Automated Disposition (CAPA)</p>
                        <p className="recommended-action-text">
                          {missionData.recommendedAction?.text ||
                            "Awaiting screening data to generate quality engineering disposition."}
                        </p>

                        <div className="risk-meta-box">
                          {/* Overall Risk Score & Direct Bar */}
                          <div className="risk-metric-group">
                            <div className="risk-metric-row">
                              <span>Overall Risk Score:</span>
                              <strong className="risk-meta-strong">
                                {displayValue(missionData.recommendedAction?.riskScore)}
                                &nbsp;/&nbsp;
                                {displayValue(
                                  missionData.recommendedAction?.riskScoreMax,
                                )} · {displayValue(missionData.recommendedAction?.riskLevel)}
                              </strong>
                            </div>
                            {missionData.recommendedAction?.riskScore !== null && (
                              <div className="risk-gauge-track">
                                <div
                                  className="risk-gauge-fill"
                                  style={{
                                    width: `${Math.min(missionData.recommendedAction.riskScore, 100)}%`,
                                    background:
                                      missionData.recommendedAction.riskScore > 60
                                        ? "#ff7a7a"
                                        : missionData.recommendedAction.riskScore > 30
                                        ? "#ffbe53"
                                        : "#7fe0a8",
                                  }}
                                />
                              </div>
                            )}
                          </div>

                          {/* Model Confidence & Direct Bar */}
                          <div className="risk-metric-group">
                            <div className="risk-metric-row">
                              <span>Model Confidence:</span>
                              <strong className="risk-meta-strong">
                                {displayValue(
                                  missionData.recommendedAction?.modelConfidence,
                                  "%",
                                )}
                              </strong>
                            </div>
                            {missionData.recommendedAction?.modelConfidence !== null && (
                              <div className="risk-gauge-track">
                                <div
                                  className="risk-gauge-fill"
                                  style={{
                                    width: `${Math.min(missionData.recommendedAction.modelConfidence, 100)}%`,
                                    background: "#78aaff",
                                  }}
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Drift Predictor and Graph */}
                  <DriftPredictor driftData={missionData.drift} />

                  {/* Component Table */}
                  <ComponentTable
                    components={missionData.components}
                    onSelectComponent={(c) => setSelectedComponent(c)}
                    standards={missionData.standards}
                    chamber={missionData.chamber}
                  />

                  {/* Bottom Action Bar: Engineering Report & New Ingestion placed at the bottom */}
                  <div className="dashboard-bottom-actions glass-card">
                    <div className="bottom-actions-info">
                      <span className="bottom-run-ref">Run ID: {missionData.id}</span>
                      <span className="bottom-standard-tag">{missionData.standards}</span>
                    </div>
                    <div className="bottom-action-buttons">
                      <button
                        className="glass-btn"
                        onClick={() => handleNavigate(1, "page-1-upload")}
                      >
                        + Ingest New Batch
                      </button>
                      <button
                        className="glass-btn glass-btn--primary"
                        onClick={() => setShowReportModal(true)}
                      >
                        📑 Export Engineering Report
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* Site Footer */}
              <footer className="glass-card site-footer">
                <div className="footer-brand">
                  <strong>{footer.label}</strong>
                </div>
                <nav className="footer-nav">
                  {footer.links.map((link) => (
                    <a
                      href={link.href}
                      key={link.label}
                      onClick={(e) => {
                        e.preventDefault();
                        const anchorId = link.href.replace("#", "");
                        if (anchorId === "page-1-insights") {
                          handleNavigate(2);
                        } else {
                          const targetP = anchorId.startsWith("page-3") ? 3 : 1;
                          handleNavigate(targetP, anchorId);
                        }
                      }}
                    >
                      {link.label}
                    </a>
                  ))}
                </nav>
              </footer>
            </div>
          </section>
        )}
      </main>

      {/* MODALS */}
      {selectedComponent && (
        <ComponentModal
          component={selectedComponent}
          onClose={() => setSelectedComponent(null)}
        />
      )}

      {showReportModal && (
        <ReportModal
          mission={missionData}
          onClose={() => setShowReportModal(false)}
        />
      )}
    </>
  );
}
