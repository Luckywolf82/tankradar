# AUDIT STORAGE RULE

All AI-generated audits must be stored in this directory.

AI agents must never return audit results only in chat.

Audits must be persisted here so that external reviewers and AI agents
can inspect them later.

This directory is the canonical location for audit documentation.

## Audit Types

- `ui-audit-YYYY-MM-DD.md` — User interface and visual consistency audits
- `architecture-audit-YYYY-MM-DD.md` — Code structure and component hierarchy audits
- `governance-audit-YYYY-MM-DD.md` — Project governance and process audits

## Audit Format

Each audit file must contain:

- Files inspected (list)
- Current state summary
- Issues found (prioritized list)
- Proposed cleanup passes (multiple options)
- Recommended action (with justification)
- Governance safety confirmation