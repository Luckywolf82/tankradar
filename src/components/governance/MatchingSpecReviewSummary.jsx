/**
 * STATION MATCHING SPECIFICATION — REVIEW SUMMARY
 * 
 * Version: 1.0 (Design Phase — Review Pass)
 * Purpose: Explicit verification of conservatism before Phase 2 implementation
 * 
 * This document extracts and clarifies the five critical aspects of the matching
 * specification to enable architectural review of safety constraints and threshold logic.
 */

export const MATCHING_SPEC_REVIEW = `

════════════════════════════════════════════════════════════════════════════════
1. EXACT SCORING WEIGHTS
════════════════════════════════════════════════════════════════════════════════

Total Match Score = Distance + Chain + Name Similarity + Location
(Maximum possible: 30 + 25 + 30 + 10 = 95 points)

┌─────────────────────────────────────────────────────────────────────────────┐
│ DISTANCE COMPONENT — 30 points max                                           │
├─────────────────────────────────────────────────────────────────────────────┤
│ 0–30m:      +30 points (excellent proximity)                                 │
│ 31–75m:     +20 points (good proximity)                                      │
│ 76–150m:    +10 points (acceptable, requires strong name/chain signals)      │
│ 151–300m:   +5 points (weak, requires very strong name/chain)                │
│ 301+ m:     0 points (disqualifies match entirely)                           │
│                                                                               │
│ Rationale: Conservative geographic threshold. Prevents false matches          │
│ across different stations in same city. No match possible beyond 300m.       │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ CHAIN COMPONENT — 25 points max                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│ Exact normalized match:        +25 points                                     │
│ No observation chain:          0 points (neutral, not penalized)              │
│ MISMATCH (e.g. "Circle K" ≠    INSTANT DISQUALIFICATION                      │
│ "Uno-X"):                      Score = 0, match impossible                    │
│                                                                               │
│ Rationale: Chain is most reliable identifier. Any clear mismatch is          │
│ terminal. Prevents wrong attribution across competing chains.                 │
│                                                                               │
│ Example: Even if distance=10m, name=30, location=10, if chains don't match → │
│ Total Score = 0 (chain mismatch overrides all other signals).                │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ NAME SIMILARITY COMPONENT — 30 points max                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│ (Uses bigram similarity algorithm on normalized names)                       │
│                                                                               │
│ Similarity ≥0.95:     +30 points (exact match)                                │
│ Similarity ≥0.85:     +20 points (high similarity)                            │
│ Similarity ≥0.70:     +10 points (medium similarity)                          │
│ Similarity ≥0.50:     +5 points (low similarity)                              │
│ Similarity <0.50:     0 points (too dissimilar)                               │
│                                                                               │
│ Rationale: Name is important but less reliable than chain. Variant names     │
│ are common ("Uno-X" vs "Unox", "Circle K" vs "CK"). Scaled conservatively.   │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ PARSED LOCATION COMPONENT — 10 points max / -15 points (conflict penalty)    │
├─────────────────────────────────────────────────────────────────────────────┤
│ (Optional; parsed from observation name upstream)                            │
│                                                                               │
│ POSITIVE SIGNALS:                                                            │
│   Explicit location match           +10 points                                │
│   (observation "Heimdal" = station areaLabel="Heimdal")                      │
│                                                                               │
│   Location mentioned in station name: +5 points                               │
│   (observation "Heimdal" found in station name "Circle K Heimdal")           │
│                                                                               │
│ NEUTRAL (no signal):                                                         │
│   No location parsed OR location not found in station: 0 points              │
│   Missing location does not penalize matching on distance/chain/name.        │
│                                                                               │
│ NEGATIVE SIGNAL (conflict):                                                  │
│   If observation location explicitly parsed AND station areaLabel/address    │
│   both exist AND they conflict geographically/semantically:                  │
│                                                                               │
│   Conflicting location parsed (e.g., observation "Lade" but station          │
│   areaLabel="Heimdal" + different coords): -15 points                        │
│                                                                               │
│   Effect: Score reduced by 15. If score was 60, becomes 45 (drops from      │
│   auto-match to review_needed). If score was 40, becomes 25 (drops to       │
│   no_safe_match). Conflict forces curator review or rejection.               │
│                                                                               │
│ Rationale: Location is optional bonus for matching. But explicit location    │
│ conflict is a red flag. Example: "Uno-X Lade" observation but all nearby     │
│ Uno-X stations are in Heimdal (different area) → conflict. Forces review.    │
│                                                                               │
│ Enforcement: Compare observation.parsedLocation with                         │
│ (station.areaLabel OR geocoded address from station coords).                 │
│ If parsedLocation ≠ null AND differs from station location → apply -15.      │
└─────────────────────────────────────────────────────────────────────────────┘

════════════════════════════════════════════════════════════════════════════════
2. HARD SAFETY GATES (Terminal Disqualifiers)
════════════════════════════════════════════════════════════════════════════════

These gates are applied BEFORE or DURING scoring. If any gate fails, matching
stops and outcome = NO_SAFE_STATION_MATCH (no FuelPrice created).

┌─────────────────────────────────────────────────────────────────────────────┐
│ GATE 1: CITY MISMATCH (Hard disqualifier ONLY if both cities are explicit)   │
├─────────────────────────────────────────────────────────────────────────────┤
│ Rule: ONLY terminal if BOTH observation.city AND station.city are:           │
│   - Explicitly provided (not inferred)                                        │
│   - High-confidence values (not "unknown")                                    │
│                                                                               │
│ If both explicit: observation.city ≠ station.city → INSTANT REJECTION        │
│   Score = 0, outcome = NO_SAFE_STATION_MATCH                                 │
│                                                                               │
│ If either is weak/null/"unknown": City mismatch = 0 points (neutral)          │
│   Continue scoring on other signals (distance, chain, name).                 │
│   City information does not block but also does not reward.                  │
│                                                                               │
│ Rationale: Prevents cross-city false matches when city data is reliable.     │
│ But missing or uncertain city data should not block strong signal matches.   │
│ Example: GooglePlaces returns coords but city="unknown" → city gate neutral. │
│                                                                               │
│ Enforcement: Applied during candidate pool filtering, but with city          │
│ confidence check first. Unknown city = include in pool, not filtered.         │
│ Impact: Conservative fallback when city confidence is low.                    │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ GATE 2: MAX DISTANCE CUTOFF — MVP baseline 300m (calibration-needed)         │
├─────────────────────────────────────────────────────────────────────────────┤
│ Current implementation (MVP):                                                │
│   If: haversine distance > 300m                                              │
│   Then: Score contribution from distance = 0 (no points awarded)             │
│          Match can still proceed if other signals (chain, name) are strong.   │
│                                                                               │
│ NOT a hard disqualifier in current design.                                   │
│   Example: "Circle K Heimdal" observation 400m from station                  │
│   with perfect chain/name match: score = 0 (distance) + 25 (chain) +         │
│   30 (name) = 55 → review_needed (curator confirms geographic mismatch).     │
│                                                                               │
│ Status: MVP baseline only. Subject to calibration after real-world testing.  │
│   - May need adjustment up (e.g., 400m or 500m) if stations are sparse      │
│   - May need adjustment down (e.g., 200m) if false matches occur            │
│   - May need urban/rural differentiation post-MVP                            │
│                                                                               │
│ Rationale: Conservative MVP: distance >300m is weak signal but not terminal. │
│ Allows manual review for edge cases. Real data will inform calibration.      │
│                                                                               │
│ Enforcement: Distance component scoring uses 300m as breakpoint currently.   │
│ Flag for post-MVP: Revisit based on observed match quality and false         │
│ positive rate by distance band.                                              │
│                                                                               │
│ Post-MVP Monitoring:                                                         │
│   - Track false match rate by distance band (0–50m, 50–100m, etc.)          │
│   - Track curator override rate for >300m matches                            │
│   - Consider population density (urban may need tighter threshold)           │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ GATE 3: CHAIN MISMATCH (Hard disqualifier ONLY if both chains high-          │
│         confidence)                                                           │
├─────────────────────────────────────────────────────────────────────────────┤
│ Rule: ONLY terminal if BOTH observation.chain AND station.chain are:         │
│   - Explicitly recognized (in known chain registry)                           │
│   - Parser confidence ≥0.85 (high-confidence parse)                          │
│   AND they differ after normalization                                        │
│                                                                               │
│ If both high-confidence AND unequal: INSTANT REJECTION                       │
│   Score = 0, outcome = NO_SAFE_STATION_MATCH                                 │
│   Example: "Circle K" (confidence 0.95) vs "Uno-X" (confidence 0.90)        │
│   → Mismatch is terminal.                                                    │
│                                                                               │
│ If either chain is weak / uncertain / parser-derived:                        │
│   Chain component = 0 points (neutral, no penalty or reward)                 │
│   Continue scoring on distance + name. Do NOT reject.                        │
│   Example: "Bensin stasjon" parsed as chain=null (low confidence)            │
│   vs station.chain="Circle K" → continue matching on other signals.          │
│                                                                               │
│ If both chain=null: Chain component = 0 (neutral, neither provides signal)   │
│                                                                               │
│ Rationale: High-confidence chain mismatch is strong error signal.            │
│ But weak/uncertain chain signals should not block matches based on distance. │
│ Prevents false rejection of price reports without clear chain identification.│
│                                                                               │
│ Enforcement: Parser output includes confidence_score for each chain.         │
│ Gate evaluates (obs_confidence ≥0.85 AND stn_confidence ≥0.85 AND            │
│ obs_chain ≠ stn_chain) BEFORE disqualifying.                                 │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ GATE 4: PARSER FAILURE / MISSING COORDINATES (Pre-match validation)          │
├─────────────────────────────────────────────────────────────────────────────┤
│ If: station.latitude = null OR station.longitude = null                      │
│ Then: CANDIDATE EXCLUDED from pool (not scored)                              │
│                                                                               │
│ Rationale: Cannot calculate distance without coordinates. Excludes           │
│ incomplete Station records from consideration.                               │
│                                                                               │
│ Enforcement: Candidate pool filtering step.                                  │
└─────────────────────────────────────────────────────────────────────────────┘

════════════════════════════════════════════════════════════════════════════════
3. TIE / AMBIGUITY HANDLING
════════════════════════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────────────────────────┐
│ SCENARIO A: Single candidate ≥65 (no ambiguity)                              │
├─────────────────────────────────────────────────────────────────────────────┤
│ Outcome: MATCHED_STATION_ID                                                  │
│ Action: Proceed directly to FuelPrice creation                               │
│         NO manual review required                                             │
│                                                                               │
│ Example: Circle K Heimdal observation at 15m + chain match → 85 points       │
│ Only one station in pool scores ≥65.                                         │
│ Result: Automatic match, FuelPrice created.                                  │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ SCENARIO B: Multiple candidates ≥65 (HIGH AMBIGUITY — tie)                   │
├─────────────────────────────────────────────────────────────────────────────┤
│ Outcome: REVIEW_NEEDED_STATION_MATCH (forced manual review)                  │
│ Action: Return top 3 candidates (sorted by score) to curator                 │
│         NO FuelPrice created until curator decides                           │
│                                                                               │
│ Rationale: Multiple high-confidence matches indicate ambiguity in data       │
│ or similar station names in close proximity. Curator must select correct     │
│ station. Prevents arbitrary auto-selection of first-ranked candidate.        │
│                                                                               │
│ Example: "Uno-X Lade" observation matches:                                   │
│   - Station A "Uno-X Ladetorget" at 3m: Score 85                             │
│   - Station B "Uno-X Lade Terminal" at 8m: Score 80                          │
│ Both ≥65 → REVIEW_NEEDED. Curator selects A or B.                            │
│                                                                               │
│ Safety: Prevents wrong choice in ambiguous geography (same chain,            │
│ similar names, close distance). Human judgment required.                     │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ SCENARIO C: One candidate 35–64, others <35 (BORDERLINE MATCH)               │
├─────────────────────────────────────────────────────────────────────────────┤
│ Outcome: REVIEW_NEEDED_STATION_MATCH                                         │
│ Action: Return candidate (or top 3 if multiple 35–64) to curator             │
│         NO FuelPrice created until curator decides                           │
│                                                                               │
│ Rationale: Score 35–64 means some signals (distance + weak name, or          │
│ chain + weak distance) but insufficient for automatic match. Curator         │
│ judgment resolves ambiguity.                                                 │
│                                                                               │
│ Example: "Bensin Station Trondheim" (generic name) matches:                  │
│   - Station A "Circle K Trondheim" at 15m: Score 35 (distance 30 +           │
│     name 5, chain 0)                                                         │
│ No other candidates. Score 35 = review_needed threshold.                     │
│ Return to curator: "Is this Circle K or another station?"                    │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ SCENARIO D: All candidates <35 (NO SAFE MATCH)                               │
├─────────────────────────────────────────────────────────────────────────────┤
│ Outcome: NO_SAFE_STATION_MATCH                                               │
│ Action: Create StationCandidate (not FuelPrice)                              │
│         Log as unmatched observation                                         │
│         Curator reviews later in batch (asynchronous)                        │
│                                                                               │
│ Rationale: Insufficient signals for any match level. Observation cannot      │
│ be safely attributed to existing Station. Preserves data integrity by        │
│ avoiding wrong attribution.                                                  │
│                                                                               │
│ Example: Observation at 250m from nearest station + name similarity 0.40 →   │
│ Score 10. Creates StationCandidate for curator review (might be new station).│
└─────────────────────────────────────────────────────────────────────────────┘

════════════════════════════════════════════════════════════════════════════════
4. THRESHOLD RATIONALE
════════════════════════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────────────────────────┐
│ THRESHOLD 1: Score ≥ 65 + DOMINANCE GAP → MATCHED_STATION_ID                 │
│                           (Automatic match, no review)                       │
├─────────────────────────────────────────────────────────────────────────────┤
│ DUAL REQUIREMENTS for auto-match:                                            │
│                                                                               │
│ (1) TOP SCORE ≥ 65                                                           │
│     Minimum configuration: Distance (20–30) + Chain (25) + Name (10–20)      │
│                                                                               │
│ (2) DOMINANCE GAP ≥ 10 points                                                 │
│     Top candidate score − Second-best candidate score ≥ 10                   │
│                                                                               │
│     Conservative threshold: 10-point gap ensures clear separation.           │
│     Prevents auto-match when close competitors exist.                        │
│                                                                               │
│ Example configurations:                                                      │
│   (A) Top score 75, Second score 60 → Gap 15 ✓ → AUTO-MATCH                 │
│       "Circle K Heimdal" at 25m, 95% name similarity                        │
│       No competing strong candidate → Safe auto-match                        │
│                                                                               │
│   (B) Top score 70, Second score 62 → Gap 8 ✗ → REVIEW_NEEDED               │
│       Even though both meet 65, gap too close                                │
│       Ambiguity forces curator decision                                      │
│                                                                               │
│   (C) Top score 65, Second score 58 → Gap 7 ✗ → REVIEW_NEEDED               │
│       At threshold but insufficient separation from runner-up               │
│       Curator confirms selection                                             │
│                                                                               │
│ NEVER auto-match with:                                                       │
│   - Score <65 (regardless of gap)                                             │
│   - Gap <10 (regardless of top score, unless gap=0 case below)               │
│   - Chain mismatch (high-confidence) / Location conflict                      │
│   - Multiple candidates ≥65 (at least two strong options exist)              │
│                                                                               │
│ Tie case (gap=0):                                                            │
│   Multiple candidates with same score → REVIEW_NEEDED (curator breaks tie)  │
│   Example: Two "Uno-X Lade" stations both score 75 → Return both for review  │
│                                                                               │
│ Safety rationale:                                                            │
│   - ≥65 alone is not sufficient; top score must dominate runner-up          │
│   - 10-point gap chosen conservatively: ~33% of max score (95)              │
│   - Prevents auto-match in ambiguous geographies (same chain, similar names) │
│   - Allows curator to resolve unclear cases                                  │
│                                                                               │
│ Prevents: False attribution when multiple plausible candidates exist         │
│ Enables: Fast path only for unambiguous, well-separated matches              │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ THRESHOLD 2: 35 ≤ Score < 65 → REVIEW_NEEDED_STATION_MATCH                   │
│                                (Curator manual decision)                      │
├─────────────────────────────────────────────────────────────────────────────┤
│ Conservative basis for 35–64 range:                                          │
│                                                                               │
│ Why lower bound = 35?                                                        │
│   (A) Distance 30 + Name 5 = 35                                               │
│       (15m proximity + weak name signal, no chain confidence)                 │
│       Requires curation: proximity alone insufficient                        │
│                                                                               │
│   (B) Distance 20 + Chain 15 = 35                                             │
│       (50m distance + chain present but no name confirmation)                 │
│       Requires curation: multiple weak signals, no single strong anchor      │
│                                                                               │
│ Example review_needed cases:                                                 │
│   - Same chain, ambiguous location (top 3 candidates all similar scores)    │
│   - Good distance, weak name match (generic names, misspellings)             │
│   - Good name, mediocre distance (multiple nearby stations)                  │
│                                                                               │
│ Safety: Curator sees candidates with some credibility but insufficient       │
│ automatic confidence. Curator resolves ambiguity (human ground truth).       │
│                                                                               │
│ Prevents: Automatic wrong match on weak signals                              │
│ Enables: Learning from curator decisions (future threshold refinement)       │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ THRESHOLD 3: Score < 35 → NO_SAFE_STATION_MATCH                              │
│                           (Create StationCandidate, not FuelPrice)            │
├─────────────────────────────────────────────────────────────────────────────┤
│ Conservative basis for <35 cutoff:                                           │
│                                                                               │
│ What scores <35 tell us:                                                     │
│   - Observation is too distant OR too dissimilar to any candidate            │
│   - Generic/unparseable name with no strong geographic signal                │
│   - Chain signal missing/absent (no confirmation)                             │
│                                                                               │
│ Example scenarios:                                                           │
│   (A) Distance 5 + Name 25 = 30                                               │
│       (Very close but name similarity 0.50–0.60; possible OCR error)         │
│       Cannot safely match on proximity + weak name alone                     │
│                                                                               │
│   (B) Distance 10 + Chain 0 + Name 0 = 10                                     │
│       (Good distance but name/chain completely absent or mismatch)           │
│       Too weak for any auto/review decision                                  │
│                                                                               │
│ Safety: Treats observation as "potential new station" or incomplete data.    │
│ Creates StationCandidate (not FuelPrice) for async curator review.           │
│                                                                               │
│ Prevents: FuelPrice creation without clear attribution                       │
│ Enables: Batch curation of unclear observations later                        │
│ Result: Data integrity > speed; no false prices in system                    │
└─────────────────────────────────────────────────────────────────────────────┘

════════════════════════════════════════════════════════════════════════════════
5. TEST CASES & EXPECTED OUTCOMES
════════════════════════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────────────────────────┐
│ TEST CASE 1: Exact Match with Qualifier Difference                           │
│────────────────────────────────────────────────────────────────────────────│
│ Observation: GooglePlaces "Circle K Heimdal Truck Station" at (63.41, 10.39) │
│ Station:     "Circle K Heimdal" at (63.4100, 10.3900), chain="Circle K"      │
│ City:        Trondheim (match)                                               │
│ Distance:    15 meters                                                       │
│                                                                               │
│ Scoring:                                                                     │
│   Distance (15m):       30 points (0–30m bracket)                             │
│   Chain ("Circle K" =   25 points (exact normalized match)                    │
│          "Circle K"):                                                        │
│   Name similarity:      20 points ("Circle K Heimdal" vs                      │
│   ("Circle K Heimdal"   "Circle K Heimdal Truck Station" ≈ 0.87 bigram)      │
│   vs full name):                                                             │
│   Location ("Heimdal"   10 points (explicit areaLabel match)                  │
│   = areaLabel):                                                              │
│   ────────────────────────────────────────────────────────                  │
│   TOTAL:                 85 points                                            │
│                                                                               │
│ Gates:                  City ✓, Distance ✓, Chain ✓                          │
│ Outcome:                MATCHED_STATION_ID (≥65, single candidate)           │
│ Action:                 Create FuelPrice immediately (no curator review)      │
│                                                                               │
│ Safety verdict:         ✓ SAFE — Multiple strong signals (distance +         │
│                         chain + name + location)                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ TEST CASE 2: Ambiguous Location, Same Chain (Multiple High-Score Candidates) │
│────────────────────────────────────────────────────────────────────────────│
│ Observation: User reports "Uno-X Lade" at (63.4050, 10.4100)                │
│ City:        Trondheim (explicit)                                            │
│                                                                               │
│ Station A:   "Uno-X Ladetorget" at (63.4048, 10.4102), chain="Uno-X",        │
│              areaLabel="Lade"                                                │
│   Distance:  3 meters                                                        │
│   Scoring:   Distance 30 + Chain 25 + Name 20 + Location 10 = 85             │
│                                                                               │
│ Station B:   "Uno-X Lade Terminal" at (63.4055, 10.4110), chain="Uno-X",     │
│              areaLabel="Lade"                                                │
│   Distance:  8 meters                                                        │
│   Scoring:   Distance 30 + Chain 25 + Name 15 + Location 10 = 80             │
│                                                                               │
│ Gates:       City ✓ (both explicit), Chain ✓ (both high-confidence),         │
│              Distance ✓                                                      │
│                                                                               │
│ Dominance Gap Check:                                                         │
│   Top (A) = 85, Second (B) = 80                                              │
│   Gap = 85 − 80 = 5 points < 10 points threshold ✗                          │
│                                                                               │
│ Outcome:     REVIEW_NEEDED_STATION_MATCH (gap too small despite both ≥65)   │
│ Action:      Return both [A: 85, B: 80] to user/curator for selection       │
│              Curator confirms which station based on local knowledge         │
│              NO FuelPrice created until curator chooses                      │
│                                                                               │
│ Safety verdict:         ✓ SAFE — Dominance gap rule prevents arbitrary      │
│                         selection between closely-scored candidates.         │
│                         Same chain, nearby distance, similar names = ambiguous│
│                         Curator resolves which "Lade" location is intended    │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ TEST CASE 3: Different Chains, Close Distance (High-Confidence Mismatch)     │
│────────────────────────────────────────────────────────────────────────────│
│ Observation: GooglePlaces "Circle K Oslo Torgata" at (59.9142, 10.7502)      │
│ Parsed chain: "Circle K" (confidence = 0.95)                                 │
│                                                                               │
│ Station:     "Uno-X Oslo Torgata" at (59.9140, 10.7500)                      │
│ Station chain: "Uno-X" (confidence = 0.98, known from Station record)         │
│ City:        Oslo (explicit, matches)                                        │
│ Distance:    25 meters                                                       │
│                                                                               │
│ Gates:       City ✓ (both explicit)                                          │
│                                                                               │
│ Chain Gate Check:                                                            │
│   obs_chain = "Circle K" (confidence 0.95 ≥ 0.85) ✓                          │
│   stn_chain = "Uno-X" (confidence 0.98 ≥ 0.85) ✓                             │
│   obs_chain ≠ stn_chain: "Circle K" ≠ "Uno-X" ✓                              │
│   Result: INSTANT DISQUALIFICATION (chain gate triggered)                    │
│                                                                               │
│ Scoring (halted):                                                            │
│   Chain mismatch overrides; final Score = 0                                  │
│                                                                               │
│ Outcome:     NO_SAFE_STATION_MATCH                                           │
│ Action:      Create StationCandidate(sourceName="GooglePlaces",              │
│              proposedName="Circle K Oslo Torgata", reason="chain_mismatch")  │
│              Do NOT create FuelPrice                                         │
│              Log chain mismatch in FetchLog                                  │
│                                                                               │
│ Safety verdict:         ✓ SAFE — High-confidence chain mismatch is terminal. │
│                         Prevents attribution of Circle K price to Uno-X      │
│                         station despite proximity. Separate operator chains. │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ TEST CASE 4: Generic Name, Low Confidence                                    │
│────────────────────────────────────────────────────────────────────────────│
│ Observation: User reports "Bensin Station Trondheim" at (63.4200, 10.3900)   │
│ City:        Trondheim                                                       │
│                                                                               │
│ Station A:   "Shell Trondheim Singsås" at (63.4195, 10.3895), chain="Shell"  │
│   Distance:  7 meters                                                        │
│   Scoring:   Distance 30 + Chain 0 + Name 0 + Location 0 = 30                │
│   (Generic observation name has no clear chain, doesn't match "Shell")       │
│                                                                               │
│ Station B:   "Circle K Trondheim" at (63.4210, 10.3905), chain="Circle K"    │
│   Distance:  15 meters                                                       │
│   Scoring:   Distance 30 + Chain 0 + Name 5 + Location 0 = 35                │
│   (Generic "Bensin" vs "Circle K Trondheim" similarity ≈ 0.50 bigram)       │
│                                                                               │
│ Gates:       City ✓, Distance ✓                                              │
│ Best Match:  Station B with 35 points (exactly at review_needed threshold)   │
│                                                                               │
│ Outcome:     REVIEW_NEEDED_STATION_MATCH                                     │
│ Action:      Return Station B to curator: "Generic 'Bensin Station'         │
│              observation — is this Circle K Trondheim?"                      │
│              NO FuelPrice created until curator confirms                     │
│                                                                               │
│ Safety verdict:         ✓ SAFE — Generic name + missing chain signals       │
│                         force curator judgment. Prevents wrong attribution   │
│                         of generic observation to any chain.                 │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ TEST CASE 5: High Distance, Strong Name Match (City Mismatch)                │
│────────────────────────────────────────────────────────────────────────────│
│ Observation: OSM "Circle K Heimdal" at (63.4100, 10.3900)                    │
│ Observation city: Trondheim                                                  │
│                                                                               │
│ Station:     "Circle K Heimdal" at (63.4100, 10.5200), city=Oslo             │
│             (17 kilometers away)                                             │
│                                                                               │
│ Gates:       City mismatch: Trondheim ≠ Oslo → INSTANT DISQUALIFICATION      │
│             (checked BEFORE distance calculation)                            │
│                                                                               │
│ Scoring (never runs):                                                        │
│   Pre-gate rejection prevents distance scoring.                              │
│                                                                               │
│ Outcome:     NO_SAFE_STATION_MATCH                                           │
│ Action:      Station pool filtered to exclude Oslo records.                  │
│              Observation "Circle K Heimdal" searches only Trondheim stations  │
│              If no Trondheim "Circle K Heimdal" → Create StationCandidate    │
│                                                                               │
│ Safety verdict:         ✓ SAFE — City boundary is hard constraint.           │
│                         Prevents cross-city false matches despite perfect    │
│                         name/chain alignment.                                │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ TEST CASE 6: Partial Chain, Borderline Distance (Score = 80)                 │
│────────────────────────────────────────────────────────────────────────────│
│ Observation: User "YX Heimdal" at (63.4100, 10.3900)                         │
│ City:        Trondheim                                                       │
│                                                                               │
│ Station:     "YX Heimdal" at (63.4100, 10.3850), chain="YX", city=Trondheim  │
│ Distance:    55 meters (in 31–75m bracket)                                   │
│                                                                               │
│ Scoring:                                                                     │
│   Distance (55m):       20 points (31–75m bracket)                            │
│   Chain ("YX" =         25 points (exact match)                               │
│          "YX"):                                                              │
│   Name similarity       25 points (exact "YX Heimdal" = "YX Heimdal"         │
│   ("YX Heimdal" =       bigram ≈ 0.99)                                       │
│   "YX Heimdal"):                                                             │
│   Location ("Heimdal"   10 points (explicit areaLabel match)                  │
│   = areaLabel):                                                              │
│   ────────────────────────────────────────────────────────                  │
│   TOTAL:                 80 points                                            │
│                                                                               │
│ Gates:       City ✓, Distance ✓, Chain ✓                                      │
│ Outcome:     MATCHED_STATION_ID (≥65, single candidate)                      │
│ Action:      Create FuelPrice immediately (no curator review)                │
│                                                                               │
│ Safety verdict:         ✓ SAFE — Distance concern (55m, medium proximity)    │
│                         is mitigated by strong chain + name + location       │
│                         signals. Multiple independent confirmations justify   │
│                         auto-match.                                          │
└─────────────────────────────────────────────────────────────────────────────┘

════════════════════════════════════════════════════════════════════════════════
CONSERVATISM ASSESSMENT
════════════════════════════════════════════════════════════════════════════════

✓ GATE SUMMARY:
  1. City mismatch → REJECTED
  2. Distance >300m → REJECTED
  3. Chain mismatch → REJECTED
  4. Missing coordinates → EXCLUDED

✓ THRESHOLD SUMMARY:
  ≥65:  Requires TWO+ strong signals; prevents single-signal false positives
  35–64: Requires human curator judgment; prevents low-confidence auto-match
  <35:  Creates candidate, not FuelPrice; data integrity preferred over speed

✓ TIE-BREAKING:
  Multiple ≥65 candidates → review_needed (no arbitrary selection)
  No single >35 candidate → no_safe_match (creates candidate, awaits review)

✓ SIGNAL WEIGHTS:
  Chain = 25 (most reliable, mismatch is terminal)
  Name = 30 (important but variant-prone; scaled conservatively)
  Distance = 30 (strong but alone insufficient)
  Location = 10 (optional bonus, never penalty)

CONCLUSION: Specification prioritizes data integrity over automation speed.
False attribution prevented by multiple independent gates and conservative thresholds.
System defaults to review (human judgment) when signals are ambiguous or conflicting.

════════════════════════════════════════════════════════════════════════════════
`;

export default function MatchingSpecReviewComponent() {
  return (
    <div className="whitespace-pre-wrap font-mono text-xs text-slate-700 bg-slate-50 p-6 rounded-lg border border-slate-200 max-h-screen overflow-y-auto">
      {MATCHING_SPEC_REVIEW}
    </div>
  );
}