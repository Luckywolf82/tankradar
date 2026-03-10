import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldAlert, CheckCircle2, Star, AlertTriangle, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";

/**
 * DuplicateRemediationPanel
 *
 * Phase 3 placeholder component.
 * No remediation logic is implemented yet.
 *
 * Governance gate: Phase 3 execution logic must not be activated
 * without explicit approval recorded in ProjectControlPanel.
 *
 * Phase 4A additions (read-only preview only):
 * - Canonical station preview (Entry 14)
 * - Merge impact preview (Entry 15)
 *
 * Phase 4C additions:
 * - Live Execute Merge section wired to executeDuplicateMerge backend
 * - Requires explicit curator confirmation checkbox before button is enabled
 * - Shows pre-execution preview summary and post-execution result
 */

// ─── STATIC DATA ─────────────────────────────────────────────────────────────

const SAFETY_CHECKLIST = [
  "Preview only — no merge actions enabled",
  "Canonical station selection not active",
  "No record deletion enabled",
  "No automatic remediation enabled",
  "Curator confirmation workflow required before activation",
  "Audit logging required for future remediation actions",
];

const PROCESS_OVERVIEW = [
  { step: 1, label: "Detect duplicates", desc: "Run duplicate scan to identify candidate groups" },
  { step: 2, label: "Curator triage", desc: "Curator reviews each group and selects canonical station" },
  { step: 3, label: "Non-destructive preview", desc: "System shows merge effect before any write" },
  { step: 4, label: "Curator acknowledgement", desc: "Explicit confirmation required per group" },
  { step: 5, label: "Atomic execution", desc: "Re-point FuelPrice records, soft-archive duplicates" },
  { step: 6, label: "Audit log entry", desc: "Full audit trail written to StationMergeLog" },
];

const MOCK_CANDIDATES = [
  {
    name: "Circle K Moholt",
    chain: "Circle K",
    address: "Moholt allé 57, Trondheim",
    sourceCount: 3,
    priceCount: 14,
    confidenceBadge: "High",
    isCanonicalExample: true,
  },
  {
    name: "Circle K Moholt Senter",
    chain: "Circle K",
    address: "Moholt allé 55, Trondheim",
    sourceCount: 1,
    priceCount: 2,
    confidenceBadge: "Low",
    isCanonicalExample: false,
  },
  {
    name: "Moholt Bensinstasjon",
    chain: null,
    address: "Moholt allé, Trondheim",
    sourceCount: 1,
    priceCount: 1,
    confidenceBadge: "Low",
    isCanonicalExample: false,
  },
];

const MERGE_SUMMARY_STATS = [
  { label: "Canonical station kept", value: "1" },
  { label: "Duplicates soft-archived", value: "2" },
  { label: "FuelPrice records re-pointed", value: "16" },
  { label: "Manual curator confirmation", value: "Required" },
  { label: "Audit log entry", value: "Required" },
  { label: "Hard deletes", value: "None" },
];

const MERGE_ACTION_MAP = [
  { action: "Keep as canonical", station: "Circle K Moholt", style: "text-green-700 bg-green-50 border border-green-200" },
  { action: "Archive duplicate", station: "Circle K Moholt Senter", style: "text-amber-700 bg-amber-50 border border-amber-200" },
  { action: "Archive duplicate", station: "Moholt Bensinstasjon", style: "text-amber-700 bg-amber-50 border border-amber-200" },
  { action: "Re-point FuelPrice records", station: "All duplicate-linked prices → canonical station", style: "text-blue-700 bg-blue-50 border border-blue-200" },
];

// ─── MOCK IDs FOR PHASE 4C DEMO — replace with real IDs from duplicate scan ──
// These are placeholder values only. In production, these come from the
// DuplicateDetectionScanner result passed as props.
const DEMO_CANONICAL_ID = "CANONICAL_STATION_ID_HERE";
const DEMO_DUPLICATE_IDS = ["DUPLICATE_ID_1", "DUPLICATE_ID_2"];

