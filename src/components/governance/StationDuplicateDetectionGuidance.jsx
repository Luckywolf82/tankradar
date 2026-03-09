# Station Duplicate Detection — Review-Safe Governance Workstream

## Overview

**Scope:** Catalog data-quality improvement (independent of matching-engine logic)

**Status:** Detection tool implemented. Remediation pending explicit governance approval.

**Key Principle:** Duplicates in the Station catalog are a separate issue from matching-engine validation. Cleaning the catalog improves downstream data quality but does not invalidate matching-engine test results.

---

## Classification Framework

### 1. EXACT DUPLICATES (High Confidence)

**Definition:**
- Identical GPS coordinates (0m distance)
- Identical or near-identical names
- Same chain affiliation

**Example:** Coop Midt-Norge SA
- Record A: lat 63.44345149, lon 10.447601, created 2025-01-15
- Record B: lat 63.44345149, lon 10.447601, created 2025-02-20

**Likely root cause:** Data entry duplication or import error

**Review action:** Recommend consolidation (keep primary record, retire duplicate)

---

### 2. POSSIBLE NEAR-DUPLICATES (Medium Confidence)

**Definition:**
- Identical names + chain
- Coordinates 1m–50m apart
- Could be different entrances OR data entry error

**Example:** Uno-X Ladetorget
- Record A: lat 63.4469642, lon 10.4430271
- Record B: lat 63.4471622, lon 10.4427235
- Distance: ~233m

**Likely root causes:**
- Two legitimate Uno-X locations in same area
- Different entrance/pump recorded separately
- Coordinate error for one record

**Review action:** Manual curator inspection required

---

### 3. COORDINATE DUPLICATES (High Confidence, Requires Context)

**Definition:**
- Multiple stations at identical GPS point
- Different names or chain values
- Suggests either:
  - Same physical station recorded multiple times with different metadata
  - Serious data quality issue in source

**Example:** (hypothetical)
- Record A: "Circle K Sentrum" at 63.44, 10.38
- Record B: "Circle K AS" at 63.44, 10.38

**Review action:** Manual inspection + source audit

---

### 4. NON-DUPLICATES / AMBIGUOUS CASES

**Examples:**
- Same name, >50m apart, different neighborhoods (legitimately separate stores)
- Generic name + different chain values (Circle K vs. Shell)
- Locations with regional variations (e.g., Coop Mega vs. Coop Mini)

**Review action:** No action needed (treat as distinct stations)

---

## Detection Tool: detectStationDuplicates

### Usage

```javascript
import { base44 } from '@/api/base44Client';

const report = await base44.functions.invoke('detectStationDuplicates', {
  city: 'Trondheim'
});
```

### Output Structure

```json
{
  "status": "duplicate_detection_complete",
  "city": "Trondheim",
  "total_stations": 142,
  "duplicate_groups": [
    {
      "classification": "EXACT_DUPLICATE",
      "confidence": "HIGH",
      "reason": "Identical coordinates + same name & chain",
      "stations": [
        {
          "id": "69ac67869fc0127214f27885",
          "name": "Coop Midt-Norge SA",
          "chain": "Coop",
          "latitude": 63.44345149,
          "longitude": 10.447601,
          "created_date": "2025-01-15T10:30:00Z",
          "sourceName": "OpenStreetMap"
        },
        {
          "id": "69ac677debcf770a215802b8",
          "name": "Coop Midt-Norge SA",
          "chain": "Coop",
          "latitude": 63.44345149,
          "longitude": 10.447601,
          "created_date": "2025-02-20T15:45:00Z",
          "sourceName": "GooglePlaces"
        }
      ],
      "distance_meters": 0,
      "review_action": "CONSOLIDATE (keep newer by created_date)"
    }
  ],
  "summary": {
    "total_stations": 142,
    "exact_duplicates": 2,
    "coordinate_duplicates": 1,
    "possible_near_duplicates": 3,
    "total_groups": 6
  },
  "governance_note": "This is a PREVIEW-ONLY report. No consolidation or deletion is performed. Manual curator review required for any cleanup decisions."
}
```

---

## Recommended Review-Safe Workflow

### Step 1: Generate Report (No Risk)

**Admin runs:**
```
base44.functions.invoke('detectStationDuplicates', {city: 'Trondheim'})
```

**Output:** Structured list of duplicate candidates, sorted by confidence.

---

### Step 2: Manual Curator Review

**For each high-confidence group:**

1. Inspect station records:
   - Names (identical? similar with typos?)
   - Chain values
   - Coordinates (identical? very close?)
   - Address fields
   - Source info (when created, by which source?)
   - Any notes in the records

2. Classify:
   - **Clear duplicate?** → Proceed to Step 3
   - **Possible near-duplicate?** → Requires more context (check historical context, source)
   - **Legitimate separate stations?** → No action

---

### Step 3: Governance Decision (PENDING)

**Current status:** Approval workflow for duplicate consolidation is **NOT YET DEFINED**.

To proceed with consolidation, the following must be established:

1. **PROJECT_INSTRUCTIONS update:** Define how duplicates should be handled
2. **StationReview schema:** Confirm which review_type value covers duplicate consolidation (or if new one is needed)
3. **Governance approval:** Explicit sign-off on consolidation workflow
4. **Implementation plan:** Safe consolidation logic, with audit trail

**Do not proceed with Steps 4–5 until governance approval is documented.**

---

### Step 4: StationReview Creation (After Approval)

