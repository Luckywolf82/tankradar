/**
 * GOVERNANCE ARCHITECTURE MAP
 *
 * PURPOSE
 *
 * Describes the governance systems that control TankRadar development.
 *
 * This map shows how project rules, audits, execution logs, and instructions
 * work together to ensure safe, structured, and traceable development.
 *
 * ————————————————————————————————————————————————————————————————————————————————
 *
 * GOVERNANCE SYSTEM OVERVIEW
 *
 * Four interlocking systems control development:
 *
 * 1. AI_PROJECT_INSTRUCTIONS
 *    Purpose: Central governance rules for all AI agents
 *    Contents: Audit rules, frozen files, forbidden actions, mandatory preflight
 *    Audience: AI agents and developers
 *    Authority: Read-only reference; must be checked before any implementation
 *
 * 2. EXECUTION LOG (Phase25ExecutionLogIndex + chunks)
 *    Purpose: Canonical audit trail of all changes made
 *    Structure: Index file + chunked historical records
 *    Contents: Entry descriptions, timestamps, phase markers
 *    Authority: Source of truth for what has been done
 *    Current Active Chunk: Phase25ExecutionLog_006.jsx
 *
 * 3. ARCHITECTURE MAP
 *    Purpose: Snapshot of application structure
 *    Contents: Router, pages, entities, components, automations
 *    Audience: AI agents and developers
 *    Authority: Reference for understanding system design
 *
 * 4. AUDIT SYSTEM
 *    Purpose: Read-only analysis before changes
 *    Structure: components/audits/ with subcategories
 *    Contents: Architecture, UI, and governance audits
 *    Authority: Documents risks and unknowns before implementation
 *
 * ————————————————————————————————————————————————————————————————————————————————
 *
 * MANDATORY PREFLIGHT WORKFLOW
 *
 * All AI agents MUST execute in this order before proposing changes:
 *
 * 1. Read Phase25ExecutionLogIndex.jsx (entry point)
 * 2. Read active execution log chunk (current work)
 * 3. Read components/governance/NextSafeStep.jsx (approved action)
 * 4. Read AI_PROJECT_INSTRUCTIONS.jsx (governance rules)
 * 5. Check AUDIT_INDEX.jsx for relevant existing audits
 * 6. Create new audit if system understanding is needed
 *
 * ————————————————————————————————————————————————————————————————————————————————
 *
 * FROZEN FILES (Phase 2 — Read-Only)
 *
 * These 6 files are locked and cannot be modified:
 *
 * • functions/deleteAllGooglePlacesPrices
 * • functions/verifyGooglePlacesPriceNormalization
 * • functions/deleteGooglePlacesPricesForReclassification
 * • functions/classifyPricePlausibility
 * • functions/classifyStationsRuleEngine
 * • functions/classifyGooglePlacesConfidence
 *
 * Attempting to modify these files will result in error.
 * Changes to these systems require explicit governance gate approval.
 *
 * ————————————————————————————————————————————————————————————————————————————————
 *
 * GOVERNANCE FILE LOCATIONS
 *
 * Core Governance:
 * • components/governance/AI_PROJECT_INSTRUCTIONS.jsx — Development rules
 * • components/governance/Phase25ExecutionLogIndex.jsx — Execution log index
 * • components/governance/Phase25ExecutionLog_006.jsx — Active execution log
 * • components/governance/NextSafeStep.jsx — Current approved action
 * • components/governance/ARCHITECTURE_MAP.jsx — Application structure
 * • components/governance/GOVERNANCE_ARCHITECTURE_MAP.jsx — This file
 *
 * Audit System:
 * • components/audits/AUDIT_INDEX.jsx — Audit registry
 * • components/audits/AUDIT_SYSTEM_GUIDE.jsx — Audit rules
 * • components/audits/README.jsx — Quick reference
 * • components/audits/architecture/ — Structure audits
 * • components/audits/ui/ — Design audits
 * • components/audits/governance/ — Compliance audits
 *
 * ————————————————————————————————————————————————————————————————————————————————
 *
 * FORBIDDEN ACTIONS
 *
 * AI agents must NOT:
 * • Modify locked Phase 2 files
 * • Guess next step from execution log titles alone
 * • Implement without reading active execution log chunk
 * • Bundle unrelated changes into single step
 * • Override execution log decisions with chat-only discussions
 * • Skip mandatory preflight workflow
 *
 * ————————————————————————————————————————————————————————————————————————————————
 *
 * AUTHORITY HIERARCHY
 *
 * When conflicts occur, authority is:
 *
 * 1. EXECUTION LOG (index + active chunk) — Source of truth
 * 2. NextSafeStep.jsx — Approved next action
 * 3. AI_PROJECT_INSTRUCTIONS.jsx — Governance rules
 * 4. AUDIT_INDEX + existing audits — System understanding
 * 5. ARCHITECTURE_MAP.jsx — System structure reference
 *
 * If systems conflict, execution log is canonical.
 *
 * ————————————————————————————————————————————————————————————————————————————————
 *
 * PHASE TRACKING
 *
 * Current Phase: Phase 2.5 (Governance Hardening + Data Architecture)
 * Status: Active
 * Entry Count: 81
 * Active Chunk: Phase25ExecutionLog_006.jsx (entries 77–81)
 * Rollover Threshold: ~20 entries or 250KB per chunk
 *
 * ————————————————————————————————————————————————————————————————————————————————
 *
 * KEY PRINCIPLES
 *
 * 1. Transparency: All changes recorded in execution log
 * 2. Auditability: Decisions documented before implementation
 * 3. Safety: Frozen files protect critical systems
 * 4. Traceability: Every change links to governance decision
 * 5. Clarity: Governance rules always documented
 * 6. Accountability: All actions recorded with timestamps
 *
 * ————————————————————————————————————————————————————————————————————————————————
 */

