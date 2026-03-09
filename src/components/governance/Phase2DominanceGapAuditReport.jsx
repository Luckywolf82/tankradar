# PHASE 2 DOMINANCE-GAP AUDIT REPORT
## Validation of Real-World Multi-Candidate Scoring

**Status:** Audit execution framework ready  
**Date:** 2026-03-09  
**Purpose:** Validate the dual-requirement gate (score ≥65 AND gap ≥10) in real station matching scenarios

---

## AUDIT METHODOLOGY

This audit uses the `auditPhase2DominanceGap` function to execute the full matching pipeline on realistic user_reported inputs and log:

1. **Candidate Pool:** All Station records in target city after pre-filter
2. **Scoring Breakdown:** Per-candidate distance, chain, name, location signals
3. **Top-2 Competition:** Top and second-highest scoring candidates
4. **Dominance Gap:** (top_score - second_score)
5. **Gate Evaluation:** Dual-requirement check (score ≥65 AND gap ≥10)
6. **Final Decision:** Outcome (matched_station_id, review_needed, no_safe_match)

---

## EXECUTION PROTOCOL

### Prerequisites
- At least 1 realistic user_reported price in the test city (Trondheim)
- Multiple stations in city to create genuine competition
- Admin role to invoke audit function

### Steps

1. **Identify a real user_reported price** with multi-candidate potential
2. **Extract observation data:** gps_lat, gps_lon, station_name, station_chain, city
3. **Invoke audit function:**
   ```
   const result = await base44.functions.invoke('auditPhase2DominanceGap', {
     gps_lat: <lat>,
     gps_lon: <lon>,
     station_name: "<name>",
     station_chain: "<chain>",
     city: "<city>"
   })
   ```
4. **Inspect audit.scoredMatches** for candidate pool and scoring
5. **Check audit.decision.gateChecks** for dual-requirement evaluation
6. **Record findings** (see Report Template below)

---

## AUDIT SCENARIOS (TARGET VALIDATION)

### Scenario A: Tight Multi-Candidate Race (gap <10)
**Expected Outcome:** review_needed_station_match  
**Gate Behavior:** Dual-requirement FAILS (gap <10) → blocks auto-match

**Test Case:**
- Observation near two high-scoring stations (e.g., Neste + Esso both close)
- Top score ≥65, second score ≥55
- Gap <10

**Validation Points:**
- ✓ Chain matching did not gate-fail (both same chain or mixed)
- ✓ Distance signals differ by <10 points
- ✓ Name signals similar
- ✓ Location signals either match or both null
- ✓ Decision forced to review_needed (not auto-match)

### Scenario B: Clear Dominance (gap ≥10)
**Expected Outcome:** matched_station_id  
**Gate Behavior:** Dual-requirement PASSES (score ≥65 AND gap ≥10) → auto-match

**Test Case:**
- Observation clearly nearest to one station
- Top score ≥70, second score ≤60
- Gap ≥10

**Validation Points:**
- ✓ Top candidate strongly favored (distance/chain match/name)
- ✓ Second candidate significantly weaker (chain mismatch or far)
- ✓ Dual-requirement gate passes
- ✓ Decision is matched_station_id

### Scenario C: Single Survivor (only 1 candidate ≥1)
**Expected Outcome:** matched_station_id (if score ≥65)  
**Gate Behavior:** Single-candidate rule (no gap required)

**Test Case:**
- Observation in low-density area
- Only one station scores > 0
- Score ≥65

**Validation Points:**
- ✓ No competitors in candidate pool
- ✓ Decision does not depend on gap (single-candidate rule)
- ✓ Score ≥65 triggers auto-match

---

## REPORT TEMPLATE

For each audit run, document:

```
AUDIT RUN #N
=============

Input:
  - gps_lat: <value>
  - gps_lon: <value>
  - station_name: "<value>"
  - station_chain: "<value>"
  - city: "<value>"

Candidate Pool:
  - Total stations in city: N
  - Valid (coordinates): N
  - Scored > 0: N
  - Gate-failed (chain): N

Scoring Breakdown (Top 3):

  1. [stationId]
     Distance: <meters> → <signal>
     Chain: <chain> → <signal>
     Name: <similarity> → <signal>
     Location: <label vs areaLabel> → <signal>
     TOTAL SCORE: <score>

  2. [stationId]
     Distance: <meters> → <signal>
     Chain: <chain> → <signal>
     Name: <similarity> → <signal>
     Location: <label vs areaLabel> → <signal>
     TOTAL SCORE: <score>

  3. [stationId]
     ...

Dominance Gap Analysis:
  - Top score: <score>
  - Second score: <score>
  - Gap: <gap>
  - Dual-requirement check:
    * Score >= 65? <YES/NO>
    * Gap >= 10? <YES/NO>
    * Gate passes? <YES/NO>

Final Decision:
  - Status: <matched_station_id|review_needed|no_safe_match>
  - Reason: <explanation>

Validation Notes:
  - [ ] Candidate pool is representative?
  - [ ] Scoring signals make intuitive sense?
  - [ ] Gate logic correctly blocks/allows?
  - [ ] Decision aligns with input quality?

Issues/Observations:
  - <any unexpected behavior>
  - <any edge cases>
  - <any signals that seem wrong>
```

---

## SUCCESS CRITERIA

Phase 2 dominance-gap validation is **COMPLETE** when:

1. ✅ At least 3 audit runs covering scenarios A, B, C above
2. ✅ All dual-requirement gates behave correctly
3. ✅ Candidate scoring signals match expected ranges
4. ✅ No logic defects detected (gate mis-fires, wrong outcomes)
5. ✅ Audit report clearly documents findings

**If all 5 criteria met:** Multi-candidate gate is **production-safe for MVP Phase 2**

**If issues found:** Document, refactor if needed, re-run until criteria met

---

## LIVE AUDIT EXECUTION

To run a live audit on a real user_reported price in Trondheim:

1. **Find a user_reported price:**
   ```
   const prices = await base44.entities.FuelPrice.filter({
     priceType: 'user_reported',
     station_match_status: 'review_needed_station_match'  // interesting case
   })
   ```

2. **Extract observation:**
   ```
   const obs = {
     gps_lat: price.gps_latitude,
     gps_lon: price.gps_longitude,
     station_name: price.station_name,
     station_chain: price.station_chain,
     city: price.city  // e.g., Trondheim
   }
   ```

3. **Invoke audit:**
   ```
   const audit = await base44.functions.invoke('auditPhase2DominanceGap', obs)
   console.log(JSON.stringify(audit, null, 2))
   ```

4. **Analyze results** per Report Template above

---

## TIMELINE

- **2026-03-09:** Audit framework documented and `auditPhase2DominanceGap` function deployed
- **2026-03-09 (Day 2):** First live audit run on review_needed user_reported prices
- **2026-03-10:** Additional scenarios (tight races, clear dominance) validated
- **2026-03-11:** Report synthesis and final recommendation (production-safe or refine)

---

## GOVERNANCE

This audit framework:
- **Does NOT** optimize matching thresholds based on live results
- **Does NOT** infer general match-rate from limited scenarios
- **Only validates** that the dual-requirement gate logic behaves correctly in real conditions
- **Prioritizes** conservative behavior (prefer review_needed over false auto-matches)

Once multi-candidate gate is validated, Phase 2 can be marked as **audit-complete** and safe for broader testing.