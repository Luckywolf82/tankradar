# AUDIT NAVIGATION INDEX

**Purpose:** Quick reference for finding, understanding, and contributing to TankRadar audits.

---

## 📍 Audit System Overview

All AI-generated audits are stored in `components/audits/` organized by category. Each category has its own README and contains related audit files.

**Golden Rule:** Audits are never returned as chat-only results. They are always persisted in this repository for future review and handoff.

---

## 🗂️ Three Categories

### 1. **UI Audits** (`ui/`)
**What they cover:** User interface, visual consistency, navigation clarity, mobile UX, component design, layout structure, data transparency in UI.

**Examples:**
- Dashboard layout and card organization
- Mobile navigation and responsiveness
- Chart labeling and data source transparency
- Form states and loading indicators
- Visual consistency (spacing, colors, typography)

**When to add:** When you find UI/UX issues, design inconsistencies, accessibility concerns, or clarity problems in page layouts and components.

---

### 2. **Architecture Audits** (`architecture/`)
**What they cover:** Code structure, routing design, component hierarchy, data flow, entity relationships, system organization.

**Examples:**
- Routing structure and router initialization
- Page registration and auto-loading conventions
- Component composition and responsibility
- Data pipeline and entity flow
- Backend function organization

**When to add:** When you find structural problems, architectural inconsistencies, code duplication, or issues with how parts of the system fit together.

---

### 3. **Governance Audits** (`governance/`)
**What they cover:** Project governance, execution log integrity, frozen file verification, completion gates, authorization rules, audit system itself.

**Examples:**
- Phase lock status and frozen file verification
- Execution log chunk rollover procedures
- Route protection and role-based access control
- Governance rule compliance
- Audit system structure and format compliance

**When to add:** When you verify governance compliance, check Phase locks, audit the audit system itself, or document formal project decisions.

---

## 📋 File Naming Convention

**Format:** `{type}-audit-YYYY-MM-DD.md`

**Examples:**
- `ui/ui-audit-2026-03-11.md` — UI audit from March 11, 2026
- `architecture/routing-architecture-audit-2026-03-11.md` — Routing architecture audit
- `governance/phase-lock-governance-audit-2026-03-11.md` — Phase lock verification audit

**Rules:**
- Use `.md` format (Markdown)
- Always include date in YYYY-MM-DD format
- Prefix with audit type or topic for clarity
- File names should be descriptive but concise

---

## 📖 Required Audit Structure

Every audit must contain:

1. **Files Inspected** — List of files/components/systems reviewed
2. **Current State Summary** — What is working, what isn't, what changed
3. **Issues Found (Prioritized)** — Problems identified, ranked by severity/impact
4. **Proposed Cleanup Passes** — Multiple options with pros/cons, risk assessment
5. **Recommended Action** — Which pass to do first, with justification
6. **Governance Safety Confirmation** — What frozen files were NOT touched, what wasn't implemented

See individual category READMEs for more detail.

---

## 🚀 Quick Start

**To find an audit:** Look in the category that matches your question:
- "Why is the dashboard layout confusing?" → Check `ui/`
- "How is routing structured?" → Check `architecture/`
- "Is Phase 2 locked?" → Check `governance/`

**To create a new audit:** 
1. Pick the right category
2. Read the category's README for guidelines
3. Follow the audit structure above
4. Save with the proper date-stamped filename
5. Run the audit immediately (don't chat about it first)

**To refer to an audit:** Link to the specific file by path:
```
See components/audits/architecture/routing-architecture-audit-2026-03-11.md
```

---

## ✅ Status Summary

| Category | Current Audits | Focus |
|----------|---|---|
| `ui/` | 1 | Dashboard UX, transparency, consistency |
| `architecture/` | 1 | Routing structure, nested router conflict |
| `governance/` | — | (Reserved for future governance audits) |

---

**Last updated:** 2026-03-11  
**Maintained by:** AI Agent  
**Questions?** Check the category README for your specific audit type.