/*
PRODUCT INTELLIGENCE AUDIT — TankRadar
Entry 99 | Date: 2026-03-12
Type: product audit
Status: complete

Purpose:
  Full idea bank synchronization + product roadmap generation.
  Extends Core Value Feature Audit (Entry 99, same session) to include all 15 ideas.

Scope:
  - All 15 ideas in IDEA_INDEX (6 existing + 9 new)
  - Scored on: USER_VALUE / INSTALL_DRIVER / MISSION_FIT / DATA_READINESS / IMPL_COST
  - Output: ranked TOP 10, product roadmap, next feature recommendation

Evidence level used:
  code-observed: data entities confirmed in schema
  reasoned-inference: complexity and dependency estimates from codebase inspection
  requires-telemetry: engagement metrics

Related files:
  - components/ideas/IDEA_INDEX.jsx
  - components/audits/product/core-value-feature-audit-2026-03-12.jsx (Entry 99 original)
  - components/governance/Phase25ExecutionLogIndex.jsx
*/

export const PRODUCT_INTELLIGENCE_AUDIT = {
  auditId: "product-intelligence-audit-2026-03-12",
  auditType: "product",
  date: "2026-03-12",
  entry: 99,
  status: "complete",

  // ─────────────────────────────────────────────────────────────────
  // SCORING FRAMEWORK
  // ─────────────────────────────────────────────────────────────────

  scoringFramework: {
    dimensions: {
      USER_VALUE:      "Direct utility to a fuel buyer (1=low, 5=high)",
      INSTALL_DRIVER:  "Would this feature make someone download/keep the app? (1–5)",
      MISSION_FIT:     "Alignment with 'help users buy cheaper fuel' (1–5)",
      DATA_READINESS:  "Can we build this with current data infrastructure? (1–5)",
      IMPL_COST:       "Inverse of complexity: 5=trivial, 1=very hard",
    },
    maxScore: 25,
    buildReadinessThreshold: 18,
  },

  // ─────────────────────────────────────────────────────────────────
  // FULL SCORING TABLE
  // ─────────────────────────────────────────────────────────────────

  scoringTable: [
    {
      id: "national-fuel-barometer",
      title: "Nasjonal drivstoffbarometer",
      USER_VALUE: 5,
      INSTALL_DRIVER: 4,
      MISSION_FIT: 5,
      DATA_READINESS: 5,
      IMPL_COST: 5,
      total: 24,
      buildReadiness: "ready",
      reasoning: "Uses existing NationalFuelBenchmark + SSBData. No new data or backend. Single widget answering the most common user question: 'Is now a good time to fill up?' Highest data_readiness of all candidates — can ship this week. Low-high indicator based on 30-day rolling average is a 1-day build.",
    },
    {
      id: "fuel-savings-tracker",
      title: "Hvor mye har du spart?",
      USER_VALUE: 5,
      INSTALL_DRIVER: 5,
      MISSION_FIT: 5,
      DATA_READINESS: 4,
      IMPL_COST: 4,
      total: 23,
      buildReadiness: "ready",
      reasoning: "Makes the core value proposition concrete. Data ready: user_reported FuelPrice + NationalFuelBenchmark. Retention hook: users return to see savings grow. Slight data_readiness deduction: requires sufficient user submissions to be meaningful (new users with zero reports see empty state).",
    },
    {
      id: "fill-historikk",
      title: "Min tankhistorikk",
      USER_VALUE: 5,
      INSTALL_DRIVER: 4,
      MISSION_FIT: 4,
      DATA_READINESS: 5,
      IMPL_COST: 5,
      total: 23,
      buildReadiness: "ready",
      reasoning: "Pure UI feature. All data already exists in FuelPrice entity (user_reported, created_by). Zero backend work. Habit-forming: gives users a reason to open the app even when not near a station. Prerequisite for bilokonomi-dashboard and tankradar-score.",
    },
    {
      id: "gamification-system",
      title: "Gamification 2.0 — Badges og milepæler",
      USER_VALUE: 3,
      INSTALL_DRIVER: 4,
      MISSION_FIT: 3,
      DATA_READINESS: 5,
      IMPL_COST: 5,
      total: 20,
      buildReadiness: "ready",
      reasoning: "Directly addresses Entry 95 remaining gaps. ContributionImpactCard + StreakCounter already exist — this extends them with persistent badges and progress countdown. Zero backend risk. High activation impact for contributors. Lower mission_fit because badges don't directly help users buy cheaper fuel.",
    },
    {
      id: "driver-leaderboard",
      title: "Lokal bidragsrangering",
      USER_VALUE: 3,
      INSTALL_DRIVER: 4,
      MISSION_FIT: 3,
      DATA_READINESS: 4,
      IMPL_COST: 5,
      total: 19,
      buildReadiness: "ready",
      reasoning: "Low complexity, direct crowdsourcing driver. Contribution count + region derivable from existing data. Privacy requirement (opt-in display) adds minor complexity. Mission fit is indirect — leaderboards don't help users find cheaper fuel, they incentivize data quality.",
    },
    {
      id: "fuel-price-heatmap",
      title: "Drivstoffpris-kart",
      USER_VALUE: 4,
      INSTALL_DRIVER: 4,
      MISSION_FIT: 4,
      DATA_READINESS: 3,
      IMPL_COST: 3,
      total: 18,
      buildReadiness: "partial",
      reasoning: "Regional heatmap MVP can be built with existing RegionalFuelBenchmark data and react-leaflet (already installed). Station-level pin layer blocked by partial GooglePlaces coverage. Regional-only MVP is feasible and visually compelling. Deduct for impl_cost: map rendering + tile layer adds complexity.",
    },
    {
      id: "price-war-alerts",
      title: "Bensinkrig varsler",
      USER_VALUE: 5,
      INSTALL_DRIVER: 5,
      MISSION_FIT: 5,
      DATA_READINESS: 2,
      IMPL_COST: 3,
      total: 20,
      buildReadiness: "blocked",
      reasoning: "Extremely compelling concept — price wars are exactly when users most need TankRadar. However: blocked by data readiness. Requires near-realtime station-level prices across sufficient stations. GooglePlaces coverage is partial. Cannot build meaningfully without more station-level data. High score but blocked.",
    },
    {
      id: "bilokonomi-dashboard",
      title: "Bilens økonomi-dashboard",
      USER_VALUE: 4,
      INSTALL_DRIVER: 4,
      MISSION_FIT: 4,
      DATA_READINESS: 3,
      IMPL_COST: 3,
      total: 18,
      buildReadiness: "dependent",
      reasoning: "High value for engaged users. Blocked by fill-historikk dependency. Must ship fill-historikk first. Requires user vehicle profile (new entity). Medium complexity. Phase 2 feature — build after fill-historikk.",
    },
    {
      id: "tankradar-score",
      title: "TankRadar-score",
      USER_VALUE: 3,
      INSTALL_DRIVER: 4,
      MISSION_FIT: 3,
      DATA_READINESS: 3,
      IMPL_COST: 4,
      total: 17,
      buildReadiness: "dependent",
      reasoning: "Strong gamification hook but depends on fuel-savings-tracker and gamification-system shipping first. Best as synthesis layer after Phase 1 features exist. Phase 2.",
    },
    {
      id: "route-fuel-intelligence",
      title: "Billigste drivstoff langs ruten",
      USER_VALUE: 5,
      INSTALL_DRIVER: 5,
      MISSION_FIT: 5,
      DATA_READINESS: 2,
      IMPL_COST: 1,
      total: 18,
      buildReadiness: "blocked",
      reasoning: "Maximum mission alignment. Hero feature for any fuel app. But: blocked by routing library, route calculation engine, and insufficient station-level price coverage. Phase 3.",
    },
    {
      id: "favorite-route-alerts",
      title: "Billigste varsel på din rute",
      USER_VALUE: 4,
      INSTALL_DRIVER: 4,
      MISSION_FIT: 4,
      DATA_READINESS: 2,
      IMPL_COST: 2,
      total: 16,
      buildReadiness: "blocked",
      reasoning: "Blocked by same routing layer as route-fuel-intelligence. Phase 3.",
    },
    {
      id: "price-drop-predictor",
      title: "Når lønner det seg å fylle?",
      USER_VALUE: 4,
      INSTALL_DRIVER: 5,
      MISSION_FIT: 5,
      DATA_READINESS: 1,
      IMPL_COST: 1,
      total: 16,
      buildReadiness: "blocked",
      reasoning: "Extremely compelling concept. Blocked by data volume: need 6+ months station-level history. Phase 4.",
    },
    {
      id: "receipt-import",
      title: "Samtykkebasert lesing av drivstoffkjøp",
      USER_VALUE: 3,
      INSTALL_DRIVER: 4,
      MISSION_FIT: 4,
      DATA_READINESS: 2,
      IMPL_COST: 2,
      total: 15,
      buildReadiness: "deferred",
      reasoning: "High privacy risk, store review complexity. Deferred pending privacy architecture.",
    },
    {
      id: "fleet-mode",
      title: "Flåtemodus for bedrifter",
      USER_VALUE: 5,
      INSTALL_DRIVER: 3,
      MISSION_FIT: 4,
      DATA_READINESS: 2,
      IMPL_COST: 1,
      total: 15,
      buildReadiness: "blocked",
      reasoning: "High value for B2B segment but requires org account model. Phase 4–5.",
    },
    {
      id: "fuel-data-api",
      title: "Drivstoffdata-API for utviklere",
      USER_VALUE: 2,
      INSTALL_DRIVER: 1,
      MISSION_FIT: 3,
      DATA_READINESS: 2,
      IMPL_COST: 3,
      total: 11,
      buildReadiness: "blocked",
      reasoning: "Monetization feature, not user-facing. Requires data quality maturity. Phase 5.",
    },
  ],

  // ─────────────────────────────────────────────────────────────────
  // TOP 10 RANKED LIST
  // ─────────────────────────────────────────────────────────────────

  top10Ranked: [
    { rank: 1,  id: "national-fuel-barometer", score: 24, status: "BUILD-READY",  note: "Highest score. No new infrastructure. Build this week." },
    { rank: 2,  id: "fuel-savings-tracker",    score: 23, status: "BUILD-READY",  note: "Core value proposition made visible. Strongest retention hook." },
    { rank: 3,  id: "fill-historikk",          score: 23, status: "BUILD-READY",  note: "Zero new infrastructure. Prerequisite for 3 other features." },
    { rank: 4,  id: "price-war-alerts",        score: 20, status: "BLOCKED",      note: "Would rank #1 if data coverage were sufficient. Monitor." },
    { rank: 5,  id: "gamification-system",     score: 20, status: "BUILD-READY",  note: "Low effort, closes Entry 95 gaps. Addresses remaining engagement blockers." },
    { rank: 6,  id: "driver-leaderboard",      score: 19, status: "BUILD-READY",  note: "Fast build. Crowdsourcing driver. Privacy plan required." },
    { rank: 7,  id: "fuel-price-heatmap",      score: 18, status: "PARTIAL",      note: "Regional MVP buildable now. Station-level blocked." },
    { rank: 8,  id: "bilokonomi-dashboard",    score: 18, status: "DEPENDENT",    note: "Ship fill-historikk first." },
    { rank: 9,  id: "route-fuel-intelligence", score: 18, status: "BLOCKED",      note: "Hero feature for Phase 3. Data infrastructure first." },
    { rank: 10, id: "tankradar-score",         score: 17, status: "DEPENDENT",    note: "Synthesis layer — ship fuel-savings-tracker + gamification first." },
  ],

  // ─────────────────────────────────────────────────────────────────
  // NEXT FEATURE RECOMMENDATION
  // ─────────────────────────────────────────────────────────────────

  nextFeatureRecommendation: {
    primary: "national-fuel-barometer",
    rationale: [
      "Highest composite score (24/25)",
      "No new entities, no new backend functions, no external APIs",
      "Uses existing NationalFuelBenchmark + SSBData (already populated)",
      "react-leaflet not needed — pure widget",
      "Answers the #1 user question: 'Is now a good time to fill up?'",
      "Highest dashboard activation impact of all build-ready features",
      "Estimated build time: 1 day",
      "Zero frozen file risk",
    ],
    secondary: "fill-historikk",
    secondaryRationale: "Also zero infrastructure cost. Unlocks bilokonomi-dashboard and tankradar-score. Build immediately after barometer.",
    tertiary: "fuel-savings-tracker",
    tertiaryRationale: "Highest install-driver score. Strongest retention hook. Build as Phase 1 completion after barometer + historikk.",
  },

  // ─────────────────────────────────────────────────────────────────
  // PRODUCT ROADMAP
  // ─────────────────────────────────────────────────────────────────

  roadmap: {
    phase1: {
      title: "Engagement & Value Visibility",
      theme: "Show users the value of TankRadar immediately",
      features: [
        { id: "national-fuel-barometer", effort: "1 day",  priority: "FIRST" },
        { id: "fill-historikk",          effort: "1–2 days", priority: "SECOND" },
        { id: "fuel-savings-tracker",    effort: "2–3 days", priority: "THIRD" },
        { id: "gamification-system",     effort: "2–3 days", priority: "FOURTH" },
        { id: "driver-leaderboard",      effort: "2 days",   priority: "FIFTH" },
      ],
      estimatedTotalEffort: "9–11 days",
      expectedOutcome: "Users see concrete value on first open. Retention improves. Crowdsourcing drives increase.",
    },
    phase2: {
      title: "Visualization & Personal Analytics",
      theme: "Make fuel spending tangible and comparable",
      features: [
        { id: "bilokonomi-dashboard", effort: "3–4 days", dependency: "fill-historikk" },
        { id: "fuel-price-heatmap",   effort: "3–4 days", dependency: "regional-benchmarks" },
        { id: "tankradar-score",      effort: "2–3 days", dependency: "fuel-savings-tracker + gamification-system" },
        { id: "price-war-alerts",     effort: "3–5 days", dependency: "station-level-coverage-improvement" },
      ],
      estimatedTotalEffort: "11–16 days",
      expectedOutcome: "Power users have rich personal analytics. Map view drives organic discovery and sharing.",
    },
    phase3: {
      title: "Route Intelligence",
      theme: "Help users plan cheaper fuel stops",
      features: [
        { id: "route-fuel-intelligence", effort: "5–8 days", dependency: "route-calculation-library + station-level-prices" },
        { id: "favorite-route-alerts",   effort: "3–5 days", dependency: "route-fuel-intelligence" },
      ],
      estimatedTotalEffort: "8–13 days",
      expectedOutcome: "TankRadar becomes the go-to tool for planning road trips and commutes.",
      note: "Unblock requires: (1) station-level coverage >70% nationally, (2) routing library decision.",
    },
    phase4: {
      title: "Predictive Pricing",
      theme: "Tell users when to fill up before they ask",
      features: [
        { id: "price-drop-predictor", effort: "5–10 days", dependency: "6-months-historical-station-level-data" },
        { id: "fleet-mode",           effort: "10–15 days", dependency: "org-account-model + premium-tier" },
        { id: "receipt-import",       effort: "5–8 days",   dependency: "privacy-architecture-review" },
      ],
      estimatedTotalEffort: "20–33 days",
      expectedOutcome: "TankRadar becomes predictive. Fleet mode opens B2B revenue. Receipt import automates crowdsourcing.",
      note: "Phase 4 requires mature data pipeline and legal review before start.",
    },
    phase5: {
      title: "Monetization & Data Platform",
      theme: "Commercialize the data asset",
      features: [
        { id: "fuel-data-api", effort: "5–8 days", dependency: "data-quality-maturity + api-key-management + legal-terms" },
      ],
      estimatedTotalEffort: "5–8 days",
      expectedOutcome: "Recurring API revenue. Data quality improves via consumer feedback loop.",
      note: "Phase 5 requires: (1) clean national coverage, (2) legal data terms, (3) commercial billing infrastructure.",
    },
  },

  // ─────────────────────────────────────────────────────────────────
  // GOVERNANCE
  // ─────────────────────────────────────────────────────────────────

  // ─────────────────────────────────────────────────────────────────
  // AUDIT UPDATE — POST IDEA EXPANSION (Entry 99 v2, 2026-03-12)
  // ─────────────────────────────────────────────────────────────────

  auditUpdate_postIdeaExpansion: {
    updateDate: "2026-03-12",
    trigger: "User task: verify strategic ideas, rescore, confirm next feature",
    verificationMethod: "Direct repository file inspection — no memory/snapshot assumed",

    strategicIdeasVerified: [
      { id: "price-war-alerts",     existedBefore: true,  status_before: "candidate", status_after: "audited", score: 20, buildReadiness: "blocked" },
      { id: "fuel-savings-tracker", existedBefore: true,  status_before: "audited",   status_after: "audited", score: 23, buildReadiness: "ready" },
      { id: "route-fuel-intelligence", existedBefore: true, status_before: "audited", status_after: "audited", score: 18, buildReadiness: "blocked" },
      { id: "fill-historikk",       existedBefore: true,  status_before: "candidate", status_after: "audited", score: 23, buildReadiness: "ready" },
      { id: "bilokonomi-dashboard", existedBefore: true,  status_before: "candidate", status_after: "audited", score: 18, buildReadiness: "dependent" },
    ],

    newIdeasCreated: "NONE — all 5 strategic ideas already existed from previous session",

    updatedTop10: [
      { rank: 1,  id: "national-fuel-barometer", score: 24, buildStatus: "BUILD-READY",  note: "Highest score. No new infrastructure. Build this week." },
      { rank: 2,  id: "fuel-savings-tracker",    score: 23, buildStatus: "BUILD-READY",  note: "Core value proposition made visible. Strongest retention hook." },
      { rank: 3,  id: "fill-historikk",          score: 23, buildStatus: "BUILD-READY",  note: "Zero infrastructure. Prerequisite for bilokonomi + tankradar-score." },
      { rank: 4,  id: "price-war-alerts",        score: 20, buildStatus: "BLOCKED",      note: "Would rank #1 if station-level data coverage were sufficient." },
      { rank: 5,  id: "gamification-system",     score: 20, buildStatus: "BUILD-READY",  note: "Closes Entry 95 engagement gaps. Low effort." },
      { rank: 6,  id: "driver-leaderboard",      score: 19, buildStatus: "BUILD-READY",  note: "Fast build. Privacy plan required." },
      { rank: 7,  id: "fuel-price-heatmap",      score: 18, buildStatus: "PARTIAL",      note: "Regional MVP buildable. Station-level blocked." },
      { rank: 8,  id: "bilokonomi-dashboard",    score: 18, buildStatus: "DEPENDENT",    note: "Build after fill-historikk." },
      { rank: 9,  id: "route-fuel-intelligence", score: 18, buildStatus: "BLOCKED",      note: "Hero feature. Phase 3 — data infrastructure first." },
      { rank: 10, id: "tankradar-score",         score: 17, buildStatus: "DEPENDENT",    note: "Synthesis layer — ship fuel-savings-tracker + gamification first." },
    ],

    nextFeatureConfirmed: {
      feature: "national-fuel-barometer",
      score: 24,
      rationale: "Unchanged from v1. Highest score, lowest effort, zero new infrastructure, highest dashboard activation impact.",
      buildSequence: [
        "1. national-fuel-barometer  (1 day)",
        "2. fill-historikk           (1–2 days)",
        "3. fuel-savings-tracker     (2–3 days)",
        "4. gamification-system      (2–3 days)",
        "5. driver-leaderboard       (2 days)",
      ],
    },

    updatedRoadmap: {
      phase1: {
        title: "Engagement & Value Visibility",
        features: ["national-fuel-barometer", "fill-historikk", "fuel-savings-tracker", "gamification-system", "driver-leaderboard"],
        effort: "9–11 days",
      },
      phase2: {
        title: "Visualization & Personal Analytics",
        features: ["bilokonomi-dashboard", "fuel-price-heatmap", "tankradar-score", "price-war-alerts"],
        effort: "11–16 days",
        note: "price-war-alerts unblocked when station-level coverage improves",
      },
      phase3: {
        title: "Route Intelligence",
        features: ["route-fuel-intelligence", "favorite-route-alerts"],
        effort: "8–13 days",
      },
      phase4: {
        title: "Predictive Pricing + B2B",
        features: ["price-drop-predictor", "fleet-mode", "receipt-import"],
        effort: "20–33 days",
      },
      phase5: {
        title: "Monetization & Data Platform",
        features: ["fuel-data-api"],
        effort: "5–8 days",
      },
    },

    ideasSummary: {
      total: 15,
      audited: 11,
      candidate: 4,
      buildReady: 5,
      blocked: 4,
      dependent: 2,
      deferred: 1,
    },
  },

  governanceNotes: {
    auditIsReadOnly: true,
    noCodeChanges: true,
    ideasUpdated: [
      "components/ideas/IDEA_INDEX.jsx — updated with 15 ideas, scores, phase map",
      "9 new idea files created in components/ideas/",
    ],
    frozenFilesModified: "NONE",
    governanceFilesModified: "NONE",
    matchingEngineModified: "NONE",
    executionLogEntry: "To be appended as Entry 99 in Phase25ExecutionLog_007",
  },
};

export default PRODUCT_INTELLIGENCE_AUDIT;