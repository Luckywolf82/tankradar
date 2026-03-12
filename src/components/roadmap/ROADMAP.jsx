/*
TANKRADAR PRODUCT ROADMAP
Dynamic roadmap — managed by AI Product Brain prompt.
Last updated: 2026-03-12 (Entry 100 — AI Product Brain pass)

Scoring model (TankRadar weighted):
  USER_VALUE           0.30
  DATA_QUALITY         0.20
  ADMIN_UI_IMPORTANCE  0.15
  INSTALL_DRIVER       0.20
  IMPLEMENTATION_COST  0.15

Score range: 0–5 per dimension → weighted total out of 5.0 → ×5 for display scale out of 25.

Data source: Direct repository inspection of IDEA_INDEX, product-intelligence-audit-2026-03-12,
NextSafeStep, admin components, and governance log.
*/

export const ROADMAP = {

  meta: {
    version: "3.0",
    updatedAt: "2026-03-12",
    updatedBy: "AI Product Brain — Entry 100",
    scoringModel: "TankRadar Weighted (USER_VALUE×0.30 + DATA_QUALITY×0.20 + ADMIN_UI_IMPORTANCE×0.15 + INSTALL_DRIVER×0.20 + IMPLEMENTATION_COST×0.15)",
    totalIdeasScored: 15,
    buildReadyCount: 5,
    blockedCount: 5,
    dependentCount: 2,
    deferredCount: 1,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // FULL SCORING TABLE
  // Raw scores (1–5) per dimension, weighted total (out of 5.0), scaled to 25
  // ─────────────────────────────────────────────────────────────────────────

  scoringTable: [
    {
      id: "national-fuel-barometer",
      title: "Nasjonal drivstoffbarometer",
      USER_VALUE: 5,          // Answers #1 user question at a glance
      DATA_QUALITY: 3,        // Reads existing data, no quality improvement
      ADMIN_UI_IMPORTANCE: 1, // Not an admin tool
      INSTALL_DRIVER: 4,      // Visual hook, shareable insight
      IMPLEMENTATION_COST: 5, // 1-day build, zero new infrastructure
      weightedTotal: 3.80,
      scaledScore: 19.0,
      buildStatus: "BUILD-READY",
      phase: 1,
    },
    {
      id: "fuel-savings-tracker",
      title: "Hvor mye har du spart?",
      USER_VALUE: 5,          // Makes core value proposition concrete
      DATA_QUALITY: 2,        // Reads data, doesn't improve it
      ADMIN_UI_IMPORTANCE: 1,
      INSTALL_DRIVER: 5,      // Strongest retention + sharing hook
      IMPLEMENTATION_COST: 4, // 2–3 days, needs sufficient user reports
      weightedTotal: 3.65,
      scaledScore: 18.25,
      buildStatus: "BUILD-READY",
      phase: 1,
    },
    {
      id: "fill-historikk",
      title: "Min tankhistorikk",
      USER_VALUE: 5,          // Habit-forming, personal log
      DATA_QUALITY: 2,
      ADMIN_UI_IMPORTANCE: 1,
      INSTALL_DRIVER: 4,
      IMPLEMENTATION_COST: 5, // Zero backend — data already in FuelPrice entity
      weightedTotal: 3.60,
      scaledScore: 18.0,
      buildStatus: "BUILD-READY",
      phase: 1,
    },
    {
      id: "price-war-alerts",
      title: "Bensinkrig varsler",
      USER_VALUE: 5,          // Peak relevance — when it matters most
      DATA_QUALITY: 2,
      ADMIN_UI_IMPORTANCE: 1,
      INSTALL_DRIVER: 5,      // Push notifications = #1 install retention hook
      IMPLEMENTATION_COST: 3,
      weightedTotal: 3.50,
      scaledScore: 17.5,
      buildStatus: "BLOCKED",
      blockingReason: "Requires near-realtime station-level prices with sufficient national coverage",
      phase: 2,
    },
    {
      id: "driver-leaderboard",
      title: "Lokal bidragsrangering",
      USER_VALUE: 3,
      DATA_QUALITY: 3,        // Drives contributions → improves data quality
      ADMIN_UI_IMPORTANCE: 1,
      INSTALL_DRIVER: 4,
      IMPLEMENTATION_COST: 5,
      weightedTotal: 3.20,
      scaledScore: 16.0,
      buildStatus: "BUILD-READY",
      phase: 1,
    },
    {
      id: "fuel-price-heatmap",
      title: "Drivstoffpris-kart",
      USER_VALUE: 4,
      DATA_QUALITY: 2,
      ADMIN_UI_IMPORTANCE: 2, // Useful for coverage visualization in admin
      INSTALL_DRIVER: 4,
      IMPLEMENTATION_COST: 3,
      weightedTotal: 3.15,
      scaledScore: 15.75,
      buildStatus: "PARTIAL",
      note: "Regional MVP buildable with RegionalFuelBenchmark + react-leaflet. Station pins blocked by partial GooglePlaces coverage.",
      phase: 2,
    },
    {
      id: "route-fuel-intelligence",
      title: "Billigste drivstoff langs ruten",
      USER_VALUE: 5,          // Hero feature
      DATA_QUALITY: 1,
      ADMIN_UI_IMPORTANCE: 1,
      INSTALL_DRIVER: 5,
      IMPLEMENTATION_COST: 1, // Requires route engine + full station coverage
      weightedTotal: 3.00,
      scaledScore: 15.0,
      buildStatus: "BLOCKED",
      blockingReason: "Requires route calculation library + station-level coverage >70% nationally",
      phase: 3,
    },
    {
      id: "gamification-system",
      title: "Gamification 2.0 — Badges og milepæler",
      USER_VALUE: 3,
      DATA_QUALITY: 2,
      ADMIN_UI_IMPORTANCE: 1,
      INSTALL_DRIVER: 4,
      IMPLEMENTATION_COST: 5,
      weightedTotal: 3.00,
      scaledScore: 15.0,
      buildStatus: "BUILD-READY",
      note: "ContributionImpactCard + StreakCounter already exist. Extends them with persistent badges.",
      phase: 1,
    },
    {
      id: "receipt-import",
      title: "Samtykkebasert lesing av drivstoffkjøp",
      USER_VALUE: 3,
      DATA_QUALITY: 4,        // Strong crowdsourcing quality improvement
      ADMIN_UI_IMPORTANCE: 1,
      INSTALL_DRIVER: 4,
      IMPLEMENTATION_COST: 2,
      weightedTotal: 2.95,
      scaledScore: 14.75,
      buildStatus: "DEFERRED",
      deferReason: "High privacy risk, store review complexity, OCR pipeline not implemented",
      phase: 4,
    },
    {
      id: "bilokonomi-dashboard",
      title: "Bilens økonomi-dashboard",
      USER_VALUE: 4,
      DATA_QUALITY: 1,
      ADMIN_UI_IMPORTANCE: 1,
      INSTALL_DRIVER: 4,
      IMPLEMENTATION_COST: 3,
      weightedTotal: 2.80,
      scaledScore: 14.0,
      buildStatus: "DEPENDENT",
      dependsOn: ["fill-historikk"],
      phase: 2,
    },
    {
      id: "fleet-mode",
      title: "Flåtemodus for bedrifter",
      USER_VALUE: 5,
      DATA_QUALITY: 1,
      ADMIN_UI_IMPORTANCE: 2,
      INSTALL_DRIVER: 3,
      IMPLEMENTATION_COST: 1,
      weightedTotal: 2.75,
      scaledScore: 13.75,
      buildStatus: "BLOCKED",
      blockingReason: "Requires org account model, multi-vehicle profiles, premium tier",
      phase: 4,
    },
    {
      id: "price-drop-predictor",
      title: "Når lønner det seg å fylle?",
      USER_VALUE: 4,
      DATA_QUALITY: 1,
      ADMIN_UI_IMPORTANCE: 1,
      INSTALL_DRIVER: 5,
      IMPLEMENTATION_COST: 1,
      weightedTotal: 2.70,
      scaledScore: 13.5,
      buildStatus: "BLOCKED",
      blockingReason: "Requires 6+ months station-level historical data — not yet available",
      phase: 4,
    },
    {
      id: "tankradar-score",
      title: "TankRadar-score",
      USER_VALUE: 3,
      DATA_QUALITY: 1,
      ADMIN_UI_IMPORTANCE: 1,
      INSTALL_DRIVER: 4,
      IMPLEMENTATION_COST: 4,
      weightedTotal: 2.65,
      scaledScore: 13.25,
      buildStatus: "DEPENDENT",
      dependsOn: ["fuel-savings-tracker", "gamification-system"],
      phase: 2,
    },
    {
      id: "favorite-route-alerts",
      title: "Billigste varsel på din rute",
      USER_VALUE: 4,
      DATA_QUALITY: 1,
      ADMIN_UI_IMPORTANCE: 1,
      INSTALL_DRIVER: 4,
      IMPLEMENTATION_COST: 2,
      weightedTotal: 2.65,
      scaledScore: 13.25,
      buildStatus: "BLOCKED",
      blockingReason: "Blocked by same routing layer as route-fuel-intelligence",
      phase: 3,
    },
    {
      id: "fuel-data-api",
      title: "Drivstoffdata-API for utviklere",
      USER_VALUE: 2,
      DATA_QUALITY: 3,
      ADMIN_UI_IMPORTANCE: 1,
      INSTALL_DRIVER: 1,
      IMPLEMENTATION_COST: 3,
      weightedTotal: 2.00,
      scaledScore: 10.0,
      buildStatus: "BLOCKED",
      blockingReason: "Requires data quality maturity, legal data terms, commercial billing",
      phase: 5,
    },
  ],

  // ─────────────────────────────────────────────────────────────────────────
  // TOP 10 HIGHEST-VALUE FEATURES
  // ─────────────────────────────────────────────────────────────────────────

  top10: [
    { rank: 1,  id: "national-fuel-barometer", score: 19.0, buildStatus: "BUILD-READY",  action: "BUILD THIS WEEK" },
    { rank: 2,  id: "fuel-savings-tracker",    score: 18.25, buildStatus: "BUILD-READY", action: "BUILD — Phase 1, after barometer" },
    { rank: 3,  id: "fill-historikk",          score: 18.0,  buildStatus: "BUILD-READY", action: "BUILD — Phase 1, unlocks 3 dependents" },
    { rank: 4,  id: "price-war-alerts",        score: 17.5,  buildStatus: "BLOCKED",     action: "MONITOR — unblocks when coverage improves" },
    { rank: 5,  id: "driver-leaderboard",      score: 16.0,  buildStatus: "BUILD-READY", action: "BUILD — Phase 1, low effort" },
    { rank: 6,  id: "fuel-price-heatmap",      score: 15.75, buildStatus: "PARTIAL",     action: "BUILD regional MVP only" },
    { rank: 7,  id: "route-fuel-intelligence", score: 15.0,  buildStatus: "BLOCKED",     action: "PHASE 3 hero feature — plan infrastructure" },
    { rank: 8,  id: "gamification-system",     score: 15.0,  buildStatus: "BUILD-READY", action: "BUILD — Phase 1, extends existing components" },
    { rank: 9,  id: "receipt-import",          score: 14.75, buildStatus: "DEFERRED",    action: "DEFERRED — privacy architecture first" },
    { rank: 10, id: "bilokonomi-dashboard",    score: 14.0,  buildStatus: "DEPENDENT",   action: "AFTER fill-historikk ships" },
  ],

  // ─────────────────────────────────────────────────────────────────────────
  // RECOMMENDED NEXT FEATURE
  // ─────────────────────────────────────────────────────────────────────────

  nextFeature: {
    recommended: "national-fuel-barometer",
    score: 19.0,
    rationale: [
      "Highest weighted score in TankRadar model (19.0 / 25)",
      "Zero new infrastructure — uses existing NationalFuelBenchmark + SSBData entities",
      "No new backend functions, no new entities, no external API calls",
      "Answers the #1 user question: 'Is now a good time to fill up?'",
      "Estimated build time: 1 day (single dashboard widget)",
      "Zero frozen-file risk",
      "Highest activation impact of all build-ready features",
      "Independently confirmed as #1 priority by product-intelligence-audit-2026-03-12 (score 24/25 on that model)",
    ],
    buildSequence: [
      "1. national-fuel-barometer  — 1 day     — Highest score, zero infra, dashboard widget",
      "2. fill-historikk           — 1–2 days  — Pure UI, unlocks bilokonomi + tankradar-score",
      "3. fuel-savings-tracker     — 2–3 days  — Strongest retention hook, makes value visible",
      "4. gamification-system      — 2–3 days  — Closes Entry 95 engagement gaps",
      "5. driver-leaderboard       — 2 days    — Crowdsourcing driver, privacy plan required",
    ],
    phase1EstimatedEffort: "9–11 days",
  },

  // ─────────────────────────────────────────────────────────────────────────
  // PHASE STRUCTURE (stable — do not reorder phases)
  // ─────────────────────────────────────────────────────────────────────────

  phases: {
    phase1: {
      title: "Engagement & Value Visibility",
      theme: "Show users the value of TankRadar immediately",
      features: [
        { id: "national-fuel-barometer", priority: "FIRST",  effort: "1 day",    status: "BUILD-READY" },
        { id: "fill-historikk",          priority: "SECOND", effort: "1–2 days", status: "BUILD-READY" },
        { id: "fuel-savings-tracker",    priority: "THIRD",  effort: "2–3 days", status: "BUILD-READY" },
        { id: "gamification-system",     priority: "FOURTH", effort: "2–3 days", status: "BUILD-READY" },
        { id: "driver-leaderboard",      priority: "FIFTH",  effort: "2 days",   status: "BUILD-READY" },
      ],
      totalEffort: "9–11 days",
      expectedOutcome: "Users see concrete value on first open. Retention improves. Crowdsourcing participation increases.",
    },
    phase2: {
      title: "Visualization & Personal Analytics",
      theme: "Make fuel spending tangible and comparable",
      features: [
        { id: "bilokonomi-dashboard", effort: "3–4 days", status: "DEPENDENT", dependsOn: "fill-historikk" },
        { id: "fuel-price-heatmap",   effort: "3–4 days", status: "PARTIAL",   note: "Regional MVP only" },
        { id: "tankradar-score",      effort: "2–3 days", status: "DEPENDENT", dependsOn: "fuel-savings-tracker + gamification-system" },
        { id: "price-war-alerts",     effort: "3–5 days", status: "BLOCKED",   dependsOn: "station-level-coverage-improvement" },
      ],
      totalEffort: "11–16 days",
      expectedOutcome: "Power users have rich personal analytics. Map view drives organic discovery and sharing.",
    },
    phase3: {
      title: "Route Intelligence",
      theme: "Help users plan cheaper fuel stops",
      features: [
        { id: "route-fuel-intelligence", effort: "5–8 days",  status: "BLOCKED", dependsOn: "route-library + station-level coverage >70%" },
        { id: "favorite-route-alerts",   effort: "3–5 days",  status: "BLOCKED", dependsOn: "route-fuel-intelligence" },
      ],
      totalEffort: "8–13 days",
      expectedOutcome: "TankRadar becomes the go-to tool for road trips and commute planning.",
      unblockConditions: "station-level coverage >70% nationally + routing library decision",
    },
    phase4: {
      title: "Predictive Pricing + B2B",
      theme: "Tell users when to fill up before they ask",
      features: [
        { id: "price-drop-predictor", effort: "5–10 days",  status: "BLOCKED",  dependsOn: "6-months station-level historical data" },
        { id: "fleet-mode",           effort: "10–15 days", status: "BLOCKED",  dependsOn: "org account model + premium tier" },
        { id: "receipt-import",       effort: "5–8 days",   status: "DEFERRED", dependsOn: "privacy architecture review" },
      ],
      totalEffort: "20–33 days",
      expectedOutcome: "TankRadar becomes predictive. Fleet mode opens B2B revenue stream.",
    },
    phase5: {
      title: "Monetization & Data Platform",
      theme: "Commercialize the data asset",
      features: [
        { id: "fuel-data-api", effort: "5–8 days", status: "BLOCKED", dependsOn: "data quality maturity + legal terms + billing infrastructure" },
      ],
      totalEffort: "5–8 days",
      expectedOutcome: "Recurring API revenue. Data quality improves via consumer feedback loop.",
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // ADMIN UI GAPS
  // ─────────────────────────────────────────────────────────────────────────

  adminUiGaps: {
    assessment: "Admin UI is substantially complete. SuperAdmin refactored to 5-tab hub (Entry 100).",
    completedWorkflows: [
      "Station review queue — AdminReviewWorkbench (Operations tab)",
      "Duplicate detection + remediation — DuplicateWorkbench (Data Quality tab)",
      "System health + data source status — SystemHealthDashboard (Data Quality tab)",
      "Phase 2 matching verification — Phase2MatchingPreviewPanel + AuditPanel + TestHarness (Matching Lab tab)",
      "Archive / diagnostic report links — Archive tab",
      "Station discovery queue — StationDiscoveryQueue (Overview tab)",
    ],
    identifiedGaps: [
      {
        gap: "AdminOperationsPanel not surfaced in new SuperAdmin tabs",
        severity: "medium",
        description: "The collapsible OPERATIONS / DATA QUALITY / ANALYSIS / DANGER ZONE panel (bulk pipeline operations, geocode batch, apply reclassifications) is not linked from any SuperAdmin tab. These are admin-critical bulk actions.",
        recommendation: "Add AdminOperationsPanel to the Operations tab in SuperAdmin, below the AdminReviewWorkbench links",
      },
      {
        gap: "MasteringMetrics not surfaced in new SuperAdmin tabs",
        severity: "medium",
        description: "MasteringMetrics (chain completeness, city/address gaps, candidate + review breakdowns, CSV/JSON export) exists but is not linked from SuperAdmin.",
        recommendation: "Add MasteringMetrics link or embed in Data Quality tab",
      },
      {
        gap: "ChainUnconfirmedManualReviewUI not linked from Operations tab",
        severity: "low",
        description: "The chain_unconfirmed manual review workflow exists as a component but has no path from SuperAdmin.",
        recommendation: "Add link in Operations tab under 'Stasjonsdrift' section",
      },
      {
        gap: "No quick stats on StationReview pending count in Overview",
        severity: "low",
        description: "ReviewQueueSummary only shows FuelPrice review_needed count. StationReview pending count is not visible in Overview.",
        recommendation: "Extend ReviewQueueSummary or add a second metric card in Overview tab",
      },
    ],
    priorityFix: "Add AdminOperationsPanel to SuperAdmin Operations tab — bulk pipeline tools are critical for data governance",
  },

  // ─────────────────────────────────────────────────────────────────────────
  // NEWLY DETECTED IDEAS
  // ─────────────────────────────────────────────────────────────────────────

  newIdeasDetected: [
    {
      id: "admin-operations-panel-integration",
      type: "admin-infrastructure",
      description: "AdminOperationsPanel and MasteringMetrics are built but not surfaced in the new SuperAdmin tab structure. This is not a new product feature but an admin UI integration gap.",
      action: "Integrate into SuperAdmin without creating new idea file — this is a UI wiring task, not a product idea.",
    },
    // No new user-facing product ideas detected in this pass.
    // All 15 ideas in IDEA_INDEX are accounted for and scored.
  ],

  // ─────────────────────────────────────────────────────────────────────────
  // GOVERNANCE
  // ─────────────────────────────────────────────────────────────────────────

  governance: {
    sourceFiles: [
      "components/ideas/IDEA_INDEX.jsx",
      "components/audits/product/product-intelligence-audit-2026-03-12.jsx",
      "components/governance/NextSafeStep.jsx",
      "components/admin/AdminOperationsPanel.jsx",
      "components/admin/MasteringMetrics.jsx",
      "components/admin/AdminReviewWorkbench.jsx",
      "components/admin/DuplicateWorkbench.jsx",
      "components/admin/SystemHealthDashboard.jsx",
      "pages/SuperAdmin.jsx",
    ],
    verificationMethod: "Direct file inspection — no memory or snapshot assumed",
    frozenFilesModified: "NONE",
    codeChangesInThisPass: "NONE — roadmap document only",
  },
};

export default ROADMAP;