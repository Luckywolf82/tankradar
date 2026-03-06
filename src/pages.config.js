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
import BackfillAssessment from './pages/BackfillAssessment';
import CoverageReport from './pages/CoverageReport';
import Dashboard from './pages/Dashboard';
import DataQualityDiagnostics from './pages/DataQualityDiagnostics';
import LogPrice from './pages/LogPrice';
import Statistics from './pages/Statistics';
import UserReportedScanOperations from './pages/UserReportedScanOperations';
import ConfidencePolicyReport from './pages/ConfidencePolicyReport';
import implementationreportUserreportedpolicy from './pages/ImplementationReport_UserReportedPolicy';
import verificationreportUserreportedenhancements from './pages/VerificationReport_UserReportedEnhancements';
import ProductionModelLockdown from './pages/ProductionModelLockdown';
import __Layout from './Layout.jsx';


export const PAGES = {
    "BackfillAssessment": BackfillAssessment,
    "CoverageReport": CoverageReport,
    "Dashboard": Dashboard,
    "DataQualityDiagnostics": DataQualityDiagnostics,
    "LogPrice": LogPrice,
    "Statistics": Statistics,
    "UserReportedScanOperations": UserReportedScanOperations,
    "ConfidencePolicyReport": ConfidencePolicyReport,
    "ImplementationReport_UserReportedPolicy": implementationreportUserreportedpolicy,
    "VerificationReport_UserReportedEnhancements": verificationreportUserreportedenhancements,
    "ProductionModelLockdown": ProductionModelLockdown,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};