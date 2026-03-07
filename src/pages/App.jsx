import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "../Layout";
import { ThemeProvider } from "../components/ThemeProvider";
import { TabStateProvider } from "../components/mobile/TabStateProvider";
import ProtectedRoute from "../components/auth/ProtectedRoute";
import PageNotFound from "@/lib/PageNotFound";

// Public pages
import Dashboard from "./Dashboard";
import Statistics from "./Statistics";
import LogPrice from "./LogPrice";
import Settings from "./Settings";

// Protected pages
import Profile from "./Profile";
import ReviewQueue from "./ReviewQueue";
import SuperAdmin from "./SuperAdmin";

// Admin / diagnostic pages (all require admin role)
import ComponentNamingReview from "./ComponentNamingReview";
import DataConsistencyDiagnosis from "./DataConsistencyDiagnosis";
import DataQualityDiagnostics from "./DataQualityDiagnostics";
import BackfillAssessment from "./BackfillAssessment";
import CoverageReport from "./CoverageReport";
import ProductionModelLockdown from "./ProductionModelLockdown";
import MobileImplementationReport from "./MobileImplementationReport";
import MobileUXEnhancementReport from "./MobileUXEnhancementReport";
import UserReportedScanOperations from "./UserReportedScanOperations";
import VerificationReport_UserReportedEnhancements from "./VerificationReport_UserReportedEnhancements";
import ImplementationReport_UserReportedPolicy from "./ImplementationReport_UserReportedPolicy";
import ConfidencePolicyReport from "./ConfidencePolicyReport";
import UserReportedSystemIntegrationReport from "./UserReportedSystemIntegrationReport";

const publicPages = [
  { name: "Dashboard", path: "/", Component: Dashboard },
  { name: "Statistics", Component: Statistics },
  { name: "LogPrice", Component: LogPrice },
  { name: "Settings", Component: Settings },
];

const userPages = [
  { name: "Profile", Component: Profile, role: "user" },
];

const curatorPages = [
  { name: "ReviewQueue", Component: ReviewQueue, role: "curator" },
];

const adminPages = [
  { name: "SuperAdmin", Component: SuperAdmin, role: "admin" },
  { name: "ComponentNamingReview", Component: ComponentNamingReview, role: "admin" },
  { name: "DataConsistencyDiagnosis", Component: DataConsistencyDiagnosis, role: "admin" },
  { name: "DataQualityDiagnostics", Component: DataQualityDiagnostics, role: "admin" },
  { name: "BackfillAssessment", Component: BackfillAssessment, role: "admin" },
  { name: "CoverageReport", Component: CoverageReport, role: "admin" },
  { name: "ProductionModelLockdown", Component: ProductionModelLockdown, role: "admin" },
  { name: "MobileImplementationReport", Component: MobileImplementationReport, role: "admin" },
  { name: "MobileUXEnhancementReport", Component: MobileUXEnhancementReport, role: "admin" },
  { name: "UserReportedScanOperations", Component: UserReportedScanOperations, role: "admin" },
  { name: "VerificationReport_UserReportedEnhancements", Component: VerificationReport_UserReportedEnhancements, role: "admin" },
  { name: "ImplementationReport_UserReportedPolicy", Component: ImplementationReport_UserReportedPolicy, role: "admin" },
  { name: "ConfidencePolicyReport", Component: ConfidencePolicyReport, role: "admin" },
  { name: "UserReportedSystemIntegrationReport", Component: UserReportedSystemIntegrationReport, role: "admin" },
];

function makeRoute({ name, path, Component, role }) {
  const resolvedPath = path || `/${name.toLowerCase()}`;
  const element = role ? (
    <Layout currentPageName={name}>
      <ProtectedRoute requiredRole={role}>
        <Component />
      </ProtectedRoute>
    </Layout>
  ) : (
    <Layout currentPageName={name}>
      <Component />
    </Layout>
  );
  return <Route key={name} path={resolvedPath} element={element} />;
}

export default function App() {
  return (
    <ThemeProvider>
      <TabStateProvider>
        <BrowserRouter>
          <Routes>
            {publicPages.map(makeRoute)}
            {userPages.map(makeRoute)}
            {curatorPages.map(makeRoute)}
            {adminPages.map(makeRoute)}
            <Route path="*" element={<PageNotFound />} />
          </Routes>
        </BrowserRouter>
      </TabStateProvider>
    </ThemeProvider>
  );
}