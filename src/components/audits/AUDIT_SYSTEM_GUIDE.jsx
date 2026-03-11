/**
 * AUDIT SYSTEM GUIDE
 *
 * PURPOSE
 *
 * Audits are used to analyze repository structure before architectural changes.
 *
 * Audits are READ-ONLY analysis artifacts.
 * They must never modify runtime application logic.
 *
 * ————————————————————————————————————————————————————————————————————————————————
 *
 * WHEN TO CREATE AN AUDIT
 *
 * Create an audit when:
 *
 * • repository structure is unclear
 * • routing behaviour is uncertain
 * • duplicate logic may exist
 * • architectural refactoring is considered
 * • system ownership or responsibility is unclear
 *
 * ————————————————————————————————————————————————————————————————————————————————
 *
 * CRITICAL RULE
 *
 * Structural changes must NOT be implemented
 * before an audit exists describing the system structure.
 *
 * ————————————————————————————————————————————————————————————————————————————————
 *
 * DEVELOPMENT WORKFLOW
 *
 * 1. verify repository state
 * 2. read governance instructions
 * 3. read existing audits (check AUDIT_INDEX.jsx)
 * 4. create audit if needed (document current state)
 * 5. propose change (reference audit findings)
 * 6. implement change (only if audit confirms it's safe)
 * 7. update execution log (record what changed and why)
 *
 * ————————————————————————————————————————————————————————————————————————————————
 *
 * AUDIT FILE STRUCTURE (Required Sections)
 *
 * /*
 * AUDIT FILE
 * Read-only analysis artifact.
 *
 * Do not implement fixes inside this file.
 * Use Execution Log for changes.
 * See: src/components/governance/Phase25ExecutionLog_*.jsx
 * */
 *
 * context
 *   Why was this audit created?
 *   What triggered the analysis?
 *
 * filesInspected
 *   List of files examined
 *
 * observedBehavior
 *   What is currently happening in the code?
 *   Specific examples, not speculation.
 *
 * confirmedFacts
 *   What do you KNOW is true?
 *   Only from code review; not assumptions.
 *
 * structuralRisks
 *   What could break?
 *   What dependencies are unclear?
 *   What architectural problems exist?
 *
 * unknowns
 *   What questions remain unanswered?
 *   What requires further investigation?
 *
 * recommendations
 *   What should happen next?
 *   What needs verification?
 *   What should NOT change?
 *
 * ————————————————————————————————————————————————————————————————————————————————
 *
 * AUDIT NAMING FORMAT
 *
 * {topic}-{domain}-audit-YYYY-MM-DD.jsx
 *
 * Examples:
 *
 * • routing-architecture-audit-2026-03-11.jsx
 * • ui-navigation-audit-2026-03-12.jsx
 * • governance-phase-lock-audit-2026-03-11.jsx
 *
 * Include date for version control and audit history.
 *
 * ————————————————————————————————————————————————————————————————————————————————
 *
 * LOCATION
 *
 * All audits stored in: src/components/audits/
 *
 * Organized by subcategories:
 *
 * architecture/    — Code structure, routing, data flow, components
 * ui/              — Interface design, visual consistency, UX, navigation
 * governance/      — Phase locks, rule compliance, execution log
 * product/         — Feature utility, crowdsourcing, engagement, prioritization
 * activation/      — Onboarding, first-value, user lifecycle, engagement hooks
 * data/            — Data integrity, matching, source reliability, plausibility
 * performance/     — Load times, queries, rendering, network efficiency
 * security/        — Input validation, access controls, abuse vectors
 * publishability/  — App store readiness, platform compliance, metadata
 *
 * ————————————————————————————————————————————————————————————————————————————————
 *
 * REGISTRY
 *
 * All audits must be listed in: src/components/audits/AUDIT_INDEX.jsx
 *
 * Index enables discovery and tracking of all system audits.
 * Update index whenever a new audit is created.
 *
 * ————————————————————————————————————————————————————————————————————————————————
 *
 * GOVERNANCE RULES
 *
 * Rule 1: Audits are read-only
 *   No implementation code in audit files.
 *   No changes to runtime, data, or configuration.
 *
 * Rule 2: Fact vs. Speculation
 *   State only observations from code review.
 *   Mark unknowns and assumptions explicitly.
 *
 * Rule 3: Permanent Record
 *   Audits are stored forever in repository.
 *   Future developers will reference them.
 *   Write clearly for external review.
 *
 * Rule 4: Link to Execution Log
 *   When changes are made, reference the audit in execution log.
 *   Explains why change was safe to make.
 *
 * Rule 5: Never Touch Frozen Files
 *   Some Phase 2 files are locked and read-only.
 *   Verify frozen files list before creating audit.
 *   See: AI_PROJECT_INSTRUCTIONS.jsx
 *
 * ————————————————————————————————————————————————————————————————————————————————
 *
 * RELATED FILES
 *
 * AUDIT_INDEX.jsx                    — Registry of all audits
 * README.jsx                         — Quick reference guide
 * AI_PROJECT_INSTRUCTIONS.jsx        — Governance and frozen files
 * Phase25ExecutionLog_*.jsx          — Change history
 *
 * ————————————————————————————————————————————————————————————————————————————————
 */

export const AUDIT_SYSTEM_GUIDE = {
  purpose: "Guide for creating and using repository audits",
  version: "2026-03-11",
  audience: "AI agents and developers",
  keyRules: [
    "Audits are read-only analysis artifacts",
    "Structural changes require audit before implementation",
    "Audits must be stored permanently in repository",
    "All audits listed in AUDIT_INDEX.jsx"
  ]
};

export default AUDIT_SYSTEM_GUIDE;