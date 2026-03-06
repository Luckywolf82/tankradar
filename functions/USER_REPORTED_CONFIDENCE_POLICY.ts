# User Reported Scan Confidence & Usage Policy

**Status**: PROPOSED (pending approval)  
**Date**: 2026-03-06  
**Version**: v1.0

---

## 1. CONFIDENCE SCORE MODEL

### Current State (PROBLEMATIC)
```
All user_reported → confidenceScore = 1.0
```
**Problem**: Treats all three match-states as equally confident. Violates semantic integrity.

---

### PROPOSED MODEL

#### 1a. matched_station_id
```
confidenceScore = 0.85
```

**Reasoning**:
- Station is auto-matched via conservative scoring (SCORE_MATCHED ≥ 65)
- User asserted the price manually (not extracted from receipt)
- No independent verification step
- Small chance of user error or photo misreading
- Geographic + chain + name signals are strong, but not foolproof

**Use Case**: Station-verified price data (with caveat: unverified source)

---

#### 1b. review_needed_station_match
```
confidenceScore = 0.50
```

**Reasoning**:
- Multiple candidates or ambiguous signals (35 ≤ score < 65)
- Station matching is uncertain
- User assertion is present, but station identity is unclear
- Requires human review before use in statistics
- Useful for market observation, not station truth

**Use Case**: Pending curation dataset (requires manual resolution)

---

#### 1c. no_safe_station_match
```
confidenceScore = 0.30
```

**Reasoning**:
- Station could not be matched to catalog at all
- Could indicate: city mismatch, unregistered station, user location error, or new station
- User assertion is present, but validation impossible
- High risk of misplaced data
- Could still provide value as "market signal" for discovery

**Use Case**: Market observation only (not for statistics), potential new station discovery

---

## 2. USAGE CLASSIFICATION MODEL

Data from user_reported scans will be classified into three distinct datasets:

### 2a. VERIFIED STATION STATISTICS
**What goes here**: `matched_station_id` only

**Requirements**:
- `station_match_status = matched_station_id`
- `stationId` is populated
- `confidenceScore ≥ 0.80`

**Use in Dashboard**:
- ✅ Regional statistics
- ✅ City-level averages
- ✅ Station-specific price history
- ✅ Market trends by chain
- Mark clearly as "user-contributed" source

**Semantics**: "Prices confirmed for known stations"

---

### 2b. OBSERVED MARKET STATISTICS
**What goes here**: All three match-states can contribute

**Requirements**:
- Include all user_reported entries
- BUT display with explicit transparency:
  - `matched_station_id`: 0.85 confidence
  - `review_needed_station_match`: 0.50 confidence (marked "unconfirmed station")
  - `no_safe_station_match`: 0.30 confidence (marked "station unknown")

**Use in Dashboard**:
- ✅ "Observed market prices" widget (separate from verified stats)
- ✅ Price range detection (all confidence levels)
- ✅ Anomaly detection (signal, not truth)
- ✅ Geographic gaps identification
- Dashboard must show: "These prices are unverified market observations"

**Semantics**: "Raw market signals from users, not station-verified"

---

### 2c. PENDING / MANUAL REVIEW DATASET
**What goes here**: `review_needed_station_match` + `no_safe_station_match`

**Requirements**:
- `station_match_status != matched_station_id`
- Requires human curation before moving to verified
- Logged separately for review team

**Use in Dashboard**:
- ✅ "Manual Review Queue" (admin/curator view only)
- ✅ Candidate suggestions
- ❌ NOT in any public statistics
- ❌ NOT in user-facing price displays

**Semantics**: "Unresolved cases pending manual station assignment or rejection"

---

## 3. SEMANTIC LABELING RULES

### In Code/Database
```
matched_station_id
→ confidenceScore: 0.85, sourceQuality: "user_verified", 
→ includeIn: ["verified_station_stats", "observed_market_stats"]

review_needed_station_match
→ confidenceScore: 0.50, sourceQuality: "station_uncertain",
→ includeIn: ["observed_market_stats", "pending_review"]

no_safe_station_match
→ confidenceScore: 0.30, sourceQuality: "station_unknown",
→ includeIn: ["observed_market_stats", "pending_review"]
```

### In Dashboard Display
```
Verified Station Statistics
└─ Source: User-reported (confirmed station)
└─ Confidence: High (0.85)
└─ Included: matched_station_id only

Observed Market Signals
├─ Source: User reports (unverified)
├─ Confidence: Mixed (0.30–0.85)
├─ Note: "Includes unconfirmed stations. For discovery only."
└─ Breakdown visible:
   - Confirmed: X prices (0.85)
   - Uncertain: Y prices (0.50)
   - Unknown station: Z prices (0.30)

Manual Review Queue (Admin only)
└─ Source: User reports (requires curation)
└─ Status: Pending assignment
└─ Count: N cases
```

---

## 4. IMPLEMENTATION CHECKLIST

### Phase 1: Data Model Update
- [ ] Update FuelPrice creation to set confidenceScore per match-status
- [ ] Add `sourceQuality` field (optional, for clarity)
- [ ] Update FetchLog to track distribution by match-status

### Phase 2: Dashboard Display Update
- [ ] Verified Station Stats: filter by `matched_station_id` only
- [ ] Observed Market Stats: show all, with confidence labels
- [ ] Pending Review: admin-only view with candidates
- [ ] Add metadata tooltips explaining confidence levels

### Phase 3: Documentation Update
- [ ] Update Dashboard integration guide
- [ ] Add curator guidelines for review_needed resolution
- [ ] Add FAQ for users: "Why isn't my price showing up?"

### Phase 4: Monitoring
- [ ] Track match-state distribution over time
- [ ] Monitor review_needed resolution rate
- [ ] Alert if no_safe_station_match becomes dominant (indicates catalog gap)

---

## 5. OPEN QUESTIONS FOR APPROVAL

1. **Exact confidenceScore values**: Are 0.85 / 0.50 / 0.30 appropriate, or should these be adjusted?
   
2. **Observed Market Stats visibility**: Should unconfirmed `review_needed` entries be shown to end users with confidence warnings, or hidden until reviewed?

3. **New Station Discovery**: Should `no_safe_station_match` with geographic clustering suggest new stations, or remain purely logged?

4. **Review SLA**: What is expected resolution time for `review_needed` cases? Should there be automatic aging/archival?

---

**Awaiting approval before implementation.**