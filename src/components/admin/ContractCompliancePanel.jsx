import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { ShieldAlert, ShieldCheck, AlertTriangle, RefreshCw, ChevronDown, ChevronRight, Eye, Lock, ClipboardCheck, FlaskConical } from "lucide-react";

// ─── Sub-components ───────────────────────────────────────────────────────────

function StepHeader({ number, title, badge, description }) {
  const badgeStyles = {
    "Les kun": "bg-green-100 text-green-700 border-green-200",
    "Ingen data endres": "bg-green-100 text-green-700 border-green-200",
    "Kommer senere": "bg-slate-100 text-slate-500 border-slate-200",
    "Ikke aktiv": "bg-slate-100 text-slate-400 border-slate-200",
  };
  return (
    <div className="flex items-start gap-3 mb-3">
      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-800 text-white text-xs font-bold flex items-center justify-center mt-0.5">
        {number}
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-slate-800">{title}</p>
          {badge && (
            <span className={`text-xs border rounded px-2 py-0.5 font-medium ${badgeStyles[badge] || "bg-slate-100 text-slate-500 border-slate-200"}`}>
              {badge}
            </span>
          )}
        </div>
        {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, color }) {
  return (
    <div className={`rounded-lg border p-4 ${color || "border-slate-200 bg-white"}`}>
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className="text-2xl font-bold text-slate-800">{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  );
}

function ViolationBadge({ code }) {
  return (
    <span className="inline-block bg-red-100 text-red-700 text-xs font-mono px-2 py-0.5 rounded mr-1 mb-1">
      {code}
    </span>
  );
}

function SourceRow({ sourceName, data }) {
  const [expanded, setExpanded] = useState(false);
  const isViolator = data.probableBypass || data.percentageInvalid >= 50;

  return (
    <div className={`border rounded-lg mb-2 overflow-hidden ${isViolator ? "border-red-300" : "border-slate-200"}`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className={`w-full flex items-center justify-between px-4 py-3 text-left ${isViolator ? "bg-red-50" : "bg-white"} hover:bg-slate-50 transition-colors`}
      >
        <div className="flex items-center gap-3">
          {data.probableBypass
            ? <ShieldAlert size={16} className="text-red-600 flex-shrink-0" />
            : data.percentageInvalid > 0
              ? <AlertTriangle size={16} className="text-amber-500 flex-shrink-0" />
              : <ShieldCheck size={16} className="text-green-600 flex-shrink-0" />
          }
          <span className="font-mono font-semibold text-sm text-slate-800">{sourceName}</span>
          {data.probableBypass && (
            <span className="text-xs font-semibold text-red-700 bg-red-100 px-2 py-0.5 rounded">PROBABLE BYPASS</span>
          )}
        </div>
        <div className="flex items-center gap-4 text-xs text-slate-500">
          <span>{data.total} records</span>
          <span className={data.percentageInvalid > 0 ? "text-red-600 font-bold" : "text-green-600 font-bold"}>
            {data.percentageInvalid}% invalid
          </span>
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 pt-2 border-t border-slate-100 bg-white">
          <div className="grid grid-cols-4 gap-3 mb-3">
            <div className="text-center"><p className="text-xs text-slate-500">Valid</p><p className="text-lg font-bold text-green-700">{data.valid}</p></div>
            <div className="text-center"><p className="text-xs text-slate-500">Invalid</p><p className="text-lg font-bold text-red-700">{data.invalid_write_gate_violations}</p></div>
            <div className="text-center"><p className="text-xs text-slate-500">Partial</p><p className="text-lg font-bold text-amber-600">{data.partial}</p></div>
            <div className="text-center"><p className="text-xs text-slate-500">Total</p><p className="text-lg font-bold text-slate-700">{data.total}</p></div>
          </div>

          {data.probableBypassReason && (
            <div className="bg-red-50 border border-red-200 rounded px-3 py-2 mb-3 text-xs text-red-800">
              <strong>Bypass evidence:</strong> {data.probableBypassReason}
            </div>
          )}

          {data.topViolationReasons.length > 0 && (
            <div className="mb-3">
              <p className="text-xs font-semibold text-slate-600 mb-1">Top violations:</p>
              {data.topViolationReasons.map(({ code, count }) => (
                <div key={code} className="flex items-center justify-between text-xs mb-1">
                  <ViolationBadge code={code} />
                  <span className="text-slate-500">{count}×</span>
                </div>
              ))}
            </div>
          )}

          <div className="text-xs text-slate-500">
            <span className="font-semibold">Parser versions:</span> {data.parserVersions.join(", ")}
          </div>

          {data.sampleInvalidRecordIds.length > 0 && (
            <div className="mt-2">
              <p className="text-xs font-semibold text-slate-600 mb-1">Sample invalid record IDs:</p>
              <div className="font-mono text-xs text-slate-500 break-all">
                {data.sampleInvalidRecordIds.join(", ")}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main panel ───────────────────────────────────────────────────────────────

export default function ContractCompliancePanel() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const runAudit = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    const response = await base44.functions.invoke('auditFuelPriceContractCompliance', {});
    if (response.data.error) {
      setError(response.data.error);
    } else {
      setResult(response.data);
    }
    setLoading(false);
  };

  return (
    <div className="space-y-0 border border-slate-200 rounded-xl overflow-hidden">

      {/* ── Panel title ── */}
      <div className="px-5 py-4 bg-slate-50 border-b border-slate-200">
        <p className="text-sm font-bold text-slate-800">FuelPrice Kontraktsvalidering</p>
        <p className="text-xs text-slate-500 mt-0.5">
          Governance v1.3.2 — trestegsprosess: Audit → Preview → Resolver.
          Ingen data endres i dette panelet.
        </p>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          STEG 1 — AUDIT (READ-ONLY)
      ══════════════════════════════════════════════════════════════ */}
      <div className="px-5 py-5 border-b border-slate-200 bg-white">
        <StepHeader
          number="1"
          title="Valider kontrakt"
          badge="Les kun"
          description="Leser eksisterende FuelPrice-records og klassifiserer dem mot canonical contract. Ingen data endres."
        />

        <div className="ml-9">
          <Button
            onClick={runAudit}
            disabled={loading}
            size="sm"
            className="gap-2 bg-slate-800 hover:bg-slate-700 text-white"
          >
            <ClipboardCheck size={13} className={loading ? "animate-spin" : ""} />
            {loading ? "Validerer kontrakt…" : "Valider kontrakt"}
          </Button>
          <p className="text-xs text-slate-400 mt-2">
            Leser eksisterende records · Ingen data endres · Returnerer klassifisert rapport
          </p>
        </div>

        {error && (
          <div className="ml-9 mt-3 bg-red-50 border border-red-200 rounded px-4 py-3 text-sm text-red-800">{error}</div>
        )}

        {result && (
          <div className="ml-9 mt-4 space-y-4">
            {/* Completion notice */}
            <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2">
              <ShieldCheck size={13} />
              <span>
                Audit fullført — {result.auditMeta.recordsScanned} records skannet ·{" "}
                Kontraktsref: {result.auditMeta.contractVersionReference} ·{" "}
                {new Date(result.auditMeta.timestamp).toLocaleString("nb-NO")}
              </span>
            </div>

            {/* Global summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard label="Records skannet" value={result.globalSummary.totalRecords} />
              <StatCard
                label="Kontraktskomplette"
                value={result.globalSummary.validCount}
                sub={`${result.globalSummary.percentageValid}% av total`}
                color="border-green-200 bg-green-50"
              />
              <StatCard
                label="Write-gate violations"
                value={result.globalSummary.invalidCount}
                sub={`${result.globalSummary.percentageInvalid}% av total`}
                color={result.globalSummary.invalidCount > 0 ? "border-red-300 bg-red-50" : "border-slate-200 bg-white"}
              />
              <StatCard
                label="Partial states"
                value={result.globalSummary.partialCount}
                color={result.globalSummary.partialCount > 0 ? "border-amber-200 bg-amber-50" : "border-slate-200 bg-white"}
              />
            </div>

            {/* By source */}
            <div>
              <p className="text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wider">Per kilde</p>
              {Object.entries(result.bySource).map(([sourceName, data]) => (
                <SourceRow key={sourceName} sourceName={sourceName} data={data} />
              ))}
            </div>

            {/* Violation catalog */}
            {Object.keys(result.violationCatalog).length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wider">Violation catalog</p>
                <div className="bg-slate-50 border border-slate-200 rounded p-3">
                  {Object.entries(result.violationCatalog)
                    .sort((a, b) => b[1] - a[1])
                    .map(([code, count]) => (
                      <div key={code} className="flex items-center justify-between py-1 border-b border-slate-100 last:border-0">
                        <ViolationBadge code={code} />
                        <span className="text-xs text-slate-600 font-semibold">{count} records</span>
                      </div>
                    ))
                  }
                </div>
              </div>
            )}

            {/* Evidence samples */}
            {result.evidenceSamples.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wider">Beviseksempler (ugyldige records)</p>
                <div className="space-y-2">
                  {result.evidenceSamples.map(sample => (
                    <div key={sample.id} className="bg-red-50 border border-red-200 rounded px-3 py-2 text-xs">
                      <div className="flex gap-4 mb-1 flex-wrap">
                        <span className="font-mono text-slate-500">{sample.id.slice(0, 12)}…</span>
                        <span className="font-semibold text-slate-700">{sample.sourceName}</span>
                        <span className="text-slate-500">{sample.parserVersion}</span>
                        {sample.station_match_status
                          ? <span className="text-slate-500">{sample.station_match_status}</span>
                          : <span className="text-red-700 font-bold">status=null</span>
                        }
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {sample.violationCodes.map(vc => <ViolationBadge key={vc} code={vc} />)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════
          STEG 2 — PREVIEW (SRP RESOLVER PREVIEW)
      ══════════════════════════════════════════════════════════════ */}
      <div className={`px-5 py-5 border-b border-slate-200 ${result ? "bg-white" : "bg-slate-50 opacity-60"}`}>
        <StepHeader
          number="2"
          title="Forhåndsvis SRP-resolusjon"
          badge="Ingen data endres"
          description="Viser hvordan Station Resolution Pipeline ville klassifisert og reparert de ugyldige records. Ingen data endres."
        />

        <div className="ml-9">
          <SrpPreviewSection auditResult={result} />
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          STEG 3 — RESOLVER (FUTURE / DISABLED)
      ══════════════════════════════════════════════════════════════ */}
      <div className="px-5 py-5 bg-slate-50 opacity-50">
        <StepHeader
          number="3"
          title="Kjør resolver"
          badge="Ikke aktiv"
          description="Kjører faktisk SRP-resolusjon og oppdaterer FuelPrice-records. Krever eksplisitt governance-godkjennelse før aktivering."
        />

        <div className="ml-9 space-y-2">
          <Button disabled size="sm" variant="outline" className="gap-2 cursor-not-allowed">
            <Lock size={13} />
            Resolver ikke aktiv ennå
          </Button>
          <p className="text-xs text-slate-400">
            Resolver skal ikke aktiveres uten eksplisitt governance-godkjent implementasjon.
            Steg 1 og 2 må fullføres og bekreftes først.
          </p>
        </div>
      </div>

    </div>
  );
}