import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Home,
  ClipboardList,
  FlaskConical,
  Database,
  Gauge,
  Map,
  AlertTriangle,
  ExternalLink,
  Wrench,
  Archive,
  Search,
} from "lucide-react";
import { base44 } from "@/api/base44Client";

import AdminStartHer from "../components/admin/AdminStartHer";
import ReviewQueueSummary from "../components/admin/ReviewQueueSummary";
import StationDiscoveryQueue from "../components/admin/StationDiscoveryQueue";
import AdminReviewWorkbench from "../components/admin/AdminReviewWorkbench";
import Phase2MatchingPreviewPanel from "../components/admin/Phase2MatchingPreviewPanel";
import Phase2MatchingAuditPanel from "../components/admin/Phase2MatchingAuditPanel";
import Phase2MatchingTestHarness from "../components/admin/Phase2MatchingTestHarness";
import DuplicateWorkbench from "../components/admin/DuplicateWorkbench";
import SystemHealthDashboard from "../components/admin/SystemHealthDashboard";
import AdminOperationsPanel from "../components/admin/AdminOperationsPanel";
import MasteringMetrics from "../components/admin/MasteringMetrics";
import RoadmapAdminPanel from "../components/admin/RoadmapAdminPanel";
import ContractCompliancePanel from "../components/admin/ContractCompliancePanel";
import StationEditor from "../components/admin/StationEditor";

// ─── Section header helper ────────────────────────────────────────────────────

function SectionHeader({ title, description }) {
  return (
    <div className="mb-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">{title}</p>
      <p className="text-sm text-slate-500">{description}</p>
    </div>
  );
}

// ─── Mode badge ───────────────────────────────────────────────────────────────

function ModeBadge({ type }) {
  const styles = {
    analyse: "bg-blue-100 text-blue-700 border-blue-200",
    vurdering: "bg-amber-100 text-amber-700 border-amber-200",
    lesemodus: "bg-slate-100 text-slate-600 border-slate-200",
    fareomrade: "bg-red-100 text-red-700 border-red-200",
  };
  const labels = {
    analyse: "Analyse",
    vurdering: "Manuell vurdering",
    lesemodus: "Lesemodus",
    fareomrade: "⚠ Fareområde",
  };
  return (
    <span className={`text-xs font-medium border rounded px-2 py-0.5 ${styles[type] || styles.lesemodus}`}>
      {labels[type] || type}
    </span>
  );
}

// ─── Link grid ────────────────────────────────────────────────────────────────

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
            {desc && <p className="text-xs text-slate-500 mt-0.5">{desc}</p>}
          </div>
          <ExternalLink size={13} className="text-slate-400 shrink-0 ml-2" />
        </Link>
      ))}
    </div>
  );
}

// ─── Operator links ───────────────────────────────────────────────────────────

const reviewLinks = [
  { label: "Review-kø", page: "ReviewQueue", desc: "Manuell stasjonsmatching for brukerrapporter" },
  { label: "Stasjonskandidater til godkjenning", page: "StationCandidateReview", desc: "Godkjenn eller avvis nye stasjonskandidater" },
  { label: "Skann og OCR-operasjoner", page: "UserReportedScanOperations", desc: "Historikk og status for scan-operasjoner" },
  { label: "Systemintegrasjonsrapport", page: "UserReportedSystemIntegrationReport", desc: "Integrasjonsrapport for brukerrapporterte priser" },
];

const operationsLinks = [
  { label: "Importer Trondheim-stasjoner", page: "SeedTrondheimStations", desc: "Importer kjent liste over Trondheim-stasjoner" },
  { label: "Batch-import CSV", page: "SeedImport", desc: "Importer stasjonsliste fra CSV-fil" },
  { label: "Importer fra OpenStreetMap", page: "StationImport", desc: "Importer stasjonskatalog fra OSM" },
  { label: "Finn stasjoner via Google Places", page: "DiscoverStations", desc: "Søk og importer kandidater fra Google Places" },
];