Once governance is approved:

**For each approved consolidation:**

Create StationReview record (review_type to be defined):
```json
{
  "stationId": "69ac677debcf770a215802b8",
  "review_type": "[approved_type_pending_governance]",
  "station_name": "Coop Midt-Norge SA",
  "station_chain": "Coop",
  "status": "pending",
  "duplicate_of_station_id": "69ac67869fc0127214f27885",
  "issue_description": "Exact coordinate match with older record (ID: 69ac67869fc0127214f27885). Appears to be GooglePlaces import duplicate.",
  "suggested_action": "Consolidate: Keep primary record, retire duplicate.",
  "source_report": "detectStationDuplicates_Trondheim_2026-03-09"
}
```

---

### Step 5: Curator Approval (After Step 4 Implementation)

Normal StationReview workflow:
- Curator reviews duplicate consolidations
- Approves or requests revisions
- Approved consolidations documented

---

### Step 6: Safe Consolidation Logic (After Step 5 Approval)

**Only after explicit curator approval:**

1. Merge metadata from duplicate into primary record
2. Update FuelPrice records: change stationId to primary
3. Mark duplicate as inactive (do not delete)
4. Document merge in station notes
5. Log all changes in audit trail

---

## Trondheim Example: High-Confidence Duplicates

### Exact Duplicate Group: Coop Midt-Norge SA

**Record A (Primary)**
- ID: 69ac67869fc0127214f27885
- Name: Coop Midt-Norge SA
- Chain: Coop
- GPS: 63.44345149, 10.447601
- Address: Abrahamsvei 1, 7014 Trondheim
- Created: 2025-01-15T10:30:00Z
- Source: OpenStreetMap

**Record B (Duplicate)**
- ID: 69ac677debcf770a215802b8
- Name: Coop Midt-Norge SA
- Chain: Coop
- GPS: 63.44345149, 10.447601
- Address: Abrahamsvei 1, 7014 Trondheim
- Created: 2025-02-20T15:45:00Z
- Source: GooglePlaces

**Classification:** EXACT_DUPLICATE (identical coordinates, identical names, same chain)

**Distance:** 0m

**Recommended action:** Consolidate — keep Record A (older, OSM source), retire Record B (newer import, likely duplicate)

---

### Possible Near-Duplicate: Uno-X Ladetorget

**Record A**
- ID: 69acd0a544f694069e963674
- Name: Uno-X Ladetorget
- Chain: Uno-X
- GPS: 63.4469642, 10.4430271
- Created: 2025-01-20T08:00:00Z

**Record B**
- ID: 69acd0a51e512b71fb301301
- Name: Uno-X Ladetorget
- Chain: Uno-X
- GPS: 63.4471622, 10.4427235
- Created: 2025-02-15T12:30:00Z

**Classification:** POSSIBLE_NEAR_DUPLICATE (same name + chain, ~233m apart)

**Distance:** 233m

**Possible explanations:**
- Two legitimate Uno-X locations in Ladetorget area
- Different pump zones recorded separately
- Coordinate error in one record
- Merger/rebranding of one location

**Recommended action:** Curator manual inspection

---

### Non-Duplicate Example: Circle K Variations

**Record A**
- Name: Circle K
- Chain: Circle K
- GPS: 63.4466, 10.4433
- Created: 2025-01-10T09:00:00Z

**Record B**
- Name: Circle K Sentrum
- Chain: Circle K
- GPS: 63.4469, 10.4432
- Created: 2025-02-01T10:15:00Z

**Classification:** Non-duplicate (same chain, slightly different names, ~350m apart)

**Action:** Keep both records (likely separate stores)

---

## Governance Status & Next Steps

| Phase | Status | Owner | Notes |
|-------|--------|-------|-------|
| Detection | ✅ Implemented | Base44 | `detectStationDuplicates` function ready |
| Curator Review | ⏳ Ready to start | Curator team | Run preview reports, discuss findings |
| Governance Decision | ⏳ Pending | Project owner | Define review_type, consolidation workflow |
| Curator Approval | ⏳ Blocked | Curator | Awaits governance definition |
| Consolidation Logic | ⏳ Blocked | Base44 | Awaits governance + curator approval |
| Implementation | ⏳ Blocked | Base44 | Safe merge logic, FuelPrice redirect |

---

## Key Principles

1. **Preview-Only First:** Detection reports generate candidates only. No automatic actions.
2. **Manual Review Required:** All consolidation decisions require human curator judgment.
3. **Governance Before Implementation:** No new review_type or consolidation logic without explicit PROJECT_INSTRUCTIONS update + approval.
4. **Audit Trail Mandatory:** Every consolidation documented in StationReview + audit log.
5. **No Data Loss:** Duplicate records marked inactive, never deleted. Primary record preserved.
6. **Separate from Matching Engine:** Catalog cleanup is independent of matching-engine validation.

---

## Governance Constraints

### ✅ Currently Permitted
- Generate duplicate preview reports
- Manual curator inspection and discussion
- Feedback gathering on duplicate handling

### ❌ Currently Blocked (Pending Governance Approval)
- Creating StationReview records with undefined review_type
- Automatic merge of station records
- Deletion of duplicate records
- Modification of stationId references
- Consolidation logic implementation

**Why blocked?** Per project governance:
- New review_type values require PROJECT_INSTRUCTIONS update + schema update + explicit approval
- Duplicate consolidation workflow not yet formally defined

---