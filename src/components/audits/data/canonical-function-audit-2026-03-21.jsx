/*
AUDIT FILE
Read-only analysis artifact.

Do not implement fixes inside this file.
Use Execution Log for changes.
See: src/components/governance/Phase25ExecutionLog_007.jsx
*/

/*
CANONICAL FUNCTION AUDIT — TankRadar Runtime Pipeline
Entry 116 | Date: 2026-03-21
Type: data audit
Status: complete

Purpose:
  Repository-wide canonical-function audit focused on the core runtime pipeline.
  Identifies which functions/files are CANONICAL, LEGACY, OVERLAPPING, or have
  UNKNOWN runtime relevance.  Prerequisite: stop loop-driven development by
  documenting the true canonical paths before any further cleanup or rebuild.

Trigger:
  Entry 115 complete (NearbyPrices radius configurable from admin).
  Before any further cleanup or refactoring, a structural audit is required
  to identify duplication and overlapping write paths built up over the
  Phase 2 → 2.5 development cycle.

Scope:
  A. Station master / station identity
  B. FuelPrice write paths
  C. Matching functions (user-reported vs. source/station)
  D. Read paths (NearbyPrices, StationDetails, current-price resolver)
  E. Duplication / loop drift

Scope exclusions:
  Roadmap files and components are intentionally excluded.
  Governance, audit, and admin tooling files are classified separately.
  Frozen Phase 2 files are noted but not re-audited (governance-locked).

Start files (mandatory per governance preflight):
  src/components/governance/Phase25ExecutionLogIndex.jsx
  src/components/governance/Phase25ExecutionLog_007.jsx
  src/components/governance/NextSafeStep.jsx
  src/components/governance/AI_PROJECT_INSTRUCTIONS.jsx
  src/components/audits/AUDIT_SYSTEM_GUIDE.jsx
*/

