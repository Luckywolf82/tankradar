// NEXT SAFE STEP — TankRadar canonical implementation queue
// This file defines the single approved next development step.
// AI agents MUST read this file before proposing any new implementation.
//
// GOVERNANCE RULE (authoritative):
// Before proposing any implementation, AI must:
//   1. Read Phase25ExecutionLogIndex.jsx
//   2. Read the active execution log chunk listed there
//   3. Read this file (NextSafeStep.js)
//
// If NEXT_SAFE_STEP is defined here, it OVERRIDES any guess derived
// from scanning execution log previews or AI_STATE alone.
// User must explicitly override NEXT_SAFE_STEP to propose a different step.

export const NEXT_SAFE_STEP = {
  id: "phase25_step_66",

  title: "Await explicit user direction — no pre-authorized next step",

  description:
    "Entry 65 (city-input friction fix) is the last pre-authorized improvement in the current queue. " +
    "No further implementation step has been approved. " +
    "AI must not propose or implement any new step until the user explicitly defines the next task.",

  files: [],

  goals: [
    "hold position — no speculation about next step",
    "await explicit user instruction before any new implementation"
  ],

  constraints: [
    "do NOT propose new features without user instruction",
    "do NOT modify any files without explicit approval",
    "do NOT modify locked Phase-2 files under any circumstances"
  ],

  governanceRule: {
    preflightOrder: [
      "1. Read Phase25ExecutionLogIndex.jsx",
      "2. Read the active execution log chunk (currently Phase25ExecutionLog_005.jsx)",
      "3. Read NextSafeStep.js (this file)"
    ],
    priority:
      "If NEXT_SAFE_STEP is defined here, AI must implement it before proposing any other step " +
      "unless the user explicitly overrides it in the conversation.",
    conflictResolution:
      "Phase25ExecutionLogIndex.jsx + active chunk are authoritative over AI_STATE.md. " +
      "If they disagree, trust the execution log."
  },

  status: "awaiting_user_direction",
  approvedDate: "2026-03-11",
  linkedEntries: [61, 62, 63, 64, 65]
};

export default NEXT_SAFE_STEP;