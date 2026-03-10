import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldAlert, CheckCircle2, Star } from "lucide-react";

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

// ─── COMPONENT ───────────────────────────────────────────────────────────────

export default function DuplicateRemediationPanel() {
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
      {/* (section already present below) */}
      {/* ── CURATOR CONFIRMATION PREVIEW IS SECTION 6 — see below ──────── */}
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

    </div>
  );
}