================================================================================
TANKRADAR AUDIT SYSTEM GUIDE
================================================================================

PURPOSE

Audits are read-only analysis artifacts used for:
  • Repository diagnostics and structural verification
  • Architecture validation before refactoring
  • Safe system understanding and documentation
  • Recording observed facts and unknowns

Audits NEVER modify runtime logic or behavior.
Audits are stored in src/components/audits/ permanently.

================================================================================
WHEN AUDITS MUST BE CREATED
================================================================================

1. BEFORE REFACTORING
   • Analyze current structure
   • Document risks and unknowns
   • Establish baseline facts
   • Propose options before implementing

2. BEFORE MAJOR ARCHITECTURE CHANGES
   • Verify routing, data flow, component hierarchy
   • Identify dependencies and risks
   • Document what is known vs. unknown
   • Record constraints and limitations

3. GOVERNANCE GATE CHECKS
   • Verify Phase locks are intact
   • Confirm frozen files remain unchanged
   • Document role-based access control
   • Record execution log integrity

4. WHEN UNEXPECTED BEHAVIOR APPEARS
   • Audit before attempting fixes
   • Diagnose root cause systematically
   • Document error layers (DNS, network, parsing, etc.)
   • Propose solutions only after diagnosis

================================================================================
AUDIT STRUCTURE (Required Sections)
================================================================================

Every audit file must include:

CONTEXT
  Why was this audit created?
  What triggered the analysis?
  What governance gate or milestone is this for?

OBSERVED FILES
  List of files, components, or systems examined
  Include paths: src/pages/App.jsx

OBSERVED BEHAVIOR
  What is currently happening?
  What did you see in the code or runtime?
  Specific examples, not speculation

STRUCTURAL RISKS
  What could go wrong?
  What architectural problems exist?
  What dependencies are unclear?

CONFIRMED FACTS
  What do you KNOW is true from the code?
  What is explicitly stated in comments?
  What behavior was verified?

UNKNOWNS
  What questions remain unanswered?
  What requires further investigation?
  What cannot be determined from code review?

RECOMMENDATIONS
  What should happen next?
  What needs verification?
  What should NOT change?

================================================================================
GOVERNANCE RULES FOR AUDITS
================================================================================

Rule 1: READ-ONLY ARTIFACT
  • Audits contain zero implementation code
  • Audits make zero changes to runtime
  • Audits make zero changes to data
  • All audit files must begin with read-only comment block

Rule 2: FACT vs. SPECULATION
  • Only state observed facts from code review
  • Mark unknowns and assumptions as such
  • Never propose solutions without diagnosis
  • Never implement changes in audit file

Rule 3: STRUCTURED ANALYSIS
  • Use required sections (context, observed, risks, facts, unknowns, recommendations)
  • Stay focused on one architectural concern
  • Document what is known and what isn't
  • Never mix implementation with analysis

Rule 4: PERMANENT RECORD
  • Audits are stored in repository forever
  • Audits are referenced in execution log
  • Future developers will read these audits
  • Write clearly for external review

Rule 5: GOVERNANCE COMPLIANCE
  • Never touch frozen Phase 2 files
  • Never modify protected routes or auth logic
  • Never change execution log without explicit gate
  • Link audit findings to HAUPTINSTRUKS rules

================================================================================
HOW AUDITS RELATE TO EXECUTION LOG
================================================================================

Execution Log (src/components/governance/Phase25ExecutionLog_*.jsx):
  • Records CHANGES that were made
  • Documents decisions and approvals
  • Links to audits that informed decisions
  • Permanent change history

Audits (src/components/audits/*.jsx):
  • Record ANALYSIS of current state
  • Document observations before changes
  • Serve as baseline for risk assessment
  • Enable safe refactoring preparation

WORKFLOW:
  1. Create audit → Analyze current state
  2. Review audit → Understand risks
  3. Make decision → Propose changes
  4. Update execution log → Record decision
  5. Implement change → Apply approved modification

================================================================================
AUDIT FILE NAMING
================================================================================

Format: {TOPIC}_AUDIT_YYYY_MM_DD.jsx

Examples:
  • ROUTING_AUDIT_2026_03_11.jsx
  • PROJECT_STRUCTURE_AUDIT_2026_03_11.jsx
  • PHASE_LOCK_AUDIT_2026_03_11.jsx
  • DATA_FLOW_AUDIT_2026_03_11.jsx

Include date for version control and audit history.

================================================================================
READ-ONLY COMMENT BLOCK (Required)
================================================================================

Every audit file must begin with:

/*
AUDIT FILE
Read-only analysis artifact.

Do not implement fixes inside this file.
Use Execution Log for changes.
See: src/components/governance/Phase25ExecutionLog_*.jsx
*/

================================================================================
AUDIT INDEX
================================================================================

Central registry file: src/components/audits/AUDIT_INDEX.jsx

Exports metadata about all audits:
  • Audit ID and title
  • Location (file path)
  • Description
  • Date created
  • Relates to which Phase/Gate

Enables admin UI to list and review audits programmatically.
Updated whenever new audit is added.

================================================================================
NEXT STEPS
================================================================================

1. Review AUDIT_SYSTEM_GUIDE.txt (this file)
2. Check AUDIT_INDEX.jsx for list of existing audits
3. Review specific audits in src/components/audits/
4. Reference audit findings in execution log entries
5. Never modify audit files; create new ones for new analysis

================================================================================