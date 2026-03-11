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
  id: "phase25_step_63",

  title: "Improve station selection when user logs price",

  description:
    "When multiple stations are close (example Circle K vs Uno-X across the street), " +
    "add a lightweight confirmation UI allowing the user to correct the detected station.",

  files: [
    "components/logprice/StationPicker.jsx",
    "components/logprice/ProximityConfirmBanner.jsx",
    "pages/LogPrice.jsx"
  ],

  goals: [
    "reduce incorrect station submissions",
    "allow quick correction when stations are very close",
    "improve user trust in price logging"
  ],

  constraints: [
    "UI only",
    "do not modify Phase-2 matching engine",
    "do not modify locked functions",
    "do not create Station automatically"
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
  ],

  status: "approved",
  approvedDate: "2026-03-11",
  linkedEntries: [61, 62]
};

export default NEXT_SAFE_STEP;