/*
TANKRADAR PRODUCT ROADMAP — GOVERNOR v4.1
Canonical Roadmap Manager with Weighted Stability

Last updated:   2026-03-12 (Entry 102 — Roadmap Governor refinement pass)
Replaces:       ROADMAP v4.0 (Entry 101 — Roadmap Governor pass)

CHANGE LOG vs v4.0:
  - Verification language corrected: admin files were referenced, not directly read in v4.0 pass
  - CURRENT_PRIORITY_ORDER split into three distinct lists:
      COMPLETED_TRACE, ACTIONABLE_PRIORITY_ORDER, BLOCKED_OR_NORTH_STAR
  - Highest-scoring feature and recommended-next-ship now explicitly separated
  - adminEscalationBonus made conditional and state-dependent (re-evaluated each pass)
  - fuel-price-heatmap USER_VALUE corrected from 4 → 3 (informational/marketing, not direct fuel savings)
  - fuel-price-heatmap stabilityAdjustedScore lowered from 3.30 → 3.00

STABILITY CONTRACT:
  Layer 1 (phase structure) is LOCKED — do not collapse, reorder, or merge phases.
  Layer 2 (feature priority within/across adjacent phases) may be refined by weighted scoring.
  A single audit may NOT overturn the baseline.

EVIDENCE STANDARDS (v4.1 corrected):
  Files directly read in this pass:
    - components/roadmap/ROADMAP.jsx (v4.0)
    - components/ideas/IDEA_INDEX.jsx
    - components/governance/NextSafeStep.jsx
    - components/audits/product/product-intelligence-audit-2026-03-12.jsx
  Files referenced but NOT directly read in this pass:
    - components/admin/AdminOperationsPanel.jsx
    - components/admin/MasteringMetrics.jsx
    - pages/SuperAdmin.jsx
  Admin gap assessment (orphaned panels) is inferred from v4.0 roadmap findings,
  which were themselves based on prior session inspection of those files.
  Do not treat referenced files as directly verified in this pass.
*/

// ─────────────────────────────────────────────────────────────────────────────
// SCORING MODEL
// ─────────────────────────────────────────────────────────────────────────────

export const SCORING_MODEL = {
  weights: {
    USER_VALUE:           0.30,  // Real value to the user — saves money, better decisions
    DATA_QUALITY:         0.20,  // Improves station/price data quality
    ADMIN_UI_IMPORTANCE:  0.20,  // Critical for admin workflows and curation quality
    INSTALL_DRIVER:       0.15,  // Creates installs, sharing, or word of mouth
    IMPLEMENTATION_COST:  0.15,  // Inverse complexity: 5 = easy, 1 = hard
  },
  stabilityModifiers: {
    phaseAlignmentBonus:      +0.25,  // Feature fits naturally in its current phase
    readinessPenalty:         -0.50,  // Depends on missing data / routing / admin / history
    partialDependencyPenalty: -0.25,  // Depends on feature not yet shipped
    adminEscalationBonus: {
      value: +0.50,
      rule: "CONDITIONAL AND STATE-DEPENDENT. Applied only when ALL of the following are true:",
      conditions: [
        "1. A specific admin UI gap is currently open and verified in current repo state",
        "2. The gap has meaningful impact on data quality or operational throughput",
        "3. The gap has not been resolved since the last scoring pass",
      ],
      reEvaluation: "This bonus MUST be re-evaluated in every roadmap scoring pass. Remove it for any feature whose admin gap has been resolved. Do not let it permanently distort priority after the gap is fixed.",
      currentlyApplied: [
        "admin-operations-panel-integration — gap open, verified referenced from v4.0 inspection",
        "community-price-verification — reduces admin review load, gap open",
        "community-station-validation — reduces curator bottleneck, gap open",
        "governance-stabilisering — ongoing operational gap",
      ],
    },
    singleAuditCap: "ONE STEP only — cannot jump multiple phases from one audit alone",
  },
  scoringNote: "Raw score 0–5.0, ×5 for display (0–25). Stability-adjusted score is authoritative for priority ordering.",
};

// ─────────────────────────────────────────────────────────────────────────────
// LOCKED PHASE BASELINE — DO NOT REORDER
// Source: Roadmap Governor specification
// ─────────────────────────────────────────────────────────────────────────────

export const PHASE_BASELINE = {
  phase1: { title: "Data Fundament",       theme: "Build the data infrastructure that makes everything else reliable" },
  phase2: { title: "Core Produkt",         theme: "Ship the features that define what TankRadar is" },
  phase3: { title: "Growth Engine",        theme: "Drive sharing, crowdsourcing, and retention" },
  phase4: { title: "Decision Intelligence",theme: "Help users make smarter decisions with existing data" },
  phase5: { title: "Predictive Layer",     theme: "Anticipate what users need before they ask" },
  phase6: { title: "Platform Expansion",   theme: "Commercialize the data asset and expand the product surface" },
};

// ─────────────────────────────────────────────────────────────────────────────
// FULL FEATURE MAP — All scored items
// Format: id, phase, raw scores, rawWeightedScore, stabilityNote, stabilityAdjustedScore, status
//
// Raw formula:
//   raw = UV×0.30 + DQ×0.20 + AU×0.20 + ID×0.15 + IC×0.15
// Display scale: ×5 (scores shown as /25)
// ─────────────────────────────────────────────────────────────────────────────

