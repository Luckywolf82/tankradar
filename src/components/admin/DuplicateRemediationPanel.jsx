import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldAlert } from "lucide-react";

/**
 * DuplicateRemediationPanel
 *
 * Phase 3 placeholder component.
 * No remediation logic is implemented yet.
 *
 * Governance gate: Phase 3 execution logic must not be activated
 * without explicit approval recorded in ProjectControlPanel.
 */
export default function DuplicateRemediationPanel() {
  return (
    <Card className="bg-slate-50 border border-slate-200">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2 text-slate-700">
          <ShieldAlert size={18} className="text-slate-400" />
          Duplicate Remediation
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center py-6">
          <p className="text-sm text-slate-500">
            Phase 3 remediation tools will appear here.
          </p>
          <p className="text-xs text-slate-400 mt-2">
            No records can be merged, modified, or deleted from this panel yet.
            Requires explicit governance approval before activation.
          </p>
        </div>

        {/* TODO: CanonicalStationSelector
         *   - Side-by-side comparison of all stations in a duplicate group
         *   - Curator selects which record is canonical
         *   - Field-by-field diff view
         *   - Requires explicit curator selection before proceeding
         */}

        {/* TODO: MergePreviewPanel
         *   - Non-destructive preview of merge effect
         *   - Shows fields that will be lost on merge
         *   - Shows count of FuelPrice records to be re-pointed
         *   - Read-only — no writes at preview stage
         *   - Requires curator acknowledgement before execution
         */}
      </CardContent>
    </Card>
  );
}