/*
AUDIT INDEX
Central registry of TankRadar structural audits.

This index enables discovery and reference of all audit files.
Used by governance tracking and admin dashboards.
*/

export const AUDIT_INDEX = {
  system: "TankRadar Audit Registry",
  purpose: "Central registry of read-only architecture audits",
  status: "active",
  lastUpdated: "2026-03-21T20:45:00Z",
  taxonomyVersion: "2.0 (expanded to 9 categories)",

  audits: [
    {
      id: "product_utility_audit",
      title: "Product Utility & Crowdsourcing Audit",
      category: "product",
      location: "src/components/audits/product/product-utility-audit-2026-03-11.jsx",
      dateCreated: "2026-03-11",
      description: "5-dimension utility scoring (USER_VALUE, EASE_OF_USE, CROWDSOURCING_IMPACT, ENGAGEMENT, DEVELOPMENT_EFFORT) for all functions; crowdsourcing strategy; Dashboard CTA optimization",
      relatesTo: "Product Planning (Entry 86)",
      focusArea: "Feature utility classification (BUILD_NOW/IMPROVE/DEFER/REMOVE), top 5 crowdsourcing drivers, CTA effectiveness, engagement roadmap",
      status: "complete",
      canonicalFor: "MVP feature prioritization"
    },
    {
      id: "project_structure_audit",
      title: "Project Structure Audit",
      category: "architecture",
      location: "src/components/audits/architecture/project-structure-architecture-audit-2026-03-11.jsx",
      dateCreated: "2026-03-11",
      description: "Analyzes routing structure, page registration, and Base44 framework integration",
      relatesTo: "Phase 1 (Route Protection Pass 1)",
      focusArea: "Router entrypoint verification and page organization",
      status: "baseline",
      canonicalFor: "Application entrypoint"
    },

    {
      id: "routing_architecture_audit",
      title: "Routing Architecture Audit",
      category: "architecture",
      location: "src/components/audits/architecture/routing-architecture-audit-2026-03-11.jsx",
      dateCreated: "2026-03-11",
      description: "Deep analysis of dual router configuration and nested router conflict",
      relatesTo: "Phase 1 Architecture (Pass 1 Correction)",
      focusArea: "Router hierarchy, pages/App.jsx structure, initialization",
      status: "complete",
      canonicalFor: "Routing architecture risk assessment"
    },

    {
      id: "ui_audit",
      title: "UI/UX Audit",
      category: "ui",
      location: "src/components/audits/ui/ui-audit-2026-03-11.jsx",
      dateCreated: "2026-03-11",
      description: "Dashboard layout, visual consistency, component organization, data transparency",
      relatesTo: "UI Clarity (Pass A recommended)",
      focusArea: "Data source labeling, component redundancy, loading states",
      status: "complete",
      canonicalFor: "Visual consistency and component clarity"
    },

    {
      id: "base44_router_audit",
      title: "Base44 Router Architecture Audit",
      category: "architecture",
      location: "src/components/audits/architecture/base44-router-architecture-audit-2026-03-11.jsx",
      dateCreated: "2026-03-11",
      description: "Comprehensive analysis of router entrypoint, layers, page registration, and nested router risks",
      relatesTo: "Phase 1 Architecture Verification (router entrypoint unknown)",
      focusArea: "Root app bootstrap, multiple router layers, page registration mechanism, nested router risks",
      status: "critical_unknowns_identified",
      canonicalFor: "Router infrastructure baseline"
    },

    {
      id: "ui_function_utilization_audit",
      title: "UI Function Utilization Audit",
      category: "ui",
      location: "src/components/audits/ui/ui-function-utilization-audit-2026-03-11.jsx",
      dateCreated: "2026-03-11",
      description: "Comprehensive inventory of user-facing functions, navigation reachability, feature completeness, and optimization opportunities",
      relatesTo: "UI Optimization Pass (Entry 83)",
      focusArea: "Function visibility in primary vs. secondary nav, feature support classification, redundancy detection, hidden/incomplete features",
      status: "complete",
      canonicalFor: "User-facing feature inventory"
    },

    {
      id: "ui_function_value_audit",
      title: "UI Function Value Audit — MVP Prioritization",
      category: "product",
      location: "src/components/audits/ui/ui-function-value-audit-2026-03-11.jsx",
      dateCreated: "2026-03-11",
      description: "Value-based scoring matrix for all user-facing functions; MVP prioritization classification (Core/Keep/Defer/Remove)",
      relatesTo: "MVP Launch Planning (Entry 84)",
      focusArea: "Function value scoring (USER_VALUE, DATA_SUPPORT, UI_MATURITY, MVP_RELEVANCE), decision table, tier classification",
      status: "complete",
      canonicalFor: "MVP value-based prioritization"
    },

    {
      id: "mvp_function_prioritization_audit",
      title: "MVP Function Prioritization Audit",
      category: "product",
      location: "src/components/audits/ui/mvp-function-prioritization-audit-2026-03-11.jsx",
      dateCreated: "2026-03-11",
      description: "Tier classification (CORE/SECONDARY/SUPPORT/HIDE/REMOVE) for all user-facing functions; recommended 3-screen MVP structure; nav optimization",
      relatesTo: "MVP Launch Readiness (Entry 85)",
      focusArea: "Tier assignments, 3-screen MVP foundation (Dashboard/LogPrice/Statistics/Profile), navigation optimization, broken UI identification",
      status: "complete",
      canonicalFor: "MVP tier classification and structure"
    },
    {
      id: "store_publishability_audit",
      title: "Store Publishability Audit — Google Play & Apple App Store Readiness",
      category: "publishability",
      location: "src/components/audits/publishability/store-publishability-audit-2026-03-11.jsx",
      dateCreated: "2026-03-11",
      description: "Comprehensive assessment of mobile app architecture, UX, feature completeness, and metadata readiness for store submission",
      relatesTo: "Product Maturity & Long-term Planning (Entry 89)",
      focusArea: "WebView risk, app value clarity, navigation patterns, feature completeness, privacy transparency, store listing metadata, platform compliance",
      status: "complete",
      canonicalFor: "Store submission readiness and blocking issues assessment"
    },
    {
      id: "activation_contribution_loop_audit",
      title: "Activation & Contribution Loop Audit — First-Value & Crowdsourcing Mechanics",
      category: "activation",
      location: "src/components/audits/activation/activation-contribution-loop-audit-2026-03-11.jsx",
      dateCreated: "2026-03-11",
      description: "Comprehensive analysis of user onboarding, first-value experience, price-reporting contribution loop, gamification strength, and retention hooks",
      relatesTo: "NextSafeStep Governance Audit (Entry 88); Product Utility Audit (Entry 86)",
      focusArea: "LogPrice workflow friction, SubmitPriceCard prominence, PumpMode context clarity, ContributionImpactCard gamification, first-value timeline, feature discovery, retention drivers, crowdsourcing blockers",
      status: "complete",
      canonicalFor: "Activation metrics, crowdsourcing opportunities, CTA optimization priorities"
    },
    {
      id: "activation_impact_review",
      title: "Activation Impact Review — Post-Entry-92 Evaluation",
      category: "activation",
      location: "src/components/audits/activation/activation-impact-review-2026-03-11.jsx",
      dateCreated: "2026-03-11",
      description: "Measures effectiveness of Entry 92 CTA improvements and onboarding overlay against Entry 91 baseline metrics; validates blocker resolution and identifies remaining gaps",
      relatesTo: "Activation Audit (Entry 91); Activation Improvements (Entry 92)",
      focusArea: "CTA repositioning impact, overlay clarity, metrics re-scoring, blocker resolution validation, remaining activation gaps, next workstream prioritization",
      status: "complete",
      canonicalFor: "Post-implementation validation, activation gap prioritization, next feature roadmap"
    },
    {
      id: "engagement_impact_review",
      title: "Engagement Impact Review — Post-Entry-94 Gamification Evaluation",
      category: "activation",
      location: "src/components/audits/activation/engagement-impact-review-2026-03-11.jsx",
      dateCreated: "2026-03-11",
      description: "Analyzes effectiveness of Entry 94 streak counter + social proof percentile integration; evaluates engagement loop improvements; identifies remaining gamification gaps and recommends Gamification Pass 2",
      relatesTo: "Activation Audit (Entry 91); Activation Improvements (Entry 92); Activation Impact Review (Entry 93); Gamification Pass 1 (Entry 94)",
      focusArea: "Streak mechanic validation, percentile ranking effectiveness, milestone celebration impact, engagement metrics re-scoring (3.2→6.3), remaining engagement blockers (leaderboard, reminders, badges), next workstream prioritization",
      status: "complete",
      canonicalFor: "Engagement loop validation, gamification effectiveness assessment, Gamification Pass 2 planning"
    },
    {
      id: "root_workflow_consistency_audit",
      title: "Root Workflow Consistency Audit",
      category: "governance",
      type: "workflow-consistency-audit",
      location: "src/components/audits/governance/root-workflow-consistency-audit-2026-03-11.jsx",
      dateCreated: "2026-03-11",
      description: "Verifies root-level repository files (README, package.json, vite.config, etc.) align with TankRadar governance system and ChatGPT↔Base44↔GitHub workflow",
      relatesTo: "Governance Coherence Audit (Entry 96); Base44 platform integration",
      focusArea: "Root file analysis, build pipeline verification, ChatGPT workflow alignment, Base44 platform compatibility, missing documentation assessment",
      status: "complete",
      canonicalFor: "Root configuration verification, workflow consistency confirmation"
    },
    {
      id: "governance_workflow_coherence_audit",
      title: "Governance + Workflow Coherence Audit — Comprehensive System Review",
      category: "governance",
      type: "workflow-coherence-audit",
      location: "src/components/audits/governance/governance-workflow-coherence-audit-2026-03-11-final.jsx",
      dateCreated: "2026-03-12",
      description: "Comprehensive audit of all governance, workflow, root-config, and audit-system files. Verifies canonical sources, detects overlaps/contradictions, confirms ChatGPT↔Base44↔GitHub loop protection, enforces repo sync discipline. CRITICAL FINDING: BASE44_PROJECT_INSTRUCTIONS claims sole authority but AI_PROJECT_INSTRUCTIONS still exists — requires human decision.",
      relatesTo: "Root Workflow Consistency (Entry 96); Governance Coherence (Entry 96); Phase25ExecutionLogIndex; AUDIT_SYSTEM_GUIDE",
      focusArea: "Authority conflict resolution, canonical sources mapping, workflow handoff protection, repo sync enforcement, ChatGPT↔Base44↔GitHub loop integrity, overlaps analysis, sync verification, root-level alignment",
      status: "complete",
      canonicalFor: "Governance system integrity, workflow coherence validation, sync enforcement confirmation, ChatGPT↔Base44↔GitHub workflow protection"
    },
    {
      id: "admin_operator_ux_audit",
      title: "Admin Operator UX Audit — SuperAdmin Usability",
      category: "ui",
      location: "src/components/audits/ui/admin-operator-ux-audit-2026-03-12.jsx",
      dateCreated: "2026-03-12",
      description: "Read-only audit of SuperAdmin operator usability across three layers: admin UI navigation/clarity, governance context visibility, and operational statistics utility. Evaluates 8 core operator tasks using code-observed evidence. Verdict: power-user-biased (52.5% score). Identifies remaining English islands, absent prioritization signals, broken workflow continuity, and governance opacity.",
      relatesTo: "SuperAdmin UX clarity and admin workflow simplification (Norwegian UX pass)",
      focusArea: "operator-first admin flow, review/discovery/matching/duplicates usability, Norwegian language consistency, action safety clarity, cross-panel workflow continuity",
      status: "complete",
      canonicalFor: "SuperAdmin operator UX improvements"
    },
    {
      id: "admin_preview_queue_workflow_audit",
      title: "Admin Preview Queue Workflow Audit — Canonical Operator Workflow for Clearing Station Preview/Review Queues",
      category: "ui",
      location: "src/components/audits/ui/admin-preview-queue-workflow-audit-2026-03-12.jsx",
      dateCreated: "2026-03-12",
      description: "Read-only audit of the real operator workflow for clearing station preview/review queues across StationCandidateReview and SuperAdmin. Confirms 5 confirmed overlaps, maps 9-step canonical queue-clearing workflow, classifies all actions as automatic/semi-automatic/manual, identifies 6 governance risks including CRITICAL direct Station creation without post-creation classification, and flags DEMO_CANONICAL_ID trap in DuplicateRemediationPanel.",
      relatesTo: "SuperAdmin operator UX improvements (admin-operator-ux-audit-2026-03-12); StationCandidateReview workflow; AdminOperationsPanel dual-embedding",
      focusArea: "queue-clearing workflow, duplicate surface detection, automation vs manual review, StationCandidate approval path, StationReview decision semantics, ChainUnconfirmedManualReviewUI, FAREOMRÅDE bulk operations",
      status: "complete",
      canonicalFor: "Queue-clearing operator workflow; StationCandidateReview as canonical execution surface; SuperAdmin as monitoring/navigation surface"
    },
    {
      id: "product_strategy_alignment_audit_2026_03_13",
      title: "Product Strategy Alignment Audit — TankRadar Strategic Model Sync",
      category: "product",
      location: "src/components/audits/product/PRODUCT_STRATEGY_ALIGNMENT_AUDIT_2026_03_13.jsx",
      dateCreated: "2026-03-13",
      description: "Audit of whether the current idea system and roadmap structure fully reflect the emerging TankRadar strategic model: Driver App → Crowdsourced Data → AI Intelligence → Data Platform. Identifies missing acquisition-layer concepts, feature fragmentation risks, and backend bias in planning. Proposes 4-layer canonical strategic model and recommends idea additions including radar-mode, likely-refuel-detection, price-sign-ocr.",
      relatesTo: "Roadmap Governor v4.3 (Entry 104)",
      focusArea: "Strategic model alignment, acquisition layer representation, idea registry completeness, roadmap phase compatibility",
      status: "proposed",
      canonicalFor: "Roadmap strategy synchronization — acquisition layer model"
    },
    {
      id: "data_acquisition_model_audit_2026_03_13",
      title: "Data Acquisition Model Audit — TankRadar Sensor Layer Strategy",
      category: "product",
      location: "src/components/audits/product/DATA_ACQUISITION_MODEL_AUDIT_2026_03_13.jsx",
      dateCreated: "2026-03-13",
      description: "Audit of the data acquisition model underpinning TankRadar's crowdsourcing strategy. Evaluates passive acquisition vectors (GPS station detection, OCR capture, refuel probability), confidence scoring requirements, and anti-spam design constraints.",
      relatesTo: "Product Strategy Alignment Audit 2026-03-13; Roadmap Governor v4.3 (Entry 104)",
      focusArea: "Passive data acquisition mechanics, sensor layer design, confidence scoring, acquisition-layer feature scoping",
      status: "proposed",
      canonicalFor: "Data acquisition model design — radar-mode, price-sign-ocr, likely-refuel-detection scoping"
    },
    {
      id: "crowdsourcing_engine_audit_2026_03_13",
      title: "Crowdsourcing Engine Audit — TankRadar Contribution Loop Maturity",
      category: "product",
      location: "src/components/audits/product/CROWDSOURCING_ENGINE_AUDIT_2026_03_13.jsx",
      dateCreated: "2026-03-13",
      description: "Audit of TankRadar's crowdsourcing engine maturity across the full contribution lifecycle: trigger → capture → validation → reward → retention. Evaluates current loop effectiveness, identifies acquisition-layer gaps, and positions radar-mode and price-sign-ocr within the broader crowdsourcing strategy.",
      relatesTo: "Product Strategy Alignment Audit 2026-03-13; Activation Audit (Entry 91); Roadmap Governor v4.3 (Entry 104)",
      focusArea: "Contribution loop mechanics, acquisition trigger design, crowdsourcing maturity scoring, feature scoping for acquisition layer",
      status: "proposed",
      canonicalFor: "Crowdsourcing engine maturity assessment — contribution loop completeness"
    },

    {
      id: "visibility_contract_audit",
      title: "FuelPrice Visibility Contract Audit",
      category: "data",
      location: "src/components/audits/data/visibility-contract-audit-2026-03-20.jsx",
      dateCreated: "2026-03-20",
      description: "Contract-forensics pass determining whether 'display-ready fuel price visibility' is owned by the upstream ingestion/matching/curation pipeline or by UI-layer components (NearbyPrices, StationDetails). Maps all visibility/eligibility enforcement points, identifies redundant vs required UI checks, and locates the first proven contract breach.",
      relatesTo: "Entry 105 — Visibility Contract Audit",
      focusArea: "FuelPrice entity purpose (raw vs display-ready), upstream write-gate completeness, UI filter redundancy, station_match_status and plausibilityStatus enforcement consistency",
      status: "complete",
      canonicalFor: "Display visibility contract ownership — FuelPrice pipeline vs UI layer"
    },

    {
      id: "canonical_function_audit",
      title: "Canonical Function Audit — Core Runtime Pipeline",
      category: "data",
      location: "src/components/audits/data/canonical-function-audit-2026-03-21.jsx",
      dateCreated: "2026-03-21",
      description: "Repository-wide canonical-function audit of the core runtime pipeline.  Classifies every relevant function/file as CANONICAL, LEGACY, OVERLAPPING, or UNKNOWN.  Covers station master/identity, FuelPrice write paths, matching functions (user-reported vs source/station), current-price read paths, and loop-drift patterns.  Excludes roadmap content.",
      relatesTo: "Entry 116 — Canonical Function Audit",
      focusArea: "FuelPrice write path duplication (4 GP variants), matching function inline duplication, ANWB legacy schema, read path canonical layer (currentPriceResolver + fuelPriceEligibility), station creation paths",
      status: "complete",
      canonicalFor: "Runtime pipeline canonical-path map — pre-cleanup reference"
    }
  ],

  categoryBreakdown: {
    architecture: 4,
    ui: 5,
    governance: 2,
    product: 6,
    activation: 3,
    data: 2,
    performance: 0,
    security: 0,
    publishability: 1,
    total: 23
  },

  governanceRules: {
    allAuditsAreReadOnly: true,
    noRuntimeModification: "Audits analyze only; changes recorded in execution log",
    permanentRecord: "All audits stored permanently in repository",
    requiredSections: ["context", "observedFiles", "observedBehavior", "structuralRisks", "confirmedFacts", "unknowns", "recommendations"],
    evidenceLevels: {
      "code-observed": "Directly visible in source code; requires no inference",
      "reasoned-inference": "Logical deduction from code patterns; reasoned but not directly observed",
      "requires-telemetry": "Requires user behavior data or runtime metrics to verify",
      "user-experience-hypothesis": "Based on design principles or user testing assumptions"
    }
  },

  auditCategories: {
    architecture: {
      description: "Code structure, routing, data flow, component hierarchy, dependencies",
      analyzes: ["routing mechanisms", "page registration", "dependency direction", "component wiring", "module separation"],
      notFor: ["UI appearance", "business logic optimization", "feature prioritization"]
    },
    ui: {
      description: "Interface design, visual consistency, navigation, CTA placement, UX clarity",
      analyzes: ["visible navigation", "CTA discoverability", "layout consistency", "responsive behavior", "component hierarchy"],
      notFor: ["data integrity", "routing mechanics", "business logic"]
    },
    governance: {
      description: "Phase locks, rule compliance, execution log integrity, frozen files",
      analyzes: ["locked files", "phase boundaries", "task sequencing", "modification restrictions", "compliance tracking"],
      notFor: ["feature implementation", "user behavior", "data quality"]
    },
    product: {
      description: "Feature usefulness, crowdsourcing incentives, retention value, prioritization",
      analyzes: ["feature utility scoring", "crowdsourcing impact", "user retention hooks", "CTA effectiveness", "prioritization classification"],
      notFor: ["technical implementation", "code quality", "data structures"]
    },
    activation: {
      description: "User onboarding, first-value experience, contribution loops, engagement hooks",
      analyzes: ["onboarding friction", "time-to-first-contribution", "engagement mechanics", "early retention", "feature discovery"],
      notFor: ["visual design", "data quality", "security controls"]
    },
    data: {
      description: "Data integrity, matching reliability, source quality, metadata completeness",
      analyzes: ["station matching", "price plausibility", "source reliability", "confidence scoring", "validation rules"],
      notFor: ["UI presentation", "user behavior", "performance optimization"]
    },
    performance: {
      description: "Load times, query efficiency, rendering optimization, network behavior",
      analyzes: ["page load times", "database queries", "rendering efficiency", "network requests", "memory usage"],
      notFor: ["user experience design", "business logic", "data modeling"]
    },
    security: {
      description: "Input validation, access controls, abuse vectors, authentication boundaries",
      analyzes: ["input sanitization", "access control", "authentication", "abuse prevention", "data privacy"],
      notFor: ["feature design", "data modeling", "user acquisition"]
    },
    publishability: {
      description: "App store readiness, platform compliance, distribution requirements, metadata",
      analyzes: ["Google Play readiness", "App Store readiness", "platform metadata", "WebView risks", "release requirements"],
      notFor: ["feature implementation", "user acquisition", "performance tuning"]
    }
  },

  howToUseThisIndex: {
    step1: "Find relevant audit by topic or date",
    step2: "Read full audit file (jsx format)",
    step3: "Reference findings in execution log when proposing changes",
    step4: "Create new audit before major refactoring",
    step5: "Link audit findings to HAUPTINSTRUKS rules"
  },

  relatedFiles: {
    executionLog: "src/components/governance/Phase25ExecutionLog_*.jsx",
    auditSystemGuide: "src/components/audits/AUDIT_SYSTEM_GUIDE.jsx",
    projectInstructions: "src/components/governance/BASE44_PROJECT_INSTRUCTIONS.jsx"
  }
};

export default AUDIT_INDEX;