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
  lastUpdated: "2026-03-11",

  audits: [
    {
      id: "project_structure_audit",
      title: "Project Structure Audit",
      location: "src/components/audits/PROJECT_STRUCTURE_AUDIT_2026_03_11.jsx",
      dateCreated: "2026-03-11",
      description: "Analyzes routing structure, page registration, and Base44 framework integration",
      relatesTo: "Phase 1 (Route Protection Pass 1)",
      focusArea: "Router entrypoint verification and page organization",
      status: "baseline"
    },

    {
      id: "routing_architecture_audit",
      title: "Routing Architecture Audit",
      location: "src/components/audits/architecture/routing-architecture-audit-2026-03-11.md",
      dateCreated: "2026-03-11",
      description: "Deep analysis of dual router configuration and nested router conflict",
      relatesTo: "Phase 1 Architecture (Pass 1 Correction)",
      focusArea: "Router hierarchy, pages/App.jsx structure, initialization",
      status: "complete"
    },

    {
      id: "ui_audit",
      title: "UI/UX Audit",
      location: "src/components/audits/ui/ui-audit-2026-03-11.md",
      dateCreated: "2026-03-11",
      description: "Dashboard layout, visual consistency, component organization, data transparency",
      relatesTo: "UI Clarity (Pass A recommended)",
      focusArea: "Data source labeling, component redundancy, loading states",
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
    step2: "Read full audit file (jsx or md format)",
    step3: "Reference findings in execution log when proposing changes",
    step4: "Create new audit before major refactoring",
    step5: "Link audit findings to HAUPTINSTRUKS rules"
  },

  relatedFiles: {
    executionLog: "src/components/governance/Phase25ExecutionLog_*.jsx",
    auditSystemGuide: "src/components/audits/AUDIT_SYSTEM_GUIDE.txt",
    projectInstructions: "src/components/governance/AI_PROJECT_INSTRUCTIONS.jsx"
  }
};

export default AUDIT_INDEX;