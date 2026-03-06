import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, HelpCircle } from 'lucide-react';

export default function ConfidencePolicyReport() {
  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">
          User Reported Scan: Confidence & Usage Policy
        </h1>
        <div className="flex gap-2 text-sm text-slate-600">
          <span>Status: PROPOSED</span>
          <span>•</span>
          <span>Date: 2026-03-06</span>
          <span>•</span>
          <span>Version: v1.0</span>
        </div>
      </div>

      {/* Problem Statement */}
      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="text-base text-red-900 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            Current Problem
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-red-900">
          <p>All user_reported prices currently use: <code className="bg-red-100 px-2 py-1 rounded">confidenceScore = 1.0</code></p>
          <p>This treats all three match-states as equally confident:</p>
          <ul className="list-disc list-inside space-y-1 mt-2">
            <li>✗ matched_station_id (high confidence)</li>
            <li>✗ review_needed_station_match (moderate confidence)</li>
            <li>✗ no_safe_station_match (low confidence)</li>
          </ul>
          <p className="font-medium mt-3">Result: Violates semantic integrity. Breaks statistical validity.</p>
        </CardContent>
      </Card>

      {/* Solution: Confidence Score Model */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900">1. Proposed Confidence Score Model</h2>

        {/* matched_station_id */}
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="text-base text-green-900 flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              matched_station_id
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="p-3 bg-green-100 rounded font-mono text-green-900">
              confidenceScore = 0.85
            </div>
            <div>
              <p className="font-medium text-green-900 mb-1">Reasoning:</p>
              <ul className="list-disc list-inside space-y-1 text-green-800">
                <li>Auto-matched via conservative scoring (SCORE_MATCHED ≥ 65)</li>
                <li>User manually asserted price (not OCR-extracted)</li>
                <li>No independent verification step yet</li>
                <li>Geographic + chain + name signals are strong</li>
                <li>Small risk of user error or misreading remains</li>
              </ul>
            </div>
            <div className="p-2 bg-green-100 rounded text-xs text-green-900">
              <strong>Use Case:</strong> Station-verified price data (user-contributed source)
            </div>
          </CardContent>
        </Card>

        {/* review_needed_station_match */}
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="text-base text-amber-900 flex items-center gap-2">
              <HelpCircle className="w-5 h-5" />
              review_needed_station_match
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="p-3 bg-amber-100 rounded font-mono text-amber-900">
              confidenceScore = 0.50
            </div>
            <div>
              <p className="font-medium text-amber-900 mb-1">Reasoning:</p>
              <ul className="list-disc list-inside space-y-1 text-amber-800">
                <li>Multiple candidates or ambiguous signals (35 ≤ score &lt; 65)</li>
                <li>Station matching is uncertain</li>
                <li>User price assertion is present, but station identity unclear</li>
                <li>Requires human review before use in verified statistics</li>
                <li>Useful for market observation and signal detection</li>
              </ul>
            </div>
            <div className="p-2 bg-amber-100 rounded text-xs text-amber-900">
              <strong>Use Case:</strong> Pending curation dataset (requires manual resolution)
            </div>
          </CardContent>
        </Card>

        {/* no_safe_station_match */}
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-base text-red-900 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              no_safe_station_match
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="p-3 bg-red-100 rounded font-mono text-red-900">
              confidenceScore = 0.30
            </div>
            <div>
              <p className="font-medium text-red-900 mb-1">Reasoning:</p>
              <ul className="list-disc list-inside space-y-1 text-red-800">
                <li>Station could not be matched to catalog at all</li>
                <li>Could indicate: new station, location error, or unregistered entry</li>
                <li>User assertion present, but validation impossible</li>
                <li>High risk of misplaced or erroneous data</li>
                <li>Could provide value as "market signal" for discovery</li>
              </ul>
            </div>
            <div className="p-2 bg-red-100 rounded text-xs text-red-900">
              <strong>Use Case:</strong> Market observation only (not for verified statistics, potential new station discovery)
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Usage Classification Model */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900">2. Usage Classification Model</h2>
        <p className="text-slate-600">Three distinct datasets with different trust levels and dashboard visibility:</p>

        {/* Verified Station Statistics */}
        <Card className="border-green-300">
          <CardHeader>
            <CardTitle className="text-base text-green-900">2a. Verified Station Statistics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="p-2 bg-green-50 rounded">
              <p className="font-mono"><strong>Includes:</strong> matched_station_id only</p>
            </div>
            <div>
              <p className="font-medium text-slate-900 mb-2">✅ Use In Dashboard:</p>
              <ul className="list-disc list-inside space-y-1 text-slate-700">
                <li>Regional statistics</li>
                <li>City-level price averages</li>
                <li>Station-specific price history</li>
                <li>Market trends by chain</li>
                <li className="font-medium">Mark clearly as "user-contributed" source</li>
              </ul>
            </div>
            <div>
              <p className="font-medium text-slate-900 mb-2">❌ Do NOT Include:</p>
              <ul className="list-disc list-inside space-y-1 text-slate-700">
                <li>review_needed or no_safe entries</li>
                <li>Entries with low confidence scores</li>
              </ul>
            </div>
            <div className="p-2 bg-green-100 rounded text-xs font-medium text-green-900">
              Semantics: "Prices confirmed for known stations"
            </div>
          </CardContent>
        </Card>

        {/* Observed Market Statistics */}
        <Card className="border-amber-300">
          <CardHeader>
            <CardTitle className="text-base text-amber-900">2b. Observed Market Statistics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="p-2 bg-amber-50 rounded">
              <p className="font-mono"><strong>Includes:</strong> All three match-states (with confidence labels)</p>
            </div>
            <div>
              <p className="font-medium text-slate-900 mb-2">✅ Use In Dashboard:</p>
              <ul className="list-disc list-inside space-y-1 text-slate-700">
                <li>"Observed market prices" widget (separate from verified stats)</li>
                <li>Price range detection (unverified signals)</li>
                <li>Anomaly detection</li>
                <li>Geographic coverage gaps identification</li>
                <li className="font-medium">MUST display confidence breakdown</li>
              </ul>
            </div>
            <div className="p-3 bg-amber-100 rounded border border-amber-300">
              <p className="font-medium text-amber-900 mb-1">Confidence Breakdown:</p>
              <div className="space-y-1 font-mono text-xs text-amber-800">
                <div>matched_station_id: 0.85 (confirmed station)</div>
                <div>review_needed_station_match: 0.50 (unconfirmed station)</div>
                <div>no_safe_station_match: 0.30 (station unknown)</div>
              </div>
            </div>
            <div className="p-2 bg-amber-100 rounded text-xs font-medium text-amber-900">
              Display Label: "These prices are unverified market observations"
            </div>
          </CardContent>
        </Card>

        {/* Pending / Manual Review */}
        <Card className="border-red-300">
          <CardHeader>
            <CardTitle className="text-base text-red-900">2c. Pending / Manual Review Dataset</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="p-2 bg-red-50 rounded">
              <p className="font-mono"><strong>Includes:</strong> review_needed + no_safe entries</p>
            </div>
            <div>
              <p className="font-medium text-slate-900 mb-2">✅ Use In Dashboard (Admin/Curator Only):</p>
              <ul className="list-disc list-inside space-y-1 text-slate-700">
                <li>"Manual Review Queue" widget</li>
                <li>Candidate station suggestions</li>
                <li>Status tracking and resolution workflow</li>
              </ul>
            </div>
            <div>
              <p className="font-medium text-slate-900 mb-2">❌ Never Include:</p>
              <ul className="list-disc list-inside space-y-1 text-slate-700">
                <li>Any public statistics</li>
                <li>User-facing price displays</li>
                <li>Unverified station stats</li>
              </ul>
            </div>
            <div className="p-2 bg-red-100 rounded text-xs font-medium text-red-900">
              Semantics: "Unresolved cases pending manual station assignment or rejection"
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Semantic Labeling Rules */}
      <Card className="bg-slate-50">
        <CardHeader>
          <CardTitle className="text-base">3. Semantic Labeling Rules (In Code)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-xs">
          <div className="p-2 bg-white border border-slate-200 rounded font-mono">
            <div className="text-green-700 font-medium mb-2">matched_station_id</div>
            <div className="text-slate-700">
              confidenceScore: 0.85<br/>
              sourceQuality: "user_verified"<br/>
              includeIn: ["verified_station_stats", "observed_market_stats"]
            </div>
          </div>

          <div className="p-2 bg-white border border-slate-200 rounded font-mono">
            <div className="text-amber-700 font-medium mb-2">review_needed_station_match</div>
            <div className="text-slate-700">
              confidenceScore: 0.50<br/>
              sourceQuality: "station_uncertain"<br/>
              includeIn: ["observed_market_stats", "pending_review"]
            </div>
          </div>

          <div className="p-2 bg-white border border-slate-200 rounded font-mono">
            <div className="text-red-700 font-medium mb-2">no_safe_station_match</div>
            <div className="text-slate-700">
              confidenceScore: 0.30<br/>
              sourceQuality: "station_unknown"<br/>
              includeIn: ["observed_market_stats", "pending_review"]
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Open Questions */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-base text-blue-900 flex items-center gap-2">
            <HelpCircle className="w-5 h-5" />
            Open Questions for Approval
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="border-b border-blue-200 pb-3">
            <p className="font-medium text-blue-900">1. Confidence Score Values</p>
            <p className="text-blue-800 text-xs mt-1">Are 0.85 / 0.50 / 0.30 appropriate, or should these be adjusted?</p>
          </div>

          <div className="border-b border-blue-200 pb-3">
            <p className="font-medium text-blue-900">2. Observed Market Visibility</p>
            <p className="text-blue-800 text-xs mt-1">Should unconfirmed review_needed entries be shown to end users with confidence warnings, or hidden until reviewed?</p>
          </div>

          <div className="border-b border-blue-200 pb-3">
            <p className="font-medium text-blue-900">3. New Station Discovery</p>
            <p className="text-blue-800 text-xs mt-1">Should no_safe_station_match with geographic clustering suggest new stations, or remain purely logged?</p>
          </div>

          <div>
            <p className="font-medium text-blue-900">4. Review SLA</p>
            <p className="text-blue-800 text-xs mt-1">What is expected resolution time for review_needed cases? Should there be automatic aging/archival?</p>
          </div>
        </CardContent>
      </Card>

      {/* Implementation Checklist */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Implementation Checklist</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div>
            <p className="font-medium text-slate-900 mb-2">Phase 1: Data Model Update</p>
            <ul className="list-disc list-inside space-y-1 text-slate-700">
              <li>Update FuelPrice creation to set confidenceScore per match-status</li>
              <li>Add sourceQuality field (for clarity)</li>
              <li>Update dashboard filters to use new scores</li>
            </ul>
          </div>

          <div>
            <p className="font-medium text-slate-900 mb-2">Phase 2: Dashboard Display Update</p>
            <ul className="list-disc list-inside space-y-1 text-slate-700">
              <li>Verified Station Stats: filter matched_station_id only</li>
              <li>Observed Market Stats: show all with confidence labels</li>
              <li>Pending Review: admin-only view</li>
            </ul>
          </div>

          <div>
            <p className="font-medium text-slate-900 mb-2">Phase 3: Documentation Update</p>
            <ul className="list-disc list-inside space-y-1 text-slate-700">
              <li>Update Dashboard integration guide</li>
              <li>Add curator guidelines for review_needed resolution</li>
              <li>Add FAQ for users</li>
            </ul>
          </div>

          <div>
            <p className="font-medium text-slate-900 mb-2">Phase 4: Monitoring</p>
            <ul className="list-disc list-inside space-y-1 text-slate-700">
              <li>Track match-state distribution over time</li>
              <li>Monitor review_needed resolution rate</li>
              <li>Alert if no_safe_station_match becomes dominant</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 text-sm text-blue-900">
        <p className="font-medium">Awaiting approval before implementation.</p>
      </div>
    </div>
  );
}