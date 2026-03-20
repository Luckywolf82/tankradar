/*
AUDIT FILE
Read-only analysis artifact.

Do not implement fixes inside this file.
Use Execution Log for changes.
See: src/components/governance/Phase25ExecutionLog_007.jsx
*/

/*
VISIBILITY CONTRACT AUDIT — TankRadar
Entry 105 | Date: 2026-03-20
Type: data audit
Status: complete

Purpose:
  Contract-forensics pass to determine whether "display-ready fuel price
  visibility" is owned by the upstream ingestion/matching/curation pipeline
  or by UI-layer components (NearbyPrices, StationDetails).

  Identifies whether the current runtime violates the intended visibility
  contract defined in governance and specification files.

Trigger:
  Observation that NearbyPrices and StationDetails both read FuelPrice but
  apply different effective filtering rules — raising the question of whether
  any UI-layer filtering should be required at all.

Start files:
  src/components/dashboard/NearbyPrices.jsx
  src/pages/StationDetails.jsx
*/

export const VISIBILITY_CONTRACT_AUDIT = {
  auditId: "visibility-contract-audit-2026-03-20",
  auditType: "data",
  date: "2026-03-20",
  entry: 105,
  status: "complete",

  filesInspected: [
    // UI layer
    "src/components/dashboard/NearbyPrices.jsx",
    "src/pages/StationDetails.jsx",
    "src/components/dashboard/RecentPricesFeed.jsx",
    "src/components/dashboard/LiveMarketStats.jsx",
    "src/components/dashboard/SmartFillIndicator.jsx",
    "src/components/dashboard/RegionalStats.jsx",
    "src/components/dashboard/ObservedMarketStatistics.jsx",
    "src/components/dashboard/PriceDistribution.jsx",
    "src/components/dashboard/PriceChangeIndicator.jsx",

    // Upstream ingestion pipeline
    "functions/fetchGooglePlacesPrices.ts",
    "functions/fetchFuelFinderStationPrices.ts",
    "functions/fetchNorwayFuelPrices.ts",

    // Classification & matching pipeline
    "functions/classifyPricePlausibility.ts",         // FROZEN
    "functions/matchStationForUserReportedPrice.ts",  // FROZEN
    "functions/resolveFuelPriceObservation.ts",

    // Contract & specification files
    "functions/STATION_MATCHING_SPECIFICATION.ts",
    "functions/USER_REPORTED_CONFIDENCE_POLICY.ts",
    "functions/BACKEND_ARCHITECTURE_NOTES.ts",
    "functions/auditFuelPriceContractCompliance.ts",
    "functions/verifyDashboardFiltering.ts",
    "src/components/governance/BASE44_PROJECT_INSTRUCTIONS.jsx",
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 1 — INTENDED VISIBILITY CONTRACT
  // ═══════════════════════════════════════════════════════════════════════════

  intendedVisibilityContract: {

    whatFuelPriceIsIntendedToBe: "mixed-purpose immutable observation log — NOT a pre-curated display-ready store",

    evidenceFromSpecFiles: [
      {
        file: "functions/STATION_MATCHING_SPECIFICATION.ts",
        quote: "SOURCE-SPECIFIC: GooglePlaces: matched → FuelPrice; review_needed → StationCandidate. User_Reported: matched → FuelPrice; review_needed → StationCandidate.",
        implication: "Specification intended only matched_station_id outcomes to write to FuelPrice. All review_needed and no_safe_station_match cases should not produce FuelPrice rows.",
      },
      {
        file: "functions/STATION_MATCHING_SPECIFICATION.ts",
        quote: "MATCHED_STATION_ID (Score ≥ 65): High confidence; proceed directly to FuelPrice creation",
        implication: "Only the high-confidence matched outcome should produce a FuelPrice row.",
      },
      {
        file: "functions/USER_REPORTED_CONFIDENCE_POLICY.ts",
        section: "2c. PENDING / MANUAL REVIEW DATASET",
        quote: "NOT in any public statistics. NOT in user-facing price displays.",
        appliesTo: "review_needed_station_match + no_safe_station_match",
        implication: "Policy explicitly states these states should not appear in public UI.",
      },
      {
        file: "functions/USER_REPORTED_CONFIDENCE_POLICY.ts",
        section: "2a. VERIFIED STATION STATISTICS",
        quote: "station_match_status = matched_station_id AND stationId is populated AND confidenceScore >= 0.80",
        implication: "The intended display set for station-verified stats is narrowly defined. Policy is PROPOSED status — not yet enforced.",
      },
      {
        file: "functions/auditFuelPriceContractCompliance.ts",
        quote: "station_match_status null = write-gate violation (hard)",
        implication: "The contract compliance auditor treats a missing station_match_status as the most severe violation class (INVALID_WRITE_GATE_VIOLATION). This confirms that every FuelPrice row is SUPPOSED to carry a declared pipeline outcome.",
      },
      {
        file: "functions/resolveFuelPriceObservation.ts",
        field: "displayableInNearbyPrices",
        value: "wouldCreateFuelPrice && stationId != null",
        meaning: "wouldCreateFuelPrice = (station_match_status === 'matched_station_id' AND plausibilityStatus === 'realistic_price')",
        implication: "The SRP preview engine explicitly calculates a displayableInNearbyPrices flag. This is the intended contract: only matched + realistic rows are display-ready. But this flag is ONLY returned in the preview response — it is NOT stored on the FuelPrice entity.",
      },
    ],

    intendedOwnerOfDisplayReadiness: "upstream pipeline (SRP + plausibility classifier)",

    intendedRuleForDisplayReady:
      "station_match_status === 'matched_station_id' AND plausibilityStatus === 'realistic_price' AND stationId IS NOT NULL",

    intendedShouldUIRefilter: false,

    rationale:
      "The specification, confidence policy, and contract compliance auditor all converge on the same intended contract: " +
      "only FuelPrice rows with a declared matched_station_id outcome and realistic plausibility are intended for public display. " +
      "The SRP preview engine even computes this flag explicitly as 'displayableInNearbyPrices'. " +
      "The intended design is that upstream writes only display-ready rows to FuelPrice (for display surfaces), " +
      "making UI-layer filtering redundant by design.",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 2 — UPSTREAM ENFORCEMENT POINTS
  // ═══════════════════════════════════════════════════════════════════════════

  upstreamEnforcementPoints: [

    {
      location: "upstream",
      file: "functions/classifyPricePlausibility.ts",
      function: "classifyPricePlausibility(priceNok)",
      condition: "priceNok < 10 → 'suspect_price_low'; priceNok > 40 → 'suspect_price_high'; 10–40 → 'realistic_price'",
      role: "CLASSIFICATION ONLY — does NOT prevent suspect records from being written",
      note: "FROZEN file. Classifies but does not gate writes. Threshold: 10–40 NOK/L.",
    },

    {
      location: "upstream",
      file: "functions/resolveFuelPriceObservation.ts",
      function: "classifyPlausibility(fuelType, priceNok)",
      condition: "Per-fuel-type thresholds: diesel 13.0–25.5, gasoline_95 14.0–26.5, other 5.0–40.0",
      role: "CLASSIFICATION ONLY — returns 'realistic_price' or 'suspect_*'. Used in SRP preview.",
      note: "Different thresholds from frozen classifyPricePlausibility. Fuel-type-specific. Upper bound 25.5 (diesel) vs 40 (frozen file).",
    },

    {
      location: "upstream",
      file: "functions/fetchGooglePlacesPrices.ts",
      function: "classifyPricePlausibility(priceNok) [local copy]",
      condition: "priceNok < 10 → 'suspect_price_low'; priceNok > 30 → 'suspect_price_high'; 10–30 → 'realistic_price'",
      role: "WRITES ALL prices including suspects — plausibilityStatus is stored as a label only",
      writeGate: "NONE — suspect prices are written with their status, not blocked",
      note: "Upper threshold is 30 NOK/L (different from frozen file which uses 40). Writes station_match_status = ABSENT (not set).",
    },

    {
      location: "upstream",
      file: "functions/fetchFuelFinderStationPrices.ts",
      function: "FuelPrice.create",
      condition: "No plausibility check. No station_match_status set.",
      role: "WRITES all prices with stationId but NO plausibilityStatus and NO station_match_status",
      writeGate: "NONE",
      note: "Hardest upstream write-gate violation. FuelFinder rows have neither classification field.",
    },

    {
      location: "upstream",
      file: "functions/matchStationForUserReportedPrice.ts",
      function: "matchDecision → outcome routing",
      condition: "MATCHED_STATION_ID → stationId populated, review_needed → stationId null, no_safe_match → stationId null",
      role: "For user_reported flow: only writes FuelPrice when outcome is matched_station_id + realistic_price",
      writeGate: "PARTIAL — user_reported pipeline enforces gate; stationId populated only on match",
      note: "This is the only upstream path that consistently enforces the intended contract. FROZEN file.",
    },

    {
      location: "upstream",
      file: "functions/checkPriceDropAlerts.ts",
      function: "plausibilityStatus check before alert trigger",
      condition: "if (plausibilityStatus && plausibilityStatus !== 'realistic_price') → skip",
      role: "Alert system re-checks plausibility on FuelPrice create event. Prevents suspect rows triggering alerts.",
      note: "Even the alert system defensively re-filters. Confirms upstream does not guarantee realistic-only writes.",
    },
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 3 — UI-LAYER ENFORCEMENT POINTS
  // ═══════════════════════════════════════════════════════════════════════════

  uiLayerEnforcementPoints: [

    {
      component: "NearbyPrices",
      file: "src/components/dashboard/NearbyPrices.jsx",
      lines: "127–134",
      conditions: [
        "p.plausibilityStatus !== 'realistic_price' → EXCLUDE",
        "p.station_match_status === 'no_safe_station_match' → EXCLUDE",
        "!p.stationId → EXCLUDE",
        "p.priceType === 'national_average' || p.priceType === 'regional_average' → EXCLUDE",
        "!station.latitude || !station.longitude → EXCLUDE",
      ],
      note: "Does NOT exclude 'review_needed_station_match'. Excludes only 'no_safe_station_match'. Also re-checks stationId and coordinates.",
    },

    {
      component: "StationDetails",
      file: "src/pages/StationDetails.jsx",
      lines: "61",
      conditions: [
        "p.plausibilityStatus === 'realistic_price' → KEEP (inline filter in useState setter)",
      ],
      note: "ONLY checks plausibilityStatus. Does NOT check station_match_status at all. Does NOT check priceType. Does NOT check stationId. Significantly less strict than NearbyPrices.",
    },

    {
      component: "RecentPricesFeed",
      file: "src/components/dashboard/RecentPricesFeed.jsx",
      lines: "58, 83–85",
      conditions: [
        "API-level filter: plausibilityStatus === 'realistic_price'",
        "p.priceType === 'national_average' || 'regional_average' → EXCLUDE",
        "p.station_match_status === 'no_safe_station_match' → EXCLUDE",
        "p.station_match_status === 'review_needed_station_match' → EXCLUDE",
      ],
      note: "Most complete UI filter. Excludes BOTH 'no_safe_station_match' AND 'review_needed_station_match'. Pushes plausibility filter to API query parameter.",
    },

    {
      component: "LiveMarketStats",
      file: "src/components/dashboard/LiveMarketStats.jsx",
      lines: "23–26",
      conditions: [
        "p.plausibilityStatus === 'realistic_price' → KEEP",
        "p.sourceName !== 'user_reported' (implicit — only processes non-user data)",
      ],
      note: "Only plausibility. No station_match_status check.",
    },

    {
      component: "SmartFillIndicator",
      file: "src/components/dashboard/SmartFillIndicator.jsx",
      lines: "26–29",
      conditions: [
        "p.plausibilityStatus === 'realistic_price' → KEEP",
        "p.sourceName === 'GooglePlaces'",
      ],
      note: "Source-restricted to GooglePlaces. No station_match_status check.",
    },

    {
      component: "RegionalStats",
      file: "src/components/dashboard/RegionalStats.jsx",
      lines: "42–45",
      conditions: [
        "p.plausibilityStatus === 'realistic_price' → KEEP",
        "p.priceType !== 'national_average' → KEEP",
      ],
      note: "No station_match_status check.",
    },

    {
      component: "ObservedMarketStatistics",
      file: "src/components/dashboard/ObservedMarketStatistics.jsx",
      lines: "13–20",
      conditions: [
        "p.plausibilityStatus === 'realistic_price' → KEEP (then further stratifies by match status)",
        "Explicitly buckets matched / review_needed / no_safe into separate display groups",
      ],
      note: "The only component designed around the intended three-state model. Shows all states with separate labels per USER_REPORTED_CONFIDENCE_POLICY design intent.",
    },

    {
      component: "checkPriceDropAlerts (backend)",
      file: "functions/checkPriceDropAlerts.ts",
      lines: "22–23, 34",
      conditions: [
        "plausibilityStatus !== 'realistic_price' → skip (alert trigger gate)",
        "previousPrices filtered: p.plausibilityStatus === 'realistic_price'",
      ],
      note: "Backend alert automation re-checks plausibility. Shows the defensive pattern extends beyond UI.",
    },
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 4 — REDUNDANT VS REQUIRED UI CHECKS
  // ═══════════════════════════════════════════════════════════════════════════

  redundantVsRequiredChecks: {

    required: [
      {
        check: "plausibilityStatus === 'realistic_price'",
        requiredBecause: "fetchGooglePlacesPrices and fetchFuelFinderStationPrices both write FuelPrice rows regardless of plausibility. Suspect rows exist in the database. UI filter is NECESSARY to exclude them.",
        appliedBy: ["NearbyPrices", "StationDetails", "RecentPricesFeed", "LiveMarketStats", "SmartFillIndicator", "RegionalStats"],
      },
      {
        check: "priceType !== 'national_average' && !== 'regional_average'",
        requiredBecause: "National/regional average prices are stored in FuelPrice with no stationId. Without this filter they would appear in station-specific views.",
        appliedBy: ["NearbyPrices", "RecentPricesFeed", "RegionalStats"],
        missingIn: ["StationDetails — but irrelevant because StationDetails queries by stationId, so national_average rows (no stationId) won't appear anyway"],
      },
      {
        check: "stationId is NOT NULL",
        requiredBecause: "Some FuelPrice rows (review_needed, no_safe_station_match) have null stationId. Without this check, a NearbyPrices row cannot be mapped to a station for distance calculation.",
        appliedBy: ["NearbyPrices — explicit check"],
        implicitlyEnforcedBy: ["StationDetails — queries BY stationId, so null-stationId rows are excluded at query level"],
      },
      {
        check: "station has valid lat/lon",
        requiredBecause: "Stations may exist in catalog without coordinates. A FuelPrice could reference such a station. NearbyPrices needs coordinates to compute distance.",
        appliedBy: ["NearbyPrices"],
        notAppliedBy: ["StationDetails — not relevant; shows all prices for the station regardless of coordinates"],
      },
    ],

    redundantOrInconsistent: [
      {
        check: "station_match_status === 'no_safe_station_match' → EXCLUDE",
        status: "PARTIALLY REDUNDANT, PARTIALLY REQUIRED",
        reason:
          "If upstream correctly enforced the matching spec (never write FuelPrice for no_safe outcomes), " +
          "this check would never trigger. But since GooglePlaces and FuelFinder bypass station_match_status, " +
          "FuelPrice rows may have stationId but null station_match_status. " +
          "NearbyPrices checks for 'no_safe_station_match' explicitly but CANNOT catch null station_match_status rows. " +
          "The check is therefore required for defense against user_reported bypass patterns, " +
          "but provides false confidence for GooglePlaces/FuelFinder rows.",
        appliedBy: ["NearbyPrices", "RecentPricesFeed"],
        notAppliedBy: ["StationDetails — missing entirely"],
      },
      {
        check: "station_match_status === 'review_needed_station_match' → EXCLUDE",
        status: "REQUIRED BY POLICY but inconsistently applied",
        reason:
          "USER_REPORTED_CONFIDENCE_POLICY (proposed) explicitly excludes review_needed from public display. " +
          "RecentPricesFeed excludes both no_safe AND review_needed. " +
          "NearbyPrices excludes ONLY no_safe — silently includes review_needed rows. " +
          "StationDetails excludes NEITHER.",
        appliedBy: ["RecentPricesFeed"],
        notAppliedBy: ["NearbyPrices — INCONSISTENCY", "StationDetails — INCONSISTENCY"],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 5 — FIRST PROVEN CONTRACT BREACH
  // ═══════════════════════════════════════════════════════════════════════════

  firstProvenContractBreach: {
    location: "functions/fetchGooglePlacesPrices.ts — FuelPrice.create call (lines 376–390)",

    description:
      "fetchGooglePlacesPrices writes FuelPrice rows with stationId populated but WITHOUT station_match_status. " +
      "This is the exact pattern that auditFuelPriceContractCompliance.ts classifies as STATIONID_SET_WITHOUT_DECLARED_OUTCOME — " +
      "a hard INVALID_WRITE_GATE_VIOLATION. The pipeline's own audit tool defines this as the primary breach.",

    provenBy: [
      {
        evidence: "fetchGooglePlacesPrices.ts line 376–390: FuelPrice.create does NOT include station_match_status field",
        implication: "All GooglePlaces FuelPrice rows arrive with stationId but no station_match_status",
      },
      {
        evidence: "auditFuelPriceContractCompliance.ts lines 48–50: 'Detect bypass pattern: stationId set but no declared outcome'",
        implication: "The project's own contract auditor defines this pattern as a write-gate violation",
      },
      {
        evidence: "STATION_MATCHING_SPECIFICATION.ts: 'GooglePlaces: matched → FuelPrice' implies station_match_status should be set",
        implication: "The specification intended every FuelPrice to carry its declared pipeline outcome",
      },
    ],

    consequence:
      "Because GooglePlaces rows lack station_match_status, UI components cannot rely on station_match_status " +
      "filtering to enforce the contract. They must fall back to plausibilityStatus and stationId presence checks. " +
      "But plausibilityStatus ALONE is insufficient — it does not distinguish matched vs unmatched rows.",

    secondaryBreaches: [
      {
        location: "functions/fetchFuelFinderStationPrices.ts",
        breach: "Writes FuelPrice without station_match_status AND without plausibilityStatus",
        severity: "SEVERE — FuelFinder rows are invisible to all UI plausibility filters",
      },
      {
        location: "Divergent plausibility classifiers",
        breach:
          "classifyPricePlausibility.ts (frozen): threshold 10–40 NOK/L. " +
          "fetchGooglePlacesPrices.ts (local copy): threshold 10–30 NOK/L. " +
          "resolveFuelPriceObservation.ts (SRP preview): per-fuel-type thresholds (diesel max 25.5 NOK/L). " +
          "A price of 32 NOK/L would be realistic_price per frozen file but suspect_price_high per GooglePlaces local.",
        severity: "MEDIUM — Classification divergence means plausibilityStatus values are not consistently meaningful",
      },
      {
        location: "NearbyPrices vs StationDetails — station_match_status inconsistency",
        breach:
          "NearbyPrices excludes station_match_status === 'no_safe_station_match' but NOT 'review_needed_station_match'. " +
          "StationDetails excludes NEITHER. " +
          "RecentPricesFeed excludes BOTH. " +
          "Three components reading the same entity apply three different effective rules.",
        severity: "MEDIUM — Inconsistent data shown across surfaces",
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 6 — VERIFIED FACTS (from code only)
  // ═══════════════════════════════════════════════════════════════════════════

  verifiedFacts: [
    "fetchGooglePlacesPrices.ts writes FuelPrice WITHOUT station_match_status (confirmed: field not present in create payload)",
    "fetchFuelFinderStationPrices.ts writes FuelPrice WITHOUT station_match_status AND WITHOUT plausibilityStatus (confirmed: neither field in create payload)",
    "matchStationForUserReportedPrice.ts (FROZEN) writes FuelPrice ONLY when outcome === MATCHED_STATION_ID (confirmed: conditional write gate in function)",
    "classifyPricePlausibility.ts (FROZEN) uses threshold 10–40 NOK/L for all fuel types",
    "fetchGooglePlacesPrices.ts local classifier uses threshold 10–30 NOK/L (different upper bound from frozen file)",
    "resolveFuelPriceObservation.ts uses per-fuel-type thresholds (diesel: 13.0–25.5, gasoline_95: 14.0–26.5)",
    "resolveFuelPriceObservation.ts computes 'displayableInNearbyPrices' flag but stores it ONLY in preview response — not in FuelPrice entity",
    "auditFuelPriceContractCompliance.ts explicitly classifies 'stationId set without station_match_status' as INVALID_WRITE_GATE_VIOLATION",
    "NearbyPrices checks: plausibilityStatus, station_match_status (no_safe only), stationId, priceType, station coordinates",
    "StationDetails checks: plausibilityStatus ONLY (via inline filter on fetched prices)",
    "RecentPricesFeed checks: plausibilityStatus (at query level), priceType, station_match_status (both no_safe AND review_needed)",
    "checkPriceDropAlerts.ts (backend) re-checks plausibilityStatus === 'realistic_price' before triggering alerts",
    "USER_REPORTED_CONFIDENCE_POLICY.ts status is PROPOSED — not yet enforced in any write path",
    "StationDetails queries FuelPrice BY stationId — effectively excludes null-stationId rows at query level",
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 7 — UNKNOWNS
  // ═══════════════════════════════════════════════════════════════════════════

  unknowns: [
    "Actual distribution of station_match_status values in production FuelPrice table — cannot be determined without runtime data",
    "Whether FuelFinder rows in production actually have plausibilityStatus = null or some default value applied by Base44 schema",
    "Whether any FuelPrice rows with station_match_status === 'review_needed_station_match' or 'no_safe_station_match' currently exist from user_reported flow",
    "Whether fetchNorwayFuelPrices.ts is actively writing to FuelPrice (it uses different field names — price, fuel_type, station_name — which may target a different entity or legacy schema version)",
    "Whether USER_REPORTED_CONFIDENCE_POLICY.ts was ever approved or implemented (status: PROPOSED, no implementation evidence found)",
    "Whether the 'displayableInNearbyPrices' field from resolveFuelPriceObservation.ts was ever considered for persistent storage on FuelPrice",
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 8 — INFERENCES
  // ═══════════════════════════════════════════════════════════════════════════

  inferences: [
    {
      inference: "FuelPrice is effectively a mixed raw + curated log",
      basis: "GooglePlaces and FuelFinder adapters write without full contract compliance. User_reported adapter does write with compliance. The entity therefore contains both pipeline-compliant and pipeline-bypassing rows.",
      confidence: "HIGH",
    },
    {
      inference: "UI filters are compensating for upstream write-gate gaps, not redundant",
      basis: "Because suspect prices are written upstream, the UI plausibilityStatus filter catches what upstream should have blocked. Without UI filters, suspect prices would appear in all display surfaces.",
      confidence: "HIGH",
    },
    {
      inference: "The intended contract (SRP owns display-readiness) was partially implemented but never completed",
      basis: "The SRP preview engine (resolveFuelPriceObservation) computes displayableInNearbyPrices correctly. The user_reported pipeline enforces the gate. But GooglePlaces and FuelFinder adapters were never updated to declare station_match_status outcomes.",
      confidence: "HIGH",
    },
    {
      inference: "NearbyPrices is the most safety-conscious display component; StationDetails is the least",
      basis: "NearbyPrices applies 5 independent checks. StationDetails applies only 1. This is consistent with NearbyPrices being a public discovery surface (higher stakes) while StationDetails is a detail view already navigated to via a known stationId.",
      confidence: "MEDIUM",
    },
    {
      inference: "review_needed rows likely rarely reach display surfaces in practice for GooglePlaces source",
      basis: "GooglePlaces adapter only writes rows where a station match was confirmed (station.id is available). review_needed rows from user_reported flow would have stationId === null and therefore be excluded by NearbyPrices' explicit stationId check and by StationDetails' query-by-stationId.",
      confidence: "MEDIUM",
    },
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 9 — SINGLE BEST CONCLUSION
  // ═══════════════════════════════════════════════════════════════════════════

  conclusion: {
    answer: "C — Mixed/unclear, because the repo shows contract inconsistency",

    summary:
      "The intended contract clearly designates the upstream pipeline (SRP + classifiers) as the owner of " +
      "display-readiness. The specification, confidence policy, and contract auditor all agree: only " +
      "matched_station_id + realistic_price rows should be written to FuelPrice for display surfaces, " +
      "making UI filtering redundant by design. " +
      "However, the actual runtime does NOT enforce this contract upstream. " +
      "fetchGooglePlacesPrices and fetchFuelFinderStationPrices bypass the station_match_status write-gate entirely. " +
      "The result is a mixed-state entity: some rows are SRP-compliant (user_reported via matchStationForUserReportedPrice), " +
      "others are non-compliant (GooglePlaces, FuelFinder). " +
      "UI-layer filtering is therefore currently REQUIRED, not redundant — but only because upstream has not " +
      "completed the intended pipeline contract. " +
      "The three display components (NearbyPrices, StationDetails, RecentPricesFeed) also apply this filtering " +
      "inconsistently, creating surfaces where different rows are visible or hidden depending on which component " +
      "renders them.",

    whoOwnsDisplayVisibility: "split — upstream owns INTENT; UI layer owns REALITY",

    correctOwner: "upstream pipeline (SRP)",

    whatMustChangeForCorrectOwner:
      "All upstream write paths (fetchGooglePlacesPrices, fetchFuelFinderStationPrices) must: " +
      "(1) populate station_match_status on every FuelPrice write, and " +
      "(2) gate writes on plausibilityStatus === 'realistic_price' OR store plausibilityStatus and let a " +
      "persistent displayable flag on FuelPrice resolve the eligibility question at read time. " +
      "Once upstream guarantees display-readiness on the row itself, UI filters become redundant and can be removed.",

    riskIfNotFixed:
      "Inconsistent display behavior across surfaces. Suspect prices potentially visible in StationDetails " +
      "(which only checks plausibilityStatus but depends on upstream having set it). " +
      "review_needed rows may appear in NearbyPrices (not excluded by that component). " +
      "New display surfaces will have no reliable pattern to copy — each will re-invent its own filter set, " +
      "leading to further divergence.",
  },
};

export default VISIBILITY_CONTRACT_AUDIT;
