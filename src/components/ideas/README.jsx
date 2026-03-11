/*
TANKRADAR IDEA BANK

Repository-native product ideas hub.
Structured separation between: IDEAS → AUDITS → BUILD

This is NOT a backlog. Ideas are hypotheses awaiting analysis.
*/

export const IDEA_BANK_SYSTEM = {
  purpose:
    "Structured repository for future product ideas, waiting for audit analysis before implementation",

  workflow: [
    "IDEA — Structured hypothesis documented in this folder",
    "AUDIT — Analysis artifact created (architecture, product, activation, data, security, performance, publishability)",
    "BUILD — Implementation after audit approval",
  ],

  keyPrinciples: [
    "Ideas are NOT commitments",
    "Ideas are NOT prioritized by file order",
    "Rejected ideas move to /rejected/ for traceability",
    "All ideas are audit-ready (can reference audit types needed for validation)",
    "Ideas can be revisited at any phase",
    "No idea implementation until explicit audit + approval",
  ],

  ideaStructure: {
    id: "unique-slug-identifier",
    title: "User-facing title (Norwegian preferred)",
    category:
      "routing | pricing | crowdsourcing | engagement | growth | data | alerts | gamification | automation | maps | other",
    status:
      "candidate | audited | approved_for_build | deferred | rejected | implemented",
    summary: "1-2 sentence problem statement",
    problem: "What user pain does this solve?",
    userValue:
      "How does this improve user experience? (low / medium / high)",
    crowdsourcingImpact:
      "Does this incentivize price contributions? (none / indirect / direct)",
    activationImpact:
      "Does this help new users see value quickly? (low / medium / high)",
    complexity:
      "Estimated implementation difficulty (low / medium / high)",
    dependencies:
      "What systems must be in place first? (string array)",
    recommendedAuditTypes:
      "Which audit types should validate this? (product, activation, data, security, performance, ui, publishability)",
    notes: "Additional context, constraints, or assumptions",
  },

  auditTypesForIdeas: {
    product:
      "Feature usefulness, crowdsourcing impact, retention value, utility scoring",
    activation:
      "First-value experience, onboarding friction, engagement loops",
    data:
      "Data integrity impact, matching reliability, metadata requirements",
    security:
      "Input validation needs, access control, user privacy implications",
    performance:
      "Load times, query complexity, rendering considerations",
    ui: "Interface design, navigation impact, UX clarity",
    publishability:
      "App store implications, platform compliance, policy concerns",
  },

  workflow_example: {
    ideaName: "route-fuel-intelligence",
    ideaStatus: "candidate",
    nextStep: "Create product + activation audit before build consideration",
    auditWillAnswer: [
      "Is this feature valuable enough to develop?",
      "Does it drive user engagement?",
      "What data is required?",
      "Is there privacy/permission concern?",
    ],
    afterAuditApproved: "Move status to approved_for_build, add to Phase sprint",
  },

  directory_structure: {
    "src/components/ideas/": "Main ideas folder",
    "src/components/ideas/README.jsx": "This file",
    "src/components/ideas/IDEA_INDEX.jsx": "Canonical registry of all ideas",
    "src/components/ideas/[id].jsx":
      "Individual idea files (one per idea, structured export)",
    "src/components/ideas/rejected/README.jsx":
      "Explanation of rejected ideas folder",
    "src/components/ideas/rejected/[id].jsx":
      "Rejected ideas kept for traceability",
  },

  important_notes: [
    "Ideas are documentation only — not product specifications",
    "Complexity + dependencies are estimates, not commitments",
    "Status flow: candidate → audited → approved_for_build → implemented",
    "Rejected ideas stay in /rejected/ to prevent re-debating",
    "All ideas can be revisited if context changes",
    "Ideas are governed by same audit system as production code",
  ],
};

export default IDEA_BANK_SYSTEM;