import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Database,
  Search,
  ShieldCheck,
  FileText,
  BarChart2,
  Wrench,
  AlertTriangle,
  Zap,
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import DataSourceStatus from "../components/admin/DataSourceStatus";
import ReviewQueueSummary from "../components/admin/ReviewQueueSummary";
import StationDiscoveryQueue from "../components/admin/StationDiscoveryQueue";
import DuplicateDetectionScanner from "../components/admin/DuplicateDetectionScanner";
import DuplicateDetectionResults from "../components/admin/DuplicateDetectionResults";
import DuplicateRemediationPanel from "../components/admin/DuplicateRemediationPanel";

const activeSections = [
  {
    title: "System",
    icon: ShieldCheck,
    color: "text-green-700",
    bg: "bg-green-50",
    pages: [
      { label: "Systemstatus", page: "SystemStatus", desc: "Nøkkeltall for data, matching og systemhelse" },
    ],
  },
  {
    title: "Drift",
    icon: Search,
    color: "text-amber-600",
    bg: "bg-amber-50",
    pages: [
      { label: "Seed Trondheim Stations", page: "SeedTrondheimStations", desc: "Importer kjent liste av Trondheim-stasjoner", icon: Zap },
      { label: "Seed Import (CSV)", page: "SeedImport", desc: "Importer stasjonsliste fra CSV-fil i batch" },
      { label: "Station Import (OSM)", page: "StationImport", desc: "Importer stasjonerkatalog fra OpenStreetMap" },
      { label: "Discover from Google Places", page: "DiscoverStations", desc: "Søk og importer kandidater fra Google Places" },
      { label: "Review Station Candidates", page: "StationCandidateReview", desc: "Godkjenn nye stasjonskandidater" },
      { label: "Review Queue", page: "ReviewQueue", desc: "Manuell stasjonsmatching for brukerrapporter" },
      { label: "User Reported Scan Operations", page: "UserReportedScanOperations", desc: "Scan/OCR-operasjoner og historikk" },
      { label: "User Reported System Integration", page: "UserReportedSystemIntegrationReport", desc: "Systemintegrasjonsrapport" },
    ],
  },
  {
    title: "Datakvalitet",
    icon: Database,
    color: "text-blue-600",
    bg: "bg-blue-50",
    pages: [
      { label: "Validate Station Data", page: "ValidateStationData", desc: "Sjekk dubletter og datakvalitet i Station-tabell" },
      { label: "Generiske navn — gruppering", page: "GenericNameGroupsReport", desc: "Grupper stasjoner med generiske navn etter prefix og geografisk nærhet" },
      { label: "Coverage Report", page: "CoverageReport", desc: "Datadekning per kilde og region" },
      { label: "Data Quality Diagnostics", page: "DataQualityDiagnostics", desc: "Kvalitetsstatus på prisdata" },
    ],
  },
  {
    title: "Systemmodell",
    icon: BarChart2,
    color: "text-purple-600",
    bg: "bg-purple-50",
    pages: [
      { label: "Production Model Lockdown", page: "ProductionModelLockdown", desc: "Produksjonsmodell og låsestatus" },
      { label: "Confidence Policy", page: "ConfidencePolicyReport", desc: "Konfidenspoeng-policy dokumentasjon" },
    ],
  },
];

const duplicateSections = [
  {
    title: "Datakvalitet",
    icon: Database,
    color: "text-blue-600",
    bg: "bg-blue-50",
    pages: [
      { label: "Duplicate Preview", page: "StationDuplicatePreview", desc: "Forhåndsvisning av potensielle duplikater" },
    ],
  },
];

