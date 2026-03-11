/**
 * TANKRADAR ARCHITECTURE MAP
 *
 * PURPOSE
 *
 * This document describes the runtime architecture of the TankRadar application.
 *
 * It allows AI agents and developers to quickly understand the system
 * before making changes.
 *
 * ————————————————————————————————————————————————————————————————————————————————
 *
 * ROUTER SYSTEM
 *
 * Main Router File: src/pages/App.jsx
 *
 * Structure:
 * • BrowserRouter at line 99
 * • Routes wrapper at lines 100-107
 * • ProtectedRoute wrapper for role-based access
 * • Layout wrapper for all pages
 *
 * Router Type: React Router DOM v6
 * Entry Point: pages/App.jsx (default export)
 * Initialization: ThemeProvider > TabStateProvider > BrowserRouter
 *
 * ————————————————————————————————————————————————————————————————————————————————
 *
 * PAGE ORGANIZATION
 *
 * Total Pages: 27
 *
 * PUBLIC PAGES (4 — no role required)
 * ✓ Dashboard (path: /)
 * ✓ Statistics (path: /statistics)
 * ✓ LogPrice (path: /logprice)
 * ✓ Settings (path: /settings)
 *
 * USER PAGES (1 — role: "user")
 * ✓ Profile (path: /profile)
 *
 * CURATOR PAGES (1 — role: "curator")
 * ✓ ReviewQueue (path: /reviewqueue)
 *
 * ADMIN PAGES (21 — role: "admin")
 * ✓ SuperAdmin (path: /superadmin)
 * ✓ SystemStatus (path: /systemstatus)
 * ✓ CandidateDiscoveryStatus (path: /candidatediscoverystatus)
 * ✓ GroupReviewFixReport (path: /groupreviewfixreport)
 * ✓ StationImport (path: /stationimport)
 * ✓ DiscoverStations (path: /discoverstations)
 * ✓ StationCandidateReview (path: /stationcandidatereview)
 * ✓ ComponentNamingReview (path: /componentnamingreview)
 * ✓ DataConsistencyDiagnosis (path: /dataconsistencydiagnosis)
 * ✓ DataQualityDiagnostics (path: /dataqualitydiagnostics)
 * ✓ BackfillAssessment (path: /backfillassessment)
 * ✓ CoverageReport (path: /coveragereport)
 * ✓ ProductionModelLockdown (path: /productionmodellockdown)
 * ✓ MobileImplementationReport (path: /mobileimplementationreport)
 * ✓ MobileUXEnhancementReport (path: /mobileux enhancementreport)
 * ✓ UserReportedScanOperations (path: /userreportedscanoperations)
 * ✓ VerificationReport_UserReportedEnhancements (path: /verificationreport_userreportedenhancements)
 * ✓ ImplementationReport_UserReportedPolicy (path: /implementationreport_userreportedpolicy)
 * ✓ ConfidencePolicyReport (path: /confidencepolicyreport)
 * ✓ UserReportedSystemIntegrationReport (path: /userreportedsystemintegrationreport)
 *
 * ————————————————————————————————————————————————————————————————————————————————
 *
 * CORE ENTITIES (Data Models)
 *
 * 1. Station
 *    Purpose: Fuel station catalog and metadata
 *    Key fields: name, chain, address, coordinates, stationType, status
 *    Relationships: Linked from FuelPrice.stationId, StationReview.stationId
 *
 * 2. FuelPrice
 *    Purpose: Fuel price observations from various sources
 *    Key fields: fuelType, priceNok, priceType, sourceName, sourceUpdatedAt
 *    Data Types: station_level, national_average, user_reported
 *    Relationships: Linked to Station via stationId (optional for user_reported)
 *
 * 3. StationCandidate
 *    Purpose: Pending new stations awaiting curation
 *    Key fields: proposedName, latitude, longitude, status, matchCandidates
 *    Status: pending, auto_confirmed, approved, rejected, duplicate
 *    Relationships: Matches against Station records
 *
 * 4. StationReview
 *    Purpose: Quality gates and deduplication flags
 *    Key fields: stationId, review_type, status, issue_description
 *    Review Types: legacy_duplicate, chain_unconfirmed, generic_name_review, etc.
 *    Relationships: References Station for curation
 *
 * 5. SourceRegistry
 *    Purpose: Data source health and integration tracking
 *    Key fields: sourceName, integrationStatus, dataGranularity, updateFrequency
 *    Status: live, testing, parser_validated, blocked, deprecated, planned
 *    Relationships: Referenced from FuelPrice.sourceName
 *
 * ————————————————————————————————————————————————————————————————————————————————
 *
 * COMPONENT SYSTEM
 *
 * LAYOUT & NAVIGATION
 * • Layout.jsx (global navigation wrapper)
 * • MobileHeader (mobile back button and page title)
 * • RouteAnimation (page transition animations)
 * • NotificationBell (user notifications)
 *
 * DASHBOARDS
 * • Dashboard (primary fuel price view)
 * • Statistics (price trends and analysis)
 *
 * ADMIN PANELS
 * • SuperAdmin (admin hub with links to diagnostics)
 * • SystemStatus (system health and metrics)
 * • ReviewQueue (station review management)
 *
 * AUDIT SYSTEM
 * • AUDIT_INDEX.jsx (audit registry)
 * • AUDIT_SYSTEM_GUIDE.jsx (audit rules)
 * • README.jsx (quick reference)
 * • architecture/ (structure audits)
 * • ui/ (design audits)
 * • governance/ (compliance audits)
 *
 * ————————————————————————————————————————————————————————————————————————————————
 *
 * AUTOMATION SYSTEMS
 *
 * STATION MATCHING
 * • matchStationForUserReportedPrice (matches user prices to stations)
 * • getNearbyStationCandidates (finds candidate stations)
 * • stationMatchingUtility (conservative matching algorithm)
 *
 * PRICE INGESTION
 * • fetchGooglePlacesPrices (external price source)
 * • classifyPricePlausibility (FROZEN — validates price ranges)
 * • classifyGooglePlacesConfidence (FROZEN — confidence scoring)
 *
 * STATION CANDIDATE PROCESSING
 * • createStationCandidateFromUserReportedPrice (generates candidates)
 * • processStationCandidates (curation workflow)
 *
 * ALERT SYSTEM
 * • checkPriceAlerts (user price notifications)
 * • checkPriceDropAlerts (price decrease detection)
 * • notificationService (notification delivery)
 *
 * CLASSIFICATION & RULES
 * • classifyStationsRuleEngine (FROZEN — station categorization)
 * • classifyGooglePlacesConfidence (FROZEN — confidence levels)
 *
 * ————————————————————————————————————————————————————————————————————————————————
 *
 * FROZEN PHASE 2 FILES (Read-Only)
 *
 * These files are locked and cannot be modified without explicit governance:
 *
 * • functions/deleteAllGooglePlacesPrices
 * • functions/verifyGooglePlacesPriceNormalization
 * • functions/deleteGooglePlacesPricesForReclassification
 * • functions/classifyPricePlausibility
 * • functions/classifyStationsRuleEngine
 * • functions/classifyGooglePlacesConfidence
 *
 * ————————————————————————————————————————————————————————————————————————————————
 *
 * DATA FLOW
 *
 * EXTERNAL SOURCE → INGESTION → MATCHING → STORAGE → DASHBOARD
 *
 * 1. INGESTION
 *    Sources: GooglePlaces, FuelFinder, GlobalPetrolPrices, User Reports
 *    Output: FuelPrice records with sourceMetadata
 *
 * 2. MATCHING
 *    Input: FuelPrice records, Station catalog
 *    Logic: Conservative matching (name, chain, coordinates)
 *    Output: FuelPrice.stationId or review_needed_station_match
 *
 * 3. VALIDATION
 *    Checks: Plausibility, confidence scoring, data granularity
 *    Output: Classification and metadata enrichment
 *
 * 4. STORAGE
 *    Primary: Base44 entities (FuelPrice, Station, StationCandidate, etc.)
 *    Secondary: FetchLog, SourceRegistry (metadata)
 *
 * 5. DASHBOARD
 *    Public: Price observations, trends, regional stats
 *    Admin: Data source health, matching quality, review queues
 *
 * ————————————————————————————————————————————————————————————————————————————————
 *
 * GOVERNANCE FILES
 *
 * AI_PROJECT_INSTRUCTIONS.jsx      — Development rules and frozen files list
 * Phase25ExecutionLogIndex.jsx      — Audit and change log index
 * NextSafeStep.jsx                 — Current approved phase/action
 * ARCHITECTURE_MAP.jsx              — This file
 *
 * ————————————————————————————————————————————————————————————————————————————————
 *
 * SUMMARY TABLE
 *
 */

