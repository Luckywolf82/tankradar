import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  ClipboardList,
  MapPin,
  Database,
  Loader2,
  Archive,
} from "lucide-react";

export default function AdminStartHer({ onNavigate }) {
  const [reviewCount, setReviewCount] = useState(null);
  const [discoveryCount, setDiscoveryCount] = useState(null);
  const [candidatePending, setCandidatePending] = useState(null);
  const [stationReviewPending, setStationReviewPending] = useState(null);
  const [failedSources, setFailedSources] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const SOURCES = ["GooglePlaces", "FuelFinder", "GlobalPetrolPrices", "user_reported"];
    Promise.all([
      base44.entities.FuelPrice.filter({ station_match_status: "review_needed_station_match" }, "-created_date", 500),
      base44.entities.FuelPrice.filter({ station_match_status: "no_safe_station_match" }, "-created_date", 500),
      base44.entities.FetchLog.list("-startedAt", 50),
      base44.entities.StationCandidate.filter({ status: "pending" }),
      base44.entities.StationReview.filter({ status: "pending" }),
    ]).then(([reviewItems, discoveryItems, logs, candidateItems, reviewItems2]) => {
      setReviewCount(reviewItems.length);
      setDiscoveryCount(discoveryItems.length);
      setCandidatePending(candidateItems.length);
      setStationReviewPending(reviewItems2.length);
      const failed = SOURCES.filter(src => {
        const latest = logs.find(l => l.sourceName === src);
        return latest && !latest.success;
      });
      setFailedSources(failed);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const totalCatalogPending = (candidatePending ?? 0) + (stationReviewPending ?? 0);

  const getRecommendedAction = () => {
    if (loading || reviewCount === null) return null;
    if (failedSources.length > 0)
      return {
        label: "Kritisk datakildeavvik oppdaget",
        detail: `Disse kildene har feilet: ${failedSources.join(", ")}. Gå til Drift og sjekk kildestatusen.`,
        tab: "drift",
        urgent: true,
      };
    if (reviewCount > 0)
      return {
        label: `${reviewCount} sak${reviewCount !== 1 ? "er" : ""} venter i review-køen`,
        detail: "Behandle disse for å holde matching-pipelinen oppdatert og unngå gammel ubehandlet data.",
        tab: "behandle",
        urgent: reviewCount > 10,
      };
    if (totalCatalogPending > 0)
      return {
        label: `${totalCatalogPending} sak${totalCatalogPending !== 1 ? "er" : ""} i stasjonskatalogen`,
        detail: `${candidatePending ?? 0} kandidater og ${stationReviewPending ?? 0} stasjonsreview venter. Åpne Stasjonsmastering for å behandle dem steg for steg.`,
        tab: "behandle",
        urgent: totalCatalogPending > 20,
      };
    if (discoveryCount > 0)
      return {
        label: `${discoveryCount} umatchede stasjonsposter`,
        detail: "Disse prisrapportene ble ikke koblet til en kjent stasjon. Gjennomgå og avklar.",
        tab: "behandle",
        urgent: false,
      };
    return {
      label: "Ingen kritiske saker — alt ser bra ut",
      detail: "Du kan kjøre en duplikatskann, sjekke systemstatus, eller se veikart for neste planlagte arbeid.",
      tab: "duplikater",
      urgent: false,
    };
  };

  const recommended = getRecommendedAction();

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-50 to-green-50 border border-slate-200 rounded-xl p-5">
        <h2 className="text-lg font-bold text-slate-800 mb-1">Start her</h2>
        <p className="text-sm text-slate-500">
          Oversikt over hva som trenger oppmerksomhet akkurat nå. Start med det som er anbefalt, eller naviger direkte til ønsket seksjon.
        </p>
      </div>

      {/* Priority summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">

        {/* FuelPrice review queue */}
        <button
          onClick={() => onNavigate("behandle")}
          className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-left hover:border-amber-400 hover:bg-amber-100 transition-colors group"
        >
          <div className="flex items-center gap-2 mb-2">
            <ClipboardList size={14} className="text-amber-600" />
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-600">Review-kø</span>
          </div>
          {loading ? (
            <Loader2 size={16} className="animate-spin text-slate-400" />
          ) : (
            <>
              <p className="text-2xl font-bold text-amber-700">{reviewCount}</p>
              <p className="text-xs text-amber-600 mt-0.5">
                {reviewCount === 0 ? "Ingen saker — bra!" : "prismatcher venter"}
              </p>
            </>
          )}
          <p className="text-xs text-amber-500 mt-2 flex items-center gap-1 group-hover:text-amber-700">
            Åpne review-kø <ArrowRight size={10} />
          </p>
        </button>

        {/* Station catalog */}
        <button
          onClick={() => onNavigate("behandle")}
          className="bg-green-50 border border-green-200 rounded-xl p-4 text-left hover:border-green-400 hover:bg-green-100 transition-colors group"
        >
          <div className="flex items-center gap-2 mb-2">
            <Database size={14} className="text-green-600" />
            <span className="text-xs font-semibold uppercase tracking-wider text-green-600">Stasjonskatalog</span>
          </div>
          {loading ? (
            <Loader2 size={16} className="animate-spin text-slate-400" />
          ) : (
            <>
              <p className="text-2xl font-bold text-green-700">{totalCatalogPending}</p>
              <p className="text-xs text-green-600 mt-0.5">
                {totalCatalogPending === 0 ? "Ingen ventende" : `${candidatePending ?? 0} kand. · ${stationReviewPending ?? 0} review`}
              </p>
            </>
          )}
          <p className="text-xs text-green-500 mt-2 flex items-center gap-1 group-hover:text-green-700">
            Åpne Stasjonsmastering <ArrowRight size={10} />
          </p>
        </button>

        {/* Unmatched stations */}
        <button
          onClick={() => onNavigate("behandle")}
          className="bg-purple-50 border border-purple-200 rounded-xl p-4 text-left hover:border-purple-400 hover:bg-purple-100 transition-colors group"
        >
          <div className="flex items-center gap-2 mb-2">
            <MapPin size={14} className="text-purple-600" />
            <span className="text-xs font-semibold uppercase tracking-wider text-purple-600">Uavklarte</span>
          </div>
          {loading ? (
            <Loader2 size={16} className="animate-spin text-slate-400" />
          ) : (
            <>
              <p className="text-2xl font-bold text-purple-700">{discoveryCount}</p>
              <p className="text-xs text-purple-600 mt-0.5">
                {discoveryCount === 0 ? "Ingen uavklarte" : "uten stasjonsmatch"}
              </p>
            </>
          )}
          <p className="text-xs text-purple-500 mt-2 flex items-center gap-1 group-hover:text-purple-700">
            Gå til Behandle saker <ArrowRight size={10} />
          </p>
        </button>

        {/* Data sources */}
        <button
          onClick={() => onNavigate("drift")}
          className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-left hover:border-slate-400 hover:bg-slate-100 transition-colors group"
        >
          <div className="flex items-center gap-2 mb-2">
            <Archive size={14} className="text-slate-600" />
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Datakilder</span>
          </div>
          {loading ? (
            <Loader2 size={16} className="animate-spin text-slate-400" />
          ) : failedSources.length > 0 ? (
            <>
              <p className="text-2xl font-bold text-red-600">{failedSources.length}</p>
              <p className="text-xs text-red-600 mt-0.5">kilde{failedSources.length !== 1 ? "r" : ""} med feil</p>
            </>
          ) : (
            <>
              <div className="flex items-center gap-1 mt-1">
                <CheckCircle2 size={14} className="text-green-600" />
                <p className="text-sm font-bold text-green-700">Alle OK</p>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">Siste henting vellykket</p>
            </>
          )}
          <p className="text-xs text-slate-400 mt-2 flex items-center gap-1 group-hover:text-slate-600">
            Gå til Drift <ArrowRight size={10} />
          </p>
        </button>
      </div>

      {/* Recommended next action */}
      {recommended && (
        <div className={`border rounded-xl p-4 ${recommended.urgent ? "bg-red-50 border-red-200" : "bg-blue-50 border-blue-200"}`}>
          <div className="flex items-start gap-3">
            {recommended.urgent
              ? <AlertTriangle size={18} className="text-red-500 shrink-0 mt-0.5" />
              : <CheckCircle2 size={18} className="text-blue-500 shrink-0 mt-0.5" />}
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-semibold ${recommended.urgent ? "text-red-800" : "text-blue-800"}`}>
                Anbefalt neste handling: {recommended.label}
              </p>
              <p className={`text-xs mt-0.5 ${recommended.urgent ? "text-red-600" : "text-blue-600"}`}>
                {recommended.detail}
              </p>
            </div>
            {recommended.tab && (
              <Button
                size="sm"
                onClick={() => onNavigate(recommended.tab)}
                className={`shrink-0 ${recommended.urgent ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700"} text-white`}
              >
                Start neste oppgave <ArrowRight size={13} className="ml-1" />
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Quick CTAs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <Link
          to={createPageUrl("StationCandidateReview")}
          className="flex items-center justify-between p-3 rounded-lg border border-green-200 bg-green-50 hover:bg-green-100 hover:border-green-400 transition-colors"
        >
          <div>
            <p className="text-sm font-semibold text-green-800">Åpne Stasjonsmastering</p>
            <p className="text-xs text-green-600 mt-0.5">Kandidater og stasjonsreview</p>
          </div>
          <ArrowRight size={14} className="text-green-500 shrink-0" />
        </Link>
        <Link
          to={createPageUrl("ReviewQueue")}
          className="flex items-center justify-between p-3 rounded-lg border border-amber-200 bg-amber-50 hover:bg-amber-100 hover:border-amber-400 transition-colors"
        >
          <div>
            <p className="text-sm font-semibold text-amber-800">Åpne review-kø</p>
            <p className="text-xs text-amber-600 mt-0.5">Prismatching — manuell avklaring</p>
          </div>
          <ArrowRight size={14} className="text-amber-500 shrink-0" />
        </Link>
        <button
          onClick={() => onNavigate("drift")}
          className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors text-left"
        >
          <div>
            <p className="text-sm font-semibold text-slate-700">Se drift og systemstatus</p>
            <p className="text-xs text-slate-400 mt-0.5">Pipeline, kildedata, operasjoner</p>
          </div>
          <ArrowRight size={14} className="text-slate-400 shrink-0" />
        </button>
      </div>

      {/* Governance state */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
        <p className="text-xs font-semibold text-slate-600 mb-2">Systemstatus — governance-begrensninger</p>
        <div className="flex flex-wrap gap-2 mb-2">
          <span className="text-xs bg-amber-100 text-amber-700 border border-amber-200 rounded px-2 py-0.5">
            Phase 2 matchingmotor: låst
          </span>
          <span className="text-xs bg-green-100 text-green-700 border border-green-200 rounded px-2 py-0.5">
            Live sammenslåing: ikke aktiv
          </span>
          <span className="text-xs bg-blue-100 text-blue-700 border border-blue-200 rounded px-2 py-0.5">
            Matching-preview: kun lesemodus
          </span>
        </div>
        <p className="text-xs text-slate-400">
          Disse begrensningene er styrt av governance-regler og kan ikke endres fra dette panelet.
        </p>
      </div>

      {/* Quick navigation grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {[
          { label: "Behandle saker", tab: "behandle", desc: "Review-kø og uavklarte stasjoner" },
          { label: "Test og vurder", tab: "testogvurder", desc: "Matching-preview og regler" },
          { label: "Duplikater", tab: "duplikater", desc: "Skann og vurder duplikater" },
          { label: "Drift og systemstatus", tab: "drift", desc: "Kildedata og operasjoner" },
          { label: "Plan og historikk", tab: "planoghistorikk", desc: "Veikart og arkiv" },
        ].map(({ label, tab, desc }) => (
          <button
            key={tab}
            onClick={() => onNavigate(tab)}
            className="text-left p-3 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-colors"
          >
            <p className="text-sm font-medium text-slate-700">{label}</p>
            <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
          </button>
        ))}
      </div>
    </div>
  );
}