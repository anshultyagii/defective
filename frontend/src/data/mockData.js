/**
 * mockData.js
 * ----------------------------------------------------------------------------
 * High-fidelity burn-in screening dataset for semiconductor components.
 * Models real-world AEC-Q101 / MIL-STD-883 qualification standards.
 * ----------------------------------------------------------------------------
 */

export const emptyMission = {
  id: null,
  label: "Screening Intelligence — Mission: Standby",
  batchName: "No Active Batch Ingested",
  standards: "AEC-Q100 / MIL-STD-883 Ready",
  chamber: "Chamber Standby",
  durationHours: 0,
  kpis: [
    { key: "analyzed", value: null, label: "Analyzed" },
    { key: "healthy", value: null, label: "Healthy", status: "status-healthy" },
    { key: "atRisk", value: null, label: "At Risk", status: "status-atrisk" },
    { key: "critical", value: null, label: "Critical", status: "status-critical" },
    { key: "anomalies", value: null, label: "Anomalies" },
  ],
  findings: [],
  recommendedAction: {
    text: null,
    riskScore: null,
    riskScoreMax: 100,
    riskLevel: null,
    modelConfidence: null,
  },
  components: [],
  trends: null,
};

export const sampleBurnInData = {
  id: "BATCH-SIC-2024-X8",
  label: "Screening Intelligence — Batch: SiC-1200V Automotive MOSFETs",
  batchName: "Lot #SIC-1200-B24 (HTRB Qualification)",
  standards: "AEC-Q101 Rev E / JEDEC JESD22-A108",
  chamber: "Chamber 04 — Thermal Stress Zone B",
  durationHours: 168,
  stressConditions: "150°C Junction Temp | 960V Vds Reverse Bias | 168 Hours",
  kpis: [
    { key: "analyzed", value: 1280, label: "Analyzed" },
    { key: "healthy", value: 1164, label: "Healthy (Pass)", status: "status-healthy" },
    { key: "atRisk", value: 82, label: "At Risk", status: "status-atrisk" },
    { key: "critical", value: 34, label: "Critical Fail", status: "status-critical" },
    { key: "anomalies", value: 116, label: "Anomalies Flagged" },
  ],
  findings: [
    "34 units (2.66%) exhibited catastrophic gate oxide dielectric degradation within the first 48 hours of 150°C thermal soak.",
    "Isolated sub-cluster in Wafer Lot B-12 showed abnormal drain-source leakage current drift (>140 nA vs baseline <5 nA), indicating passivation layer flaws.",
    "Thermal resistance (Rth_jc) elevated by 21% in high-risk samples, directly correlating with acoustic microscopy die-attach voiding.",
    "Dynamic threshold voltage (ΔVth) shift exceeded standard ±0.4V envelope under high-temperature reverse bias for 18 devices in chamber quadrant 3.",
    "Overall batch yield is 90.94%; remaining pass units exhibit standard Gaussian parameter distribution within 6-sigma tolerances."
  ],
  recommendedAction: {
    text: "Quarantine sub-lot B-12 immediately for destructive physical analysis (DPA) and focused ion beam (FIB) gate inspection. Authorize sub-lots A-04 through A-11 with certified 99.92% MTBF rating for mission-critical electric powertrain deployment.",
    riskScore: 32,
    riskScoreMax: 100,
    riskLevel: "Moderate (Sub-Lot Isolated)",
    modelConfidence: 98.4,
  },
  components: [
    {
      id: "SIC-1200-001",
      lot: "Lot A-04",
      package: "TO-247-4L",
      tempC: 124.2,
      baselineR: 1.004,
      currentR: 1.008,
      driftAbs: 0.004,
      driftPct: 0.40,
      forecast168h: 1.012,
      leakageCurrentNA: 3.2,
      voltageDriftV: 0.04,
      onResistanceMOhm: 28.1,
      anomalyScore: 2.1,
      status: "Pass",
      diagnosis: "Nominal gate leakage and steady thermal dissipation throughout 168h soak.",
      remediation: "Passed screening. Cleared for packaging integration."
    },
    {
      id: "SIC-1200-019",
      lot: "Lot A-04",
      package: "TO-247-4L",
      tempC: 126.8,
      baselineR: 1.032,
      currentR: 1.038,
      driftAbs: 0.006,
      driftPct: 0.58,
      forecast168h: 1.042,
      leakageCurrentNA: 4.1,
      voltageDriftV: 0.06,
      onResistanceMOhm: 28.9,
      anomalyScore: 4.5,
      status: "Pass",
      diagnosis: "Stable I-V curves. Threshold voltage drift well within 50mV tolerance.",
      remediation: "Passed screening. Approved for flight-grade assembly."
    },
    {
      id: "SIC-1200-042",
      lot: "Lot B-12",
      package: "TO-247-4L",
      tempC: 158.4,
      baselineR: 1.650,
      currentR: 1.842,
      driftAbs: 0.192,
      driftPct: 11.64,
      forecast168h: 2.150,
      leakageCurrentNA: 184.2,
      voltageDriftV: 0.92,
      onResistanceMOhm: 46.2,
      anomalyScore: 94.8,
      status: "Critical",
      diagnosis: "Gate oxide dielectric thinning detected at t=36h. Catastrophic leakage thermal runaway precursor.",
      remediation: "Immediate rejection. Quarantine for C-SAM acoustic scan and FIB analysis."
    },
    {
      id: "SIC-1200-077",
      lot: "Lot B-12",
      package: "TO-247-4L",
      tempC: 142.1,
      baselineR: 1.300,
      currentR: 1.348,
      driftAbs: 0.048,
      driftPct: 3.69,
      forecast168h: 1.412,
      leakageCurrentNA: 46.8,
      voltageDriftV: 0.48,
      onResistanceMOhm: 36.4,
      anomalyScore: 68.2,
      status: "At Risk",
      diagnosis: "Accelerated threshold voltage drift under reverse bias soak. Trapped charges in passivation interface.",
      remediation: "Downgrade from Automotive Grade-0 to non-critical commercial tier or re-test."
    },
    {
      id: "SIC-1200-095",
      lot: "Lot A-07",
      package: "TO-247-4L",
      tempC: 125.0,
      baselineR: 0.993,
      currentR: 0.996,
      driftAbs: 0.003,
      driftPct: 0.30,
      forecast168h: 1.001,
      leakageCurrentNA: 3.8,
      voltageDriftV: 0.03,
      onResistanceMOhm: 27.8,
      anomalyScore: 3.2,
      status: "Pass",
      diagnosis: "Excellent thermal dissipation. Zero anomalous current pulses recorded.",
      remediation: "Passed screening. Certified Grade-0."
    },
    {
      id: "SIC-1200-108",
      lot: "Lot B-12",
      package: "TO-247-4L",
      tempC: 161.7,
      baselineR: 1.857,
      currentR: 2.150,
      driftAbs: 0.293,
      driftPct: 15.78,
      forecast168h: 2.480,
      leakageCurrentNA: 215.0,
      voltageDriftV: 1.15,
      onResistanceMOhm: 52.0,
      anomalyScore: 98.6,
      status: "Critical",
      diagnosis: "Thermal runaway caused by 32% die attach voiding. Solder fatigue micro-cracking.",
      remediation: "Immediate rejection. Flag Lot B-12 packaging line for die-attach inspection."
    },
    {
      id: "SIC-1200-144",
      lot: "Lot B-12",
      package: "TO-247-4L",
      tempC: 139.5,
      baselineR: 1.221,
      currentR: 1.260,
      driftAbs: 0.039,
      driftPct: 3.19,
      forecast168h: 1.315,
      leakageCurrentNA: 38.5,
      voltageDriftV: 0.39,
      onResistanceMOhm: 34.2,
      anomalyScore: 54.7,
      status: "At Risk",
      diagnosis: "Sub-threshold swing deterioration after 96 hours of high-temperature stress.",
      remediation: "Requires extended 96h burn-in stress confirmation."
    },
    {
      id: "SIC-1200-189",
      lot: "Lot A-09",
      package: "TO-247-4L",
      tempC: 123.4,
      baselineR: 0.982,
      currentR: 0.984,
      driftAbs: 0.002,
      driftPct: 0.20,
      forecast168h: 0.989,
      leakageCurrentNA: 2.9,
      voltageDriftV: 0.02,
      onResistanceMOhm: 27.5,
      anomalyScore: 1.8,
      status: "Pass",
      diagnosis: "Pristine telemetry profile. Zero variance across all 8 measurement cycles.",
      remediation: "Passed screening. Highest reliability tier."
    },
    {
      id: "SIC-1200-210",
      lot: "Lot B-12",
      package: "TO-247-4L",
      tempC: 141.2,
      baselineR: 1.279,
      currentR: 1.323,
      driftAbs: 0.044,
      driftPct: 3.44,
      forecast168h: 1.385,
      leakageCurrentNA: 42.1,
      voltageDriftV: 0.44,
      onResistanceMOhm: 35.8,
      anomalyScore: 61.3,
      status: "At Risk",
      diagnosis: "Intermittent drain leakage spikes observed during chamber thermal cycling.",
      remediation: "Quarantine for junction breakdown verification."
    },
    {
      id: "SIC-1200-245",
      lot: "Lot B-12",
      package: "TO-247-4L",
      tempC: 164.2,
      baselineR: 2.086,
      currentR: 2.450,
      driftAbs: 0.364,
      driftPct: 17.45,
      forecast168h: 2.920,
      leakageCurrentNA: 240.5,
      voltageDriftV: 1.28,
      onResistanceMOhm: 58.4,
      anomalyScore: 99.2,
      status: "Critical",
      diagnosis: "Severe drain-source breakdown imminent. High-temperature leakage 48x above nominal limit.",
      remediation: "Immediate scrap. Send unit to materials lab for cross-sectional SEM."
    },
    {
      id: "SIC-1200-302",
      lot: "Lot A-11",
      package: "TO-247-4L",
      tempC: 127.3,
      baselineR: 1.021,
      currentR: 1.026,
      driftAbs: 0.005,
      driftPct: 0.49,
      forecast168h: 1.034,
      leakageCurrentNA: 4.4,
      voltageDriftV: 0.05,
      onResistanceMOhm: 28.6,
      anomalyScore: 5.1,
      status: "Pass",
      diagnosis: "Operating within standard statistical limits. Vth shift < 40mV.",
      remediation: "Passed screening."
    },
    {
      id: "SIC-1200-355",
      lot: "Lot A-11",
      package: "TO-247-4L",
      tempC: 125.6,
      baselineR: 1.000,
      currentR: 1.004,
      driftAbs: 0.004,
      driftPct: 0.40,
      forecast168h: 1.009,
      leakageCurrentNA: 3.5,
      voltageDriftV: 0.04,
      onResistanceMOhm: 28.0,
      anomalyScore: 2.8,
      status: "Pass",
      diagnosis: "Clean telemetry signal. Normal Arrhenius thermal response.",
      remediation: "Passed screening."
    }
  ],
  trends: {
    timeHours: [0, 24, 48, 72, 96, 120, 144, 168],
    thresholds: {
      maxLeakageNA: 50,
      maxTempC: 150,
      maxVoltageDriftV: 0.5
    },
    leakageNA: {
      nominal: [2.1, 2.4, 2.6, 2.9, 3.2, 3.5, 3.8, 4.1],
      atRisk: [3.5, 8.2, 18.4, 32.1, 48.6, 62.0, 78.4, 94.2],
      critical: [4.2, 19.5, 58.2, 112.0, 168.4, 215.0, 248.1, 280.0]
    },
    temperatureC: {
      nominal: [25, 125, 126, 125, 126, 127, 126, 25],
      atRisk: [25, 138, 140, 141, 142, 143, 144, 25],
      critical: [25, 152, 156, 160, 162, 164, 166, 25]
    },
    voltageDriftV: {
      nominal: [0.00, 0.01, 0.02, 0.03, 0.04, 0.04, 0.05, 0.05],
      atRisk: [0.00, 0.08, 0.16, 0.25, 0.34, 0.42, 0.48, 0.53],
      critical: [0.00, 0.22, 0.49, 0.78, 0.95, 1.10, 1.22, 1.34]
    }
  }
};

