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

## Recommended Review-Safe Workflow

### Step 1: Generate Duplicate Report (No Action)

**Trigger:**
```
Admin runs: base44.functions.invoke('detectStationDuplicates', {city: 'Trondheim'})
```

**Output:**
- Candidate duplicate groups
- All details preserved for manual inspection

### Step 2: Manual Classification

For each duplicate group:

1. **Inspect station data:**
   - Names
   - Chains
   - Coordinates
   - Address
   - Source (when created, by whom)

2. **Classify as:**
   - **Clear duplicate:** Same station, identical/very close coords, same name
   - **Possible duplicate:** Same location, different names (brand change?)
   - **Not a duplicate:** Adjacent different stations, legitimately separate entities

### Step 3: Create StationReview Records

For each "clear duplicate" group:

**Create StationReview entity:**
```json
{
  "stationId": "ID_OF_LIKELY_DUPLICATE",
  "review_type": "legacy_duplicate",
  "reviewReason": "exact_duplicate_found",
  "station_name": "Coop Midt-Norge SA",
  "station_chain": "Coop",
  "status": "pending",
  "issue_description": "Exact coordinate match with ID: 69ac67869fc0127214f27885. Appears to be data entry duplication.",
  "suggested_action": "Consolidate: Keep newer record (by created_date), retire older record.",
  "duplicate_of_station_id": "69ac67869fc0127214f27885",
  "source_report": "Phase2_CatalogDuplicateAudit"
}
```

### Step 4: Review Queue Processing

Reviews flow through normal **StationReview governance:**

- Curators inspect and approve/reject consolidation
- Approved consolidations documented in review notes
- If consolidation approved:
  - Mark duplicate station as `deprecated` or `merged`
  - Keep primary record
  - Document merge in station history/notes

### Step 5: Optional Automated Cleanup (After Approval)

Once StationReview approvals are recorded:

- Develop safe consolidation function (separate from matching engine)
- Function reads approved StationReview records
- For each approved consolidation:
  - Merge metadata from duplicate
  - Redirect any FuelPrice records to primary stationId
  - Mark duplicate as inactive (do not delete)
- Log all consolidations in FetchLog or separate audit trail

---

## Governance Constraints

### ✅ Permitted Actions
- Preview duplicate reports (detectStationDuplicates)
- Create StationReview records with "duplicate" classification
- Curator manual review and approval
- Documented consolidation via approved review

### ❌ Not Permitted (Without Explicit Approval)
- Automatic merge of station records
- Deletion of duplicate records
- Modification of stationId references
- Silent consolidation

### 🔒 Data Integrity
- All duplicate consolidations must be traceable
- Original record IDs preserved (never reuse IDs)
- Merge history documented in station notes
- FuelPrice records must not break (update stationId references first)

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
2. ⏳ Catalog duplicate detection: PREVIEW REPORT
3. ⏳ Manual curator review: GOVERNANCE PIPELINE
4. ⏳ Approved consolidation: DOCUMENTED CLEANUP
5. ⏳ Dominance-gap re-validation: OPTIONAL (with clean catalog)

---

## Notes

- Duplicates exist due to data import history, not matching defects
- Cleanup should follow review-safe governance to maintain audit trail
- Curator review ensures data quality without breaking production systems
- Once duplicates are cleaned, dominance-gap testing will be more reliable