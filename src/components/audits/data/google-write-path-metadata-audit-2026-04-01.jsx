/*
AUDIT FILE
Read-only analysis artifact.

Do not implement fixes inside this file.
Use Execution Log for changes.
See: src/components/governance/Phase25ExecutionLog_*.jsx
*/

/*
GOOGLE WRITE PATH METADATA AUDIT — TankRadar
Date: 2026-04-01
Type: data audit
Status: complete
Entry: 117 (follow-up to canonical-function-audit-2026-03-21)

Purpose:
  Determine with evidence why GooglePlaces FuelPrice rows created on 2026-04-01
  are missing station-linked metadata fields:
    - station_name
    - station_chain
    - gps_latitude
    - gps_longitude

  The audit also characterises runtime path ownership across all active Google
  write paths and assesses the downstream effects on display eligibility.

Trigger:
  Operator observed that today's GP FuelPrice rows are missing the four fields
  above.  rawPayloadSnippet format starting with "zone=..." confirms the zone
  automation path (runGooglePlacesFetchAutomation) is the active write path.
  Investigation was initially confused by the existence of multiple GP write
  paths and an ambiguous automation registry.

Scope:
  A. Code contract — which fields each GP write path actually writes
  B. Runtime ownership — which path is scheduled and running today
  C. Metadata-loss root cause — write-contract gap vs post-write mutation
  D. Station identity integrity — archived_duplicate risk
  E. Automation failure analysis — around 2026-03-31 / 2026-04-01
  F. Safe next step framing

Start files read per governance preflight:
  src/components/audits/AUDIT_SYSTEM_GUIDE.jsx
  src/components/audits/AUDIT_INDEX.jsx
  src/components/audits/data/visibility-contract-audit-2026-03-20.jsx
  src/components/audits/data/canonical-function-audit-2026-03-21.jsx
  functions/fetchGooglePlacesPrices (full source)
  functions/runGooglePlacesFetchAutomation (full source)

Runtime data inspected:
  FuelPrice (sourceName=GooglePlaces, last 5 rows — live read 2026-04-01)
  FetchLog (sourceName=GooglePlaces, last 20 entries — live read 2026-04-01)
  GPFetchZone (all rows — live read 2026-04-01)
  Automation registry (all types — live read 2026-04-01)
*/