// ─── COMPONENT ───────────────────────────────────────────────────────────────

export default function DuplicateRemediationPanel() {
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // Phase 4B — live dry-run preview state
  const [previewCanonicalId, setPreviewCanonicalId] = useState("");
  const [previewDuplicateIds, setPreviewDuplicateIds] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewResult, setPreviewResult] = useState(null);
  const [previewError, setPreviewError] = useState(null);

  const handleRunDryRunPreview = async () => {
    const canonicalId = previewCanonicalId.trim();
    const dupIds = previewDuplicateIds
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    if (!canonicalId || dupIds.length === 0) {
      setPreviewError("Enter a canonical station ID and at least one duplicate ID.");
      return;
    }

    setPreviewLoading(true);
    setPreviewError(null);
    setPreviewResult(null);

    // PHASE 2.5 VERIFICATION — Log request payload
    const requestPayload = {
      canonical_station_id: canonicalId,
      duplicate_station_ids: dupIds,
    };
    console.log("[PHASE 2.5 VERIFICATION] previewDuplicateMerge request payload:", requestPayload);

    const res = await base44.functions.invoke("previewDuplicateMerge", requestPayload);

    setPreviewLoading(false);
    if (res.data && res.data.safe_to_merge !== undefined) {
      // PHASE 2.5 VERIFICATION — Log response payload
      console.log("[PHASE 2.5 VERIFICATION] previewDuplicateMerge response payload:", res.data);
      console.log("[PHASE 2.5 VERIFICATION] safe_to_merge:", res.data.safe_to_merge);
      console.log("[PHASE 2.5 VERIFICATION] blockers:", res.data.blockers);
      setPreviewResult(res.data);
    } else {
      setPreviewError(res.data?.error ?? "Unknown error from previewDuplicateMerge");
    }
  };

  const handleExecuteMerge = async () => {
    if (!confirmed) return;
    setLoading(true);
    setError(null);
    setResult(null);
    const res = await base44.functions.invoke("executeDuplicateMerge", {
      canonical_station_id: DEMO_CANONICAL_ID,
      duplicate_station_ids: DEMO_DUPLICATE_IDS,
      curator_confirmation: true,
      notes: "Executed via DuplicateRemediationPanel Phase 4C",
    });
    setLoading(false);
    if (res.data && res.data.success) {
      setResult(res.data);
    } else {
      setError(res.data?.error ?? "Unknown error from executeDuplicateMerge");
    }
  };

  return (
    <div className="space-y-4">

      {/* ── 1. Placeholder banner ─────────────────────────────────────────── */}
      <Card className="bg-slate-50 border border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2 text-slate-700">
            <ShieldAlert size={18} className="text-slate-400" />
            Duplicate Remediation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500">
            Phase 3 remediation tools will appear here.
          </p>
          <p className="text-xs text-slate-400 mt-1">
            No records can be merged, modified, or deleted from this panel yet.
            Requires explicit governance approval before activation.
          </p>
        </CardContent>
      </Card>

      {/* ── 2. Safety checklist ───────────────────────────────────────────── */}
      <Card className="border border-amber-200 bg-amber-50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-amber-800">
            Safety checklist — current status
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

      {/* ── 3. Remediation process overview ──────────────────────────────── */}
      <Card className="border border-slate-200 bg-white">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-slate-700">
            Remediation process — overview (not yet active)
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

      {/* ── 4. Canonical station preview ─────────────────────────────────── */}
      <Card className="border border-slate-200 bg-white">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            Canonical station preview
            <span className="text-xs font-normal bg-slate-100 text-slate-500 border border-slate-200 rounded px-2 py-0.5">Read-only</span>
            <span className="text-xs font-normal bg-amber-100 text-amber-700 border border-amber-200 rounded px-2 py-0.5">Not active yet</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
            This does not select or save a canonical station. No remediation action is performed from this panel.
          </div>
          <p className="text-xs text-slate-400 mb-3">Example duplicate group — static mock data only</p>
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
                  {c.chain ?? <span className="italic text-slate-400">Chain unknown</span>}
                </p>
                <p className="text-xs text-slate-400">{c.address}</p>
                <div className="flex gap-2 mt-1 flex-wrap">
                  <span className="text-xs bg-slate-200 text-slate-600 rounded px-1.5 py-0.5">
                    {c.sourceCount} source{c.sourceCount !== 1 ? "s" : ""}
                  </span>
                  <span className="text-xs bg-slate-200 text-slate-600 rounded px-1.5 py-0.5">{c.priceCount} prices</span>
                  <span className={`text-xs rounded px-1.5 py-0.5 ${c.confidenceBadge === "High" ? "bg-green-100 text-green-700" : "bg-slate-200 text-slate-500"}`}>
                    {c.confidenceBadge} conf.
                  </span>
                </div>
                <div className="mt-1">
                  {c.isCanonicalExample ? (
                    <span className="text-xs font-medium bg-green-100 text-green-700 border border-green-300 rounded px-2 py-0.5">
                      Example canonical choice
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400 bg-slate-100 border border-slate-200 rounded px-2 py-0.5">
                      Preview only
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── 5. Merge impact preview ───────────────────────────────────────── */}
      <Card className="border border-slate-200 bg-white">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            Merge impact preview
            <span className="text-xs font-normal bg-slate-100 text-slate-500 border border-slate-200 rounded px-2 py-0.5">Read-only</span>
            <span className="text-xs font-normal bg-amber-100 text-amber-700 border border-amber-200 rounded px-2 py-0.5">Not active yet</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
            Preview only — no merge is executed. No records are changed from this panel.
          </div>
          <p className="text-xs text-slate-400 mb-3">Example merge summary — static mock data only</p>

          {/* Summary stats grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
            {MERGE_SUMMARY_STATS.map(({ label, value }) => (
              <div key={label} className="bg-slate-50 border border-slate-200 rounded p-2">
                <p className="text-xs text-slate-400">{label}</p>
                <p className="text-xs font-semibold text-slate-700 mt-0.5">{value}</p>
              </div>
            ))}
          </div>

          {/* Action mapping table */}
          <div className="border border-slate-200 rounded overflow-hidden">
            <div className="bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
              Planned action mapping
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

      {/* ── 6. Curator confirmation preview ──────────────────────────────── */}
      <Card className="border border-slate-200 bg-white">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            Curator confirmation preview
            <span className="text-xs font-normal bg-slate-100 text-slate-500 border border-slate-200 rounded px-2 py-0.5">Read-only</span>
            <span className="text-xs font-normal bg-amber-100 text-amber-700 border border-amber-200 rounded px-2 py-0.5">Not active yet</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
            Preview only — no confirmation can be submitted from this panel. No merge can be executed from this panel.
          </div>
          <p className="text-xs text-slate-400 mb-3">Example curator checklist — static mock data only</p>

          {/* Mock confirmation checklist */}
          <div className="space-y-2 mb-4">
            {[
              "Canonical station reviewed",
              "Duplicate stations reviewed",
              "Merge impact reviewed",
              "FuelPrice re-point count reviewed",
              "Audit logging requirement acknowledged",
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-slate-600">
                <div className="w-4 h-4 rounded border border-slate-300 bg-slate-100 flex items-center justify-center shrink-0">
                  <CheckCircle2 size={11} className="text-slate-300" />
                </div>
                <span>{item}</span>
                <span className="ml-auto text-slate-400 italic">Preview only</span>
              </div>
            ))}
          </div>

          {/* Mock confirmation summary */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            {[
              { label: "Curator confirmation required", value: "Yes" },
              { label: "Second review required", value: "No" },
              { label: "Execution allowed from this panel", value: "No" },
              { label: "Current mode", value: "Preview only" },
            ].map(({ label, value }) => (
              <div key={label} className="bg-slate-50 border border-slate-200 rounded p-2">
                <p className="text-xs text-slate-400">{label}</p>
                <p className={`text-xs font-semibold mt-0.5 ${value === "No" || value === "Preview only" ? "text-amber-700" : "text-slate-700"}`}>{value}</p>
              </div>
            ))}
          </div>

          {/* Locked-action footer */}
          <div className="border border-slate-200 rounded overflow-hidden">
            <div className="bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-500 flex items-center gap-2">
              <ShieldAlert size={13} className="text-slate-400" />
              Confirmation disabled in preview mode
            </div>
            <div className="px-3 py-3 bg-slate-50">
              <button
                disabled
                className="w-full py-2 px-4 text-xs font-medium rounded border border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed"
              >
                Confirm and execute merge — disabled
              </button>
              <p className="text-xs text-slate-400 text-center mt-2">
                No merge can be executed from this panel. Activation requires governance approval.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── 8. Live dry-run preview — Phase 4B ───────────────────────────── */}
      <Card className="border border-blue-200 bg-blue-50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-blue-800 flex items-center gap-2">
            <CheckCircle2 size={14} className="text-blue-500" />
            Live dry-run merge preview
            <span className="text-xs font-normal bg-blue-100 text-blue-600 border border-blue-200 rounded px-2 py-0.5">Read-only</span>
            <span className="text-xs font-normal bg-green-100 text-green-700 border border-green-200 rounded px-2 py-0.5">Dry-run only</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-3 text-xs text-blue-900 bg-blue-100 border border-blue-200 rounded px-3 py-2">
            Calls <code className="font-mono">previewDuplicateMerge</code> — a fully read-only backend.
            No merge is executed. No records are changed. No StationMergeLog entry is written.
          </div>

          {/* Input fields */}
          <div className="space-y-3 mb-4">
            <div>
              <label className="block text-xs font-medium text-blue-900 mb-1">
                Canonical station ID
              </label>
              <input
                type="text"
                value={previewCanonicalId}
                onChange={(e) => { setPreviewCanonicalId(e.target.value); setPreviewResult(null); setPreviewError(null); }}
                placeholder="e.g. abc123def456"
                className="w-full text-xs border border-blue-200 rounded px-3 py-1.5 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-blue-900 mb-1">
                Duplicate station IDs <span className="font-normal text-slate-500">(comma-separated)</span>
              </label>
              <input
                type="text"
                value={previewDuplicateIds}
                onChange={(e) => { setPreviewDuplicateIds(e.target.value); setPreviewResult(null); setPreviewError(null); }}
                placeholder="e.g. dup001, dup002"
                className="w-full text-xs border border-blue-200 rounded px-3 py-1.5 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
            </div>
          </div>

          {/* Run button */}
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
                Running dry-run preview…
              </span>
            ) : (
              "Run dry-run preview"
            )}
          </button>

          {/* Error state */}
          {previewError && (
            <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2 mb-3">
              <strong>Error:</strong> {previewError}
            </div>
          )}

          {/* Result */}
          {previewResult && (
            <div className="border border-slate-200 rounded overflow-hidden">
              <div className={`px-3 py-2 text-xs font-semibold flex items-center gap-2 ${
                previewResult.safe_to_merge ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
              }`}>
                {previewResult.safe_to_merge ? "✓ safe_to_merge: true" : "✗ safe_to_merge: false"}
              </div>
              {/* PHASE 2.5 VERIFICATION — Debug output */}
              <div className="px-3 py-2 bg-slate-50 border-t border-slate-100">
                <p className="text-xs text-slate-500 font-mono mb-1">
                  [Debug — See browser console for full payload]
                </p>
              </div>
              <div className="divide-y divide-slate-100">
                {[
                  ["canonical_station_exists", String(previewResult.canonical_station_exists)],
                  ["canonical_already_archived", String(previewResult.canonical_already_archived)],
                  ["canonical_in_duplicate_list", String(previewResult.canonical_in_duplicate_list)],
                  ["duplicate_stations_found", String(previewResult.duplicate_stations_found)],
                  ["duplicate_station_ids_missing", previewResult.duplicate_station_ids_missing?.join(", ") || "none"],
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
                  <p className="text-xs font-semibold text-red-700 mb-1">Blockers:</p>
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

      {/* ── 7. Execute Merge — Phase 4C live section ─────────────────────── */}
      <Card className="border border-orange-200 bg-orange-50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-orange-800 flex items-center gap-2">
            <AlertTriangle size={14} className="text-orange-500" />
            Execute Merge
            <span className="text-xs font-normal bg-orange-100 text-orange-600 border border-orange-200 rounded px-2 py-0.5">Phase 4C — live</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-3 text-xs text-orange-900 bg-orange-100 border border-orange-200 rounded px-3 py-2">
            This section connects to the real <code className="font-mono">executeDuplicateMerge</code> backend.
            Execution will re-point FuelPrice records and soft-archive duplicate stations.
            No hard deletes. Audit log is mandatory.
          </div>

          {/* Pre-execution preview summary */}
          {!result && (
            <div className="mb-4 border border-slate-200 rounded overflow-hidden">
              <div className="bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
                Pre-execution summary (demo values)
              </div>
              <div className="divide-y divide-slate-100">
                <div className="flex justify-between px-3 py-2 text-xs">
                  <span className="text-slate-500">Canonical station ID</span>
                  <span className="font-mono text-slate-700">{DEMO_CANONICAL_ID}</span>
                </div>
                <div className="flex justify-between px-3 py-2 text-xs">
                  <span className="text-slate-500">Duplicates to archive</span>
                  <span className="font-mono text-slate-700">{DEMO_DUPLICATE_IDS.length}</span>
                </div>
                <div className="flex justify-between px-3 py-2 text-xs">
                  <span className="text-slate-500">Hard deletes</span>
                  <span className="text-green-700 font-semibold">None</span>
                </div>
                <div className="flex justify-between px-3 py-2 text-xs">
                  <span className="text-slate-500">Audit log</span>
                  <span className="text-green-700 font-semibold">Required — always written</span>
                </div>
              </div>
            </div>
          )}

          {/* Curator confirmation checkbox */}
          {!result && (
            <label className="flex items-start gap-2 mb-4 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="mt-0.5 accent-orange-600"
              />
              <span className="text-xs text-orange-900">
                I have reviewed the canonical station, the duplicates, and the merge impact.
                I authorise this merge operation. I understand this cannot be automatically undone.
              </span>
            </label>
          )}

          {/* Execute button */}
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
                  Executing merge…
                </span>
              ) : (
                "Execute Merge"
              )}
            </button>
          )}

          {/* Error state */}
          {error && (
            <div className="mt-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
              <strong>Error:</strong> {error}
            </div>
          )}

          {/* Post-execution result summary */}
          {result && (
            <div className="mt-2">
              <div className="text-xs text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2 mb-3 font-semibold">
                ✓ Merge executed successfully
              </div>
              <div className="border border-slate-200 rounded overflow-hidden">
                <div className="bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
                  Execution result
                </div>
                <div className="divide-y divide-slate-100">
                  {[
                    ["Canonical station ID", result.canonical_station_id],
                    ["Duplicates archived", result.duplicates_archived],
                    ["FuelPrice records moved", result.fuelprice_records_moved],
                    ["Archive confirmed", result.validation?.duplicates_archived_confirmed ? "Yes" : "Not confirmed"],
                    ["FuelPrice move confirmed", result.validation?.fuelprice_moved_confirmed ? "Yes" : "Not confirmed"],
                    ["Curator", result.curator_id],
                    ["Timestamp", result.timestamp],
                  ].map(([label, value]) => (
                    <div key={label} className="flex justify-between px-3 py-2 text-xs">
                      <span className="text-slate-500">{label}</span>
                      <span className="font-mono text-slate-700 text-right max-w-[55%] break-all">{String(value)}</span>
                    </div>
                  ))}
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-2 text-center">
                Audit log entry written to StationMergeLog.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
}