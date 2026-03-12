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
  Map,
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
import RoadmapAdminPanel from "../components/admin/RoadmapAdminPanel";

// ─── Link grids ──────────────────────────────────────────────────────────────

const operationsLinks = [
  { label: "Seed Trondheim-stasjoner", page: "SeedTrondheimStations", desc: "Importer kjent liste av Trondheim-stasjoner" },
  { label: "Seed Import (CSV)", page: "SeedImport", desc: "Importer stasjonsliste fra CSV-fil i batch" },
  { label: "Stasjon Import (OSM)", page: "StationImport", desc: "Importer stasjonskatalog fra OpenStreetMap" },
  { label: "Oppdag fra Google Places", page: "DiscoverStations", desc: "Søk og importer kandidater fra Google Places" },
];

const dataQualityLinks = [
  { label: "Valider stasjonsdata", page: "ValidateStationData", desc: "Sjekk dubletter og datakvalitet i Station-tabell" },
  { label: "Generiske navn — gruppering", page: "GenericNameGroupsReport", desc: "Grupper stasjoner med generiske navn" },
  { label: "Dekningsrapport", page: "CoverageReport", desc: "Datadekning per kilde og region" },
  { label: "Datakvalitetsdiagnostikk", page: "DataQualityDiagnostics", desc: "Kvalitetsstatus på prisdata" },
  { label: "Produksjonsmodell-låsing", page: "ProductionModelLockdown", desc: "Produksjonsmodell og låsestatus" },
  { label: "Konfidenspolicy", page: "ConfidencePolicyReport", desc: "Konfidenspoeng-policy dokumentasjon" },
];

