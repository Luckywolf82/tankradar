# BASE44 PLATFORM INTEGRATION RULES — TANKRADAR
v1.0 (Base44-Specific Governance)

Datert: 2026-03-10  
Status: Platform Integration Rules

---

## BASE44 EDITOR STATE vs GITHUB REPOSITORY

### 1. State Hierarchy

```
┌─────────────────────────────────────┐
│  GitHub Repository (CANONICAL)      │
│  ← Source of Truth                  │
└─────────────────────────────────────┘
         ↑ Synced from
         │
┌─────────────────────────────────────┐
│  Base44 Editor (TEMPORARY)          │
│  ← Working State During Dev         │
└─────────────────────────────────────┘
```

**Rule:** If they differ, GitHub state wins.

### 2. Editor → GitHub Sync Flow

**Process:**

1. You make edits in Base44 editor
2. Changes accumulate in editor state
3. Base44 publishes to GitHub (background sync)
4. GitHub becomes new canonical state
5. You verify GitHub has the change
6. Only then mark task complete

**Timing:**
- Editor updates: immediate
- GitHub sync: ~30-60 seconds (estimated)
- Verification: essential before completion

### 3. Change Visibility Rules

**"Confirmed visible in GitHub after publish"**
- Means: You verified GitHub repository actually contains the change
- How: Checked GitHub API or web interface after Base44 publish
- Confidence: High

**"Not yet visible in GitHub after publish"**
- Means: Change was published to Base44 but GitHub not yet verified
- Why: Sync delay, unable to verify, or sync in progress
- Next step: Check GitHub again in 60 seconds

**"Awaiting sync verification"**
- Means: Change implemented but full GitHub verification not complete
- Risk: Task cannot be marked complete until verified
- Action: Monitor GitHub and report verification

### 4. Execution Log Append Rules

**Location:** `src/components/governance/Phase25ExecutionLog_005.jsx` (active chunk)

**Never append to:**
- Phase25ExecutionLog.jsx (deprecated stub)
- Phase25ExecutionLog_EntryXX.jsx (per-entry files, forbidden)
- Phase25ExecutionLog_Summary.jsx (summary files, forbidden)

**Append rules:**

1. Read Phase25ExecutionLogIndex.jsx
2. Find activeChunk name (currently "Phase25ExecutionLog_005")
3. Append entry to that file ONLY
4. Include GitHub visibility status
5. If entry exceeds chunk size limit (~250KB), create next chunk and update Index

**Each entry requires:**
- Task requested
- Files created
- Files modified
- Technical implementation details
- Locked file verification
- GitHub visibility status

**Timing:**
- Append entry AFTER changes are published to Base44
- Include GitHub verification status (confirmed/not yet verified/awaiting)
- Do NOT mark task complete if GitHub verification not done

### 5. Locked File Protection in Base44

**When you attempt to modify a locked file:**

System response:
```
DEPLOYMENT ERROR: Cannot modify locked file functions/classifyPricePlausibility.ts
This file is protected by Phase 2 governance rules.
Modification requires explicit approval.
```

**Your response:**

1. Stop implementation
2. Report the error to user
3. Do not attempt workaround
4. Request explicit approval for locked file change
5. Include governance justification

### 6. Failed Deployments

**If Base44 deployment fails:**

1. Read error message carefully
2. Identify root cause
3. Do NOT deploy workaround files
4. Do NOT create summary/emergency files
5. Ask user for guidance

**Common failures:**

- Syntax error → Fix code, redeploy
- Import missing → Add missing file, redeploy
- Locked file conflict → Stop, request approval
- Entity schema invalid → Fix schema, redeploy

### 7. Publishing Workflow

**Before publishing:**
- Verify all files compile/lint without syntax errors
- Check that locked files are untouched
- Ensure change scope within limits

**After publishing:**
- Wait 30-60 seconds for GitHub sync
- Verify GitHub repository has the changes
- Update execution log with GitHub visibility status
- Only mark task complete if GitHub verified

**If sync fails:**
- Check GitHub dashboard in Base44 settings
- Verify repository connection is configured
- Report sync failure to user
- Do not mark task complete

### 8. File Organization

**Valid file locations in Base44:**

