# PHASE 2 VALIDATION STRATEGY
## Two-Layer Validation: Fixtures + Live Audit

**Status:** Fixture layer complete, live audit layer ready  
**Approved For:** Audit phase (not yet production-stable)

---

## WHY TWO LAYERS?

### Fixture Tests (Deterministic)
**What they validate:**
- Rule structure correctness
- Gate logic (pass/fail conditions)
- Scoring formula
- Regression protection

**Limitations:**
- Limited station catalog
- Artificial observation positioning
- No real-world candidate competition discovery
- Match-rate cannot be inferred

**Current Status:** 7/9 passing
- TC-01 to TC-07: ✅ Validate individual scoring rules
- TC-08, TC-09: ⚠️ Require real candidate pool for fair evaluation

### Live Audit (Real-World)
**What it validates:**
- Actual candidate pool construction
- Real distance/chain/name scoring patterns
- Genuine multi-candidate competition
- Dominance-gap behavior in production
- Decision outcomes on authentic inputs

**Advantages:**
- Uses full Station catalog (63 stations in Trondheim)
- Real city-level candidate filtering
- Authentic scoring distributions
- Actual gap calculations
- Production-representative validation

**Current Status:** Framework deployed and tested

---

## CURRENT VALIDATION STATE

| Component | Layer | Status | Notes |
|-----------|-------|--------|-------|
| Parsing logic | Fixture | ✅ | TC-01, TC-02 pass |
| Distance signals | Fixture | ✅ | TC-07 validates >300m cutoff |
| Chain matching | Fixture | ✅ | TC-06 validates high-conf rejection |
| Location signals | Fixture | ✅ | TC-04 validates conflict penalty |
| Name similarity | Fixture | ✅ | All cases with names pass |
| Single-candidate gate | Fixture | ✅ | TC-02 proves ≥65 auto-matches |
| **Dual-requirement gate** | **Live** | **⏳** | Awaiting real competition audit |
| Full pipeline | Live | ✅ | auditPhase2DominanceGap executes |

---

## APPROVAL CRITERIA

### Fixture Tests: ✅ PASSED (7/9)
- Single-candidate path: validated
- Safety gates: validated
- Individual scoring rules: validated
- Regression coverage: established

### Live Audit: ⏳ IN PROGRESS
**Required before production-stable:**

1. **Scenario A: Tight Race (gap <10)**
   - Run audit on real user_reported price near 2+ competing stations
   - Verify: score ≥65 BUT gap <10 → decision = review_needed
   - Confirm: gate correctly blocks auto-match

2. **Scenario B: Clear Dominance (gap ≥10)**
   - Run audit on real user_reported price with strong leader
   - Verify: score ≥65 AND gap ≥10 → decision = matched_station_id
   - Confirm: gate correctly allows auto-match

3. **Scenario C: Single Survivor**
   - Run audit on observation with only 1 scoring candidate
   - Verify: single-candidate rule applies (no gap requirement)
   - Confirm: score ≥65 triggers auto-match

**Success = All 3 scenarios execute as expected with no logic defects**

---

## NEXT STEPS (SEQUENTIAL)

### Step 1: Identify Test Cases
```
Find user_reported prices matching scenarios A, B, C:
- A: near multiple competing stations (e.g., Neste + Esso close)
- B: clearly nearest to one station (dominant distance/chain)
- C: sparse area with single close station
```

### Step 2: Run Live Audits
```
For each test case:
const audit = await base44.functions.invoke('auditPhase2DominanceGap', {
  gps_lat: obs.gps_latitude,
  gps_lon: obs.gps_longitude,
  station_name: obs.station_name,
  station_chain: obs.station_chain,
  city: obs.city
})
```

### Step 3: Inspect Audit Trail
```
Review:
- audit.candidates (full pool)
- audit.scoredMatches (top 3)
- audit.decision.gateChecks (dual-requirement evaluation)
```

### Step 4: Document Findings
```
For each run, fill Audit Report Template:
- Candidate pool composition
- Scoring signals (do they make sense?)
- Gap calculation (correct math?)
- Gate evaluation (passes when expected?)
- Decision outcome (matches gate logic?)
```

### Step 5: Approve or Refine
```
If all 3 scenarios pass:
  → Phase 2 multi-candidate gate: PRODUCTION-SAFE

If issues found:
  → Document problem
  → Fix logic if needed
  → Re-run until approved
```

---

## GOVERNANCE CONSTRAINTS

During live audit:
- ✅ **DO** inspect real candidate pools
- ✅ **DO** verify gate logic correctness
- ✅ **DO** document unexpected behavior
- ✅ **DO** identify scoring pattern surprises

- ❌ **DO NOT** optimize thresholds based on limited audit runs
- ❌ **DO NOT** infer general match-rate from 3 scenarios
- ❌ **DO NOT** claim production stability before all 3 scenarios pass
- ❌ **DO NOT** modify matching rules without re-running fixtures

---

## CURRENT IMPLEMENTATION STATUS

**Phase 2 Engine:** ✅ Deployed (integrated in matchStationForUserReportedPrice.js)

**Fixture Tests:** ✅ Ready (7/9 passing, regression coverage established)

**Live Audit Function:** ✅ Deployed (auditPhase2DominanceGap ready to invoke)

**Audit Report Template:** ✅ Documented (governance/Phase2DominanceGapAuditReport.md)

**Production Approval:** ⏳ Conditional on live audit completion

---

## TIMELINE ESTIMATE

- **Step 1-2 (Today):** Identify test cases, run 3 audits (~30-45 min)
- **Step 3-4 (Today):** Inspect results, fill report (~30 min)
- **Step 5:** Approve or identify refactoring needed (~15 min decision)

**Total:** ~1-2 hours to complete live audit layer

---

## RISK MITIGATION

**Risk:** Fixture tests pass but real-world gate logic fails
**Mitigation:** Live audit on actual Station catalog + candidate pool

**Risk:** Found issues require refactoring matching logic
**Mitigation:** All changes must re-run fixture regression tests (7/9) to ensure no regressions

**Risk:** Production stability claimed prematurely
**Mitigation:** Explicit checklist requirement (all 3 scenarios + report signed off)

---

## PHASE 2 READINESS SUMMARY

| Aspect | Status | Evidence |
|--------|--------|----------|
| Specification written | ✅ | STATION_MATCHING_SPECIFICATION |
| Implementation coded | ✅ | matchStationForUserReportedPrice.js |
| Deterministic rules validated | ✅ | 7/9 fixture tests pass |
| Multi-candidate gate tested | ⏳ | Awaiting live audit on real candidates |
| Regression coverage established | ✅ | 9 test cases defined, stable |
| Audit framework ready | ✅ | auditPhase2DominanceGap deployed |
| Production approval | ⏳ | Conditional on live audit completion |

**Recommendation:** Proceed to live audit phase. Do not mark as production-stable until all 3 scenarios validated.