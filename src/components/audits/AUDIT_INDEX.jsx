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
  lastUpdated: "2026-03-12T00:30:00Z",
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
    }
  ],

  categoryBreakdown: {
    architecture: 4,
    ui: 3,
    governance: 2,
    product: 3,
    activation: 3,
    data: 0,
    performance: 0,
    security: 0,
    publishability: 1,
    total: 16
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