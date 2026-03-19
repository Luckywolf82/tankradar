# SRP IMPLEMENTATION — PHASE 1 SAFE FIRST STEP
## TankRadar Governance · v1.3.2 compliant
## Date: 2026-03-19 · Status: Planning only · No code or data modified

---

## A. Updated Spec Files Read

The following governance artifacts were used as input for this planning task:

| Artifact | Version | Role |
|---|---|---|
| pages/CanonicalContractAuditReport | v1.3.2 | Primary source of truth — canonical FuelPrice contract, SRP spec, write-gate definition |
| Section D — FuelPrice Write Gate | v1.3.2 | Hard constraint: no direct FuelPrice.create from adapters |
| Section E — SRP as Enforced Layer | v1.3.2 | Defines SRP ownership boundaries |
| Section F — SRP Input Contract | v1.3.2 | Defines required and optional observation fields |
| Section G — Canonical FuelPrice Contract Matrix | v1.3.2 | 23-field output contract with tier classifications |
| Section I — Non-Bypass Constraint | v1.3.2 | Classification of GooglePlaces as parallel pipeline violation |
| Section J — SRP Failure Handling | v1.3.2 | No silent drops; all outcomes must write FuelPrice |
| Section N — Write Enforcement Rule | v1.3.2 | Ordering constraint: lock contract → define SRP → then adapt adapters |

---

## B. Candidate First-Step Options Considered

### Option 1 — Spec-only SRP interface artifact (governance doc update only)
Add a machine-readable interface definition to the governance folder documenting the SRP input/output shapes as a static artifact.
- Risk: zero runtime impact
- Limitation: creates no observable leverage — the contract already exists in the audit report. Duplicate effort with no new foundation.
- Verdict: Too passive. Adds documentation weight without creating testable surface.

### Option 2 — Non-runtime validation layer before FuelPrice.create
Modify LogPrice.jsx or adapter functions to call a validation check before each FuelPrice.create call.
- Risk: touches active write paths in both frontend and backend
- Limitation: requires coordinated change across at minimum 3 files (LogPrice.jsx, runGooglePlacesFetchAutomation, potentially fetchGooglePlacesRealMatching)
- Verdict: Too broad. Modifying write paths before SRP exists violates Section N ordering constraint.

### Option 3 — Shared observation object contract as a new backend function (read-only validator)
Create a new backend function that accepts an observation object, validates it against the SRP input contract from Section F, and returns a structured compliance report — without writing anything.
- Risk: zero. No existing files modified. No write paths touched.
- Leverage: establishes the canonical observation shape that all future adapters will produce. Makes the input contract machine-readable and testable.
- Verdict: ✅ Strong candidate.

### Option 4 — Read-only SRP preview function (simulate resolution without writing)
Create a function that accepts an observation object, runs the full SRP logic (proximity filter → scoring → outcome declaration), and returns what the outcome and canonical FuelPrice fields would be — without persisting anything.
- Risk: low for reads, but requires implementing the full SRP scoring logic (4-signal scoring, dominance gap gate) to be useful
- Limitation: implementing full scoring logic is a significant scope — too large for a "first step"
- Verdict: This is Phase 2, not Phase 1. Too large for the minimum safe first step.

### Option 5 — Isolate GooglePlaces adapter output without changing write path
Refactor runGooglePlacesFetchAutomation to separate the observation-assembly phase from the matching phase, without yet routing through SRP.
- Risk: medium — modifying an active automation that runs 4× per day
- Limitation: requires careful handling of the automation trigger; any error silently stops data ingestion
- Verdict: Too risky without SRP already in place. The adapter cannot be partially isolated safely.

### Option 6 — Write-path audit function (reads existing FuelPrice records, reports compliance)
Create a backend function that reads existing FuelPrice records and classifies each as contract-compliant or not, based on the Section G matrix.
- Risk: zero — read-only
- Leverage: immediately shows current production data quality, quantifies how many records already have null station_match_status (the primary write-gate violation)
- Verdict: ✅ Strong candidate. Produces immediate governance value with zero risk.

---

## C. Chosen First Safe Step

**Create a new read-only backend function: `auditFuelPriceContractCompliance`**

This function reads existing FuelPrice records and classifies each against the canonical contract defined in Section G of the spec (v1.3.2). It returns a structured compliance report segmented by sourceName.

It does NOT modify any records. It does NOT change any write path. It does NOT touch any locked files. It does NOT require any adapter change.

---

## D. Why This Step Is First

### Why not directly refactoring GooglePlaces?

Refactoring the GooglePlaces adapter requires:
1. SRP to already exist as a callable shared function
2. The adapter to be modified to produce a compliant observation object
3. The adapter's write path to be rerouted to call SRP instead of FuelPrice.create directly
4. The deduplication logic to survive the reroute
5. The automation trigger to continue working after the change

None of these preconditions are met. Refactoring GooglePlaces before SRP exists means migrating to a destination that does not yet exist. This is the pattern that produced the current fragmented state.

### Why not directly changing FuelPrice.create calls?

Gating FuelPrice.create requires SRP to already be implemented and validated. Changing the write call without a working SRP layer in place would break production data ingestion entirely. Section N ordering constraint is explicit: SRP must be implemented and validated before any adapter is updated.