const mockData = {
  hero: {
    eyebrow: "Intelligent Burn-In Analysis & Defect Prevention",
    heading: ["AI-Driven Component", "Screening"],
    subheading:
      "A mission-control system for intelligent electronic-component screening — transforming raw burn-in telemetry into engineering-grade risk intelligence.",
    ctaLabel: "Ingest Screening Data",
    secondaryCtaLabel: "View Mission Dashboard",
    badges: [
      { icon: "⚡", label: "High-Voltage Stress", value: "1,200V" },
      { icon: "🌡️", label: "Thermal Chamber", value: "150°C" },
      { icon: "🎯", label: "Leakage Precision", value: "0.01 pA" },
      { icon: "🛡️", label: "Standards", value: "AEC-Q100 / MIL-STD" }
    ]
  },

  features: [
    {
      index: "01",
      title: "Data Ingestion",
      description:
        "Bring your own screening data in whatever format it already lives in.",
      points: ["CSV / JSON / Excel", "Sensor stream", "Manual parameters"],
    },
    {
      index: "02",
      title: "Anomaly Detection",
      description:
        "Every component tracked across the parameters that matter during burn-in.",
      points: [
        "Temperature & voltage",
        "Current & leakage current",
        "Resistance & stress duration",
      ],
    },
    {
      index: "03",
      title: "Risk Scoring",
      description:
        "An overall screening risk score, backed by model confidence, on every batch.",
      points: [
        "Failure probability estimation",
        "Component-level risk ranking",
        "Confidence-weighted output",
      ],
    },
    {
      index: "04",
      title: "AI Screening Copilot",
      description:
        "Ask the analysis direct questions instead of digging through raw tables.",
      points: [
        '"Why was this flagged high risk?"',
        '"Which components need inspection first?"',
      ],
    },
    {
      index: "05",
      title: "Parameter Trends",
      description:
        "Watch how each measurement evolves across the full burn-in window.",
      points: ["Threshold & anomaly markers", "Switchable parameter views"],
    },
    {
      index: "06",
      title: "Engineering Report",
      description:
        "Model conclusions written the way an engineer would read them.",
      points: ["Key findings", "Recommended action"],
    },
  ],

  mission: emptyMission,

  footer: {
    label: "ORBIT — AI-Driven Component Screening",
    links: [
      { label: "Home", href: "#page-1" },
      { label: "Upload Intake", href: "#page-1-upload" },
      { label: "Architecture", href: "#page-1-insights" },
      { label: "Mission Dashboard", href: "#page-3" },
    ],
  },
};

export default mockData;
