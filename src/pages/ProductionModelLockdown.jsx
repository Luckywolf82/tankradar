import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, AlertCircle, Info } from "lucide-react";

export default function ProductionModelLockdown() {
  const [status, setStatus] = useState("info");

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">User Reported Model Lockdown</h1>
          <p className="text-slate-600">Production model v1.0 for user_reported fuel price ingestion</p>
        </div>

        <Alert className="bg-green-50 border-green-200">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800 ml-2">
            <strong>Status: APPROVED & LOCKED</strong> — End-to-end test passed. New LogPrice write-path production ready.
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle>Model Specification v1.0</CardTitle>
            <CardDescription>Required fields for all new user_reported records</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            
            <div className="space-y-3">
              <h3 className="font-semibold text-slate-900">Core Fields (Always Required)</h3>
              <div className="grid gap-2 text-sm">
                <div className="flex justify-between items-center p-3 bg-slate-50 rounded">
                  <span className="font-mono">fuelType</span>
                  <Badge>string</Badge>
                </div>
                <div className="flex justify-between items-center p-3 bg-slate-50 rounded">
                  <span className="font-mono">priceNok</span>
                  <Badge>number</Badge>
                </div>
                <div className="flex justify-between items-center p-3 bg-slate-50 rounded">
                  <span className="font-mono">priceType</span>
                  <Badge variant="secondary">"user_reported"</Badge>
                </div>
                <div className="flex justify-between items-center p-3 bg-slate-50 rounded">
                  <span className="font-mono">sourceName</span>
                  <Badge variant="secondary">"user_reported"</Badge>
                </div>
                <div className="flex justify-between items-center p-3 bg-slate-50 rounded">
                  <span className="font-mono">fetchedAt</span>
                  <Badge>ISO8601 timestamp</Badge>
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t">
              <h3 className="font-semibold text-slate-900">New Model Fields (V1.0 REQUIRED)</h3>
              <div className="grid gap-2 text-sm">
                <div className="flex justify-between items-center p-3 bg-green-50 rounded border border-green-200">
                  <span className="font-mono">confidenceScore</span>
                  <Badge className="bg-green-600">0.30 | 0.50 | 0.85</Badge>
                </div>
                <div className="flex justify-between items-center p-3 bg-green-50 rounded border border-green-200">
                  <span className="font-mono">confidenceReason</span>
                  <Badge className="bg-green-600">dynamic string</Badge>
                </div>
                <div className="flex justify-between items-center p-3 bg-green-50 rounded border border-green-200">
                  <span className="font-mono">gps_latitude</span>
                  <Badge className="bg-green-600">number | null</Badge>
                </div>
                <div className="flex justify-between items-center p-3 bg-green-50 rounded border border-green-200">
                  <span className="font-mono">gps_longitude</span>
                  <Badge className="bg-green-600">number | null</Badge>
                </div>
                <div className="flex justify-between items-center p-3 bg-green-50 rounded border border-green-200">
                  <span className="font-mono">station_match_status</span>
                  <Badge className="bg-green-600">matched | review | no_safe</Badge>
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t">
              <h3 className="font-semibold text-slate-900">Conditional Fields</h3>
              <div className="space-y-2 text-sm">
                <div className="p-3 bg-blue-50 rounded border border-blue-200">
                  <div className="font-mono font-semibold mb-1">If matched_station_id:</div>
                  <div className="text-slate-700">
                    <code>stationId</code> + <code>confidenceScore = 0.85</code>
                  </div>
                </div>
                <div className="p-3 bg-blue-50 rounded border border-blue-200">
                  <div className="font-mono font-semibold mb-1">If review_needed_station_match:</div>
                  <div className="text-slate-700">
                    <code>station_match_candidates[]</code> + <code>confidenceScore = 0.50</code>
                  </div>
                </div>
                <div className="p-3 bg-blue-50 rounded border border-blue-200">
                  <div className="font-mono font-semibold mb-1">If no_safe_station_match:</div>
                  <div className="text-slate-700">
                    <code>station_name</code>, <code>station_chain</code>, <code>confidenceScore = 0.30</code>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Confidence Score Assignment Rules</CardTitle>
            <CardDescription>Dynamic scoring based on station matching result</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="p-4 bg-yellow-50 rounded border border-yellow-200">
                <div className="flex gap-3">
                  <div className="text-2xl font-bold text-yellow-600">0.85</div>
                  <div>
                    <div className="font-semibold text-slate-900">Matched Station (High Confidence)</div>
                    <div className="text-sm text-slate-600">
                      Reason: "chain_match + name_similarity + distance_close"
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-4 bg-orange-50 rounded border border-orange-200">
                <div className="flex gap-3">
                  <div className="text-2xl font-bold text-orange-600">0.50</div>
                  <div>
                    <div className="font-semibold text-slate-900">Review Needed (Moderate Confidence)</div>
                    <div className="text-sm text-slate-600">
                      Reason: "ambiguous_station + uncertain_distance"
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-4 bg-red-50 rounded border border-red-200">
                <div className="flex gap-3">
                  <div className="text-2xl font-bold text-red-600">0.30</div>
                  <div>
                    <div className="font-semibold text-slate-900">No Safe Match (Low Confidence)</div>
                    <div className="text-sm text-slate-600">
                      Reason: "no_station_match + gps_signal_only"
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Legacy Record Migration Status</CardTitle>
            <CardDescription>Handling of pre-v1.0 user_reported records</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="bg-blue-50 border-blue-200">
              <Info className="h-4 w-4" />
              <AlertDescription className="ml-2 text-sm text-slate-700">
                <strong>Current state:</strong> 3 legacy records identified (confidenceScore=1.0, missing new fields)
              </AlertDescription>
            </Alert>
            <div className="space-y-3">
              <div className="p-3 bg-slate-50 rounded">
                <div className="font-semibold text-slate-900 mb-2">Migration Strategy</div>
                <ul className="space-y-2 text-sm text-slate-700">
                  <li>✓ <strong>Matched legacy (1):</strong> Backfill with 0.85 + "legacy_backfill: station_id_matched"</li>
                  <li>✓ <strong>Review needed legacy (1):</strong> Backfill with 0.50 + "legacy_backfill: review_needed_candidates"</li>
                  <li>✓ <strong>No safe match legacy (1):</strong> Backfill with 0.30 + "legacy_backfill: no_safe_match + station_metadata"</li>
                  <li>✓ <strong>Execute:</strong> Run <code>backfillLegacyUserReportedScores</code> function</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Exclusions from Statistics</CardTitle>
            <CardDescription>Dashboard filtering rules for user_reported data</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3 text-sm">
              <div className="p-3 bg-slate-50 rounded">
                <div className="font-semibold text-slate-900 mb-1">Market Statistics (ObservedMarketStatistics)</div>
                <div className="text-slate-700">Include: matched_station_id + review_needed_station_match (all confidence levels)</div>
                <div className="text-slate-600 text-xs mt-1">Exclude: no_safe_station_match</div>
              </div>
              <div className="p-3 bg-slate-50 rounded">
                <div className="font-semibold text-slate-900 mb-1">Verified Statistics (LiveMarketStats)</div>
                <div className="text-slate-700">Include: matched_station_id only (confidence 0.85)</div>
                <div className="text-slate-600 text-xs mt-1">Exclude: review_needed, no_safe_station_match</div>
              </div>
              <div className="p-3 bg-slate-50 rounded">
                <div className="font-semibold text-slate-900 mb-1">Manual Review Queue (Admin)</div>
                <div className="text-slate-700">Include: review_needed_station_match + legacy with uncertainty</div>
                <div className="text-slate-600 text-xs mt-1">Exclude: matched_station_id, no_safe_station_match</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Immutable Production Rules (V1.0)</CardTitle>
            <CardDescription>These rules lock the model and cannot be changed without new version release</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-slate-700">
              <li className="flex gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span>LogPrice write-path MUST set confidenceScore dynamically based on matchResult.status</span>
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span>confidenceReason MUST be populated with semantic explanation</span>
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span>gps_latitude and gps_longitude MUST be captured from scan (or set to null)</span>
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span>station_match_status MUST reflect actual matching result</span>
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span>No record shall have confidenceScore=1.0 after this date (2026-03-06)</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Next Steps</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-2 text-sm text-slate-700 list-decimal list-inside">
              <li>Execute <code>backfillLegacyUserReportedScores</code> to migrate legacy records</li>
              <li>Verify all records now conform to v1.0 model via database audit</li>
              <li>Update ObservedMarketStatistics and LiveMarketStats filtering if needed</li>
              <li>Mark this page as historical reference for model compliance</li>
              <li>Plan v1.1 improvements (OCR refinement, GPS calibration, etc.) in separate initiative</li>
            </ol>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}