export const GOVERNANCE_ARCHITECTURE_MAP = {
  
  // CORE GOVERNANCE SYSTEMS
  governanceSystems: {
    aiProjectInstructions: {
      file: "components/governance/AI_PROJECT_INSTRUCTIONS.jsx",
      purpose: "Central governance rules for AI agents",
      contains: [
        "Audit storage rules",
        "Frozen files list",
        "Mandatory preflight steps",
        "Forbidden actions",
        "Audit types and scopes"
      ]
    },
    
    executionLog: {
      indexFile: "components/governance/Phase25ExecutionLogIndex.jsx",
      activeChunk: "components/governance/Phase25ExecutionLog_006.jsx",
      purpose: "Canonical audit trail of all changes",
      structure: "Index + chunked historical records",
      currentPhase: "Phase 2.5",
      entryCount: 81,
      rolloverThreshold: "~20 entries or 250KB"
    },
    
    architectureMap: {
      file: "components/governance/ARCHITECTURE_MAP.jsx",
      purpose: "Snapshot of application runtime structure",
      contains: [
        "Router configuration",
        "Page organization",
        "Entity definitions",
        "Component system",
        "Automation systems",
        "Frozen files list"
      ]
    },
    
    auditSystem: {
      location: "components/audits/",
      purpose: "Read-only analysis before structural changes",
      categories: [
        "architecture/ (system structure audits)",
        "ui/ (interface design audits)",
        "governance/ (compliance audits)"
      ],
      registry: "AUDIT_INDEX.jsx"
    }
  },
  
  // MANDATORY WORKFLOW
  mandatoryPreflight: [
    "1. Read Phase25ExecutionLogIndex.jsx (entry point)",
    "2. Read active execution log chunk",
    "3. Read NextSafeStep.jsx (approved action)",
    "4. Read AI_PROJECT_INSTRUCTIONS.jsx (rules)",
    "5. Check AUDIT_INDEX.jsx for existing audits",
    "6. Create new audit if understanding is unclear"
  ],
  
  // FROZEN FILES (PHASE 2)
  frozenPhase2Files: [
    "functions/deleteAllGooglePlacesPrices",
    "functions/verifyGooglePlacesPriceNormalization",
    "functions/deleteGooglePlacesPricesForReclassification",
    "functions/classifyPricePlausibility",
    "functions/classifyStationsRuleEngine",
    "functions/classifyGooglePlacesConfidence"
  ],
  
  // FORBIDDEN ACTIONS
  forbiddenActions: [
    "Modify locked Phase 2 files",
    "Guess next step from execution log titles",
    "Implement without reading active log chunk",
    "Bundle unrelated changes",
    "Override execution log with chat-only decisions",
    "Skip mandatory preflight"
  ],
  
  // AUTHORITY HIERARCHY
  authorityHierarchy: [
    "1. Execution log (index + active chunk)",
    "2. NextSafeStep.jsx",
    "3. AI_PROJECT_INSTRUCTIONS.jsx",
    "4. AUDIT_INDEX + existing audits",
    "5. ARCHITECTURE_MAP.jsx"
  ],
  
  // KEY PRINCIPLES
  keyPrinciples: [
    "Transparency: All changes recorded",
    "Auditability: Decisions documented before implementation",
    "Safety: Frozen files protect critical systems",
    "Traceability: Every change linked to decision",
    "Clarity: Rules always documented",
    "Accountability: All actions timestamped and recorded"
  ],
  
  lastUpdated: "2026-03-11"
};

export default GOVERNANCE_ARCHITECTURE_MAP;