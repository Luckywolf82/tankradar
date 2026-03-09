# PHASE 2 IMPLEMENTATION SUMMARY
## Temporary Integrated Station Matching Architecture

**Status:** ✅ APPROVED FOR TESTING  
**Date:** 2026-03-09  
**Implementation Type:** Temporary integrated (pending Base44 module support)  
**Test Status:** Fixture-based validation available

---

## ARCHITECTURE CONSTRAINT

**Platform Limitation:** Base44 backend functions are deployed as isolated units. Each function file cannot import from sibling files in the `functions/` directory.

**Current Solution:** All Phase 2 utilities are inlined within `functions/matchStationForUserReportedPrice.js`

**Future Refactor:** When Base44 confirms support for shared non-deployed helper modules, utilities should be extracted to:
- `lib/chainNormalization.js`
- `lib/stationNameParser.js`
- `lib/stationMatching.js`

---

## IMPLEMENTATION DETAILS

### File: `functions/matchStationForUserReportedPrice.js`

**Total Lines:** ~400  
**Inlined Utilities:** 13 helper functions + 1 main handler  
**Immutable Entrypoints:** None (this is the only consumer)

#### Inlined Functions

1. **normalizeChainName(rawChain)** → `{normalized, confidence}`
   - Conservative registry: 8 known chains
   - Exact match confidence: 0.92
   - Fuzzy match only if similarity ≥0.80

2. **chainMatchLogic(obsChain, obsChainConfidence, stnChain, stnChainConfidence)** → `{matches, signal, gateFails, reason}`
   - Gate fails only if both chains high-confidence (≥0.85) AND differ
   - Signal: 25 (exact match) or 0 (neutral/null chains)
   - Never penalizes weak/null chains

3. **parseStationName(rawName)** → `{chain, chainConfidence, locationLabel, locationConfidence, locationLevel, tokens...}`
    - Extracts chain (if known in registry)
    - Extracts area label from AREA_KEYWORDS list
    - Returns locationConfidence (0.92 for explicit match, 0 for not found)
    - Returns null for unparseable values (never inferred)

4. **bigramSimilarity(name1, name2)** → `number (0–1)`
   - Jaccard similarity on character bigrams
   - Used only for name matching signals

5. **calculateLocationSignal(parsedLocation, stationAreaLabel)** → `10 | 0 | -15`
   - +10: both explicit sub-region labels AND match
   - 0: either value null/missing
   - -15: both explicit sub-region labels AND differ

6. **calculateDistanceSignal(meters, maxDistanceMeters = 300)** → `30 | 20 | 10 | 5 | 0`
   - ≤30m: 30 pts
   - 31–75m: 20 pts
   - 76–150m: 10 pts
   - 151–300m: 5 pts
   - >300m: 0 pts (matching continues if other signals strong)

7. **calculateNameSignal(similarity)** → `30 | 20 | 10 | 5 | 0`
   - ≥0.95: 30 pts
   - ≥0.85: 20 pts
   - ≥0.70: 10 pts
   - ≥0.50: 5 pts
   - <0.50: 0 pts

8. **scoreStationMatch(observation, candidateStation, config)** → `{score, signals, gateFailures, rawSignalBreakdown}`
   - Applies city gate (explicit-city-only rejection)
   - Applies chain gate (high-confidence mismatch only)
   - Returns score 0–95 (max: 30+25+30+10)

9. **matchDecision(scores)** → `{outcome, stationId, candidates, reason}`
   - EXPLICIT DUAL-REQUIREMENT GATE for auto-match
   - Single candidate ≥65 → MATCHED_STATION_ID (dominance gap N/A)
   - Multi-candidate ≥65 AND gap ≥10 → MATCHED_STATION_ID
   - 35–64 → REVIEW_NEEDED_STATION_MATCH
   - <35 → NO_SAFE_STATION_MATCH

10. **haversineDistance(lat1, lon1, lat2, lon2)** → `meters`
    - Calculates distance between coordinates
    - Used for distance-based filtering only (not for geo-blocker)

11. **normalize(str)** → `string`
    - Lowercase, trim, normalize hyphens/spaces
    - Used for string comparisons

12. **stringSimilarity(s1, s2)** → `0–1`
    - Levenshtein distance similarity
    - Heuristic only, not source truth

13. **levenshteinDistance(s1, s2)** → `number`
    - Standard edit distance
    - Used for chain fuzzy matching

#### Main Handler

**Path:** `functions/matchStationForUserReportedPrice.js` → `Deno.serve()`

**Input Payload:**
```json
{
  "gps_lat": number,
  "gps_lon": number,
  "station_name": string,
  "station_chain": string (optional),
  "city": string,
  "latitude": number (optional, overrides gps_lat),
  "longitude": number (optional, overrides gps_lon)
}
```

**Output Response:**
```json
{
  "status": "matched_station_id" | "review_needed_station_match" | "no_safe_station_match",
  "stationId": string | null,
  "candidates": string[],
  "score": number,
  "reason": string
}
```

**Process:**
1. Authenticate user
2. Parse observation via `parseStationName()`
3. Filter Station candidates by city
4. Score each candidate via `scoreStationMatch()`
5. Apply `matchDecision()` logic
6. Return outcome

