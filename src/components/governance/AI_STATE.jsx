# AI_STATE.md — TankRadar Governance Pointer

**Last Updated:** 2026-03-11T14:00:00Z

## Purpose
This file is a **summary pointer only**. It does NOT override the execution log system.

The **authoritative source of truth** is:
1. `components/governance/Phase25ExecutionLogIndex.jsx` (Index file)
2. The active chunk referenced in Index.chunks[].status === "ACTIVE (append new entries here)"
3. `components/governance/NextSafeStep.jsx` (approved next step)

## Current State (Derived from Phase25ExecutionLogIndex.jsx)

### Execution Log
- **System:** Phase 2.5 Execution Tracking
- **Status:** active
- **Total Entries:** 78
- **Last Updated:** 2026-03-11T14:00:00Z

### Active Chunk
- **File:** Check `Phase25ExecutionLogIndex.jsx` for current activeChunk
- **Entry Range:** Dynamic (check Index)
- **Purpose:** Append new entries here

### Latest Entries (Summary)
- **Entry 78:** Governance Hardening — Future-Proof Chunk Rollover System (2026-03-11)
- **Entry 77:** UI Architecture Cleanup — Alert Architecture, Dashboard Simplification (2026-03-11)

## How to Use This File

❌ **DO NOT:**
- Use this file as the source of truth for chunk numbers
- Append entries based on the state described here
- Override Index decisions with cached state from this file

✅ **DO:**
- Read Phase25ExecutionLogIndex.jsx first (check chunks[] for ACTIVE chunk)
- Read the active chunk file referenced in Index
- Use this file as a quick reference while developing
- Update this file when major governance changes occur (not on every entry)

## Conflict Resolution

**If this file conflicts with Phase25ExecutionLogIndex.jsx:**
→ Phase25ExecutionLogIndex.jsx + active chunk are authoritative  
→ Treat this file as stale and update it after syncing with Index

## Key Rules

1. **Chunk Rollover:** When rolling 006 → 007, update Index chunks[], activeChunk, and nextChunkName. Refer to `CHUNK_ROLLOVER_RUNBOOK.jsx` for procedure.

2. **No Hardcoded Chunk References:** Generic language only. Never say "append to Phase25ExecutionLog_007.jsx" — say "append to the active chunk file referenced in activeChunk."

3. **NextSafeStep.jsx:** Check this file for the current pre-approved next step before proposing anything new.

4. **Locked Files:** Phase 2 matcher functions are frozen. Do not modify:
   - functions/deleteAllGooglePlacesPrices
   - functions/verifyGooglePlacesPriceNormalization
   - functions/deleteGooglePlacesPricesForReclassification
   - functions/classifyPricePlausibility
   - functions/classifyStationsRuleEngine
   - functions/classifyGooglePlacesConfidence

## How to Update This File

After major governance changes (e.g., chunk rollover, phase transition):
1. Read Phase25ExecutionLogIndex.jsx
2. Update this file with new entry count, last updated timestamp, and active chunk summary
3. Do NOT hardcode chunk filenames — point readers to Index instead
4. Append a note under "Latest Entries (Summary)" with the new entry

---

**Next:** Read `components/governance/NextSafeStep.jsx` for approved next development step.