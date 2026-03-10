# SYSTEM ROLE

This document records only VERIFIED runtime behavior.

It must never contain:
- proposed architecture
- planned features
- speculative explanations

All entries must be derived from confirmed tests or observed production behavior.

---

# LAST VERIFIED STATE — TankRadar
## Confirmed Test Results & Verified Outcomes Only

**Last Updated:** 2026-03-10 UTC+1
**Verification Method:** Live function testing against production station catalog
**Caveat:** This file contains only test-confirmed behavior, not proposed features or assumptions

---

## DUPLICATE CATALOG WORKSTREAM — VERIFIED (2026-03-09)

### Detector Output Structure (Enhanced)

**File:** `functions/detectStationDuplicates`
**Status:** VERIFIED — output structure improved, logic unchanged.

#### Verified Changes

- Classification values updated to:
  - `exact_coordinate_duplicate`
  - `exact_name_chain_duplicate`
  - `possible_near_duplicate`
- `explanation` field added for human-readable summaries
- `reason` field removed
- `review_action` field removed
- Summary keys updated
- Sort order improved: confidence → group size
- Output is preview-only

#### Confirmed Non-Modification

- Haversine distance calculation unchanged
- Detection thresholds unchanged
- Matching engine unaffected
- No automatic actions added

---

## ADMIN DUPLICATE REVIEW UI — VERIFIED

### Files

- `components/admin/DuplicateStationGroup.jsx`
- `components/admin/DuplicateDetectionResults.jsx`
- `components/admin/DuplicateDetectionScanner.jsx`
- `pages/SuperAdmin.jsx`

### Verified Behavior

- Duplicate groups are collapsed by default
- Admin can expand each group
- Stations display: name, chain, address, coordinates, station id
- Preview warning banner displayed
- No merge / delete / apply actions

### User Flow

1. Admin opens SuperAdmin
2. Enters city
3. Runs scan
4. Results grouped by duplicate classification
5. Admin inspects groups manually

---

## CURATOR REVIEW FILTER CONTROLS — VERIFIED

**File:** `components/admin/DuplicateDetectionResults.jsx`

### UI Controls

- Classification filter (checkbox)
- Confidence filter (dropdown)
- Sort order selector
- "Why Grouped" explanations

### State

All filters are:

- component state only
- reset on reload
- not persisted
- not stored in DB

---

## ADAPTER IDENTITY GOVERNANCE — VERIFIED (2026-03-10)

Source adapters do **not control station identity decisions**.

### Governance Rules

1. Adapters provide raw candidate data only.
2. Station creation is governance controlled.
3. External stations enter through `StationCandidate`.
4. Duplicate cleanup is a catalog task.
5. Matching logic must not change due to catalog cleanup.

### Confirmed Non-Modification

- Matching logic unchanged
- No schema changes
- No function behavior changed

---

## PERFORMANCE LAYER — VERIFIED

### Station Proximity Pre-Filter

**File:** `functions/getNearbyStationCandidates`

**Purpose:** Reduce candidate pool before Phase 2 scoring.

### Verified Behavior

- Haversine distance filtering
- Default radius: 3km
- Maximum candidates: 20
- Falls back to full catalog if none found

### Confirmed Non-Modification

Matching logic signals remain identical:

| Distance  | Signal |
|-----------|--------|
| 0–30m     | 30     |
| 31–75m    | 20     |
| 76–150m   | 10     |
| 151–300m  | 5      |
| >300m     | 0      |

---

## PHASE 2 MATCHING ENGINE — VERIFIED

### Test Case 1 — Exact Match

Station: Shell Trondheim Sentrum
Distance: 15m

| Signal         | Score |
|----------------|-------|
| Distance       | 30    |
| Chain          | 25    |
| Name similarity| 30    |

Total score: **85**
Dominance gap: **55**
Result: `matched_station_id`
Status: **PASS**

---

### Test Case 2 — Distance Band Validation

Distance: 100m
Expected signal: **10**
Observed signal: **10**
Status: **PASS**

---

### Test Case 3 — Ambiguous Circle K

Input: "Circle K"
Multiple candidates present.
Result: `review_needed`
Status: **PASS**

---

## DISTANCE BAND VALIDATION

| Distance Band | Signal | Status    |
|---------------|--------|-----------|
| 0–30m         | 30     | confirmed |
| 31–75m        | 20     | confirmed |
| 76–150m       | 10     | confirmed |
| 151–300m      | 5      | confirmed |
| >300m         | 0      | expected  |

---

## MATCHING GATES — VERIFIED

### Gate 1 — Score

Minimum: **65**

### Gate 2 — Dominance Gap

Minimum: **10**

### Logic

```
score >= 65 AND dominance_gap >= 10
```

Both must pass.

---

## CHAIN NORMALIZATION — VERIFIED

Examples:

| Input     | Result   |
|-----------|----------|
| shell     | Shell    |
| circle_k  | Circle K |
| circle k  | Circle K |

---

## NAME SIMILARITY — VERIFIED

Exact match produces similarity: **1.0**
Score awarded: **30**

---

## TRONDHEIM CATALOG STATE

Stations: ~142

### Exact Duplicate

- Station: Coop Midt-Norge SA
- Distance: 0m
- Classification: `exact_coordinate_duplicate`

### Possible Near Duplicate

- Station: Uno-X Ladetorget
- Distance: ~233m
- Classification: `possible_near_duplicate`

---

## FUNCTION STATUS

| Function                              | Status   |
|---------------------------------------|----------|
| matchStationForUserReportedPrice      | verified |
| getNearbyStationCandidates            | verified |
| auditPhase2DominanceGap               | verified |
| detectStationDuplicates               | verified |

---

## WHAT IS NOT VERIFIED

The following remain untested:

- production performance metrics
- full national catalog
- live GooglePlaces ingestion
- 295–305m boundary band
- automated duplicate consolidation

---

## CONFIDENCE LEVEL

| Component            | Confidence |
|----------------------|------------|
| Distance scoring     | HIGH       |
| Matching gates       | HIGH       |
| Chain normalization  | HIGH       |
| Ambiguity routing    | HIGH       |
| Duplicate detection  | HIGH       |

---

## NEXT VERIFICATION

Before production:

1. Real user submissions
2. Multi-city catalog testing
3. FuelPrice persistence validation

---

**Verification Authority**

Audit functions:
- `auditPhase2DominanceGap`
- `auditCircleKMultiCandidateAmbiguity`
- `detectStationDuplicates`

Environment: Trondheim station catalog

Last updated: **2026-03-10**