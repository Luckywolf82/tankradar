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
  lastUpdated: "2026-03-11T17:30:00Z",

  audits: [
    {
      id: "project_structure_audit",
      title: "Project Structure Audit",
      location: "src/components/audits/architecture/project-structure-architecture-audit-2026-03-11.jsx",
      dateCreated: "2026-03-11",
      description: "Analyzes routing structure, page registration, and Base44 framework integration",
      relatesTo: "Phase 1 (Route Protection Pass 1)",
      focusArea: "Router entrypoint verification and page organization",
      status: "baseline"
    },

    {
      id: "routing_architecture_audit",
      title: "Routing Architecture Audit",
      location: "src/components/audits/architecture/routing-architecture-audit-2026-03-11.jsx",
      dateCreated: "2026-03-11",
      description: "Deep analysis of dual router configuration and nested router conflict",
      relatesTo: "Phase 1 Architecture (Pass 1 Correction)",
      focusArea: "Router hierarchy, pages/App.jsx structure, initialization",
      status: "complete"
    },

    {
      id: "ui_audit",
      title: "UI/UX Audit",
      location: "src/components/audits/ui/ui-audit-2026-03-11.jsx",
      dateCreated: "2026-03-11",
      description: "Dashboard layout, visual consistency, component organization, data transparency",
      relatesTo: "UI Clarity (Pass A recommended)",
      focusArea: "Data source labeling, component redundancy, loading states",
      status: "complete"
    },

    {
      id: "base44_router_audit",
      title: "Base44 Router Architecture Audit",
      location: "src/components/audits/architecture/base44-router-architecture-audit-2026-03-11.jsx",
      dateCreated: "2026-03-11",
      description: "Comprehensive analysis of router entrypoint, layers, page registration, and nested router risks",
      relatesTo: "Phase 1 Architecture Verification (router entrypoint unknown)",
      focusArea: "Root app bootstrap, multiple router layers, page registration mechanism, nested router risks",
      status: "critical_unknowns_identified"
    },

    {
      id: "ui_function_utilization_audit",
      title: "UI Function Utilization Audit",
      location: "src/components/audits/ui/ui-function-utilization-audit-2026-03-11.jsx",
      dateCreated: "2026-03-11",
      description: "Comprehensive inventory of user-facing functions, navigation reachability, feature completeness, and optimization opportunities",
      relatesTo: "UI Optimization Pass (Entry 83)",
      focusArea: "Function visibility in primary vs. secondary nav, feature support classification, redundancy detection, hidden/incomplete features",
      status: "complete"
    },

    {
      id: "ui_function_value_audit",
      title: "UI Function Value Audit — MVP Prioritization",
      location: "src/components/audits/ui/ui-function-value-audit-2026-03-11.jsx",
      dateCreated: "2026-03-11",
      description: "Value-based scoring matrix for all user-facing functions; MVP prioritization classification (Core/Keep/Defer/Remove)",
      relatesTo: "MVP Launch Planning (Entry 84)",
      focusArea: "Function value scoring (USER_VALUE, DATA_SUPPORT, UI_MATURITY, MVP_RELEVANCE), decision table, tier classification",
      status: "complete"
    },

    {
      id: "mvp_function_prioritization_audit",
      title: "MVP Function Prioritization Audit",
      location: "src/components/audits/ui/mvp-function-prioritization-audit-2026-03-11.jsx",
      dateCreated: "2026-03-11",
      description: "Tier classification (CORE/SECONDARY/SUPPORT/HIDE/REMOVE) for all user-facing functions; recommended 3-screen MVP structure; nav optimization",
      relatesTo: "MVP Launch Readiness (Entry 85)",
      focusArea: "Tier assignments, 3-screen MVP foundation (Dashboard/LogPrice/Statistics/Profile), navigation optimization, broken UI identification",
      status: "complete"
    }
  ],

  governanceRules: {
    allAuditsAreReadOnly: true,
    noRuntimeModification: "Audits analyze only; changes recorded in execution log",
    permanentRecord: "All audits stored permanently in repository",
    requiredSections: ["context", "observedFiles", "observedBehavior", "structuralRisks", "confirmedFacts", "unknowns", "recommendations"]
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