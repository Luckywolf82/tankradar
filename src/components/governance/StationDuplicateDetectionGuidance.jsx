# Station Duplicate Detection & Review-Safe Cleanup

## Overview

Station catalog duplicates have been identified as a **data-quality issue**, separate from matching-engine validation. This document provides guidance for review-safe duplicate remediation.

**Key Principle:** No automatic merge, delete, or consolidation. All changes must flow through governance review pipeline.

---

## Detection Method

### Duplicate Types

1. **Exact name + chain duplicates**
   - Same normalized name AND same chain
   - Indicates possible data entry error or incomplete merge

2. **Coordinate proximity duplicates**
   - Same location (within ~50m)
   - Different names or chains
   - May indicate:
     - Same station with alternative branding
     - Brand change at same location
     - Data entry with slightly different GPS
     - Genuine separate entities (e.g., adjacent stations)

### Detection Tool

Backend function: `detectStationDuplicates`
- Preview-only report (no automatic actions)
- Groups duplicates by city, name, chain, coordinates
- Admin access required
- Generates candidate clusters for manual review

**Usage:**
```json
{
  "city": "Trondheim"
}
```

**Output:**
- Total stations in city
- Exact name+chain duplicate counts
- Coordinate proximity duplicate counts
- Full station details for each group (for manual inspection)

---

## Observed Duplicates in Trondheim

### Examples from Phase 2 Integration Audit

#### Uno-X Ladetorget (Exact Name Duplicate)
- ID: 69acd0a544f694069e963674
  - lat: 63.4469642, lon: 10.4430271
- ID: 69acd0a51e512b71fb301301
  - lat: 63.4471622, lon: 10.4427235
- **Distance:** ~233m

**Classification:** May be data entry error (different coords for same station) or two adjacent Uno-X locations.

#### Circle K Generic Records
- Multiple records with identical or near-identical generic names "Circle K"
- Varying locations (Strindheim, Øya, Nidarvoll, etc.)

**Classification:** May include actual duplicates + legitimate separate locations. Manual inspection required.

#### Coop Midt-Norge SA (Exact Coordinate Duplicate)
- ID: 69ac67869fc0127214f27885
  - lat: 63.44345149, lon: 10.447601
- ID: 69ac677debcf770a215802b8
  - lat: 63.44345149, lon: 10.447601

**Classification:** Identical coordinates AND similar names. Likely clear duplicate candidate.

---

## Current Status: Governance Decision Pending

**Important:** Duplicate remediation is NOT yet approved for implementation.

The following workflow is **proposed for future governance approval**:

### Proposed Workflow (NOT YET APPROVED)

**Phase 1: Detection & Preview (IMPLEMENTED)**
- `detectStationDuplicates` function generates preview-only reports
- No automatic actions
- Admin inspection required

**Phase 2: Governance Decision (PENDING)**
- Define how duplicates should be handled
- Determine if new StationReview review_type is needed
- Update PROJECT_INSTRUCTIONS with duplicate-handling guidance
- Update StationReview entity schema if new review_type required
- Get explicit approval before implementation

**Phase 3: Future Implementation (BLOCKED UNTIL PHASE 2 COMPLETE)**
- Once governance is approved:
  - Create StationReview records (using approved review_type)
  - Curators manually review and approve consolidations
  - Safe consolidation logic (separate from matching engine)
  - Redirect FuelPrice records to primary stationId
  - Document all changes in audit trail

---

## For Now: Detection Only

Until duplicate handling governance is approved:

1. Run `detectStationDuplicates` to generate preview reports
2. Share reports with governance/curator team for discussion
3. Collect feedback on:
   - Which duplicates are definitely problematic
   - Which are acceptable variations
   - How to classify and handle each type
   - What review_type (if new) should be used
4. Propose formal governance update once consensus exists

---

---

## Governance Status

### ✅ Currently Permitted
- Preview duplicate reports (detectStationDuplicates)
- Admin inspection and manual review
- Discussion and feedback gathering

### ❌ Currently Blocked (Pending Governance Approval)
- Creating StationReview records for duplicates (review_type not yet approved)
- Automatic merge of station records
- Deletion of duplicate records
- Modification of stationId references
- Consolidation logic implementation

### 🔒 Why Blocked
Per project governance rules:
- New review_type values require:
  1. Governance update
  2. PROJECT_INSTRUCTIONS update
  3. Entity schema update
  4. Implementation approval
- Duplicate handling does not yet have this approval

---

## Impact on Matching Validation

**Important Note:** 
Catalog duplicates do NOT invalidate Phase 2 matching-engine validation.

- Matching logic correctly handles multiple candidates
- Distance, chain, name scoring work as designed
- Dominance-gap gate conservatively routes ambiguous cases to review
- Duplicates inflate candidate pool but don't break decision logic

**Duplicate cleanup is SEPARATE from matching-engine approval.**

---

## Recommended Execution Order

1. ✅ Phase 2 matching engine: AUDIT-VALIDATED
2. ✅ Catalog duplicate detection: PREVIEW TOOL (implemented)
3. ⏳ Governance discussion: Curator + team feedback on duplicate handling
4. ⏳ Governance approval: Update PROJECT_INSTRUCTIONS, define review_type, approve workflow
5. ⏳ Implementation: StationReview creation, curator review, approved consolidation
6. ⏳ Optional: Dominance-gap re-validation (with clean catalog)

---

## Notes

- Duplicates exist due to data import history, not matching defects
- Cleanup should follow review-safe governance to maintain audit trail
- Curator review ensures data quality without breaking production systems
- Once duplicates are cleaned, dominance-gap testing will be more reliable