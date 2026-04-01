/**
 * CURRENT PRICE MATERIALIZATION AUDIT
 * Date: 2026-04-01
 * Auditor: Base44 AI (read-only audit — no code changes made)
 *
 * TRIGGER: Exported data shows fresh FuelPrice rows that do not appear to have
 * become the winning current price in CurrentStationPrices. Some previously
 * observed "working" examples (Circle K Rosten, Circle K Automat Heimdal) were
 * manually updated and are EXCLUDED as validation cases throughout this audit.
 *
 * SCOPE: Narrow pipeline audit for:
 *   FuelPrice → materializeCurrentStationPrice → CurrentStationPrices → NearbyPrices
 *
 * THIS FILE IS READ-ONLY. It contains no UI, no imports, no live data queries.
 */

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 1 — OBSERVED FILES
// ══════════════════════════════════════════════════════════════════════════════
/*
FILES ACTUALLY READ (full content confirmed):

  1. src/components/dashboard/NearbyPrices.jsx
  2. src/utils/currentPriceResolver.js
  3. src/utils/currentStationPricesAdapter.js
  4. src/utils/fuelPriceEligibility.js
  5. functions/materializeCurrentStationPrice  (Deno handler, full content read)

AUTOMATION REGISTRY (read via list_automations tool):
  - "Materialize CurrentStationPrices on FuelPrice write (Copy)"
    id: 69cd538c4f72a88ad2694cf4
    is_active: true, is_archived: false
    entity_name: FuelPrice, event_types: [create, update]
    last_run_at: 2026-04-01T17:19:39
    total_runs: 1, successful_runs: 1, failed_runs: 0
    NOTE: This is a recently created COPY. It has only run once in production.

  - "Materialize CurrentStationPrices on FuelPrice write" (ORIGINAL)
    id: 69c055888e3da034d8f09129
    is_active: false, is_archived: true   ← ARCHIVED/DISABLED
    total_runs: 7044, successful_runs: 6369, failed_runs: 695
    last_run_at: 2026-04-01T17:14:06

LOCKED FILES (not read, but noted):
  - functions/classifyPricePlausibility — relevant to plausibilityStatus assignment upstream.
    Not inspected. Not implicated by current evidence.
  - Other locked files not implicated.

FILES NOT FOUND / NOT READ:
  - functions/backfillCurrentStationPrices — not confirmed present; not needed for primary cases
*/

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 2 — OBSERVED EXPORTED DATA
// ══════════════════════════════════════════════════════════════════════════════
/*
Data queried live from database (treated as data-state evidence, not runtime proof).

──────────────────────────────────────────────────────────────────────────────
CASE A — PRIMARY: Uno-X Heimdal (stationId: 69c1a9edf29b64e5fb6b3df7)
──────────────────────────────────────────────────────────────────────────────

FuelPrice rows (confirmed from live query, sorted by fetchedAt desc):

  Row 1 (gasoline_95):
    id: 69cd4412297969cca9edee74
    fetchedAt:  2026-04-01T16:13:01.667Z   ← FRESH (today)
    created_date: 2026-04-01T16:13:06      ← also today
    updated_date: 2026-04-01T16:13:06      ← NOT updated after creation
    priceNok: 20.38
    priceType: user_reported
    plausibilityStatus: realistic_price
    station_match_status: matched_station_id
    stationId: 69c1a9edf29b64e5fb6b3df7 ✓

  Row 2 (diesel):
    id: 69cd4412297969cca9edee75
    fetchedAt:  2026-04-01T16:13:01.667Z   ← FRESH (today)
    created_date: 2026-04-01T16:13:06
    updated_date: 2026-04-01T16:13:06      ← NOT updated after creation
    priceNok: 25.27
    priceType: user_reported
    plausibilityStatus: realistic_price
    station_match_status: matched_station_id
    stationId: 69c1a9edf29b64e5fb6b3df7 ✓

CurrentStationPrices row (confirmed from live query):
    gasoline_95_price:    25.79
    gasoline_95_fetchedAt: 2026-03-23T18:55:47.255Z   ← 9 days old
    diesel_price:          28.79
    diesel_fetchedAt:      2026-03-23T18:55:47.255Z   ← 9 days old
    updatedAt:             2026-03-24T15:34:41.525Z

CONFIRMED MISMATCH: Both fresh FuelPrice rows (fetchedAt 2026-04-01) have NOT
been reflected in CurrentStationPrices (still shows 2026-03-23 data).

The staleness guard in materializeCurrentStationPrice would ALLOW these writes
because incoming fetchedAt (2026-04-01) > existing fetchedAt (2026-03-23).
Therefore the staleness guard is NOT the blocking mechanism for this case.

──────────────────────────────────────────────────────────────────────────────
CASE B — PARTIAL MATERIALIZATION: Circle K Nardo (stationId: 69c1a9edf29b64e5fb6b3ac7)
──────────────────────────────────────────────────────────────────────────────

FuelPrice rows confirmed from live query:

  user_reported gasoline_95 (2026-03-31T09:02:46):
    priceNok: 22.99, plausibilityStatus: realistic_price,
    station_match_status: matched_station_id  ← fully eligible

  user_reported diesel (2026-03-31T09:02:46):
    priceNok: 24.99, plausibilityStatus: realistic_price,
    station_match_status: matched_station_id  ← fully eligible

  GooglePlaces diesel (2026-03-31T21:03:13):
    priceNok: 28.18 — NEWER than user_reported diesel above

CurrentStationPrices row confirmed from live query:
    gasoline_95_price:    null   ← NO gasoline data
    gasoline_95_fetchedAt: null
    diesel_price:          28.18
    diesel_fetchedAt:      2026-03-31T21:03:13.203Z

CONFIRMED PARTIAL MATERIALIZATION: diesel block is populated (from later GP fetch).
gasoline_95 block is null despite an eligible user_reported FuelPrice row existing.

The user_reported gasoline_95 (fetchedAt 2026-03-31T09:02:46) was NOT written to CSP.
The later GooglePlaces diesel DID write to CSP successfully (updatedAt = 2026-03-31T21:03:14).

This proves that one fuelType can succeed while another fails on the same CSP row.

──────────────────────────────────────────────────────────────────────────────
AUTOMATION STATE — CRITICAL FINDING
──────────────────────────────────────────────────────────────────────────────

The ORIGINAL automation (id: 69c055888e3da034d8f09129) was ARCHIVED at some point
before 2026-04-01T17:14. A COPY was created on 2026-04-01T17:19 and has run once.

The fresh Uno-X Heimdal FuelPrice rows were CREATED at 2026-04-01T16:13.
The copy automation was created at 2026-04-01T17:19.

This means at the time the fresh FuelPrice rows were created (16:13),
the active automation state is UNKNOWN — it is not confirmed whether
the original automation was still active at 16:13 or had already been archived.

The original automation's last_run_at = 2026-04-01T17:14, which is AFTER 16:13,
but this does not prove it processed the 16:13 rows — it may have processed
other rows or been a manual/test invocation.
*/

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 3 — OBSERVED BEHAVIOR
// ══════════════════════════════════════════════════════════════════════════════
/*
VERIFIED PIPELINE PATH (from repo files):

  Step 1: User submits price (LogPrice.jsx)
          → FuelPrice row created with stationId, fetchedAt, plausibilityStatus

  Step 2: Entity automation fires on FuelPrice create/update
          → Calls materializeCurrentStationPrice function

  Step 3: materializeCurrentStationPrice (verified from function file):
          a. Checks: stationId present, plausibilityStatus = "realistic_price",
             fuelType in {gasoline_95, diesel}
          b. Looks up Station catalog for metadata snapshot
          c. Checks existing CSP row for this stationId
          d. STALENESS GUARD: if incoming fetchedAt <= existing fetchedAt → skipped
          e. If passes guard: updates only the fuel-specific block (not both blocks)
          f. Other fuel block is UNTOUCHED (partial update by design)

  Step 4: NearbyPrices.jsx reads CurrentStationPrices (USE_CSP_PATH = true)
          → adaptCurrentStationPriceRows() converts CSP rows to FuelPrice-shaped
          → runNearbyPipeline() applies eligibility → distance → freshness gates
          → Shows results if fetchedAt within 7 days

KEY DESIGN FINDING — PARTIAL FUEL BLOCK UPDATE:
  The function deliberately writes ONLY the gasoline or ONLY the diesel block,
  leaving the other block unchanged. This is structurally correct behavior, but
  means: if the automation fires for gasoline_95 but fails or is not triggered
  for diesel, the diesel block stays stale. The reverse is also true.

  Case B (Circle K Nardo) proves this: diesel was updated (GP fetch at 21:03),
  gasoline_95 was NOT updated (user_reported at 09:02 never reached CSP).

  The question is whether the automation FIRED for the gasoline_95 FuelPrice row
  but was skipped by a guard, OR whether it never fired at all.

DOES REPO SUPPORT OR CONTRADICT "function does not get through all prices before an older price wins"?
  PARTIALLY SUPPORTS with clarification:
  - The function is event-driven per row (not batch scan), so "not getting through
    all prices" is not literally what happens.
  - What actually happens is: the automation may NOT FIRE at all for certain rows
    (automation_trigger_error), OR it fires and the staleness guard rejects it,
    OR it fires and succeeds but a later event overwrites it.
  - For Uno-X Heimdal: the staleness guard would ALLOW the write (newer fetchedAt),
    so IF the automation fired, it should have succeeded. The fact that CSP was NOT
    updated strongly suggests the automation DID NOT FIRE for those rows.
*/

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 4 — STRUCTURAL RISKS
// ══════════════════════════════════════════════════════════════════════════════
/*
RISK 1 — AUTOMATION TRANSITION GAP (HIGH CONFIDENCE RISK)
  The original automation was archived and replaced with a copy on 2026-04-01.
  There is likely a window during which NO active automation was bound to FuelPrice
  create events. FuelPrice rows created during this window would NOT trigger
  materialization. The Uno-X Heimdal rows (created 16:13) fall very close to this
  transition window.
  The original's last_run_at (17:14) is ambiguous — it may reflect a final run
  triggered by the archival, not processing of the 16:13 rows.

RISK 2 — PARTIAL FUEL BLOCK UPDATES (CONFIRMED STRUCTURAL RISK)
  Confirmed active in Case B (Circle K Nardo). Each FuelPrice row triggers one
  function invocation that updates exactly one fuel block. If one invocation fails
  or is not triggered, the other fuel block remains perpetually stale.
  The two fuel blocks on a CSP row can therefore drift apart over time, showing
  prices from different sources and different dates on the same station row.

RISK 3 — STALE GUARD OVERCORRECTION (LOW RISK FOR PRIMARY CASES)
  The staleness guard (lines 153-155 in function) compares fetchedAt timestamps.
  For Uno-X Heimdal, incoming fetchedAt (2026-04-01) > existing (2026-03-23),
  so the guard would NOT block the write. This risk is not implicated in the
  primary cases. It could theoretically cause issues for rapid back-to-back
  events with identical or near-identical fetchedAt values.

RISK 4 — RACE CONDITION / DUPLICATE CREATION (MINOR)
  The function has self-healing for duplicate CSP rows. This may mask timing
  issues. If two automations were briefly both active during the copy/archive
  transition, concurrent invocations could trigger the healing path unnecessarily.

RISK 5 — 429 RATE LIMITING DURING RETRY (SECONDARY SYMPTOM)
  The function has a retry mechanism (up to 3 attempts, exponential backoff).
  429 errors during station lookup or CSP update would cause the automation to
  fail with an error response. This is a possible cause of the original
  automation's 695 failed_runs (out of 7044 total = ~10% failure rate).
  However, 429 is a secondary symptom, not the primary root cause for the
  specific cases in this audit. The primary cases are most likely explained by
  Risk 1 (automation gap).

RISK 6 — sourceName FIELD OVERWRITE ON MIXED-FUEL-SOURCE ROWS
  When a GooglePlaces diesel price is written after a user_reported gasoline_95,
  the patch includes sourceName = 'GooglePlaces' (row-level, not per-fuel).
  This means the CSP row's sourceName reflects only the LAST source to write,
  potentially misrepresenting the gasoline_95 data's actual source.
  This is a data accuracy issue, not a materialization failure, but relevant
  for downstream confidence assessment.

RISK 7 — FALSE CONFIDENCE FROM MANUALLY UPDATED ROWS
  Circle K Rosten and Circle K Automat Heimdal were confirmed as manually updated.
  These must NOT be used as evidence that the automation pipeline is healthy.
  Their CSP rows appear fresh but bypassed the normal trigger path entirely.
*/

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 5 — CONFIRMED FACTS
// ══════════════════════════════════════════════════════════════════════════════
/*
CONFIRMED from repo files + live data queries:

  CF-1: Uno-X Heimdal (69c1a9edf29b64e5fb6b3df7) has two fresh FuelPrice rows
        (gasoline_95 and diesel, fetchedAt 2026-04-01T16:13:01.667Z, both
        plausibilityStatus=realistic_price, station_match_status=matched_station_id).
        CSP for this station still shows 2026-03-23 prices.
        THIS IS A CONFIRMED MATERIALIZATION FAILURE for both fuel types.

  CF-2: Circle K Nardo (69c1a9edf29b64e5fb6b3ac7) has gasoline_95_price=null in CSP
        despite an eligible user_reported gasoline_95 FuelPrice row existing from
        2026-03-31T09:02:46. Diesel is populated from a later GP fetch.
        THIS IS A CONFIRMED PARTIAL MATERIALIZATION FAILURE (gasoline_95 block only).

  CF-3: The materializeCurrentStationPrice function updates exactly ONE fuel block
        per invocation, leaving the other block unchanged. This is verified from
        function code. Partial materialization is therefore structurally possible
        and confirmed in production data.

  CF-4: The staleness guard (incoming fetchedAt <= existing fetchedAt → skip) is
        NOT the cause of the Uno-X Heimdal failure. The incoming timestamps are
        newer by 9 days and would pass the guard.

  CF-5: The ORIGINAL automation (id: 69c055888e3da034d8f09129) is NOW archived
        and inactive. A COPY (id: 69cd538c4f72a88ad2694cf4) was created
        2026-04-01T17:19 and has run only once. The original had 695 failed runs
        out of 7044 total (~10% failure rate) over its lifetime.

  CF-6: NearbyPrices reads exclusively from CurrentStationPrices (USE_CSP_PATH=true).
        It is correctly showing stale CSP data — it is NOT hiding a fresher valid
        current row. The staleness is in CSP itself, not in the display layer.

  CF-7: The eligibility and freshness logic in NearbyPrices/fuelPriceEligibility
        would NOT block the Uno-X Heimdal rows IF they were in CSP:
        - plausibilityStatus = realistic_price ✓
        - station_match_status = matched_station_id ✓
        - fetchedAt within 7 days ✓
        The display pipeline is NOT the failure layer.
*/

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 6 — UNKNOWNS
// ══════════════════════════════════════════════════════════════════════════════
/*
  U-1: EXACT AUTOMATION STATE AT 16:13 ON 2026-04-01
       It is NOT confirmed whether the original automation (69c055888e3da034d8f09129)
       was still active when the Uno-X Heimdal FuelPrice rows were created at 16:13.
       The original's last_run_at (17:14) does not prove it processed the 16:13 rows.
       This is the single most important unknown for confirming root cause.

  U-2: WHY gasoline_95 WAS MISSED FOR Circle K Nardo
       It is unknown whether the automation fired for the user_reported gasoline_95
       row (created 2026-03-31T09:02:47) and was rejected by a guard, or whether
       the automation did not fire at all. No run logs are available at per-row level.

  U-3: EXACT FAILURE PATTERN IN 695 FAILED RUNS OF ORIGINAL AUTOMATION
       It is unknown how many of these failures were 429-related vs other errors.
       Without per-run logs, it is not possible to determine if specific stations
       were systematically missed due to repeated failures.

  U-4: WHETHER ARCHIVED AUTOMATION STOPS PROCESSING IMMEDIATELY
       The platform behavior when archiving an automation (does it drain queued
       events or drop them?) is not confirmed from repo files.

  U-5: SECONDARY CASES (Esso Express Gråmyra, Circle K Automat Mariero, Esso Hillevåg)
       Not investigated in depth. The same structural risks (U-1, automation gap)
       would apply, but specific FuelPrice and CSP state for these stations
       was not queried. Not confirmed as same failure pattern.
*/

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 7 — RECOMMENDATIONS
// ══════════════════════════════════════════════════════════════════════════════
/*
FEILLAG CLASSIFICATION:
  Primary: automation_trigger_error
  Explanation: The most parsimonious explanation for Uno-X Heimdal is that the
  automation did not fire (or fired but was not processed) for the fresh FuelPrice
  rows due to the automation copy/archive transition. The staleness guard, display
  pipeline, and eligibility logic are all structurally correct and are NOT the
  failure layer for the primary case.

  For Case B (Circle K Nardo gasoline_95): also classified as automation_trigger_error
  (did not fire for user_reported gasoline_95) rather than a staleness guard issue,
  since there was no existing CSP gasoline_95 data that could have blocked it.

SAFE NEXT STEP (one, diagnostic, non-destructive):

  Trigger materializeCurrentStationPrice manually for the two Uno-X Heimdal
  FuelPrice rows (ids: 69cd4412297969cca9edee74 and 69cd4412297969cca9edee75)
  by calling the function directly with each row's data as payload, and observe:
    a) whether the function accepts and processes each row (action = "updated")
    b) whether CSP is then updated with the fresh prices
    c) whether the new COPY automation (69cd538c4f72a88ad2694cf4) fires correctly
       for a new FuelPrice create event going forward

  This test is fully non-destructive (the function is idempotent for fresh data),
  proves whether the function itself is correct, and isolates the question to
  whether the failure was in trigger (automation did not fire) vs function logic.

  DO NOT: implement a batch backfill, change matching thresholds, modify the
  staleness guard, or create new automation variants before confirming this step.
*/

