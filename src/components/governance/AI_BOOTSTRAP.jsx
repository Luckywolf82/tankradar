# AI AGENT STARTUP PROTOCOL — TANKRADAR
v1.0 (Agent Boot Sequence)

Datert: 2026-03-10  
Status: Startup Instructions for AI Agents

---

## STARTUP CHECKLIST

When beginning work on TankRadar, follow this sequence **every time**:

### 1. Load Governance Rules

**Read in this order:**

```
1st → components/governance/PROJECT_GOVERNANCE.md
      (Master rules, core principles)

2nd → components/governance/CHATGPT_PROJECT_INSTRUCTIONS.md
      (Your behavioral rules as AI agent)

3rd → components/governance/BASE44_PROJECT_INSTRUCTIONS.md
      (Platform-specific rules)

4th → This file (AI_BOOTSTRAP.md)
      (You are reading this)
```

**Action:** Take 2-3 minutes to skim all four files before starting.

### 2. Verify Repository State

**Access GitHub:**

If possible, directly check:
- Repository: https://github.com/Luckywolf82/tankradar
- Canonical governance file: `components/governance/PROJECT_GOVERNANCE.md`

**If GitHub access unavailable:**
- Use Base44 editor state
- Mark all state information as "editor state only, GitHub verification pending"
- Do not propose changes until GitHub verification possible

### 3. Read Execution Log Index

**File:** `components/governance/Phase25ExecutionLogIndex.jsx`

**Extract:**

1. Current entryCount (total entries logged)
2. Active chunk name (where to append new entries)
3. Last entry number in active chunk
4. Next planned chunk range

**Example output:**

```
✓ entryCount: 53
✓ Active chunk: Phase25ExecutionLog_005.jsx
✓ Entry range in 005: 41–53
✓ Next chunk: Phase25ExecutionLog_006.jsx (52–71, when needed)
```

### 4. Read Last Entry in Active Chunk

**File:** `src/components/governance/Phase25ExecutionLog_005.jsx`

**Read to end of file:**

1. What was the last task?
2. What changed?
3. What's the GitHub visibility status?
4. What was verified?

**This context is critical for proposing next step.**

### 5. Verify Locked Files Exist and Are Untouched

**Locked files (cannot modify):**

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

**Verification:**

If possible, check GitHub or editor to confirm these files exist and appear unchanged from previous entries.

**If a locked file is modified:**
- STOP immediately
- Report modification detected
- Request explicit approval before proceeding

### 6. Identify Current Phase

**Based on last execution log entry:**

Identify what phase the project is in:

- Phase 2 → Matching logic (FROZEN)
- Phase 3 → Duplicate remediation
- Phase 4 → Admin governance
- Phase 5 → SystemHealth dashboard
- Phase 6 → Alerts and notifications
- Phase 7+ → Future phases

**This context helps you understand constraints.**

### 7. Understand Current Problems (If Any)

**From last entry, identify:**

1. Were there any unresolved issues?
2. Are there any pending GitHub verification?
3. Were there any workarounds or compromises?
4. What was the proposed next step?

### 8. Prepare to Propose One Safe Step

**You are now ready to:**

1. Answer user questions with proper context
2. Propose minimal next step based on last entry
3. Implement with governance awareness
4. Publish and verify

**One minimal step = one execution log entry.**

**Never:**
- Propose multiple unrelated changes
- Skip steps
- Work around locked files
- Ignore verification requirements

---

## QUICK REFERENCE DURING SESSION

### If User Asks About State

**Response template:**

"Let me verify current state:

Last entry: Entry 53 (Governance consolidation)
GitHub state: [checked/pending verification]
Active chunk: Phase25ExecutionLog_005.jsx
Locked files: Verified untouched
Next step: [Propose one minimal step]

Ready to proceed with approval."

### If You Encounter Error

**Response template:**

"Error encountered: [Error message]

Root cause: [Identified cause]
Governance impact: [Does it violate rules?]
Next action: [Proposed fix or request for guidance]

Status: [Blocked / Can retry / Needs approval]"

### If Task is Complete

**Response template:**

"✓ Task complete

Changes implemented:
- [File 1: change]
- [File 2: change]

GitHub verification:
- [Status: Confirmed visible / Not yet visible / Awaiting sync]

Execution log:
- Entry [N] appended to Phase25ExecutionLog_005.jsx

Locked files:
- ✓ All verified untouched"

### If Cannot Verify State

**Response template:**

"Repository verification required.

Cannot access GitHub in current environment.
Editor state shows: [state info]
Full verification pending.

Proceeding with caution. All changes marked for GitHub verification before completion."

---

## GOVERNANCE RULES YOU MUST FOLLOW

### ✓ Do This

- ✓ Verify GitHub state before proposing changes
- ✓ Read execution log index and last entry every session
- ✓ Propose one minimal step at a time
- ✓ Check locked files before implementing
- ✓ Verify GitHub after publishing
- ✓ Append execution log entry with GitHub visibility status
- ✓ Ask for approval before implementing
- ✓ Report failures honestly
- ✓ Stop if locked file is modified
- ✓ Mark task complete only after GitHub verification

### ✗ Never Do This

- ✗ Answer repository questions from memory
- ✗ Assume editor state is published
- ✗ Modify locked files without approval
- ✗ Create workaround files or summaries
- ✗ Propose multiple unrelated changes
- ✗ Mark task complete before GitHub verification
- ✗ Ignore execution log requirements
- ✗ Skip locked file verification
- ✗ Deploy code that violates scope limits
- ✗ Work around governance rules

---

## CRITICAL RULES

### Rule 1: GitHub is Source of Truth

If editor and GitHub differ:
- **Repository state wins**
- Do not trust editor state alone
- Verify GitHub for all completion claims

### Rule 2: One Step at a Time

- One execution log entry = one coherent step
- Multiple unrelated changes = fail
- Scope limits: max 3 files, 1 entity, 1 function, 1 UI component

### Rule 3: Locked Files Cannot Change

Phase 2 matching logic is frozen. 10 specific files protected:

- If modification requested: Stop and ask for approval
- If modification attempted: Expect deployment error
- Never work around locks with alternative code

### Rule 4: Completion Requires GitHub Verification

- Publishing to Base44 ≠ completion
- GitHub verification required
- Only mark complete after GitHub checked
- Include visibility status in log entry

### Rule 5: Execution Log is Governance Record

- Every significant change = one entry
- No per-entry files, no summaries, no incidents
- Append to active chunk only
- Include all required metadata

---

## REFERENCE

Master governance: `components/governance/PROJECT_GOVERNANCE.md`  
AI agent rules: `components/governance/CHATGPT_PROJECT_INSTRUCTIONS.md`  
Base44 platform rules: `components/governance/BASE44_PROJECT_INSTRUCTIONS.md`  
Execution log: `components/governance/Phase25ExecutionLogIndex.jsx