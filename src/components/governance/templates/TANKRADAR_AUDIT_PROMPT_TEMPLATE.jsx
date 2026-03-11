# TANKRADAR — AUDIT PROMPT TEMPLATE

## ROLE

You are operating inside the TankRadar repository.

Follow TankRadar governance rules strictly.

**This task is an AUDIT.**

Do not implement code unless explicitly instructed.

---

## STEP 1 — REPOSITORY VERIFICATION

Read the following files:

- `src/components/governance/NextSafeStep.jsx`
- `src/components/governance/Phase25ExecutionLogIndex.jsx`
- `src/components/audits/AUDIT_INDEX.jsx`

Confirm:

- ✓ Current execution entry number
- ✓ Next safe step defined
- ✓ Whether a similar audit already exists

---

## STEP 2 — AUDIT SCOPE

Define the following:

- **Audit Category**: architecture | ui | governance | product | activation | data | performance | security | publishability
- **System Components Inspected**: List specific components/pages/functions analyzed
- **Repository Files Inspected**: List exact file paths read during audit

---

## STEP 3 — ANALYSIS

Evaluate the requested audit domain:

- **Architecture**: routing, component hierarchy, data flow, dependencies
- **UX/UI Clarity**: navigation, CTA placement, visual hierarchy, component consistency
- **Product Usefulness**: feature utility, crowdsourcing value, user retention hooks
- **Activation/Engagement**: onboarding friction, first-value clarity, contribution loop
- **Data Integrity**: source metadata, matching confidence, plausibility validation
- **Governance Compliance**: frozen files status, phase locks, audit trail integrity

### Evidence Levels

Label all findings with:

- `code-observed`: Directly visible in source code; requires no inference
- `reasoned-inference`: Logical deduction from code patterns; reasoned but not directly observed
- `requires-telemetry`: Requires user behavior data or runtime metrics to verify
- `user-experience-hypothesis`: Based on design principles or user testing assumptions

---

## STEP 4 — CREATE AUDIT ARTIFACT

Create audit file under:

`src/components/audits/<category>/`

**Filename format:**

`<audit-type>-<category>-<date>.jsx`

**Example:**

`src/components/audits/activation/activation-contribution-loop-audit-2026-03-11.jsx`

### Required Sections

```javascript
export const audit_object = {
  metadata: { timestamp, phase, title, category, auditNumber },
  context: { problem, scope, why_it_matters },
  filesInspected: [ "file1", "file2" ],
  observedBehavior: { key_finding_1: { detail, evidence } },
  confirmedFacts: { fact_1: { evidence_level, detail } },
  structuralRisks: [ { risk, impact, severity } ],
  unknowns: [ { unknown, why_it_matters, how_to_resolve } ],
  recommendations: [ { recommendation, reasoning, priority } ]
};
```

---

## STEP 5 — UPDATE AUDIT INDEX

Update:

`src/components/audits/AUDIT_INDEX.jsx`

Add audit entry with:

```javascript
{
  id: "audit_id",
  title: "Audit Title",
  category: "category_name",
  location: "src/components/audits/...",
  dateCreated: "YYYY-MM-DD",
  description: "...",
  relatesTo: "...",
  focusArea: "...",
  status: "complete",
  canonicalFor: "..."
}
```

Update category breakdown totals.

---

## STEP 6 — EXECUTION LOG ENTRY

Append entry to:

`src/components/governance/Phase25ExecutionLog_<XXX>.jsx`

Include:

```javascript
export const entry_XX = {
  timestamp: "2026-03-11T...",
  title: "Audit Title",
  objectives: [ "obj1", "obj2" ],
  filesInspected: [ "file1", "file2" ],
  findings: [ { finding, evidence_level } ],
  lockedPhase2FilesStatus: [ "✓ file1 — untouched" ],
  changeSummary: { files_modified: 0, audit_analysis_only: true },
  governance_compliance: { readOnlyAudit: "✓" }
};
```

---

## STEP 7 — FINAL OUTPUT

Return:

- ✓ Audit file path (where created)
- ✓ Files inspected (count)
- ✓ Files modified (should be 0 for analysis-only audit)
- ✓ Execution log entry number
- ✓ Confirmation that locked Phase-2 files remain untouched

---

## GOVERNANCE RULES

- **Analysis Only**: No runtime code changes
- **No Silent Fallback**: All assumptions documented explicitly
- **Phase-2 Lock**: Frozen files cannot be modified
- **Evidence Required**: All findings labeled with evidence level
- **Audit Immutability**: Once created, audits are permanent records

---

END TEMPLATE