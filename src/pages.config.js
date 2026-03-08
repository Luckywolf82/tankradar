/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import App from './pages/App';
import BackfillAssessment from './pages/BackfillAssessment';
import CandidateDiscoveryStatus from './pages/CandidateDiscoveryStatus';
import ComponentNamingReview from './pages/ComponentNamingReview';
import ConfidencePolicyReport from './pages/ConfidencePolicyReport';
import CoverageReport from './pages/CoverageReport';
import Dashboard from './pages/Dashboard';
import DataConsistencyDiagnosis from './pages/DataConsistencyDiagnosis';
import DataQualityDiagnostics from './pages/DataQualityDiagnostics';
import DiscoverStations from './pages/DiscoverStations';
import ExternalBrowserTest from './pages/ExternalBrowserTest';
import GroupReviewFixReport from './pages/GroupReviewFixReport';
import implementationreportUserreportedpolicy from './pages/ImplementationReport_UserReportedPolicy';
import ImportSystemReport from './pages/ImportSystemReport';
import LogPrice from './pages/LogPrice';
import MobileImplementationReport from './pages/MobileImplementationReport';
import MobileUXEnhancementReport from './pages/MobileUXEnhancementReport';
import ProductionModelLockdown from './pages/ProductionModelLockdown';
import Profile from './pages/Profile';
import ReviewQueue from './pages/ReviewQueue';
import SeedImport from './pages/SeedImport';
import SeedTrondheimStations from './pages/SeedTrondheimStations';
import Settings from './pages/Settings';
import StationCandidateReview from './pages/StationCandidateReview';
import StationImport from './pages/StationImport';
import Statistics from './pages/Statistics';
import SuperAdmin from './pages/SuperAdmin';
import SystemStatus from './pages/SystemStatus';
import UserReportedScanOperations from './pages/UserReportedScanOperations';
import UserReportedSystemIntegrationReport from './pages/UserReportedSystemIntegrationReport';
import ValidateStationData from './pages/ValidateStationData';
import verificationreportUserreportedenhancements from './pages/VerificationReport_UserReportedEnhancements';
import GenericNameGroupsReport from './pages/GenericNameGroupsReport';
import __Layout from './Layout.jsx';


export const PAGES = {
    "App": App,
    "BackfillAssessment": BackfillAssessment,
    "CandidateDiscoveryStatus": CandidateDiscoveryStatus,
    "ComponentNamingReview": ComponentNamingReview,
    "ConfidencePolicyReport": ConfidencePolicyReport,
    "CoverageReport": CoverageReport,
    "Dashboard": Dashboard,
    "DataConsistencyDiagnosis": DataConsistencyDiagnosis,
    "DataQualityDiagnostics": DataQualityDiagnostics,
    "DiscoverStations": DiscoverStations,
    "ExternalBrowserTest": ExternalBrowserTest,
    "GroupReviewFixReport": GroupReviewFixReport,
    "ImplementationReport_UserReportedPolicy": implementationreportUserreportedpolicy,
    "ImportSystemReport": ImportSystemReport,
    "LogPrice": LogPrice,
    "MobileImplementationReport": MobileImplementationReport,
    "MobileUXEnhancementReport": MobileUXEnhancementReport,
    "ProductionModelLockdown": ProductionModelLockdown,
    "Profile": Profile,
    "ReviewQueue": ReviewQueue,
    "SeedImport": SeedImport,
    "SeedTrondheimStations": SeedTrondheimStations,
    "Settings": Settings,
    "StationCandidateReview": StationCandidateReview,
    "StationImport": StationImport,
    "Statistics": Statistics,
    "SuperAdmin": SuperAdmin,
    "SystemStatus": SystemStatus,
    "UserReportedScanOperations": UserReportedScanOperations,
    "UserReportedSystemIntegrationReport": UserReportedSystemIntegrationReport,
    "ValidateStationData": ValidateStationData,
    "VerificationReport_UserReportedEnhancements": verificationreportUserreportedenhancements,
    "GenericNameGroupsReport": GenericNameGroupsReport,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};