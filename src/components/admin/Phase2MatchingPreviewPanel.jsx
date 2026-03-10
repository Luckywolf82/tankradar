import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { base44 } from "@/api/base44Client";
import { Search, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";

export default function Phase2MatchingPreviewPanel() {
  const [stationName, setStationName] = useState("");
  const [chain, setChain] = useState("");
  const [city, setCity] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handlePreview = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // Call existing matchStationForUserReportedPrice in preview-only mode
      // This reads the existing Phase 2 parser + matcher logic without writing
      const response = await base44.functions.invoke(
        "matchStationForUserReportedPrice",
        {
          preview_mode: true,
          station_name: stationName,
          chain: chain || null,
          city: city || null,
          latitude: latitude ? parseFloat(latitude) : null,
          longitude: longitude ? parseFloat(longitude) : null,
        }
      );

      setResult(response.data);
    } catch (err) {
      setError(err.message || "Failed to preview match");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Input Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Search size={16} className="text-slate-600" />
            Phase 2 Matching Preview
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-xs text-slate-500 bg-blue-50 border border-blue-200 rounded p-2">
            Read-only preview of existing Phase 2 station name parser and matching logic. No data is written or modified.
          </div>

          {/* Input Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="stationName" className="text-xs font-medium text-slate-600 mb-1 block">
                Station Name *
              </Label>
              <Input
                id="stationName"
                placeholder="e.g., Circle K Moholt"
                value={stationName}
                onChange={(e) => setStationName(e.target.value)}
                disabled={loading}
              />
            </div>

            <div>
              <Label htmlFor="chain" className="text-xs font-medium text-slate-600 mb-1 block">
                Chain (optional)
              </Label>
              <Input
                id="chain"
                placeholder="e.g., circle k"
                value={chain}
                onChange={(e) => setChain(e.target.value)}
                disabled={loading}
              />
            </div>

            <div>
              <Label htmlFor="city" className="text-xs font-medium text-slate-600 mb-1 block">
                City (optional)
              </Label>
              <Input
                id="city"
                placeholder="e.g., Trondheim"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                disabled={loading}
              />
            </div>

            <div>
              <Label htmlFor="latitude" className="text-xs font-medium text-slate-600 mb-1 block">
                Latitude (optional)
              </Label>
              <Input
                id="latitude"
                placeholder="63.4305"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                disabled={loading}
                type="number"
                step="0.0001"
              />
            </div>

            <div>
              <Label htmlFor="longitude" className="text-xs font-medium text-slate-600 mb-1 block">
                Longitude (optional)
              </Label>
              <Input
                id="longitude"
                placeholder="10.3951"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                disabled={loading}
                type="number"
                step="0.0001"
              />
            </div>
          </div>

          {/* Preview Button */}
          <Button
            onClick={handlePreview}
            disabled={loading || !stationName}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="mr-2 animate-spin" />
                Previewing...
              </>
            ) : (
              <>
                <Search size={16} className="mr-2" />
                Preview Existing Phase 2 Match
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Card className="bg-red-50 border-red-200">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <AlertCircle size={16} className="text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-900">Preview Error</p>
                <p className="text-xs text-red-700 mt-1">{error}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Result Display */}
      {result && (
        <Card className="border-slate-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle2 size={16} className="text-green-600" />
              Match Preview Result
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Parsed Data */}
            <div>
              <p className="text-xs font-semibold text-slate-700 mb-2">Parsed Data</p>
              <div className="bg-slate-50 rounded p-3 space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-600">Chain:</span>
                  <span className="font-mono text-slate-900">{result.parsed_chain || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Location:</span>
                  <span className="font-mono text-slate-900">{result.parsed_location || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Name Base:</span>
                  <span className="font-mono text-slate-900">{result.parsed_name_base || "—"}</span>
                </div>
              </div>
            </div>

            {/* Matching Context */}
            {result.candidate_pool_source && (
              <div>
                <p className="text-xs font-semibold text-slate-700 mb-2">Matching Context</p>
                <div className="bg-slate-50 rounded p-3 space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Candidate Pool:</span>
                    <span className="font-mono text-slate-900">{result.candidate_pool_source}</span>
                  </div>
                  {result.candidates_count !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-slate-600">Candidates Found:</span>
                      <span className="font-mono text-slate-900">{result.candidates_count}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Top Candidates */}
            {result.top_candidates && result.top_candidates.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-700 mb-2">Top Candidates</p>
                <div className="space-y-2">
                  {result.top_candidates.map((candidate, idx) => (
                    <div key={idx} className="bg-slate-50 rounded p-2.5 text-xs">
                      <div className="flex justify-between items-start mb-1.5">
                        <span className="font-medium text-slate-900">{candidate.name || "Unknown"}</span>
                        <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-mono">
                          {(candidate.final_score || 0).toFixed(2)}
                        </span>
                      </div>
                      {candidate.chain && (
                        <div className="text-slate-600 mb-1">Chain: {candidate.chain}</div>
                      )}
                      {candidate.city && (
                        <div className="text-slate-600 mb-1">City: {candidate.city}</div>
                      )}
                      {candidate.distance_km !== undefined && (
                        <div className="text-slate-600">Distance: {candidate.distance_km.toFixed(2)} km</div>
                      )}
                      {candidate.score_breakdown && (
                        <div className="mt-2 pt-2 border-t border-slate-200 text-slate-500 space-y-0.5">
                          {Object.entries(candidate.score_breakdown).map(([key, value]) => (
                            <div key={key} className="flex justify-between text-xs">
                              <span>{key}:</span>
                              <span className="font-mono">{typeof value === "number" ? value.toFixed(2) : value}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Final Outcome */}
            {result.final_decision && (
              <div>
                <p className="text-xs font-semibold text-slate-700 mb-2">Final Outcome</p>
                <div className="bg-slate-50 rounded p-3 space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Decision:</span>
                    <span className="font-mono font-medium text-slate-900">{result.final_decision}</span>
                  </div>
                  {result.matched_station_id && (
                    <div className="flex justify-between">
                      <span className="text-slate-600">Matched Station ID:</span>
                      <span className="font-mono text-slate-900">{result.matched_station_id}</span>
                    </div>
                  )}
                  {result.review_needed_reason && (
                    <div className="flex justify-between">
                      <span className="text-slate-600">Review Reason:</span>
                      <span className="font-mono text-slate-900">{result.review_needed_reason}</span>
                    </div>
                  )}
                  {result.dominance_gap !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-slate-600">Dominance Gap:</span>
                      <span className="font-mono text-slate-900">{result.dominance_gap.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Debug Notes */}
            {result.debug_notes && (
              <div>
                <p className="text-xs font-semibold text-slate-700 mb-2">Debug Notes</p>
                <div className="bg-amber-50 border border-amber-200 rounded p-2 text-xs text-amber-800">
                  {result.debug_notes}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}