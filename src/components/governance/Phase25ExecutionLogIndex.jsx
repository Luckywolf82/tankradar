// CANONICAL EXECUTION LOG INDEX
// This file is the official entry point for TankRadar Phase 2.5 governance tracking.
// All execution history is stored in chunked log files under this directory.
//
// DO NOT append entries to Phase25ExecutionLog.jsx (old single-file model is deprecated).
// DO append new entries to the ACTIVE CHUNK FILE listed below.

export const EXECUTION_LOG_METADATA = {
  system: "Phase 2.5 Execution Tracking",
  purpose: "Governance audit trail for TankRadar station matching and duplicate remediation",
  status: "active",
  lastUpdated: "2026-03-11",
  entryCount: 61,
  
  // Chunk mapping: exact entry ranges in each file
  chunks: [
    {
      fileName: "Phase25ExecutionLog_001.jsx",
      entries: "1–10",
      status: "sealed (historical)",
      description: "Phase 2.5 initialization through filter reset implementation"
    },
    {
      fileName: "Phase25ExecutionLog_002.jsx",
      entries: "11–20",
      status: "sealed (historical)",
      description: "Duplicate detection, grouping, and Phase 3 remediation setup"
    },
    {
      fileName: "Phase25ExecutionLog_003.jsx",
      entries: "21–30",
      status: "sealed (historical)",
      description: "Phase 4A/4B governance hardening through Phase 6A alert exposure"
    },
    {
      fileName: "Phase25ExecutionLog_004.jsx",
      entries: "31–40",
      status: "sealed (historical)",
      description: "System health, Phase 2 preview panel, matching audit panel"
    },
    {
      fileName: "Phase25ExecutionLog_005.jsx",
      entries: "41–60",
      status: "ACTIVE (append new entries here)",
      description: "Parser integration refactor through price submission feedback"
    }
  ],

  // Future append rules
  futureRules: {
    activeChunk: "Phase25ExecutionLog_005.jsx",
    whenToCreateNewChunk: "When active chunk exceeds 250KB or contains ~20 entries",
    nextChunkName: "Phase25ExecutionLog_006.jsx",
    entryRangeForNextChunk: "61–80",
    updateProcedure: [
      "1. Append new entry to active chunk file (e.g., Phase25ExecutionLog_005.jsx)",
      "2. If chunk size limit reached, create next numbered chunk",
      "3. Update EXECUTION_LOG_METADATA.chunks array in this Index file",
      "4. Update activeChunk pointer",
      "5. Never split or reorganize historical chunks after initial assignment"
    ]
  },

  // Frozen Phase 2 components (protected from modification)
  frozenPhase2Files: [
    "functions/matchStationForUserReportedPrice.ts",
    "functions/auditPhase2DominanceGap.ts",
    "functions/getNearbyStationCandidates.ts",
    "functions/validateDistanceBands.ts",
    "functions/classifyStationsRuleEngine.ts",
    "functions/classifyGooglePlacesConfidence.ts",
    "functions/classifyPricePlausibility.ts",
    "functions/deleteAllGooglePlacesPrices.ts",
    "functions/deleteGooglePlacesPricesForReclassification.ts",
    "functions/verifyGooglePlacesPriceNormalization.ts"
  ],

  // How to read this log
  howToRead: {
    entryPoint: "Phase25ExecutionLogIndex.jsx (this file)",
    structure: "Index → chunk files listed above",
    chronological: "Read chunks in numerical order (001 → 005)",
    withinChunk: "Read entries in document order (top to bottom)",
    currentWork: "Check activeChunk for latest entries",
    deprecated: "Phase25ExecutionLog.jsx is a read-only stub. Do not append to it."
  }
};

export default EXECUTION_LOG_METADATA;