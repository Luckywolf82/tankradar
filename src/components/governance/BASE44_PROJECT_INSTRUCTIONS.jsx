# BASE44_PROJECT_INSTRUCTIONS

**Canonical Governance Document for TankRadar**  
Version: 1.4  
Status: Active  
Dated: 2026-03-10

---

## Overview

This document defines the ONE AND ONLY active governance and instruction file for TankRadar development on Base44.

All AI agents, developers, and governance systems must reference this single source of truth.

**NO OTHER governance/instruction files are permitted.**

---

## 1. Execution Log System

The project uses a **chunked execution log** for complete audit trails.

**Canonical entry point:**
```
src/components/governance/Phase25ExecutionLogIndex.jsx
```

Structure:
```
Phase25ExecutionLogIndex.jsx        ← Entry point (active)
Phase25ExecutionLog_001.jsx         ← Entries 1–10 (sealed)
Phase25ExecutionLog_002.jsx         ← Entries 11–20 (sealed)
Phase25ExecutionLog_003.jsx         ← Entries 21–30 (sealed)
Phase25ExecutionLog_004.jsx         ← Entries 31–40 (sealed)
Phase25ExecutionLog_005.jsx         ← Entries 41+ (sealed)
Phase25ExecutionLog.jsx             ← Deprecated stub only
```

**Append rule:** New entries always go to the active chunk, never to the stub.

---

## 2. System Structure

Core entities:
- **Station** – Master data (source of truth for station identity)
- **FuelPrice** – Price data with mandatory source metadata
- **StationCandidate** – Proposed new stations awaiting review
- **StationReview** – Curation queue for station mastering and classification
- **SourceRegistry** – Source health and integration status

**Principle:** Different source adapters → Shared mastering core.

---

## 3. Data Integrity Rules

**Rule 1: Do not mix data types**
- Always distinguish: `national_average`, `regional_average`, `station_level`, `station`, `user_reported`
- Never present as equal quality/granularity

**Rule 2: No silent fallback**
- If a source fails/blocks/changes, ALWAYS explain explicitly before proceeding
- Mark all compromises with **KOMPROMISS:** label including: what failed, what chosen instead, impact on quality/granularity/frequency

**Rule 3: No assumptions as facts**
- Unknown values → `null` or `"unknown"` (NOT best guess)
- Applies to: `sourceUpdatedAt`, `sourceFrequency`, `chain`, `address`, `station match`, `confidenceScore`

**Rule 4: Empty state > misleading data**
- If `station_level` data missing → show clear empty state in UI
- `national_average` never used as hidden replacement for local prices

---

## 4. Source Validation

All sources register in SourceRegistry with:
- `sourceName`, `integrationStatus`, `sourceType`, `dataGranularity`, `updateFrequency`
- `lastSuccessAt`, `lastFailureAt`, `failureReason`, `notes`

**Critical:** `parser_validated` ≠ `live`
- Parser-validated = tested against fixture only
- Live = confirmed external fetch from runtime

Valid statuses: `planned`, `testing`, `parser_validated`, `live`, `blocked`, `deprecated`

---

## 5. AI Agent Rules

**One critical change at a time**  
Order: 1. Data model → 2. Known working source → 3. Dashboard → 4. New source → 5. Automations → 6. Merging → 7. Crowdsourcing

**Preview before apply**  
When changes affect many records or critical pipelines:
- Request preview/plan first
- Show examples
- Get explicit approval before implementing

**Report after each step**  
Document: what works, what doesn't, confirmed fields, compromises, next recommended step

---

## 6. StationReview Governance

StationReview is ONLY for:
- Station mastering (name changes, chain classification, duplicate resolution)
- Classification anomalies (within existing governance types)
- Manual clarifications (when rules don't provide clear answer)

**CRITICAL:** New `review_type` values require explicit governance document update FIRST.

---

## 7. Frozen Files (Do Not Edit)

These files implement critical governance logic and are locked:

```
functions/matchStationForUserReportedPrice.*
functions/auditPhase2DominanceGap.*
functions/getNearbyStationCandidates.*
functions/validateDistanceBands.*
functions/classifyStationsRuleEngine.*
functions/classifyGooglePlacesConfidence.*
functions/classifyPricePlausibility.*
functions/deleteAllGooglePlacesPrices.*
functions/deleteGooglePlacesPricesForReclassification.*
functions/verifyGooglePlacesPriceNormalization.*
```

Changes require: report + diff analysis + governance review + explicit approval.

---

## 8. Test Validity

**Fixtures ≠ Production**  
Fixtures validate parser/storage/relations/integration only.  
Match-rate/coverage NEVER evaluated based on limited fixtures.

**Test ≠ Production**  
Always report explicitly: live sources vs fixtures vs mockdata.  
Deking numbers from mixed sources never presented as real system performance.

**Before tuning matching logic:**  
Confirm: OSM catalog representative, sources live, realistic station variation.  
Otherwise: classify as `test_environment_limited`.

---

## 9. Plausibility Requirements

All price sources must pass plausibility check before storage.

If price outside realistic Norwegian range:
- Classify as `suspect`
- Do not treat as valid without explicit reason

Realistic ranges (2026 Norway):
- Gasoline 95: 16—25 NOK/L
- Diesel: 15—24 NOK/L

---

## 10. Repository Verification

**GitHub is the single source of truth.**  
Base44 runtime state is NOT sufficient for verification.

Before proposing changes, AI must verify:
1. Execution log index readable from GitHub
2. Active chunk identified
3. Last entry identified
4. Locked files untouched

If repo state cannot be verified:
```
STOP — Repository state cannot be verified.
```

No new changes proposed until verified.

---

## 11. Change Scope Limits

Per implementation step, max:
- 3 files modified
- 1 new entity
- 1 new backend function
- 1 new UI component

Larger changes require: step-by-step plan first, explicit approval of all steps, then execution.

---

## 12. Critical System Surfaces (No Parallel Changes)

These surfaces cannot be changed in parallel:
1. Station identity / station mastering
2. Station matching pipeline
3. FuelPrice → Station linkage
4. Duplicate remediation logic
5. Alert triggering logic
6. Notification generation pipeline

If new logic required within these surfaces: STOP and propose design change first.  
No implementation before explicit approval.

---

## 13. Execution Log Entry Format

Each entry must include:
- Task requested
- Files created / modified / deleted
- Diff summary
- Locked file verification ✓
- GitHub visibility status (confirmed visible OR not yet visible)

---

## 14. Forbidden Patterns

These file types are permanently forbidden:
```
Phase25ExecutionLog_EntryXX.jsx
Phase25ExecutionLog_Summary.jsx
Phase25ExecutionLog_Incident.jsx
AI_PROJECT_INSTRUCTIONS*
PROJECT_INSTRUCTIONS*
CHATGPT_PROJECT_INSTRUCTIONS*
PROJECT_GOVERNANCE*
AI_GOVERNANCE*
AI_RULES*
```

Execution log consists ONLY of: Index + Chunks + Stub.

---

## 15. Version History

- **v1.0** (2026-03-09) — Initial governance
- **v1.1** (2026-03-10) — Repository verification + locked matching rules  
- **v1.2** (2026-03-10) — GitHub visibility protocol
- **v1.3** (2026-03-10) — Chunked execution log + governance safety guards
- **v1.4** (2026-03-10) — Base44 integration + repo-sync clarity + frozen file updates
- **CLEANUP** (2026-03-10) — Single canonical instruction file (this file)

---

## End of Document

**This is the ONE AND ONLY active governance file.**  
All other AI/governance/instruction files have been removed.

Last updated: 2026-03-10