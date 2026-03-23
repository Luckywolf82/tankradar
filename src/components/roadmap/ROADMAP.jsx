/*
TANKRADAR PRODUCT ROADMAP — GOVERNOR v4.3
Canonical Roadmap Manager with Weighted Stability

Last updated:   2026-03-13 (Entry 104 — acquisition layer roadmap sync pass)
Replaces:       ROADMAP v4.2 (Entry 103 — scoping-required status pass)

CHANGE LOG vs v4.3:
  - Added new Phase 3 acquisition-layer features:
      - radar-mode
      - likely-refuel-detection
      - price-sign-ocr
  - ACTIONABLE_PRIORITY_ORDER updated to include acquisition-layer scoping work
  - NEXT_ACTIONS recommendedBuildSequence updated with acquisition-layer scoping steps
  - GOVERNANCE version bumped to 4.3
  - No phase baseline changes
  - No scoring weight changes
  - No frozen files modified

CHANGE LOG vs v4.2:
  - New status level introduced: scoping-required
      Definition: strategically valid, likely to be built, but requires a
      design/scoping pass before implementation can begin.
      Distinct from: planned (ambiguous readiness), blocked (infra missing),
      build-ready (can start immediately).
  - community-price-verification reclassified: planned → scoping-required
      Reason: requires trust-model + confidence-scoring design before sprint
  - community-station-validation reclassified: planned → scoping-required
      Reason: requires user-trust-model + validation-model design before sprint
  - ACTIONABLE_PRIORITY_ORDER action wording updated for both features
  - NEXT_ACTIONS recommendedBuildSequence notes updated for steps 3 and 4
  - GOVERNANCE updated: statusDefinitions added, v42Changes documented

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
// STATUS DEFINITIONS
// Canonical reference for all valid feature status values.
// ─────────────────────────────────────────────────────────────────────────────

export const STATUS_DEFINITIONS = {
  completed: "Shipped and live. No further action required unless regression is detected.",
  active: "Built and live, under ongoing iteration and improvement.",
  "build-ready": "Implementation can begin immediately. No design prerequisites. No blocking infra gaps.",
  "scoping-required": [
    "Strategically valid and likely to be built.",
    "Scores highly on the weighted model.",
    "NOT blocked by long-term infrastructure constraints.",
    "BUT requires a dedicated design/scoping pass before implementation sprint can begin.",
    "Typical scoping work: trust-model design, API contract, routing library decision, privacy architecture.",
    "DISTINCT FROM planned — planned has no readiness signal. scoping-required is an explicit gate.",
    "DISTINCT FROM build-ready — build-ready means start now. scoping-required means scope first.",
    "DISTINCT FROM blocked — blocked means infra is missing. scoping-required means design is missing.",
    "Transition path: scoping-required → (scoping pass completed) → build-ready → (sprint) → active/completed",
  ],
  planned: "Intended to be built at some point. No readiness assessment performed yet.",
  dependent: "Cannot start until a specific other feature ships first.",
  blocked: "Cannot start until missing infrastructure, data, or external dependency is resolved.",
  partial: "Partially buildable now; full feature requires unresolved dependencies.",
  deferred: "Deprioritized due to risk, complexity, or strategic timing. Revisit in a future pass.",
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
    status: "stabilized",
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
    stabilizationNotes: [
      "Migrated to CurrentStationPrices (CSP)",
      "429 rate limit issue resolved",
      "Freshness bug fixed",
      "Sorting corrected (price → distance)",
      "Parity verified against legacy path",
    ],
  },

  {
    id: "current-read-model-csp",
    title: "Current read model (CurrentStationPrices)",
    phase: 1,
    category: "system",
    status: "completed",
    priority: "critical",
    description: "Introduced CurrentStationPrices as canonical read model for NearbyPrices and future ranking surfaces",
    impact: [
      "Eliminated FuelPrice query explosion (429)",
      "Enabled single-query nearby ranking",
      "Established separation between historical data (FuelPrice) and operational read model (CSP)",
    ],
    userValueImportance:   3,
    dataQualityImportance: 5,
    adminUiImportance:     2,
    installDriverImportance: 1,
    implementationCost:    4,
    rawWeightedScore: 3.00,
    stabilityNote: "Infrastructure foundation — no scoring adjustment needed",
    stabilityAdjustedScore: 3.00,
    displayScore: 15.00,
    dependencies: [],
    blockers: [],
    completedDate: "2026-03-23",
  },

  {
    id: "nearby-cleanup-post-migration",
    title: "Cleanup: Remove legacy FuelPrice path from NearbyPrices",
    phase: 1,
    category: "tech-debt",
    status: "pending",
    priority: "low",
    description: "Remove legacy FuelPrice path and parity code from NearbyPrices after CSP migration is fully stable",
    userValueImportance:   1,
    dataQualityImportance: 2,
    adminUiImportance:     1,
    installDriverImportance: 1,
    implementationCost:    5,
    rawWeightedScore: 1.30,
    stabilityNote: "Tech debt — low urgency, no stability modifier",
    stabilityAdjustedScore: 1.30,
    displayScore: 6.50,
    dependencies: ["current-read-model-csp"],
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
    note: "SHIPPED. Built 2026-03-12. Component: components/dashboard/NationalFuelBarometer.jsx. Enhanced after initial ship — integrated into Statistics page. Used on both Dashboard and Statistics surfaces.",
  },

  // ── PHASE 3 — GROWTH ENGINE ───────────────────────────────────────────────

  {
    id: "community-price-verification",
    title: "Community price verification",
    phase: 3,
    category: "crowdsourcing",
    description: "Allow users to verify or dispute existing prices — weighted trust signals improve data confidence without full moderation overhead",
    status: "scoping-required",  // v4.2: was "planned". Reclassified because trust-model + confidence-scoring
                                  // design must be completed before implementation sprint can begin.
                                  // Not blocked by infra — blocked by design gap only.
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
    status: "scoping-required",  // v4.2: was "planned". Reclassified because user-trust-model +
                                  // validation-model design must be completed before sprint.
                                  // Shares trust-model prerequisite with community-price-verification.
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
    id: "radar-mode",
    title: "Radar Mode",
    phase: 3,
    category: "crowdsourcing",
    description: "Driver-as-sensor mode for low-friction fuel data acquisition using contextual station detection and rapid capture flows.",
    status: "scoping-required",
    userValueImportance:   4,
    dataQualityImportance: 5,
    adminUiImportance:     2,
    installDriverImportance: 5,
    implementationCost:    2,
    rawWeightedScore: 3.55,
    stabilityNote: "Phase alignment +0.25. Strategically central acquisition-layer concept, but requires dedicated scoping pass before sprint.",
    stabilityAdjustedScore: 3.80,
    displayScore: 19.00,
    dependencies: ["station-matching-engine", "prisrapportering"],
    blockers: [],
  },

  {
    id: "price-sign-ocr",
    title: "Price sign OCR capture",
    phase: 3,
    category: "crowdsourcing",
    description: "Fast camera capture flow for station price boards with OCR extraction of fuel type and price.",
    status: "scoping-required",
    userValueImportance:   4,
    dataQualityImportance: 5,
    adminUiImportance:     2,
    installDriverImportance: 4,
    implementationCost:    1,
    rawWeightedScore: 3.35,
    stabilityNote: "Phase alignment +0.25. High-value acquisition feature, but requires OCR confidence model and fallback design.",
    stabilityAdjustedScore: 3.60,
    displayScore: 18.00,
    dependencies: ["radar-mode"],
    blockers: [],
  },

  {
    id: "likely-refuel-detection",
    title: "Likely refuel detection",
    phase: 3,
    category: "crowdsourcing",
    description: "Probability engine that estimates when a user is likely stopping to refuel based on station stop behavior, dwell time, and fueling patterns.",
    status: "scoping-required",
    userValueImportance:   3,
    dataQualityImportance: 4,
    adminUiImportance:     2,
    installDriverImportance: 4,
    implementationCost:    2,
    rawWeightedScore: 3.00,
    stabilityNote: "Phase alignment +0.25. Needed to avoid over-prompting and make Radar Mode viable.",
    stabilityAdjustedScore: 3.25,
    displayScore: 16.25,
    dependencies: ["radar-mode"],
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
// COMPLETED_TRACE
// Purpose: preserve roadmap history and shipped milestones — not for operational decision-making.
// Do not reference this list to determine what to build next.
// ─────────────────────────────────────────────────────────────────────────────

export const COMPLETED_TRACE = [
  { id: "station-matching-engine",    phase: 1, status: "completed", note: "Matching engine ships. Conservative strategy confirmed." },
  { id: "station-candidate-pipeline", phase: 1, status: "completed", note: "Candidate ingestion + classification pipeline live." },
  { id: "prisrapportering",           phase: 2, status: "completed", note: "4-step LogPrice flow live. Core crowdsourcing loop operational." },
  { id: "national-fuel-barometer",    phase: 2, status: "completed", completedDate: "2026-03-12", note: "Shipped. Component: components/dashboard/NationalFuelBarometer.jsx. Bensin/Diesel toggle, 3-band bar, SSBData historical comparison. Enhanced after initial ship — integrated into Statistics page. Used on Dashboard and Statistics surfaces." },
  { id: "current-read-model-csp",    phase: 1, status: "completed", completedDate: "2026-03-23", note: "CurrentStationPrices introduced as canonical read model. Resolved FuelPrice query explosion (429). Separated operational read layer from historical data layer." },
  { id: "billigste-drivstoff-naerheten", phase: 2, status: "stabilized", note: "Migrated to CSP. 429 resolved. Freshness bug fixed. Sorting corrected. Parity verified." },
];

// ─────────────────────────────────────────────────────────────────────────────
// ACTIONABLE_PRIORITY_ORDER
// Purpose: What should be worked on NOW or NEXT.
// Contains only: active, planned, build-ready, partial, dependent items.
// Ordered by: phase sequence first, then stability-adjusted score.
//
// IMPORTANT DISTINCTION:
//   highestScoringFeature ≠ recommendedNextShip
//   The highest adjusted score identifies the strongest candidate, but
//   recommended next ship must also consider: readiness, sequencing, admin
//   foundations, and whether the previous ship has settled.
//   See NEXT_ACTIONS for the explicit separation.
// ─────────────────────────────────────────────────────────────────────────────

export const ACTIONABLE_PRIORITY_ORDER = [

  // ── PHASE 1 — ongoing / planned ──────────────────────────────────────────
  {
    rank: 1,
    id: "governance-stabilisering",
    status: "active",
    adjustedScore: 3.35,
    action: "ONGOING — governance is never fully done; maintain execution log and audit system",
  },
  {
    rank: 2,
    id: "admin-operations-panel-integration",
    status: "planned",
    adjustedScore: 3.50,
    action: "▶ NEXT IMMEDIATE — Wire AdminOperationsPanel + MasteringMetrics into SuperAdmin tabs. 2–4 hours. Zero new code. Admin escalation bonus active — gap is open.",
    adminEscalationActive: true,
    adminGapNote: "Gap inferred from v4.0 roadmap findings (admin files referenced, not directly read in this pass).",
  },

  // ── PHASE 2 — active, improving ──────────────────────────────────────────
  {
    rank: 3,
    id: "billigste-drivstoff-naerheten",
    status: "stabilized",
    adjustedScore: 3.40,
    action: "STABILIZED — CSP migration complete. Monitor for regressions. No active iteration required.",
  },
  {
    rank: 4,
    id: "prisvarsler",
    status: "active",
    adjustedScore: 3.35,
    action: "ACTIVE — iterate on alert types and notification delivery",
  },
  {
    rank: 5,
    id: "favorittstasjoner",
    status: "active",
    adjustedScore: 2.90,
    action: "ACTIVE — maintain, low iteration priority",
  },

  // ── PHASE 3 — growth engine builds ───────────────────────────────────────
  // Note: community-price-verification scores highest (3.75) due to admin escalation.
  // However fuel-savings-tracker is the recommended next USER-FACING ship because it
  // is purely build-ready, zero scoping risk, and immediately visible to users.
  // Community features require trust-model design before implementation.
  // See NEXT_ACTIONS for explicit recommendedNextShip.
  {
    rank: 6,
    id: "fuel-savings-tracker",
    status: "build-ready",
    adjustedScore: 3.70,
    action: "BUILD — recommended next user-facing ship. Highest build-ready user score. Zero infra.",
    recommendedNextShip: true,
  },
  {
    rank: 7,
    id: "community-price-verification",
    status: "scoping-required",  // v4.2
    adjustedScore: 3.75,
    action: "SCOPE — run trust-model + confidence-scoring design pass. Then move to build-ready. Do not start implementation sprint without completed scoping.",
    highestScoringPhase3: true,
    adminEscalationActive: true,
    scopingRequired: "Trust-model design: how are user verifications weighted? Confidence-scoring logic: how does a verification update priceNok confidence? These must be decided before UI/backend sprint.",
  },
  {
    rank: 8,
    id: "community-station-validation",
    status: "scoping-required",  // v4.2
    adjustedScore: 3.65,
    action: "SCOPE — run validation-model design pass after community-price-verification scoping settles. Shares trust-model prerequisite.",
    adminEscalationActive: true,
    scopingRequired: "Validation model: which fields are crowdsource-editable? How are conflicting contributor edits resolved? Trust threshold for auto-apply vs. curator queue?",
  },
  {
    rank: 9,
    id: "radar-mode",
    status: "scoping-required",
    adjustedScore: 3.80,
    action: "SCOPE — define passive acquisition model, prompt timing, consent flow, and acquisition-layer UX before implementation sprint.",
  },
  {
    rank: 10,
    id: "price-sign-ocr",
    status: "scoping-required",
    adjustedScore: 3.60,
    action: "SCOPE — define OCR capture UX, confidence thresholds, validation/fallback flow, and merge logic with manual price reporting.",
  },
  {
    rank: 11,
    id: "likely-refuel-detection",
    status: "scoping-required",
    adjustedScore: 3.25,
    action: "SCOPE — define detection heuristics and anti-spam logic so Radar Mode only triggers when refuel probability is high.",
  },
  {
    rank: 12,
    id: "gamification-system",
    status: "build-ready",
    adjustedScore: 3.30,
    action: "BUILD — after fuel-savings-tracker ships. Extends existing ContributionImpactCard + StreakCounter.",
  },
  {
    rank: 13,
    id: "driver-leaderboard",
    status: "build-ready",
    adjustedScore: 3.30,
    action: "BUILD — after gamification-system. Requires opt-in display + anonymization plan.",
  },
  {
    rank: 14,
    id: "fuel-price-heatmap",
    status: "partial",
    adjustedScore: 3.00,
    action: "BUILD regional heat zone MVP only — after gamification + leaderboard ship. Nice-to-have visual, not a user-value priority.",
    priorityNote: "v4.1: Scored down from 3.30 → 3.00. Build after stronger user-value features.",
  },
  {
    rank: 15,
    id: "tankradar-score",
    status: "dependent",
    adjustedScore: 2.25,
    action: "AFTER fuel-savings-tracker + gamification-system ship",
  },

  // ── PHASE 4 — decision intelligence ──────────────────────────────────────
  {
    rank: 16,
    id: "fill-historikk",
    status: "build-ready",
    adjustedScore: 3.70,
    action: "BUILD — Phase 4, pure UI, unlocks bilokonomi-dashboard. No blocking dependencies.",
    note: "High adjusted score — could be pulled forward once Phase 3 user features are shipped.",
  },
  {
    rank: 17,
    id: "bilokonomi-dashboard",
    status: "dependent",
    adjustedScore: 2.40,
    action: "AFTER fill-historikk ships",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// BLOCKED_OR_NORTH_STAR
// Purpose: Strategic features visible for planning, not currently actionable.
// Do not promote these to ACTIONABLE_PRIORITY_ORDER without resolving blockers.
// ─────────────────────────────────────────────────────────────────────────────

export const BLOCKED_OR_NORTH_STAR = [
  {
    id: "price-war-alerts",
    phase: 3,
    adjustedScore: 2.80,
    status: "blocked",
    blocker: "Station-level coverage insufficient for reliable war detection",
    unblockCondition: "Monitor SourceRegistry observedCoverageRate. Unblocks when coverage is sufficient for reliable local detection.",
    northStarNote: "Would rank Phase 3 #1 if coverage improves.",
  },
  {
    id: "route-fuel-intelligence",
    phase: 4,
    adjustedScore: 2.30,
    status: "blocked",
    blocker: "No routing library decided. Station-level coverage <70% nationally.",
    unblockCondition: "Choose routing library. Confirm station coverage threshold met.",
    northStarNote: "Phase 4 hero feature. Begin routing library evaluation when Phase 3 ships.",
  },
  {
    id: "favorite-route-alerts",
    phase: 4,
    adjustedScore: 2.00,
    status: "blocked",
    blocker: "Blocked by route-fuel-intelligence routing layer",
    unblockCondition: "route-fuel-intelligence must ship first",
  },
  {
    id: "naar-loenner-det-seg",
    phase: 5,
    adjustedScore: 2.00,
    status: "blocked",
    blocker: "Requires 6+ months station-level historical data",
    northStarNote: "Phase 5 flagship. Strong install driver. Revisit when data matures.",
  },
  {
    id: "price-drop-predictor",
    phase: 5,
    adjustedScore: 2.00,
    status: "blocked",
    blocker: "Same blocker as naar-loenner-det-seg",
    northStarNote: "Strongest install driver in Phase 5.",
  },
  {
    id: "receipt-import",
    phase: 6,
    adjustedScore: 2.30,
    status: "deferred",
    blocker: "Privacy architecture + store review + OCR pipeline all missing",
  },
  {
    id: "fleet-mode",
    phase: 6,
    adjustedScore: 2.20,
    status: "blocked",
    blocker: "Consumer product must mature before B2B surface",
  },
  {
    id: "fuel-data-api",
    phase: 6,
    adjustedScore: 1.50,
    status: "blocked",
    blocker: "Data quality + legal terms + billing infrastructure all missing",
  },
  {
    id: "ev-fuel-hybrid",
    phase: 6,
    adjustedScore: 1.40,
    status: "planned",
    blocker: "No EV charging data source evaluated",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// NEXT RECOMMENDED ACTIONS (IMMEDIATE)
// ─────────────────────────────────────────────────────────────────────────────

export const NEXT_ACTIONS = {

  // ── SCORE WINNER vs NEXT SHIP — explicitly separated ─────────────────────
  //
  // These are NOT the same thing. A high adjusted score means strong strategic
  // value. Recommended next ship must also consider: implementation readiness,
  // dependency risk, admin foundations, and operational sequencing.
  //
  highestScoringFeature: {
    id: "community-price-verification",
    adjustedScore: 3.75,
    why: "Admin escalation bonus applied — data quality flywheel + reduces admin review load. Gap is open.",
    caveat: "Requires trust-model design before implementation. Not zero-risk to start immediately.",
  },

  recommendedNextShip: {
    id: "fuel-savings-tracker",
    adjustedScore: 3.70,
    why: [
      "Highest stability-adjusted score of features that are IMMEDIATELY build-ready (no design prerequisites)",
      "Zero infrastructure — reads existing FuelPrice + NationalFuelBenchmark entities",
      "Strongest user retention hook: makes the value proposition of TankRadar concrete",
      "No trust model, no confidence scoring, no new entity required — pure UI + calculation",
      "community-price-verification (score 3.75) needs trust-model design before sprint — fuel-savings-tracker does not",
      "Shareable savings card drives organic installs",
    ],
    effort: "2–3 days",
    frozenFileRisk: "ZERO",
  },

  immediateAdminAction: {
    id: "admin-operations-panel-integration",
    adjustedScore: 3.50,
    effort: "2–4 hours",
    description: "Wire AdminOperationsPanel into SuperAdmin Operations tab. Wire MasteringMetrics into Data Quality tab. Built — zero new code. Orphaned bulk ops are a governance gap.",
    doThisFirst: "Yes — admin wiring is 2–4 hours and unblocks governance workflows before next feature sprint",
    evidenceNote: "Gap inferred from v4.0 roadmap findings. Admin files (AdminOperationsPanel, MasteringMetrics, SuperAdmin) were referenced in v4.0 but not directly read in this pass.",
    frozenFileRisk: "ZERO",
  },

  recommendedBuildSequence: [
    { step: 1, id: "admin-operations-panel-integration", effort: "2–4 hours", score: 3.50, note: "Admin fix — do first, unblocks governance" },
    { step: 2, id: "fuel-savings-tracker",               effort: "2–3 days",  score: 3.70, note: "Recommended next ship — zero prerequisites" },
    { step: 3, id: "community-price-verification",       effort: "scoping: 1 day + impl: 3–5 days", score: 3.75, note: "STATUS: scoping-required. Run trust-model + confidence-scoring design pass first, then move to build-ready." },
    { step: 4, id: "community-station-validation",       effort: "scoping: 1 day + impl: 3–5 days", score: 3.65, note: "STATUS: scoping-required. Scoping can overlap with step 3. Shares trust-model prerequisite." },
    { step: 5, id: "radar-mode",                          effort: "scoping: 1–2 days + impl: 4–6 days", score: 3.80, note: "STATUS: scoping-required. Define passive acquisition model before sprint." },
    { step: 6, id: "price-sign-ocr",                     effort: "scoping: 1 day + impl: 3–5 days", score: 3.60, note: "STATUS: scoping-required. OCR confidence + fallback flow must be scoped first." },
    { step: 7, id: "likely-refuel-detection",            effort: "scoping: 1 day + impl: 2–4 days", score: 3.25, note: "STATUS: scoping-required. Needs heuristics + anti-spam guardrails." },
    { step: 8, id: "gamification-system",                effort: "2–3 days",  score: 3.30, note: "After fuel-savings-tracker ships" },
    { step: 9, id: "driver-leaderboard",                 effort: "2–3 days",  score: 3.30, note: "After gamification-system, requires privacy plan" },
    { step: 10, id: "fill-historikk",                    effort: "1–2 days",  score: 3.70, note: "Phase 4 — pull forward after Phase 3 user features ship" },
    { step: 11, id: "fuel-price-heatmap",                effort: "3–4 days",  score: 3.00, note: "Regional MVP only — nice-to-have, build after core features" },
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
  version: "4.3",
  lastUpdated: "2026-03-13",
  updatedBy: "Roadmap Governor — Entry 104 (v4.3 acquisition layer roadmap sync pass)",
  previousVersion: "4.2 (Entry 103 — scoping-required status pass)",

  v43Changes: [
    "1. Added Phase 3 acquisition-layer features: radar-mode, price-sign-ocr, likely-refuel-detection.",
    "2. ACTIONABLE_PRIORITY_ORDER updated to reflect acquisition-layer scoping work.",
    "3. NEXT_ACTIONS recommendedBuildSequence updated with acquisition-layer scoping steps.",
    "4. No phase baseline changes.",
    "5. No scoring weight changes.",
    "6. No frozen files modified.",
  ],

  v42Changes: [
    "1. NEW STATUS LEVEL: scoping-required added to STATUS_DEFINITIONS and stabilityContract.",
    "   Definition: strategically valid, likely to be built, but requires a design/scoping pass before implementation.",
    "   Distinct from: planned (no readiness signal), build-ready (start now), blocked (infra missing).",
    "   Transition path: scoping-required → (scoping pass) → build-ready → (sprint) → active/completed.",
    "2. community-price-verification reclassified: planned → scoping-required.",
    "   Reason: requires trust-model + confidence-scoring design decision before implementation sprint.",
    "3. community-station-validation reclassified: planned → scoping-required.",
    "   Reason: requires validation-model design (editable fields, conflict resolution, trust threshold) before sprint.",
    "4. ACTIONABLE_PRIORITY_ORDER action wording updated for both: 'SCOPE — run design pass, then build-ready'.",
    "5. NEXT_ACTIONS recommendedBuildSequence effort + notes updated for steps 3 and 4.",
    "6. STATUS_DEFINITIONS export added as canonical reference for all valid status values.",
    "NO CHANGES: weights, phase baseline, scoring model values, priority order ranks, completed trace, blocked/north-star logic.",
  ],

  v41Changes: [
    "1. EVIDENCE WORDING CORRECTED — v4.0 claimed direct inspection of admin files that were only referenced. v4.1 clearly distinguishes: directly read, referenced, inferred.",
    "2. PRIORITY LIST SPLIT — CURRENT_PRIORITY_ORDER replaced with three distinct exports: COMPLETED_TRACE, ACTIONABLE_PRIORITY_ORDER, BLOCKED_OR_NORTH_STAR. Completed items no longer clutter operational planning.",
    "3. SCORE WINNER vs NEXT SHIP SEPARATED — highestScoringFeature (community-price-verification, 3.75) is now explicitly distinct from recommendedNextShip (fuel-savings-tracker, 3.70). Rationale documented in NEXT_ACTIONS.",
    "4. ADMIN ESCALATION BONUS MADE CONDITIONAL — adminEscalationBonus is now state-dependent. Documented with: conditions, re-evaluation requirement, and list of features currently receiving the bonus. Will be removed per feature once its gap is resolved.",
    "5. FUEL-PRICE-HEATMAP RE-EVALUATED — USER_VALUE corrected 4 → 3. Regional color map is informational/marketing-friendly but does not directly help users buy cheaper fuel. Adjusted score lowered 3.30 → 3.00. Now ranked after gamification and leaderboard in build sequence.",
  ],

  stabilityContract: [
    "Layer 1 (phase structure) is LOCKED — do not collapse, reorder, or merge phases",
    "Layer 2 (feature priority within/across adjacent phases) may be refined by weighted scoring",
    "A single audit may refine priorities but NOT overturn the baseline",
    "Features may only be promoted one phase step at a time without explicit human approval",
    "Admin UI importance must be explicitly evaluated in every scoring pass",
    "adminEscalationBonus is temporary — must be removed per feature once its gap is resolved",
    "scoping-required is a first-class status — do not silently treat it as planned or build-ready",
    "scoping-required → build-ready promotion requires: explicit scoping output documented before sprint start",
  ],

  frozenFilesModified: "NONE",
  codeChangesInThisPass: "NONE — roadmap document only",

  evidenceLog: {
    directlyReadThisPass: [
      "components/roadmap/ROADMAP.jsx (v4.0)",
      "components/ideas/IDEA_INDEX.jsx",
      "components/governance/NextSafeStep.jsx",
      "components/audits/product/product-intelligence-audit-2026-03-12.jsx",
    ],
    referencedNotRead: [
      "components/admin/AdminOperationsPanel.jsx — admin gap assessment inferred from v4.0 findings",
      "components/admin/MasteringMetrics.jsx — same",
      "pages/SuperAdmin.jsx — same",
    ],
    inferredFromStructure: [
      "Admin orphan gaps: inferred from v4.0 ADMIN_UI_GAPS section, which was based on prior session inspection of the above files",
    ],
  },
};

export default {
  SCORING_MODEL,
  STATUS_DEFINITIONS,
  PHASE_BASELINE,
  FEATURES,
  COMPLETED_TRACE,
  ACTIONABLE_PRIORITY_ORDER,
  BLOCKED_OR_NORTH_STAR,
  NEXT_ACTIONS,
  ADMIN_UI_GAPS,
  GOVERNANCE,
};