const dataQualityLinks = [
  { label: "Valider stasjonsdata", page: "ValidateStationData", desc: "Sjekk duplikater og datakvalitet" },
  { label: "Generiske navn — gruppering", page: "GenericNameGroupsReport", desc: "Grupper stasjoner med generiske navn" },
  { label: "Dekningsrapport", page: "CoverageReport", desc: "Datadekning per kilde og region" },
  { label: "Datakvalitetsdiagnostikk", page: "DataQualityDiagnostics", desc: "Kvalitetsstatus på prisdata" },
  { label: "Produksjonsmodell-låsing", page: "ProductionModelLockdown", desc: "Produksjonsmodell og låsestatus" },
  { label: "Konfidenspolicy", page: "ConfidencePolicyReport", desc: "Konfidenspoeng-policy dokumentasjon" },
];

const archiveLinks = [
  { label: "Canonical FuelPrice Contract Audit", page: "CanonicalContractAuditReport", desc: "Spec-only arkitekturaudit — Station Resolution Pipeline og kontraktsmatrise" },
  { label: "Systemstatus (full)", page: "SystemStatus", desc: "Nøkkeltall for data, matching og systemhelse" },
  { label: "Verifikasjonsrapport", page: "VerificationReport_UserReportedEnhancements", desc: "Verifikasjonsrapport user reported" },
  { label: "Implementasjonsrapport", page: "ImplementationReport_UserReportedPolicy", desc: "Implementasjonsrapport" },
  { label: "Mobil-UX-forbedringsrapport", page: "MobileUXEnhancementReport", desc: "Forbedringer i mobil-UX" },
  { label: "Datakonsistensdiagnose", page: "DataConsistencyDiagnosis", desc: "Konsistenssjekk på tvers av entiteter" },
  { label: "Backfill-vurdering", page: "BackfillAssessment", desc: "Vurdering av historisk backfill" },
  { label: "Komponentnavngjennomgang", page: "ComponentNamingReview", desc: "Gjennomgang av komponentnavn" },
];

// ─── Main page ────────────────────────────────────────────────────────────────