export const ARCHITECTURE_MAP = {
  
  applicationName: "TankRadar",
  version: "2026-03-11",
  purpose: "Fuel price tracking and station catalog for Norway",
  
  router: {
    mainRouterFile: "src/pages/App.jsx",
    routerLibrary: "React Router DOM v6",
    structure: "BrowserRouter > Routes with ProtectedRoute wrappers",
    layoutSystem: "Layout component wraps all pages with Layout.jsx",
    protectedRoutes: true
  },
  
  pages: {
    totalCount: 27,
    publicCount: 4,
    userCount: 1,
    curatorCount: 1,
    adminCount: 21,
    
    public: ["Dashboard", "Statistics", "LogPrice", "Settings"],
    user: ["Profile"],
    curator: ["ReviewQueue"],
    admin: [
      "SuperAdmin",
      "SystemStatus",
      "CandidateDiscoveryStatus",
      "GroupReviewFixReport",
      "StationImport",
      "DiscoverStations",
      "StationCandidateReview",
      "ComponentNamingReview",
      "DataConsistencyDiagnosis",
      "DataQualityDiagnostics",
      "BackfillAssessment",
      "CoverageReport",
      "ProductionModelLockdown",
      "MobileImplementationReport",
      "MobileUXEnhancementReport",
      "UserReportedScanOperations",
      "VerificationReport_UserReportedEnhancements",
      "ImplementationReport_UserReportedPolicy",
      "ConfidencePolicyReport",
      "UserReportedSystemIntegrationReport"
    ]
  },
  
  entities: [
    {
      name: "Station",
      purpose: "Fuel station catalog and metadata",
      key_fields: ["name", "chain", "address", "coordinates", "stationType", "status"]
    },
    {
      name: "FuelPrice",
      purpose: "Fuel price observations from various sources",
      key_fields: ["fuelType", "priceNok", "priceType", "sourceName", "sourceUpdatedAt"],
      dataTypes: ["station_level", "national_average", "user_reported"]
    },
    {
      name: "StationCandidate",
      purpose: "Pending new stations awaiting curation",
      key_fields: ["proposedName", "latitude", "longitude", "status", "matchCandidates"]
    },
    {
      name: "StationReview",
      purpose: "Quality gates and deduplication flags",
      key_fields: ["stationId", "review_type", "status", "issue_description"]
    },
    {
      name: "SourceRegistry",
      purpose: "Data source health and integration tracking",
      key_fields: ["sourceName", "integrationStatus", "dataGranularity", "updateFrequency"]
    }
  ],
  
  components: {
    navigation: ["Layout", "MobileHeader", "RouteAnimation", "NotificationBell"],
    dashboards: ["Dashboard", "Statistics"],
    adminPanels: ["SuperAdmin", "SystemStatus", "ReviewQueue"],
    auditSystem: true
  },
  
  automations: {
    stationMatching: [
      "matchStationForUserReportedPrice",
      "getNearbyStationCandidates",
      "stationMatchingUtility"
    ],
    priceIngestion: [
      "fetchGooglePlacesPrices",
      "classifyPricePlausibility",
      "classifyGooglePlacesConfidence"
    ],
    stationProcessing: [
      "createStationCandidateFromUserReportedPrice",
      "processStationCandidates"
    ],
    alerts: [
      "checkPriceAlerts",
      "checkPriceDropAlerts",
      "notificationService"
    ]
  },
  
  frozenPhase2Files: [
    "functions/deleteAllGooglePlacesPrices",
    "functions/verifyGooglePlacesPriceNormalization",
    "functions/deleteGooglePlacesPricesForReclassification",
    "functions/classifyPricePlausibility",
    "functions/classifyStationsRuleEngine",
    "functions/classifyGooglePlacesConfidence"
  ],
  
  governanceFiles: [
    "components/governance/AI_PROJECT_INSTRUCTIONS.jsx",
    "components/governance/Phase25ExecutionLogIndex.jsx",
    "components/governance/NextSafeStep.jsx",
    "components/governance/ARCHITECTURE_MAP.jsx"
  ],
  
  lastUpdated: "2026-03-11"
};

export default ARCHITECTURE_MAP;