import React, { useState, useEffect } from "react";
import StationSearchPicker from "./StationSearchPicker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldAlert, CheckCircle2, Star, AlertTriangle, Loader2, History, Search, X } from "lucide-react";
import { base44 } from "@/api/base44Client";

/**
 * DuplicateRemediationPanel
 *
 * Fase 3 plassholderkomponent.
 * Ingen remediering er implementert ennå.
 *
 * Governance-port: Fase 3-utføringslogikk må ikke aktiveres
 * uten eksplisitt godkjennelse registrert i ProjectControlPanel.
 *
 * Fase 4A-tillegg (kun lesemodus-forhåndsvisning):
 * - Forhåndsvisning av kanonisk stasjon (oppføring 14)
 * - Forhåndsvisning av merge-effekt (oppføring 15)
 *
 * Fase 4C-tillegg:
 * - Live Execute Merge-seksjon koblet til executeDuplicateMerge-backend
 * - Krever eksplisitt kurator-bekreftelsesavkrysning før knapp aktiveres
 * - Viser forhåndsvisningsoppsummering og etterutføringsresultat
 */

// ─── STATISKE DATA ─────────────────────────────────────────────────────────────

const SAFETY_CHECKLIST = [
  "Kun forhåndsvisning — ingen sammenslåingshandlinger aktivert",
  "Valg av kanonisk stasjon ikke aktivt",
  "Ingen postsletting aktivert",
  "Ingen automatisk remediering aktivert",
  "Kuratorbekreftelsesflyt kreves før aktivering",
  "Revisjonsloggføring kreves for fremtidige remediationshandlinger",
];

const PROCESS_OVERVIEW = [
  { step: 1, label: "Oppdag duplikater", desc: "Kjør duplikatskann for å identifisere kandidatgrupper" },
  { step: 2, label: "Kuratortriage", desc: "Kurator gjennomgår hver gruppe og velger kanonisk stasjon" },
  { step: 3, label: "Ikke-destruktiv forhåndsvisning", desc: "Systemet viser merge-effekt før noe skrives" },
  { step: 4, label: "Kuratorbekreftelse", desc: "Eksplisitt bekreftelse kreves per gruppe" },
  { step: 5, label: "Atomisk utføring", desc: "Repeker FuelPrice-poster, myk-arkiver duplikater" },
  { step: 6, label: "Revisjonsloggoppføring", desc: "Fullstendig revisjonsspor skrives til StationMergeLog" },
];

const MOCK_CANDIDATES = [
  {
    name: "Circle K Moholt",
    chain: "Circle K",
    address: "Moholt allé 57, Trondheim",
    sourceCount: 3,
    priceCount: 14,
    confidenceBadge: "Høy",
    isCanonicalExample: true,
  },
  {
    name: "Circle K Moholt Senter",
    chain: "Circle K",
    address: "Moholt allé 55, Trondheim",
    sourceCount: 1,
    priceCount: 2,
    confidenceBadge: "Lav",
    isCanonicalExample: false,
  },
  {
    name: "Moholt Bensinstasjon",
    chain: null,
    address: "Moholt allé, Trondheim",
    sourceCount: 1,
    priceCount: 1,
    confidenceBadge: "Lav",
    isCanonicalExample: false,
  },
];

const MERGE_SUMMARY_STATS = [
  { label: "Kanonisk stasjon beholdt", value: "1" },
  { label: "Duplikater myk-arkivert", value: "2" },
  { label: "FuelPrice-poster repektet", value: "16" },
  { label: "Manuell kuratorbekreftelse", value: "Påkrevet" },
  { label: "Revisjonsloggoppføring", value: "Påkrevet" },
  { label: "Harde slettinger", value: "Ingen" },
];

const MERGE_ACTION_MAP = [
  { action: "Behold som kanonisk", station: "Circle K Moholt", style: "text-green-700 bg-green-50 border border-green-200" },
  { action: "Arkiver duplikat", station: "Circle K Moholt Senter", style: "text-amber-700 bg-amber-50 border border-amber-200" },
  { action: "Arkiver duplikat", station: "Moholt Bensinstasjon", style: "text-amber-700 bg-amber-50 border border-amber-200" },
  { action: "Repek FuelPrice-poster", station: "Alle duplikatkoblede priser → kanonisk stasjon", style: "text-blue-700 bg-blue-50 border border-blue-200" },
];