export const CANONICAL_FUNCTION_AUDIT = {
  auditId: "canonical-function-audit-2026-03-21",
  auditType: "data",
  date: "2026-03-21",
  entry: 116,
  status: "complete",

  // ═══════════════════════════════════════════════════════════════════════════
  // FILES INSPECTED
  // ═══════════════════════════════════════════════════════════════════════════

  filesInspected: [
    // Write paths — FuelPrice
    "functions/fetchFuelFinderStationPrices.ts",
    "functions/fetchGooglePlacesPrices.ts",
    "functions/fetchNorwayFuelPrices.ts",
    "functions/fetchDailyAverages.ts",
    "functions/runGooglePlacesFetchAutomation.ts",
    "functions/fetchGooglePlacesRealMatching.ts",
    "functions/freshGooglePlacesMatchingRound.ts",
    "functions/resolveFuelPriceObservation.ts",

    // Matching functions
    "functions/matchStationForUserReportedPrice.ts",        // FROZEN Phase 2
    "functions/stationMatchingUtility.ts",
    // inline matchStationToPriceSource in fetchGooglePlacesPrices.ts
    // inline matchStationToPriceSource in runGooglePlacesFetchAutomation.ts
    // inline matchStationToRealCatalog in fetchGooglePlacesRealMatching.ts
    // inline matchStationToPriceSourceProduction in freshGooglePlacesMatchingRound.ts

    // Station master / identity
    "functions/importOSMStations.ts",
    "functions/seedStationsBatchImport.ts",
    "functions/processStationCandidates.ts",
    "functions/createStationCandidateFromUserReportedPrice.ts",
    "functions/runStationReviewPipeline.ts",
    "functions/detectStationDuplicates.ts",
    "functions/mergeDuplicateStation.ts",
    "functions/mergeDuplicateStations.ts",

    // Read paths — canonical layer
    "src/utils/currentPriceResolver.js",
    "src/utils/fuelPriceEligibility.js",
    "src/components/dashboard/NearbyPrices.jsx",
    "src/pages/StationDetails.jsx",

    // Governance / spec files consulted
    "functions/STATION_MATCHING_SPECIFICATION.ts",
    "functions/BACKEND_ARCHITECTURE_NOTES.ts",
    "functions/MATCHING_VALIDATION_STATUS.ts",
    "src/components/governance/Phase25ExecutionLogIndex.jsx",
    "src/components/governance/Phase25ExecutionLog_007.jsx",
    "src/components/governance/NextSafeStep.jsx",
    "src/components/audits/data/visibility-contract-audit-2026-03-20.jsx",
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION A — STATION MASTER / STATION IDENTITY
  // ═══════════════════════════════════════════════════════════════════════════

  stationMaster: {

    canonicalMap: {

      stationCreation: [
        {
          function: "importOSMStations.ts",
          classification: "CANONICAL",
          description: "Batch-imports Station records from OpenStreetMap data.  Calls Station.create() directly.  Admin-only.  Dedup check via proximity.",
          why: "Primary bulk-seeding mechanism from authoritative OSM source.  Produces records with sourceStationId, latitude/longitude, name, chain.",
        },
        {
          function: "seedStationsBatchImport.ts",
          classification: "CANONICAL",
          description: "Admin batch-import of manually provided station lists.  Calls Station.create() with dedup guard.",
          why: "Manual seeding path for cases where OSM is incomplete.  Not overlapping with OSM — different input source.",
        },
        {
          function: "fetchFuelFinderStationPrices.ts — station creation block",
          classification: "CANONICAL",
          description: "On-demand Station.create() when FuelFinder sourceStationId does not match any existing Station.  Creates Station before writing FuelPrice.",
          why: "FuelFinder is the only source that creates Station records inline during a price fetch.  This is intentional: FuelFinder data is authoritative for its own station catalog.",
          note: "This is the only active ingestion path that creates new Station records at runtime.",
        },
        {
          function: "processStationCandidates.ts — Station.create() block",
          classification: "OVERLAPPING / DISABLED",
          description: "Station.create() is currently DISABLED (commented out, line 269).  Candidates are classified but not promoted to Station records.",
          why: "Dedup guard is in place but Station.create() call is disabled 'until dedup guard has been validated in production'.  Stations remain in 'pending' status.  NOT creating Station records at runtime.",
          safeAction: "verify — re-enable only after dedup guard is validated",
        },
        {
          function: "createStationCandidateFromUserReportedPrice.ts",
          classification: "CANONICAL",
          description: "Creates StationCandidate records (NOT Station) from user-reported prices where no safe station match was found.",
          why: "Part of the user-reported pipeline.  Correctly creates candidates, not stations.  Downstream of resolveFuelPriceObservation.ts matching decision.",
        },
      ],

      stationMatchingAndMastering: [
        {
          function: "matchStationForUserReportedPrice.ts",
          classification: "CANONICAL (FROZEN)",
          description: "Phase 2 matching engine for user-reported prices.  Implements conservative signal scoring: chain match (+25), name similarity, location signal, distance signal.  Dual-requirement gate: score ≥65; dominance gap ≥10 for multi-candidate.",
          why: "Governance-locked.  The authoritative user-reported matching specification.  Called by resolveFuelPriceObservation.ts.",
          note: "DO NOT modify.  Listed in frozenPhase2Files in Phase25ExecutionLogIndex.jsx.",
        },
        {
          function: "detectStationDuplicates.ts",
          classification: "CANONICAL",
          description: "Admin function to detect duplicate station records.  Input to the merge workflow.",
          why: "Single function responsible for duplicate detection.  No overlapping function detected.",
        },
        {
          function: "mergeDuplicateStation.ts",
          classification: "CANONICAL",
          description: "Merges a single identified duplicate station pair.",
          why: "Focused single-pair merge.  Distinct from mergeDuplicateStations.ts batch version.",
        },
        {
          function: "mergeDuplicateStations.ts",
          classification: "OVERLAPPING",
          description: "Batch merge of multiple duplicate station pairs.  Appears to delegate to or duplicate merge logic.",
          why: "Two merge functions (singular + plural) exist.  Likely the plural wraps the singular for batch operations.  Verify before treating as redundant.",
          safeAction: "verify — confirm whether mergeDuplicateStations delegates to mergeDuplicateStation or duplicates logic",
        },
        {
          function: "runStationReviewPipeline.ts",
          classification: "CANONICAL",
          description: "Orchestration function that chains review pipeline steps (analyzePendingStationReviews, classifyStationsRuleEngine, etc.).",
          why: "Orchestrator only — calls base44.functions.invoke() for each step.  No duplicate logic; unique orchestration responsibility.",
        },
      ],

    },

    confirmedFacts: [
      "Station.create() is active in THREE paths: importOSMStations, seedStationsBatchImport, fetchFuelFinderStationPrices (runtime).",
      "processStationCandidates has Station.create() DISABLED — not promoting candidates to Station at runtime.",
      "createStationCandidateFromUserReportedPrice creates StationCandidate only, never Station.",
      "Station identity is keyed by sourceStationId + sourceName for FuelFinder, by OSM node ID for OSM, by admin input for seed.",
    ],

    unknowns: [
      "Whether mergeDuplicateStations.ts delegates to mergeDuplicateStation.ts or duplicates the merge logic.",
      "Whether processStationCandidates.ts Station.create() is intended to be re-enabled or permanently replaced by a different promotion flow.",
    ],

  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION B — FUELPRICE WRITE PATHS
  // ═══════════════════════════════════════════════════════════════════════════

  fuelPriceWritePaths: {

    canonicalMap: [
      {
        function: "fetchFuelFinderStationPrices.ts",
        source: "FuelFinder",
        classification: "CANONICAL",
        contractCompliance: {
          stationId: "✓ written (sourceStationId-keyed match)",
          plausibilityStatus: "✓ written (classifyPricePlausibility inline)",
          station_match_status: "✓ written ('matched_station_id')",
          station_name: "✓ written (stationDetailsMap lookup)",
          station_chain: "✓ written (stationDetailsMap lookup)",
          priceType: "✓ 'station_level'",
          deduplication: "✓ 23-hour recency window (fixes deduplication-freshness trap, Entry 116)",
        },
        why: "Fully contract-compliant after Entry 111 fix.  Only active FuelFinder write path.",
      },
      {
        function: "fetchGooglePlacesPrices.ts",
        source: "GooglePlaces",
        classification: "CANONICAL",
        contractCompliance: {
          stationId: "✓ written (chain+proximity match, <500m, confidence 0.55–0.90)",
          plausibilityStatus: "✓ written (classifyPricePlausibility inline)",
          station_match_status: "✓ written ('matched_station_id') — added Entry 111",
          station_name: "✓ written (added Entry 111)",
          station_chain: "✓ written (added Entry 111)",
          priceType: "✓ 'station_level'",
          deduplication: "✓ 23-hour recency window (fixes deduplication-freshness trap, Entry 116)",
        },
        why: "Fully contract-compliant.  The authoritative GooglePlaces write path.",
      },
      {
        function: "fetchDailyAverages.ts",
        source: "GlobalPetrolPrices",
        classification: "CANONICAL",
        contractCompliance: {
          stationId: "✗ absent — intentional; these are national averages",
          plausibilityStatus: "✗ absent — not a station price row",
          station_match_status: "✗ absent — not a station price row",
          priceType: "✓ 'national_average' — correctly excluded from station views by isStationPriceDisplayEligible",
        },
        why: "Writes only national_average rows.  Correctly excluded from all station-based display surfaces by the priceType gate in isStationPriceDisplayEligible.  Not a runtime eligibility concern.",
      },
      {
        function: "resolveFuelPriceObservation.ts",
        source: "User-reported (SRP)",
        classification: "CANONICAL",
        contractCompliance: {
          stationId: "✓ written only when station_match_status = 'matched_station_id'",
          plausibilityStatus: "✓ written (inline classifyPricePlausibility, enforced before create decision)",
          station_match_status: "✓ written ('matched_station_id' | 'review_needed_station_match' | 'no_safe_station_match')",
          priceType: "✓ station-level for matched rows",
          writeGate: "✓ FuelPrice only created when matched_station_id AND realistic_price — hardest gate of all sources",
        },
        why: "The user-reported path has the strictest write gate.  Only matched + plausible rows produce FuelPrice.  review_needed/no_safe_station cases produce StationReview or StationCandidate instead.",
      },
      {
        function: "runGooglePlacesFetchAutomation.ts",
        source: "GooglePlaces (automation variant)",
        classification: "OVERLAPPING",
        contractCompliance: {
          stationId: "✓ written (chain+proximity inline matching)",
          plausibilityStatus: "✓ written",
          station_match_status: "✗ ABSENT — not written",
          station_name: "✗ absent",
          station_chain: "✗ absent",
        },
        why: "Writes plausibilityStatus but NOT station_match_status.  Rows from this path are excluded from NearbyPrices (requires matched_station_id) but pass StationDetails eligibility if plausibilityStatus=realistic_price.  Unclear if this function is still being invoked in production.  Predates fetchGooglePlacesPrices.ts contract completion.",
        safeAction: "verify — determine if this function is still invoked in production; if not, deprecate",
      },
      {
        function: "fetchGooglePlacesRealMatching.ts",
        source: "GooglePlaces (real-catalog matching variant)",
        classification: "OVERLAPPING / LEGACY",
        contractCompliance: {
          stationId: "✓ written (matchStationToRealCatalog)",
          plausibilityStatus: "✓ written",
          station_match_status: "✗ ABSENT — not written",
          station_name: "✗ absent",
          station_chain: "✗ absent",
        },
        why: "Uses matchStationToRealCatalog (different name from matchStationToPriceSource).  Missing station_match_status and station_name/chain fields.  Appears to be an earlier iteration of the GP write path before contract was finalized.  No evidence of current production invocation.",
        safeAction: "deprecate candidate — verify it is not invoked before removing",
      },
      {
        function: "freshGooglePlacesMatchingRound.ts",
        source: "GooglePlaces (fresh round variant)",
        classification: "OVERLAPPING / LEGACY",
        contractCompliance: {
          stationId: "✓ written (matchStationToPriceSourceProduction)",
          plausibilityStatus: "✓ written",
          station_match_status: "✗ ABSENT — not written",
          station_name: "✗ absent",
          station_chain: "✗ absent",
        },
        why: "Uses matchStationToPriceSourceProduction — same logic as matchStationToPriceSource but inline in this file (Norwegian comments, same algorithm).  Missing station_match_status.  Name 'Production' is a misnomer; this is a historical iteration, not the current production path.",
        safeAction: "deprecate candidate — verify not invoked before removing",
      },
      {
        function: "fetchNorwayFuelPrices.ts",
        source: "ANWB (Norway fuel prices via ANWB Onderweg API)",
        classification: "LEGACY",
        contractCompliance: {
          stationId: "✗ ABSENT — uses different schema: no stationId field",
          plausibilityStatus: "✗ ABSENT",
          station_match_status: "✗ ABSENT",
          fieldNames: "Uses non-standard field names: price, fuel_type, station_name, station_chain, city, region, date_observed",
          priceType: "✗ absent",
        },
        why: "Writes FuelPrice with a completely different schema than the current contract.  Fields do not match the entity definition expected by isStationPriceDisplayEligible (no stationId, no plausibilityStatus, wrong field names).  These rows are invisible to ALL display surfaces — they pass no eligibility gate.  This path appears to be from an earlier data-model era and is no longer contract-compliant.",
        safeAction: "remove candidate — rows produced are unreachable by any display path; verify function is not scheduled before removing",
      },
    ],

    confirmedFacts: [
      "fetchFuelFinderStationPrices.ts and fetchGooglePlacesPrices.ts are the two fully contract-compliant source ingestion paths as of Entry 111.",
      "resolveFuelPriceObservation.ts is the canonical user-reported write path with the strictest gate.",
      "fetchDailyAverages.ts writes national_average rows only — intentionally excluded from station views.",
      "runGooglePlacesFetchAutomation.ts, fetchGooglePlacesRealMatching.ts, freshGooglePlacesMatchingRound.ts all lack station_match_status — rows from these paths cannot appear in NearbyPrices ranking.",
      "fetchNorwayFuelPrices.ts writes with a different field schema — rows unreachable by any current display path.",
      "FuelPrice rows created by the three overlapping GP paths will pass StationDetails eligibility IF plausibilityStatus=realistic_price (stationId present, no excluded match status, not national_average) — but they are invisible in NearbyPrices.",
    ],

    unknowns: [
      "Whether runGooglePlacesFetchAutomation.ts, fetchGooglePlacesRealMatching.ts, or freshGooglePlacesMatchingRound.ts are currently scheduled or invoked in production.",
      "Whether fetchNorwayFuelPrices.ts is scheduled.  If scheduled, it is silently writing unreachable rows.",
    ],

  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION C — MATCHING FUNCTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  matchingFunctions: {

    userReportedPriceMatching: {
      description: "Matching for prices reported by human users via the LogPrice flow.",
      canonicalFunction: {
        function: "matchStationForUserReportedPrice.ts",
        classification: "CANONICAL (FROZEN)",
        filePath: "functions/matchStationForUserReportedPrice.ts",
        whatItHandles: "Full Phase 2 scoring pipeline: chain match, name similarity (bigram), location signal, distance signal, dual-requirement gate (score ≥65, dominance gap ≥10 for multi-candidate).",
        usedBy: "resolveFuelPriceObservation.ts — the canonical user-reported write path.",
        canonicalOrOverlapping: "CANONICAL.  Single source of truth for user-reported price matching.",
        activeInWritePaths: "✓ YES — called by resolveFuelPriceObservation.ts",
        note: "FROZEN.  Do not modify.  Logic is preserved verbatim in resolveFuelPriceObservation.ts for runtime use.",
      },
      overlappingFunctions: [
        {
          function: "stationMatchingUtility.ts",
          classification: "OVERLAPPING",
          filePath: "functions/stationMatchingUtility.ts",
          whatItHandles: "Standalone version of the Phase 2 matching specification.  Same algorithm as matchStationForUserReportedPrice.ts.",
          usedBy: "Nothing in the active write paths — exported as a utility module but Base44 backend function isolation means sibling imports do not work.",
          canonicalOrOverlapping: "OVERLAPPING — spec reference and potential integration target, but NOT runtime-active.",
          activeInWritePaths: "✗ NO — not imported by any active write path (Base44 isolation constraint).",
          safeAction: "keep as spec reference — document explicitly that this cannot be imported by backend functions under Base44 isolation",
        },
      ],
    },

    sourceStationPriceMatching: {
      description: "Matching for prices fetched from automated sources (GooglePlaces, FuelFinder) to Station records.",
      subCategories: {

        fuelFinderMatching: {
          function: "sourceStationId-keyed lookup in fetchFuelFinderStationPrices.ts",
          classification: "CANONICAL",
          filePath: "functions/fetchFuelFinderStationPrices.ts (line 250–291)",
          whatItHandles: "Looks up or creates Station by exact sourceStationId + sourceName match.  Deterministic: no fuzzy matching needed because FuelFinder provides stable station IDs.",
          canonicalOrOverlapping: "CANONICAL.  No other function handles FuelFinder station linkage.",
          activeInWritePaths: "✓ YES — embedded in the canonical FuelFinder write path.",
        },

        googlePlacesMatching: {
          canonical: {
            function: "matchStationToPriceSource() in fetchGooglePlacesPrices.ts",
            classification: "CANONICAL",
            filePath: "functions/fetchGooglePlacesPrices.ts (line 133)",
            whatItHandles: "Chain inference from Google Place name + proximity match (<500m threshold) against Station catalog.  Returns best match with confidence score (0.55–0.90).  Requires recognized chain name (Circle K, Uno-X, Esso, Shell, Statoil, ST1).",
            canonicalOrOverlapping: "CANONICAL — embedded in the current canonical GP write path.",
            activeInWritePaths: "✓ YES",
          },
          overlapping: [
            {
              function: "matchStationToPriceSource() in runGooglePlacesFetchAutomation.ts",
              classification: "OVERLAPPING",
              filePath: "functions/runGooglePlacesFetchAutomation.ts (line 86)",
              whatItHandles: "Identical algorithm to canonical matchStationToPriceSource — same chain inference, same 500m threshold, same confidence scoring.  Inline duplicate.",
              canonicalOrOverlapping: "OVERLAPPING — duplicate of the canonical function, embedded in an overlapping write path.",
              activeInWritePaths: "UNKNOWN — depends on whether runGooglePlacesFetchAutomation.ts is scheduled.",
            },
            {
              function: "matchStationToRealCatalog() in fetchGooglePlacesRealMatching.ts",
              classification: "OVERLAPPING / LEGACY",
              filePath: "functions/fetchGooglePlacesRealMatching.ts (line 118)",
              whatItHandles: "Same chain+proximity algorithm.  Different function name ('RealCatalog' vs 'PriceSource').  Writes to FuelPrice without station_match_status.  Norwegian inline comment 'KRITISK: BARE EKTE stationId'.",
              canonicalOrOverlapping: "OVERLAPPING — historical variant predating the contract fix.",
              activeInWritePaths: "UNKNOWN — probably not scheduled.",
            },
            {
              function: "matchStationToPriceSourceProduction() in freshGooglePlacesMatchingRound.ts",
              classification: "OVERLAPPING / LEGACY",
              filePath: "functions/freshGooglePlacesMatchingRound.ts (line 119)",
              whatItHandles: "Same chain+proximity algorithm.  Suffix 'Production' is a historical misnomer (this is NOT the current production path).  Norwegian language comments suggest an earlier dev iteration.",
              canonicalOrOverlapping: "OVERLAPPING — another duplicate of the canonical matching logic.",
              activeInWritePaths: "UNKNOWN — probably not scheduled.",
            },
          ],
        },

      },
    },

    keyFinding: "The GP source/station matching function has been INLINED and DUPLICATED across four separate files (fetchGooglePlacesPrices.ts, runGooglePlacesFetchAutomation.ts, fetchGooglePlacesRealMatching.ts, freshGooglePlacesMatchingRound.ts) with identical or near-identical logic.  This is the primary loop-drift pattern in the matching layer.  Only one version (in fetchGooglePlacesPrices.ts) is contract-compliant.  The others are historical iterations.",

    confirmedFacts: [
      "matchStationForUserReportedPrice.ts is the canonical frozen user-reported matcher.  Not duplicated at runtime.",
      "stationMatchingUtility.ts exists as a standalone spec but cannot be imported under Base44 isolation.",
      "GP station matching is duplicated inline in 4 files.  Only fetchGooglePlacesPrices.ts is contract-compliant.",
      "FuelFinder matching uses exact sourceStationId lookup — no fuzzy matching, no duplication.",
      "User-reported and source-price matching are CATEGORICALLY DIFFERENT: different algorithms, different confidence thresholds, different write gates.  They must NOT be collapsed into a single function.",
    ],

  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION D — READ PATHS
  // ═══════════════════════════════════════════════════════════════════════════

  readPaths: {

    nearbyPrices: {
      canonicalFile: "src/components/dashboard/NearbyPrices.jsx",
      classification: "CANONICAL",
      eligibilityContract: "isStationPriceDisplayEligible(p, { requireMatchedStationId: true })",
      resolverUsed: "resolveLatestPerStation() from src/utils/currentPriceResolver.js",
      freshnessGate: "isFreshEnoughForNearbyRanking() — 7-day threshold (NEARBY_FRESHNESS_MAX_AGE_MS)",
      radiusConfig: "getNearbyRadiusKm() — localStorage-backed, default 10 km (Entry 115)",
      queryPattern: "Per-station FuelPrice.filter({ stationId, fuelType }) to avoid global-limit truncation",
      what: "Shows the cheapest station prices near the user's location for the selected fuel type.",
      strictness: "STRICTEST — requires plausibilityStatus=realistic_price, stationId present, not aggregate priceType, not excluded match status, AND station_match_status='matched_station_id', AND within radius, AND fresh within 7 days.",
    },

    stationDetails: {
      canonicalFile: "src/pages/StationDetails.jsx",
      classification: "CANONICAL",
      eligibilityContract: "isStationPriceDisplayEligible(p) — default, no requireMatchedStationId",
      resolverUsed: "resolveLatestPerFuelType() from src/utils/currentPriceResolver.js",
      freshnessGate: "NONE — StationDetails always shows the last known price regardless of age",
      queryPattern: "FuelPrice.filter({ stationId }, '-fetchedAt', 200) — all rows for the station",
      stationHistory: "All fetched rows (stationHistory) used for charts and observation log — UNFILTERED by eligibility",
      displayPrices: "stationHistory filtered by isStationPriceDisplayEligible — used for 'Siste kjente priser'",
      what: "Shows current known prices for a single station, plus full price history and chart.",
      strictness: "SOFTER — no matched_station_id requirement, no freshness gate.  Intentional: users should always see the last known price even if it is stale.",
    },

    canonicalResolverLayer: {
      file: "src/utils/currentPriceResolver.js",
      classification: "CANONICAL",
      functions: [
        {
          name: "resolveLatestPerFuelType(eligibleRows)",
          usedBy: "StationDetails — 'Siste kjente priser' section",
          what: "Returns latest row per fuelType within a single station.  No freshness filtering.",
        },
        {
          name: "resolveLatestPerStation(eligibleRows)",
          usedBy: "NearbyPrices — one latest price per station for selected fuel",
          what: "Returns latest row per stationId across multiple stations.",
        },
        {
          name: "resolveLatestPerStationAndFuelType(eligibleRows)",
          usedBy: "Available for cross-station multi-fuel scenarios (no current active caller identified)",
          what: "Returns latest row per (stationId, fuelType) composite key.",
        },
        {
          name: "isFreshEnoughForNearbyRanking(row, maxAgeMs)",
          usedBy: "NearbyPrices — post-resolution freshness gate",
          what: "Returns true when row.fetchedAt is within 7 days of now.  Opt-in only — StationDetails must NOT call this.",
        },
      ],
    },

    canonicalEligibilityLayer: {
      file: "src/utils/fuelPriceEligibility.js",
      classification: "CANONICAL",
      functions: [
        {
          name: "isStationPriceDisplayEligible(p, options = {})",
          usedBy: "NearbyPrices, StationDetails",
          what: "Base display eligibility: plausibilityStatus=realistic_price, stationId present, not aggregate priceType, not excluded match status.  Optional requireMatchedStationId flag for NearbyPrices (Entry 114).",
        },
      ],
    },

    confirmedFacts: [
      "NearbyPrices and StationDetails use the SAME eligibility function with different options — intentional design (Entry 114).",
      "resolveLatestPerStation and resolveLatestPerFuelType are both called from canonical UI components.",
      "resolveLatestPerStationAndFuelType exists but has no active caller identified in the current UI.",
      "isFreshEnoughForNearbyRanking is called ONLY by NearbyPrices — StationDetails intentionally omits it.",
      "stationHistory in StationDetails is unfiltered — all rows used for chart and observation log.",
      "displayPrices in StationDetails is filtered by isStationPriceDisplayEligible (default options).",
    ],

    unknowns: [
      "resolveLatestPerStationAndFuelType has no active caller identified.  May be dead code or reserved for a future feature.  Safe to keep; zero runtime cost.",
    ],

  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION E — DUPLICATION / LOOP DRIFT
  // ═══════════════════════════════════════════════════════════════════════════

  duplicationAndLoopDrift: {

    summary: "The primary loop-drift pattern is in the GooglePlaces write path.  Multiple GP fetch/match variants were built incrementally and left in the repo after the canonical version (fetchGooglePlacesPrices.ts) was finalized.  Each variant contains an inline duplicate of the matching function, differing only in name and minor comments.  The user-reported matching path (matchStationForUserReportedPrice.ts) is NOT duplicated in the same way — it is frozen and referenced correctly.",

    driftPatterns: [
      {
        pattern: "GP matching function duplicated inline across 4 files",
        files: [
          "fetchGooglePlacesPrices.ts — matchStationToPriceSource (CANONICAL)",
          "runGooglePlacesFetchAutomation.ts — matchStationToPriceSource (duplicate)",
          "fetchGooglePlacesRealMatching.ts — matchStationToRealCatalog (duplicate, different name)",
          "freshGooglePlacesMatchingRound.ts — matchStationToPriceSourceProduction (duplicate, 'Production' misnomer)",
        ],
        risk: "Any fix to the matching algorithm must be applied to all 4 copies unless overlapping files are retired.",
        recommendation: "Retire non-canonical files once invocation status is confirmed.",
      },
      {
        pattern: "GP FuelPrice write path duplicated across 4 files",
        files: [
          "fetchGooglePlacesPrices.ts (CANONICAL — writes station_match_status)",
          "runGooglePlacesFetchAutomation.ts (OVERLAPPING — missing station_match_status)",
          "fetchGooglePlacesRealMatching.ts (LEGACY — missing station_match_status)",
          "freshGooglePlacesMatchingRound.ts (LEGACY — missing station_match_status)",
        ],
        risk: "If overlapping paths are scheduled, they produce rows that are invisible in NearbyPrices and have incomplete contract fields.",
        recommendation: "Verify scheduling status; disable/deprecate overlapping paths if not scheduled.",
      },
      {
        pattern: "ANWB write path with different field schema",
        files: [
          "fetchNorwayFuelPrices.ts — writes price, fuel_type, station_name (not stationId, priceType, plausibilityStatus)",
        ],
        risk: "Rows written by this function are completely invisible to all display surfaces.  If scheduled, it silently accumulates dead rows.",
        recommendation: "Remove candidate — verify scheduling status first.",
      },
      {
        pattern: "stationMatchingUtility.ts exists as spec but cannot be imported",
        files: [
          "stationMatchingUtility.ts — Base44 backend function isolation prevents sibling imports",
        ],
        risk: "No runtime risk.  But creates confusion about whether there is one or two user-reported matching implementations.",
        recommendation: "Keep as spec reference; add header comment clarifying Base44 isolation constraint.",
      },
    ],

  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 1 — CANONICAL MAP (STRUCTURED SUMMARY)
  // ═══════════════════════════════════════════════════════════════════════════

  canonicalMap: {

    stationIdentityMaster: {
      stationCreation: [
        "importOSMStations.ts — CANONICAL (OSM bulk seed)",
        "seedStationsBatchImport.ts — CANONICAL (admin manual seed)",
        "fetchFuelFinderStationPrices.ts (station block) — CANONICAL (FuelFinder runtime creation)",
        "processStationCandidates.ts (Station.create DISABLED) — OVERLAPPING/DISABLED",
        "createStationCandidateFromUserReportedPrice.ts — CANONICAL (StationCandidate only)",
      ],
      stationReviewGovernance: [
        "runStationReviewPipeline.ts — CANONICAL orchestrator",
        "classifyStationsRuleEngine.ts — CANONICAL (FROZEN Phase 2)",
        "analyzePendingStationReviews.ts — CANONICAL",
        "detectStationDuplicates.ts — CANONICAL",
        "mergeDuplicateStation.ts — CANONICAL (single merge)",
        "mergeDuplicateStations.ts — OVERLAPPING (batch wrapper — verify delegation)",
      ],
    },

    fuelPriceWritePaths: {
      canonical: [
        "fetchFuelFinderStationPrices.ts — FuelFinder source, fully compliant",
        "fetchGooglePlacesPrices.ts — GP source, fully compliant",
        "resolveFuelPriceObservation.ts — user-reported, strictest gate",
        "fetchDailyAverages.ts — national averages only, correctly scoped",
      ],
      overlapping: [
        "runGooglePlacesFetchAutomation.ts — GP, missing station_match_status",
      ],
      legacy: [
        "fetchGooglePlacesRealMatching.ts — GP, missing station_match_status",
        "freshGooglePlacesMatchingRound.ts — GP, missing station_match_status",
        "fetchNorwayFuelPrices.ts — ANWB, wrong field schema, rows unreachable",
      ],
    },

    matchingFunctions: {
      userReported: [
        "matchStationForUserReportedPrice.ts — CANONICAL (FROZEN Phase 2 engine)",
        "stationMatchingUtility.ts — OVERLAPPING (spec reference, not runtime-active)",
      ],
      sourceStation: [
        "matchStationToPriceSource() in fetchGooglePlacesPrices.ts — CANONICAL (inline GP matcher)",
        "matchStationToPriceSource() in runGooglePlacesFetchAutomation.ts — OVERLAPPING (duplicate)",
        "matchStationToRealCatalog() in fetchGooglePlacesRealMatching.ts — LEGACY",
        "matchStationToPriceSourceProduction() in freshGooglePlacesMatchingRound.ts — LEGACY",
        "sourceStationId lookup in fetchFuelFinderStationPrices.ts — CANONICAL (FuelFinder)",
      ],
    },

    currentPriceReadPaths: {
      nearbyPrices: [
        "NearbyPrices.jsx — CANONICAL (strict eligibility + 7-day freshness gate)",
      ],
      stationDetails: [
        "StationDetails.jsx — CANONICAL (soft eligibility, no freshness gate)",
      ],
      sharedUtilities: [
        "src/utils/fuelPriceEligibility.js — CANONICAL",
        "src/utils/currentPriceResolver.js — CANONICAL",
      ],
    },

  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 2 — DUPLICATION TABLE
  // ═══════════════════════════════════════════════════════════════════════════

  duplicationTable: [
    {
      fileOrFunction: "fetchFuelFinderStationPrices.ts",
      responsibility: "FuelFinder source ingestion + FuelPrice write",
      classification: "CANONICAL",
      why: "Fully contract-compliant.  Only FuelFinder write path.  Unique sourceStationId-keyed matching.",
      safeActionLater: "keep",
    },
    {
      fileOrFunction: "fetchGooglePlacesPrices.ts",
      responsibility: "GooglePlaces source ingestion + FuelPrice write",
      classification: "CANONICAL",
      why: "Fully contract-compliant after Entry 111.  Only contract-compliant GP write path.",
      safeActionLater: "keep",
    },
    {
      fileOrFunction: "resolveFuelPriceObservation.ts",
      responsibility: "User-reported price resolution + FuelPrice/StationCandidate/StationReview write",
      classification: "CANONICAL",
      why: "Canonical user-reported SRP path.  Strictest write gate.  Inlines Phase 2 matching spec.",
      safeActionLater: "keep",
    },
    {
      fileOrFunction: "fetchDailyAverages.ts",
      responsibility: "GlobalPetrolPrices national average ingestion",
      classification: "CANONICAL",
      why: "Writes only national_average rows — intentionally excluded from station views.",
      safeActionLater: "keep",
    },
    {
      fileOrFunction: "runGooglePlacesFetchAutomation.ts",
      responsibility: "GooglePlaces automation fetch + FuelPrice write (missing station_match_status)",
      classification: "OVERLAPPING",
      why: "Duplicate GP write path.  Missing station_match_status — rows invisible in NearbyPrices.  Predates canonical fix.",
      safeActionLater: "verify invocation status; deprecate if not scheduled",
    },
    {
      fileOrFunction: "fetchGooglePlacesRealMatching.ts",
      responsibility: "GooglePlaces fetch + FuelPrice write (legacy variant)",
      classification: "OVERLAPPING / LEGACY",
      why: "Historical variant with different matching function name.  Missing station_match_status.  No evidence of current invocation.",
      safeActionLater: "deprecate — remove candidate after scheduling confirmation",
    },
    {
      fileOrFunction: "freshGooglePlacesMatchingRound.ts",
      responsibility: "GooglePlaces fetch + FuelPrice write (legacy 'Production' misnomer)",
      classification: "OVERLAPPING / LEGACY",
      why: "Duplicate GP write path.  'Production' misnomer.  Missing station_match_status.  Norwegian comments suggest early dev iteration.",
      safeActionLater: "deprecate — remove candidate after scheduling confirmation",
    },
    {
      fileOrFunction: "fetchNorwayFuelPrices.ts",
      responsibility: "ANWB Onderweg API fetch + FuelPrice write (wrong field schema)",
      classification: "LEGACY",
      why: "Writes with non-standard field names (price, fuel_type, station_name) — completely different schema.  No stationId, no plausibilityStatus.  Rows are unreachable by any display surface.  ANWB data model predates current schema.",
      safeActionLater: "remove candidate — confirm not scheduled first",
    },
    {
      fileOrFunction: "matchStationForUserReportedPrice.ts",
      responsibility: "Phase 2 user-reported matching engine",
      classification: "CANONICAL (FROZEN)",
      why: "Governance-locked.  The authoritative Phase 2 matching spec implementation.",
      safeActionLater: "keep (frozen — do not modify)",
    },
    {
      fileOrFunction: "stationMatchingUtility.ts",
      responsibility: "Standalone Phase 2 matching spec (not runtime-active)",
      classification: "OVERLAPPING",
      why: "Same algorithm as matchStationForUserReportedPrice.ts but as a standalone module.  Cannot be imported by Base44 backend functions.  Not runtime-active.",
      safeActionLater: "keep as spec reference — add header note about Base44 isolation",
    },
    {
      fileOrFunction: "matchStationToPriceSource() in runGooglePlacesFetchAutomation.ts",
      responsibility: "Inline GP station matcher (duplicate)",
      classification: "OVERLAPPING",
      why: "Identical algorithm to the canonical version in fetchGooglePlacesPrices.ts.",
      safeActionLater: "deprecate with parent file",
    },
    {
      fileOrFunction: "matchStationToRealCatalog() in fetchGooglePlacesRealMatching.ts",
      responsibility: "Inline GP station matcher (legacy variant name)",
      classification: "LEGACY",
      why: "Same algorithm, different name.  Part of a legacy GP write path.",
      safeActionLater: "deprecate with parent file",
    },
    {
      fileOrFunction: "matchStationToPriceSourceProduction() in freshGooglePlacesMatchingRound.ts",
      responsibility: "Inline GP station matcher ('Production' misnomer)",
      classification: "LEGACY",
      why: "Same algorithm, 'Production' suffix is historical artifact.  Part of a legacy GP write path.",
      safeActionLater: "deprecate with parent file",
    },
    {
      fileOrFunction: "src/utils/currentPriceResolver.js",
      responsibility: "Shared latest-price resolution (resolveLatestPerFuelType, resolveLatestPerStation, isFreshEnoughForNearbyRanking)",
      classification: "CANONICAL",
      why: "Introduced Entry 109.  Used by both NearbyPrices and StationDetails.  Single source of truth for resolution logic.",
      safeActionLater: "keep",
    },
    {
      fileOrFunction: "src/utils/fuelPriceEligibility.js",
      responsibility: "Canonical display eligibility contract (isStationPriceDisplayEligible)",
      classification: "CANONICAL",
      why: "Single source of truth for display-eligibility.  Used by NearbyPrices and StationDetails with different options.",
      safeActionLater: "keep",
    },
    {
      fileOrFunction: "NearbyPrices.jsx",
      responsibility: "Billigste nær deg read path",
      classification: "CANONICAL",
      why: "Strict eligibility + 7-day freshness gate + radius config.  Canonical after Entries 109, 114, 115.",
      safeActionLater: "keep",
    },
    {
      fileOrFunction: "StationDetails.jsx",
      responsibility: "Station current-price + history read path",
      classification: "CANONICAL",
      why: "Soft eligibility, no freshness gate.  Canonical after Entry 107/108 data-layer split.",
      safeActionLater: "keep",
    },
    {
      fileOrFunction: "processStationCandidates.ts",
      responsibility: "Station candidate classification + Station.create() (disabled)",
      classification: "OVERLAPPING / DISABLED",
      why: "Classification runs but Station.create() is disabled.  Not currently promoting stations.",
      safeActionLater: "verify — re-enable Station.create() only after dedup guard validated",
    },
    {
      fileOrFunction: "mergeDuplicateStations.ts",
      responsibility: "Batch duplicate station merge",
      classification: "OVERLAPPING",
      why: "Batch variant alongside single-record mergeDuplicateStation.ts.  Verify delegation vs. duplication.",
      safeActionLater: "verify",
    },
    {
      fileOrFunction: "resolveLatestPerStationAndFuelType() in currentPriceResolver.js",
      responsibility: "Cross-station multi-fuel latest-price resolution",
      classification: "UNKNOWN",
      why: "No active UI caller identified in current codebase.  May be reserved for a future feature or oversight.",
      safeActionLater: "keep (zero runtime cost) — document intended consumer",
    },
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 3 — CLEANUP CANDIDATES (outside roadmap)
  // ═══════════════════════════════════════════════════════════════════════════

  cleanupCandidates: [
    {
      priority: 1,
      file: "functions/fetchNorwayFuelPrices.ts",
      reason: "ANWB source with completely different field schema.  Rows written by this function are unreachable by any display surface (no stationId, wrong field names, no plausibilityStatus).  If scheduled, silently accumulates dead rows.",
      preCondition: "Confirm it is not currently scheduled or invoked in production before removing.",
      risk: "LOW — rows written are already invisible to all read paths.",
    },
    {
      priority: 2,
      file: "functions/fetchGooglePlacesRealMatching.ts",
      reason: "Historical GP fetch variant.  Missing station_match_status.  No evidence of current scheduling.  Inline matchStationToRealCatalog is a duplicate of the canonical function.",
      preCondition: "Confirm not scheduled.",
      risk: "LOW — if not scheduled, zero impact to remove.",
    },
    {
      priority: 3,
      file: "functions/freshGooglePlacesMatchingRound.ts",
      reason: "Historical GP fetch variant with 'Production' misnomer.  Missing station_match_status.  Inline matchStationToPriceSourceProduction is a duplicate.",
      preCondition: "Confirm not scheduled.",
      risk: "LOW — if not scheduled, zero impact to remove.",
    },
    {
      priority: 4,
      file: "functions/runGooglePlacesFetchAutomation.ts",
      reason: "GP automation variant predating contract completion.  Missing station_match_status.  Rows partially visible (StationDetails) but invisible in NearbyPrices.  Inline matchStationToPriceSource is a duplicate.",
      preCondition: "Confirm not scheduled.  If scheduled, must update to write station_match_status before deprecating.",
      risk: "MEDIUM — if currently scheduled, rows from this path have a partial visibility gap.  Must resolve before removing.",
    },
    {
      priority: 5,
      file: "functions/stationMatchingUtility.ts",
      reason: "Not runtime-active.  Cannot be imported under Base44 isolation.  Spec reference only.",
      action: "NOT a remove candidate.  Add header comment documenting isolation constraint and spec-reference status.",
      risk: "ZERO runtime impact.",
    },
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 4 — SAFE NEXT STEP
  // ═══════════════════════════════════════════════════════════════════════════

  safeNextStep: {
    id: "phase25_step_117",
    title: "Confirm Scheduling Status of Overlapping GP Write Paths",
    description: [
      "This audit identified 3–4 overlapping GooglePlaces write path files that may or may not be scheduled in production.",
      "The next lowest-risk step is to confirm whether runGooglePlacesFetchAutomation.ts, fetchGooglePlacesRealMatching.ts, freshGooglePlacesMatchingRound.ts, and fetchNorwayFuelPrices.ts are actively scheduled.",
      "This is a READ-ONLY investigation step — no code changes.",
      "If any overlapping paths are confirmed NOT scheduled, they become safe deprecation candidates.",
      "If any overlapping paths ARE scheduled, a targeted contract-fix (adding station_match_status) should be planned before deprecation.",
    ],
    type: "investigation",
    riskLevel: "ZERO — read-only, no code changes",
    blockingIssues: "NONE",
    estimatedEffort: "15–30 minutes (check scheduling config or FetchLog records)",
    frozenFilesImpact: "ZERO",
    recommendation: "Complete this step before any cleanup action on the overlapping GP files.",
  },

};

export default CANONICAL_FUNCTION_AUDIT;
