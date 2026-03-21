// NEXT SAFE STEP — TankRadar canonical implementation queue
// This file defines the single approved next development step.
// AI agents MUST read this file before proposing any new implementation.

export const NEXT_SAFE_STEP = {
  id: "phase25_step_91",

  title: "Activation & Contribution Loop Audit — Next Safe Workstream",

  description:
    "Entry 88 (NextSafeStep Governance Audit): Repository state analyzed across completed execution log entries (82–87A), " +
    "audit system, idea bank, and UI pages. Findings: All core UI functional (Entry 82), comprehensive audits in place (Entries 83–86), " +
    "audit system expanded to 9 categories (Entry 87), idea bank with 6 candidate ideas created (Entry 87-A). " +
    "DECISION: Next safe step is ACTIVATION AUDIT of first-value experience and price-reporting contribution loop. " +
    "Why: (1) Low risk — pure analysis, no code changes; (2) High impact — Entry 86 identified activation as critical to crowdsourcing; " +
    "(3) Directly actionable — findings can drive immediate engagement improvements; (4) Unblocked — no infrastructure dependencies; " +
    "(5) Aligns with roadmap — Entry 85 deferred advanced analytics; Entry 86 recommended activation focus. " +
    "Recommended audit category: activation (user onboarding friction, time-to-first-contribution, engagement mechanics). " +
    "Audit should analyze: (a) LogPrice 4-step flow efficiency; (b) SubmitPriceCard CTA effectiveness; (c) PumpModeCard contextual triggering; " +
    "(d) ContributionImpactCard gamification; (e) Onboarding clarity + feature discovery + first-value realization timeline. " +
    "No code changes proposed. Ready for explicit user direction to proceed with audit or request alternative workstream.",

  files: [],

  goals: [
    "Activate Governance Audit workflow: Audit System → Idea Bank → Product Ideas",
    "Analyze first-value experience and contribution loop per activation audit category",
    "Identify friction points + optimization opportunities in LogPrice flow + Dashboard CTAs",
    "Generate actionable findings for product team to drive engagement + crowdsourcing participation"
  ],

  constraints: [
    "do NOT implement features — audit analysis only",
    "do NOT modify frozen Phase-2 matching engine files",
    "do NOT change runtime business logic",
    "do NOT bundle with other workstreams"
  ],

  recommendedAuditType: "activation",

  // AUDIT COMPLETED — Entry 91 — See Phase25ExecutionLog_007.jsx for full findings
  auditFocusAreas: [
    "LogPrice workflow: 4-step efficiency, AI extraction robustness, station matching accuracy ✓ ANALYZED",
    "SubmitPriceCard CTA: copy effectiveness, color/positioning, tap-through rate optimization ✓ ANALYZED",
    "PumpModeCard: proximity detection trigger clarity, onboarding messaging ✓ ANALYZED",
    "ContributionImpactCard: impact calculation transparency, gamification mechanics, streak mechanics ✓ ANALYZED",
    "First-value realization: how quickly can new user see their contribution matter? ✓ ANALYZED",
    "Feature discovery: how do users learn about LogPrice, PumpMode, Alerts? ✓ ANALYZED",
    "Retention drivers: what keeps users coming back daily/weekly to report prices? ✓ ANALYZED"
  ],

  // ═══════════════════════════════════════════════════════════════════════════════
  // NEXT SAFE STEP (ENTRY 92)
  // ═══════════════════════════════════════════════════════════════════════════════

  nextSafeStepEntry92: {
    id: "phase25_step_92",
    title: "Activation Improvements Implementation — CTA Optimization & Engagement Features",
    description:
      "Implement highest-impact improvements from Entry 91 activation audit. " +
      "Focus on quick-win UI optimizations + low-complexity engagement features. " +
      "Skip premium complexity features (push notifications, advanced leaderboards) for post-MVP iteration.",
    scope: [
      "Reposition SubmitPriceCard to Dashboard position 1 (above PumpModeCard)",
      "Enhance SubmitPriceCard CTA copy with value-focused messaging",
      "Add first-time user onboarding overlay",
      "Add streak counter to ContributionImpactCard ('Day N contributor')",
      "Add impact transparency tooltip ('How is impact calculated?')",
      "A/B test CTA variants (copy + position + overlay impact)"
    ],
    complexity: "LOW–MEDIUM",
    runtimeImpact: "MINIMAL — UI reordering + onboarding overlay + component enhancements only",
    estimatedEffort: "2–4 days",
    blockingIssues: "NONE",
    frozenFilesImpact: "ZERO — no Phase 2 matching engine files modified",
    expectedOutcome: "Enhanced activation flow; estimated +25–50% LogPrice tap-through from repositioning + copy; +25% repeat submissions from streak feature"
  }

  governanceRule: {
    preflightOrder: [
      "1. Read Phase25ExecutionLogIndex.jsx",
      "2. Read the active execution log chunk (check chunks[] for ACTIVE status)",
      "3. Read NextSafeStep.jsx (this file)"
    ],
    priority:
      "If NEXT_SAFE_STEP is defined here, AI must implement it before proposing any other step " +
      "unless the user explicitly overrides it in the conversation.",
    conflictResolution:
      "Phase25ExecutionLogIndex.jsx + active chunk are authoritative. " +
      "Always verify activeChunk field in Index before appending — do not assume chunk number."
  },

  status: "implementation_complete",
  approvedDate: "2026-03-11T20:15:00Z",
  auditDate: "2026-03-11T21:30:00Z",
  implementationDate: "2026-03-11T22:00:00Z",
  governanceAuditEntry: 91,
  implementationEntry: 92,
  completedEntries: [82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 105, 106, 107, 108, 109],
  readyForNextStep: true,

  // ═══════════════════════════════════════════════════════════════════════════════
  // NEXT SAFE STEP (ENTRY 93) — ACTIVATION IMPACT REVIEW
  // ═══════════════════════════════════════════════════════════════════════════════

  nextSafeStepEntry98: {
    id: "phase25_step_98",
    title: "Governance Conflict Resolution Pass",
    description:
      "Resolve governance authority conflicts and execution-log synchronization issues identified by the Governance + Workflow Coherence Audit (Entry 96). " +
      "Entry 97 (Audit System Hardening) deprecated AI_PROJECT_INSTRUCTIONS and created CHATGPT_INSTRUCTIONS. " +
      "Entry 98 must resolve the remaining structural issues: " +
      "(1) AI_STATE.jsx shows stale entry count (78 vs actual 97) — update or strengthen deprecation warning, " +
      "(2) Strengthen mandatoryPreflight in Phase25ExecutionLogIndex with explicit chunk filename and NextSafeStep sync rule, " +
      "(3) Add sync enforcement checklist to Phase25ExecutionLogIndex as final task-completion gate.",
    scope: [
      "Update AI_STATE.jsx: Fix stale entry count (78 → 97) OR add BOLD WARNING: entry count here is STALE, see Index",
      "Strengthen Phase25ExecutionLogIndex mandatoryPreflight: make chunk filename explicit in read order",
      "Add SYNC ENFORCEMENT CHECKLIST to Phase25ExecutionLogIndex: 5-point sync gate before task completion",
      "Update NextSafeStep sync rule: NextSafeStep MUST be updated synchronously with each completed entry"
    ],
    complexity: "LOW",
    runtimeImpact: "ZERO — governance documentation only",
    estimatedEffort: "1–2 hours",
    blockingIssues: "NONE",
    frozenFilesImpact: "ZERO",
    expectedOutcome: "Governance system fully coherent; no stale pointers; sync enforcement checklist active; ChatGPT reads correct state on every preflight"
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // NEXT SAFE STEP (ENTRY 99) — POST-GOVERNANCE PRODUCT DECISION
  // ═══════════════════════════════════════════════════════════════════════════

  nextSafeStepEntry99: {
    id: "phase25_step_99",
    title: "Post-Governance Product Decision — Choose Next Product Workstream",
    description:
      "Governance cycle (Entries 96–98) is complete. The ChatGPT↔Base44↔GitHub loop is fully hardened. " +
      "Governance system is now coherent, sync-enforced, and pointer-correct. " +
      "Entry 99 is a DECISION POINT — choose next product workstream from the idea bank or engagement roadmap. " +
      "Candidates from Entry 95 engagement review: " +
      "(A) Leaderboard system (global/regional top reporters), " +
      "(B) Gamification Pass 2 (badges + progress countdown + milestone persistence), " +
      "(C) CTA A/B testing (analytics tracking for Entry 92 validation), " +
      "(D) Data workstream (data quality audit, source registry review). " +
      "No code changes in this entry — decision and scoping only.",
    scope: [
      "Review Entry 95 remaining engagement gaps (leaderboard, reminders, badges, countdown)",
      "Review IDEA_INDEX.jsx for candidate ideas (route-intelligence, price-predictor, leaderboard, savings-tracker)",
      "Select ONE workstream with explicit rationale",
      "Update NextSafeStep with approved scope before implementation begins"
    ],
    complexity: "DECISION ONLY — no code",
    runtimeImpact: "ZERO",
    estimatedEffort: "15 minutes (decision + NextSafeStep update)",
    blockingIssues: "NONE — governance cycle complete; repo fully synced",
    frozenFilesImpact: "ZERO"
  },

  nextSafeStepEntry109: {
    id: "phase25_step_109",
    title: "Canonical Current-Price Resolver + NearbyPrices Freshness Policy — COMPLETE",
    description:
      "Entry 109 introduced src/utils/currentPriceResolver.js as the shared resolver for latest/current price. " +
      "NearbyPrices now uses resolveLatestPerStation + isFreshEnoughForNearbyRanking (7-day threshold). " +
      "StationDetails uses resolveLatestPerFuelType with no freshness filtering. " +
      "stationHistory and all downstream chart/log consumers are unchanged. " +
      "Next recommended step remains FuelFinder write contract completion (Entry 108 scope).",
    status: "complete",
    completedDate: "2026-03-21T11:04:08Z",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // NEXT SAFE STEP (ENTRY 110) — FUELFINDER WRITE CONTRACT COMPLETION
  // ═══════════════════════════════════════════════════════════════════════════

  nextSafeStepEntry110: {
    id: "phase25_step_108",
    title: "FuelFinder Write Contract Completion — plausibilityStatus and station_match_status",
    description:
      "Entry 108 (StationDetails Data-Layer Split) is complete. " +
      "The next upstream gap from Entry 105 (Visibility Contract Audit) is FuelFinder: " +
      "fetchFuelFinderStationPrices.ts writes FuelPrice without plausibilityStatus AND without station_match_status. " +
      "These rows pass the stationId check in stationHistory but are excluded from displayPrices " +
      "because plausibilityStatus is not 'realistic_price'. " +
      "This step should add plausibilityStatus classification and station_match_status declaration " +
      "to the FuelFinder write path so FuelFinder rows become display-eligible. " +
      "No frozen files involved. No UI changes required — the shared rule and data-layer split " +
      "will automatically include correctly-written FuelFinder rows in displayPrices once compliant.",
    scope: [
      "Update fetchFuelFinderStationPrices.ts: classify priceNok with plausibility threshold (10–30 NOK/L)",
      "Update fetchFuelFinderStationPrices.ts: set station_match_status = 'matched_station_id' on FuelPrice writes",
      "No UI changes needed",
    ],
    complexity: "LOW",
    runtimeImpact: "MINIMAL — only affects write path in FuelFinder adapter",
    estimatedEffort: "1–2 hours",
    blockingIssues: "NONE",
    frozenFilesImpact: "ZERO — fetchFuelFinderStationPrices.ts is not a frozen Phase 2 file",
    expectedOutcome:
      "FuelFinder rows become visible in 'Siste kjente priser' (StationDetails displayPrices) " +
      "and in NearbyPrices once plausibilityStatus and station_match_status are correctly written",
  }
};

export default NEXT_SAFE_STEP;