import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ShieldCheck,
  Wrench,
  AlertTriangle,
  Database,
  ClipboardList,
  FlaskConical,
  Archive,
  LayoutDashboard,
  ExternalLink,
} from "lucide-react";
import { base44 } from "@/api/base44Client";

import ReviewQueueSummary from "../components/admin/ReviewQueueSummary";
import DataSourceStatus from "../components/admin/DataSourceStatus";
import SystemHealthPanel from "../components/admin/SystemHealthPanel";
import StationDiscoveryQueue from "../components/admin/StationDiscoveryQueue";
import AdminReviewWorkbench from "../components/admin/AdminReviewWorkbench";
import DuplicateWorkbench from "../components/admin/DuplicateWorkbench";
import SystemHealthDashboard from "../components/admin/SystemHealthDashboard";
import Phase2MatchingPreviewPanel from "../components/admin/Phase2MatchingPreviewPanel";
import Phase2MatchingAuditPanel from "../components/admin/Phase2MatchingAuditPanel";
import Phase2MatchingTestHarness from "../components/admin/Phase2MatchingTestHarness";

// ─── Link grids ──────────────────────────────────────────────────────────────

const operationsLinks = [
  { label: "Seed Trondheim Stations", page: "SeedTrondheimStations", desc: "Importer kjent liste av Trondheim-stasjoner" },
  { label: "Seed Import (CSV)", page: "SeedImport", desc: "Importer stasjonsliste fra CSV-fil i batch" },
  { label: "Station Import (OSM)", page: "StationImport", desc: "Importer stasjonskatalog fra OpenStreetMap" },
  { label: "Discover from Google Places", page: "DiscoverStations", desc: "Søk og importer kandidater fra Google Places" },
];

const dataQualityLinks = [
  { label: "Validate Station Data", page: "ValidateStationData", desc: "Sjekk dubletter og datakvalitet i Station-tabell" },
  { label: "Generiske navn — gruppering", page: "GenericNameGroupsReport", desc: "Grupper stasjoner med generiske navn" },
  { label: "Coverage Report", page: "CoverageReport", desc: "Datadekning per kilde og region" },
  { label: "Data Quality Diagnostics", page: "DataQualityDiagnostics", desc: "Kvalitetsstatus på prisdata" },
  { label: "Production Model Lockdown", page: "ProductionModelLockdown", desc: "Produksjonsmodell og låsestatus" },
  { label: "Confidence Policy", page: "ConfidencePolicyReport", desc: "Konfidenspoeng-policy dokumentasjon" },
];

const archiveLinks = [
  { label: "Verification Report", page: "VerificationReport_UserReportedEnhancements", desc: "Verifikasjonsrapport user reported" },
  { label: "Implementation Report", page: "ImplementationReport_UserReportedPolicy", desc: "Implementasjonsrapport" },
  { label: "Mobile UX Enhancement Report", page: "MobileUXEnhancementReport", desc: "Forbedringer i mobil-UX" },
  { label: "Mobile Implementation Report", page: "MobileImplementationReport", desc: "Implementasjonsrapport for mobil" },
  { label: "Component Naming Review", page: "ComponentNamingReview", desc: "Gjennomgang av komponentnavn" },
  { label: "Data Consistency Diagnosis", page: "DataConsistencyDiagnosis", desc: "Konsistenssjekk på tvers av entiteter" },
  { label: "Backfill Assessment", page: "BackfillAssessment", desc: "Vurdering av historisk backfill" },
  { label: "System Status", page: "SystemStatus", desc: "Nøkkeltall for data, matching og systemhelse" },
];