export default function SuperAdmin() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("startHer");
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

  if (loading) return <div className="p-6 text-center text-slate-400 text-sm">Laster administrasjon...</div>;
  if (!user || user.role !== "admin") return null;

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6">
      {/* Header */}
      <div className="mb-5">
        <div className="flex items-center gap-2 mb-1">
          <Wrench size={18} className="text-slate-600" />
          <h1 className="text-xl font-bold text-slate-900">Administrasjon</h1>
        </div>
        <p className="text-sm text-slate-500">Operativt admin-panel for review, matching, duplikater og drift.</p>
        <div className="mt-2 flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 w-fit">
          <AlertTriangle size={12} />
          <span>Kun tilgjengelig for administratorer</span>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6 flex flex-wrap h-auto gap-1 bg-slate-100 p-1 rounded-xl">
          <TabsTrigger value="startHer" className="flex items-center gap-1.5 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Home size={13} />
            Start her
          </TabsTrigger>
          <TabsTrigger value="behandle" className="flex items-center gap-1.5 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <ClipboardList size={13} />
            Behandle saker
          </TabsTrigger>
          <TabsTrigger value="testogvurder" className="flex items-center gap-1.5 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <FlaskConical size={13} />
            Test og vurder
          </TabsTrigger>
          <TabsTrigger value="duplikater" className="flex items-center gap-1.5 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Database size={13} />
            Duplikater
          </TabsTrigger>
          <TabsTrigger value="drift" className="flex items-center gap-1.5 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Gauge size={13} />
            Drift og systemstatus
          </TabsTrigger>
          <TabsTrigger value="stasjoner" className="flex items-center gap-1.5 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Search size={13} />
            Stasjoner
          </TabsTrigger>
          <TabsTrigger value="planoghistorikk" className="flex items-center gap-1.5 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Map size={13} />
            Plan og historikk
          </TabsTrigger>
        </TabsList>

        {/* ── 1. START HER ── */}
        <TabsContent value="startHer">
          <AdminStartHer onNavigate={setActiveTab} />
        </TabsContent>

        {/* ── 2. BEHANDLE SAKER ── */}
        <TabsContent value="behandle" className="space-y-6">
          <SectionHeader
            title="Behandle saker"
            description="Her finner du to uavhengige køer som krever manuell behandling. Les forklaringen under hver seksjon før du starter."
          />

          {/* Explanation of the two queues */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-2">
            <p className="text-xs font-semibold text-slate-700 mb-2">To ulike køer — ikke bland dem</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-600">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="font-semibold text-amber-800 mb-1">Kø 1: Review-kø (prismatching)</p>
                <p>FuelPrice-poster som matchingmotoren var for usikker til å koble. Behandles i <strong>ReviewQueue</strong>.</p>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="font-semibold text-green-800 mb-1">Kø 2: Stasjonskatalog (kandidater + review)</p>
                <p>Stasjonskandidater og stasjonsreview-saker. Behandles i <strong>Stasjonsmastering</strong>.</p>
              </div>
            </div>
          </div>

          {/* Review-kø task card */}
          <div className="border border-amber-200 bg-amber-50 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <ClipboardList size={15} className="text-amber-600" />
              <p className="text-sm font-semibold text-amber-800">Review-kø — prismatching</p>
              <ModeBadge type="vurdering" />
            </div>
            <p className="text-xs text-slate-600 mb-3">
              <strong>Hva er dette?</strong> Priser der matchingmotoren ikke hadde høy nok sikkerhet til å koble dem automatisk til en stasjon.<br />
              <strong>Når brukes det?</strong> Daglig — gjennomgå og avklar for å holde pipeline oppdatert.<br />
              <strong>Neste steg:</strong> Åpne review-kø-siden og behandle sak for sak.
            </p>
            <ReviewQueueSummary />
            <Link
              to={createPageUrl("ReviewQueue")}
              className="inline-flex items-center gap-1.5 px-3 py-2 mt-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <ClipboardList size={14} />
              Åpne review-kø
            </Link>
          </div>

          {/* Stasjonskatalog task card */}
          <div className="border border-green-200 bg-green-50 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <ExternalLink size={15} className="text-green-600" />
              <p className="text-sm font-semibold text-green-800">Stasjonskatalog — kandidater og review</p>
              <ModeBadge type="vurdering" />
            </div>
            <p className="text-xs text-slate-600 mb-3">
              <strong>Hva er dette?</strong> Stasjonskandidater (fra Google Places m.fl.) som venter på godkjenning, og eksisterende stasjoner flagget for gjennomgang.<br />
              <strong>Når brukes det?</strong> Etter at du har kjørt trygge automatiske steg i Drift. Behandle resten manuelt her.<br />
              <strong>Neste steg:</strong> Åpne Stasjonsmastering og følg den stegvise arbeidsflyten.
            </p>
            <Link
              to={createPageUrl("StationCandidateReview")}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <ExternalLink size={13} />
              Åpne Stasjonsmastering
            </Link>
          </div>

          {/* Nye og uavklarte stasjoner */}
          <div className="border-t pt-5">
            <div className="flex items-center gap-2 mb-3">
              <p className="text-sm font-semibold text-slate-700">Umatchede stasjonsposter</p>
              <ModeBadge type="lesemodus" />
            </div>
            <p className="text-xs text-slate-500 mb-3">
              Prisrapporter der systemet ikke fant noen trygg stasjon å koble til. Kun oversikt — behandling skjer i Stasjonsmastering.
            </p>
            <StationDiscoveryQueue />
          </div>

          {/* Additional links */}
          <div className="border-t pt-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Alle verktøy for behandling</p>
            <LinkGrid links={reviewLinks} />
          </div>
        </TabsContent>

        {/* ── 3. TEST OG VURDER ── */}
        <TabsContent value="testogvurder" className="space-y-6">
          <SectionHeader
            title="Test og vurder"
            description="Bruk matching-preview for å forstå hvordan systemet tolker et stasjonsnavn. Alt her er kun lesemodus — ingenting lagres eller endres."
          />

          <div>
            <div className="flex items-center gap-2 mb-3">
              <p className="text-sm font-semibold text-slate-700">Matching-preview</p>
              <ModeBadge type="lesemodus" />
              <ModeBadge type="analyse" />
            </div>
            <p className="text-xs text-slate-500 mb-3">
              Hva er dette? Viser hvordan matchingmotoren tolker et stasjonsnavn steg for steg.<br />
              Når brukes det? Når du vil forstå hvorfor en sak endte i review, eller for å teste ukjente stasjonsnavn.<br />
              Neste steg: Legg inn navn, kjede og by — se tolket kjede, kandidater og endelig beslutning.
            </p>
            <Phase2MatchingPreviewPanel />
          </div>

          <div className="border-t pt-5">
            <div className="flex items-center gap-2 mb-3">
              <p className="text-sm font-semibold text-slate-700">Matching-regler og valideringsstatus</p>
              <ModeBadge type="lesemodus" />
            </div>
            <p className="text-xs text-slate-500 mb-3">
              Hva er dette? Viser alle låste governance-regler og valideringsstatus for Phase 2-matchingen.<br />
              Kan ikke endres herfra — kun for dokumentasjon og referanse.
            </p>
            <Phase2MatchingAuditPanel />
          </div>

          <div className="border-t pt-5">
            <div className="flex items-center gap-2 mb-3">
              <p className="text-sm font-semibold text-slate-700">Batchtest av matching</p>
              <ModeBadge type="analyse" />
            </div>
            <p className="text-xs text-slate-500 mb-3">
              Hva er dette? Kjør flere testcaser mot matchingmotoren på én gang og eksporter resultat.<br />
              Når brukes det? For systematisk verifisering — ikke daglig drift.
            </p>
            <Phase2MatchingTestHarness />
          </div>
        </TabsContent>

        {/* ── 4. DUPLIKATER ── */}
        <TabsContent value="duplikater" className="space-y-6">
          <SectionHeader
            title="Duplikater"
            description="Oppdag, vurder og forhåndsvis opprydding av duplikate stasjonsposter. Start alltid med skann — og utfør aldri sammenslåing uten tydelig forhåndsvisning."
          />

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-800 space-y-1.5">
            <p className="font-semibold flex items-center gap-2"><AlertTriangle size={13} /> Viktig om dette panelet</p>
            <p>Skanningen er kun analyse — ingen data endres under skann eller forhåndsvisning.</p>
            <p className="font-medium">Live sammenslåing er ikke aktiv. Dette panelet er kun for forhåndsvisning og dokumentasjon.</p>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <p className="text-sm font-semibold text-slate-700">Skann, vurder og forhåndsvis</p>
              <ModeBadge type="analyse" />
            </div>
            <p className="text-xs text-slate-500 mb-3">
              Hva er dette? Analyserer en by for stasjonsposter som kan være duplikater basert på GPS og navn.<br />
              Neste steg: Kjør skann → Se resultater → Forhåndsvis konsekvenser av sammenslåing.
            </p>
            <DuplicateWorkbench />
          </div>
        </TabsContent>

        {/* ── 5. DRIFT OG SYSTEMSTATUS ── */}
        <TabsContent value="drift" className="space-y-6">
          <SectionHeader
            title="Drift og systemstatus"
            description="Systemhelse, datakildestatus og driftsoperasjoner. Kjør trygge automatiseringer HER først — gå deretter til Stasjonsmastering for manuell behandling."
          />

          {/* Workflow reminder */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-800 space-y-1.5">
            <p className="font-semibold">Anbefalt arbeidsflyt</p>
            <ol className="list-decimal list-inside space-y-0.5">
              <li>Kjør trygge automatiske steg nedenfor (pipeline, auto-bekreft, geocoding)</li>
              <li>Gå til <strong>Stasjonsmastering</strong> for å behandle gjenværende saker manuelt</li>
              <li>Kontroller at køen synker og konsistenssjekken er grønn</li>
            </ol>
          </div>

          {/* Systemhelse og datakilder */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <p className="text-sm font-semibold text-slate-700">Systemstatus</p>
              <ModeBadge type="lesemodus" />
            </div>
            <SystemHealthDashboard />
          </div>

          {/* Mastering-metrikk */}
          <div className="border-t pt-5">
            <div className="flex items-center gap-2 mb-3">
              <p className="text-sm font-semibold text-slate-700">Mastering-metrikk og eksport</p>
              <ModeBadge type="lesemodus" />
            </div>
            <p className="text-xs text-slate-500 mb-3">
              Oversikt over stasjonskatalog, kandidater, reviewstatus og datakvalitet. Eksport er trygt.
            </p>
            <MasteringMetrics />
          </div>

          {/* Driftsoperasjoner — canonical bulk ops */}
          <div className="border-t pt-5">
            <div className="flex items-center gap-2 mb-3">
              <p className="text-sm font-semibold text-slate-700">Trygge automatiske kjøringer og manuell kontroll</p>
              <ModeBadge type="vurdering" />
            </div>
            <p className="text-xs text-slate-500 mb-3">
              <strong>Hva er dette?</strong> Bulk-operasjoner for stasjonskatalog og pipeline. Kjør disse FØR du starter manuell behandling i Stasjonsmastering.<br />
              <strong>DRIFT</strong> = trygge operasjoner. <strong>FAREOMRÅDE</strong> = krever bekreftelse og forhåndsvisning først.
            </p>
            <AdminOperationsPanel onLoadCandidates={() => {}} />
            <p className="text-xs text-slate-400 mt-2">
              Merk: Resultater av bulk-operasjoner vises i systemloggen. Oppdaterte tellere ser du i Stasjonsmastering.
            </p>
          </div>

          {/* Contract compliance audit */}
          <div className="border-t pt-5">
            <div className="flex items-center gap-2 mb-3">
              <p className="text-sm font-semibold text-slate-700">FuelPrice kontraktsvalidering</p>
              <ModeBadge type="analyse" />
            </div>
            <p className="text-xs text-slate-500 mb-3">
              Kjør en read-only validering av alle FuelPrice-records mot canonical contract v1.3.2. Identifiserer write-gate violations og SRP-bypass-mønstre per kilde.
            </p>
            <ContractCompliancePanel />
          </div>

          {/* Datakvalitet og importlenker */}
          <div className="border-t pt-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Import og datakvalitet</p>
            <LinkGrid links={[...operationsLinks, ...dataQualityLinks]} />
          </div>
        </TabsContent>

        {/* ── 6. STASJONER ── */}
        <TabsContent value="stasjoner" className="space-y-4">
          <SectionHeader
            title="Stasjonssøk og redigering"
            description="Søk opp hvilken som helst stasjon etter navn, kjede, by eller stasjons-ID. Rediger felt, vis i kart eller slett stasjonen."
          />
          <StationEditor />
        </TabsContent>

        {/* ── 7. PLAN OG HISTORIKK ── */}
        <TabsContent value="planoghistorikk" className="space-y-6">
          <SectionHeader
            title="Plan og historikk"
            description="Produktveikart, historiske rapporter og arkiv. Sekundær informasjon — ikke nødvendig for daglig drift."
          />

          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50">
            <div className="flex items-center gap-2 mb-1">
              <Archive size={14} className="text-slate-500" />
              <p className="text-sm font-semibold text-slate-700">Canonical FuelPrice Contract Audit</p>
              <ModeBadge type="lesemodus" />
            </div>
            <p className="text-xs text-slate-500 mb-3">Spec-only arkitekturaudit — Station Resolution Pipeline og FuelPrice kontraktsmatrise (2026-03-19)</p>
            <Link
              to="/CanonicalContractAuditReport"
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <ExternalLink size={13} />
              Åpne rapport / last ned PDF
            </Link>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-3">
              <p className="text-sm font-semibold text-slate-700">Veikart — produktplan</p>
              <ModeBadge type="lesemodus" />
            </div>
            <p className="text-xs text-slate-500 mb-3">
              Kun lesemodus — oversikt over planlagte og aktive funksjoner. Kilde: ROADMAP.jsx.
            </p>
            <RoadmapAdminPanel />
          </div>

          <div className="border-t pt-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Historiske rapporter og arkiv</p>
            <LinkGrid links={archiveLinks} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}