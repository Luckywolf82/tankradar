/*
IDEA INDEX — TankRadar
Canonical registry of all product ideas.
All ideas awaiting audit analysis before implementation.

Workflow: IDEA → AUDIT → BUILD

Status values:
- candidate: hypothesis, awaiting audit
- audited: analysis complete, findings documented
- approved_for_build: audit passed, ready for sprint
- deferred: temporarily postponed
- rejected: decided against, kept for traceability
- implemented: shipped to production

Last updated: 2026-03-12 (Entry 99 — Product Intelligence Audit v2 — Post Idea Expansion)
Total: 15 ideas (all scored). 5 strategic ideas promoted to audited status.
*/

export const IDEA_INDEX = {
  registry: [

    // ─────────────────────────────────────────────────────────────────
    // EXISTING IDEAS (Entry 87-A baseline)
    // ─────────────────────────────────────────────────────────────────

    {
      id: "route-fuel-intelligence",
      title: "Billigste drivstoff langs ruten",
      category: "routing",
      status: "audited",
      auditedBy: "core-value-feature-audit-2026-03-12",
      auditScore: 18,
      auditRank: 3,
      buildReadiness: "blocked",
      blockingReason: "Requires station-level route data and route calculation engine — not available today",
      summary: "Show users the cheapest fuel stations along their planned driving route, with savings estimates",
      userValue: "high",
      crowdsourcingImpact: "indirect",
      activationImpact: "medium",
      complexity: "high",
      dependencies: ["user-authenticated-routes", "geolocation", "station-level-prices", "route-optimization-library"],
      recommendedAuditTypes: ["product", "activation", "data", "performance"],
      notes: "Phase 3 feature. Data infrastructure must come first.",
    },

    {
      id: "price-drop-predictor",
      title: "Når lønner det seg å fylle?",
      category: "pricing",
      status: "audited",
      auditedBy: "core-value-feature-audit-2026-03-12",
      auditScore: 16,
      auditRank: 6,
      buildReadiness: "blocked",
      blockingReason: "Requires 6+ months station-level historical data. Currently only monthly national SSB averages available.",
      summary: "ML-based prediction of upcoming price movements to guide refueling timing",
      userValue: "high",
      crowdsourcingImpact: "none",
      activationImpact: "medium",
      complexity: "high",
      dependencies: ["historical-price-data", "statistical-modeling", "ml-training-pipeline", "national-trend-data"],
      recommendedAuditTypes: ["product", "data", "performance"],
      notes: "Phase 4 feature. Requires mature data pipeline.",
    },

    {
      id: "receipt-import",
      title: "Samtykkebasert lesing av drivstoffkjøp",
      category: "crowdsourcing",
      status: "audited",
      auditedBy: "core-value-feature-audit-2026-03-12",
      auditScore: 15,
      auditRank: 4,
      buildReadiness: "deferred",
      blockingReason: "High privacy risk, store review complexity. OCR pipeline and email OAuth not implemented.",
      summary: "Allow users to optionally import fuel prices from email receipts or photos for automatic price logging",
      userValue: "medium",
      crowdsourcingImpact: "direct",
      activationImpact: "high",
      complexity: "medium",
      dependencies: ["ocr-or-receipt-parser", "user-email-oauth", "receipt-validation", "image-upload"],
      recommendedAuditTypes: ["product", "activation", "security", "publishability"],
      notes: "Privacy-critical. Deferred pending privacy architecture review.",
    },

    {
      id: "driver-leaderboard",
      title: "Lokal bidragsrangering for drivstoffpriser",
      category: "gamification",
      status: "audited",
      auditedBy: "core-value-feature-audit-2026-03-12",
      auditScore: 19,
      auditRank: 2,
      buildReadiness: "ready",
      summary: "Show top contributors by region / city with streak counters and badges",
      userValue: "low",
      crowdsourcingImpact: "direct",
      activationImpact: "high",
      complexity: "low",
      dependencies: ["contribution-tracking", "user-profiles", "regional-segmentation"],
      recommendedAuditTypes: ["product", "activation"],
      notes: "Requires opt-in display and anonymization. Fast to build.",
    },

    {
      id: "fuel-savings-tracker",
      title: "Hvor mye har du spart?",
      category: "engagement",
      status: "audited",
      auditedBy: "core-value-feature-audit-2026-03-12",
      auditScore: 23,
      auditRank: 1,
      buildReadiness: "ready",
      summary: "Calculate estimated savings from using TankRadar prices vs. national average",
      userValue: "high",
      crowdsourcingImpact: "indirect",
      activationImpact: "high",
      complexity: "low",
      dependencies: ["user-price-history", "national-benchmark", "user-location"],
      recommendedAuditTypes: ["product", "activation"],
      notes: "Highest scored candidate. Data ready today. Recommended next build.",
    },

    {
      id: "favorite-route-alerts",
      title: "Billigste varsel på din rute",
      category: "alerts",
      status: "audited",
      auditedBy: "core-value-feature-audit-2026-03-12",
      auditScore: 16,
      auditRank: 5,
      buildReadiness: "blocked",
      blockingReason: "Requires saved-routes system and push notifications — not yet implemented.",
      summary: "Alert users when fuel is cheapest on their regular commute route",
      userValue: "medium",
      crowdsourcingImpact: "none",
      activationImpact: "medium",
      complexity: "medium",
      dependencies: ["saved-routes", "route-matching", "price-alert-engine", "push-notifications"],
      recommendedAuditTypes: ["product", "activation", "performance"],
      notes: "Phase 3 feature. Blocked by routing layer.",
    },

    // ─────────────────────────────────────────────────────────────────
    // NEW IDEAS (Entry 99 — Product Intelligence Audit, 2026-03-12)
    // ─────────────────────────────────────────────────────────────────

    {
      id: "price-war-alerts",
      title: "Bensinkrig varsler",
      category: "alerts",
      status: "audited",
      auditedBy: "product-intelligence-audit-2026-03-12",
      auditScore: 20,
      auditRank: 4,
      buildReadiness: "blocked",
      blockingReason: "Requires near-realtime station-level prices with sufficient coverage. GooglePlaces coverage currently partial.",
      summary: "Detect and alert users when competing stations trigger a local price war — cascading competitive price drops",
      userValue: "high",
      crowdsourcingImpact: "indirect",
      activationImpact: "high",
      complexity: "medium",
      dependencies: ["station-level-prices", "price-change-detection-engine", "push-notifications"],
      recommendedAuditTypes: ["product", "activation", "data", "performance"],
      notes: "Would rank #1 if data coverage were sufficient. Phase 2 — monitor data readiness.",
    },

    {
      id: "fill-historikk",
      title: "Min tankhistorikk",
      category: "engagement",
      status: "audited",
      auditedBy: "product-intelligence-audit-2026-03-12",
      auditScore: 23,
      auditRank: 3,
      buildReadiness: "ready",
      summary: "Personal refueling log showing every fill-up recorded via TankRadar — price, station, date, and cost",
      userValue: "high",
      crowdsourcingImpact: "indirect",
      activationImpact: "high",
      complexity: "low",
      dependencies: ["user-price-history", "user-reported-fuelprice-entity"],
      recommendedAuditTypes: ["product", "activation", "ui"],
      notes: "Pure UI feature — data already exists in FuelPrice entity. Zero backend. Prerequisite for bilokonomi-dashboard and tankradar-score.",
    },

    {
      id: "bilokonomi-dashboard",
      title: "Bilens økonomi-dashboard",
      category: "engagement",
      status: "audited",
      auditedBy: "product-intelligence-audit-2026-03-12",
      auditScore: 18,
      auditRank: 8,
      buildReadiness: "dependent",
      blockingReason: "fill-historikk must ship first. Requires user-vehicle-profile entity (new).",
      summary: "Personal vehicle economics dashboard: monthly fuel costs, consumption, and efficiency trends",
      userValue: "high",
      crowdsourcingImpact: "indirect",
      activationImpact: "medium",
      complexity: "medium",
      dependencies: ["fill-historikk", "user-vehicle-profile", "national-benchmark-data"],
      recommendedAuditTypes: ["product", "activation", "ui"],
      notes: "Phase 2 feature. High retention value for engaged users once fill-historikk is live.",
    },

    {
      id: "tankradar-score",
      title: "TankRadar-score",
      category: "gamification",
      status: "candidate",
      summary: "A composite personal score: savings rate × contribution quality × streak — single motivating number",
      userValue: "medium",
      crowdsourcingImpact: "direct",
      activationImpact: "high",
      complexity: "low",
      dependencies: ["contribution-tracking", "fuel-savings-tracker", "streak-counter", "national-benchmark-data"],
      recommendedAuditTypes: ["product", "activation", "ui"],
      notes: "Best built after fuel-savings-tracker and gamification-system ship.",
    },

    {
      id: "gamification-system",
      title: "Gamification 2.0 — Badges og milepæler",
      category: "gamification",
      status: "candidate",
      summary: "Full gamification layer: persistent badges, milestone progress countdowns, achievement history",
      userValue: "medium",
      crowdsourcingImpact: "direct",
      activationImpact: "high",
      complexity: "low",
      dependencies: ["contribution-tracking", "streak-counter", "user-price-history"],
      recommendedAuditTypes: ["product", "activation", "ui"],
      notes: "Directly addresses Entry 95 remaining gaps. Low complexity, high engagement impact.",
    },

    {
      id: "fuel-price-heatmap",
      title: "Drivstoffpris-kart",
      category: "maps",
      status: "candidate",
      summary: "Interactive map of Norway showing fuel prices by region with color-coded heat zones and station pins",
      userValue: "medium",
      crowdsourcingImpact: "indirect",
      activationImpact: "medium",
      complexity: "medium",
      dependencies: ["station-coordinates", "regional-fuel-benchmarks", "react-leaflet"],
      recommendedAuditTypes: ["product", "ui", "performance"],
      notes: "Regional heatmap MVP can be built with existing RegionalFuelBenchmark data. react-leaflet already installed.",
    },

    {
      id: "national-fuel-barometer",
      title: "Nasjonal drivstoffbarometer",
      category: "pricing",
      status: "candidate",
      summary: "A single-glance barometer: are today's prices low, normal, or high vs. 30-day historical average?",
      userValue: "high",
      crowdsourcingImpact: "none",
      activationImpact: "high",
      complexity: "low",
      dependencies: ["national-benchmark-data", "ssb-historical-data"],
      recommendedAuditTypes: ["product", "activation", "ui", "data"],
      notes: "No new data sources required. Uses existing NationalFuelBenchmark + SSBData. Extremely low effort, high dashboard impact.",
    },

    {
      id: "fleet-mode",
      title: "Flåtemodus for bedrifter",
      category: "other",
      status: "candidate",
      summary: "Multi-vehicle management for SMEs: per-vehicle cost tracking, expense reports, fleet dashboard",
      userValue: "high",
      crowdsourcingImpact: "indirect",
      activationImpact: "low",
      complexity: "high",
      dependencies: ["multi-vehicle-profiles", "organization-account-model", "premium-tier"],
      recommendedAuditTypes: ["product", "security", "publishability"],
      notes: "Phase 4–5 feature. Requires org account model. Do not build before consumer product is mature.",
    },

    {
      id: "fuel-data-api",
      title: "Drivstoffdata-API for utviklere",
      category: "other",
      status: "candidate",
      summary: "Commercial or open-access API exposing Norwegian fuel price data to third-party developers",
      userValue: "low",
      crowdsourcingImpact: "none",
      activationImpact: "low",
      complexity: "medium",
      dependencies: ["stable-data-pipeline", "api-key-management", "rate-limiting", "data-quality-maturity"],
      recommendedAuditTypes: ["product", "security", "publishability"],
      notes: "Phase 5 monetization feature. Requires data pipeline maturity and legal review.",
    },
  ],

  summary: {
    total: 15,
    by_status: {
      candidate: 9,
      audited: 6,
      approved_for_build: 0,
      deferred: 1,
      rejected: 0,
      implemented: 0,
    },
    by_category: {
      routing: 1,
      pricing: 2,
      crowdsourcing: 1,
      engagement: 3,
      alerts: 2,
      gamification: 3,
      maps: 1,
      other: 2,
    },
    build_ready: ["national-fuel-barometer", "fill-historikk", "fuel-savings-tracker", "gamification-system", "driver-leaderboard"],
    blocked: ["route-fuel-intelligence", "favorite-route-alerts", "price-drop-predictor", "price-war-alerts"],
    dependent: ["bilokonomi-dashboard", "tankradar-score"],
    deferred: ["receipt-import"],
    phase_map: {
      phase1: ["fuel-savings-tracker", "fill-historikk", "national-fuel-barometer", "gamification-system", "driver-leaderboard"],
      phase2: ["bilokonomi-dashboard", "tankradar-score", "fuel-price-heatmap", "price-war-alerts"],
      phase3: ["route-fuel-intelligence", "favorite-route-alerts"],
      phase4: ["price-drop-predictor", "fleet-mode"],
      phase5: ["fuel-data-api", "receipt-import"],
    },
  },

  workflow_guidance: {
    nextSteps: [
      "Each candidate idea awaits audit analysis before build consideration",
      "Recommended audits are linked per idea",
      "As audits complete, status → audited",
      "Audit approval → status → approved_for_build",
      "Build → status → implemented",
      "If audit recommends against: status → rejected, move to /rejected/",
    ],
    audit_system_integration: [
      "Ideas use same audit categories as production code",
      "IDEA_INDEX references AUDIT_INDEX categories",
      "Audits can be found in src/components/audits/",
      "Each idea's recommendedAuditTypes guides which audits to create",
    ],
  },

  related_files: {
    ideaSystemReadme: "src/components/ideas/README.jsx",
    auditRegistry: "src/components/audits/AUDIT_INDEX.jsx",
    rejectedIdeas: "src/components/ideas/rejected/README.jsx",
    productIntelligenceAudit: "src/components/audits/product/product-intelligence-audit-2026-03-12.jsx",
  },
};

export default IDEA_INDEX;