function LinkGrid({ links }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {links.map(({ label, page, desc }) => (
        <Link
          key={page}
          to={createPageUrl(page)}
          className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-colors"
        >
          <div>
            <p className="font-medium text-slate-800 text-sm">{label}</p>
            <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
          </div>
          <ExternalLink size={13} className="text-slate-400 shrink-0 ml-2" />
        </Link>
      ))}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function SuperAdmin() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
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

  if (loading) return <div className="p-6 text-center">Laster...</div>;
  if (!user || user.role !== "admin") return null;

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Wrench size={20} className="text-slate-600" />
          <h1 className="text-2xl font-bold text-slate-900">SuperAdmin</h1>
        </div>
        <p className="text-slate-500 text-sm">Admin-panel for diagnostikk, rapporter og systemkontroll</p>
        <div className="mt-3 flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 w-fit">
          <AlertTriangle size={13} />
          <span>Kun tilgjengelig for administratorer</span>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="mb-6 flex flex-wrap h-auto gap-1">
          <TabsTrigger value="overview" className="flex items-center gap-1.5">
            <LayoutDashboard size={14} />
            Overview
          </TabsTrigger>
          <TabsTrigger value="operations" className="flex items-center gap-1.5">
            <Wrench size={14} />
            Operations
          </TabsTrigger>
          <TabsTrigger value="dataquality" className="flex items-center gap-1.5">
            <Database size={14} />
            Data Quality
          </TabsTrigger>
          <TabsTrigger value="matchinglab" className="flex items-center gap-1.5">
            <FlaskConical size={14} />
            Matching Lab
          </TabsTrigger>
          <TabsTrigger value="archive" className="flex items-center gap-1.5">
            <Archive size={14} />
            Archive
          </TabsTrigger>
        </TabsList>

        {/* ── OVERVIEW ── */}
        <TabsContent value="overview" className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Operativ oversikt</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ReviewQueueSummary />
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <ShieldCheck size={15} className="text-green-600" />
                  System & Kildehelse
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-slate-500 mb-3">Se Data Quality-fanen for full kildestatus.</p>
                <Link
                  to={createPageUrl("SystemStatus")}
                  className="flex items-center gap-1.5 text-sm text-blue-600 hover:underline"
                >
                  <ExternalLink size={13} />
                  Åpne systemstatus
                </Link>
              </CardContent>
            </Card>
          </div>
          <StationDiscoveryQueue />
        </TabsContent>

        {/* ── OPERATIONS ── */}
        <TabsContent value="operations" className="space-y-6">
          <AdminReviewWorkbench />
          <div className="border-t pt-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Stasjonsdrift</p>
            <LinkGrid links={operationsLinks} />
          </div>
        </TabsContent>

        {/* ── DATA QUALITY ── */}
        <TabsContent value="dataquality" className="space-y-6">
          <SystemHealthDashboard />
          <div className="border-t pt-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Duplikatvarsling</p>
            <DuplicateWorkbench />
          </div>
          <div className="border-t pt-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Diagnostikkverktøy</p>
            <LinkGrid links={dataQualityLinks} />
          </div>
        </TabsContent>

        {/* ── MATCHING LAB ── */}
        <TabsContent value="matchinglab" className="space-y-6">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Phase 2 — Preview</p>
            <span className="text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200 rounded px-2 py-0.5">Read-only</span>
          </div>
          <p className="text-xs text-slate-500 mb-3">Verifiseringsverktøy for Phase 2 parser og matching-logikk. Ingen data skrives.</p>
          <Phase2MatchingPreviewPanel />

          <div className="border-t pt-6">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Phase 2 — Audit</p>
              <span className="text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200 rounded px-2 py-0.5">Governance locks</span>
            </div>
            <p className="text-xs text-slate-500 mb-3">Frosne governance-regler, valideringsstatus og manuell sjekkliste.</p>
            <Phase2MatchingAuditPanel />
          </div>

          <div className="border-t pt-6">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Phase 2 — Test Harness</p>
              <span className="text-xs font-medium bg-green-100 text-green-700 border border-green-200 rounded px-2 py-0.5">Batch validation</span>
            </div>
            <p className="text-xs text-slate-500 mb-3">Batch-testverktøy for manuell verifisering av matching-motor. Kjør testcaser og inspiser resultater.</p>
            <Phase2MatchingTestHarness />
          </div>
        </TabsContent>

        {/* ── ARCHIVE ── */}
        <TabsContent value="archive">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Arkiv / Historiske rapporter</p>
          <LinkGrid links={archiveLinks} />
        </TabsContent>
      </Tabs>
    </div>
  );
}