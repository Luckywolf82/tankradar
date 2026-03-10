# PHASE 2.5 PREVIEW NOTE — TankRadar

## Role of This File

This file is for **preview and design planning only**.

It must not contain verified runtime claims, test results, or confirmed production behavior.
Those belong exclusively in `components/governance/LastVerifiedState.jsx`.

**`LastVerifiedState.jsx` remains the sole authoritative file for verified runtime behavior.**

---

## Purpose

Placeholder for Phase 2.5 scoping and design notes.

Phase 2.5 represents the next planning horizon after Phase 2 matching engine approval.
Nothing in this file is approved, implemented, or scheduled.

---

## Allowed Scope

- High-level design ideas for consideration
- Proposed workstreams not yet approved
- Questions requiring governance decisions
- Candidate features for future planning sessions

---

## Non-Goals

- No implementation details
- No code logic or pseudocode
- No schema changes
- No matching threshold adjustments
- No dominance gap modifications
- No remediation, apply, delete, or merge behavior
- No verified claims of any kind

---

## Governance Boundaries

The following remain frozen and must not be referenced as targets for change:

- Phase 2 matching engine (`functions/matchStationForUserReportedPrice`)
- Scoring thresholds (≥65 score, ≥10 dominance gap)
- Distance band scoring (0–30m, 31–75m, 76–150m, 151–300m, >300m)
- Station identity governance rules (adapter identity rule, Entry 11)
- Review routing logic

Any proposed change to the above requires explicit architectural approval before this file
may be updated to reflect it.

---

## Approval Status

**Status:** ⏳ PREVIEW ONLY — Not approved, not scheduled, not implemented

No content in this file has been approved for implementation.
All items remain proposals pending governance review.