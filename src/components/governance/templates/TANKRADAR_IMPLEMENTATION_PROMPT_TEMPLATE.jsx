# TANKRADAR — IMPLEMENTATION PROMPT TEMPLATE

## ROLE

You are operating inside the TankRadar repository.

Follow TankRadar governance rules strictly.

**This task is IMPLEMENTATION.**

Follow the governance workflow exactly.

---

## STEP 1 — REPOSITORY VERIFICATION

Read the following files:

- `src/components/governance/NextSafeStep.jsx`
- `src/components/governance/Phase25ExecutionLogIndex.jsx`

Confirm:

- ✓ Current execution entry number
- ✓ Next safe step defined
- ✓ Task alignment with governance (is this the next safe step?)

---

## STEP 2 — PREVIEW PLAN

**Before implementing, provide a preview of changes:**

```
PREVIEW — Implementation Plan
==============================

Files to Read:
- file1.jsx
- file2.jsx

Files to Create:
- NewComponent.jsx

Files to Modify:
- ExistingComponent.jsx (find: X, replace: Y)

Expected Runtime Impact:
- (UI changes | business logic | no impact)

Estimated Effort:
- X hours

Governance Compliance:
- Locked Phase-2 files: UNTOUCHED
- Frozen files affected: NONE
```

**Wait for confirmation before applying changes.**

---

## STEP 3 — IMPLEMENTATION RULES

When implementing, follow these rules:

### One Critical Change at a Time
- Implement one feature or fix per task
- If multiple changes are needed, prioritize and sequence them
- Do not bundle unrelated changes

### No Silent Fallback Logic
- If a data source fails, document the fallback explicitly
- If a compromise is made, document it with **KOMPROMISS:** marker
- No hidden assumptions about data models

### No Assumptions About Data Models
- If a field might be null, handle it explicitly
- If a calculation is uncertain, validate or document it
- Use `null` / `unknown` instead of guessing

### Do Not Modify Locked Phase-2 Files

**Frozen files (cannot be edited):**

- `functions/deleteAllGooglePlacesPrices`
- `functions/verifyGooglePlacesPriceNormalization`
- `functions/deleteGooglePlacesPricesForReclassification`
- `functions/classifyPricePlausibility`
- `functions/classifyStationsRuleEngine`
- `functions/classifyGooglePlacesConfidence`

If your task requires modifying a frozen file, stop and report the conflict.

### Use find_replace for Existing Files
- Always use `find_replace` tool for modifying existing code
- Only use `write_file` for creating new files or entities
- Keep changes minimal and focused

### Parallel Tool Calls
- Invoke multiple independent operations simultaneously
- Never make sequential calls that can be combined
- Maximize efficiency through batching

---

## STEP 4 — IMPLEMENT FEATURE

Apply implementation using the tools:

- `write_file`: Create new components, pages, entities, or functions
- `find_replace`: Modify existing code files
- `delete_file`: Remove files (if necessary)

### Verification Checklist

After implementation, verify:

- ✓ Component hierarchy is correct (no orphaned imports)
- ✓ Routing is properly configured (if new page)
- ✓ UI integrates with layout correctly
- ✓ No console errors or warnings introduced
- ✓ Responsive design maintained (mobile + desktop)

---

## STEP 5 — GOVERNANCE UPDATE

Append execution log entry to:

`src/components/governance/Phase25ExecutionLog_<XXX>.jsx`

Include:

```javascript
export const entry_XX = {
  timestamp: "2026-03-11T...",
  title: "Feature Implementation Title",
  objectives: [ "obj1", "obj2" ],
  filesCreated: [ "path/to/NewFile.jsx" ],
  filesModified: [ "path/to/ExistingFile.jsx" ],
  lockedPhase2FilesStatus: [
    "✓ classifyPricePlausibility — untouched",
    "✓ classifyStationsRuleEngine — untouched"
  ],
  changeSummary: {
    files_created: N,
    files_modified: N,
    component_hierarchy: "verified",
    routing: "verified"
  },
  governance_compliance: {
    frozenFilesUntouched: "✓",
    noSilentFallback: "✓"
  }
};
```

---

## STEP 6 — UPDATE EXECUTION LOG INDEX

Update:

`src/components/governance/Phase25ExecutionLogIndex.jsx`

Modify:

```javascript
{
  status: "ACTIVE - CURRENT ENTRY: XX",
  entryCount: XX,
  lastUpdated: "2026-03-11T..."
}
```

Update the active chunk file metadata if needed.

---

## STEP 7 — UPDATE NEXT SAFE STEP

If this task completes the current workstream, update:

`src/components/governance/NextSafeStep.jsx`

Define:

```javascript
nextSafeStepEntry_XX: {
  id: "phase25_step_XX",
  title: "Next Workstream Title",
  description: "...",
  scope: [ "item1", "item2" ],
  complexity: "LOW | MEDIUM | HIGH",
  expectedOutcome: "..."
}
```

---

## STEP 8 — FINAL VALIDATION

Confirm all of the following:

- ✓ Execution log entry appended
- ✓ Index metadata synchronized (entryCount, lastUpdated)
- ✓ NextSafeStep updated (or unchanged if not applicable)
- ✓ Locked Phase-2 files remain unchanged
- ✓ No silent fallback logic introduced
- ✓ Component hierarchy verified
- ✓ All imports resolve

---

## GOVERNANCE CHECKLIST

Before submitting implementation:

- [ ] Preview plan provided and approved
- [ ] All frozen files untouched
- [ ] No silent fallback logic
- [ ] Execution log entry created
- [ ] Index metadata updated
- [ ] Next safe step defined
- [ ] Final validation passed

---

## IMPLEMENTATION PRIORITIES

1. **Data Integrity** — Ensure all data transformations are explicit
2. **Governance Compliance** — Follow frozen file restrictions
3. **Code Clarity** — Simple, maintainable code preferred over clever logic
4. **Component Reusability** — Create small, focused components
5. **Performance** — Avoid unnecessary re-renders or redundant API calls

---

END TEMPLATE