const archiveSections = [
  {
    title: "Arkiv",
    icon: FileText,
    color: "text-slate-500",
    bg: "bg-slate-100",
    pages: [
      { label: "Verification Report", page: "VerificationReport_UserReportedEnhancements", desc: "Verifikasjonsrapport user reported" },
      { label: "Implementation Report", page: "ImplementationReport_UserReportedPolicy", desc: "Implementasjonsrapport" },
      { label: "Mobile UX Enhancement Report", page: "MobileUXEnhancementReport", desc: "Forbedringer i mobil-UX" },
      { label: "Mobile Implementation Report", page: "MobileImplementationReport", desc: "Implementasjonsrapport for mobil" },
      { label: "Component Naming Review", page: "ComponentNamingReview", desc: "Gjennomgang av komponentnavn" },
      { label: "Data Consistency Diagnosis", page: "DataConsistencyDiagnosis", desc: "Konsistenssjekk på tvers av entiteter" },
      { label: "Backfill Assessment", page: "BackfillAssessment", desc: "Vurdering av historisk backfill" },
    ],
  },
];

function AdminSection({ title, icon: Icon, color, bg, pages }) {
  return (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <div className={`p-1.5 rounded-lg ${bg}`}>
            <Icon size={16} className={color} />
          </div>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {pages.map(({ label, page, desc }) => (
            <Link
              key={page}
              to={createPageUrl(page)}
              className="flex flex-col p-3 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-colors"
            >
              <span className="font-medium text-slate-800 text-sm">{label}</span>
              <span className="text-xs text-slate-500 mt-0.5">{desc}</span>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function SuperAdmin() {
  const [showArchive, setShowArchive] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [duplicateResults, setDuplicateResults] = useState(null);
  const [duplicateError, setDuplicateError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentUser = await base44.auth.me();
        if (!currentUser || currentUser.role !== "admin") {
          navigate(createPageUrl("Dashboard"));
          return;
        }
        setUser(currentUser);
      } catch {
        navigate(createPageUrl("Dashboard"));
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, [navigate]);

  if (loading) {
    return <div className="p-6 text-center">Laster...</div>;
  }

  if (!user || user.role !== "admin") {
    return null;
  }

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-6">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Wrench size={20} className="text-slate-600" />
          <h1 className="text-3xl font-bold text-slate-900">SuperAdmin</h1>
        </div>
        <p className="text-slate-600">Admin-panel for diagnostikk, rapporter og systemkontroll</p>
        <div className="mt-3 flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          <AlertTriangle size={13} />
          <span>Kun tilgjengelig for administratorer</span>
        </div>
      </div>

      {/* Operativ oversikt */}
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Operativ oversikt</p>
      <DataSourceStatus />
      <ReviewQueueSummary />
      <StationDiscoveryQueue />

      {/* Duplicate Detection Preview */}
      <div className="mt-6 mb-6 border-t pt-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Datakvalitet — Duplikatvarsling</p>
        <DuplicateDetectionScanner 
          onResults={setDuplicateResults} 
          onError={setDuplicateError}
        />
        {duplicateError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-sm text-red-800">
            {duplicateError}
          </div>
        )}
        {duplicateResults && (
          <DuplicateDetectionResults results={duplicateResults} />
        )}
      </div>

      {/* Phase 3 — Duplicate Remediation (read-only preview) */}
      <div className="mt-6 mb-6 border-t pt-6">
        <div className="flex items-center gap-2 mb-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Duplikatretting — Phase 3</p>
          <span className="text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200 rounded px-2 py-0.5">Preview only</span>
        </div>
        <div className="mb-3 text-xs text-slate-500">
          No merge or delete actions are enabled. Canonical station decisions are not active yet.
        </div>
        <DuplicateRemediationPanel />
      </div>

      {/* Aktive driftssider */}
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 mt-2">Driftssider</p>
      {activeSections.map(section => (
        <AdminSection key={section.title} {...section} />
      ))}

      {/* Arkiv toggle */}
      <button
        onClick={() => setShowArchive(v => !v)}
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors mb-4 mt-2"
      >
        <FileText size={15} />
        {showArchive ? "Skjul arkiv" : "Vis arkiv / historiske rapporter"}
      </button>

      {showArchive && (
        <>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Arkiv / Dokumentasjon</p>
          {archiveSections.map(section => (
            <AdminSection key={section.title} {...section} />
          ))}
        </>
      )}
    </div>
  );
}