const archiveLinks = [
  { label: "Verifikasjonsrapport", page: "VerificationReport_UserReportedEnhancements", desc: "Verifikasjonsrapport user reported" },
  { label: "Implementasjonsrapport", page: "ImplementationReport_UserReportedPolicy", desc: "Implementasjonsrapport" },
  { label: "Mobil-UX-forbedringsrapport", page: "MobileUXEnhancementReport", desc: "Forbedringer i mobil-UX" },
  { label: "Mobil-implementasjonsrapport", page: "MobileImplementationReport", desc: "Implementasjonsrapport for mobil" },
  { label: "Komponentnavngjennomgang", page: "ComponentNamingReview", desc: "Gjennomgang av komponentnavn" },
  { label: "Datakonsistensdiagnose", page: "DataConsistencyDiagnosis", desc: "Konsistenssjekk på tvers av entiteter" },
  { label: "Backfill-vurdering", page: "BackfillAssessment", desc: "Vurdering av historisk backfill" },
  { label: "Systemstatus", page: "SystemStatus", desc: "Nøkkeltall for data, matching og systemhelse" },
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

function SectionHeader({ title, description }) {
  return (
    <div className="mb-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">{title}</p>
      <p className="text-xs text-slate-500">{description}</p>
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
          <h1 className="text-2xl font-bold text-slate-900">Administrasjon</h1>
        </div>
        <p className="text-slate-500 text-sm">Operativt admin-panel for matching, review, duplikater og systemkontroll</p>
        <div className="mt-3 flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 w-fit">
          <AlertTriangle size={13} />
          <span>Kun tilgjengelig for administratorer</span>
        </div>
      </div>

      <Tabs defaultValue="systemstatus">
        <TabsList className="mb-6 flex flex-wrap h-auto gap-1">
          <TabsTrigger value="systemstatus" className="flex items-center gap-1.5">
            <LayoutDashboard size={14} />
            Systemstatus
          </TabsTrigger>
          <TabsTrigger value="matching" className="flex items-center gap-1.5">
            <FlaskConical size={14} />
            Matching
          </TabsTrigger>
          <TabsTrigger value="review" className="flex items-center gap-1.5">
            <ClipboardList size={14} />
            Review
          </TabsTrigger>
          <TabsTrigger value="duplikater" className="flex items-center gap-1.5">
            <Database size={14} />
            Duplikater
          </TabsTrigger>
          <TabsTrigger value="operasjoner" className="flex items-center gap-1.5">
            <Wrench size={14} />
            Operasjoner
          </TabsTrigger>
          <TabsTrigger value="roadmap" className="flex items-center gap-1.5">
            <ShieldCheck size={14} />
            Roadmap
          </TabsTrigger>
          <TabsTrigger value="arkiv" className="flex items-center gap-1.5">
            <Archive size={14} />
            Arkiv
          </TabsTrigger>
        </TabsList>

        {/* ── SYSTEMSTATUS OG KONTROLL ── */}
        <TabsContent value="systemstatus" className="space-y-6">
          <SectionHeader
            title="Systemstatus og kontroll"
            description="Her ser du om systemet er klart for arbeid, hvilke datakilder som er aktive, og hva som er trygt neste steg."
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ReviewQueueSummary />
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <ShieldCheck size={15} className="text-green-600" />
                  System og kildehelse
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-slate-500 mb-3">Se Duplikater-fanen for full kildestatus og duplikat-diagnostikk.</p>
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
          <DataSourceStatus />
          <StationDiscoveryQueue />
        </TabsContent>

        {/* ── MATCHING ── */}
        <TabsContent value="matching" className="space-y-6">
          <SectionHeader
            title="Matching – test og forstå beslutningen"
            description="Bruk denne delen for å se hvordan parser og matchingmotor tolker stasjonsnavn før noe sendes videre til review. Ingen data lagres fra disse verktøyene."
          />

          <div>
            <p className="text-xs font-semibold text-slate-500 mb-1 flex items-center gap-2">
              Preview
              <span className="font-normal bg-blue-100 text-blue-700 border border-blue-200 rounded px-2 py-0.5 text-xs">Lesemodus</span>
            </p>
            <p className="text-xs text-slate-500 mb-3">Test én stasjon mot matchingmotoren. Se tolkede verdier, kandidater og endelig beslutning.</p>
            <Phase2MatchingPreviewPanel />
          </div>

          <div className="border-t pt-6">
            <p className="text-xs font-semibold text-slate-500 mb-1 flex items-center gap-2">
              Matching-regler og valideringsstatus
              <span className="font-normal bg-amber-100 text-amber-700 border border-amber-200 rounded px-2 py-0.5 text-xs">Låste regler</span>
            </p>
            <p className="text-xs text-slate-500 mb-3">Frosne governance-regler, valideringsstatus og manuell testliste. Disse kan ikke justeres herfra.</p>
            <Phase2MatchingAuditPanel />
          </div>

          <div className="border-t pt-6">
            <p className="text-xs font-semibold text-slate-500 mb-1 flex items-center gap-2">
              Batchtest av matching
              <span className="font-normal bg-green-100 text-green-700 border border-green-200 rounded px-2 py-0.5 text-xs">Batchvalidering</span>
            </p>
            <p className="text-xs text-slate-500 mb-3">Kjør flere testcaser mot preview-modus og eksporter resultat. Brukes for verifikasjon, ikke daglig drift.</p>
            <Phase2MatchingTestHarness />
          </div>
        </TabsContent>

        {/* ── REVIEW OG MASTERING ── */}
        <TabsContent value="review" className="space-y-6">
          <SectionHeader
            title="Review-kø – saker som må avklares manuelt"
            description="Her behandles saker der matchingmotoren ikke kan avgjøre sikkert nok. Gjennomgå, koble eller la stå videre med dokumentert begrunnelse."
          />
          <AdminReviewWorkbench />
        </TabsContent>

        {/* ── DUPLIKATER OG DEDUPLISERING ── */}
        <TabsContent value="duplikater" className="space-y-6">
          <SectionHeader
            title="Duplikater – oppdag, vurder og forhåndsvis opprydding"
            description="Start alltid med deteksjon. Utfør aldri sammenslåing uten tydelig forhåndsvisning og godkjenning."
          />
          <SystemHealthDashboard />
          <div className="border-t pt-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Duplikatvarsling og skanning</p>
            <p className="text-xs text-slate-500 mb-3">Skann en by for potensielle duplikater. Kun forhåndsvisning — ingen data endres.</p>
            <DuplicateWorkbench />
          </div>
          <div className="border-t pt-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Diagnostikkverktøy</p>
            <LinkGrid links={dataQualityLinks} />
          </div>
        </TabsContent>

        {/* ── OPERASJONER OG FAREOMRÅDE ── */}
        <TabsContent value="operasjoner" className="space-y-6">
          <SectionHeader
            title="Operasjoner og fareområde"
            description="Dette området er for kontrollerte handlinger som krever ekstra varsomhet og tydelig bekreftelse. Bruk kun når du vet hva du gjør."
          />
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-start gap-2 text-xs text-amber-800">
            <AlertTriangle size={14} className="text-amber-600 shrink-0 mt-0.5" />
            <span>Handlinger her kan påvirke stasjonskatalog og datakvalitet. Start alltid med forhåndsvisning.</span>
          </div>
          <AdminReviewWorkbench />
          <div className="border-t pt-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Stasjonsdrift</p>
            <LinkGrid links={operationsLinks} />
          </div>
        </TabsContent>

        {/* ── ROADMAP ── */}
        <TabsContent value="roadmap">
          <RoadmapAdminPanel />
        </TabsContent>

        {/* ── ARKIV ── */}
        <TabsContent value="arkiv">
          <SectionHeader
            title="Arkiv og historiske rapporter"
            description="Tidligere implementasjonsrapporter, verifikasjonslogger og historiske diagnoseverktøy."
          />
          <LinkGrid links={archiveLinks} />
        </TabsContent>
      </Tabs>
    </div>
  );
}