---

## AUTO-MATCH GATE LOGIC

### Single Candidate Path
```
if (score >= 65) {
  return MATCHED_STATION_ID
}
```
Dominance gap requirement does NOT apply (no competitor exists).

### Multi-Candidate Path
```
if (score >= 65 AND gap >= 10) {
  return MATCHED_STATION_ID
}
```
Explicit dual requirement prevents arbitrary selection when candidates are close.

### Review Needed Path
```
if (score >= 35) {
  return REVIEW_NEEDED_STATION_MATCH (top 3 candidates)
}
```

### No Safe Match Path
```
if (score < 35) {
  return NO_SAFE_STATION_MATCH
}
```

---

## LOCATION SCORING RULES

### +10 (Match Bonus)
- Observation has parsed location sub-region (e.g., "Heimdal")
- Station has explicit areaLabel (same level)
- Normalized strings are identical

### 0 (No Signal)
- Either observation or station location is null/missing
- No geographic-level data to compare
- Does NOT penalize matching

### -15 (Conflict Penalty)
- Observation has explicit parsed location sub-region
- Station has explicit areaLabel (same level)
- Normalized strings differ

**NO -15 penalty if:**
- Either value is null/missing
- Levels differ (city vs sub-region)
- Location is weakly parsed (confidence <0.80)

---

## TESTING

### Test Function
**Path:** `functions/testPhase2MatchingFixtures.js`

**Status:** FIXTURE-BASED ONLY

**Test Environment:**
- 4 fixture stations (Circle K, Uno-X, Shell, Neste)
- 6 test cases covering:
  - Exact match single candidate
  - Chain mismatch rejection
  - Area conflict detection
  - Generic name weak signals
  - Far distance no-match
  - Multi-candidate dominance gap

**Test Results Disclaimer:**
```
FIXTURE TEST ENVIRONMENT ONLY.
Match-rate and coverage data are NOT representative of real-world performance.
Station catalog, parser, and matching thresholds should not be optimized based on these results.
Results validate technical integration only.
```

### How to Run Tests
```bash
base44.functions.invoke('testPhase2MatchingFixtures', {})
```

Requires admin role.

---

## MATCHING SPECIFICATION COMPLIANCE

✅ **Auto-match gate:**
- Single candidate ≥65 → MATCHED_STATION_ID
- Multi-candidate ≥65 AND gap ≥10 → MATCHED_STATION_ID

✅ **Location scoring:**
- +10: explicit area match
- 0: null/missing location
- -15: explicit area conflict

✅ **Chain gate:**
- Rejects only if both chains high-confidence (≥0.85) AND differ
- Neutral signal if either chain weak/null

✅ **Distance scoring:**
- 0–30 point bands per specification
- Beyond 300m contributes 0 points (matching continues)

✅ **No schema changes**

✅ **No review-type changes**

✅ **No frozen file modifications**

---

## NEXT STEPS

1. **Run fixture tests** → confirm all test cases pass
2. **Validate with live city data** → ensure station catalog is representative
3. **Monitor real user_reported submissions** → measure matching outcomes and gather audit data
4. **Plan module refactor** → if Base44 confirms shared module support
5. **Post-MVP calibration** → may adjust distance threshold (currently 300m baseline) based on audit data

---

## TEMPORARY IMPLEMENTATION NOTES

This implementation is labeled as **TEMPORARY INTEGRATED** because:

1. **Constraint:** Base44 backend isolation prevents file imports
2. **Benefit:** Single self-contained entrypoint for testing
3. **Risk:** Code duplication if extracted to helpers later
4. **Plan:** Refactor to shared modules as soon as Base44 confirms support

**No functional or decision logic changes from approved specification.**

---

## HANDLER DIFF SUMMARY

### Changes to `functions/matchStationForUserReportedPrice.js`

**Added:**
- 13 Phase 2 utility functions (lines 1–299)
- Explicit dual-requirement gate in `matchDecision()` (lines 213–253)
- Location scoring with +10/0/-15 rules (lines 135–142)
- Chain normalization and high-conf mismatch detection (lines 25–79)
- Name parsing for chain + area extraction (lines 81–115)
- Phase 2 integration in handler (lines 336–391)

**Removed:**
- Legacy `classifyDistance()`, `matchChain()`, `matchNames()`, `calculateMatchScore()` functions
- Old scoring logic
- Legacy decision thresholds

**Modified:**
- Main handler now calls `parseStationName()`, `scoreStationMatch()`, `matchDecision()`
- Handler now returns Phase 2 decision outcomes directly

**Preserved:**
- Authentication (user.role check)
- Request validation (required fields)
- Station filtering by city
- Response structure

---

## CONFIGURATION

| Parameter | Value | Notes |
|-----------|-------|-------|
| SCORE_MATCHED | 65 | Auto-match threshold |
| SCORE_REVIEW_THRESHOLD | 35 | Manual review threshold |
| DOMINANCE_GAP_MIN | 10 | Multi-candidate separation requirement |
| maxDistanceMeters | 300 | MVP baseline (subject to post-launch calibration) |
| Chain confidence gate | 0.85 | Triggers rejection only if both ≥0.85 |

---

**Implementation Status:** ✅ Ready for fixture-based testing and approval