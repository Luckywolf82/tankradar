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
  id: "phase25_step_65",

  title: "Remove unnecessary city input when a station is already selected",

  description:
    "In the LogPrice confirm step, when a station candidate was already selected " +
    "(stationInfo.station_id is set OR stationInfo.station_name is non-empty), " +
    "the city input field is currently still shown and required. " +
    "This creates unnecessary friction. " +
    "The fix: hide/skip the city input entirely when station metadata is already known, " +
    "and only show it as a fallback when no station was selected (manual entry path).",

  files: [
    "components/logprice/ConfirmPrice.jsx"
  ],

  goals: [
    "reduce friction in the confirm step for users who picked a station",
    "city field is already captured from station metadata — no need to re-ask",
    "keep city input only for the manual-entry (no station selected) fallback path"
  ],

  constraints: [
    "UI only — ConfirmPrice.jsx only",
    "do NOT modify Station entity",
    "do NOT modify matching engine",
    "do NOT modify locked Phase-2 files",
    "do NOT add new fields or entities",
    "do NOT bundle unrelated changes"
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

  status: "approved",
  approvedDate: "2026-03-11",
  linkedEntries: [61, 62, 63, 64]
};

export default NEXT_SAFE_STEP;