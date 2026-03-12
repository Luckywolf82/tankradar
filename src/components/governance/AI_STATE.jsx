# AI_STATE.jsx — TankRadar Governance Pointer

> ⚠ **STALE DATA WARNING**
>
> The entry count and "Latest Entries" shown in this file are **OUT OF DATE**.
>
> **DO NOT use this file for entry count, chunk identification, or current state.**
>
> This file has not been updated since Entry 78. Actual current entry count is **98**.
>
> **Authoritative source of truth (read these instead):**
> 1. `components/governance/Phase25ExecutionLogIndex.jsx` — entry count, active chunk, locked files
> 2. The active chunk referenced in `Index.chunks[].status === "ACTIVE"` — currently `Phase25ExecutionLog_007.jsx`
> 3. `components/governance/NextSafeStep.jsx` — approved next step

---

## Purpose

This file is a **summary pointer only**. It does NOT override the execution log system.

---

## ❌ KNOWN STALE DATA (DO NOT USE)

- **Stale Entry Count:** ~~78~~ → Actual count: **97** (verified in Phase25ExecutionLogIndex.jsx)
- **Stale Last Updated:** ~~2026-03-11T14:00:00Z~~ → Actual: **2026-03-12T01:00:00Z**
- **Stale Latest Entries:** ~~Entry 78~~ → Actual latest: **Entry 97** (Audit System Hardening Pass)

This stale data is intentionally preserved as a record. **Never act on it.**

---

## Current State (Always derive from Phase25ExecutionLogIndex.jsx)

### Execution Log
- **System:** Phase 2.5 Execution Tracking
- **Status:** active
- **Total Entries:** 97 ← verified in Phase25ExecutionLogIndex.jsx
- **Last Updated:** 2026-03-12T01:00:00Z ← verified in Phase25ExecutionLogIndex.jsx

### Active Chunk
- **File:** Check `Phase25ExecutionLogIndex.jsx` → `chunks[]` → status `"ACTIVE"` → currently `Phase25ExecutionLog_007.jsx`
- **Entry Range:** 87–97 (dynamic — verify in Index before appending)
- **Purpose:** Append new entries here

### Latest Entries (Summary — from Phase25ExecutionLog_007.jsx)
- **Entry 97:** Audit System Hardening Pass — CHATGPT_INSTRUCTIONS renamed, governance pointers corrected (2026-03-12)
- **Entry 96:** Governance + Workflow Coherence Audit (2026-03-12)
- **Entry 95:** Engagement Impact Review — Post-Entry-94 Gamification Analysis (2026-03-11)
- **Entry 94:** Gamification Pass 1 — Streak Counter + Social Proof (2026-03-11)
- **Entry 93:** Activation Impact Review (2026-03-11)

---

## How to Use This File

❌ **DO NOT:**
- Use this file as the source of truth for chunk numbers
- Append entries based on the state described here
- Override Index decisions with cached state from this file
- Trust entry count or "Latest Entries" without verifying against Phase25ExecutionLogIndex.jsx

✅ **DO:**
- Read `Phase25ExecutionLogIndex.jsx` first (check `chunks[]` for ACTIVE chunk)
- Read the active chunk file referenced in Index (`Phase25ExecutionLog_007.jsx`)
- Read `NextSafeStep.jsx` for approved next development step
- Treat this file as a fast-orientation pointer only

---

## Conflict Resolution

**If this file conflicts with Phase25ExecutionLogIndex.jsx:**
→ Phase25ExecutionLogIndex.jsx + active chunk are authoritative
→ Treat this file as stale and update it after syncing with Index

---

## Key Rules

1. **Chunk Rollover:** When rolling 007 → 008, update Index `chunks[]`, `activeChunk`, and `nextChunkName`. Refer to `CHUNK_ROLLOVER_RUNBOOK.jsx` for procedure.

2. **No Hardcoded Chunk References:** Generic language only. Identify chunk from Index `activeChunk` field — do not assume filename.

3. **NextSafeStep.jsx:** Check this file for the current pre-approved next step before proposing anything new.

4. **Agent Instructions:** See `CHATGPT_INSTRUCTIONS.jsx` (renamed from AI_PROJECT_INSTRUCTIONS.jsx in Entry 97).

5. **Governance Authority:** `BASE44_PROJECT_INSTRUCTIONS.jsx` is the sole canonical governance file.

6. **Locked Files:** Phase 2 matcher functions are frozen. Do not modify:
   - functions/deleteAllGooglePlacesPrices
   - functions/verifyGooglePlacesPriceNormalization
   - functions/deleteGooglePlacesPricesForReclassification
   - functions/classifyPricePlausibility
   - functions/classifyStationsRuleEngine
   - functions/classifyGooglePlacesConfidence

---

**Next:** Read `components/governance/NextSafeStep.jsx` for approved next development step.