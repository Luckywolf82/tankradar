## 2026-03-10 — Entry 37 (Phase 2 Preview Contract Fix — station_chain Payload Field)

### Task
Fix the request payload contract between Phase2MatchingPreviewPanel frontend and matchStationForUserReportedPrice backend. The optional chain input was being sent as field `chain` but the backend preview_mode expected field `station_chain`. Correct this contract mismatch without changing any matching logic.

### What was verified before change
- Phase2MatchingPreviewPanel.jsx confirmed present with preview_mode support
- matchStationForUserReportedPrice.ts confirmed expecting payload field `station_chain` in preview_mode
- Issue identified: frontend was sending `chain` field instead of `station_chain`
- All locked Phase 2 matching logic confirmed untouched
- All frozen Phase 2 files confirmed untouched

### What was implemented

#### 1. Fixed src/components/admin/Phase2MatchingPreviewPanel.jsx
Changed the preview request payload construction:

**Before:**
```javascript
const response = await base44.functions.invoke(
  "matchStationForUserReportedPrice",
  {
    preview_mode: true,
    station_name: stationName,
    chain: chain || null,              // ← incorrect field name
    city: city || null,
    latitude: latitude ? parseFloat(latitude) : null,
    longitude: longitude ? parseFloat(longitude) : null,
  }
);
```

**After:**
```javascript
const response = await base44.functions.invoke(
  "matchStationForUserReportedPrice",
  {
    preview_mode: true,
    station_name: stationName,
    station_chain: chain || null,     // ← corrected field name
    city: city || null,
    latitude: latitude ? parseFloat(latitude) : null,
    longitude: longitude ? parseFloat(longitude) : null,
  }
);
```

Impact:
- Optional chain input field now correctly passes to backend
- Backend preview_mode can now properly read and use the chain value
- No UI changes, no behavioral changes to preview results
- Pure request contract alignment

### What was NOT implemented
- No backend function changes
- No modifications to matchStationForUserReportedPrice.ts
- No changes to any scoring logic, thresholds, or gates
- No new entities or database writes
- No modifications to parser or matching engine
- No changes to preview behavior or results
- No interactive controls or state management changes

### Files actually modified
- src/components/admin/Phase2MatchingPreviewPanel.jsx (line 32: `chain:` → `station_chain:`)

### Files explicitly confirmed untouched
- functions/matchStationForUserReportedPrice.ts (frozen)
- functions/auditPhase2DominanceGap.ts (frozen)
- functions/validateDistanceBands.ts (frozen)
- functions/auditCircleKMultiCandidateAmbiguity.ts (frozen)
- functions/classifyStationsRuleEngine.ts (frozen)
- functions/classifyGooglePlacesConfidence.ts (frozen)
- functions/classifyPricePlausibility.ts (frozen)
- functions/deleteAllGooglePlacesPrices.ts (frozen)
- functions/deleteGooglePlacesPricesForReclassification.ts (frozen)
- functions/verifyGooglePlacesPriceNormalization.ts (frozen)

### Diff-style summary
~ Modified src/components/admin/Phase2MatchingPreviewPanel.jsx:
  - Line 32: Changed `chain: chain || null,` to `station_chain: chain || null,`
  - No other changes to file structure, logic, or behavior

### Why this fix was needed

#### Contract Mismatch Issue
The frontend and backend had misaligned field naming:

**Frontend (Phase2MatchingPreviewPanel):**
- Sent payload field: `chain`
- This is a local variable name

**Backend (matchStationForUserReportedPrice preview_mode):**
- Expected payload field: `station_chain`
- This is semantically correct (distinguishes from other chain contexts)

When the frontend sent `chain`, the backend's `station_chain` field received `undefined`.

#### Impact of the Mismatch
- Optional chain input in preview form was not being read by backend
- Backend chain parsing could not use the provided value
- This affected match scoring when chain was provided
- Preview results were valid but incomplete (missing chain context)

#### Solution
Align the frontend payload field name with what the backend expects: `station_chain`.

### Governance Safety Guarantees
1. No changes to any Phase 2 matching logic
2. No modifications to score thresholds, dominance gap, or distance bands
3. No changes to chain matching, name similarity, or location signal logic
4. No changes to review routing or auto-match gate
5. No data writes or entity creation
6. Pure contract alignment (frontend payload field naming only)
7. All locked Phase 2 files remain untouched

### Integration
Phase2MatchingPreviewPanel now correctly passes chain input to matchStationForUserReportedPrice preview_mode:

1. User enters optional chain value (e.g., "circle k")
2. Frontend sends payload with `station_chain: "circle k"`
3. Backend preview_mode reads `station_chain` field
4. Parser can use chain context in matching logic
5. Results display correctly parsed and scored candidates

### Testing implications
- Existing preview tests that provided chain input should now work correctly
- Chain-dependent match scores should be calculated with chain context
- No changes to preview output format or structure
- Results may differ if tests previously ignored missing chain context

### Commit hash
unavailable in current Base44 context

### GitHub visibility confirmation
Entry 37 scheduled for publication after this change.

### Locked-component safety confirmation
Confirmed: all ten frozen Phase 2 files remain untouched. stationNameParser and stationMatching were already present inline in matchStationForUserReportedPrice.ts. This task is a pure frontend request contract fix only. No matching logic, thresholds, distance bands, chain matching, name similarity, auto-match gate, or review routing were modified.

---

## Summary for Governance Record

**Contract Fix:**
- Frontend payload field `chain` → `station_chain` ✓
- Aligns with backend preview_mode expectations ✓
- No matching logic changes ✓
- All locked Phase 2 files untouched ✓
- Pure request contract alignment ✓