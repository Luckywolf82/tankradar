/**
 * DATA ARCHITECTURE MAP
 *
 * PURPOSE
 *
 * Describes the core domain models and data structures used by TankRadar.
 *
 * This map shows how fuel prices, stations, and related entities are organized,
 * what data each model contains, and how they relate to each other.
 *
 * ————————————————————————————————————————————————————————————————————————————————
 *
 * CORE DOMAIN MODELS (5 entities)
 *
 * 1. STATION
 *    Purpose: Fuel station catalog and metadata
 *    Relationships: Referenced by FuelPrice.stationId, StationReview.stationId
 *    
 *    Key Fields:
 *    • name (required) — Station name
 *    • sourceName (required) — Source that identified station
 *    • chain — Confirmed fuel chain (e.g., Circle K, Uno-X)
 *    • operator — Retailer/grocery operator (when stationType=retail_fuel)
 *    • stationType — Type classification (standard, retail_fuel, lpg, cng, etc.)
 *    • status — Lifecycle status (active, archived_duplicate)
 *    • address, city, region, postalCode — Location data
 *    • latitude, longitude — GPS coordinates
 *    • sourceStationId — External source station ID
 *    • normalizedName — Normalized name for matching
 *
 * 2. FUELPRICE
 *    Purpose: Fuel price observations from various sources
 *    Relationships: References Station via stationId (optional for user_reported)
 *    
 *    Key Fields:
 *    • fuelType (required) — Fuel type (gasoline_95, diesel, etc.)
 *    • priceNok (required) — Price in NOK per liter
 *    • priceType (required) — Data granularity (station_level, national_average, user_reported)
 *    • sourceName (required) — Source of price (GooglePlaces, user_reported, etc.)
 *    • fetchedAt (required) — When price was fetched
 *    • stationId — Reference to Station (optional for user_reported)
 *    • locationLabel — Location description for non-station prices
 *    • sourceUpdatedAt — When source updated this price
 *    • sourceFrequency — Update frequency from source
 *    • confidenceScore — Trust level (0-1)
 *    • confidenceReason — Why confidence score was assigned
 *    • plausibilityStatus — Price validity classification
 *    • parserVersion — Parser version used
 *    • rawPayloadSnippet — Debug excerpt from source
 *    • station_match_status — Matching status for user_reported
 *    • station_match_candidates — Potential station matches
 *    • gps_latitude, gps_longitude — User-reported GPS coordinates
 *    • reportedByUserId — Anonymous contributor tracking
 *
 * 3. STATIONCANDIDATE
 *    Purpose: Pending new stations awaiting curation
 *    Relationships: Matches against Station records for deduplication
 *    
 *    Key Fields:
 *    • sourceName (required) — Source (GooglePlaces, user_price_submission, etc.)
 *    • sourceStationId (required) — External source ID
 *    • proposedName (required) — Station name from source
 *    • latitude (required) — GPS latitude
 *    • longitude (required) — GPS longitude
 *    • status (required) — Curation status (pending, approved, rejected, duplicate)
 *    • proposedChain — Fuel chain from source
 *    • address — Address from source
 *    • matchCandidates — Potential duplicate Station IDs
 *    • matchConfidence — Matching confidence (0-1)
 *    • classification — Rule engine classification
 *    • region — Geographic region
 *    • notes — Curation notes
 *
 * 4. STATIONREVIEW
 *    Purpose: Quality gates and deduplication flags
 *    Relationships: References Station for curation
 *    
 *    Key Fields:
 *    • stationId (required) — Station being reviewed
 *    • review_type (required) — Problem type to review
 *    • status (required) — Review lifecycle status
 *    • reviewReason — Why review was triggered
 *    • station_name — Station name snapshot
 *    • station_chain — Chain snapshot
 *    • station_stationType — Type classification
 *    • issue_description — Detailed problem explanation
 *    • suggested_action — Recommended action
 *    • duplicate_of_station_id — If duplicate, which station is canonical
 *    • source_report — Which system created this review
 *    • notes — Reviewer notes
 *
 * 5. SOURCEREGISTRY
 *    Purpose: Data source health and integration tracking
 *    Relationships: Referenced by FuelPrice.sourceName
 *    
 *    Key Fields:
 *    • sourceName (required) — Unique source identifier
 *    • sourceType (required) — Data type (station_level_prices, national_average, etc.)
 *    • integrationStatus (required) — Status (live, testing, parser_validated, blocked, deprecated, planned)
 *    • dataGranularity — Data level offered
 *    • updateFrequency — Expected update frequency
 *    • lastSuccessAt — Last successful fetch timestamp
 *    • lastFailureAt — Last failed fetch timestamp
 *    • failureReason — Reason for last failure
 *    • sourceUrl — Source URL if relevant
 *    • coverageStatus — Coverage level (full, partial, limited, unknown)
 *    • observedCoverageRate — Observed coverage percentage
 *    • observedFuelTypes — Fuel types from last test
 *    • notes — Status documentation
 *
 * ————————————————————————————————————————————————————————————————————————————————
 *
 * DATA TYPES — MANDATORY DISTINCTION
 *
 * FuelPrice records MUST distinguish between:
 *
 * • station_level — Individual station prices
 *   - Granularity: Single station
 *   - Frequency: Varies by source
 *   - Confidence: May be high or moderate
 *
 * • national_average — National average prices
 *   - Granularity: Country-wide aggregation
 *   - Frequency: Daily or less frequent
 *   - Confidence: Regional aggregate
 *
 * • user_reported — User-submitted prices
 *   - Granularity: Single station (requires matching)
 *   - Frequency: Real-time submission
 *   - Confidence: Depends on user verification
 *
 * These types must NEVER be presented as equivalent quality or granularity.
 *
 * ————————————————————————————————————————————————————————————————————————————————
 *
 * INTEGRATION STATUSES — SOURCE LIFECYCLE
 *
 * • planned — Source identified but not yet tested
 * • testing — Parser under development
 * • parser_validated — Parser works with fixtures only
 * • live — Confirmed working from live runtime
 * • blocked — Temporarily unavailable
 * • deprecated — No longer maintained
 *
 * Sources can ONLY be marked "live" when confirmed from production runtime.
 * Parser-validated sources must remain parser_validated until live confirmation.
 *
 * ————————————————————————————————————————————————————————————————————————————————
 *
 * STATION STATUS LIFECYCLE
 *
 * • active — Station is in use
 * • archived_duplicate — Station merged into another (after curator approval)
 *
 * When stations are merged:
 * • Canonical station keeps active status
 * • Duplicate station marked archived_duplicate
 * • FuelPrice records repointed to canonical station
 * • Merge logged in StationMergeLog
 *
 * ————————————————————————————————————————————————————————————————————————————————
 *
 * STATIONCANDIDATE STATUS LIFECYCLE
 *
 * • pending — Awaiting curator review
 * • auto_confirmed — Rule engine auto-confirmed
 * • approved — Curator approved
 * • rejected — Curator rejected
 * • duplicate — Merged into existing Station
 *
 * ————————————————————————————————————————————————————————————————————————————————
 *
 * STATIONREVIEW STATUS LIFECYCLE
 *
 * • pending — Awaiting curator review
 * • auto_resolved — Rule engine auto-resolved
 * • approved — Curator approved suggested action
 * • rejected — Curator rejected suggestion
 * • duplicate — Marked for merging
 * • duplicate_candidate — Potential duplicate identified
 *
 * ————————————————————————————————————————————————————————————————————————————————
 *
 * DATA RELATIONSHIPS
 *
 * STATION → FUELPRICE (1:many)
 *   One station may have many price observations.
 *   FuelPrice.stationId links to Station.
 *   user_reported prices may have stationId=null if matching is pending.
 *
 * STATION → STATIONREVIEW (1:many)
 *   One station may have multiple review flags.
 *   StationReview.stationId links to Station.
 *   Reviews are created by rule engines and curators.
 *
 * STATIONCANDIDATE → STATION (many:1)
 *   New candidates match against existing stations.
 *   StationCandidate.matchCandidates contains potential Station IDs.
 *   On approval, candidate becomes a new Station.
 *
 * SOURCEREGISTRY ← FUELPRICE (many:1)
 *   Every FuelPrice references a source via sourceName.
 *   SourceRegistry tracks health and metadata for that source.
 *
 * ————————————————————————————————————————————————————————————————————————————————
 *
 * MANDATORY METADATA
 *
 * Every FuelPrice record MUST include:
 *
 * • sourceName — Which source provided this price
 * • fetchedAt — When we acquired this data
 * • sourceUpdatedAt — When source last updated (or null if unknown)
 * • sourceFrequency — Expected update rate (or "unknown")
 * • confidenceScore — Trust level (0-1)
 * • parserVersion — Parser that processed this
 * • priceType — Data granularity classification
 *
 * If any field is not confirmed from source, set to:
 * • null (for strings/objects)
 * • "unknown" (for categorical fields)
 *
 * NEVER fill in assumed values.
 *
 * ————————————————————————————————————————————————————————————————————————————————
 *
 * REFERENCE INTEGRITY RULES
 *
 * 1. FuelPrice.stationId MUST exist in Station (or be null for user_reported)
 * 2. StationReview.stationId MUST exist in Station
 * 3. FuelPrice.sourceName MUST exist in SourceRegistry
 * 4. Station.sourceName MUST be documented in SourceRegistry
 * 5. StationCandidate.matchCandidates must reference valid Station IDs
 *
 * ————————————————————————————————————————————————————————————————————————————————
 */

