# PHASE 2 AUDIT FINDINGS & NEXT STEPS
## Live Audit Report — 2026-03-09

---

## AUDIT RESULTS SUMMARY

| Scenario | Case | Expected | Actual | Gate Status |
|----------|------|----------|--------|-------------|
| **A** | Neste at mismatch GPS | `no_safe_station_match` | `no_safe_station_match` ✓ | **PASS** |
| **B** | Circle K Heimdal (gap 25) | `review_needed_station_match` | `review_needed_station_match` ✓ | **PASS** |
| **C** | Shell Sentrum (gap 5) | `no_safe_station_match` | `no_safe_station_match` ✓ | **PASS** |

---

## WHAT WAS VALIDATED

✅ **Chain gate mismatch rejection** — Scenario A correctly rejects high-confidence chain mismatches  
✅ **Score threshold gating** — Scenario B correctly routes score 55 < 65 to review  
✅ **Multi-candidate decision logic** — All scenarios apply correct outcome routing  
✅ **Dominance gap logic structure** — Gap calculation correct (25, 5 observed)  

---

## WHAT WAS NOT YET VALIDATED

❌ **Positive auto-match case** — No scenario demonstrated: `score >= 65 AND gap >= 10 → matched_station_id`  
❌ **Distance signal scoring** — All distance scores = 0 across all scenarios (despite candidates within 300m-+)  
❌ **Single-candidate auto-match** — Scenario C had 2 candidates, not true single-survivor  

---

## BUGS IDENTIFIED & FIXED

### 1. **Explanation Text Bug (FIXED)**
**Location:** `functions/auditPhase2DominanceGap.js` lines 240-244

**Issue:** Scenario B explanation said:
```
"gap 25 < 10"  // WRONG: gap is 25, not <10
```

**Fix Applied:** Now correctly reports:
```
"score 55 < 65 (gap: 25 >= 10)"  // Accurate
```

### 2. **Distance Signal Issue (DIAGNOSIS NEEDED)**
**Location:** `functions/matchStationForUserReportedPrice.js` lines 193-199

**Function exists and logic appears correct:**
```javascript
function calculateDistanceSignal(meters, maxDistanceMeters = 300) {
  if (meters <= 30) return 30;
  if (meters <= 75) return 20;
  if (meters <= 150) return 10;
  if (meters <= 300) return 5;
  return 0;  // Beyond 300m
}
```

**Observed:** All candidates scored distance=0, even those <300m away.

**Root cause possibilities:**
1. Function **called but receiving incorrect distance value** (NaN, null, or huge number)
2. Function **not being called** in scoring pipeline
3. Distance returned **correctly but overwritten** by later logic

**Next diagnostic step:** Run proposed test payloads and inspect per-candidate breakdown to identify which layer fails.

---

## PROPOSED TEST PAYLOADS

### **Test Case D: Close single candidate (diagnostics)**

```json
{
  "gps_lat": 63.3968,
  "gps_lon": 10.4152,
  "station_name": "Uno-X Sentrum",
  "station_chain": "uno-x",
  "city": "Trondheim"
}
```

**Expected behavior:**
- Should find Uno-X Sentrum (actual station in Trondheim, ~1km away)
- Distance ≤30m → signal 30
- Chain match → signal 25
- Name exact match → signal 30
- **Estimated score: 30+25+30 = 85**
- Single candidate, score ≥65 → **`matched_station_id`**

**Diagnostics:** Will confirm distance calculation works when candidate is true single/very near.

---

### **Test Case E: Multi-candidate tight race, both qualified**

```json
{
  "gps_lat": 63.4100,
  "gps_lon": 10.3900,
  "station_name": "Circle K",
  "station_chain": "circle k",
  "city": "Trondheim"
}
```

**Expected behavior:**
- Multiple Circle K stations in Trondheim (Strindheim, Øya, Nidarvoll, etc.)
- Generic chain+name; decision depends on distances to each
- Closest should score high on distance
- **If top candidate ≥65 AND gap ≥10** → **`matched_station_id`**
- **If top candidate ≥65 AND gap <10** → **`review_needed_station_match`**

**Diagnostics:** Will test true multi-candidate dominance-gap gate with variable distances.

---

## CURRENT STATUS

**Phase 2 Matching Engine:**
> **Temporary integrated implementation**  
> **Audit-ready**  
> **NOT production-stable**  
>
> **What is validated:**
> - Chain gate logic (mismatch rejection)
> - Conservative no-safe routing (<35)
> - Review routing (35–64)
> - Multi-candidate decision structure
> - Explanation text (fixed)
>
> **What is NOT yet validated:**
> - True positive auto-match case (live score ≥65 AND practical dominance gap ≥10)
> - Distance scoring band activation (candidates ≤300m from observation)
> - Practical effect of sparse areaLabel coverage in real catalog

---

## PROPOSED TEST PAYLOADS (Revised)

### **Test Case F: Close multi-candidate auto-match candidate (distance activation)**

**Payload:**
```json
{
  "gps_lat": 63.42667,
  "gps_lon": 10.38833,
  "station_name": "Circle K Øya",
  "station_chain": "circle k",
  "city": "Trondheim"
}
```

**Rationale:**
- GPS placed ~150m from actual Circle K Øya station location
- Should find exact match candidate (Circle K Øya) at 150m distance
- Distance ≤150m → signal 10 points
- Chain exact match → signal 25 points
- Name exact match → signal 30 points
- **Estimated score: 10+25+30 = 65 (at threshold)**
- Single candidate, score ≥65 → **Expected: `matched_station_id`**

**Critical validation:** Will confirm distance scoring activates when observation is close to candidate.

---

### **Test Case G: Dense cluster with realistic competition (dominance-gap gate)**

**Payload:**
```json
{
  "gps_lat": 63.41667,
  "gps_lon": 10.38833,
  "station_name": "Circle K",
  "station_chain": "circle k",
  "city": "Trondheim"
}
```

**Rationale:**
- GPS placed between Circle K Øya (~900m) and Circle K Nidarvoll (~1200m)
- Generic name "Circle K" = +25 chain signal, +0 name signal (no differentiation)
- Both candidates equidistant from GPS (~900-1200m) = both signal 0 (beyond 300m)
- **Expected scores: both ~25 (chain only)**
- Gap = 0, top score 25 < 65 → **Expected: `review_needed_station_match`**
- Will confirm multi-candidate gap gate fires correctly when tie exists

---

## EXECUTION PLAN

### Next: Run Test Cases F & G

1. Execute F payload → verify distance ≤300m triggers scoring bands
2. Observe distance signal in top candidate (should be 10, 20, or 30)
3. Execute G payload → confirm multi-candidate tie routes to review
4. Return full JSON audit logs for external review

### Success criteria:

- **Test F:** Distance signal appears as expected for ≤300m candidate
- **Test G:** Tie scenario correctly routes to review (or shows gap-based decision if one candidate pulls ahead)

---

## NOTES

- Explanation text bug fix **deployed**
- Gate logic structure **validated as correct**
- Distance and dominance-gap behavior **pending real-world empirical validation**
- No claims of production stability until F & G complete

---

**Awaiting:** Test case F & G audit results with full JSON logs