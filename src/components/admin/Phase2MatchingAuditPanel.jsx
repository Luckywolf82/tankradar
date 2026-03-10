import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle, Lock, ClipboardList } from "lucide-react";

export default function Phase2MatchingAuditPanel() {
  const governanceLocks = [
    { rule: "Score threshold (auto-match)", value: "≥65", status: "locked" },
    { rule: "Score threshold (review)", value: "≥35", status: "locked" },
    { rule: "Dominance gap minimum", value: "≥10 (multi-candidate)", status: "locked" },
    { rule: "Distance bands", value: "30m/75m/150m/300m", status: "locked" },
    { rule: "Chain matching logic", value: "exact match + high-confidence gate", status: "locked" },
    { rule: "Name similarity scoring", value: "bigram-based (95/85/70/50)", status: "locked" },
    { rule: "Location signal", value: "+10 match / -15 conflict / 0 uncertain", status: "locked" },
    { rule: "Review routing", value: "low score or insufficient gap", status: "locked" },
  ];

  const validationStatus = [
    { component: "Chain normalization", status: "parser_validated", coverage: "Known chains only (conservative)" },
    { component: "Station name parsing", status: "parser_validated", coverage: "Chain + area keywords" },
    { component: "Match scoring", status: "parser_validated", coverage: "Distance + chain + name + location" },
    { component: "Decision gate", status: "parser_validated", coverage: "Score + dominance gap logic" },
    { component: "Live source validation", status: "not_yet_validated", coverage: "Requires live GooglePlaces data" },
    { component: "Full pipeline (E2E)", status: "not_yet_validated", coverage: "Requires representative sample" },
  ];

  const manualTestCases = [
    {
      category: "Exact Known Stations",
      cases: [
        "Circle K Moholt (exact name + chain)",
        "Uno-X Heimdal (exact name + chain)",
        "Shell Sentrum (exact name + chain)",
      ],
      expectedOutcome: "MATCHED_STATION_ID (score ≥65)",
    },
    {
      category: "Noisy / Variant Names",
      cases: [
        "circlek moholt (lowercase + chain)",
        "CIRCLE K MOHOLT (uppercase + chain)",
        "Circle K - Moholt (punctuation variant)",
        "CK Moholt (abbreviation + location)",
      ],
      expectedOutcome: "MATCHED_STATION_ID or REVIEW_NEEDED (depends on similarity)",
    },
    {
      category: "Multi-Candidate Ambiguity",
      cases: [
        "Moholt (location only, no chain)",
        "Heimdal (location only, no chain)",
        "Station near two Circle K branches",
      ],
      expectedOutcome: "REVIEW_NEEDED (multiple candidates, check dominance gap)",
    },
    {
      category: "Distance Band Edge Cases",
      cases: [
        "Station at 30m (very close)",
        "Station at 75m boundary",
        "Station at 150m boundary",
        "Station at 300m boundary",
        "Station at 301m+ (too far)",
      ],
      expectedOutcome: "Confirm distance signals: 30/20/10/5/0 respectively",
    },
    {
      category: "Chain Mismatch Cases",
      cases: [
        "Circle K reported, but only Uno-X nearby",
        "Shell reported, but station chain unknown",
        "High-confidence mismatch should gate to review",
      ],
      expectedOutcome: "NO_SAFE_STATION_MATCH or REVIEW_NEEDED (chain gate)",
    },
  ];

  return (
    <div className="space-y-4">
      {/* Section 1: Governance Lock Summary */}
      <Card className="border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Lock size={16} className="text-amber-600" />
            Governance Locks (Phase 2 — Frozen)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-xs text-slate-500 bg-amber-50 border border-amber-200 rounded p-2 mb-3">
            All thresholds, gates, and scoring rules are locked and cannot be changed without explicit governance approval.
          </div>
          <div className="space-y-2">
            {governanceLocks.map((lock, idx) => (
              <div key={idx} className="flex items-start justify-between bg-slate-50 rounded p-2.5 text-xs">
                <div>
                  <p className="font-medium text-slate-900">{lock.rule}</p>
                  <p className="text-slate-600 font-mono mt-0.5">{lock.value}</p>
                </div>
                <Badge className="bg-red-100 text-red-700 border-red-200 shrink-0 ml-2">
                  {lock.status}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Section 2: Validation Status Summary */}
      <Card className="border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertCircle size={16} className="text-blue-600" />
            Validation Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-xs text-slate-500 bg-blue-50 border border-blue-200 rounded p-2 mb-3">
            Parser validation confirms parsing logic. Live validation pending — requires representative GooglePlaces data sample.
          </div>
          <div className="space-y-2">
            {validationStatus.map((item, idx) => (
              <div key={idx} className="bg-slate-50 rounded p-2.5 text-xs">
                <div className="flex items-center justify-between mb-1">
                  <p className="font-medium text-slate-900">{item.component}</p>
                  {item.status === "parser_validated" ? (
                    <Badge className="bg-green-100 text-green-700 border-green-200">
                      <CheckCircle2 size={12} className="mr-1 inline" />
                      Parser Validated
                    </Badge>
                  ) : (
                    <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">
                      <AlertCircle size={12} className="mr-1 inline" />
                      Not Yet Validated
                    </Badge>
                  )}
                </div>
                <p className="text-slate-600">{item.coverage}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Section 3: Manual Test Checklist */}
      <Card className="border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardList size={16} className="text-slate-600" />
            Manual Verification Checklist
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded p-2 mb-3">
            Use the Phase 2 Matching Preview panel to verify parser behavior on representative test cases.
          </div>
          <div className="space-y-4">
            {manualTestCases.map((testGroup, idx) => (
              <div key={idx} className="border-l-2 border-slate-300 pl-4 py-2">
                <p className="text-xs font-semibold text-slate-900 mb-2">{testGroup.category}</p>
                <ul className="space-y-1 mb-2">
                  {testGroup.cases.map((testCase, caseIdx) => (
                    <li key={caseIdx} className="text-xs text-slate-600 flex items-start">
                      <span className="inline-block w-4 h-4 mr-2 mt-0.5 border border-slate-300 rounded" />
                      {testCase}
                    </li>
                  ))}
                </ul>
                <p className="text-xs bg-blue-50 border border-blue-200 rounded p-1.5 text-blue-800">
                  <span className="font-semibold">Expected:</span> {testGroup.expectedOutcome}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Section 4: GitHub Visibility */}
      <Card className="bg-green-50 border-green-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CheckCircle2 size={16} className="text-green-600" />
            GitHub Visibility
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-xs text-slate-700 space-y-2">
            <p>
              <strong>Execution Log Status:</strong> Entries 26–28 (Phase 25 implementation history) are now visible in GitHub after publication. Prior entries in the log that stated "Not yet verified in GitHub after publish" have been confirmed accessible.
            </p>
            <p className="text-slate-600">
              This Phase 2 Matching Audit panel (Entry 34) and governance-sync clarification (Entry 35) are also scheduled for GitHub publication.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Footer Notes */}
      <Card className="bg-slate-50 border-slate-200">
        <CardContent className="pt-4 text-xs text-slate-600">
          <p className="mb-2">
            <strong>Audit Purpose:</strong> Verify that the existing Phase 2 parser and matching engine behaves consistently with locked governance rules. All matching logic is parser-validated against fixtures and locked against production changes.
          </p>
          <p className="mb-2">
            <strong>Validation Status:</strong> Parser behavior is validated. Live source validation (GooglePlaces real-world data) is pending.
          </p>
          <p>
            <strong>Next Step:</strong> After manual verification on representative samples using the Preview panel, live validation can proceed with representative GooglePlaces data.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}