export const DATA_ARCHITECTURE_MAP = {
  
  coreModels: [
    {
      name: "Station",
      purpose: "Fuel station catalog and metadata",
      requiredFields: ["name", "sourceName"],
      relationships: [
        "Referenced by FuelPrice.stationId",
        "Referenced by StationReview.stationId"
      ],
      keyFields: [
        "name",
        "chain",
        "operator",
        "stationType",
        "status",
        "address",
        "city",
        "region",
        "latitude",
        "longitude",
        "sourceName",
        "sourceStationId",
        "normalizedName"
      ]
    },
    {
      name: "FuelPrice",
      purpose: "Fuel price observations from various sources",
      requiredFields: ["fuelType", "priceNok", "priceType", "sourceName", "fetchedAt"],
      relationships: [
        "References Station via stationId (optional for user_reported)",
        "References SourceRegistry via sourceName"
      ],
      dataTypes: ["station_level", "national_average", "user_reported"],
      keyFields: [
        "fuelType",
        "priceNok",
        "priceType",
        "sourceName",
        "fetchedAt",
        "sourceUpdatedAt",
        "sourceFrequency",
        "confidenceScore",
        "plausibilityStatus",
        "stationId",
        "locationLabel",
        "station_match_status"
      ]
    },
    {
      name: "StationCandidate",
      purpose: "Pending new stations awaiting curation",
      requiredFields: ["sourceName", "sourceStationId", "proposedName", "latitude", "longitude", "status"],
      relationships: [
        "Matches against Station records for deduplication"
      ],
      keyFields: [
        "sourceName",
        "sourceStationId",
        "proposedName",
        "latitude",
        "longitude",
        "status",
        "proposedChain",
        "address",
        "matchCandidates",
        "matchConfidence",
        "classification"
      ]
    },
    {
      name: "StationReview",
      purpose: "Quality gates and deduplication flags",
      requiredFields: ["stationId", "review_type", "status"],
      relationships: [
        "References Station via stationId"
      ],
      keyFields: [
        "stationId",
        "review_type",
        "status",
        "reviewReason",
        "station_name",
        "station_chain",
        "issue_description",
        "duplicate_of_station_id"
      ]
    },
    {
      name: "SourceRegistry",
      purpose: "Data source health and integration tracking",
      requiredFields: ["sourceName", "sourceType", "integrationStatus"],
      relationships: [
        "Referenced by FuelPrice.sourceName",
        "Referenced by Station.sourceName"
      ],
      keyFields: [
        "sourceName",
        "sourceType",
        "integrationStatus",
        "dataGranularity",
        "updateFrequency",
        "lastSuccessAt",
        "lastFailureAt",
        "failureReason",
        "coverageStatus",
        "observedCoverageRate"
      ]
    }
  ],
  
  // DATA TYPES — MANDATORY DISTINCTION
  dataTypes: {
    station_level: {
      granularity: "Single station",
      frequency: "Varies by source",
      confidence: "Typically high",
      stationIdRequired: "Usually yes"
    },
    national_average: {
      granularity: "Country-wide aggregation",
      frequency: "Daily or less",
      confidence: "Regional aggregate",
      stationIdRequired: "No"
    },
    user_reported: {
      granularity: "Single station (requires matching)",
      frequency: "Real-time",
      confidence: "Depends on verification",
      stationIdRequired: "After matching"
    }
  },
  
  // INTEGRATION STATUSES — SOURCE LIFECYCLE
  integrationStatuses: [
    "planned",
    "testing",
    "parser_validated",
    "live",
    "blocked",
    "deprecated"
  ],
  
  // DATA RELATIONSHIPS
  relationships: [
    {
      from: "Station",
      to: "FuelPrice",
      cardinality: "1:many",
      description: "One station may have many price observations"
    },
    {
      from: "Station",
      to: "StationReview",
      cardinality: "1:many",
      description: "One station may have multiple review flags"
    },
    {
      from: "StationCandidate",
      to: "Station",
      cardinality: "many:1",
      description: "New candidates match against existing stations"
    },
    {
      from: "FuelPrice",
      to: "SourceRegistry",
      cardinality: "many:1",
      description: "Every price references a source"
    }
  ],
  
  // MANDATORY METADATA FOR FUELPRICE
  mandatoryMetadata: [
    "sourceName",
    "fetchedAt",
    "sourceUpdatedAt",
    "sourceFrequency",
    "confidenceScore",
    "parserVersion",
    "priceType"
  ],
  
  // KEY PRINCIPLES
  keyPrinciples: [
    "Never blend different data types without explicit marking",
    "Never fill in assumed values — use null or 'unknown'",
    "All sources must be registered in SourceRegistry",
    "All prices must be tagged with source metadata",
    "Conservative matching is better than aggressive matching",
    "Unmatched is better than incorrectly matched",
    "Test data must be marked and never presented as production data"
  ],
  
  dataPurpose: "Fuel price tracking and station mastering for Norway",
  
  lastUpdated: "2026-03-11"
};

export default DATA_ARCHITECTURE_MAP;