### Why this step creates a better foundation

The compliance audit function does three things that no other first step does simultaneously:

1. **Quantifies the current violation scope.** It tells us exactly how many existing FuelPrice records have null station_match_status (write-gate bypass), segmented by sourceName. This is not currently knowable from the UI. Without this number, any remediation plan is speculative.

2. **Makes the canonical contract executable.** Writing the compliance check requires translating the 23-field contract matrix (Section G) into a concrete conditional evaluation. This is the same logic SRP will use to validate its own output. The compliance function is therefore the embryonic form of SRP's output validator.

3. **Establishes baseline metrics.** The report gives us a before-state against which future SRP migration can be measured. When adapters are migrated to SRP, the compliance rate should move from current (unknown) toward 100%. Without a baseline, migration success cannot be verified.

---

## E. Exact Scope Boundaries

### Artifact to create

**One new backend function:** `auditFuelPriceContractCompliance`

### What this function MUST do

- Read FuelPrice records from the database (no write operations)
- Classify each record against the following contract tiers from Section G:
  - Tier A fields: are fuelType, priceNok, priceType, sourceName, parserVersion, fetchedAt, plausibilityStatus, confidenceScore, station_match_status, sourceFrequency, sourceUpdatedAt, locationLabel all present and non-null where required?
  - Tier B check: if station_match_status = matched_station_id, is stationId set?
  - Tier B check: if station_match_status = matched_station_id, is confidenceReason set?
  - Tier C check: if station_match_status = review_needed_station_match, is station_match_candidates non-empty?
  - Tier D check: if station_match_status = no_safe_station_match, is station_name OR locationLabel present?
  - Write-gate violation: is station_match_status null? (primary violation indicator)
- Aggregate results by sourceName
- Return a structured JSON report

### What the function MUST NOT do

- Write to any entity (FuelPrice, StationCandidate, StationReview, Station, FetchLog, SourceRegistry)
- Modify any existing record
- Call any matching logic
- Touch any locked files
- Change any automation or scheduled job
- Implement SRP scoring or matching — that is Phase 2

### What is explicitly left for later

Everything in section G below.

---

## F. Repo-Verifiable Success Criteria

The step is complete when all of the following are true:

1. **Function exists:** `functions/auditFuelPriceContractCompliance.js` exists in the repository
2. **Function is callable:** `base44.functions.invoke('auditFuelPriceContractCompliance', {})` returns a valid JSON response without error
3. **Response structure is canonical:** Response includes at minimum:
   - `totalRecords` — total FuelPrice records scanned
   - `bySource` — object keyed by sourceName, each containing:
     - `totalRecords`
     - `writeGateViolations` — count of records where station_match_status is null
     - `missingConfidenceScore` — count of records where confidenceScore is null
     - `missingPlausibilityStatus` — count of records where plausibilityStatus is null
     - `tierBViolations` — count of matched records missing stationId or confidenceReason
     - `tierCViolations` — count of review_needed records missing station_match_candidates
     - `tierDViolations` — count of no_safe_match records missing station_name and locationLabel
   - `auditedAt` — ISO timestamp
   - `specVersion` — "v1.3.2"
4. **No writes confirmed:** SourceRegistry, FuelPrice, and all other entities show no new records or modifications after the function runs
5. **Admin UI surface:** The compliance report is accessible from the SuperAdmin panel (read-only display — not a new page, a section or panel in an existing admin view)
6. **Results are interpretable:** The report output is sufficient to answer: "What percentage of GooglePlaces records are write-gate violations?"

---

## G. Deferred Work List

The following work is important, confirmed by the spec, and explicitly deferred past this step:

| Deferred item | Reason for deferral |
|---|---|
| SRP implementation as a shared backend function | Requires output from compliance audit to scope correctly; Phase 2 |
| user_reported adapter SRP migration | Blocked on SRP existing and being validated; Phase 3 |
| GooglePlaces adapter SRP migration | Highest risk adapter; blocked on SRP + user_reported migration; Phase 4 |
| Runtime write-gate enforcement (reject non-SRP writes) | Requires SRP to be live and all adapters migrated first; Phase 5 |
| Entity-level schema validation | Requires runtime enforcement to be stable; Phase 6 |
| StationReview routing on review_needed | Currently not implemented for any source; deferred to post-SRP |
| Confidence score merging across sources | Explicitly deferred in Section 33 of governance rules |
| Backfill of null station_match_status on existing records | Data migration; requires curator decision; deferred post-audit |
| Decommissioning of fetchGooglePlacesPrices and fetchGooglePlacesRealMatching (duplicate GP paths) | Requires GooglePlaces SRP migration to complete first |
| classifyGooglePlacesConfidence rework or deprecation | Frozen file; deferred until governance decision on its role |

---

## Summary

**One artifact. One function. Zero writes. Zero adapter changes. Zero locked-file modifications.**

The compliance audit function translates the canonical contract spec into its first executable form, produces the baseline data the migration roadmap requires, and creates no risk to production behavior. It is the minimum sufficient step that moves from specification to implementation without crossing into the dangerous territory of changing active write paths before the shared core exists.

---

*TankRadar Governance · v1.3.2 · 2026-03-19 · Planning only — no code, data, or entities modified*