```
entities/          ← Entity schemas (JSON)
pages/             ← Pages (React components, flat, no folders)
components/        ← Components (React, can have subfolders)
functions/         ← Backend functions (JavaScript/TypeScript)
layout.js          ← Optional layout wrapper
globals.css        ← Global styles
lib/PageNotFound.jsx ← Built-in 404 page
```

**Invalid locations:**
- Repo root files (not supported by Base44)
- pages/subfolder/Page.js (pages must be flat)
- Governance files CANNOT go in repo root, use components/governance/ instead

### 9. Governance File Location Rules

**Where governance files must live:**

```
components/governance/
├── PROJECT_GOVERNANCE.md              ← Master governance (read first)
├── CHATGPT_PROJECT_INSTRUCTIONS.md    ← AI agent rules
├── BASE44_PROJECT_INSTRUCTIONS.md     ← Platform rules
├── AI_BOOTSTRAP.md                    ← Startup protocol
├── Phase25ExecutionLogIndex.jsx       ← Execution log index (canonical)
├── Phase25ExecutionLog_001.jsx        ← Historical log chunk
├── Phase25ExecutionLog_002.jsx        ← Historical log chunk
├── Phase25ExecutionLog_003.jsx        ← Historical log chunk
├── Phase25ExecutionLog_004.jsx        ← Historical log chunk
├── Phase25ExecutionLog_005.jsx        ← Active log chunk (append here)
├── Phase25ExecutionLog.jsx            ← DEPRECATED stub
├── AI_PROJECT_INSTRUCTIONS.md         ← DEPRECATED (replaced by canonical)
├── NotificationTypes.js               ← Notification type definitions
└── [other governance support files]
```

**No governance files in repo root or functions/ folder.**

### 10. Entity and Schema Rules

**When creating entities:**

1. Place in `entities/` folder
2. Use .json extension
3. Include all required metadata fields
4. Use valid enum values (no invented types)
5. Test schema validity in Base44

**Metadata required on all price entities:**

```json
{
  "sourceName": "string",
  "sourceUrl": "string (optional)",
  "fetchedAt": "date-time",
  "sourceUpdatedAt": "date-time or null",
  "sourceFrequency": "enum",
  "parserVersion": "string",
  "confidenceScore": "number",
  "priceType": "enum"
}
```

### 11. Function Naming and Deployment

**Function naming:** camelCase only

Valid:
- `checkPriceAlerts.ts`
- `fetchGooglePlacesPrices.ts`

Invalid:
- `check-price-alerts.ts`
- `CheckPriceAlerts.ts`
- `check_price_alerts.ts`

**Function structure:**

```javascript
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    // Implementation here
    return Response.json({ result: data });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
```

### 12. Testing Functions

Use `test_backend_function` tool:

```javascript
test_backend_function('myFunction', { payload: 'data' })
```

Returns: `{ data, status, headers, logs }`

Check logs for errors even on success.

### 13. Secrets and Environment

**Secrets configured via Base44 dashboard:**

Existing:
- `GOOGLE_PLACES_API_KEY`

**To add new secret:**
1. Use `set_secrets` tool
2. Define in custom instructions or governance
3. Reference via `Deno.env.get('SECRET_NAME')`

**Do NOT hardcode secrets in code.**

### 14. Error Handling

**In functions:**

```javascript
try {
  // Core logic
  const result = await operation();
  return Response.json({ success: true, data: result });
} catch (error) {
  console.error("Detailed error context:", error);
  return Response.json(
    { error: error.message },
    { status: 500 }
  );
}
```

**Do NOT swallow errors.** Always log and report.

### 15. Completion Gate for Base44 Tasks

**Task is complete ONLY when:**

1. ✓ All code compiles in Base44 (no deployment errors)
2. ✓ All changes published to GitHub
3. ✓ GitHub repository verified to have the changes
4. ✓ Execution log entry appended with GitHub visibility status
5. ✓ Locked files confirmed untouched

**If GitHub verification pending:**
- Do NOT mark task complete
- Report "Awaiting GitHub verification"
- Check again in 60 seconds
- Update execution log when verification confirmed

---

## REFERENCE

Master governance: `components/governance/PROJECT_GOVERNANCE.md`  
AI agent rules: `components/governance/CHATGPT_PROJECT_INSTRUCTIONS.md`  
Startup sequence: `components/governance/AI_BOOTSTRAP.md