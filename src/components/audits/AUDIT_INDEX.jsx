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
  lastUpdated: "2026-03-11T18:30:00Z",
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
    }
  ],

  categoryBreakdown: {
    architecture: 4,
    ui: 3,
    governance: 0,
    product: 3,
    activation: 0,
    data: 0,
    performance: 0,
    security: 0,
    publishability: 1,
    total: 11
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
    projectInstructions: "src/components/governance/AI_PROJECT_INSTRUCTIONS.jsx"
  }
};

export default AUDIT_INDEX;