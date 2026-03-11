/**
 * TANKRADAR AUDIT SYSTEM
 *
 * PURPOSE
 *
 * This directory contains architecture diagnostics for the TankRadar repository.
 *
 * Audits are READ-ONLY analysis reports used to understand system structure
 * before structural changes are made.
 *
 * Audits never modify runtime code.
 *
 * ————————————————————————————————————————————————————————————————————————————————
 *
 * DIRECTORY STRUCTURE
 *
 * src/components/audits/
 *
 *   README.jsx                    (this file)
 *   AUDIT_INDEX.jsx               (audit registry)
 *   AUDIT_SYSTEM_GUIDE.jsx        (detailed rules)
 *
 *   architecture/                 (routing, structure, data flow audits)
 *   ui/                           (interface and design audits)
 *   governance/                   (phase locks, compliance audits)
 *
 * ————————————————————————————————————————————————————————————————————————————————
 *
 * WORKFLOW: HOW TO USE THE AUDIT SYSTEM
 *
 * 1. Verify repository state
 *    Check that no major changes are in progress.
 *
 * 2. Read governance instructions
 *    src/components/governance/AI_PROJECT_INSTRUCTIONS.jsx
 *
 * 3. Check AUDIT_INDEX.jsx
 *    See what audits already exist and their status.
 *
 * 4. Read relevant audit(s)
 *    Pick audit matching your question or refactoring goal.
 *
 * 5. If system structure is unclear
 *    Create a new audit describing the problem.
 *    Use AUDIT_SYSTEM_GUIDE.jsx for required sections.
 *
 * 6. Only then propose structural changes
 *    Reference the audit findings in your proposal.
 *
 * ————————————————————————————————————————————————————————————————————————————————
 *
 * CRITICAL RULE
 *
 * Structural changes must not be implemented before an audit exists
 * describing the current system behavior, risks, and dependencies.
 *
 * Audits → Understanding → Decisions → Changes
 *
 * Not: Changes → Understanding
 *
 * ————————————————————————————————————————————————————————————————————————————————
 *
 * CATEGORIES
 *
 * architecture/ — Code structure, routing, data flow, component hierarchy
 * ui/           — Interface design, visual consistency, layout, UX clarity
 * governance/   — Phase locks, rule compliance, execution log integrity
 *
 * ————————————————————————————————————————————————————————————————————————————————
 *
 * KEY FILES
 *
 * AUDIT_INDEX.jsx         — Registry of all audits (start here)
 * AUDIT_SYSTEM_GUIDE.jsx  — Detailed audit rules and required sections
 * AI_PROJECT_INSTRUCTIONS.jsx — Governance and frozen files
 *
 * ————————————————————————————————————————————————————————————————————————————————
 *
 * IMPORTANT NOTES
 *
 * • Audits are documentation only (zero code changes)
 * • All audits are permanent repository records
 * • Audits reference observations, not assumptions
 * • Audits identify risks and unknowns explicitly
 * • New audits created when system understanding is needed
 * • Audits linked to execution log when changes are made
 *
 * ————————————————————————————————————————————————————————————————————————————————
 */

export const AUDIT_SYSTEM_README = {
  purpose: "Quick reference for TankRadar audit system",
  location: "src/components/audits/",
  startHere: "AUDIT_INDEX.jsx",
  detailedRules: "AUDIT_SYSTEM_GUIDE.jsx"
};

export default AUDIT_SYSTEM_README;