## 2026-03-10 — Entry 33 (Phase 2 Preview Contract — Read-Only Response Path Added)

### Task
Complete the read-only contract between Phase2MatchingPreviewPanel and the existing locked Phase 2 matching engine in functions/matchStationForUserReportedPrice.ts. Add minimal preview response path that exposes parser + scorer metadata without changing any matching behavior.

### What was verified before change
- functions/matchStationForUserReportedPrice.ts confirmed present with all inline Phase 2 logic:
  - normalizeChainName()
  - parseStationName()
  - scoreStationMatch()
  - matchDecision()
  - haversineDistance()
  - All thresholds, gates, scoring signals
- src/components/admin/Phase2MatchingPreviewPanel.jsx confirmed present (created Entry 32)
- All Phase 2 matching logic locked and untouched
- All frozen Phase 2 files confirmed untouched

### What was implemented
1. Added preview_mode parameter handling to main Deno.serve handler in functions/matchStationForUserReportedPrice.ts
   - Early exit when preview_mode === true
   - Calls new handlePreviewMode() function
   - Exits before any write path

2. Created handlePreviewMode() function in functions/matchStationForUserReportedPrice.ts:
   - Parses station name using existing parseStationName()
   - Fetches candidate pool via getNearbyStationCandidates (or fallback to full city catalog)
   - Scores all candidates using existing scoreStationMatch()
   - Applies matchDecision() logic to determine final outcome
   - Calculates dominance gap
   - Returns read-only preview response:
     - parsed_chain
     - parsed_location
     - parsed_name_base
     - candidate_pool_source
     - candidates_count
     - top_candidates (max 5, with score breakdown)
     - final_decision
     - matched_station_id (if applicable)
     - review_needed_reason (if applicable)
     - dominance_gap
     - debug_notes ("Read-only preview mode: no data written, no records created")
   - No FuelPrice writes
   - No Station creation
   - No StationReview creation
   - No mutations of any kind

3. No modifications to existing Phase 2 logic:
   - No changes to scoring thresholds (65, 35)
   - No changes to dominance gap minimum (10)
   - No changes to distance bands
   - No changes to chain gate logic
   - No changes to name similarity scoring
   - No changes to review routing rules
   - No changes to production non-preview behavior

### What was NOT implemented
- No changes to scoreStationMatch thresholds or logic
- No changes to matchDecision gates or requirements
- No changes to normalizeChainName or parseStationName behavior
- No changes to distance band calculations
- No changes to chain gate logic
- No changes to name similarity scoring
- No changes to production matching path
- No FuelPrice writes in preview mode
- No Station creation
- No StationReview creation
- No data mutations of any kind

### Files actually created
- None (function added to existing file)

### Files actually modified
- functions/matchStationForUserReportedPrice.ts (added preview_mode early exit + handlePreviewMode function)

### Files explicitly confirmed untouched
- functions/auditPhase2DominanceGap.ts (frozen)
- functions/validateDistanceBands.ts (frozen)
- functions/auditCircleKMultiCandidateAmbiguity.ts (frozen)
- functions/classifyStationsRuleEngine.ts (frozen)
- functions/classifyGooglePlacesConfidence.ts (frozen)
- functions/classifyPricePlausibility.ts (frozen)
- functions/deleteAllGooglePlacesPrices.ts (frozen)
- functions/deleteGooglePlacesPricesForReclassification.ts (frozen)
- functions/verifyGooglePlacesPriceNormalization.ts (frozen)
- functions/matchStationForUserReportedPrice.ts production behavior unchanged (only added early exit + preview function)

### Diff-style summary
+ Added preview_mode parameter to main handler payload
+ Added early exit: if preview_mode === true, call handlePreviewMode() and return
+ Created handlePreviewMode() function (async, read-only):
  - Parses station name using existing parseStationName()
  - Fetches candidate pool via getNearbyStationCandidates() or fallback
  - Scores candidates using existing scoreStationMatch()
  - Applies matchDecision() for final outcome
  - Returns preview-only response with parsed data, candidates, scores, decision
  - No writes, no mutations
- Zero changes to existing Phase 2 logic, thresholds, gates, or production behavior

### Preview Response Contract
Phase2MatchingPreviewPanel expects and receives:
```
{
  preview_mode: true,
  parsed_chain: string | null,
  parsed_location: string | null,
  parsed_name_base: string | null,
  candidate_pool_source: string (e.g., "proximity_filter", "fallback_full_catalog"),
  candidates_count: number,
  top_candidates: [
    {
      name: string,
      chain: string | null,
      city: string | null,
      final_score: number,
      distance_km: number,
      score_breakdown: object (with signals breakdown)
    }
  ],
  final_decision: string ("MATCHED_STATION_ID" | "REVIEW_NEEDED_STATION_MATCH" | "NO_SAFE_STATION_MATCH"),
  matched_station_id: string | null,
  review_needed_reason: string | null,
  dominance_gap: number | null,
  debug_notes: string
}
```

### Governance safety guarantees
1. Preview mode exits BEFORE any write path
2. No modifications to any Phase 2 scoring logic
3. No changes to thresholds, gates, distance bands, or chain rules
4. No FuelPrice writes in preview mode
5. No Station creation
6. No StationReview creation
7. No data mutations of any kind
8. Production non-preview behavior completely unchanged
9. All locked Phase 2 files remain untouched
10. Preview response is pure metadata observation

### Integration
Phase2MatchingPreviewPanel calls matchStationForUserReportedPrice with preview_mode: true
→ Function early-exits with handlePreviewMode()
→ Returns preview-only metadata
→ UI displays parsed data, candidates, scores, decision without writing

### Commit hash
unavailable in current Base44 context

### GitHub visibility confirmation
Not yet verified in GitHub after publish

### Locked-component safety confirmation
Confirmed: all ten frozen Phase 2 files remain untouched. Production matching path unchanged. Only added read-only preview early exit path.