/*
 * AUDIT FILE
 * Read-only analysis artifact.
 *
 * Do not implement fixes inside this file.
 * Use Execution Log for changes.
 * See: src/components/governance/Phase25ExecutionLog_*.jsx
 *
 * AUDIT ID:       admin_operator_ux_audit
 * TITLE:          Admin Operator UX Audit — SuperAdmin Usability
 * CATEGORY:       ui
 * DATE:           2026-03-12
 * STATUS:         complete
 * EVIDENCE LEVEL: code-observed (primary), reasoned-inference (secondary),
 *                 user-experience-hypothesis (tertiary)
 */

export const ADMIN_OPERATOR_UX_AUDIT = {

  // ─────────────────────────────────────────────────────────────────────────────
  // METADATA
  // ─────────────────────────────────────────────────────────────────────────────

  auditId: "admin_operator_ux_audit",
  title: "Admin Operator UX Audit — SuperAdmin Usability for Non-Technical Operators",
  category: "ui",
  date: "2026-03-12",
  status: "complete",

  // ─────────────────────────────────────────────────────────────────────────────
  // CONTEXT
  // ─────────────────────────────────────────────────────────────────────────────

  context: {
    primaryQuestion:
      "Can a new, non-technical operator perform core admin tasks without prior system knowledge?",
    triggerReason:
      "The SuperAdmin UI underwent a major Norwegian-language and structural UX pass (Entries 98-series). " +
      "This audit evaluates the post-pass state to verify operator readiness and identify remaining usability gaps " +
      "before further admin feature development proceeds.",
    scope: [
      "Admin UI navigation structure and tab-based layout",
      "Operator entry points for each core task category",
      "Task discoverability and self-guiding capability",
      "Action safety framing (analysis vs. execution distinction)",
      "Governance context visibility for operators",
      "Operational statistics utility for prioritization",
      "Language consistency and terminology clarity",
    ],
    outOfScope: [
      "Backend matching logic (frozen Phase 2 — not evaluated for change)",
      "Data integrity or price pipeline correctness",
      "Authentication or security controls",
      "Performance or load time optimization",
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // FILES INSPECTED
  // ─────────────────────────────────────────────────────────────────────────────

  filesInspected: {
    adminComponents: [
      "components/admin/ReviewQueueSummary.jsx",
      "components/admin/StationDiscoveryQueue.jsx",
      "components/admin/Phase2MatchingPreviewPanel.jsx",
      "components/admin/Phase2MatchingAuditPanel.jsx",
      "components/admin/Phase2MatchingTestHarness.jsx",
      "components/admin/DuplicateDetectionScanner.jsx",
      "components/admin/DuplicateDetectionResults.jsx",
      "components/admin/DuplicateRemediationPanel.jsx",
      "components/admin/AdminOperationsPanel.jsx",
      "components/admin/AdminReviewWorkbench.jsx",
      "components/admin/SystemHealthDashboard.jsx",
      "components/admin/SystemHealthPanel.jsx",
      "components/admin/DataSourceStatus.jsx",
      "components/admin/RoadmapAdminPanel.jsx",
    ],
    adminContainer: [
      "pages/SuperAdmin.jsx",
    ],
    governanceFiles: [
      "components/governance/AI_STATE.jsx",
      "components/governance/LastVerifiedState.jsx",
      "components/governance/NextSafeStep.jsx",
    ],
    statisticsFiles: [
      "components/statistics/GooglePlacesObservedStats.jsx",
      "components/statistics/VerifiedStationStats.jsx",
      "components/statistics/PriceByChain.jsx",
    ],
    auditSystemFiles: [
      "components/audits/AUDIT_SYSTEM_GUIDE.jsx",
      "components/audits/AUDIT_INDEX.jsx",
      "components/audits/ui/README.jsx",
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // CURRENT UI ARCHITECTURE SUMMARY
  // ─────────────────────────────────────────────────────────────────────────────

  currentUIArchitectureSummary: {
    containerType: "Tabs-based single page (pages/SuperAdmin.jsx)",
    tabCount: 7,
    tabs: [
      {
        id: "systemstatus",
        label: "Systemstatus",
        icon: "LayoutDashboard",
        primaryComponents: ["ReviewQueueSummary", "DataSourceStatus", "StationDiscoveryQueue"],
        helperText: "Viser om systemet er klart for arbeid, datakilder og neste steg.",
      },
      {
        id: "matching",
        label: "Matching",
        icon: "FlaskConical",
        primaryComponents: ["Phase2MatchingPreviewPanel", "Phase2MatchingAuditPanel", "Phase2MatchingTestHarness"],
        helperText: "Test og forstå matchingmotoratferd. Ingen data lagres.",
      },
      {
        id: "review",
        label: "Review",
        icon: "ClipboardList",
        primaryComponents: ["AdminReviewWorkbench"],
        helperText: "Behandle saker der matching ikke var sikker nok.",
      },
      {
        id: "duplikater",
        label: "Duplikater",
        icon: "Database",
        primaryComponents: ["SystemHealthDashboard", "DuplicateWorkbench"],
        helperText: "Oppdage, vurdere og forhåndsvise opprydding av duplikater.",
      },
      {
        id: "operasjoner",
        label: "Operasjoner",
        icon: "Wrench",
        primaryComponents: ["AdminReviewWorkbench", "LinkGrid (operations links)"],
        helperText: "Kontrollerte handlinger med varsomhet og bekreftelse.",
      },
      {
        id: "roadmap",
        label: "Roadmap",
        icon: "ShieldCheck",
        primaryComponents: ["RoadmapAdminPanel"],
        helperText: "Produktroadmap, read-only, fra ROADMAP.jsx.",
      },
      {
        id: "arkiv",
        label: "Arkiv",
        icon: "Archive",
        primaryComponents: ["LinkGrid (archive report links)"],
        helperText: "Historiske rapporter og diagnoseverktøy.",
      },
    ],
    layersSeparated: {
      analysis: ["Matching", "Systemstatus", "Duplikater (scan)"],
      review: ["Review", "Duplikater (results)"],
      execution: ["Operasjoner (danger zone)", "DuplicateRemediationPanel (disabled)"],
      governance: ["Roadmap", "Phase2MatchingAuditPanel"],
    },
    navigationPattern:
      "Flat tab navigation — all 7 tabs always visible at top. No sub-navigation, no breadcrumbs. " +
      "Tab entry does not scroll to top on selection (not verified, reasoned-inference).",
    adminAuthCheck:
      "SuperAdmin.jsx performs a role check (user.role === 'admin') on mount. Redirects non-admins to Dashboard. Code-observed.",
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // GOVERNANCE CONTEXT SUMMARY
  // ─────────────────────────────────────────────────────────────────────────────

  governanceContextSummary: {
    governanceExposedInUI: false,
    governanceExposureNotes: [
      "The Phase2MatchingAuditPanel.jsx shows locked governance rules in the UI — operators can SEE what is locked.",
      "DuplicateRemediationPanel.jsx displays an explicit governance flag: ENABLE_LIVE_DUPLICATE_MERGE_EXECUTION = false, with Norwegian copy stating live merge is disabled.",
      "No panel links to or mentions Phase25ExecutionLog, NextSafeStep.jsx, or AI_STATE.jsx.",
      "The 'next safe step' concept (as defined in NextSafeStep.jsx) is NOT surfaced anywhere in the admin UI.",
      "AI_STATE.jsx itself is marked stale (entry count 78 vs actual 98) and instructs developers to read Phase25ExecutionLogIndex instead — but operators have no access path to this information.",
      "The Roadmap tab (RoadmapAdminPanel) shows product feature status but does NOT show governance constraints, frozen files, or system-level decision gates.",
      "No admin panel exposes 'what is safe to do right now' as a summary concept.",
    ],
    governanceVisibilityRating: "low",
    evidenceLevel: "code-observed",
    implication:
      "An operator opening SuperAdmin sees Norwegian operational panels but has no in-system path to understand " +
      "the governance state, what is intentionally locked, or why certain actions are disabled. " +
      "The locking rationale is visible within individual panels but not as a cross-panel summary.",
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // STATISTICS CONTEXT SUMMARY
  // ─────────────────────────────────────────────────────────────────────────────

  statisticsContextSummary: {
    statisticsIntegratedInAdmin: "partial",
    statisticsNotes: [
      "SystemHealthPanel.jsx shows matching pipeline outcomes (matched/review_needed/no_safe_match) as counts — actionable.",
      "DataSourceStatus.jsx shows per-source OK/FEIL status from FetchLog — operational health signal.",
      "ReviewQueueSummary.jsx shows queue size and oldest item — directly actionable for prioritization.",
      "StationDiscoveryQueue.jsx shows no_safe_station_match groups by name/chain — useful for discovery prioritization.",
      "GooglePlacesObservedStats.jsx (Statistics page) is NOT embedded in admin — no path from SuperAdmin to it.",
      "VerifiedStationStats.jsx (Statistics page) is NOT embedded in admin.",
      "PriceByChain.jsx is informational-only and not operator-actionable.",
      "Admin tab 'Systemstatus' links to createPageUrl('SystemStatus') external page — no inline data.",
      "No admin panel shows coverage rate (how many stations have at least one price observation) — a key operational metric.",
      "No admin panel shows unmatched rate trend over time.",
    ],
    statisticsActionabilityRating: "medium",
    evidenceLevel: "code-observed",
    gap:
      "The most operationally useful statistics (unmatched rate trend, coverage per region, data freshness) " +
      "are not surfaced inside the admin tabs. Operators must navigate to external pages to find them.",
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // OBSERVED BEHAVIOR
  // ─────────────────────────────────────────────────────────────────────────────

  observedBehavior: {
    navigationFlow:
      "Operator lands on 'Systemstatus' tab by default. " +
      "ReviewQueueSummary, DataSourceStatus, and StationDiscoveryQueue are all rendered inline. " +
      "The tab contains three distinct logical concerns (system health, source health, discovery queue) without visual hierarchy separating them. " +
      "Evidence level: code-observed (SuperAdmin.jsx Systemstatus tab renders all three).",

    reviewWorkflow:
      "ReviewQueueSummary in Systemstatus tab shows a count and age of pending items. " +
      "AdminReviewWorkbench in both Review and Operasjoner tabs links to ReviewQueue, StationCandidateReview, UserReportedScanOperations. " +
      "There is no inline review tool — the operator must navigate to separate pages. " +
      "Evidence level: code-observed.",

    matchingPreviewUsability:
      "Phase2MatchingPreviewPanel presents a Norwegian step guide at the top (steg 1–4). " +
      "Input fields are clearly labeled. Results display in 5 labeled steps. " +
      "The 'Lesemodus' badge is present. The panel is well-structured for informed use. " +
      "However, the panel assumes the operator understands what 'dominance gap' means — no inline tooltip or glossary. " +
      "Evidence level: code-observed.",

    duplicateWorkflow:
      "DuplicateDetectionScanner contains a 4-step guide inline. " +
      "DuplicateDetectionResults contains filter controls, copy-to-clipboard export, and 'Hvorfor er disse gruppert?' explanations. " +
      "DuplicateRemediationPanel has an explicit banner: 'Live sammenslåing er deaktivert i kode og kan ikke kjøres fra dette panelet.' " +
      "The mock data (MOCK_CANDIDATES, MERGE_SUMMARY_STATS) is labeled 'Eksempeldata – ikke reelle endringer'. " +
      "Evidence level: code-observed.",

    adminOperationsPanel:
      "AdminOperationsPanel.jsx uses English section labels: 'OPERATIONS', 'DATA QUALITY', 'ANALYSIS', 'ADMIN / DANGER ZONE'. " +
      "This panel is rendered inside the Operasjoner tab via AdminReviewWorkbench but NOT as a direct top-level embed. " +
      "The confirmation dialog for dangerous operations is still in English: 'Confirm destructive operation', 'Cancel', 'Confirm'. " +
      "Evidence level: code-observed.",

    stationDiscoveryQueueContext:
      "StationDiscoveryQueue.jsx title is still 'Station Discovery Queue' (English). " +
      "The subtitle text says 'Gruppert på stasjonsnavn + kjede. Placeholder for framtidig geospatial clustering.' — " +
      "this exposes implementation-level notes to operators. The word 'Placeholder' would confuse a non-technical operator. " +
      "Evidence level: code-observed.",

    roadmapTabEnglish:
      "RoadmapAdminPanel.jsx uses English labels for status badges: 'completed', 'active', 'build-ready', 'scoping-required', 'blocked', 'partial', 'deferred'. " +
      "Summary cards use English: 'Completed', 'Active', 'Build-ready', 'Scoping required', 'Blocked'. " +
      "Feature rows show English field names: 'Dependencies', 'Blockers', 'Action'. " +
      "Evidence level: code-observed.",

    systemHealthPanelContextNote:
      "SystemHealthPanel.jsx has a 'Hva betyr dette?' note only for matching pipeline outcomes. " +
      "Other sections (Datakilder, Stasjonskandidater, Sammenslåingshistorikk) have no equivalent explanation. " +
      "Evidence level: code-observed.",
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // CONFIRMED FACTS
  // ─────────────────────────────────────────────────────────────────────────────

  confirmedFacts: [
    {
      fact: "SuperAdmin is protected by role check — only 'admin' role can view it.",
      evidence: "code-observed",
      source: "pages/SuperAdmin.jsx lines 48–55",
    },
    {
      fact: "AdminOperationsPanel.jsx section headers (OPERATIONS, DATA QUALITY, ANALYSIS, ADMIN / DANGER ZONE) are English.",
      evidence: "code-observed",
      source: "components/admin/AdminOperationsPanel.jsx",
    },
    {
      fact: "Confirmation modal in AdminOperationsPanel uses English: 'Confirm destructive operation', 'Cancel', 'Confirm'.",
      evidence: "code-observed",
      source: "components/admin/AdminOperationsPanel.jsx lines 453–472",
    },
    {
      fact: "StationDiscoveryQueue title is still English: 'Station Discovery Queue'.",
      evidence: "code-observed",
      source: "components/admin/StationDiscoveryQueue.jsx line 36",
    },
    {
      fact: "StationDiscoveryQueue contains the word 'Placeholder' in operator-visible text.",
      evidence: "code-observed",
      source: "components/admin/StationDiscoveryQueue.jsx line 51",
    },
    {
      fact: "ENABLE_LIVE_DUPLICATE_MERGE_EXECUTION is set to false in DuplicateRemediationPanel.",
      evidence: "code-observed",
      source: "components/admin/DuplicateRemediationPanel.jsx line 94",
    },
    {
      fact: "RoadmapAdminPanel uses English for all status badges and feature metadata labels.",
      evidence: "code-observed",
      source: "components/admin/RoadmapAdminPanel.jsx",
    },
    {
      fact: "AdminReviewWorkbench appears in BOTH the Review tab and the Operasjoner tab without differentiation.",
      evidence: "code-observed",
      source: "pages/SuperAdmin.jsx — review and operasjoner TabsContent both render AdminReviewWorkbench",
    },
    {
      fact: "No governance state (NextSafeStep, Phase25ExecutionLog, frozen files) is exposed inside any admin tab.",
      evidence: "code-observed",
      source: "pages/SuperAdmin.jsx — inspected all TabsContent, no governance component imported",
    },
    {
      fact: "ReviewQueueSummary and AdminReviewWorkbench both render matching pipeline stats independently — minor data duplication.",
      evidence: "code-observed",
      source: "ReviewQueueSummary.jsx and AdminReviewWorkbench.jsx — both independently filter FuelPrice by station_match_status",
    },
    {
      fact: "Statistics components (GooglePlacesObservedStats, VerifiedStationStats) are not embedded in any admin tab.",
      evidence: "code-observed",
      source: "pages/SuperAdmin.jsx — no import of these components",
    },
    {
      fact: "Phase2MatchingAuditPanel displays governance locks correctly with 'locked' badges.",
      evidence: "code-observed",
      source: "components/admin/Phase2MatchingAuditPanel.jsx",
    },
    {
      fact: "DataSourceStatus reads from FetchLog entity and displays per-source OK/FEIL.",
      evidence: "code-observed",
      source: "components/admin/DataSourceStatus.jsx",
    },
  ],

  // ─────────────────────────────────────────────────────────────────────────────
  // OPERATOR TASK AUDIT
  // ─────────────────────────────────────────────────────────────────────────────

  operatorTaskAudit: [
    {
      taskId: 1,
      task: "Find review work",
      path: "Systemstatus tab → ReviewQueueSummary (count visible) → Review tab → AdminReviewWorkbench → link to ReviewQueue page",
      discoverability: "medium",
      reasoning:
        "The count is immediately visible on default tab. However the operator must click to the Review tab and then click an external link. " +
        "There is no single-click 'Start reviewing now' CTA. The review count appears in TWO places (Systemstatus and Review tabs) which may confuse a new operator.",
      evidenceLevel: "code-observed",
    },
    {
      taskId: 2,
      task: "Understand why an item is in review",
      path: "Review tab → AdminReviewWorkbench → navigate to ReviewQueue external page → individual item detail",
      discoverability: "low",
      reasoning:
        "The admin tabs contain no inline review tool. All actual review work happens on external pages. " +
        "The SuperAdmin tab provides context (helper text) about WHY items go to review, " +
        "but does not show individual reasons inline. An operator cannot understand WHY a specific item is in review without leaving the tab.",
      evidenceLevel: "code-observed",
    },
    {
      taskId: 3,
      task: "Find discovery/unmatched stations",
      path: "Systemstatus tab → StationDiscoveryQueue (visible by default)",
      discoverability: "medium",
      reasoning:
        "StationDiscoveryQueue is on the default tab, but the title is in English ('Station Discovery Queue'). " +
        "The subtitle mentions 'Placeholder for framtidig geospatial clustering' — implementation language that leaks to operators. " +
        "A new operator would likely understand the list of names but would not know what action to take next.",
      evidenceLevel: "code-observed",
    },
    {
      taskId: 4,
      task: "Test station matching preview",
      path: "Matching tab → Phase2MatchingPreviewPanel → enter name → run",
      discoverability: "high",
      reasoning:
        "The Matching tab is clearly labeled with a FlaskConical icon. The panel has a Norwegian step guide. " +
        "Input labels are clear. The only barrier is that the operator must understand what to do WITH the result — " +
        "no inline explanation of what 'dominance gap' means or when a result is 'good enough'.",
      evidenceLevel: "code-observed",
    },
    {
      taskId: 5,
      task: "Identify duplicate scanning",
      path: "Duplikater tab → DuplicateDetectionScanner → enter city → run",
      discoverability: "high",
      reasoning:
        "The Duplikater tab is clearly labeled. The scanner has a 4-step guide and a Norwegian subtitle " +
        "'Kun analyse og forhåndsvisning — ingen data endres.' The scan button is labeled 'Kjør duplikatskann'. " +
        "This task is well-supported post-UX pass.",
      evidenceLevel: "code-observed",
    },
    {
      taskId: 6,
      task: "Understand remediation state",
      path: "Duplikater tab → DuplicateWorkbench → DuplicateRemediationPanel",
      discoverability: "medium",
      reasoning:
        "The remediation panel contains explicit Norwegian status banner: 'Status nå: forhåndsvisning og dokumentasjon. Live sammenslåing er ikke aktiv.' " +
        "The section 'Live sammenslåing er deaktivert i kode og kan ikke kjøres fra dette panelet' is clear. " +
        "However the mock data sections (Eksempeldata – ikke reelle endringer) still appear alongside real dry-run tools, " +
        "and the panel is very long — a new operator may not scroll far enough to find the dry-run section.",
      evidenceLevel: "code-observed",
    },
    {
      taskId: 7,
      task: "Distinguish analysis vs execution",
      path: "Spread across all tabs — 'Lesemodus' badges, helper text, warnings",
      discoverability: "medium",
      reasoning:
        "Individual panels use 'Lesemodus', 'Kun forhåndsvisning', and 'Kun analyse' labels correctly. " +
        "However there is no consistent visual pattern or color coding distinguishing analysis tabs from execution tabs. " +
        "The Operasjoner tab contains both safe analysis links (data quality reports) AND execution buttons (AdminOperationsPanel) — " +
        "though AdminOperationsPanel may not be directly rendered there based on current code. " +
        "A new operator cannot visually distinguish 'safe to click' from 'dangerous to click' at the tab level.",
      evidenceLevel: "reasoned-inference",
    },
    {
      taskId: 8,
      task: "Identify recommended next action",
      path: "No dedicated path — requires cross-tab synthesis",
      discoverability: "low",
      reasoning:
        "No admin panel or tab shows a 'recommended next action' or 'current system priority'. " +
        "The operator must visit Systemstatus to check queue sizes, then infer priority independently. " +
        "NextSafeStep.jsx is a governance file not surfaced in the UI. " +
        "The only prioritization signal is the ReviewQueueSummary count and the DataSourceStatus OK/FEIL indicators.",
      evidenceLevel: "code-observed",
    },
  ],

  // ─────────────────────────────────────────────────────────────────────────────
  // USABILITY SCORING
  // ─────────────────────────────────────────────────────────────────────────────

  usabilityScoring: {
    methodology:
      "Scored 0–5 per dimension based on code-observed state. " +
      "5 = excellent operator experience, 0 = unusable without prior knowledge.",

    dimensions: [
      {
        dimension: "findability",
        score: 3,
        max: 5,
        rationale:
          "Core tasks are reachable via tabs. Default tab (Systemstatus) surfaces queue sizes. " +
          "However, duplicate Norwegian/English labels (ReviewQueueSummary vs AdminReviewWorkbench duplication) and " +
          "English component titles (Station Discovery Queue) reduce discoverability for new operators.",
      },
      {
        dimension: "terminology clarity",
        score: 3,
        max: 5,
        rationale:
          "Most panels are in Norwegian. Key operator-facing labels are translated. " +
          "Remaining English terms: AdminOperationsPanel sections, Roadmap badges, StationDiscoveryQueue title. " +
          "Domain terms like 'dominance gap' appear without inline glossary explanation.",
      },
      {
        dimension: "next-step clarity",
        score: 2,
        max: 5,
        rationale:
          "Individual panels provide 'Neste steg' logic within their context (step guides). " +
          "However there is no cross-panel 'what should I do first today?' signal. " +
          "Operators must synthesize across tabs independently. NextSafeStep governance concept not surfaced.",
      },
      {
        dimension: "action safety clarity",
        score: 4,
        max: 5,
        rationale:
          "DuplicateRemediationPanel is explicitly clear that live merge is disabled. " +
          "Matching panels consistently carry 'Lesemodus' badges. " +
          "The main gap: AdminOperationsPanel danger zone is still in English and the confirmation dialog is English. " +
          "No consistent color-coded visual language separating analysis from execution at tab level.",
      },
      {
        dimension: "workflow continuity",
        score: 2,
        max: 5,
        rationale:
          "The workflow within each tab is reasonably continuous (tabs are self-contained). " +
          "Cross-tab workflows (e.g., scan → review → remediate) require the operator to jump tabs without guidance. " +
          "Review actions navigate to external pages, breaking the within-admin flow. " +
          "No breadcrumbs or return-to-admin links on external pages confirmed.",
      },
      {
        dimension: "beginner usability",
        score: 2,
        max: 5,
        rationale:
          "A new operator can understand individual panels with helper text. " +
          "But understanding the SYSTEM — what Phase 2 means, why things are locked, what is governance — " +
          "requires reading governance files that are not surfaced in the UI. " +
          "The mock data sections in DuplicateRemediationPanel could confuse a beginner into thinking examples are real.",
      },
      {
        dimension: "language consistency",
        score: 3,
        max: 5,
        rationale:
          "Most operator-facing text is Norwegian. " +
          "Remaining English islands: AdminOperationsPanel section headers and confirmation modal, " +
          "StationDiscoveryQueue title, RoadmapAdminPanel badges and field names. " +
          "Mixed language within a single view (e.g., Roadmap tab) reduces perceived professionalism.",
      },
      {
        dimension: "operational prioritization",
        score: 2,
        max: 5,
        rationale:
          "Queue size and data source status are visible. " +
          "No ranked 'action items' view, no urgency signals (e.g., oldest item in review), " +
          "no coverage trend, no recommended next step surface. " +
          "Operator must manually synthesize priority across tabs.",
      },
    ],

    totalScore: 21,
    maxScore: 40,
    percentage: "52.5%",

    verdict: "power-user-biased",
    verdictRationale:
      "The admin area is well-structured for a developer or power user who knows the system. " +
      "The post-UX-pass Norwegian translation and step guides significantly improved clarity. " +
      "However, a brand new non-technical operator would still be confused by: " +
      "English remnants in critical interaction panels, absence of a cross-panel prioritization signal, " +
      "broken workflow continuity (external page navigation), and governance concepts unexplained in context.",
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // STRUCTURAL RISKS
  // ─────────────────────────────────────────────────────────────────────────────

  structuralRisks: [
    {
      risk: "AdminReviewWorkbench rendered in both Review AND Operasjoner tabs",
      severity: "medium",
      description:
        "The same component appears in two tabs without differentiation. " +
        "A new operator cannot understand why the same information appears in different contexts. " +
        "This may signal an architectural gap in how Review and Operasjoner are distinguished.",
      evidenceLevel: "code-observed",
    },
    {
      risk: "AdminOperationsPanel section headers and confirmation dialog remain in English",
      severity: "medium",
      description:
        "AdminOperationsPanel contains 'OPERATIONS', 'DATA QUALITY', 'ANALYSIS', 'ADMIN / DANGER ZONE' section labels. " +
        "The danger zone confirmation modal ('Confirm destructive operation', 'Cancel', 'Confirm') is English. " +
        "This is a safety-critical interaction — a confused operator may confirm dangerous actions without understanding them.",
      evidenceLevel: "code-observed",
    },
    {
      risk: "StationDiscoveryQueue exposes implementation-level 'Placeholder' text",
      severity: "low",
      description:
        "The subtitle 'Placeholder for framtidig geospatial clustering' is visible to operators. " +
        "This signals the feature is incomplete and may erode operator trust in the system's readiness.",
      evidenceLevel: "code-observed",
    },
    {
      risk: "No cross-panel 'next recommended action' surface",
      severity: "high",
      description:
        "The admin area has no summary view telling operators what to prioritize. " +
        "A new operator opening SuperAdmin for the first time cannot determine whether to work on review items, duplicates, or discovery. " +
        "This is an operational efficiency gap that could lead to inconsistent work prioritization.",
      evidenceLevel: "reasoned-inference",
    },
    {
      risk: "Governance state (NextSafeStep, frozen files, phase locks) not surfaced in UI",
      severity: "medium",
      description:
        "Operators have no in-system path to understand why certain actions are disabled, what is locked, or what is safe to do. " +
        "This means all governance knowledge must exist outside the UI (documentation, instructions) — " +
        "creating a dependency on external knowledge for safe operation.",
      evidenceLevel: "code-observed",
    },
    {
      risk: "Mock/example data sections in DuplicateRemediationPanel could mislead new operators",
      severity: "low",
      description:
        "While labeled 'Eksempeldata – ikke reelle endringer', the mock station candidates (Circle K Moholt etc.) " +
        "look visually identical to real data. A new operator may not distinguish them. " +
        "The mock data is present even when real dry-run preview data is available in the same panel.",
      evidenceLevel: "code-observed",
    },
    {
      risk: "RoadmapAdminPanel status badges and feature metadata are English",
      severity: "low",
      description:
        "The Roadmap tab — while not operationally critical — breaks language consistency within the admin experience. " +
        "English status terms (build-ready, scoping-required, blocked) alongside Norwegian section titles creates a mixed experience.",
      evidenceLevel: "code-observed",
    },
    {
      risk: "External page navigation breaks workflow continuity",
      severity: "medium",
      description:
        "All review actions (ReviewQueue, StationCandidateReview, UserReportedScanOperations) navigate to separate pages. " +
        "Once on those pages, the operator has no prominent path back to SuperAdmin. " +
        "Cross-tab workflows (scan → view results → initiate review) require multi-page navigation with no guide.",
      evidenceLevel: "reasoned-inference",
    },
  ],

  // ─────────────────────────────────────────────────────────────────────────────
  // UNKNOWNS
  // ─────────────────────────────────────────────────────────────────────────────

  unknowns: [
    {
      unknown: "Whether AdminOperationsPanel is actually rendered inside the Operasjoner tab or another component",
      investigationRequired: "Inspect AdminReviewWorkbench and DuplicateWorkbench for AdminOperationsPanel import",
      evidenceLevel: "requires-investigation",
    },
    {
      unknown: "Whether ReviewQueue and StationCandidateReview external pages have 'Back to Admin' navigation",
      investigationRequired: "Inspect pages/ReviewQueue.jsx and pages/StationCandidateReview.jsx for back-link",
      evidenceLevel: "requires-investigation",
    },
    {
      unknown: "Whether tabs scroll to top on selection (scroll state behavior)",
      investigationRequired: "Runtime test or read tab implementation in SuperAdmin.jsx",
      evidenceLevel: "requires-telemetry",
    },
    {
      unknown: "Whether Systemstatus tab is too visually dense for operators on mobile",
      investigationRequired: "Three cards rendered vertically: ReviewQueueSummary, DataSourceStatus, StationDiscoveryQueue — mobile layout not verified",
      evidenceLevel: "user-experience-hypothesis",
    },
    {
      unknown: "How operators discover the 'Operasjoner' tab vs. 'Review' tab when they do the same thing",
      investigationRequired: "Operator testing or user interview",
      evidenceLevel: "requires-telemetry",
    },
  ],

  // ─────────────────────────────────────────────────────────────────────────────
  // RECOMMENDATIONS
  // ─────────────────────────────────────────────────────────────────────────────

  recommendations: {
    highPriority: [
      {
        id: "rec_01",
        title: "Add a 'Neste anbefalt handling' (Recommended Next Action) summary card to Systemstatus tab",
        description:
          "Derive a priority signal from: review queue size, oldest unreviewed item, duplicates detected, source failures. " +
          "Show ONE recommended action at the top of Systemstatus, e.g. 'Det er 14 saker i review-køen — start her.' " +
          "This addresses the #1 operator gap: no cross-panel prioritization.",
        effort: "low",
        impact: "high",
      },
      {
        id: "rec_02",
        title: "Translate AdminOperationsPanel section headers and confirmation modal to Norwegian",
        description:
          "'OPERATIONS', 'DATA QUALITY', 'ANALYSIS', 'ADMIN / DANGER ZONE' must become Norwegian. " +
          "Confirmation dialog: 'Bekreft destruktiv operasjon', 'Avbryt', 'Bekreft'. " +
          "This is a safety-critical interaction that should not be in English.",
        effort: "low",
        impact: "high",
      },
      {
        id: "rec_03",
        title: "Translate StationDiscoveryQueue title and remove 'Placeholder' from operator-visible text",
        description:
          "Rename to 'Uoppfunnede stasjoner' or 'Umatchede rapporter'. " +
          "Replace 'Placeholder for framtidig geospatial clustering' with 'Gruppert på navn og kjede. Geografisk clustering planlagt.' " +
          "This removes implementation language from operator view.",
        effort: "low",
        impact: "medium",
      },
      {
        id: "rec_04",
        title: "Consolidate AdminReviewWorkbench — remove duplicate rendering in Operasjoner tab",
        description:
          "AdminReviewWorkbench appears in both Review and Operasjoner tabs. " +
          "Decide which tab owns review summary and remove the duplicate. " +
          "If Operasjoner is intended for execution, it should not show a review queue summary.",
        effort: "low",
        impact: "medium",
      },
    ],

    mediumPriority: [
      {
        id: "rec_05",
        title: "Add inline glossary tooltips for 'dominance gap' in Phase2MatchingPreviewPanel and Harness",
        description:
          "Add a small info-icon tooltip: 'Dominance gap: forskjellen i poengsum mellom beste og nest beste kandidat. " +
          "Jo høyere gap, desto sikrere er beslutningen.' " +
          "This makes the result interpretable without prior knowledge.",
        effort: "low",
        impact: "medium",
      },
      {
        id: "rec_06",
        title: "Translate RoadmapAdminPanel status badges and field names to Norwegian",
        description:
          "Replace 'completed', 'active', 'build-ready', 'scoping-required', 'blocked', 'Dependencies', 'Blockers', 'Action' " +
          "with Norwegian equivalents. The Roadmap tab is the most visually English-heavy remaining area.",
        effort: "low",
        impact: "low-medium",
      },
      {
        id: "rec_07",
        title: "Add visual separation between analysis and execution in SuperAdmin tab structure",
        description:
          "Consider adding a subtle color or label distinction at the tab level: " +
          "analysis tabs (Systemstatus, Matching, Duplikater) vs. action tabs (Review, Operasjoner). " +
          "Alternatively, prefix action tab labels: '⚠ Operasjoner' to signal elevated caution.",
        effort: "low",
        impact: "medium",
      },
      {
        id: "rec_08",
        title: "Add 'Tilbake til Admin'-link on external review pages",
        description:
          "ReviewQueue.jsx, StationCandidateReview.jsx, and UserReportedScanOperations.jsx should have a " +
          "prominent navigation link back to SuperAdmin. " +
          "Without it, operators lose context and must rely on browser back-button.",
        effort: "low",
        impact: "medium",
      },
      {
        id: "rec_09",
        title: "Embed a minimal coverage metric in Systemstatus tab",
        description:
          "Show: '% stasjoner med minst én prisrapport siste 7 dager' as a single number. " +
          "This gives operators a quick coverage health check without navigating to Statistics page.",
        effort: "medium",
        impact: "medium",
      },
    ],

    niceToHave: [
      {
        id: "rec_10",
        title: "Add a collapsible 'Governance-status' section to Systemstatus tab",
        description:
          "A read-only panel showing: which functions are locked (Phase 2 frozen files), " +
          "what the last completed governance entry was, and what the approved next step is. " +
          "Derived from governance files, read-only. Provides operators governance transparency without requiring file access.",
        effort: "medium",
        impact: "low-medium",
      },
      {
        id: "rec_11",
        title: "Remove or collapse mock/example data sections in DuplicateRemediationPanel",
        description:
          "The MOCK_CANDIDATES and MERGE_SUMMARY_STATS sections could be replaced with a note: " +
          "'Eksempelvisning ikke tilgjengelig uten aktive duplikatgrupper.' " +
          "This reduces operator confusion about what is real vs. illustrative.",
        effort: "low",
        impact: "low",
      },
      {
        id: "rec_12",
        title: "Add tab-level unread/alert badges to Systemstatus and Review tabs",
        description:
          "If ReviewQueueSummary.count > 0, show a badge on the Review tab. " +
          "If DataSourceStatus has a FEIL source, show a badge on Systemstatus. " +
          "This creates ambient operational awareness without requiring tab navigation.",
        effort: "medium",
        impact: "medium",
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // NEXT SAFE STEP
  // ─────────────────────────────────────────────────────────────────────────────

  nextSafeStep: {
    recommendation:
      "Address rec_02 and rec_03 first as they are low-effort, safety-relevant, and code-confirmed. " +
      "Then address rec_01 (recommended next action card) as it is the highest operator-value improvement. " +
      "Do not implement governance transparency panel (rec_10) before confirming it does not violate " +
      "Phase 2 frozen file restrictions or expose sensitive system state to unauthorized users.",
    governance:
      "All changes must be recorded in Phase25ExecutionLog_007 or the next active chunk. " +
      "This audit is read-only — no implementation should occur inside this file.",
    frozenFileNote:
      "No Phase 2 frozen files are involved in any of the recommendations above. " +
      "All proposed changes are UI-layer modifications to Norwegian-pass-incomplete components.",
  },

};

export default ADMIN_OPERATOR_UX_AUDIT;