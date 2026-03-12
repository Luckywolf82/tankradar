/*
AUDIT FILE
Read-only analysis artifact.

Do not implement fixes inside this file.
Use Execution Log for changes.
See: src/components/governance/Phase25ExecutionLog_*.jsx

Audit system rules: src/components/audits/AUDIT_SYSTEM_GUIDE.jsx
*/

// ─────────────────────────────────────────────────────────────────────────────
//  ADMIN PREVIEW QUEUE WORKFLOW AUDIT
//  Date: 2026-03-12
//  Category: ui
//  Status: complete
// ─────────────────────────────────────────────────────────────────────────────

export const AUDIT = {
  auditId: "admin_preview_queue_workflow_audit",
  title: "Admin Preview Queue Workflow Audit — Canonical Operator Workflow for Clearing Station Preview/Review Queues",
  category: "ui",
  date: "2026-03-12",
  status: "complete",
  auditSystemVersion: "2026-03-11",
  evidenceBasis: "code-observed from direct file inspection; no runtime execution",

  // ─────────────────────────────────────────────────────────────────
  // CONTEXT
  // ─────────────────────────────────────────────────────────────────

  context: {
    why: "Overlap was identified between pages/StationCandidateReview.jsx and pages/SuperAdmin.jsx. " +
      "Both surfaces expose queue-clearing actions against StationCandidate and StationReview entities. " +
      "There is no canonical documented workflow for an operator to follow when clearing these queues. " +
      "This audit maps the real workflow step-by-step from code evidence, identifies overlapping surfaces, " +
      "and determines which surface should be the canonical primary workflow home.",

    whatTriggeredAnalysis: [
      "SuperAdmin was restructured (Entry 98 UX pass) into 6 operator-task tabs",
      "StationCandidateReview still exists as a standalone page with overlapping components",
      "Both pages embed AdminOperationsPanel and MasteringMetrics — duplicate embedding confirmed",
      "No previous audit had mapped the actual queue-clearing workflow step-by-step",
      "SuperAdmin 'Behandle saker' tab links TO StationCandidateReview, creating ambiguity about which is primary",
    ],
  },

  // ─────────────────────────────────────────────────────────────────
  // FILES INSPECTED
  // ─────────────────────────────────────────────────────────────────

  filesInspected: [
    "pages/StationCandidateReview.jsx",
    "pages/SuperAdmin.jsx",
    "components/admin/AdminReviewWorkbench.jsx",
    "components/admin/ReviewQueueSummary.jsx",
    "components/admin/StationDiscoveryQueue.jsx",
    "components/admin/AdminOperationsPanel.jsx",
    "components/admin/DuplicateWorkbench.jsx",
    "components/admin/DuplicateDetectionResults.jsx",
    "components/admin/DuplicateRemediationPanel.jsx",
    "components/admin/SystemHealthDashboard.jsx",
    "components/admin/SystemHealthPanel.jsx",
    "components/admin/DataSourceStatus.jsx",
    "components/admin/MasteringMetrics.jsx",
    "components/admin/ReviewConsistencyCheck.jsx",
    "components/admin/ChainUnconfirmedManualReviewUI.jsx",
    "components/admin/RoadmapAdminPanel.jsx",
    "components/admin/Phase2MatchingPreviewPanel.jsx",
    "components/admin/Phase2MatchingAuditPanel.jsx",
    "components/admin/Phase2MatchingTestHarness.jsx",
    "components/governance/AI_STATE.jsx",
    "components/governance/NextSafeStep.jsx",
    "components/governance/ProjectControlPanel.jsx",
  ],

  // ─────────────────────────────────────────────────────────────────
  // CURRENT WORKFLOW SURFACES
  // ─────────────────────────────────────────────────────────────────

  currentWorkflowSurfaces: {
    surface_A: {
      id: "StationCandidateReview",
      path: "pages/StationCandidateReview.jsx",
      pageTitle: "Station Mastering Hub",
      access: "Linked from SuperAdmin 'Behandle saker' tab via button 'Godkjenn stasjonskandidater'",
      primaryPurpose: "Full mastering hub — metrics, consistency check, chain-unconfirmed manual review, operations panel, + live candidate/review queue rendering",
      queuesHandled: [
        "StationCandidate (pending/grouped/ungrouped) — with live Godkjenn/Avvis/Duplikat buttons",
        "StationReview (pending, all review_types) — with live Godkjenn/Avvis/Duplikat buttons",
        "chain_unconfirmed manual review workflow (ChainUnconfirmedManualReviewUI — one-at-a-time)",
      ],
      componentsEmbedded: [
        "MasteringMetrics (shared with SuperAdmin drift tab)",
        "ReviewConsistencyCheck (only here)",
        "ChainUnconfirmedManualReviewUI (only here)",
        "AdminOperationsPanel (shared with SuperAdmin drift tab)",
        "Live candidate/review render inline (only here)",
      ],
      executeActionsAvailable: [
        "handleApprove — creates Station directly from StationCandidate",
        "handleReject — sets StationCandidate.status = rejected",
        "handleDuplicate — sets StationCandidate.status = duplicate",
        "handleStationReviewApprove — sets StationReview.status = approved",
        "handleStationReviewReject — sets StationReview.status = rejected",
        "handleStationReviewDuplicate — sets StationReview.status = duplicate",
        "handleSplitGroup — invokes splitGroupByLikeness backend",
        "handleAutoApproveExactDuplicates — invokes autoApproveExactDuplicates (deprecated section, hidden with className='hidden')",
        "ChainUnconfirmedManualReviewUI.applyDecision — invokes applyManualChainUnconfirmedDecision",
      ],
      criticalNote: "ONLY surface where operators can execute real queue-clearing decisions on StationCandidate and StationReview. " +
        "The old button block is hidden (className='hidden') but the logic is still present in the component. " +
        "The active execution path is: GroupedCandidates → handleApprove → base44.entities.Station.create() DIRECTLY.",
      governanceRisk: "CRITICAL — Station creation happens here without StationCandidate progressing through any intermediate pipeline. " +
        "handleApprove() calls base44.entities.Station.create() directly. " +
        "This bypasses any classifyStationsRuleEngine / identifyStationReviewProblems pass on the new Station.",
    },

    surface_B: {
      id: "SuperAdmin_BehandleSaker",
      path: "pages/SuperAdmin.jsx → Tab: behandle",
      pageTitle: "Administrasjon → Behandle saker",
      access: "Primary admin nav, second tab",
      primaryPurpose: "Operator dashboard — shows review queue counts, unmatched station list, + links to execution surfaces",
      queuesHandled: [
        "FuelPrice (station_match_status = review_needed_station_match) — count only via ReviewQueueSummary",
        "FuelPrice (station_match_status = no_safe_station_match) — list only via StationDiscoveryQueue",
      ],
      componentsEmbedded: [
        "ReviewQueueSummary (summary widget — no execution)",
        "StationDiscoveryQueue (list widget — no execution)",
        "LinkGrid with links to ReviewQueue and StationCandidateReview",
      ],
      executeActionsAvailable: [
        "NONE — this tab contains zero execution buttons",
        "Navigation only: button 'Åpne review-kø' → /ReviewQueue",
        "Navigation only: button 'Godkjenn stasjonskandidater' → /StationCandidateReview",
      ],
      criticalNote: "SuperAdmin 'Behandle saker' is a NAVIGATION AND MONITORING surface only. " +
        "It delegates all actual execution to StationCandidateReview and ReviewQueue.",
    },

    surface_C: {
      id: "SuperAdmin_Drift_AdminOperationsPanel",
      path: "pages/SuperAdmin.jsx → Tab: drift → AdminOperationsPanel",
      pageTitle: "Administrasjon → Drift og systemstatus → Driftsoperasjoner",
      primaryPurpose: "Bulk pipeline operations — not item-by-item review",
      executeActionsAvailable: [
        "processStationCandidates — runs rule engine on all pending candidates",
        "runStationReviewPipeline — runs all 8 auto-review functions sequentially",
        "identifyStationReviewProblems — scans Station data for classification problems",
        "geocodeStationsFromCoordinates — batch geocoding",
        "autoApproveExactDuplicates — bulk auto-approves exact duplicates",
        "autoConfirmChainFromName — bulk auto-confirms chain from name",
        "autoFillLocationFromName — bulk fills city/area from name",
        "mergeOrphanSeedStations (preview + apply) — orphan seed merge",
        "FAREOMRÅDE: applySafeMassReviewReclassification — bulk reclassification",
        "FAREOMRÅDE: resolveSemanticChainUnconfirmed — semantic chain cleanup",
        "FAREOMRÅDE: applyHistoricalStationReclassification — historical reclassification",
        "FAREOMRÅDE: mergeOrphanSeedStations (apply) — live merge",
        "FAREOMRÅDE: deleteForeignStations — destructive station deletion",
      ],
      criticalNote: "This is the BULK AUTOMATION surface. It affects all stations at once. " +
        "It is separate from the item-by-item queue-clearing workflow in StationCandidateReview. " +
        "Operators should run pipeline here BEFORE doing manual review in StationCandidateReview.",
    },

    surface_D: {
      id: "ReviewQueue",
      path: "pages/ReviewQueue.jsx",
      pageTitle: "Review Queue",
      primaryPurpose: "Manual station matching for FuelPrice records with station_match_status = review_needed_station_match",
      queuesHandled: [
        "FuelPrice.station_match_status = review_needed_station_match — item-by-item manual review",
      ],
      note: "This is a SEPARATE queue from the StationCandidate/StationReview queue in StationCandidateReview. " +
        "ReviewQueue handles FuelPrice matching decisions. StationCandidateReview handles station catalog decisions.",
    },

    surface_E: {
      id: "SuperAdmin_Duplikater",
      path: "pages/SuperAdmin.jsx → Tab: duplikater → DuplicateWorkbench",
      primaryPurpose: "Duplicate station scanning and preview only — no live merge execution",
      executeActionsAvailable: [
        "detectStationDuplicates — scan only, read-only",
        "previewDuplicateMerge — dry-run only, read-only",
        "ENABLE_LIVE_DUPLICATE_MERGE_EXECUTION = false — merge button is disabled in code",
      ],
      criticalNote: "PREVIEW-ONLY. Live merge is governance-blocked by code flag ENABLE_LIVE_DUPLICATE_MERGE_EXECUTION = false.",
    },
  },

  // ─────────────────────────────────────────────────────────────────
  // CONFIRMED OVERLAP
  // ─────────────────────────────────────────────────────────────────

  confirmedOverlap: {
    overlap1: {
      what: "AdminOperationsPanel embedded in BOTH StationCandidateReview AND SuperAdmin drift tab",
      where: [
        "pages/StationCandidateReview.jsx line 305: <AdminOperationsPanel onLoadCandidates={loadCandidates} />",
        "pages/SuperAdmin.jsx drift tab: <AdminOperationsPanel onLoadCandidates={() => {}} />",
      ],
      consequence: "Same bulk-operation buttons appear in two different pages. " +
        "In StationCandidateReview, onLoadCandidates refreshes the local candidate list after operation. " +
        "In SuperAdmin drift tab, onLoadCandidates is a no-op () => {}. " +
        "This means operators running pipeline from SuperAdmin see no feedback update on the page — " +
        "they must navigate to StationCandidateReview to see results.",
      evidenceLevel: "code-observed",
    },

    overlap2: {
      what: "MasteringMetrics embedded in BOTH StationCandidateReview AND SuperAdmin drift tab",
      where: [
        "pages/StationCandidateReview.jsx line 295: <MasteringMetrics />",
        "pages/SuperAdmin.jsx drift tab: <MasteringMetrics />",
      ],
      consequence: "Duplicate read-only metrics display. Operators see the same numbers in two different places.",
      evidenceLevel: "code-observed",
    },

    overlap3: {
      what: "ReviewQueueSummary and AdminReviewWorkbench both display FuelPrice review_needed counts",
      where: [
        "components/admin/ReviewQueueSummary.jsx — used in SuperAdmin behandle tab",
        "components/admin/AdminReviewWorkbench.jsx — embedded within the Behandle saker tab area",
      ],
      consequence: "Both fetch FuelPrice.filter({station_match_status: 'review_needed_station_match'}) independently. " +
        "They are near-identical components: same query, same metrics (total, last 24h, oldest). " +
        "AdminReviewWorkbench adds navigation links. ReviewQueueSummary adds a workflow guide.",
      evidenceLevel: "code-observed",
      note: "AdminReviewWorkbench is NOT currently rendered in SuperAdmin.jsx (not imported or used). " +
        "ReviewQueueSummary IS rendered in SuperAdmin behandle tab. " +
        "AdminReviewWorkbench appears to be a refactored predecessor that was not removed after ReviewQueueSummary was created.",
    },

    overlap4: {
      what: "Both StationCandidateReview and SuperAdmin's Behandle tab navigate to /ReviewQueue",
      where: [
        "SuperAdmin behandle tab: <Link to={createPageUrl('ReviewQueue')}>Åpne review-kø</Link>",
        "AdminReviewWorkbench (unused): <Link to={createPageUrl('ReviewQueue')}>Review Queue</Link>",
      ],
      consequence: "Redundant navigation paths — not critical but creates navigation ambiguity.",
      evidenceLevel: "code-observed",
    },

    overlap5: {
      what: "StationCandidateReview has a hidden (className='hidden') deprecated button block with 14+ operations",
      where: [
        "pages/StationCandidateReview.jsx lines 308-855: <div className='mb-6 space-y-3 hidden'>",
      ],
      consequence: "Dead code is still parsed and shipped. The hidden block includes 14 operation buttons " +
        "that now live in AdminOperationsPanel. This is not a runtime problem but is a maintainability and " +
        "governance clarity problem — it is unclear which buttons in the hidden block are still canonical.",
      evidenceLevel: "code-observed",
    },
  },

  // ─────────────────────────────────────────────────────────────────
  // CANONICAL WORKFLOW ASSESSMENT
  // ─────────────────────────────────────────────────────────────────

  canonicalWorkflowAssessment: {
    finding: "There is NO single canonical workflow surface. The real workflow is split across two pages " +
      "and the boundary between them is not clearly communicated to the operator.",

    splitPattern: {
      bulkAutomation: "SuperAdmin → Drift tab → AdminOperationsPanel",
      itemByItemCandidateReview: "StationCandidateReview → grouped/ungrouped candidate cards",
      itemByItemStationReview: "StationCandidateReview → Station-Data Review section",
      manualChainReview: "StationCandidateReview → ChainUnconfirmedManualReviewUI",
      fuelPriceMatchingReview: "ReviewQueue (entirely separate page)",
      monitoringAndNavigation: "SuperAdmin → Start her + Behandle saker tabs",
    },

    recommendedCanonicalPrimary: {
      forStationCatalogWorkflow: "StationCandidateReview",
      rationale: [
        "Only page with live execution buttons for StationCandidate and StationReview",
        "Only page with ChainUnconfirmedManualReviewUI for one-at-a-time review",
        "Only page with ReviewConsistencyCheck diagnostic",
        "SuperAdmin 'Behandle saker' already correctly delegates to this page",
        "All meaningful queue-clearing decisions are executed here",
      ],
    },

    recommendedCanonicalForBulkOps: {
      forBulkPipeline: "SuperAdmin → Drift tab → AdminOperationsPanel",
      rationale: [
        "Bulk operations should not be on the same surface as item-by-item review",
        "Current AdminOperationsPanel in StationCandidateReview has no-op reload callback in SuperAdmin — inconsistency",
        "Drift tab correctly separates bulk/dangerous operations from review decisions",
      ],
    },

    suggestedFutureSplit: {
      superAdmin: "Monitoring + navigation + bulk operations + system health",
      stationCandidateReview: "Item-by-item review + chain unconfirmed + candidate grouping/splitting",
      reviewQueue: "FuelPrice matching decisions (entirely independent queue)",
    },
  },

  // ─────────────────────────────────────────────────────────────────
  // QUEUE CLEARING WORKFLOW — STEP BY STEP
  // ─────────────────────────────────────────────────────────────────

  queueClearingWorkflow: {
    title: "Canonical Step-by-Step Operator Workflow for Clearing Station Preview/Review Queues",
    derivedFrom: "code-observed behavior; inferred sequencing from function dependencies and UI layout",

    prerequisiteContext:
      "There are TWO distinct queues an operator must clear: " +
      "(A) FuelPrice matching queue: station_match_status = review_needed_station_match — handled in ReviewQueue. " +
      "(B) Station catalog queue: StationCandidate (pending) + StationReview (pending) — handled in StationCandidateReview. " +
      "This audit focuses on queue B (station catalog), which has the most complex workflow.",

    steps: [
      {
        stepNumber: 1,
        stepTitle: "Check system health and queue size",
        purpose: "Understand current queue depth and system state before beginning work",
        surfaceUsed: "SuperAdmin → Start her tab (AdminStartHer) OR SuperAdmin → Drift tab → SystemHealthPanel",
        actionType: "automatic",
        whatOperatorDoes: "Navigate to SuperAdmin, open 'Start her' tab, review recommended action card, review queue counts",
        expectedOutcome: "Operator knows how many StationCandidates (pending), StationReviews (pending), and FuelPrice review_needed exist",
        whatComesNext: "Step 2 if pipeline has not been run recently; Step 3 if pipeline is up to date",
        evidenceLevel: "reasoned-inference",
        note: "AdminStartHer reads from entities. SystemHealthPanel reads from multiple entities. " +
          "Neither provides 'last pipeline run timestamp' — operator cannot confirm how fresh the queue is.",
      },
      {
        stepNumber: 2,
        stepTitle: "Run automated review pipeline (bulk pre-processing)",
        purpose: "Before manual review, run automated classification to reduce queue size and sort cases by type",
        surfaceUsed: "SuperAdmin → Drift tab → AdminOperationsPanel → DRIFT section → 'Kjør full review pipeline'",
        actionType: "semi-automatic",
        whatOperatorDoes: "Click 'Kjør full review pipeline'; wait for result; confirm output in browser console",
        expectedOutcome: [
          "classifyStationsRuleEngine runs — classifies all unclassified stations",
          "identifyStationReviewProblems runs — creates StationReview records for flagged stations",
          "autoConfirmChainFromName runs — auto-resolves obvious chain matches",
          "resolveSemanticChainUnconfirmed runs — reclassifies chain_unconfirmed by semantic category",
          "applyAutoConfirmSpecialtyFuel runs — auto-resolves clear specialty fuel cases",
          "Queue size may be REDUCED (auto-resolved) but also INCREASED (new reviews identified)",
        ],
        whatComesNext: "Step 3 — manual review of what the pipeline could not resolve",
        evidenceLevel: "code-observed",
        riskNote: "runStationReviewPipeline invokes multiple backend functions sequentially. " +
          "Results are logged to console only. Operator cannot see results on-page without navigating to StationCandidateReview.",
        functionInvoked: "functions/runStationReviewPipeline",
      },
      {
        stepNumber: 3,
        stepTitle: "Process pending StationCandidates — auto-approve exact duplicates",
        purpose: "Reduce StationCandidate (pending) count by automatically approving obvious cases",
        surfaceUsed: "SuperAdmin → Drift tab → AdminOperationsPanel → DATAKVALITET section → 'Auto-godkjenn eksakte duplikater'",
        actionType: "semi-automatic",
        whatOperatorDoes: "Click 'Auto-godkjenn eksakte duplikater'; inspect console output",
        expectedOutcome: "Candidates with identical name + address + coordinates: first approved, rest marked duplicate",
        whatComesNext: "Step 4 — navigate to StationCandidateReview for remaining manual cases",
        evidenceLevel: "code-observed",
        functionInvoked: "functions/autoApproveExactDuplicates",
      },
      {
        stepNumber: 4,
        stepTitle: "Review grouped StationCandidates — select canonical name, approve/reject group",
        purpose: "Clear StationCandidate grouped queue by approving best candidate per group",
        surfaceUsed: "pages/StationCandidateReview.jsx → 'Grupperte kandidater' section",
        actionType: "manual",
        whatOperatorDoes: [
          "Navigate to /StationCandidateReview",
          "Scroll to 'Grupperte kandidater' section",
          "For each group: expand group, review candidates, select canonical name (radio button for same_location groups)",
          "Click 'Godkjenn' on the best candidate — this creates a Station record and marks others as duplicate",
          "OR: Click 'Splitt gruppe' if group members are actually different stations",
          "OR: Click 'Avvis' to reject any individual candidate",
        ],
        expectedOutcome: "Each approved candidate creates one Station via base44.entities.Station.create(). " +
          "Other group members are marked 'duplicate'.",
        whatComesNext: "Step 5 — review ungrouped candidates",
        evidenceLevel: "code-observed",
        governanceRisk: "DIRECT Station creation. No intermediate pipeline step. " +
          "Created Station does NOT automatically go through classifyStationsRuleEngine or identifyStationReviewProblems after creation. " +
          "The new Station may need a subsequent pipeline run to get classified.",
      },
      {
        stepNumber: 5,
        stepTitle: "Review ungrouped StationCandidates — approve/reject individual candidates",
        purpose: "Clear remaining StationCandidate pending items not grouped by similarity",
        surfaceUsed: "pages/StationCandidateReview.jsx → 'Individuelle kandidater' section",
        actionType: "manual",
        whatOperatorDoes: [
          "Review each candidate card (name, address, chain, coordinates)",
          "Click 'Godkjenn' → Station created, candidate status = approved",
          "Click 'Duplikat' → candidate status = duplicate (no Station created)",
          "Click 'Avvis' → candidate status = rejected (no Station created)",
        ],
        expectedOutcome: "Each approved candidate creates one Station record directly",
        whatComesNext: "Step 6 — address StationReview pending queue",
        evidenceLevel: "code-observed",
        note: "Each Godkjenn call on an ungrouped candidate calls handleApprove(candidate) with empty groupMembers=[]. " +
          "No group deduplication logic runs.",
      },
      {
        stepNumber: 6,
        stepTitle: "Review pending StationReviews — approve/reject by review_type",
        purpose: "Clear StationReview (pending) items flagged by the classification pipeline",
        surfaceUsed: "pages/StationCandidateReview.jsx → 'Station-Data Review' section",
        actionType: "manual",
        whatOperatorDoes: [
          "Review pending review cards (station name, review_type, issue_description, suggested_action)",
          "Click 'Godkjenn' → StationReview.status = approved (confirms classification is acceptable)",
          "Click 'Duplikat' → StationReview.status = duplicate (marks station as duplicate of another)",
          "Click 'Avvis' → StationReview.status = rejected (rejects the flagged issue)",
        ],
        expectedOutcome: "Pending StationReview queue reduced",
        whatComesNext: "Step 7 — work chain_unconfirmed queue specifically",
        evidenceLevel: "code-observed",
        reviewTypesHandled: [
          "chain_unconfirmed",
          "generic_name_review",
          "specialty_fuel_review",
          "non_fuel_poi_review",
          "possible_foreign_station",
          "local_fuel_site_review",
          "retail_fuel_operator_review",
        ],
        note: "Operator receives 3 decision options regardless of review_type. " +
          "There is no type-specific guidance in the UI for what 'Godkjenn' means per review_type. " +
          "The suggested_action field provides text guidance but is not enforced.",
      },
      {
        stepNumber: 7,
        stepTitle: "Work chain_unconfirmed queue — one-at-a-time manual review",
        purpose: "Clear remaining chain_unconfirmed reviews that automated passes could not resolve",
        surfaceUsed: "pages/StationCandidateReview.jsx → ChainUnconfirmedManualReviewUI",
        actionType: "manual",
        whatOperatorDoes: [
          "Click 'Get Next Manual Candidate' to load first chain_unconfirmed record",
          "Review station info, semantic analysis, external links (Google Maps, Street View, Website)",
          "Select decision: Local Fuel Site / Specialty Fuel / Non-Fuel POI / Service/Trade / Foreign/Border / Keep as-is",
          "Decision is applied via applyManualChainUnconfirmedDecision backend function",
          "Next candidate auto-loads after 800ms",
          "Repeat until totalPending = 0",
        ],
        expectedOutcome: "chain_unconfirmed StationReview records reclassified to correct review_type or resolved",
        whatComesNext: "Step 8 — verify consistency and run follow-up pipeline if needed",
        evidenceLevel: "code-observed",
        functionInvoked: "functions/applyManualChainUnconfirmedDecision",
        note: "This is the MOST LABOR-INTENSIVE step for large queues. Each decision is one-at-a-time with no batch option.",
      },
      {
        stepNumber: 8,
        stepTitle: "Verify consistency and check metrics",
        purpose: "Confirm queue is cleared and data is consistent",
        surfaceUsed: "pages/StationCandidateReview.jsx → ReviewConsistencyCheck + MasteringMetrics",
        actionType: "automatic",
        whatOperatorDoes: [
          "Review ReviewConsistencyCheck result (pending grouped + ungrouped should equal database pending count)",
          "Review MasteringMetrics for updated counts",
          "If mismatch detected: investigate groupStationCandidates backend function consistency",
        ],
        expectedOutcome: "ReviewConsistencyCheck shows green (consistent). Pending counters at 0 or acceptable level.",
        whatComesNext: "Optionally: run another pipeline pass if new stations were approved (Step 2 again)",
        evidenceLevel: "code-observed",
      },
      {
        stepNumber: 9,
        stepTitle: "(Parallel, independent) Clear FuelPrice matching queue",
        purpose: "Clear FuelPrice records with station_match_status = review_needed_station_match",
        surfaceUsed: "pages/ReviewQueue.jsx (separate page)",
        actionType: "manual",
        whatOperatorDoes: "Navigate to /ReviewQueue, review each FuelPrice record, manually link to correct Station",
        expectedOutcome: "FuelPrice records linked to stations; station_match_status updated",
        whatComesNext: "Queue independent of steps 1–8; can be done in parallel",
        evidenceLevel: "reasoned-inference",
        note: "ReviewQueue is an entirely independent workflow from StationCandidate/StationReview. " +
          "They share the same review surface (SuperAdmin → Behandle saker link grid) but do not share data.",
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────
  // AUTOMATION MAP
  // ─────────────────────────────────────────────────────────────────

  automationMap: {
    fullyAutomatic: [
      {
        action: "classifyStationsRuleEngine",
        trigger: "Daily scheduled automation (03:00) + manual trigger in AdminOperationsPanel",
        effect: "Classifies all unclassified Station records; creates StationReview records for flagged stations",
        evidenceLevel: "code-observed",
      },
      {
        action: "geocodeStationsFromCoordinates",
        trigger: "Scheduled every 5 minutes + manual batch trigger in AdminOperationsPanel",
        effect: "Fills city/region/address from GPS coordinates for stations missing this data",
        evidenceLevel: "code-observed",
      },
    ],

    safeOperatorTriggeredAutomation: [
      {
        action: "runStationReviewPipeline",
        trigger: "Manual button in AdminOperationsPanel DRIFT section",
        effect: "Runs 8 review functions sequentially; reduces queue via auto-confirmation; increases queue via new classification",
        safeToRunFirst: true,
        evidenceLevel: "code-observed",
      },
      {
        action: "autoApproveExactDuplicates",
        trigger: "Manual button in AdminOperationsPanel DATAKVALITET section",
        effect: "Approves first candidate in exact-duplicate groups; marks others as duplicate",
        safeToRunFirst: true,
        evidenceLevel: "code-observed",
      },
      {
        action: "autoConfirmChainFromName",
        trigger: "Manual button in AdminOperationsPanel DATAKVALITET section",
        effect: "Confirms chain for stations where name unambiguously matches known chain pattern",
        safeToRunFirst: true,
        evidenceLevel: "code-observed",
      },
      {
        action: "autoFillLocationFromName",
        trigger: "Manual button in AdminOperationsPanel DATAKVALITET section",
        effect: "Fills city/area from station name (e.g. 'Tanken Hjartdal' → city=Hjartdal)",
        safeToRunFirst: true,
        evidenceLevel: "code-observed",
      },
      {
        action: "identifyStationReviewProblems",
        trigger: "Manual button in AdminOperationsPanel DRIFT section",
        effect: "Scans Station table for data quality issues; creates new StationReview records",
        safeToRunFirst: true,
        evidenceLevel: "code-observed",
      },
      {
        action: "previewAutoConfirmSpecialtyFuel / applyAutoConfirmSpecialtyFuel",
        trigger: "Preview: ANALYSE section. Apply: FAREOMRÅDE section",
        effect: "Resolves specialty_fuel_review StationReview records with strong signals",
        safeToRunFirst: false,
        prerequisite: "Run preview first to confirm candidates",
        evidenceLevel: "code-observed",
      },
    ],

    semiAutomaticRequiringReview: [
      {
        action: "applySafeMassReviewReclassification",
        trigger: "FAREOMRÅDE section with confirmation dialog",
        effect: "Bulk reclassifies non_fuel_poi + specialty_fuel review records",
        requiresConfirmation: true,
        evidenceLevel: "code-observed",
      },
      {
        action: "resolveSemanticChainUnconfirmed",
        trigger: "FAREOMRÅDE section with confirmation dialog",
        effect: "Reclassifies chain_unconfirmed records using semantic bucket analysis",
        requiresConfirmation: true,
        evidenceLevel: "code-observed",
      },
      {
        action: "applyHistoricalStationReclassification",
        trigger: "FAREOMRÅDE section with confirmation dialog",
        effect: "Reclassifies stations based on current rules vs historical classification",
        requiresConfirmation: true,
        evidenceLevel: "code-observed",
      },
      {
        action: "mergeOrphanSeedStations (apply)",
        trigger: "FAREOMRÅDE section with confirmation dialog",
        effect: "Merges up to 10 seed stations with matching canonical stations",
        requiresConfirmation: true,
        prerequisite: "Run preview first",
        evidenceLevel: "code-observed",
      },
    ],

    fullyManual: [
      {
        action: "StationCandidate approve/reject/duplicate — grouped",
        trigger: "StationCandidateReview candidate group cards",
        effect: "Creates Station record or closes candidate with status",
        requiresHumanJudgment: true,
        evidenceLevel: "code-observed",
      },
      {
        action: "StationCandidate approve/reject/duplicate — ungrouped",
        trigger: "StationCandidateReview ungrouped candidate cards",
        effect: "Creates Station record or closes candidate with status",
        requiresHumanJudgment: true,
        evidenceLevel: "code-observed",
      },
      {
        action: "StationReview approve/reject/duplicate",
        trigger: "StationCandidateReview StationReview cards",
        effect: "Sets review status; no automatic follow-up action on the Station itself",
        requiresHumanJudgment: true,
        evidenceLevel: "code-observed",
      },
      {
        action: "ChainUnconfirmedManualReviewUI decision",
        trigger: "One-at-a-time review in StationCandidateReview",
        effect: "Reclassifies chain_unconfirmed to target review_type via applyManualChainUnconfirmedDecision",
        requiresHumanJudgment: true,
        evidenceLevel: "code-observed",
      },
      {
        action: "FuelPrice station matching",
        trigger: "ReviewQueue page — independent workflow",
        effect: "Links FuelPrice record to correct Station",
        requiresHumanJudgment: true,
        evidenceLevel: "reasoned-inference",
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────
  // OPERATOR DECISION POINTS
  // ─────────────────────────────────────────────────────────────────

  operatorDecisionPoints: [
    {
      decisionPoint: "Should I run the pipeline before doing manual review?",
      context: "Operator arrives at StationCandidateReview and sees a large queue",
      currentGuidance: "None in UI — no indicator of when pipeline was last run",
      recommendedAnswer: "Always run pipeline first; it reduces manual queue significantly",
      surfaceForDecision: "SuperAdmin → Drift tab → AdminOperationsPanel",
      urgency: "HIGH — without pipeline, operator manually reviews cases that could be auto-resolved",
    },
    {
      decisionPoint: "For grouped candidates: which candidate is the real/canonical one?",
      context: "Multiple candidates appear for the same physical location",
      currentGuidance: "Radio button to select name; candidate cards show address and GPS",
      missingGuidance: "No source-quality indicator to help choose best name; no external link per candidate (only in ChainUnconfirmedManualReviewUI)",
      urgency: "MEDIUM",
    },
    {
      decisionPoint: "Should I split a group or approve one as canonical?",
      context: "Group may contain candidates that are actually different stations",
      currentGuidance: "'Splitt gruppe' button available; calls splitGroupByLikeness backend",
      urgency: "MEDIUM",
    },
    {
      decisionPoint: "What does 'Godkjenn' mean for a StationReview of type chain_unconfirmed?",
      context: "Operator approving a chain_unconfirmed review — approving means accepting the station as-is with no chain",
      currentGuidance: "suggested_action text field on review card; no type-specific button labels",
      urgency: "HIGH — semantically ambiguous approval action",
    },
    {
      decisionPoint: "When should I use ChainUnconfirmedManualReviewUI vs the StationReview card approach?",
      context: "Both surfaces can close a chain_unconfirmed StationReview",
      currentGuidance: "None — both appear on the same page without clear priority",
      recommendation: "ChainUnconfirmedManualReviewUI is more structured and provides external links; use it for chain_unconfirmed cases",
      urgency: "MEDIUM",
    },
    {
      decisionPoint: "When should I use FAREOMRÅDE bulk operations vs manual review?",
      context: "FAREOMRÅDE operations affect potentially hundreds of records at once",
      currentGuidance: "Confirmation dialog present; section clearly labeled ⚠ FAREOMRÅDE",
      recommendation: "Run ANALYSE preview passes first to understand scope; only use FAREOMRÅDE when confident",
      urgency: "HIGH — irreversible at scale without recovery procedure",
    },
  ],

  // ─────────────────────────────────────────────────────────────────
  // GOVERNANCE RISKS
  // ─────────────────────────────────────────────────────────────────

  governanceRisks: [
    {
      risk: "CRITICAL: Direct Station creation without post-creation classification",
      detail: "handleApprove() in StationCandidateReview calls base44.entities.Station.create() directly. " +
        "The newly created Station does NOT automatically go through classifyStationsRuleEngine or " +
        "identifyStationReviewProblems. The new Station starts with no classification, no review, " +
        "and may have chain = candidate.proposedChain (unverified).",
      projectControlPanelRule: "Rule 11 (Adapter Identity): Sources propose candidates; curators approve stations. " +
        "The creation itself is correct (curator-controlled). BUT the new Station may be unclassified.",
      mitigation: "Operator should run 'Scan Station-data for problemer' (identifyStationReviewProblems) " +
        "after approving batches of candidates to catch newly created unclassified stations.",
      evidenceLevel: "code-observed",
      severity: "HIGH",
    },
    {
      risk: "AdminOperationsPanel embedded in two places with different reload callbacks",
      detail: "In StationCandidateReview: onLoadCandidates={loadCandidates} — refreshes page state after operation. " +
        "In SuperAdmin drift tab: onLoadCandidates={() => {}} — no-op, page does not refresh. " +
        "Operator cannot see results of pipeline operations in SuperAdmin without navigating away.",
      severity: "MEDIUM",
      evidenceLevel: "code-observed",
    },
    {
      risk: "Hidden deprecated code block in StationCandidateReview",
      detail: "Lines 308–855 contain className='hidden' div with 14 operation buttons. " +
        "This code is shipped but not rendered. It is unclear which operations here are now fully " +
        "covered by AdminOperationsPanel and which may have edge-case differences.",
      severity: "LOW",
      evidenceLevel: "code-observed",
      action: "Future cleanup pass should verify each hidden button matches AdminOperationsPanel equivalent, then remove.",
    },
    {
      risk: "AdminReviewWorkbench is unused but not removed",
      detail: "components/admin/AdminReviewWorkbench.jsx exists and is functional, but is NOT imported or " +
        "rendered anywhere in the current SuperAdmin.jsx. ReviewQueueSummary was created as a lighter " +
        "replacement but AdminReviewWorkbench was never removed from the codebase.",
      severity: "LOW",
      evidenceLevel: "code-observed",
    },
    {
      risk: "DuplicateRemediationPanel uses hardcoded DEMO_CANONICAL_ID and DEMO_DUPLICATE_IDS for live merge path",
      detail: "ENABLE_LIVE_DUPLICATE_MERGE_EXECUTION = false prevents live execution. " +
        "However, when/if this flag is toggled to true, the live merge uses hardcoded placeholder IDs: " +
        "DEMO_CANONICAL_ID = 'CANONICAL_STATION_ID_HERE' and DEMO_DUPLICATE_IDS = ['DUPLICATE_ID_1', 'DUPLICATE_ID_2']. " +
        "This would cause a silent failure or incorrect merge on real IDs if the flag were enabled without updating these values.",
      severity: "MEDIUM — not a current risk while flag = false, but a future trap",
      evidenceLevel: "code-observed",
    },
    {
      risk: "No 'last pipeline run' timestamp displayed to operator",
      detail: "Operator has no way to know when the last automated classification pipeline ran. " +
        "SuperAdmin Start her and SystemHealthPanel show static counts but not pipeline run timestamps. " +
        "This means operators may skip the pipeline pre-step (Step 2) because they cannot assess freshness.",
      severity: "MEDIUM",
      evidenceLevel: "code-observed",
      mitigation: "FetchLog entity exists and is read by DataSourceStatus — a similar 'last pipeline run' indicator " +
        "could be derived from FetchLog or a separate pipeline run log.",
    },
    {
      risk: "StationReview 'Godkjenn' button semantics are ambiguous across review_types",
      detail: "For chain_unconfirmed: 'Godkjenn' approves the review, meaning the operator accepts the station as-is without a confirmed chain. " +
        "For specialty_fuel_review: 'Godkjenn' approves the review, meaning the operator confirms the station IS a specialty fuel site. " +
        "For non_fuel_poi_review: 'Godkjenn' approves the review, meaning the operator confirms the station is NOT a fuel station. " +
        "All three use the same green 'Godkjenn' button with no contextual label change. " +
        "An operator who approves a non_fuel_poi_review thinking they are 'approving the station' is making the wrong decision.",
      severity: "HIGH — operator error risk",
      evidenceLevel: "code-observed",
    },
  ],

  // ─────────────────────────────────────────────────────────────────
  // CONFIRMED FACTS (code-observed only)
  // ─────────────────────────────────────────────────────────────────

  confirmedFacts: [
    "StationCandidateReview.handleApprove() calls base44.entities.Station.create() directly — no intermediate pipeline",
    "AdminOperationsPanel is embedded in both StationCandidateReview AND SuperAdmin drift tab",
    "In SuperAdmin drift tab, AdminOperationsPanel.onLoadCandidates is a no-op () => {}",
    "MasteringMetrics is embedded in both StationCandidateReview AND SuperAdmin drift tab",
    "AdminReviewWorkbench.jsx exists but is NOT imported or rendered in current SuperAdmin.jsx",
    "ReviewQueueSummary and AdminReviewWorkbench make the same FuelPrice query — they are near-identical components",
    "StationCandidateReview has a className='hidden' div containing 14 deprecated operation buttons",
    "ENABLE_LIVE_DUPLICATE_MERGE_EXECUTION = false — live merge is governance-blocked in code",
    "DuplicateRemediationPanel contains hardcoded DEMO_CANONICAL_ID and DEMO_DUPLICATE_IDS for the live merge path",
    "ChainUnconfirmedManualReviewUI is ONLY rendered in StationCandidateReview — not in SuperAdmin",
    "ReviewConsistencyCheck is ONLY rendered in StationCandidateReview — not in SuperAdmin",
    "SuperAdmin 'Behandle saker' tab contains zero execution buttons — navigation and monitoring only",
    "FuelPrice matching workflow (ReviewQueue) is entirely independent from StationCandidate/StationReview workflow",
    "DuplicateWorkbench uses STEPS array with id/label objects (after recent fix) — step navigation is step-ID based",
    "classifyStationsRuleEngine runs on a daily schedule at 03:00 (referenced in hidden button tooltip text)",
    "geocodeStationsFromCoordinates runs on a scheduled automation every 5 minutes (referenced in hidden button tooltip text)",
    "The STEPS constant in DuplicateWorkbench correctly maps: scan → inspect → remediation (forhåndsvisning)",
  ],

  // ─────────────────────────────────────────────────────────────────
  // UNKNOWNS
  // ─────────────────────────────────────────────────────────────────

  unknowns: [
    {
      unknown: "Exact sequence of runStationReviewPipeline — which 8 functions run in which order",
      howToVerify: "Read functions/runStationReviewPipeline.js",
      impact: "Affects step 2 sequencing guidance",
    },
    {
      unknown: "What happens to a StationReview record when its associated Station is approved via handleApprove()",
      detail: "When a StationCandidate is approved and a Station is created, " +
        "any pre-existing StationReview for that stationId may still be in pending state. " +
        "Unclear if pipeline cleans these up or if they remain orphaned.",
      howToVerify: "Inspect runStationReviewPipeline and identifyStationReviewProblems for cleanup logic",
      impact: "Could cause phantom pending items in StationReview queue",
    },
    {
      unknown: "Current live queue sizes (StationCandidate pending, StationReview pending)",
      howToVerify: "Requires runtime database query",
      impact: "Cannot assess urgency of specific workflow steps",
    },
    {
      unknown: "Whether ReviewQueue (FuelPrice matching) has any coupling to StationCandidateReview decisions",
      detail: "If a FuelPrice record has station_match_status = review_needed and the target station " +
        "is later created via StationCandidateReview approval — does the FuelPrice record get auto-linked?",
      howToVerify: "Inspect functions/matchStationForUserReportedPrice and any automation on Station creation",
      impact: "Could mean FuelPrice review queue auto-clears when stations are created — or it may remain manually stuck",
    },
    {
      unknown: "Whether AdminStartHer's recommended action card logic is live and data-driven",
      detail: "AdminStartHer component was created in the recent UX pass — not inspected in this audit",
      howToVerify: "Read components/admin/AdminStartHer.jsx",
      impact: "Affects whether Step 1 (check system health) gives meaningful operator guidance",
    },
    {
      unknown: "Whether statistics components (PriceByChain, VerifiedStationStats, etc.) help operators prioritize queue-clearing",
      detail: "Statistics pages were not inspected in this audit",
      howToVerify: "Read components/statistics/*.jsx",
      impact: "Low — statistics are likely informational, not queue-clearing relevant",
    },
  ],

  // ─────────────────────────────────────────────────────────────────
  // RECOMMENDATIONS
  // ─────────────────────────────────────────────────────────────────

  recommendations: {
    mustFixWorkflowIssues: [
      {
        id: "FIX-1",
        priority: "HIGH",
        issue: "AdminOperationsPanel in SuperAdmin drift tab has no-op reload callback",
        recommendation: "Either (A) pass a meaningful reload callback to AdminOperationsPanel in SuperAdmin, " +
          "OR (B) add an explicit message after pipeline operations: 'Pipeline complete — navigate to StationCandidateReview to see results'",
        currentState: "onLoadCandidates={() => {}} — silent no-op",
        frozenFilesAffected: "NONE",
      },
      {
        id: "FIX-2",
        priority: "HIGH",
        issue: "StationReview 'Godkjenn' button semantics differ per review_type but labels are identical",
        recommendation: "Add review_type-specific action context to each StationReview card. " +
          "For non_fuel_poi_review: label button 'Bekreft (ikke drivstoff)' in amber/warning color. " +
          "For chain_unconfirmed: label button 'Bekreft uten kjede'. " +
          "For specialty_fuel_review: label button 'Bekreft spesialdrivstoff'. " +
          "This prevents operator error on high-consequence approvals.",
        frozenFilesAffected: "NONE",
      },
      {
        id: "FIX-3",
        priority: "MEDIUM",
        issue: "No 'last pipeline run' indicator visible to operator",
        recommendation: "Add a 'Sist kjørt: [timestamp]' indicator near the pipeline button in AdminOperationsPanel " +
          "or in AdminStartHer. Source from FetchLog or a dedicated pipeline run log.",
        frozenFilesAffected: "NONE",
      },
      {
        id: "FIX-4",
        priority: "MEDIUM",
        issue: "Hidden deprecated button block in StationCandidateReview (lines 308–855)",
        recommendation: "Audit each of the 14 hidden buttons against current AdminOperationsPanel. " +
          "For each button: confirm AdminOperationsPanel equivalent exists, then remove from hidden block. " +
          "Remove the entire hidden div once all buttons are verified.",
        frozenFilesAffected: "NONE",
      },
    ],

    uxClarityImprovements: [
      {
        id: "UX-1",
        issue: "Operator workflow order is not communicated",
        recommendation: "Add a numbered workflow guide at the top of StationCandidateReview: " +
          "'Steg 1: Kjør pipeline (SuperAdmin → Drift) → Steg 2: Godkjenn kandidater → Steg 3: Review stasjonssaker → Steg 4: Sjekk konsistens'",
      },
      {
        id: "UX-2",
        issue: "ChainUnconfirmedManualReviewUI has English title and button labels",
        recommendation: "Translate: 'Manual Chain-Unconfirmed Review Workflow' → 'Manuell gjennomgang — kjede ukjent', " +
          "'Get Next Manual Candidate' → 'Hent neste sak', decision buttons to Norwegian",
      },
      {
        id: "UX-3",
        issue: "StationCandidateReview page title is 'Station Mastering Hub' (English)",
        recommendation: "Translate page title to Norwegian: 'Stasjonskatalog — gjennomgang og godkjenning'",
      },
      {
        id: "UX-4",
        issue: "Candidate stats section shows 'Google Places Kandidater' (already Norwegian) but StationReview section has 'Station-Data Review' (mixed)",
        recommendation: "Standardize: 'Stasjonskatalog-review' or 'Review per type'",
      },
      {
        id: "UX-5",
        issue: "ReviewConsistencyCheck shows formula in code-like format (English variable names)",
        recommendation: "Replace formula display with plain-language Norwegian summary: " +
          "'X grupper (Y kandidater) + Z individuelle = N totalt ventende (stemmer)'",
      },
      {
        id: "UX-6",
        issue: "AdminStartHer onNavigate prop accepted but its implementation is not audited",
        recommendation: "Verify AdminStartHer.jsx uses onNavigate to link directly to 'behandle' and 'drift' tabs; " +
          "confirm the recommended action CTA navigates correctly",
      },
    ],

    norwegianLanguagePassItems: [
      "ChainUnconfirmedManualReviewUI — all UI text including title, button labels, decision labels, analysis section headers",
      "StationCandidateReview page title: 'Station Mastering Hub' → Norwegian",
      "StationCandidateReview h2: 'Station-Data Review ({N})' → 'Stasjonskatalog-review ({N})'",
      "StationCandidateReview h3: 'Google Places Kandidater' → 'Google Places-kandidater' (minor)",
      "ReviewConsistencyCheck formula string (code-generated English variable names) → Norwegian",
      "ReviewConsistencyCheck 'Consistency Check: OK/AVVIK' → already partly Norwegian; 'Konsistenssjekk' is correct",
      "ReviewConsistencyCheck: 'approved/rejected/duplicate (N) er utenfor...' — mixed language in formula note",
      "DuplicateRemediationPanel section header: 'Live tørrkjøringsforhåndsvisning' → partially translated; 'Live' prefix can be removed",
      "Phase2MatchingPreviewPanel — internal section headers (not audited in detail; likely has English content)",
      "Phase2MatchingAuditPanel — internal section headers (not audited in detail; likely has English content)",
    ],

    futureStructuralImprovements: [
      {
        id: "STRUCT-1",
        recommendation: "Remove AdminReviewWorkbench.jsx from codebase after verifying no imports remain. " +
          "ReviewQueueSummary is the canonical replacement.",
        frozenFilesAffected: "NONE",
        urgency: "LOW",
      },
      {
        id: "STRUCT-2",
        recommendation: "Consider embedding a lightweight StationCandidateReview queue summary widget in " +
          "SuperAdmin 'Behandle saker' tab (parallel to ReviewQueueSummary) — showing pending StationCandidate count and pending StationReview count. " +
          "This gives operators a complete picture before navigating to StationCandidateReview.",
        frozenFilesAffected: "NONE",
        urgency: "MEDIUM",
      },
      {
        id: "STRUCT-3",
        recommendation: "Add post-creation classification trigger: when handleApprove() creates a Station, " +
          "consider automatically invoking identifyStationReviewProblems for the new station ID to flag it " +
          "for classification review. This closes the governance gap where new Stations are unclassified.",
        frozenFilesAffected: "NONE — but requires implementing a new targeted version of identifyStationReviewProblems",
        urgency: "MEDIUM",
        governanceNote: "This change must be logged in ProjectControlPanel and would touch StationCandidateReview.jsx",
      },
      {
        id: "STRUCT-4",
        recommendation: "When ENABLE_LIVE_DUPLICATE_MERGE_EXECUTION is ready to be enabled, " +
          "replace the hardcoded DEMO_CANONICAL_ID and DEMO_DUPLICATE_IDS in DuplicateRemediationPanel " +
          "with actual IDs derived from the live DuplicateDetectionResults scan. " +
          "Current state is a trap — enabling the flag without fixing IDs would cause a failed/incorrect merge.",
        frozenFilesAffected: "NONE",
        urgency: "HIGH — must be resolved BEFORE enabling ENABLE_LIVE_DUPLICATE_MERGE_EXECUTION",
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────
  // NEXT SAFE STEP
  // ─────────────────────────────────────────────────────────────────

  nextSafeStep: {
    description: "This audit is complete. No implementation changes were made. " +
      "The following are safe implementation steps in priority order, pending ChatGPT review of this audit:",
    priorityOrder: [
      "1. (HIGH) Fix FIX-2: Add review_type-specific action labels to StationReview cards (UX safety)",
      "2. (HIGH) Fix FIX-1: Either pass meaningful reload to AdminOperationsPanel in SuperAdmin or add post-operation guidance",
      "3. (MEDIUM) Norwegian language pass on ChainUnconfirmedManualReviewUI and StationCandidateReview English strings",
      "4. (MEDIUM) Remove hidden deprecated button block from StationCandidateReview after verification (FIX-4)",
      "5. (LOW) Remove AdminReviewWorkbench.jsx after confirming no imports (STRUCT-1)",
      "6. (FUTURE) Add StationCandidate/StationReview queue summary widget to SuperAdmin behandle tab (STRUCT-2)",
    ],
    governanceConstraints: [
      "Do NOT modify Phase 2 frozen matching functions",
      "Do NOT enable ENABLE_LIVE_DUPLICATE_MERGE_EXECUTION without fixing STRUCT-4 first",
      "All changes must be logged in Phase25ExecutionLog active chunk",
      "STRUCT-3 (post-creation classification) requires ProjectControlPanel entry before implementation",
    ],
    roadmapNote: "No structural changes to RoadmapAdminPanel are proposed in this audit. " +
      "Only translation to Norwegian is deferred as a future minor pass item.",
  },
};

export default AUDIT;