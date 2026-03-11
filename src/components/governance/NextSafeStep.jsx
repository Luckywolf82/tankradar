// NEXT SAFE STEP — TankRadar canonical implementation queue
// This file defines the single approved next development step.
// AI agents MUST read this file before proposing any new implementation.

export const NEXT_SAFE_STEP = {
  id: "phase25_step_69",

  title: "Await explicit user direction — no pre-authorized next step",

  description:
    "Entry 68 (navigation and page responsibility cleanup) is the last pre-authorized improvement. " +
    "The primary nav is now clean (4–5 items), Profile absorbs logout/settings/Områdevarsler, " +
    "Statistics header is simplified, and internal enum labels are removed from UI. " +
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
      "Phase25ExecutionLogIndex.jsx + active chunk are authoritative over AI_STATE.md."
  },

  status: "awaiting_user_direction",
  approvedDate: "2026-03-11",
  linkedEntries: [61, 62, 63, 64, 65, 66, 67, 68]
};

export default NEXT_SAFE_STEP;