// ══════════════════════════════════════════════════════════════════════════════
// SUMMARY OUTPUT (as requested)
// ══════════════════════════════════════════════════════════════════════════════
/*
A. FILES READ:
   - components/dashboard/NearbyPrices.jsx
   - utils/currentPriceResolver.js
   - utils/currentStationPricesAdapter.js
   - utils/fuelPriceEligibility.js
   - functions/materializeCurrentStationPrice

B. EXPORT / LIVE DATA USED:
   - Live query: FuelPrice for stationId 69c1a9edf29b64e5fb6b3df7 (Uno-X Heimdal)
   - Live query: CurrentStationPrices for stationId 69c1a9edf29b64e5fb6b3df7
   - Live query: FuelPrice for stationId 69c1a9edf29b64e5fb6b3ac7 (Circle K Nardo)
   - Live query: CurrentStationPrices for stationId 69c1a9edf29b64e5fb6b3ac7
   - Automation registry (list_automations)

C. CONFIRMED PRIMARY FAILURE CASES:
   - Uno-X Heimdal: CONFIRMED materialization failure (both fuel types, 9 days stale)
   - Circle K Nardo: CONFIRMED partial materialization failure (gasoline_95 block null)

D. USER HYPOTHESIS ACCURACY:
   PARTIALLY ACCURATE with important clarification.
   The hypothesis that fresh FuelPrice rows are not becoming current is CONFIRMED.
   The hypothesis that this is caused by the function "not getting through all prices"
   is INACCURATE as a literal description — the function is event-driven, not batch.
   The more accurate root cause is: the automation likely DID NOT FIRE for the
   affected rows, most probably due to the automation copy/archive transition event
   that occurred on 2026-04-01. The function code itself appears structurally sound
   for the primary cases.

E. FEILLAG CLASSIFICATION:
   PRIMARY: automation_trigger_error
   SECONDARY (contributing): partial per-fuel-type update design creates permanent
   divergence when any single trigger is missed.

F. ONE SAFE NEXT STEP:
   Manually invoke materializeCurrentStationPrice with the Uno-X Heimdal FuelPrice
   row payloads to confirm the function accepts and writes the data correctly,
   then verify the new copy automation fires correctly on the next FuelPrice create.
*/

export default {};