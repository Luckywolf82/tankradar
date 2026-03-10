import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldAlert, CheckCircle2, Circle } from "lucide-react";

/**
 * DuplicateRemediationPanel
 *
 * Phase 3 placeholder component.
 * No remediation logic is implemented yet.
 *
 * Governance gate: Phase 3 execution logic must not be activated
 * without explicit approval recorded in ProjectControlPanel.
 */

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

export default function DuplicateRemediationPanel() {
  return (
    <div className="space-y-4">
      {/* Placeholder banner */}
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

      {/* Safety checklist */}
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

      {/* Process overview */}
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
    </div>
  );
}