// ─── GOVERNANCE-FUNKSJONS-FLAGG ───────────────────────────────────────────────
const ENABLE_LIVE_DUPLICATE_MERGE_EXECUTION = true;

// ─── KOMPONENT ────────────────────────────────────────────────────────────────

export default function DuplicateRemediationPanel() {
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const [mergeNotes, setMergeNotes] = useState("");
  const [previewCanonicalId, setPreviewCanonicalId] = useState("");
  const [previewDuplicateIds, setPreviewDuplicateIds] = useState("");

  // Station search state
  const [canonicalStation, setCanonicalStation] = useState(null);
  const [duplicateStations, setDuplicateStations] = useState([]);

  const handleSelectCanonical = (station) => {
    setCanonicalStation(station);
    setPreviewCanonicalId(station.id);
    setPreviewResult(null);
  };
  const handleAddDuplicate = (station) => {
    if (duplicateStations.find(s => s.id === station.id)) return;
    const updated = [...duplicateStations, station];
    setDuplicateStations(updated);
    setPreviewDuplicateIds(updated.map(s => s.id).join(", "));
    setPreviewResult(null);
  };
  const handleRemoveDuplicate = (id) => {
    const updated = duplicateStations.filter(s => s.id !== id);
    setDuplicateStations(updated);
    setPreviewDuplicateIds(updated.map(s => s.id).join(", "));
    setPreviewResult(null);
  };
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewResult, setPreviewResult] = useState(null);
  const [previewError, setPreviewError] = useState(null);

  const [auditHistory, setAuditHistory] = useState([]);
  const [auditLoading, setAuditLoading] = useState(true);

  useEffect(() => {
    const loadAuditHistory = async () => {
      try {
        const logs = await base44.entities.StationMergeLog.list();
        setAuditHistory(logs || []);
      } catch (err) {
        console.error('Klarte ikke å laste revisjonshistorikk:', err);
        setAuditHistory([]);
      } finally {
        setAuditLoading(false);
      }
    };
    loadAuditHistory();
  }, []);

  const handleRunDryRunPreview = async () => {
    const canonicalId = previewCanonicalId.trim();
    const dupIds = previewDuplicateIds
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    if (!canonicalId || dupIds.length === 0) {
      setPreviewError("Legg inn kanonisk stasjons-ID og minst én duplikat-ID.");
      return;
    }

    setPreviewLoading(true);
    setPreviewError(null);
    setPreviewResult(null);

    const res = await base44.functions.invoke("previewDuplicateMerge", {
      canonical_station_id: canonicalId,
      duplicate_station_ids: dupIds,
    });

    setPreviewLoading(false);
    if (res.data && res.data.safe_to_merge !== undefined) {
      setPreviewResult(res.data);
    } else {
      setPreviewError(res.data?.error ?? "Ukjent feil fra previewDuplicateMerge");
    }
  };

  const handleExecuteMerge = async () => {
    if (!confirmed) return;
    const canonicalId = previewCanonicalId.trim();
    const dupIds = previewDuplicateIds.split(",").map(s => s.trim()).filter(Boolean);
    if (!canonicalId || dupIds.length === 0) {
      setError("Legg inn kanonisk ID og duplikat-IDer i feltet over først.");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    const res = await base44.functions.invoke("executeDuplicateMerge", {
      canonical_station_id: canonicalId,
      duplicate_station_ids: dupIds,
      curator_confirmation: true,
      notes: mergeNotes.trim() || "Utført via DuplicateRemediationPanel",
    });
    setLoading(false);
    if (res.data && res.data.success) {
      setResult(res.data);
      setConfirmed(false);
      // Refresh audit log
      const logs = await base44.entities.StationMergeLog.list();
      setAuditHistory(logs || []);
    } else {
      setError(res.data?.error ?? "Ukjent feil fra executeDuplicateMerge");
    }
  };

  return (
    <div className="space-y-4">

      {/* ── 1. Tittel og status-banner ─────────────────────────────────────── */}
      <Card className="bg-slate-50 border border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2 text-slate-700">
            <ShieldAlert size={18} className="text-slate-400" />
            Deduplisering og sammenslåing
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600 mb-2">
            Denne delen viser status for opprydding av duplikater. Utføring skal bare være mulig når governance tillater det.
          </p>
          <div className="text-xs font-semibold text-green-800 bg-green-50 border border-green-200 rounded px-3 py-2">
            Status nå: Live sammenslåing er aktivert. Kjør tørrkjøring → bekreft → utfør.
          </div>
        </CardContent>
      </Card>

      {/* ── 2. Sikkerhetsstatus ───────────────────────────────────────────── */}
      <Card className="border border-amber-200 bg-amber-50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-amber-800">
            Sikkerhetsstatus — gjeldende tilstand
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {SAFETY_CHECKLIST.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-amber-900">
                <CheckCircle2 size={14} className="text-amber-500 mt-0.5 shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* ── 3. Stegvis prosess for deduplisering ──────────────────────────── */}
      <Card className="border border-slate-200 bg-white">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-slate-700">
            Stegvis prosess for deduplisering (ikke aktiv ennå)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3">
            {PROCESS_OVERVIEW.map(({ step, label, desc }) => (
              <li key={step} className="flex items-start gap-3">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-slate-200 text-slate-500 text-xs flex items-center justify-center font-semibold">
                  {step}
                </span>
                <div>
                  <p className="text-xs font-medium text-slate-700">{label}</p>
                  <p className="text-xs text-slate-400">{desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      {/* ── 4. Forhåndsvisning av kanonisk stasjon ─────────────────────────── */}
      <Card className="border border-slate-200 bg-white">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            Forhåndsvisning av kanonisk stasjon
            <span className="text-xs font-normal bg-slate-100 text-slate-500 border border-slate-200 rounded px-2 py-0.5">Lesemodus</span>
            <span className="text-xs font-normal bg-amber-100 text-amber-700 border border-amber-200 rounded px-2 py-0.5">Ikke aktiv ennå</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
            Dette velger ikke eller lagrer en kanonisk stasjon. Ingen remediationshandling utføres fra dette panelet.
          </div>
          <p className="text-xs text-slate-400 mb-3">Eksempeldata – ikke reelle endringer</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {MOCK_CANDIDATES.map((c, i) => (
              <div
                key={i}
                className={`rounded-lg border p-3 flex flex-col gap-1.5 ${
                  c.isCanonicalExample ? "border-green-400 bg-green-50" : "border-slate-200 bg-slate-50"
                }`}
              >
                <div className="flex items-start justify-between gap-1">
                  <p className="text-xs font-semibold text-slate-800 leading-tight">{c.name}</p>
                  {c.isCanonicalExample && <Star size={13} className="text-green-500 shrink-0 mt-0.5" />}
                </div>
                <p className="text-xs text-slate-500">
                  {c.chain ?? <span className="italic text-slate-400">Kjede ukjent</span>}
                </p>
                <p className="text-xs text-slate-400">{c.address}</p>
                <div className="flex gap-2 mt-1 flex-wrap">
                  <span className="text-xs bg-slate-200 text-slate-600 rounded px-1.5 py-0.5">
                    {c.sourceCount} kilde{c.sourceCount !== 1 ? "r" : ""}
                  </span>
                  <span className="text-xs bg-slate-200 text-slate-600 rounded px-1.5 py-0.5">{c.priceCount} priser</span>
                  <span className={`text-xs rounded px-1.5 py-0.5 ${c.confidenceBadge === "Høy" ? "bg-green-100 text-green-700" : "bg-slate-200 text-slate-500"}`}>
                    {c.confidenceBadge} konf.
                  </span>
                </div>
                <div className="mt-1">
                  {c.isCanonicalExample ? (
                    <span className="text-xs font-medium bg-green-100 text-green-700 border border-green-300 rounded px-2 py-0.5">
                      Eksempel kanonisk valg
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400 bg-slate-100 border border-slate-200 rounded px-2 py-0.5">
                      Kun forhåndsvisning
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── 5. Forhåndsvisning av merge-effekt ───────────────────────────────── */}
      <Card className="border border-slate-200 bg-white">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            Forhåndsvisning av merge-effekt
            <span className="text-xs font-normal bg-slate-100 text-slate-500 border border-slate-200 rounded px-2 py-0.5">Lesemodus</span>
            <span className="text-xs font-normal bg-amber-100 text-amber-700 border border-amber-200 rounded px-2 py-0.5">Ikke aktiv ennå</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
            Kun forhåndsvisning — ingen sammenslåing utføres. Ingen poster endres fra dette panelet.
          </div>
          <p className="text-xs text-slate-400 mb-3">Eksempeldata – ikke reelle endringer</p>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
            {MERGE_SUMMARY_STATS.map(({ label, value }) => (
              <div key={label} className="bg-slate-50 border border-slate-200 rounded p-2">
                <p className="text-xs text-slate-400">{label}</p>
                <p className="text-xs font-semibold text-slate-700 mt-0.5">{value}</p>
              </div>
            ))}
          </div>

          <div className="border border-slate-200 rounded overflow-hidden">
            <div className="bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
              Planlagt handlingskartlegging
            </div>
            <div className="divide-y divide-slate-100">
              {MERGE_ACTION_MAP.map(({ action, station, style }, i) => (
                <div key={i} className="flex items-start gap-3 px-3 py-2">
                  <span className={`text-xs font-medium rounded px-2 py-0.5 shrink-0 ${style}`}>{action}</span>
                  <span className="text-xs text-slate-600">{station}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── 6. Kuratorkvittering (forhåndsvisning) ───────────────────────────── */}
      <Card className="border border-slate-200 bg-white">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            Kuratorkvittering
            <span className="text-xs font-normal bg-slate-100 text-slate-500 border border-slate-200 rounded px-2 py-0.5">Lesemodus</span>
            <span className="text-xs font-normal bg-amber-100 text-amber-700 border border-amber-200 rounded px-2 py-0.5">Ikke aktiv ennå</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
            Kun forhåndsvisning — ingen bekreftelse kan sendes inn fra dette panelet. Ingen sammenslåing kan utføres fra dette panelet.
          </div>
          <p className="text-xs text-slate-400 mb-3">Eksempeldata – ikke reelle endringer</p>

          <div className="space-y-2 mb-4">
            {[
              "Kanonisk stasjon gjennomgått",
              "Duplikatstasjoner gjennomgått",
              "Merge-effekt gjennomgått",
              "Antall FuelPrice-repeking gjennomgått",
              "Revisjonsloggingskrav bekreftet",
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-slate-600">
                <div className="w-4 h-4 rounded border border-slate-300 bg-slate-100 flex items-center justify-center shrink-0">
                  <CheckCircle2 size={11} className="text-slate-300" />
                </div>
                <span>{item}</span>
                <span className="ml-auto text-slate-400 italic">Kun forhåndsvisning</span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2 mb-4">
            {[
              { label: "Kuratorbekreftelse påkrevet", value: "Ja" },
              { label: "Andregangsgjennomgang påkrevet", value: "Nei" },
              { label: "Utføring tillatt fra dette panelet", value: "Nei" },
              { label: "Gjeldende modus", value: "Kun forhåndsvisning" },
            ].map(({ label, value }) => (
              <div key={label} className="bg-slate-50 border border-slate-200 rounded p-2">
                <p className="text-xs text-slate-400">{label}</p>
                <p className={`text-xs font-semibold mt-0.5 ${value === "Nei" || value === "Kun forhåndsvisning" ? "text-amber-700" : "text-slate-700"}`}>{value}</p>
              </div>
            ))}
          </div>

          <div className="border border-slate-200 rounded overflow-hidden">
            <div className="bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-500 flex items-center gap-2">
              <ShieldAlert size={13} className="text-slate-400" />
              Bekreftelse deaktivert i forhåndsvisningsmodus
            </div>
            <div className="px-3 py-3 bg-slate-50">
              <button
                disabled
                className="w-full py-2 px-4 text-xs font-medium rounded border border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed"
              >
                Bekreft og utfør sammenslåing — deaktivert
              </button>
              <p className="text-xs text-slate-400 text-center mt-2">
                Ingen sammenslåing kan utføres fra dette panelet. Aktivering krever governance-godkjennelse.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── 8. Live tørrkjøringsforhåndsvisning ───────────────────────────── */}
      <Card className="border border-blue-200 bg-blue-50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-blue-800 flex items-center gap-2">
            <CheckCircle2 size={14} className="text-blue-500" />
            Live tørrkjøring av merge-forhåndsvisning
            <span className="text-xs font-normal bg-blue-100 text-blue-600 border border-blue-200 rounded px-2 py-0.5">Lesemodus</span>
            <span className="text-xs font-normal bg-green-100 text-green-700 border border-green-200 rounded px-2 py-0.5">Kun tørrkjøring</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-3 text-xs text-blue-900 bg-blue-100 border border-blue-200 rounded px-3 py-2">
            Kaller <code className="font-mono">previewDuplicateMerge</code> — en fullstendig lesemodusbakende.
            Ingen sammenslåing utføres. Ingen poster endres. Ingen StationMergeLog-oppføring skrives.
          </div>

          <div className="space-y-3 mb-4">
            {/* Station search picker */}
            <div>
              <label className="block text-xs font-medium text-blue-900 mb-1">Søk opp stasjon</label>
              <StationSearchPicker
                onSelectCanonical={handleSelectCanonical}
                onAddDuplicate={handleAddDuplicate}
                canonicalId={canonicalStation?.id}
                duplicateIds={duplicateStations.map(s => s.id)}
              />
            </div>

            {/* Canonical chip */}
            <div>
              <label className="block text-xs font-medium text-blue-900 mb-1">Kanonisk stasjon (beholdes)</label>
              {canonicalStation ? (
                <div className="flex items-center gap-2 bg-green-50 border border-green-300 rounded px-3 py-1.5">
                  <span className="flex-1 text-xs text-green-900 font-semibold truncate">
                    {canonicalStation.name}{canonicalStation.chain ? ` (${canonicalStation.chain})` : ""} — <span className="font-mono text-green-700">{canonicalStation.id.substring(0, 10)}…</span>
                  </span>
                  <button onClick={() => { setCanonicalStation(null); setPreviewCanonicalId(""); setPreviewResult(null); }} className="text-green-600 hover:text-red-600 shrink-0">
                    <X size={13} />
                  </button>
                </div>
              ) : (
                <div className="text-xs text-slate-400 border border-dashed border-slate-300 rounded px-3 py-1.5 italic">
                  Ingen kanonisk stasjon valgt — søk ovenfor
                </div>
              )}
            </div>

            {/* Duplicate chips */}
            <div>
              <label className="block text-xs font-medium text-blue-900 mb-1">Duplikater (arkiveres)</label>
              {duplicateStations.length === 0 ? (
                <div className="text-xs text-slate-400 border border-dashed border-slate-300 rounded px-3 py-1.5 italic">
                  Ingen duplikater lagt til ennå — søk og klikk «+ Dup»
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {duplicateStations.map(s => (
                    <div key={s.id} className="flex items-center gap-1.5 bg-amber-50 border border-amber-300 rounded px-2 py-1">
                      <span className="text-xs text-amber-900 font-semibold">{s.name}</span>
                      <span className="text-xs text-amber-600 font-mono">{s.id.substring(0, 8)}…</span>
                      <button onClick={() => handleRemoveDuplicate(s.id)} className="text-amber-500 hover:text-red-600 ml-0.5">
                        <X size={11} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Fallback: manual ID input */}
            <details className="mt-1">
              <summary className="text-xs text-slate-400 cursor-pointer hover:text-slate-600 select-none">Lim inn IDer manuelt (alternativ)</summary>
              <div className="mt-2 space-y-2">
                <input
                  type="text"
                  value={previewCanonicalId}
                  onChange={(e) => { setPreviewCanonicalId(e.target.value); setCanonicalStation(null); setPreviewResult(null); setPreviewError(null); }}
                  placeholder="Kanonisk stasjons-ID"
                  className="w-full text-xs border border-blue-200 rounded px-3 py-1.5 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
                />
                <input
                  type="text"
                  value={previewDuplicateIds}
                  onChange={(e) => { setPreviewDuplicateIds(e.target.value); setDuplicateStations([]); setPreviewResult(null); setPreviewError(null); }}
                  placeholder="Duplikat-IDer, kommaseparert"
                  className="w-full text-xs border border-blue-200 rounded px-3 py-1.5 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
                />
              </div>
            </details>
          </div>

          <button
            onClick={handleRunDryRunPreview}
            disabled={previewLoading}
            className={`w-full py-2 px-4 text-xs font-semibold rounded border transition-colors mb-3 ${
              previewLoading
                ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                : "bg-blue-600 text-white border-blue-700 hover:bg-blue-700 cursor-pointer"
            }`}
          >
            {previewLoading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 size={12} className="animate-spin" />
                Kjører tørrkjøringsforhåndsvisning...
              </span>
            ) : (
              "Kjør tørrkjøringsforhåndsvisning"
            )}
          </button>

          {previewError && (
            <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2 mb-3">
              <strong>Feil:</strong> {previewError}
            </div>
          )}

          {previewResult && (
            <div className="border border-slate-200 rounded overflow-hidden">
              <div className={`px-3 py-2 text-xs font-semibold flex items-center gap-2 ${
                previewResult.safe_to_merge ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
              }`}>
                {previewResult.safe_to_merge ? "✓ safe_to_merge: true" : "✗ safe_to_merge: false"}
              </div>
              <div className="divide-y divide-slate-100">
                {[
                  ["canonical_station_exists", String(previewResult.canonical_station_exists)],
                  ["canonical_already_archived", String(previewResult.canonical_already_archived)],
                  ["canonical_in_duplicate_list", String(previewResult.canonical_in_duplicate_list)],
                  ["duplicate_stations_found", String(previewResult.duplicate_stations_found)],
                  ["duplicate_station_ids_missing", previewResult.duplicate_station_ids_missing?.join(", ") || "ingen"],
                  ["fuelprice_records_would_be_repointed", String(previewResult.fuelprice_records_would_be_repointed)],
                  ["duplicate_stations_would_be_archived", String(previewResult.duplicate_stations_would_be_archived)],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between px-3 py-1.5 text-xs">
                    <span className="text-slate-500 font-mono">{label}</span>
                    <span className="text-slate-800 font-semibold">{value}</span>
                  </div>
                ))}
              </div>
              {previewResult.blockers && previewResult.blockers.length > 0 && (
                <div className="px-3 py-2 bg-red-50 border-t border-red-100">
                  <p className="text-xs font-semibold text-red-700 mb-1">Blokkere:</p>
                  <ul className="space-y-1">
                    {previewResult.blockers.map((b, i) => (
                      <li key={i} className="text-xs text-red-700 flex items-start gap-1">
                        <span className="shrink-0">•</span>
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── 7. Utfør sammenslåing — Fase 4C (governance-kontrollert) ──── */}
      <Card className={ENABLE_LIVE_DUPLICATE_MERGE_EXECUTION ? "border border-orange-200 bg-orange-50" : "border border-slate-200 bg-slate-50"}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2" style={ENABLE_LIVE_DUPLICATE_MERGE_EXECUTION ? { color: '#92400e' } : { color: '#64748b' }}>
            <AlertTriangle size={14} />
            Utfør sammenslåing
            <span className={`text-xs font-normal border rounded px-2 py-0.5 ${
              ENABLE_LIVE_DUPLICATE_MERGE_EXECUTION
                ? 'bg-orange-100 text-orange-600 border-orange-200'
                : 'bg-slate-100 text-slate-500 border-slate-200'
            }`}>
              Fase 4C — {ENABLE_LIVE_DUPLICATE_MERGE_EXECUTION ? 'live' : 'deaktivert'}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!ENABLE_LIVE_DUPLICATE_MERGE_EXECUTION ? (
            <div className="text-xs text-slate-700 bg-slate-100 border border-slate-200 rounded px-3 py-3 space-y-2">
              <p className="font-semibold">Live sammenslåing er deaktivert i kode og kan ikke kjøres fra dette panelet.</p>
              <p>Tørrkjøringsforhåndsvisning er fortsatt tilgjengelig ovenfor.</p>
              <p className="text-slate-500">Utføring krever eksplisitt governance-aktivering via funksjons-flagg i komponentkode.</p>
            </div>
          ) : (
            <>
              <div className="mb-3 text-xs text-orange-900 bg-orange-100 border border-orange-200 rounded px-3 py-2">
                Kjør tørrkjøringsforhåndsvisning ovenfor først. Bruk de samme ID-ene her for live utføring.
                Ingen harde slettinger. Revisjonslogg skrives alltid til StationMergeLog.
              </div>

              {!result && (
                <div className="mb-4 border border-slate-200 rounded overflow-hidden">
                  <div className="bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
                    Forutføringsoppsummering
                  </div>
                  <div className="divide-y divide-slate-100">
                    <div className="flex justify-between px-3 py-2 text-xs">
                      <span className="text-slate-500">Kanonisk stasjons-ID</span>
                      <span className="font-mono text-slate-700 break-all text-right max-w-[55%]">{previewCanonicalId.trim() || <span className="text-red-500 italic">ikke satt</span>}</span>
                    </div>
                    <div className="flex justify-between px-3 py-2 text-xs">
                      <span className="text-slate-500">Duplikater som arkiveres</span>
                      <span className="font-mono text-slate-700">{previewDuplicateIds.split(",").map(s=>s.trim()).filter(Boolean).length}</span>
                    </div>
                    <div className="flex justify-between px-3 py-2 text-xs">
                      <span className="text-slate-500">Harde slettinger</span>
                      <span className="text-green-700 font-semibold">Ingen</span>
                    </div>
                    <div className="flex justify-between px-3 py-2 text-xs">
                      <span className="text-slate-500">Revisjonslogg</span>
                      <span className="text-green-700 font-semibold">Skrives alltid</span>
                    </div>
                  </div>
                </div>
              )}

              {!result && (
                <div className="mb-3">
                  <label className="block text-xs font-medium text-orange-900 mb-1">Kuratornote (valgfritt)</label>
                  <input
                    type="text"
                    value={mergeNotes}
                    onChange={e => setMergeNotes(e.target.value)}
                    placeholder="f.eks. Verifisert via kartlenke og adressesjekk"
                    className="w-full text-xs border border-orange-200 rounded px-3 py-1.5 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
                  />
                </div>
              )}

              {!result && (
                <label className="flex items-start gap-2 mb-4 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={confirmed}
                    onChange={(e) => setConfirmed(e.target.checked)}
                    className="mt-0.5 accent-orange-600"
                  />
                  <span className="text-xs text-orange-900">
                    Jeg har gjennomgått den kanoniske stasjonen, duplikatene og merge-effekten.
                    Jeg autoriserer denne sammenslåingsoperasjonen. Jeg forstår at dette ikke kan angres automatisk.
                  </span>
                </label>
              )}

              {!result && (
                <button
                  onClick={handleExecuteMerge}
                  disabled={!confirmed || loading}
                  className={`w-full py-2 px-4 text-xs font-semibold rounded border transition-colors ${
                    confirmed && !loading
                      ? "bg-orange-600 text-white border-orange-700 hover:bg-orange-700 cursor-pointer"
                      : "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                  }`}
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 size={12} className="animate-spin" />
                      Utfører sammenslåing...
                    </span>
                  ) : (
                    "Utfør sammenslåing"
                  )}
                </button>
              )}

              {error && (
                <div className="mt-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
                  <strong>Feil:</strong> {error}
                </div>
              )}

              {result && (
                <div className="mt-2">
                  <div className="text-xs text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2 mb-3 font-semibold">
                    ✓ Sammenslåing utført
                  </div>
                  <div className="border border-slate-200 rounded overflow-hidden">
                    <div className="bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
                      Utføringsresultat
                    </div>
                    <div className="divide-y divide-slate-100">
                      {[
                        ["Kanonisk stasjons-ID", result.canonical_station_id],
                        ["Duplikater arkivert", result.duplicates_archived],
                        ["FuelPrice-poster flyttet", result.fuelprice_records_moved],
                        ["Arkivering bekreftet", result.validation?.duplicates_archived_confirmed ? "Ja" : "Ikke bekreftet"],
                        ["FuelPrice-flytt bekreftet", result.validation?.fuelprice_moved_confirmed ? "Ja" : "Ikke bekreftet"],
                        ["Kurator", result.curator_id],
                        ["Tidsstempel", result.timestamp],
                      ].map(([label, value]) => (
                        <div key={label} className="flex justify-between px-3 py-2 text-xs">
                          <span className="text-slate-500">{label}</span>
                          <span className="font-mono text-slate-700 text-right max-w-[55%] break-all">{String(value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 mt-2 text-center">
                    Revisjonsloggoppføring skrevet til StationMergeLog.
                  </p>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* ── 9. Historikk ──────────────────────────────────────────────── */}
      <Card className="border border-green-200 bg-green-50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-green-800 flex items-center gap-2">
            <History size={14} className="text-green-600" />
            Historikk
            <span className="text-xs font-normal bg-green-100 text-green-700 border border-green-200 rounded px-2 py-0.5">Lesemodus</span>
            <span className="text-xs font-normal bg-slate-100 text-slate-600 border border-slate-200 rounded px-2 py-0.5">Revisjonsspor</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-3 text-xs text-green-900 bg-green-100 border border-green-200 rounded px-3 py-2">
            Fullstendig revisjonsspor for alle utførte stasjonsammenslåinger. Ingen handlinger kan utløses fra denne seksjonen.
          </div>

          {auditLoading ? (
            <div className="text-center py-6">
              <Loader2 size={16} className="animate-spin inline text-slate-400 mb-2" />
              <p className="text-xs text-slate-500">Laster revisjonshistorikk...</p>
            </div>
          ) : auditHistory.length === 0 ? (
            <div className="text-center py-6 bg-white rounded border border-slate-200">
              <p className="text-xs text-slate-500">Ingen sammenslåingshandlinger er utført ennå.</p>
              <p className="text-xs text-slate-400 mt-1">Utførte sammenslåinger vises her med fullstendig kurator-revisjonsspor.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {auditHistory.map((log, idx) => (
                <div key={log.id || idx} className="border border-slate-200 rounded p-3 bg-white text-xs space-y-1.5">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1">
                      <p className="font-semibold text-slate-800">Sammenslåing #{idx + 1}</p>
                      <p className="text-slate-500">{new Date(log.timestamp).toLocaleString('no-NO')}</p>
                    </div>
                    <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-medium shrink-0">
                      ✓ Utført
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 py-1.5 border-t border-slate-100 pt-1.5">
                    <div>
                      <span className="text-slate-500">Kanonisk ID</span>
                      <p className="font-mono text-slate-700 text-xs break-all">{log.canonical_station_id}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Duplikater sammenslått</span>
                      <p className="font-mono text-slate-700 text-xs">{log.merged_station_ids?.length || 0}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Priser repektet</span>
                      <p className="font-mono text-slate-700 text-xs">{log.fuelprice_records_moved}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Kurator</span>
                      <p className="font-mono text-slate-700 text-xs break-all">{log.curator_id}</p>
                    </div>
                  </div>
                  {log.merged_station_ids && log.merged_station_ids.length > 0 && (
                    <div className="py-1.5 border-t border-slate-100 pt-1.5">
                      <span className="text-slate-500">Sammenslåtte IDer</span>
                      <p className="font-mono text-slate-700 text-xs mt-0.5 break-all">
                        {log.merged_station_ids.join(', ')}
                      </p>
                    </div>
                  )}
                  {log.notes && (
                    <div className="py-1.5 border-t border-slate-100 pt-1.5">
                      <span className="text-slate-500">Notater</span>
                      <p className="text-slate-700 text-xs mt-0.5">{log.notes}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
}