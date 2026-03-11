# 📊 AUDIT STORAGE SYSTEM

## Golden Rule

**All AI-generated audits must be stored in this directory.**

AI agents must **never** return audit results as chat-only responses. Audits are **always persisted** in the repository so that external reviewers and AI agents can inspect them later.

This directory (`src/components/audits/`) is the **canonical location** for all audit documentation.

---

## 🗂️ Directory Structure

```
src/components/audits/
├── README.md                    (this file — overview)
├── AuditIndex.jsx               (navigation guide)
│
├── ui/
│   ├── README.md                (UI audit guidelines)
│   └── ui-audit-YYYY-MM-DD.md   (individual UI audits)
│
├── architecture/
│   ├── README.md                (architecture audit guidelines)
│   └── {type}-architecture-audit-YYYY-MM-DD.md  (individual audits)
│
└── governance/
    ├── README.md                (governance audit guidelines)
    └── {type}-governance-audit-YYYY-MM-DD.md   (individual audits)
```

---

## 📝 Audit Format

**Standard format:** Markdown (`.md`)

Each audit file must contain these sections in order:

1. **Title & Metadata**
   - Audit type (UI / Architecture / Governance)
   - Date (YYYY-MM-DD)
   - Scope (what was reviewed)
   - Status (documentation only, in progress, ready for implementation)

2. **Files Inspected**
   - List of files, components, systems, or entities examined
   - Include file paths for clarity

3. **Current State Summary**
   - What is the system/component doing right now?
   - What changed recently?
   - What is working well?

4. **Issues Found (Prioritized)**
   - List issues by severity (CRITICAL / HIGH / MEDIUM / LOW)
   - For each issue: problem description, impact, root cause, examples

5. **Proposed Cleanup Passes (Multiple Options)**
   - Option A, Option B, Option C (at least 2)
   - For each: procedure, pros, cons, risk level, estimated effort
   - Allow user to choose

6. **Recommended Action**
   - Single strongest recommendation with clear justification
   - Why this option over others?
   - What are blockers or dependencies?

7. **Governance Safety Confirmation**
   - ✓ What frozen files were NOT modified
   - ✓ What features were NOT implemented
   - ✓ What rules were followed
   - ✓ Confirmation that this is documentation-only (no code applied)

---

## 🎯 The Three Audit Categories

### 📱 **UI Audits** (`ui/`)

**Scope:** User interface, visual consistency, navigation, mobile UX, component design, data presentation clarity.

**Typical issues found:**
- Layout inconsistencies (spacing, alignment, responsive behavior)
- Visual inconsistency (colors, typography, button styles, card layouts)
- Navigation clarity and discoverability
- Mobile experience and touch affordance
- Loading states and error messaging
- Data source transparency in UI
- Empty states and edge cases
- Accessibility concerns

**Expected audit sections:** Current UI Architecture, Visual Consistency Issues, Structural Issues, UX Issues, Data Integrity Concerns, Candidate Cleanup Passes

---

### 🏗️ **Architecture Audits** (`architecture/`)

**Scope:** Code structure, routing design, component hierarchy, data flow, entity relationships, system initialization, patterns, and organization.

**Typical issues found:**
- Routing structure and initialization
- Page registration and auto-loading
- Component responsibility and organization
- Code duplication
- Data pipeline and entity references
- Layer separation (UI / business logic / data)
- Naming and file organization conventions
- Dependency flow and circular imports

**Expected audit sections:** Current Architecture Summary, Component Structure, Data Flow, Issues Found, Proposed Refactor Passes

---

### 🔐 **Governance Audits** (`governance/`)

**Scope:** Project governance, execution log integrity, Phase locks, frozen file verification, authorization rules, audit system compliance.

**Typical issues found:**
- Phase lock status and violations
- Frozen file modification attempts
- Execution log integrity and chunk rollover
- Route protection and role-based access control
- HOVEDINSTRUKS compliance
- Audit system format and process compliance
- Formal project decision documentation

**Expected audit sections:** Governance Status, Rule Compliance Verification, Lock Status, Proposed Remediation, Safety Confirmation

---

## 📄 File Naming Convention

**Format:** `{descriptor}-{category}-audit-YYYY-MM-DD.md`

**Examples:**
- `ui-audit-2026-03-11.md` — General UI audit
- `routing-architecture-audit-2026-03-11.md` — Routing structure audit
- `phase-lock-governance-audit-2026-03-11.md` — Phase lock verification

**Rules:**
- Use lowercase with hyphens
- Always include date in YYYY-MM-DD format
- Place in correct category folder
- Use descriptive but concise names

---

## ✅ Audit Checklist

Before saving an audit:

- [ ] File is in the correct category folder (`ui/`, `architecture/`, or `governance/`)
- [ ] Filename follows convention: `{type}-audit-YYYY-MM-DD.md`
- [ ] Audit includes all 7 required sections
- [ ] Issues are prioritized by severity
- [ ] Multiple cleanup options provided (at least 2)
- [ ] Governance safety section confirms no frozen files touched
- [ ] Audit is documentation only (no code changes made)
- [ ] All file paths are accurate
- [ ] Summary statistics or metrics included (if applicable)

---

## 🔍 Finding Audits

**For users/reviewers:**
- Start with `AuditIndex.jsx` for navigation
- Choose category based on your question
- Read category README for context
- Review specific audit files in that folder

**For AI agents:**
- Check execution log for reference to relevant audits
- Search category folders for topic of interest
- Verify date to ensure using latest audit
- Check "Governance Safety Confirmation" before taking action

---

## 📌 Important Rules

1. **Never chat-only audits** — If you create an audit, save it here immediately
2. **Governance safety first** — Always confirm frozen files weren't touched
3. **Documentation priority** — Audits are read-only; implementation is separate
4. **Audit before fixing** — Never implement without documenting what you found
5. **Multiple options** — Always propose 2+ cleanup paths
6. **Trace to requirements** — Link to HOVEDINSTRUKS rules when relevant

---

## 🎓 Example Use Cases

**Scenario 1:** Dashboard layout is confusing  
→ Create **UI audit** identifying spacing, navigation, clarity issues  
→ Propose 3 cleanup passes (quick fix, partial refactor, full redesign)  
→ Save to `ui/dashboard-ui-audit-2026-03-11.md`

**Scenario 2:** Routing structure is unclear  
→ Create **Architecture audit** examining router initialization, page registration  
→ Propose cleanup options (restructure, rename, document)  
→ Save to `architecture/routing-architecture-audit-2026-03-11.md`

**Scenario 3:** Need to verify Phase locks are still in place  
→ Create **Governance audit** checking frozen files and execution logs  
→ Confirm compliance with HOVEDINSTRUKS  
→ Save to `governance/phase-lock-governance-audit-2026-03-11.md`

---

**Status:** Active  
**Last updated:** 2026-03-11  
**Maintained by:** AI Agent & Project Team