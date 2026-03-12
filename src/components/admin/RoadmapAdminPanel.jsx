import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Map, ChevronDown, ChevronRight } from "lucide-react";
import { SCORING_MODEL, STATUS_DEFINITIONS, PHASE_BASELINE, FEATURES } from "../roadmap/ROADMAP";

// ─── Status badge styling ─────────────────────────────────────────────────────

const STATUS_STYLES = {
  completed:          "bg-green-100 text-green-800 border-green-200",
  active:             "bg-blue-100 text-blue-800 border-blue-200",
  "build-ready":      "bg-emerald-100 text-emerald-800 border-emerald-200",
  "scoping-required": "bg-amber-100 text-amber-800 border-amber-200",
  planned:            "bg-slate-100 text-slate-700 border-slate-200",
  dependent:          "bg-purple-100 text-purple-800 border-purple-200",
  blocked:            "bg-red-100 text-red-800 border-red-200",
  partial:            "bg-orange-100 text-orange-800 border-orange-200",
  deferred:           "bg-slate-100 text-slate-500 border-slate-200",
};

function StatusBadge({ status }) {
  const cls = STATUS_STYLES[status] || "bg-slate-100 text-slate-600 border-slate-200";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${cls}`}>
      {status}
    </span>
  );
}

// ─── Feature card ─────────────────────────────────────────────────────────────

function FeatureRow({ feature }) {
  const [open, setOpen] = useState(false);
  const hasExtra = feature.dependencies?.length || feature.blockers?.length ||
    feature.immediateAction || feature.note || feature.northStarNote ||
    feature.buildNote || feature.scopingRequired;

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <button
        className="w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-slate-50 transition-colors"
        onClick={() => hasExtra && setOpen(o => !o)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="font-medium text-slate-800 text-sm">{feature.title}</span>
            <StatusBadge status={feature.status} />
            <span className="text-xs text-slate-400">{feature.category}</span>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">{feature.description}</p>
        </div>
        <div className="shrink-0 flex flex-col items-end gap-1">
          {feature.displayScore != null && (
            <span className="text-xs font-semibold text-slate-700 bg-slate-100 rounded px-2 py-0.5">
              {feature.displayScore}/25
            </span>
          )}
          {feature.stabilityAdjustedScore != null && (
            <span className="text-xs text-slate-400">adj {feature.stabilityAdjustedScore}</span>
          )}
          {hasExtra && (
            open
              ? <ChevronDown size={13} className="text-slate-400 mt-1" />
              : <ChevronRight size={13} className="text-slate-400 mt-1" />
          )}
        </div>
      </button>

      {open && (
        <div className="border-t border-slate-100 px-4 py-3 bg-slate-50 space-y-2 text-xs">
          <p className="text-slate-400 font-mono">id: {feature.id}</p>

          {feature.immediateAction && (
            <div className="bg-amber-50 border border-amber-200 rounded px-3 py-2">
              <span className="font-semibold text-amber-800">Handling: </span>
              <span className="text-amber-700">{feature.immediateAction}</span>
            </div>
          )}

          {feature.scopingRequired && (
            <div className="bg-amber-50 border border-amber-200 rounded px-3 py-2">
              <span className="font-semibold text-amber-800">Krever scoping: </span>
              <span className="text-amber-700">{feature.scopingRequired}</span>
            </div>
          )}

          {feature.dependencies?.length > 0 && (
            <div>
              <span className="font-semibold text-slate-600">Avhengigheter: </span>
              <span className="text-slate-500">{feature.dependencies.join(", ")}</span>
            </div>
          )}

          {feature.blockers?.length > 0 && (
            <div>
              <span className="font-semibold text-red-600">Blokkere: </span>
              <span className="text-red-500">{feature.blockers.join(" · ")}</span>
            </div>
          )}

          {(feature.note || feature.buildNote) && (
            <div className="text-slate-500 italic">{feature.note || feature.buildNote}</div>
          )}

          {feature.northStarNote && (
            <div className="text-indigo-600 italic">⭐ {feature.northStarNote}</div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Phase section ────────────────────────────────────────────────────────────

const PHASE_ORDER = [1, 2, 3, 4, 5, 6];

function PhaseSection({ phaseNum, phaseMeta, features }) {
  const sorted = [...features].sort((a, b) => (b.displayScore ?? 0) - (a.displayScore ?? 0));
  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        <span className="text-xs font-bold bg-slate-800 text-white rounded px-2 py-0.5">Phase {phaseNum}</span>
        <span className="font-semibold text-slate-800 text-sm">{phaseMeta.title}</span>
        <span className="text-xs text-slate-400 hidden sm:inline">— {phaseMeta.theme}</span>
      </div>
      {sorted.length === 0 ? (
        <p className="text-xs text-slate-400 italic px-1">Ingen features i denne fasen.</p>
      ) : (
        <div className="space-y-2">
          {sorted.map(f => <FeatureRow key={f.id} feature={f} />)}
        </div>
      )}
    </div>
  );
}

// ─── Summary cards ────────────────────────────────────────────────────────────

function SummaryCard({ label, count, color }) {
  return (
    <div className={`rounded-lg border px-4 py-3 ${color}`}>
      <p className="text-2xl font-bold">{count}</p>
      <p className="text-xs mt-0.5 opacity-80">{label}</p>
    </div>
  );
}

// ─── Main panel ───────────────────────────────────────────────────────────────

export default function RoadmapAdminPanel() {
  const total       = FEATURES.length;
  const count = s  => FEATURES.filter(f => f.status === s).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Map size={16} className="text-slate-600" />
        <h2 className="text-base font-semibold text-slate-800">Veikart — produktplan</h2>
        <span className="text-xs font-medium bg-slate-100 text-slate-500 border border-slate-200 rounded px-2 py-0.5 ml-1">
          Lesemodus · Kilde: ROADMAP.jsx
        </span>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        <SummaryCard label="Totalt"              count={total}                        color="border-slate-200 text-slate-700" />
        <SummaryCard label="Fullført"           count={count("completed")}            color="border-green-200 text-green-800 bg-green-50" />
        <SummaryCard label="Aktiv"              count={count("active")}               color="border-blue-200 text-blue-800 bg-blue-50" />
        <SummaryCard label="Klar å bygge"       count={count("build-ready")}          color="border-emerald-200 text-emerald-800 bg-emerald-50" />
        <SummaryCard label="Krever scoping"     count={count("scoping-required")}     color="border-amber-200 text-amber-800 bg-amber-50" />
        <SummaryCard label="Blokkert"           count={count("blocked")}              color="border-red-200 text-red-800 bg-red-50" />
      </div>

      {/* Status legend (from STATUS_DEFINITIONS) */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs text-slate-500 uppercase tracking-wider">Status-definisjoner</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5">
          {Object.entries(STATUS_DEFINITIONS).map(([status, def]) => (
            <div key={status} className="flex items-start gap-2">
              <StatusBadge status={status} />
              <p className="text-xs text-slate-500 leading-tight mt-0.5">
                {Array.isArray(def) ? def[0] : def}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Phase sections */}
      <div className="space-y-8">
        {PHASE_ORDER.map(phaseNum => {
          const phaseMeta = PHASE_BASELINE[`phase${phaseNum}`];
          const phaseFeatures = FEATURES.filter(f => f.phase === phaseNum);
          return (
            <PhaseSection
              key={phaseNum}
              phaseNum={phaseNum}
              phaseMeta={phaseMeta}
              features={phaseFeatures}
            />
          );
        })}
      </div>

      {/* Footer note */}
      <p className="text-xs text-slate-400 border-t pt-4">
        Scoring model: USER_VALUE ×{SCORING_MODEL.weights.USER_VALUE} ·
        DATA_QUALITY ×{SCORING_MODEL.weights.DATA_QUALITY} ·
        ADMIN_UI ×{SCORING_MODEL.weights.ADMIN_UI_IMPORTANCE} ·
        INSTALL_DRIVER ×{SCORING_MODEL.weights.INSTALL_DRIVER} ·
        IMPL_COST ×{SCORING_MODEL.weights.IMPLEMENTATION_COST}
      </p>
    </div>
  );
}