# Execution Log Chunk Rollover Runbook

**Purpose:** Step-by-step procedure for rolling over execution log chunks (e.g., 006 → 007 → 008) without governance drift.

---

## When to Rollover

- Active chunk exceeds **250KB** in size
- Active chunk contains **~20 entries** (approximate)
- User explicitly requests a new phase or major section

---

## Rollover Procedure

### Step 1: Create New Chunk File

```javascript
// src/components/governance/Phase25ExecutionLog_007.jsx (next sequential)

export const entry_97 = {
  timestamp: "YYYY-MM-DDTHH:MM:SSZ",
  phase: "Phase 2.5 ...",
  title: "...",
  // ... entry content
};

export default entry_97;
```

**Key:** Start entry count from `lastEntry + 1` (e.g., if chunk 006 ends at 96, chunk 007 starts at 97).

---

### Step 2: Update Phase25ExecutionLogIndex.jsx

#### 2a. Seal Previous Chunk

In the `chunks[]` array, update the previous active chunk:

```javascript
{
  fileName: "Phase25ExecutionLog_006.jsx",
  entries: "77–96",
  status: "sealed (historical)",  // ← Change from "ACTIVE" to "sealed (historical)"
  description: "..."
}
```

#### 2b. Add New Chunk as ACTIVE

```javascript
{
  fileName: "Phase25ExecutionLog_007.jsx",
  entries: "97+",
  status: "ACTIVE (append new entries here)",  // ← Explicitly mark ACTIVE
  description: "..."
}
```

#### 2c. Update futureRules

```javascript
futureRules: {
  activeChunk: "Phase25ExecutionLog_007.jsx",  // ← NEW
  whenToCreateNewChunk: "...",
  nextChunkName: "Phase25ExecutionLog_008.jsx",  // ← Plan ahead
  entryRangeForNextChunk: "117+",  // ← Assuming ~20 entries per chunk
  // rolloverChecklist and updateProcedure remain generic
}
```

#### 2d. Update howToRead.currentWork

```javascript
currentWork: "Check activeChunk field above for latest entries. Always read activeChunk to find append target.",
```

**Do NOT hardcode chunk numbers here** — reference the `activeChunk` field instead.

#### 2e. Verify requiredReadOrder

The preflight order should only mention that the **active chunk** will be read dynamically:

```javascript
requiredReadOrder: [
  "1. Read Phase25ExecutionLogIndex.jsx (this file)",
  "2. Read the active execution log chunk listed in chunks[] above (currently Phase25ExecutionLog_007.jsx) ← ACTIVE",
  "3. Read components/governance/NextSafeStep.js"
]
```

**Update the chunk number** in the comment to match new active chunk.

---

### Step 3: Scan for Stale References

Search `Phase25ExecutionLogIndex.jsx` for any hardcoded mentions of the **old** active chunk:

```bash
grep -n "Phase25ExecutionLog_006" components/governance/Phase25ExecutionLogIndex.jsx
```

- Replace all occurrences **outside of sealed historical chunk entries** with the new active chunk name.
- Example stale text to remove:
  ```javascript
  "1. Append new entry to active chunk file (e.g., Phase25ExecutionLog_006.jsx)"
  ```
  Should become:
  ```javascript
  "1. Append new entry to the active chunk file referenced in activeChunk"
  ```

---

### Step 4: Update NextSafeStep.jsx (if needed)

If `NextSafeStep.jsx` contains hardcoded references to the old active chunk, update:

```javascript
preflightOrder: [
  "1. Read Phase25ExecutionLogIndex.jsx",
  "2. Read the active execution log chunk (currently Phase25ExecutionLog_007.jsx)",  // ← UPDATE
  "3. Read NextSafeStep.js (this file)"
]
```

---

### Step 5: Append Rollover Entry to New Chunk

In the new chunk file, add an entry documenting the rollover:

```javascript
export const entry_97_ROLLOVER = {
  timestamp: "2026-MM-DDTHH:MM:SSZ",
  phase: "Phase 2.5 Chunk Rollover",
  title: "Execution Log Chunk 006 → 007 Rollover",
  
  action: "Chunk 006 sealed at 96 entries. New chunk 007 created as active append target.",
  
  changes_to_index: [
    "Updated chunks[] array: marked Phase25ExecutionLog_006.jsx as sealed",
    "Added Phase25ExecutionLog_007.jsx as ACTIVE",
    "Updated futureRules.activeChunk to Phase25ExecutionLog_007.jsx",
    "Updated nextChunkName to Phase25ExecutionLog_008.jsx",
    "Scanned and removed stale hardcoded chunk references from howToRead section",
    "Updated requiredReadOrder comment to reference new active chunk"
  ],
  
  files_modified: [
    "components/governance/Phase25ExecutionLogIndex.jsx"
  ],
  
  locked_files_verified: [
    "✓ All frozen Phase 2 files remain untouched"
  ]
};
```

---

### Step 6: Verify No Stale References Remain

1. Open `Phase25ExecutionLogIndex.jsx`
2. Visually scan for any mention of the **old** active chunk outside of the historical chunks[] array
3. If found, update it to reference `activeChunk` dynamically or update to new chunk number
4. Run grep to confirm:
   ```bash
   grep -i "Phase25ExecutionLog_006" components/governance/Phase25ExecutionLogIndex.jsx
   ```
   Should return **0 results** (or only results in sealed historical chunk entries)

---

### Step 7: Append to New Chunk & Update Index Metadata

1. Add the rollover entry to the new chunk
2. Update `entryCount` at top of Index (e.g., from 96 to 97)
3. Update `lastUpdated` timestamp
4. Verify chunks[] entries match expected ranges

---

## Common Mistakes to Avoid

❌ **Hardcoding chunk numbers in reusable procedures**
- Use `activeChunk` field dynamically instead

❌ **Forgetting to update requiredReadOrder comment**
- The comment should explicitly state the current active chunk for clarity

❌ **Leaving example text that says "e.g., Phase25ExecutionLog_006.jsx"**
- Replace with generic language like "the active chunk file referenced in activeChunk"

❌ **Not sealing previous chunk before marking new one ACTIVE**
- Always update status field in chunks[]

❌ **Modifying locked Phase 2 files during rollover**
- Rollover touches **governance only** — never matcher, freezer, or classifiers

---

## Verification Checklist

- [ ] New chunk file created and numbered sequentially
- [ ] New chunk status set to "ACTIVE (append new entries here)"
- [ ] Previous chunk sealed in chunks[] array
- [ ] activeChunk pointer updated
- [ ] nextChunkName planning field updated
- [ ] entryRangeForNextChunk updated (lastEntry + 1 onwards)
- [ ] No hardcoded old chunk references outside sealed entries
- [ ] requiredReadOrder comment updated with new chunk number
- [ ] currentWork text references `activeChunk` field, not hardcoded name
- [ ] Example text replaced with generic procedure language
- [ ] Rollover entry appended to new chunk
- [ ] Index entryCount incremented
- [ ] lastUpdated timestamp updated
- [ ] Locked Phase 2 files verified untouched
- [ ] grep scan confirms no stale chunk references

---

## Why This Matters

Future chunk rollovers (007 → 008 → 009 ...) will follow the **same pattern** without risk of:
- Hardcoded "old" chunk references lingering in governance
- Confusion about which file is the current append target
- Governance drift accumulating across rollover cycles