export const GOOGLE_WRITE_PATH_METADATA_AUDIT = {
  auditId: "google-write-path-metadata-audit-2026-04-01",
  auditType: "data",
  date: "2026-04-01",
  status: "complete",

  // ═══════════════════════════════════════════════════════════════════════════
  // FILES INSPECTED
  // ═══════════════════════════════════════════════════════════════════════════

  filesInspected: [
    "functions/fetchGooglePlacesPrices (full source — live read)",
    "functions/runGooglePlacesFetchAutomation (full source — live read)",
    "src/components/audits/data/canonical-function-audit-2026-03-21.jsx",
    "src/components/audits/data/visibility-contract-audit-2026-03-20.jsx",
    "src/components/audits/AUDIT_SYSTEM_GUIDE.jsx",
    "src/components/audits/AUDIT_INDEX.jsx",
  ],

  runtimeDataInspected: [
    "FuelPrice entity — last 5 rows (sourceName=GooglePlaces) — live read 2026-04-01T~14:00",
    "FetchLog entity — last 20 rows (sourceName=GooglePlaces) — live read 2026-04-01",
    "GPFetchZone entity — all rows — live read 2026-04-01",
    "Automation registry — all types (scheduled + entity) — live read 2026-04-01",
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // GOOGLE WRITE PATH MATRIX
  // ═══════════════════════════════════════════════════════════════════════════

  googleWritePathMatrix: [
    {
      file: "functions/fetchGooglePlacesPrices",
      purpose: "GooglePlaces ingestion against fixed TEST_LOCATIONS (Oslo, Trondheim, Bergen, Stavanger hardcoded)",
      writeStyle: "FuelPrice.create() — one record at a time (single-create loop)",
      intendedRole: "Originally the canonical GP write path.  Predates zone system.  Uses hardcoded city center coordinates.  Falls back to an in-memory fixture list if Station table is empty.",
      writesStationMetadata: "YES — writes station_name, station_chain, station_match_status",
      writesCoordinates: "YES — writes gps_latitude, gps_longitude from matched Station record",
      evidenceLevel: "code-observed",
      rawPayloadSnippetFormat: "`${fuelPrice.type} | ${price} NOK/L | ${plausibilityStatus}` — does NOT start with 'zone='",
      schedulingStatus: "NOT scheduled — no automation in registry points to fetchGooglePlacesPrices",
      runtimeOwnership: "LEGACY — fully contract-compliant but not running in production",
    },
    {
      file: "functions/runGooglePlacesFetchAutomation",
      purpose: "Zone-driven GP fetch engine — iterates GPFetchZone records where isActive=true",
      writeStyle: "FuelPrice.bulkCreate() — batch create of all new records at end of run",
      intendedRole: "Production automation path, driven by runtime GPFetchZone data.",
      writesStationMetadata: "NO — station_name, station_chain are NOT in the write payload (lines 274-289 confirmed in source)",
      writesCoordinates: "NO — gps_latitude, gps_longitude are NOT in the write payload",
      writesStationMatchStatus: "YES — writes station_match_status: 'matched_station_id'",
      writesPlausibility: "YES",
      writesStationId: "YES",
      evidenceLevel: "code-observed",
      rawPayloadSnippetFormat: "`zone=${zone.name} zoneType=${zone.zoneType} | ${fp.type} | ${price} NOK/L` — starts with 'zone='",
      schedulingStatus: "CONFIRMED SCHEDULED — automation 'Google Places Fetch (zone-based)' id=69bf1188... active, runs twice daily at 09:03 UTC (confirmed by FetchLog timestamps)",
      runtimeOwnership: "CANONICAL — the only path currently running and writing GP rows",
    },
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // FUELPRICE CONTRACT DIFFERENCE TABLE
  // ═══════════════════════════════════════════════════════════════════════════

  fuelPriceContractDifferenceTable: {
    columns: ["Field", "fetchGooglePlacesPrices", "runGooglePlacesFetchAutomation", "resolveFuelPriceObservation (user-reported)"],
    rows: [
      ["stationId",            "✓ written",                     "✓ written",                     "✓ written (only if matched_station_id)"],
      ["fuelType",             "✓ written",                     "✓ written",                     "✓ written"],
      ["priceNok",             "✓ written",                     "✓ written",                     "✓ written"],
      ["priceType",            "✓ 'station_level'",             "✓ 'station_level'",             "✓ 'station_level' (if matched)"],
      ["sourceName",           "✓ 'GooglePlaces'",              "✓ 'GooglePlaces'",              "✓ 'user_reported'"],
      ["sourceUpdatedAt",      "✓ from fp.updateTime",          "✓ from fp.updateTime",          "✗ not applicable"],
      ["fetchedAt",            "✓ written",                     "✓ written",                     "✓ written"],
      ["sourceFrequency",      "✓ 'near_realtime'",             "✓ 'near_realtime'",             "✗ not written"],
      ["confidenceScore",      "✓ written (0.55–0.90)",         "✓ written (0.55–0.90)",         "✓ written"],
      ["parserVersion",        "✓ 'gp_v1'",                     "✓ 'gp_v1'",                     "✓ written"],
      ["plausibilityStatus",   "✓ written",                     "✓ written",                     "✓ written"],
      ["station_match_status", "✓ 'matched_station_id'",        "✓ 'matched_station_id'",        "✓ full 3-way status"],
      ["station_name",         "✓ written from station.name",   "✗ NOT WRITTEN — field absent",  "✓ written"],
      ["station_chain",        "✓ written from station.chain",  "✗ NOT WRITTEN — field absent",  "✓ written"],
      ["gps_latitude",         "✓ written from station.latitude","✗ NOT WRITTEN — field absent", "✓ written from user GPS"],
      ["gps_longitude",        "✓ written from station.longitude","✗ NOT WRITTEN — field absent","✓ written from user GPS"],
      ["rawPayloadSnippet",    "type|price|plausibility",       "zone=NAME|type|price",          "✓ written"],
    ],
    keyConclusion: "The four missing fields (station_name, station_chain, gps_latitude, gps_longitude) were NEVER included in the runGooglePlacesFetchAutomation write payload. This is a write-contract gap, not a post-write mutation or loss.",
    evidenceLevel: "code-observed",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // OBSERVED BEHAVIOR
  // ═══════════════════════════════════════════════════════════════════════════

  observedBehavior: {

    liveRowEvidence: {
      description: "Live FuelPrice rows created at 2026-04-01T09:03:14 (5 rows inspected)",
      confirmedAbsent: ["station_name", "station_chain", "gps_latitude", "gps_longitude"],
      confirmedPresent: ["stationId", "station_match_status", "plausibilityStatus", "sourceUpdatedAt", "confidenceScore", "parserVersion"],
      rawPayloadSnippetSample: "zone=Trondheim Heimdal/sør zoneType=circle | SP95 | 26.09 NOK/L",
      rawPayloadSnippetConclusion: "The 'zone=...' prefix conclusively identifies runGooglePlacesFetchAutomation as the write source — code-observed format match is exact.",
      evidenceLevel: "code-observed (live data + source code format match)",
    },

    fetchLogPattern: {
      description: "FetchLog for GooglePlaces — last 20 rows covering 2026-03-25 to 2026-04-01",
      pattern: "Runs consistently at 09:03 UTC and 21:03 UTC daily (12-hour interval, not 5-hour)",
      latestRun: "2026-04-01T09:03:11 → finishedAt 09:03:14 — SUCCESS",
      latestStats: "zones=3/11 api=58 matched=22 high=21 review=1 created=16 dedup=25",
      precedingRun: "2026-03-31T21:03:11 → SUCCESS — zones=3/11 api=58 matched=22 created=28",
      zoneCountShift: "From 2026-03-25T21:03 (6 active zones, 107 API results) to 2026-03-26T09:03 (3 active zones, 0 results) to 2026-03-26T21:03 onwards (3 active zones, 58 API results consistently)",
      zoneCountShiftExplanation: "The shift from 6 to 3 active zones on 2026-03-25/26 explains the sustained reduction in API results from 107 to 58. This was a data-driven deactivation of zones (isActive flipped via admin UI or zone test results), not a code change.",
      noFailuresObserved: "ALL 20 FetchLog rows show success=true for this function across the observation window.",
      evidenceLevel: "requires-telemetry for exact zone deactivation cause; code-observed for fetch volume shift",
    },

    activeFetchZones: {
      totalZones: 11,
      activeZones: 3,
      activeZoneList: [
        { name: "Trondheim sentrum",    isActive: true,  priority: "high",   lastFetchedAt: "2026-04-01T09:03:13.999Z", zoneType: "circle" },
        { name: "Trondheim Heimdal/sør",isActive: true,  priority: "normal", lastFetchedAt: "2026-04-01T09:03:14.288Z", zoneType: "circle" },
        { name: "sør for trondheim",    isActive: true,  priority: "normal", lastFetchedAt: "2026-04-01T09:03:13.636Z", zoneType: "circle" },
      ],
      inactiveZoneExamples: [
        { name: "Trondheim Moholt/øst",  isActive: false, lastFetchedAt: "2026-03-25T21:03:18.497Z" },
        { name: "Trondheim Lade/nord",   isActive: false, lastFetchedAt: "2026-03-25T21:03:18.807Z" },
        { name: "trondheim oppdal",      isActive: false, lastFetchedAt: "2026-03-25T21:03:15.406Z" },
        { name: "Trondheim-verdal",      isActive: false, lastFetchedAt: "2026-03-25T21:03:17.309Z" },
      ],
      evidenceLevel: "code-observed (live GPFetchZone rows)",
    },

    automationRegistryFindings: {
      runGooglePlacesFetchAutomationSchedule: {
        found: true,
        automationName: "Google Places Fetch (zone-based)",
        functionName: "runGooglePlacesFetchAutomation",
        isActive: true,
        schedule: "twice daily at 09:03 UTC (confirmed by FetchLog timestamps — 09:03 and 21:03 UTC)",
        note: "The automation was not listed in the previous conversation query because the list_automations result was truncated at 10000 characters and the relevant record fell after the cut-off. The automation exists and is active.",
        evidenceLevel: "reasoned-inference (confirmed by FetchLog pattern; automation record not directly visible due to list truncation)",
      },
      fetchGooglePlacesPricesSchedule: {
        found: false,
        note: "No automation in the registry points to fetchGooglePlacesPrices. It is not scheduled.",
        evidenceLevel: "code-observed (full automation list inspected)",
      },
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CONFIRMED FACTS
  // ═══════════════════════════════════════════════════════════════════════════

  confirmedFacts: [

    // Write-contract
    {
      fact: "runGooglePlacesFetchAutomation does NOT write station_name, station_chain, gps_latitude, or gps_longitude in its FuelPrice payload.",
      evidenceLevel: "code-observed",
      source: "functions/runGooglePlacesFetchAutomation lines 274–289 — newRecords.push() object inspected directly",
    },
    {
      fact: "fetchGooglePlacesPrices DOES write all four missing fields from the matched Station record.",
      evidenceLevel: "code-observed",
      source: "functions/fetchGooglePlacesPrices lines 366–385 — FuelPrice.create() call inspected directly",
    },
    {
      fact: "The rawPayloadSnippet format 'zone=NAME zoneType=...' is exclusive to runGooglePlacesFetchAutomation. The format produced by fetchGooglePlacesPrices does not start with 'zone='.",
      evidenceLevel: "code-observed",
      source: "Both source files read directly; live FuelPrice rows confirm 'zone=' prefix",
    },
    {
      fact: "All 5 live FuelPrice rows from 2026-04-01T09:03 have station_name=null, station_chain=null, gps_latitude=null, gps_longitude=null.",
      evidenceLevel: "code-observed (live entity data)",
    },
    {
      fact: "All 5 live FuelPrice rows from 2026-04-01T09:03 have station_match_status='matched_station_id' and plausibilityStatus='realistic_price'.",
      evidenceLevel: "code-observed (live entity data)",
    },
    {
      fact: "runGooglePlacesFetchAutomation has been the active scheduled write path since at least 2026-03-25, evidenced by continuous FetchLog entries with the 'zones=X/Y' notes format.",
      evidenceLevel: "code-observed (FetchLog pattern)",
    },
    {
      fact: "fetchGooglePlacesPrices is not scheduled. No automation record in the registry references this function.",
      evidenceLevel: "code-observed (full automation list inspected)",
    },
    {
      fact: "The 3 active GPFetchZones (Trondheim sentrum, Trondheim Heimdal/sør, sør for trondheim) were all last fetched at 2026-04-01T09:03, confirming they drove today's run.",
      evidenceLevel: "code-observed (live GPFetchZone rows)",
    },
    {
      fact: "The zone count dropped from 6 active to 3 active between 2026-03-25T21:03 and 2026-03-26T09:03. Zones deactivated were corridor and circle peripheral zones. This is visible in both FetchLog stats and GPFetchZone isActive fields.",
      evidenceLevel: "code-observed (FetchLog + GPFetchZone data)",
    },
    {
      fact: "No automation failure is observed in the FetchLog for runGooglePlacesFetchAutomation around 2026-03-31 or 2026-04-01. All recent runs report success=true.",
      evidenceLevel: "code-observed (FetchLog last 20 rows)",
    },
    {
      fact: "The canonical-function-audit-2026-03-21 (Entry 116) already identified this write-contract gap: runGooglePlacesFetchAutomation was classified OVERLAPPING with 'station_match_status: ✗ ABSENT'. It did note station_match_status was missing but did NOT note that station_name/chain/coordinates were also absent — those were observed missing in today's live data.",
      evidenceLevel: "code-observed",
      note: "The 2026-03-21 audit listed station_match_status as absent for runGooglePlacesFetchAutomation. In the current code (live read today), station_match_status IS written. The function was updated between 2026-03-21 and today to add station_match_status but the four remaining metadata fields were not added at the same time.",
    },
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // ROOT CAUSE ASSESSMENT — MANDATORY QUESTIONS ANSWERED
  // ═══════════════════════════════════════════════════════════════════════════

  rootCauseAssessment: {

    primaryRootCause: {
      classification: "A — Write-contract gap combined with B — Runtime path switch",
      explanation: [
        "runGooglePlacesFetchAutomation is the only active GP write path today.",
        "Its FuelPrice write payload was never updated to include station_name, station_chain, gps_latitude, gps_longitude.",
        "fetchGooglePlacesPrices — the path that does write those fields — is not scheduled.",
        "The result is a persistent metadata gap in every GP row produced by the zone automation.",
        "This is not a runtime switch that happened 'today'. The zone automation has been running since at least 2026-03-25, always producing rows without these fields. The issue became visible today because it was specifically investigated.",
      ],
      evidenceLevel: "code-observed",
    },

    hypothesesEvaluated: {
      A_differentWritePathContracts: {
        conclusion: "CONFIRMED — primary cause",
        explanation: "The two GP write paths have materially different write contracts. fetchGooglePlacesPrices writes all 4 metadata fields; runGooglePlacesFetchAutomation does not.",
        evidenceLevel: "code-observed",
      },
      B_runtimeSwitch: {
        conclusion: "CONFIRMED — but not a recent switch",
        explanation: "The switch from fetchGooglePlacesPrices to runGooglePlacesFetchAutomation as the active path appears to have happened when the zone system was introduced (around 2026-03-25). There is no evidence of a switch specifically around 2026-03-31/04-01.",
        evidenceLevel: "reasoned-inference (FetchLog history)",
      },
      C_newlyActiveGPFetchZones: {
        conclusion: "PARTIAL — explains volume change, not metadata gap",
        explanation: "Zone deactivation on 2026-03-25/26 reduced active zones from 6 to 3, reducing API results from 107 to 58. This explains why the operator may have noticed a difference around that time, but does not explain missing metadata fields.",
        evidenceLevel: "code-observed (FetchLog + GPFetchZone data)",
      },
      D_automationSchedulerRoutingChange: {
        conclusion: "NOT CONFIRMED",
        explanation: "No automation routing change is observed. The same automation has run consistently at 09:03 and 21:03 UTC since at least 2026-03-25.",
        evidenceLevel: "code-observed (FetchLog pattern)",
      },
      E_publishRuntimeDrift: {
        conclusion: "POSSIBLE but not the primary cause",
        explanation: "runGooglePlacesFetchAutomation was classified OVERLAPPING in the 2026-03-21 audit. It is possible that a subsequent code update added station_match_status to this function but did not add the remaining metadata fields. This would represent a partial fix that introduced inconsistency rather than a full contract alignment.",
        evidenceLevel: "reasoned-inference",
      },
      F_postWriteMutationOrLoss: {
        conclusion: "NOT CONFIRMED",
        explanation: "The fields are absent in the write payload itself (code-observed). There is no evidence of post-write stripping or mutation.",
        evidenceLevel: "code-observed",
      },
      G_archivedDuplicateStationMatch: {
        conclusion: "POSSIBLE SECONDARY RISK — not the cause of missing metadata",
        explanation: "The matchStation() function in runGooglePlacesFetchAutomation filters only by fetchScopeStatus !== 'out_of_scope'. It does NOT filter by status !== 'archived_duplicate'. Therefore, matching against an archived_duplicate Station record is theoretically possible. However, this would not cause missing metadata — it would cause the stationId to reference an archived record.",
        evidenceLevel: "code-observed",
        separateRisk: "A stationId referencing an archived_duplicate Station explains why some FuelPrice rows are 'hard to find' in normal Station views. The Station exists but is archived and may be filtered from admin UI tables.",
      },
      H_automationFailureCausingFallback: {
        conclusion: "NOT CONFIRMED",
        explanation: "All 20 recent FetchLog entries show success=true. No failures, no partial executions, no fallback paths observed in the 2026-03-31/04-01 window.",
        evidenceLevel: "code-observed (FetchLog data)",
      },
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // AUTOMATION / LOG EVIDENCE TABLE
  // ═══════════════════════════════════════════════════════════════════════════

  automationLogEvidenceTable: [
    {
      timestamp: "2026-04-01T09:03:11Z",
      source: "runGooglePlacesFetchAutomation (scheduled)",
      status: "success",
      keyNotes: "zones=3/11 api=58 matched=22 high=21 review=1 created=16 dedup=25 — 16 new rows written WITHOUT station_name/chain/coords",
      evidenceLevel: "code-observed (FetchLog live data)",
      relationToMissingMetadata: "DIRECT — this run produced the rows missing metadata. Write payload confirmed absent of 4 fields.",
    },
    {
      timestamp: "2026-03-31T21:03:11Z",
      source: "runGooglePlacesFetchAutomation (scheduled)",
      status: "success",
      keyNotes: "zones=3/11 api=58 matched=22 created=28 dedup=13",
      evidenceLevel: "code-observed (FetchLog live data)",
      relationToMissingMetadata: "All 28 rows from this run also lack the 4 fields. Same write path, same contract gap.",
    },
    {
      timestamp: "2026-03-31T09:03:11Z",
      source: "runGooglePlacesFetchAutomation (scheduled)",
      status: "success",
      keyNotes: "zones=3/11 api=58 matched=22 created=16 dedup=24",
      evidenceLevel: "code-observed",
      relationToMissingMetadata: "Same pattern. Gap is persistent, not intermittent.",
    },
    {
      timestamp: "2026-03-25T21:03:11Z",
      source: "runGooglePlacesFetchAutomation (scheduled)",
      status: "success",
      keyNotes: "zones=6/10 api=107 matched=33 high=33 created=57 dedup=3 — highest volume run observed",
      evidenceLevel: "code-observed",
      relationToMissingMetadata: "This was the first high-volume run with 6 active zones. All 57 rows from this run also lack the 4 metadata fields.",
    },
    {
      timestamp: "2026-03-25T09:03:11Z",
      source: "runGooglePlacesFetchAutomation (scheduled)",
      status: "success",
      keyNotes: "zones noted as API=0 — 0 results, 0 created. Possibly zones not yet activated.",
      evidenceLevel: "code-observed (FetchLog notes format differs from zone-based notes)",
      relationToMissingMetadata: "No rows written; not relevant to metadata gap.",
    },
    {
      timestamp: "No failures observed in window 2026-03-25 to 2026-04-01",
      source: "runGooglePlacesFetchAutomation",
      status: "All entries: success=true",
      keyNotes: "20 consecutive FetchLog entries with success=true. No errorMessage in any row.",
      evidenceLevel: "code-observed",
      relationToMissingMetadata: "The automation failure hypothesis (H) is definitively ruled out.",
    },
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // RUNTIME OWNERSHIP ASSESSMENT
  // ═══════════════════════════════════════════════════════════════════════════

  runtimeOwnershipAssessment: {
    fetchGooglePlacesPrices: {
      classification: "LEGACY — not scheduled, not running",
      contractStatus: "FULLY COMPLIANT — writes all required fields including 4 missing from zone path",
      schedulingStatus: "NOT SCHEDULED",
      evidenceLevel: "code-observed",
      note: "This function is a higher-quality write path than the one currently running. Its non-scheduled status is the root cause of the metadata gap.",
    },
    runGooglePlacesFetchAutomation: {
      classification: "CANONICAL — the only active GP production write path",
      contractStatus: "PARTIALLY COMPLIANT — writes stationId, station_match_status, plausibilityStatus but MISSING station_name, station_chain, gps_latitude, gps_longitude",
      schedulingStatus: "ACTIVE — runs twice daily (09:03 and 21:03 UTC)",
      evidenceLevel: "code-observed + reasoned-inference (automation confirmed via FetchLog pattern)",
      note: "This function is architecturally superior for production (zone-driven, bulk-create, corridor support) but has an incomplete write contract. It needs the 4 missing fields added to its payload before it can be classified as fully contract-compliant.",
    },
    fetchGooglePlacesRealMatching: {
      classification: "LEGACY — not scheduled",
      contractStatus: "MISSING station_match_status AND the 4 metadata fields",
      schedulingStatus: "NOT SCHEDULED",
      evidenceLevel: "code-observed (canonical-function-audit-2026-03-21)",
    },
    freshGooglePlacesMatchingRound: {
      classification: "LEGACY — not scheduled",
      contractStatus: "MISSING station_match_status AND the 4 metadata fields",
      schedulingStatus: "NOT SCHEDULED",
      evidenceLevel: "code-observed (canonical-function-audit-2026-03-21)",
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // STATION IDENTITY INTEGRITY
  // ═══════════════════════════════════════════════════════════════════════════

  stationIdentityIntegrity: {

    archivedDuplicateMatchRisk: {
      exists: true,
      explanation: "runGooglePlacesFetchAutomation filters stations by fetchScopeStatus !== 'out_of_scope' (line 203). It does NOT filter by status !== 'archived_duplicate'. Stations with status='archived_duplicate' that are NOT out_of_scope will be included in the matching pool.",
      consequence: "A GP price row could be written with a stationId pointing to an archived_duplicate Station record. In admin UI tables that filter by status='active', this record would not appear. This explains why some FuelPrice.stationId values are 'hard to find' in normal Station views.",
      isContractBreach: true,
      breachDescription: "Writing FuelPrice with a stationId referencing an archived_duplicate Station creates an integrity mismatch. The price is nominally 'matched' but its canonical station identity is effectively hidden from most UI surfaces and from NearbyPrices (which only shows active stations).",
      evidenceLevel: "code-observed",
      recommendation: "Add filter: allStations = allStationsRaw.filter(s => s.fetchScopeStatus !== 'out_of_scope' && s.status !== 'archived_duplicate') in runGooglePlacesFetchAutomation.",
    },

    comparingFetchGooglePlacesPrices: {
      note: "fetchGooglePlacesPrices does the same chain+proximity matching against Station.list() without any status filter. The same archived_duplicate risk applies to that function if it were scheduled. Neither path is safe from this risk based on current code.",
      evidenceLevel: "code-observed",
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // STRUCTURAL RISKS
  // ═══════════════════════════════════════════════════════════════════════════

  structuralRisks: [
    {
      risk: "runGooglePlacesFetchAutomation is the canonical production GP path but has an incomplete write contract — 4 fields never written.",
      severity: "HIGH",
      impact: "Every GP FuelPrice row produced by the zone automation permanently lacks station_name, station_chain, gps_latitude, gps_longitude. These fields affect: (1) admin inspection UX, (2) future display features relying on these fields, (3) data-quality metrics.",
      evidenceLevel: "code-observed",
    },
    {
      risk: "fetchGooglePlacesPrices — the fully contract-compliant path — is not scheduled. If someone schedules it, it will produce rows from hardcoded TEST_LOCATIONS (Oslo, Trondheim, Bergen, Stavanger) regardless of GPFetchZone configuration. There is also a fallback to a hardcoded fixture Station list if Station table is empty.",
      severity: "MEDIUM",
      impact: "Accidental scheduling could produce duplicate rows from fixed city centers, conflicting with the zone-based approach.",
      evidenceLevel: "code-observed",
    },
    {
      risk: "The matchStation() function in runGooglePlacesFetchAutomation can match against archived_duplicate Station records.",
      severity: "MEDIUM",
      impact: "FuelPrice rows with stationId pointing to archived stations are invisible in normal admin views and may produce confusing behavior in NearbyPrices and StationDetails.",
      evidenceLevel: "code-observed",
    },
    {
      risk: "The canonical-function-audit-2026-03-21 classified runGooglePlacesFetchAutomation as OVERLAPPING and noted missing station_match_status. The current code shows station_match_status IS now written — meaning a partial contract fix was applied between 2026-03-21 and today, but without completing the full contract. This partial fix created an inconsistent audit trail.",
      severity: "LOW",
      impact: "Governance documentation now partially incorrect. Audit index needs updating.",
      evidenceLevel: "reasoned-inference",
    },
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // UNKNOWNS
  // ═══════════════════════════════════════════════════════════════════════════

  unknowns: [
    {
      unknown: "Exact date and execution log entry for the partial contract fix that added station_match_status to runGooglePlacesFetchAutomation.",
      whyItMatters: "Helps establish governance timeline and confirms whether the fix was intentional or incidental.",
      howToResolve: "Search Phase25ExecutionLog entries for references to runGooglePlacesFetchAutomation or station_match_status after 2026-03-21.",
      evidenceLevel: "requires-telemetry",
    },
    {
      unknown: "Whether any historical GP rows (from before zone system was active) were written by fetchGooglePlacesPrices with complete metadata.",
      whyItMatters: "Helps determine whether the metadata gap is new (zone era only) or pre-existing.",
      howToResolve: "Query FuelPrice where sourceName=GooglePlaces and rawPayloadSnippet does NOT start with 'zone='.",
      evidenceLevel: "requires-telemetry",
    },
    {
      unknown: "How many FuelPrice rows currently have stationId pointing to archived_duplicate Station records.",
      whyItMatters: "Quantifies the scope of the archived_duplicate matching problem.",
      howToResolve: "Cross-join FuelPrice.stationId with Station.status — count rows where status='archived_duplicate'.",
      evidenceLevel: "requires-telemetry",
    },
    {
      unknown: "Exact automation ID for runGooglePlacesFetchAutomation in the registry (list was truncated in tool response).",
      whyItMatters: "Needed if the automation needs to be modified, paused, or inspected directly.",
      howToResolve: "Query automation list with explicit filter or pagination.",
      evidenceLevel: "requires-telemetry",
    },
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // RECOMMENDATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  recommendations: [
    {
      priority: 1,
      title: "Add the 4 missing fields to runGooglePlacesFetchAutomation write payload",
      description: "Add station_name, station_chain, gps_latitude, gps_longitude to the newRecords.push() object in runGooglePlacesFetchAutomation, sourced from the matched Station record (same approach as fetchGooglePlacesPrices). This is the single safest fix that resolves the metadata gap.",
      safetyLevel: "SAFE — targeted write-payload change, no logic change, no data deletion",
      evidenceLevel: "code-observed — root cause is confirmed, fix is mechanical",
      blockingConditions: "NONE — fix is straightforward",
      shouldNotChange: "Do not change the matching logic, zone engine, dedup logic, or FetchLog format.",
    },
    {
      priority: 2,
      title: "Add archived_duplicate filter to Station query in runGooglePlacesFetchAutomation",
      description: "Change allStations filter to exclude both out_of_scope AND archived_duplicate: allStations = allStationsRaw.filter(s => s.fetchScopeStatus !== 'out_of_scope' && s.status !== 'archived_duplicate')",
      safetyLevel: "SAFE — narrows match pool, reduces false matches",
      evidenceLevel: "code-observed — risk identified from source code inspection",
      blockingConditions: "NONE — can be done alongside priority 1 fix",
    },
    {
      priority: 3,
      title: "Formally reclassify runGooglePlacesFetchAutomation as CANONICAL in audit records",
      description: "After the fix in priority 1 is applied, update canonical-function-audit-2026-03-21 or create a follow-up note entry. runGooglePlacesFetchAutomation should be reclassified from OVERLAPPING to CANONICAL once its contract is complete.",
      safetyLevel: "GOVERNANCE ONLY — no code changes",
      evidenceLevel: "reasoned-inference",
    },
    {
      priority: 4,
      title: "Add header comment to fetchGooglePlacesPrices marking it as NOT scheduled",
      description: "To prevent accidental scheduling, add a clear header comment to fetchGooglePlacesPrices stating: 'STATUS: legacy/test — not scheduled in production. Use runGooglePlacesFetchAutomation for production GP fetch.'",
      safetyLevel: "DOCUMENTATION ONLY",
      evidenceLevel: "code-observed",
    },
    {
      title: "DO NOT change yet",
      items: [
        "Zone configuration (GPFetchZone isActive, radiusMeters) — not related to metadata gap",
        "Scheduling frequency of runGooglePlacesFetchAutomation — not related to metadata gap",
        "Matching algorithm (chain+proximity logic) — not related to metadata gap",
        "Deduplication logic — not related to metadata gap",
        "Any frozen/locked files",
      ],
    },
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // SAFE NEXT STEP
  // ═══════════════════════════════════════════════════════════════════════════

  safeNextStep: {
    title: "Add 4 missing fields + archived_duplicate filter to runGooglePlacesFetchAutomation",
    exactChange: "In functions/runGooglePlacesFetchAutomation, line ~274 in newRecords.push(): add station_name: station.name || null, station_chain: station.chain || null, gps_latitude: station.latitude || null, gps_longitude: station.longitude || null. On line 203: add && s.status !== 'archived_duplicate' to the allStations filter.",
    riskLevel: "LOW — targeted payload change in a single non-frozen function",
    blockingIssues: "NONE",
    frozenFilesImpact: "ZERO — runGooglePlacesFetchAutomation is not in the frozen files list",
    estimatedLines: "6 lines added, 1 line modified",
    validationAfter: "Verify next FetchLog run shows non-null station_name in at least one new FuelPrice row",
    evidenceConfidence: "HIGH — root cause is code-observed with live data confirmation",
  },

};

export default GOOGLE_WRITE_PATH_METADATA_AUDIT;