# PROJECT GOVERNANCE — TANKRADAR
v1.0 (Canonical Master Governance Document)

Datert: 2026-03-10  
Status: Master Governance Document

---

## CORE PRINCIPLES

### 1. GitHub Repository is Canonical Source of Truth

- GitHub repository state is the **only** authoritative project state
- Base44 editor state is temporary working state only
- If GitHub and editor state differ: **repository state wins**
- All completion gates require GitHub verification
- Do not assume editor state reflects published reality

### 2. Development Loop

Standard workflow:

```
verify → propose → implement → publish → verify
```

**Steps:**

1. Verify repository state (read Phase25ExecutionLogIndex.jsx)
2. Propose minimal next step
3. Implement in Base44 editor
4. Publish (Base44 sync to GitHub)
5. Verify GitHub state matches expectations

**Critical rule:** Task is not complete until GitHub reflects the change.

### 3. Execution Log Architecture

TankRadar uses chunked execution log system.

**Canonical entry point:**
```
src/components/governance/Phase25ExecutionLogIndex.jsx
```

**Chunked structure:**
```
Phase25ExecutionLogIndex.jsx        ← READ THIS FIRST
Phase25ExecutionLog_001.jsx         ← Entries 1–10
Phase25ExecutionLog_002.jsx         ← Entries 11–20
Phase25ExecutionLog_003.jsx         ← Entries 21–30
Phase25ExecutionLog_004.jsx         ← Entries 31–40
Phase25ExecutionLog_005.jsx         ← Entries 41–51+ (ACTIVE)
Phase25ExecutionLog.jsx             ← DEPRECATED STUB ONLY
```

**Append rules:**
- Read Phase25ExecutionLogIndex.jsx to find active chunk
- Append new entries ONLY to active chunk (currently 005)
- Never create per-entry files (Phase25ExecutionLog_EntryXX.jsx)
- Never create summary/incident files
- Never write to deprecated stub (Phase25ExecutionLog.jsx)

### 4. Locked Files (Protected Core Logic)

These files are frozen and cannot be modified without explicit governance review:

```
functions/matchStationForUserReportedPrice.ts
functions/auditPhase2DominanceGap.ts
functions/getNearbyStationCandidates.ts
functions/validateDistanceBands.ts
functions/classifyStationsRuleEngine.ts
functions/classifyGooglePlacesConfidence.ts
functions/classifyPricePlausibility.ts
functions/deleteAllGooglePlacesPrices.ts
functions/deleteGooglePlacesPricesForReclassification.ts
functions/verifyGooglePlacesPriceNormalization.ts
```

**If you attempt to modify a locked file:** Operation will be rejected with error message.

**If a locked file change is necessary:**

1. Stop implementation
2. Report which file and why
3. Request explicit approval before proceeding

### 5. Completion Gate

A task is complete **only when:**

1. All changes exist in GitHub repository
2. All changes are logged in execution log (with GitHub visibility status)
3. All locked files verified UNTOUCHED

**If GitHub does not reflect the change:**
- Task is **incomplete**
- Do not mark as done
- Do not create workaround or summary files
- Verify sync and retry

### 6. Data Integrity Rules

System distinguishes clearly between data types:

- `national_average` — National fuel price average
- `regional_average` — Regional/county averages
- `station_level` — Individual station prices
- `station` — Station catalog (no price data)
- `user_reported` — User-submitted price reports

**Rules:**
- Never blend these types or present with same granularity
- No silent fallbacks—always explain explicitly
- Unknown values: use `null` or `unknown`, not guesses
- Metadata required: sourceName, sourceUrl, fetchedAt, sourceUpdatedAt, sourceFrequency, parserVersion, confidenceScore, priceType

### 7. Critical System Surfaces (Protected)

Do not introduce alternatives, parallel engines, or workarounds:

1. Station identity / station mastering
2. Station matching pipeline
3. FuelPrice → Station linkage
4. Duplicate remediation logic
5. Alert triggering logic
6. Notification generation pipeline

**If new logic is needed in critical surfaces:**
- Propose design change first
- Get explicit approval
- No implementation before approval

### 8. Change Scope Limits

Per implementation step, maximum:

- 3 files modified
- 1 new entity
- 1 new backend function
- 1 new UI component

**If larger change needed:** Propose plan that splits work into multiple steps, get approval, then proceed step-by-step.

### 9. Repository Verification Protocol

**For all major decisions, verify:**

1. Phase25ExecutionLogIndex.jsx (read from GitHub)
2. Active chunk filename and entry count
3. Siste entry content
4. Locked file status

**If cannot verify:** Report "Repository state cannot be verified" and stop.

---

## GOVERNANCE FILES

### Canonical Governance Files (Use These)

These files define all rules and are the source of truth:

```
components/governance/PROJECT_GOVERNANCE.md
  └─ Master governance (this file)

components/governance/CHATGPT_PROJECT_INSTRUCTIONS.md
  └─ AI agent behavioral rules

components/governance/BASE44_PROJECT_INSTRUCTIONS.md
  └─ Base44 platform-specific rules

components/governance/AI_BOOTSTRAP.md
  └─ Startup sequence for AI agents
```

### Legacy/Deprecated Governance Files

These files are deprecated and should not be edited:

```
components/governance/AI_PROJECT_INSTRUCTIONS.md
  └─ Deprecated (replaced by canonical files above)
```

Old governance instructions are moved to canonical files. Legacy file serves as stub only.

---

## EXECUTION LOG ENTRY REQUIREMENTS

Each entry must contain:

- **Task requested** — What was asked
- **Files created** — New files (if any)
- **Files modified** — Changed files
- **What was implemented** — Technical details
- **Verification** — Locked files untouched, expected behavior preserved
- **GitHub visibility status** — One of:
  - "Confirmed visible in GitHub after publish"
  - "Not yet visible in GitHub after publish"
  - "Awaiting sync verification"

---

## SYSTEM STRUCTURE

### Data Model

Central entities:

```
Station                 — Fuel station master record
FuelPrice              — Price data points
StationCandidate       — Potential new stations for review
StationReview          — Manual review tasks
SourceRegistry         — Data source metadata
```

**Principle:** Different source adapters → Shared mastering core

Adapters handle ingest only. Matching, station identity, and review governance happen in shared core.

### Critical Thresholds (Locked)

```
SCORE_MATCHED = 65
SCORE_REVIEW_THRESHOLD = 35
DOMINANCE_GAP_MIN = 10
```

Cannot be changed without explicit governance approval.

---

## VERSION HISTORY

- v1.0 (2026-03-10) — Consolidated master governance document

**Prior versions consolidated into canonical files:**
- Old AI_PROJECT_INSTRUCTIONS v1.4 content split into PROJECT_GOVERNANCE, CHATGPT_PROJECT_INSTRUCTIONS, BASE44_PROJECT_INSTRUCTIONS, AI_BOOTSTRAP