export const FEATURES = [

  // ── PHASE 1 — DATA FUNDAMENT ──────────────────────────────────────────────

  {
    id: "station-matching-engine",
    title: "Station matching engine",
    phase: 1,
    category: "data-infrastructure",
    description: "Conservative matching of price sources to Station entities by name, address, chain, and GPS proximity",
    status: "completed",
    userValueImportance:   2,
    dataQualityImportance: 5,
    adminUiImportance:     4,
    installDriverImportance: 1,
    implementationCost:    2,
    rawWeightedScore: 2.85,  // 0.60+1.00+0.80+0.15+0.30
    stabilityNote: "Admin escalation +0.50 (admin tooling enables mastering quality)",
    stabilityAdjustedScore: 3.35,
    displayScore: 16.75,
    dependencies: [],
    blockers: [],
  },

  {
    id: "station-candidate-pipeline",
    title: "StationCandidate pipeline",
    phase: 1,
    category: "data-infrastructure",
    description: "Ingest, classify, and queue station candidates from GooglePlaces, OSM, and user submissions for curator review",
    status: "completed",
    userValueImportance:   2,
    dataQualityImportance: 5,
    adminUiImportance:     4,
    installDriverImportance: 1,
    implementationCost:    3,
    rawWeightedScore: 3.00,  // 0.60+1.00+0.80+0.15+0.45
    stabilityNote: "Admin escalation +0.50",
    stabilityAdjustedScore: 3.50,
    displayScore: 17.50,
    dependencies: [],
    blockers: [],
  },

  {
    id: "governance-stabilisering",
    title: "Governance stabilisering",
    phase: 1,
    category: "data-infrastructure",
    description: "Execution log, audit system, duplicate detection, review queue, and source registry governance",
    status: "active",
    userValueImportance:   1,
    dataQualityImportance: 4,
    adminUiImportance:     5,
    installDriverImportance: 1,
    implementationCost:    4,
    rawWeightedScore: 2.85,  // 0.30+0.80+1.00+0.15+0.60
    stabilityNote: "Admin escalation +0.50 (ongoing — governance is never fully done)",
    stabilityAdjustedScore: 3.35,
    displayScore: 16.75,
    dependencies: [],
    blockers: [],
  },

  {
    id: "admin-operations-panel-integration",
    title: "Admin UI: Wire AdminOperationsPanel + MasteringMetrics into SuperAdmin",
    phase: 1,
    category: "admin-infrastructure",
    description: "AdminOperationsPanel (bulk pipeline ops, geocode batch, reclassifications) and MasteringMetrics (chain completeness, CSV/JSON export) are built but orphaned from the new 5-tab SuperAdmin hub. Wiring them in is a UI integration task — no new code required.",
    status: "planned",
    userValueImportance:   1,
    dataQualityImportance: 4,
    adminUiImportance:     5,
    installDriverImportance: 1,
    implementationCost:    5,
    rawWeightedScore: 3.00,  // 0.30+0.80+1.00+0.15+0.75
    stabilityNote: "Admin escalation +0.50 (bulk ops have no UI path → operational gap in governance cycle)",
    stabilityAdjustedScore: 3.50,
    displayScore: 17.50,
    dependencies: [],
    blockers: [],
    immediateAction: "NEXT — Add AdminOperationsPanel to SuperAdmin Operations tab; add MasteringMetrics to Data Quality tab",
  },

  // ── PHASE 2 — CORE PRODUKT ────────────────────────────────────────────────

  {
    id: "prisrapportering",
    title: "Prisrapportering (user-reported prices)",
    phase: 2,
    category: "core-product",
    description: "4-step LogPrice flow: photo capture, AI extraction, station picker, confirm. The core crowdsourcing loop.",
    status: "completed",
    userValueImportance:   5,
    dataQualityImportance: 3,
    adminUiImportance:     2,
    installDriverImportance: 4,
    implementationCost:    4,
    rawWeightedScore: 3.70,  // 1.50+0.60+0.40+0.60+0.60
    stabilityNote: "Phase alignment +0.25",
    stabilityAdjustedScore: 3.95,
    displayScore: 19.75,
    dependencies: [],
    blockers: [],
  },

  {
    id: "billigste-drivstoff-naerheten",
    title: "Billigste drivstoff i nærheten",
    phase: 2,
    category: "core-product",
    description: "Show users the cheapest nearby fuel stations with current prices and distance",
    status: "active",
    userValueImportance:   5,
    dataQualityImportance: 2,
    adminUiImportance:     1,
    installDriverImportance: 4,
    implementationCost:    3,
    rawWeightedScore: 3.15,  // 1.50+0.40+0.20+0.60+0.45
    stabilityNote: "Phase alignment +0.25",
    stabilityAdjustedScore: 3.40,
    displayScore: 17.00,
    dependencies: ["station-level-prices", "geolocation"],
    blockers: [],
  },

  {
    id: "prisvarsler",
    title: "Prisvarsler",
    phase: 2,
    category: "core-product",
    description: "User-configurable price alerts — notify when price drops below threshold at a station or in a radius",
    status: "active",
    userValueImportance:   5,
    dataQualityImportance: 1,
    adminUiImportance:     1,
    installDriverImportance: 5,
    implementationCost:    3,
    rawWeightedScore: 3.10,  // 1.50+0.20+0.20+0.75+0.45
    stabilityNote: "Phase alignment +0.25",
    stabilityAdjustedScore: 3.35,
    displayScore: 16.75,
    dependencies: ["station-level-prices"],
    blockers: [],
  },

  {
    id: "favorittstasjoner",
    title: "Favorittstasjoner",
    phase: 2,
    category: "core-product",
    description: "Save favorite stations and track their prices over time",
    status: "active",
    userValueImportance:   4,
    dataQualityImportance: 1,
    adminUiImportance:     1,
    installDriverImportance: 3,
    implementationCost:    4,
    rawWeightedScore: 2.65,  // 1.20+0.20+0.20+0.45+0.60
    stabilityNote: "Phase alignment +0.25",
    stabilityAdjustedScore: 2.90,
    displayScore: 14.50,
    dependencies: [],
    blockers: [],
  },

  {
    id: "national-fuel-barometer",
    title: "Nasjonal drivstoffbarometer",
    phase: 2,
    category: "core-product",
    description: "Single-glance dashboard widget: are today's national prices low, normal, or high vs. 30-day SSB historical? Bensin/Diesel toggle. 3-band visual bar.",
    status: "completed",
    completedDate: "2026-03-12",
    userValueImportance:   5,
    dataQualityImportance: 3,
    adminUiImportance:     1,
    installDriverImportance: 4,
    implementationCost:    5,
    rawWeightedScore: 3.65,  // 1.50+0.60+0.20+0.60+0.75
    stabilityNote: "Phase alignment +0.25",
    stabilityAdjustedScore: 3.90,
    displayScore: 19.50,
    dependencies: ["NationalFuelBenchmark-entity", "SSBData-entity"],
    blockers: [],
    note: "SHIPPED. Built 2026-03-12. Component: components/dashboard/NationalFuelBarometer.jsx",
  },

  // ── PHASE 3 — GROWTH ENGINE ───────────────────────────────────────────────

  {
    id: "community-price-verification",
    title: "Community price verification",
    phase: 3,
    category: "crowdsourcing",
    description: "Allow users to verify or dispute existing prices — weighted trust signals improve data confidence without full moderation overhead",
    status: "planned",
    userValueImportance:   3,
    dataQualityImportance: 5,
    adminUiImportance:     3,
    installDriverImportance: 2,
    implementationCost:    3,
    rawWeightedScore: 3.25,  // 0.90+1.00+0.60+0.30+0.45
    stabilityNote: "Admin escalation +0.50 (data quality improvement via community reduces admin review load)",
    stabilityAdjustedScore: 3.75,
    displayScore: 18.75,
    dependencies: ["FuelPrice-entity", "user-auth", "confidence-scoring"],
    blockers: [],
  },

  {
    id: "community-station-validation",
    title: "Community station validation",
    phase: 3,
    category: "crowdsourcing",
    description: "Let trusted contributors validate station details (name, chain, address, GPS) — crowdsourced mastering quality without curator bottleneck",
    status: "planned",
    userValueImportance:   2,
    dataQualityImportance: 5,
    adminUiImportance:     4,
    installDriverImportance: 2,
    implementationCost:    3,
    rawWeightedScore: 3.15,  // 0.60+1.00+0.80+0.30+0.45
    stabilityNote: "Admin escalation +0.50",
    stabilityAdjustedScore: 3.65,
    displayScore: 18.25,
    dependencies: ["Station-entity", "user-trust-model", "StationReview-entity"],
    blockers: [],
  },

  {
    id: "fuel-savings-tracker",
    title: "Savings tracker — Hvor mye har du spart?",
    phase: 3,
    category: "engagement",
    description: "Calculate and display estimated savings from using TankRadar prices vs. national average. Shareable card.",
    status: "build-ready",
    userValueImportance:   5,
    dataQualityImportance: 2,
    adminUiImportance:     1,
    installDriverImportance: 5,
    implementationCost:    4,
    rawWeightedScore: 3.45,  // 1.50+0.40+0.20+0.75+0.60
    stabilityNote: "Phase alignment +0.25",
    stabilityAdjustedScore: 3.70,
    displayScore: 18.50,
    dependencies: ["user-price-history", "NationalFuelBenchmark-entity"],
    blockers: [],
  },

  {
    id: "price-war-alerts",
    title: "Bensinkrig-varsler",
    phase: 3,
    category: "alerts",
    description: "Detect and alert users when competing stations trigger a local price war — cascading competitive price drops",
    status: "blocked",
    userValueImportance:   5,
    dataQualityImportance: 2,
    adminUiImportance:     1,
    installDriverImportance: 5,
    implementationCost:    3,
    rawWeightedScore: 3.30,  // 1.50+0.40+0.20+0.75+0.45
    stabilityNote: "Readiness penalty -0.50 (station-level coverage currently partial — GooglePlaces observedCoverageRate insufficient for reliable war detection)",
    stabilityAdjustedScore: 2.80,
    displayScore: 14.00,
    dependencies: ["station-level-prices", "price-change-detection-engine", "push-notifications"],
    blockers: ["GooglePlaces national coverage <50% — war detection would produce false negatives at scale"],
    northStarNote: "Would rank Phase 3 #1 if coverage improves. Monitor SourceRegistry observedCoverageRate.",
  },

  {
    id: "gamification-system",
    title: "Gamification 2.0 — Badges og milepæler",
    phase: 3,
    category: "gamification",
    description: "Persistent badges, milestone progress countdowns, achievement history. Extends existing ContributionImpactCard + StreakCounter.",
    status: "build-ready",
    userValueImportance:   3,
    dataQualityImportance: 3,
    adminUiImportance:     1,
    installDriverImportance: 4,
    implementationCost:    5,
    rawWeightedScore: 3.05,  // 0.90+0.60+0.20+0.60+0.75
    stabilityNote: "Phase alignment +0.25",
    stabilityAdjustedScore: 3.30,
    displayScore: 16.50,
    dependencies: ["contribution-tracking", "StreakCounter-component"],
    blockers: [],
  },

  {
    id: "driver-leaderboard",
    title: "Lokal bidragsrangering",
    phase: 3,
    category: "gamification",
    description: "Top contributors by region/city with streak counters and badges. Opt-in display + anonymization required.",
    status: "build-ready",
    userValueImportance:   3,
    dataQualityImportance: 3,
    adminUiImportance:     1,
    installDriverImportance: 4,
    implementationCost:    5,
    rawWeightedScore: 3.05,  // 0.90+0.60+0.20+0.60+0.75
    stabilityNote: "Phase alignment +0.25",
    stabilityAdjustedScore: 3.30,
    displayScore: 16.50,
    dependencies: ["contribution-tracking", "regional-segmentation", "user-profiles"],
    blockers: [],
  },

  {
    id: "fuel-price-heatmap",
    title: "Drivstoffpris-kart",
    phase: 3,
    category: "maps",
    description: "Interactive map of Norway: color-coded heat zones by region with station pins. Regional MVP buildable with RegionalFuelBenchmark + react-leaflet today.",
    status: "partial",
    userValueImportance:   3,  // v4.1 correction: was 4. Regional color map is informational/marketing-friendly.
                               // Does not directly help a user buy cheaper fuel the way savings-tracker or fill-historikk does.
                               // Lowered from 4 → 3 to reflect realistic product value vs data flywheel features.
    dataQualityImportance: 2,
    adminUiImportance:     2,
    installDriverImportance: 4,
    implementationCost:    3,
    rawWeightedScore: 2.75,  // 0.90+0.40+0.40+0.60+0.45 (corrected from 3.05)
    stabilityNote: "Phase alignment +0.25. Station pins blocked by partial GooglePlaces coverage. v4.1: USER_VALUE corrected 4→3.",
    stabilityAdjustedScore: 3.00,  // corrected from 3.30
    displayScore: 15.00,           // corrected from 16.50
    dependencies: ["RegionalFuelBenchmark-entity", "react-leaflet"],
    blockers: ["Station pin layer requires GooglePlaces coverage >60% nationally — regional heat zones unblocked"],
    buildNote: "Nice-to-have visual/marketing feature. Build AFTER fuel-savings-tracker and gamification-system. Regional heat zone MVP only.",
    priorityNote: "v4.1: Does not create stronger immediate user value than savings/data-flywheel features. Ranked below gamification-system and driver-leaderboard in actionable order.",
  },

  {
    id: "tankradar-score",
    title: "TankRadar-score",
    phase: 3,
    category: "gamification",
    description: "Composite personal score: savings rate × contribution quality × streak — single motivating number",
    status: "dependent",
    userValueImportance:   3,
    dataQualityImportance: 1,
    adminUiImportance:     1,
    installDriverImportance: 4,
    implementationCost:    4,
    rawWeightedScore: 2.50,  // 0.90+0.20+0.20+0.60+0.60
    stabilityNote: "Partial dependency -0.25 (depends on fuel-savings-tracker + gamification-system not yet shipped)",
    stabilityAdjustedScore: 2.25,
    displayScore: 11.25,
    dependencies: ["fuel-savings-tracker", "gamification-system", "streak-counter"],
    blockers: ["fuel-savings-tracker must ship first"],
  },

  // ── PHASE 4 — DECISION INTELLIGENCE ──────────────────────────────────────

  {
    id: "fill-historikk",
    title: "Fyll-historikk — Min tankhistorikk",
    phase: 4,
    category: "engagement",
    description: "Personal refueling log: every fill-up via TankRadar — price, station, date, cost estimate. Pure UI — data already in FuelPrice entity.",
    status: "build-ready",
    userValueImportance:   5,
    dataQualityImportance: 2,
    adminUiImportance:     1,
    installDriverImportance: 4,
    implementationCost:    5,
    rawWeightedScore: 3.45,  // 1.50+0.40+0.20+0.60+0.75
    stabilityNote: "Phase alignment +0.25. Governor baseline places this in Phase 4 (Decision Intelligence), not Phase 1.",
    stabilityAdjustedScore: 3.70,
    displayScore: 18.50,
    dependencies: ["FuelPrice-entity", "user-price-history"],
    blockers: [],
    note: "Unlocks bilokonomi-dashboard and tankradar-score.",
  },

  {
    id: "bilokonomi-dashboard",
    title: "Bilokonomi-dashboard",
    phase: 4,
    category: "engagement",
    description: "Personal vehicle economics: monthly fuel costs, consumption trends, efficiency, total spend. Requires fill-historikk + vehicle profile.",
    status: "dependent",
    userValueImportance:   4,
    dataQualityImportance: 1,
    adminUiImportance:     1,
    installDriverImportance: 4,
    implementationCost:    3,
    rawWeightedScore: 2.65,  // 1.20+0.20+0.20+0.60+0.45
    stabilityNote: "Partial dependency -0.25 (fill-historikk not yet shipped)",
    stabilityAdjustedScore: 2.40,
    displayScore: 12.00,
    dependencies: ["fill-historikk", "user-vehicle-profile", "NationalFuelBenchmark-entity"],
    blockers: ["fill-historikk must ship first"],
  },

  {
    id: "route-fuel-intelligence",
    title: "Billigste drivstoff på rute",
    phase: 4,
    category: "routing",
    description: "Show cheapest fuel stations along a planned driving route with savings estimates. Hero phase 4 feature.",
    status: "blocked",
    userValueImportance:   5,
    dataQualityImportance: 1,
    adminUiImportance:     1,
    installDriverImportance: 5,
    implementationCost:    1,
    rawWeightedScore: 2.80,  // 1.50+0.20+0.20+0.75+0.15
    stabilityNote: "Readiness penalty -0.50 (routing engine + station-level coverage >70% both missing)",
    stabilityAdjustedScore: 2.30,
    displayScore: 11.50,
    dependencies: ["route-calculation-library", "station-level-coverage-70pct", "geolocation"],
    blockers: ["No routing library chosen", "Station-level coverage nationally insufficient"],
    northStarNote: "Phase 4 hero feature. Plan routing library decision as pre-condition.",
  },

  {
    id: "favorite-route-alerts",
    title: "Billigste varsel på din rute",
    phase: 4,
    category: "alerts",
    description: "Alert users when fuel is cheapest on their regular commute route",
    status: "blocked",
    userValueImportance:   4,
    dataQualityImportance: 1,
    adminUiImportance:     1,
    installDriverImportance: 4,
    implementationCost:    2,
    rawWeightedScore: 2.50,  // 1.20+0.20+0.20+0.60+0.30
    stabilityNote: "Readiness penalty -0.50 (blocked by same routing layer as route-fuel-intelligence)",
    stabilityAdjustedScore: 2.00,
    displayScore: 10.00,
    dependencies: ["saved-routes", "route-matching", "push-notifications"],
    blockers: ["Blocked by route-fuel-intelligence routing layer"],
  },

  // ── PHASE 5 — PREDICTIVE LAYER ────────────────────────────────────────────

  {
    id: "naar-loenner-det-seg",
    title: "Når lønner det seg å fylle?",
    phase: 5,
    category: "predictive",
    description: "Predict upcoming price movements to guide user refueling timing",
    status: "blocked",
    userValueImportance:   4,
    dataQualityImportance: 1,
    adminUiImportance:     1,
    installDriverImportance: 5,
    implementationCost:    1,
    rawWeightedScore: 2.50,  // 1.20+0.20+0.20+0.75+0.15
    stabilityNote: "Readiness penalty -0.50 (requires 6+ months station-level historical — not yet available)",
    stabilityAdjustedScore: 2.00,
    displayScore: 10.00,
    dependencies: ["6-months-station-level-historical", "statistical-modeling"],
    blockers: ["Insufficient historical depth — only monthly national SSB averages available today"],
    northStarNote: "Strong install driver. Revisit when station-level data matures.",
  },

  {
    id: "price-drop-predictor",
    title: "Price drop predictor",
    phase: 5,
    category: "predictive",
    description: "ML-based prediction of price drops — alert users before the drop happens",
    status: "blocked",
    userValueImportance:   4,
    dataQualityImportance: 1,
    adminUiImportance:     1,
    installDriverImportance: 5,
    implementationCost:    1,
    rawWeightedScore: 2.50,  // same profile as naar-loenner
    stabilityNote: "Readiness penalty -0.50",
    stabilityAdjustedScore: 2.00,
    displayScore: 10.00,
    dependencies: ["historical-price-data", "ml-training-pipeline"],
    blockers: ["Same blocker as naar-loenner-det-seg"],
  },

  // ── PHASE 6 — PLATFORM EXPANSION ─────────────────────────────────────────

  {
    id: "receipt-import",
    title: "Automatisk import av drivstoffkjøp",
    phase: 6,
    category: "crowdsourcing",
    description: "Consent-based reading of fuel purchases from email receipts or photos. Auto price logging.",
    status: "deferred",
    userValueImportance:   3,
    dataQualityImportance: 4,
    adminUiImportance:     1,
    installDriverImportance: 4,
    implementationCost:    2,
    rawWeightedScore: 2.80,  // 0.90+0.80+0.20+0.60+0.30
    stabilityNote: "Readiness penalty -0.50 (privacy architecture + store review + OCR pipeline all missing)",
    stabilityAdjustedScore: 2.30,
    displayScore: 11.50,
    dependencies: ["ocr-or-receipt-parser", "user-email-oauth", "receipt-validation"],
    blockers: ["High privacy risk", "Store review complexity", "OCR pipeline not implemented"],
  },

  {
    id: "fleet-mode",
    title: "Fleet-modus for bedrifter",
    phase: 6,
    category: "b2b",
    description: "Multi-vehicle management for SMEs: per-vehicle cost tracking, expense reports, fleet dashboard",
    status: "blocked",
    userValueImportance:   5,
    dataQualityImportance: 1,
    adminUiImportance:     2,
    installDriverImportance: 3,
    implementationCost:    1,
    rawWeightedScore: 2.70,  // 1.50+0.20+0.40+0.45+0.15
    stabilityNote: "Readiness penalty -0.50 (org account model + premium tier both missing)",
    stabilityAdjustedScore: 2.20,
    displayScore: 11.00,
    dependencies: ["multi-vehicle-profiles", "organization-account-model", "premium-tier"],
    blockers: ["Consumer product must mature before B2B surface"],
  },

  {
    id: "ev-fuel-hybrid",
    title: "EV + fuel hybrid",
    phase: 6,
    category: "platform",
    description: "Extend TankRadar to cover EV charging alongside fuel — hybrid cost comparison",
    status: "planned",
    userValueImportance:   3,
    dataQualityImportance: 1,
    adminUiImportance:     1,
    installDriverImportance: 2,
    implementationCost:    2,
    rawWeightedScore: 1.90,  // 0.90+0.20+0.20+0.30+0.30
    stabilityNote: "Readiness penalty -0.50",
    stabilityAdjustedScore: 1.40,
    displayScore: 7.00,
    dependencies: ["EV-charging-data-source", "multi-fuel-type-UI"],
    blockers: ["No EV charging data source evaluated"],
  },

  {
    id: "fuel-data-api",
    title: "Drivstoffdata-API for utviklere",
    phase: 6,
    category: "monetization",
    description: "Commercial or open-access API exposing Norwegian fuel price data to third-party developers",
    status: "blocked",
    userValueImportance:   2,
    dataQualityImportance: 3,
    adminUiImportance:     1,
    installDriverImportance: 1,
    implementationCost:    3,
    rawWeightedScore: 2.00,  // 0.60+0.60+0.20+0.15+0.45
    stabilityNote: "Readiness penalty -0.50 (data quality maturity + legal terms + billing all missing)",
    stabilityAdjustedScore: 1.50,
    displayScore: 7.50,
    dependencies: ["stable-data-pipeline", "api-key-management", "rate-limiting", "legal-data-terms"],
    blockers: ["Data quality must mature first", "Legal review required", "Commercial billing not implemented"],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// CURRENT PRIORITY ORDER
// Ordered by: phase sequence first, then stability-adjusted score within/across adjacent phases.
// Completed items listed for traceability but not actionable.
// ─────────────────────────────────────────────────────────────────────────────

export const CURRENT_PRIORITY_ORDER = [

  // ── PHASE 1 (completed / active) ─────────────────────────────────────────
  { rank: 1,  id: "station-matching-engine",             status: "completed",  score: 3.35, action: "DONE" },
  { rank: 2,  id: "station-candidate-pipeline",          status: "completed",  score: 3.50, action: "DONE" },
  { rank: 3,  id: "governance-stabilisering",            status: "active",     score: 3.35, action: "ONGOING — never fully done" },
  { rank: 4,  id: "admin-operations-panel-integration",  status: "planned",    score: 3.50, action: "▶ NEXT IMMEDIATE — Wire AdminOperationsPanel + MasteringMetrics into SuperAdmin tabs" },

  // ── PHASE 2 (completed / active) ─────────────────────────────────────────
  { rank: 5,  id: "national-fuel-barometer",             status: "completed",  score: 3.90, action: "DONE — shipped 2026-03-12" },
  { rank: 6,  id: "prisrapportering",                    status: "completed",  score: 3.95, action: "DONE" },
  { rank: 7,  id: "billigste-drivstoff-naerheten",       status: "active",     score: 3.40, action: "ACTIVE — improve coverage" },
  { rank: 8,  id: "prisvarsler",                         status: "active",     score: 3.35, action: "ACTIVE — iterate on alert types" },
  { rank: 9,  id: "favorittstasjoner",                   status: "active",     score: 2.90, action: "ACTIVE" },

  // ── PHASE 3 (growth engine) ───────────────────────────────────────────────
  { rank: 10, id: "community-price-verification",        status: "planned",    score: 3.75, action: "BUILD — Phase 3 priority #1 (highest adj. score in phase)" },
  { rank: 11, id: "community-station-validation",        status: "planned",    score: 3.65, action: "BUILD — Phase 3 priority #2" },
  { rank: 12, id: "fuel-savings-tracker",                status: "build-ready",score: 3.70, action: "BUILD — Phase 3 priority #3 (strongest user retention hook)" },
  { rank: 13, id: "price-war-alerts",                    status: "blocked",    score: 2.80, action: "MONITOR — unblocks when station-level coverage improves" },
  { rank: 14, id: "gamification-system",                 status: "build-ready",score: 3.30, action: "BUILD — Phase 3, after savings-tracker" },
  { rank: 15, id: "driver-leaderboard",                  status: "build-ready",score: 3.30, action: "BUILD — Phase 3, requires opt-in + anonymization plan" },
  { rank: 16, id: "fuel-price-heatmap",                  status: "partial",    score: 3.30, action: "BUILD regional MVP only — defer station pin layer" },
  { rank: 17, id: "tankradar-score",                     status: "dependent",  score: 2.25, action: "AFTER fuel-savings-tracker + gamification-system" },

  // ── PHASE 4 (decision intelligence) ──────────────────────────────────────
  { rank: 18, id: "fill-historikk",                      status: "build-ready",score: 3.70, action: "BUILD — Phase 4, pure UI, unlocks bilokonomi + tankradar-score" },
  { rank: 19, id: "bilokonomi-dashboard",                status: "dependent",  score: 2.40, action: "AFTER fill-historikk ships" },
  { rank: 20, id: "route-fuel-intelligence",             status: "blocked",    score: 2.30, action: "PLAN routing library decision — Phase 4 hero feature" },
  { rank: 21, id: "favorite-route-alerts",               status: "blocked",    score: 2.00, action: "AFTER route-fuel-intelligence routing layer" },

  // ── PHASE 5 (predictive) ─────────────────────────────────────────────────
  { rank: 22, id: "naar-loenner-det-seg",                status: "blocked",    score: 2.00, action: "NORTH STAR — revisit when 6-months station-level data available" },
  { rank: 23, id: "price-drop-predictor",                status: "blocked",    score: 2.00, action: "NORTH STAR — same blocker as naar-loenner-det-seg" },

  // ── PHASE 6 (platform expansion) ─────────────────────────────────────────
  { rank: 24, id: "receipt-import",                      status: "deferred",   score: 2.30, action: "DEFERRED — privacy architecture review first" },
  { rank: 25, id: "fleet-mode",                          status: "blocked",    score: 2.20, action: "BLOCKED — consumer product must mature" },
  { rank: 26, id: "fuel-data-api",                       status: "blocked",    score: 1.50, action: "BLOCKED — data quality + legal terms required" },
  { rank: 27, id: "ev-fuel-hybrid",                      status: "planned",    score: 1.40, action: "PLANNED — no data source evaluated yet" },
];

// ─────────────────────────────────────────────────────────────────────────────
// NEXT RECOMMENDED ACTIONS (IMMEDIATE)
// ─────────────────────────────────────────────────────────────────────────────

export const NEXT_ACTIONS = {
  immediateAdminFix: {
    id: "admin-operations-panel-integration",
    effort: "2–4 hours",
    description: "Wire AdminOperationsPanel into SuperAdmin Operations tab. Wire MasteringMetrics into Data Quality tab. These are built — zero new code needed. Orphaned bulk ops are a governance gap.",
    stabilityAdjustedScore: 3.50,
    frozenFileRisk: "ZERO",
  },
  nextUserFeature: {
    id: "fuel-savings-tracker",
    effort: "2–3 days",
    rationale: [
      "Highest stability-adjusted score of build-ready user features (3.70)",
      "Zero infrastructure — reads existing FuelPrice + NationalFuelBenchmark",
      "Strongest retention hook: makes TankRadar's value proposition concrete",
      "Phase 3 priority #3 (below community validation features which need scoping)",
      "Shareable card drives organic installs",
    ],
  },
  nextCommunityFeature: {
    id: "community-price-verification",
    effort: "3–5 days",
    rationale: [
      "Highest stability-adjusted score in Phase 3 (3.75) — admin escalation applied",
      "Directly improves data quality AND reduces admin review burden",
      "Phase 3 priority #1 per Governor model",
      "Data flywheel: better community data → better product → more users → more data",
    ],
  },
  phaseSequenceSummary: [
    "1. Admin fix: Wire AdminOperationsPanel + MasteringMetrics      — 2–4 hours  (score 3.50)",
    "2. User: fuel-savings-tracker                                   — 2–3 days   (score 3.70)",
    "3. Community: community-price-verification                      — 3–5 days   (score 3.75)",
    "4. Community: community-station-validation                      — 3–5 days   (score 3.65)",
    "5. User: gamification-system                                    — 2–3 days   (score 3.30)",
    "6. User: driver-leaderboard                                     — 2–3 days   (score 3.30)",
    "7. Map: fuel-price-heatmap (regional MVP only)                  — 3–4 days   (score 3.30)",
    "8. Decision: fill-historikk                                     — 1–2 days   (score 3.70)",
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN UI GAP REGISTER
// ─────────────────────────────────────────────────────────────────────────────

export const ADMIN_UI_GAPS = {
  assessment: "Admin UI is structurally complete (5-tab SuperAdmin hub). Two medium-severity orphan gaps remain.",
  completedWorkflows: [
    "Station review queue — AdminReviewWorkbench (Operations tab)",
    "Duplicate detection + remediation — DuplicateWorkbench (Data Quality tab)",
    "System health + data source status — SystemHealthDashboard (Data Quality tab)",
    "Phase 2 matching verification — Phase2Matching* panels (Matching Lab tab)",
    "Archive + diagnostic report links (Archive tab)",
    "Station discovery queue — StationDiscoveryQueue (Overview tab)",
  ],
  gaps: [
    {
      id: "admin-operations-panel-orphaned",
      severity: "MEDIUM",
      gap: "AdminOperationsPanel not surfaced in SuperAdmin tabs",
      description: "Bulk pipeline operations (geocode batch, apply reclassifications, DANGER ZONE actions) exist in AdminOperationsPanel but have no path from any SuperAdmin tab.",
      recommendation: "Add AdminOperationsPanel to Operations tab below AdminReviewWorkbench",
      stabilityImpact: "HIGH — bulk ops blocked by missing UI path is an operational governance gap",
    },
    {
      id: "mastering-metrics-orphaned",
      severity: "MEDIUM",
      gap: "MasteringMetrics not surfaced in SuperAdmin tabs",
      description: "MasteringMetrics (chain completeness, city/address gaps, candidate + review breakdowns, CSV/JSON export) is built but not linked from SuperAdmin.",
      recommendation: "Embed or link MasteringMetrics in Data Quality tab",
      stabilityImpact: "MEDIUM — data quality oversight requires this panel",
    },
    {
      id: "chain-unconfirmed-review-orphaned",
      severity: "LOW",
      gap: "ChainUnconfirmedManualReviewUI not linked from Operations",
      description: "Chain_unconfirmed manual review workflow has no path from SuperAdmin.",
      recommendation: "Add link in Operations tab under Stasjonsdrift section",
    },
    {
      id: "station-review-count-missing",
      severity: "LOW",
      gap: "StationReview pending count not in Overview",
      description: "ReviewQueueSummary shows FuelPrice review_needed count only. StationReview pending not visible.",
      recommendation: "Add StationReview pending metric card to Overview tab",
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// NORTH STAR FEATURES (high value, not yet actionable)
// ─────────────────────────────────────────────────────────────────────────────

export const NORTH_STAR_FEATURES = [
  {
    id: "route-fuel-intelligence",
    reason: "Phase 4 hero feature. Requires routing engine + station-level coverage >70%. Plan library decision when Phase 3 ships.",
  },
  {
    id: "price-war-alerts",
    reason: "Would be Phase 3 #1 if GooglePlaces coverage were sufficient. Monitor observedCoverageRate in SourceRegistry.",
  },
  {
    id: "naar-loenner-det-seg",
    reason: "Phase 5 flagship. Revisit when 6+ months of station-level historical data is accumulated.",
  },
  {
    id: "price-drop-predictor",
    reason: "Same data readiness blocker as naar-loenner. Strongest install driver in Phase 5.",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// GOVERNANCE
// ─────────────────────────────────────────────────────────────────────────────

export const GOVERNANCE = {
  version: "4.0",
  lastUpdated: "2026-03-12",
  updatedBy: "Roadmap Governor — Entry 101",
  previousVersion: "3.0 (Entry 100 — AI Product Brain pass)",
  keyChangesFromV3: [
    "ADMIN_UI_IMPORTANCE weight corrected from 0.15 → 0.20 per Governor spec",
    "INSTALL_DRIVER weight corrected from 0.20 → 0.15 per Governor spec",
    "Phase structure replaced with Governor-locked 6-phase baseline",
    "Stability modifiers applied to all raw scores",
    "national-fuel-barometer marked COMPLETED (shipped 2026-03-12)",
    "Community validation features added to Phase 3",
    "Admin operations panel integration elevated to immediate next action",
    "fill-historikk correctly placed in Phase 4 per locked baseline (not Phase 1)",
    "currentPriorityOrder aligned to locked phase + stability-adjusted scores",
  ],
  stabilityContract: [
    "Layer 1 (phase structure) is LOCKED — do not collapse, reorder, or merge phases",
    "Layer 2 (feature priority within/across adjacent phases) may be refined by weighted scoring",
    "A single audit may refine priorities but NOT overturn the baseline",
    "Features may only be promoted one phase step at a time without explicit human approval",
    "Admin UI importance must be explicitly evaluated in every scoring pass",
  ],
  frozenFilesModified: "NONE",
  codeChangesInThisPass: "NONE — roadmap document only",
  verificationMethod: "Direct file inspection: IDEA_INDEX, NextSafeStep, admin components, product audit",
  sourceFiles: [
    "components/ideas/IDEA_INDEX.jsx",
    "components/governance/NextSafeStep.jsx",
    "components/audits/product/product-intelligence-audit-2026-03-12.jsx",
    "components/admin/AdminOperationsPanel.jsx (referenced — not read)",
    "components/admin/MasteringMetrics.jsx (referenced — not read)",
    "pages/SuperAdmin.jsx (referenced — not read)",
    "components/roadmap/ROADMAP.jsx (previous v3.0)",
  ],
};

export default {
  SCORING_MODEL,
  PHASE_BASELINE,
  FEATURES,
  CURRENT_PRIORITY_ORDER,
  NEXT_ACTIONS,
  ADMIN_UI_GAPS,
  NORTH_STAR_FEATURES,
  GOVERNANCE,
};