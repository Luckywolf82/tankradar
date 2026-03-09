/**
 * STATION MATCHING SPECIFICATION
 * 
 * Version: 1.0 (Design Phase Only)
 * Status: Design/Documentation
 * Applicable to: GooglePlaces adapter, User_Reported adapter, Future OSM adapter
 * 
 * This document defines the deterministic matching algorithm for pairing external
 * observations (prices, stations) to canonical Station records.
 */

export const STATION_MATCHING_SPECIFICATION = `

═══════════════════════════════════════════════════════════════════════════════
1. MATCHING INPUTS
═══════════════════════════════════════════════════════════════════════════════

All matching operations require:

{
  sourceName: string,           // "GooglePlaces" | "user_reported" | "OSM"
  sourceStationId: string,      // External ID from source (if available)
  rawName: string,              // Original name from source
  latitude: number,
  longitude: number,
  parsedChain: string | null,   // Normalized chain from parseStationName()
  parsedLocation: string | null,// Location part ("Heimdal")
  parsedQualifier: string | null,// Qualifier ("Truck", "Express")
  city: string                  // City name for filtering candidates
}

Station pool is filtered by city (exact match) and must have valid coords + chain.

═══════════════════════════════════════════════════════════════════════════════
2. SCORING MODEL (Deterministic)
═══════════════════════════════════════════════════════════════════════════════

Match Score (0–100) = Distance + Chain + Name Similarity + Location

Each component is independent; no negative scores.

DISTANCE COMPONENT (0–30 points):
  0–30m:    30 points (excellent proximity)
  31–75m:   20 points (good proximity)
  76–150m:  10 points (acceptable, requires strong name/chain)
  151–300m:  5 points (weak, requires very strong signals)
  301+m:     0 points (too far)

CHAIN COMPONENT (0–25 points):
  Exact normalized match: 25 points
  No observation chain: 0 points (neutral)
  Mismatch (e.g. "Circle K" vs "Uno-X"): -100 (instant disqualification)

NAME SIMILARITY COMPONENT (0–30 points):
  Similarity ≥0.95: 30 points (exact match)
  Similarity ≥0.85: 20 points (high)
  Similarity ≥0.70: 10 points (medium)
  Similarity ≥0.50:  5 points (low)
  Similarity <0.50:   0 points

  Uses bigram similarity on normalized names.

LOCATION COMPONENT (0–10 points):
  Explicit location match (areaLabel): 10 points
  Location in station name: 5 points
  No location signal: 0 points

CITY BONUS:
  Checked at filtering stage; city mismatch = disqualified immediately

═══════════════════════════════════════════════════════════════════════════════
3. THRESHOLDS
═══════════════════════════════════════════════════════════════════════════════

MATCHED_STATION_ID (Score ≥ 65):
  - High confidence; proceed directly to FuelPrice creation
  - Only valid if exactly ONE candidate scores ≥65
  - If multiple ≥65, downgrade to review_needed_station_match

REVIEW_NEEDED_STATION_MATCH (35 ≤ Score < 65):
  - Some signals but not confident enough for auto-match
  - Return top 3 candidates for curator review
  - Curator selects one or rejects all
  - No FuelPrice creation until approved

NO_SAFE_STATION_MATCH (Score < 35):
  - Insufficient signals for any match
  - Create StationCandidate for future curation
  - Do NOT create FuelPrice
  - Log as unmatched observation

RATIONALE:
  - 65 threshold: distance (20+) + chain (25) + name (20)
  - 35 threshold: allows distance + some name; forces review for borderline
  - No negative scores: conservative (unused components = 0, not penalties)

═══════════════════════════════════════════════════════════════════════════════
4. SAFETY CONSTRAINTS
═══════════════════════════════════════════════════════════════════════════════

NEVER AUTOMATIC STATION CREATION:
  ✓ Allowed: Return outcomes (matched, review_needed, unmatched)
  ✗ Not allowed: Create new Station records from matching
  ✗ Not allowed: Modify existing Stations without curator approval

NEVER OVERWRITE IDENTITIES:
  ✓ Allowed: Return stationId if matched
  ✗ Not allowed: Change canonical_station_id, merge, or consolidate

PIPELINE INTEGRITY:
  Observation → Matching → Outcome → (FuelPrice | StationCandidate | Log)
  Never skip StationCandidate → review path

SOURCE-SPECIFIC:
  GooglePlaces: matched → FuelPrice; review_needed → StationCandidate
  User_Reported: matched → FuelPrice; review_needed → StationCandidate
  OSM: matched → link record; unmatched → create Station
  Benchmark: no matching (national_average, no location)

═══════════════════════════════════════════════════════════════════════════════
5. TEST CASES
═══════════════════════════════════════════════════════════════════════════════

TEST 5.1: Exact Match with Qualifier Difference
────────────────────────────────────────────────
Observation: GooglePlaces "Circle K Heimdal Truck Station"
Station: name="Circle K Heimdal", chain="Circle K", distance=15m

Score:
  Distance: 30 (< 30m)
  Chain: 25 (exact match)
  Name: 20 (similarity ~0.90 despite "Truck Station")
  Location: 10 ("Heimdal" matches areaLabel)
  Total: 85 → MATCHED_STATION_ID

Outcome: Create FuelPrice directly.


TEST 5.2: Ambiguous Location, Same Chain
──────────────────────────────────────────
Observation: User "Uno-X Lade" at (63.4050, 10.4100)
Station A: "Uno-X Ladetorget" at (63.4048, 10.4102) [3m]
Station B: "Uno-X Lade Terminal" at (63.4055, 10.4110) [8m]

Score A:
  Distance: 30, Chain: 25, Name: 20, Location: 10 = 85

Score B:
  Distance: 30, Chain: 25, Name: 15, Location: 10 = 80

Outcome: Multiple candidates ≥65 → REVIEW_NEEDED_STATION_MATCH
  Return both to user for selection.


TEST 5.3: Different Chains, Close Distance
────────────────────────────────────────────
Observation: GooglePlaces "Circle K Oslo Torgata"
Station: "Uno-X Oslo Torgata", distance=25m

Chain Check: "Circle K" ≠ "Uno-X" (mismatch)
Score: 0 (instant disqualification)

Outcome: NO_SAFE_STATION_MATCH
  Create StationCandidate, log chain mismatch.


TEST 5.4: Generic Name, Low Confidence
────────────────────────────────────────
Observation: User "Bensin Station Trondheim" at (63.4200, 10.3900)
Station A: "Shell Trondheim Singsås" at (63.4195, 10.3895) [7m]
Station B: "Circle K Trondheim" at (63.4210, 10.3905) [15m]

Score A:
  Distance: 30, Chain: 0 (no observation chain), Name: 0 = 30
  → NO_SAFE_STATION_MATCH

Score B:
  Distance: 30, Chain: 0, Name: 5 (similarity 0.50) = 35
  → REVIEW_NEEDED_STATION_MATCH (exactly at threshold)

Outcome: Return Station B to curator for confirmation.


TEST 5.5: High Distance, Strong Name Match
────────────────────────────────────────────
Observation: OSM "Circle K Heimdal" at (63.4100, 10.3900)
Station: "Circle K Heimdal" at (63.4100, 10.5200) [17 km, different city]

City Check: Observation city="Trondheim", Station city="Oslo"
Result: Disqualified before scoring (hard constraint)

Outcome: NO_SAFE_STATION_MATCH (city mismatch is terminal).


TEST 5.6: Partial Chain, Borderline Distance
──────────────────────────────────────────────
Observation: User "YX Heimdal" at (63.4100, 10.3900)
Station: "YX Heimdal" at (63.4100, 10.3850) [55m]

Score:
  Distance: 20 (31–75m)
  Chain: 25 (exact match)
  Name: 25 (exact match)
  Location: 10 ("Heimdal" explicit)
  Total: 80 → MATCHED_STATION_ID

Outcome: Create FuelPrice; distance concern mitigated by strong signals.

═══════════════════════════════════════════════════════════════════════════════
6. IMPLEMENTATION NOTES
═══════════════════════════════════════════════════════════════════════════════

STATELESS:
  - No side effects; pure function Input → Score → Outcome
  - Can be tested with fixtures without touching Station table

DETERMINISTIC:
  - Same input always produces same score
  - No randomness or learning
  - Facilitates debugging and audit

CONSERVATIVE:
  - Prefers review_needed over matched
  - Prefers unmatched over false positive
  - Aligns with governance: "Unmatched is better than wrong match"

SHARED CORE:
  - GooglePlaces, user_reported, future OSM adapters use same matching()
  - Single source of truth for logic

CURATOR ROLE:
  - Accepts/rejects review_needed outcomes
  - Provides ground truth for future improvements
  - Never forced matches; always human choice

═══════════════════════════════════════════════════════════════════════════════
7. DEFERRED ENHANCEMENTS (POST-MVP)
═══════════════════════════════════════════════════════════════════════════════

- Machine learning refinement of weights
- Canonical identity consolidation
- Cross-source deduplication
- Confidence decay for old observations

Current specification is MVP-sufficient and governance-compliant.

═══════════════════════════════════════════════════════════════════════════════
`;

export default function StationMatchingSpecificationComponent() {
  return (
    <div className="whitespace-pre-wrap font-mono text-sm text-slate-700 bg-slate-50 p-6 rounded-lg border border-slate-200">
      {STATION_MATCHING_SPECIFICATION}
    </div>
  );
}