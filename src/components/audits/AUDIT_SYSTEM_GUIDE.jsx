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
 *   Label evidence level: code-observed, reasoned-inference, requires-telemetry, user-experience-hypothesis.
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
 *   See: BASE44_PROJECT_INSTRUCTIONS.jsx (governance authority)
 *   See: CHATGPT_INSTRUCTIONS.jsx (agent preflight reference)
 *
 * Rule 6: Evidence Levels for Major Claims
 *   code-observed           — directly visible in source code
 *   reasoned-inference      — logical deduction from code patterns
 *   requires-telemetry      — needs user behavior data to verify
 *   user-experience-hypothesis — user testing or design assumption
 *
 * ————————————————————————————————————————————————————————————————————————————————
 *
 * CATEGORY-SPECIFIC AUDIT GUIDANCE
 *
 * ARCHITECTURE audits analyze:
 *   → Routing and entry points
 *   → Dependency direction and circular references
 *   → Page registration and component wiring
 *   → Data flow between layers
 *   → Module structure and separation of concerns
 *   NOT: UI appearance, business logic optimization, feature prioritization
 *
 * UI audits analyze:
 *   → Visible navigation and page organization
 *   → CTA placement, discoverability of features
 *   → Visual consistency and design patterns
 *   → Responsive layout and accessibility
 *   → Component hierarchy and reusability
 *   NOT: Data integrity, routing mechanics, business logic
 *
 * GOVERNANCE audits analyze:
 *   → Locked Phase 2 files and modification restrictions
 *   → Execution log integrity and compliance
 *   → Phase boundaries and task sequencing
 *   → Frozen file dependencies
 *   NOT: Feature implementation, user behavior, data quality
 *
 * PRODUCT audits analyze:
 *   → Feature usefulness and user value scoring
 *   → Crowdsourcing participation incentives
 *   → User retention and engagement hooks
 *   → CTA effectiveness and conversion flows
 *   → Feature prioritization (BUILD/IMPROVE/DEFER/REMOVE)
 *   NOT: Technical implementation details, code quality
 *
 * ACTIVATION audits analyze:
 *   → User onboarding friction and first-time UX
 *   → First-value experience and time-to-first-contribution
 *   → Contribution loops and engagement mechanics
 *   → Early retention and drop-off points
 *   → Feature discovery by new users
 *   NOT: Visual design, data quality, security
 *
 * DATA audits analyze:
 *   → Station matching integrity and accuracy
 *   → Price plausibility and anomaly detection
 *   → Data source reliability and metadata completeness
 *   → Field validation and missing value handling
 *   → Confidence scoring and uncertainty quantification
 *   NOT: UI presentation, user behavior, performance
 *
 * PERFORMANCE audits analyze:
 *   → Page load times and time-to-interactive
 *   → Expensive database queries and N+1 problems
 *   → Rendering inefficiencies and component re-renders
 *   → Network request batching and caching strategies
 *   → Memory usage and bundle size
 *   NOT: User experience design, business logic
 *
 * SECURITY audits analyze:
 *   → Input validation and sanitization
 *   → Admin access controls and authorization
 *   → Authentication boundaries and session management
 *   → Abuse vectors and rate limiting
 *   → Data exposure and privacy controls
 *   NOT: Feature design, data modeling
 *
 * PUBLISHABILITY audits analyze:
 *   → Google Play Store readiness and compliance
 *   → Apple App Store readiness and compliance
 *   → Platform-specific metadata and submission requirements
 *   → WebView wrapper risks and native integration
 *   → Version numbering and release notes requirements
 *   NOT: Feature implementation, user acquisition
 *
 * ————————————————————————————————————————————————————————————————————————————————
 *
 * RELATED FILES
 *
 * AUDIT_INDEX.jsx                    — Registry of all audits
 * README.jsx                         — Quick reference guide
 * BASE44_PROJECT_INSTRUCTIONS.jsx    — Governance authority and frozen files
 * CHATGPT_INSTRUCTIONS.jsx           — Agent preflight instructions (ChatGPT reference)
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