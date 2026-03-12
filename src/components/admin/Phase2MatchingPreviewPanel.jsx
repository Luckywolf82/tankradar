import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { base44 } from "@/api/base44Client";
import { Search, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import GeoContextLinks from "../geo/GeoContextLinks";

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
      const response = await base44.functions.invoke(
        "matchStationForUserReportedPrice",
        {
          preview_mode: true,
          station_name: stationName,
          station_chain: chain || null,
          city: city || null,
          latitude: latitude ? parseFloat(latitude) : null,
          longitude: longitude ? parseFloat(longitude) : null,
        }
      );
      setResult(response.data);
    } catch (err) {
      setError(err.message || "Ukjent feil");
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
            Matching-preview
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-xs text-slate-700 bg-blue-50 border border-blue-200 rounded p-3 space-y-1">
            <p className="font-semibold text-blue-800">Lesemodus — ingen data lagres eller endres.</p>
            <p className="text-blue-700">Bruk denne forhåndsvisningen for å forstå hvordan matchingmotoren tolker et stasjonsnavn <strong>før</strong> noe sendes til review.</p>
            <ol className="list-decimal list-inside mt-2 space-y-0.5 text-blue-700">
              <li>Legg inn rapportert stasjon</li>
              <li>Les hvordan systemet tolker navnet</li>
              <li>Vurder kandidatene og poengene</li>
              <li>Se om utfallet blir match, review eller ingen trygg match</li>
            </ol>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="stationName" className="text-xs font-medium text-slate-600 mb-1 block">
                Stasjonsnavn *
              </Label>
              <Input
                id="stationName"
                placeholder="f.eks. Circle K Moholt"
                value={stationName}
                onChange={(e) => setStationName(e.target.value)}
                disabled={loading}
              />
            </div>

            <div>
              <Label htmlFor="chain" className="text-xs font-medium text-slate-600 mb-1 block">
                Kjede (valgfritt)
              </Label>
              <Input
                id="chain"
                placeholder="f.eks. circle k"
                value={chain}
                onChange={(e) => setChain(e.target.value)}
                disabled={loading}
              />
            </div>

            <div>
              <Label htmlFor="city" className="text-xs font-medium text-slate-600 mb-1 block">
                By (valgfritt)
              </Label>
              <Input
                id="city"
                placeholder="f.eks. Trondheim"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                disabled={loading}
              />
            </div>

            <div>
              <Label htmlFor="latitude" className="text-xs font-medium text-slate-600 mb-1 block">
                Breddegrad (valgfritt)
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
                Lengdegrad (valgfritt)
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

          <Button
            onClick={handlePreview}
            disabled={loading || !stationName}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="mr-2 animate-spin" />
                Kjører preview...
              </>
            ) : (
              <>
                <Search size={16} className="mr-2" />
                Kjør matching-preview
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <Card className="bg-red-50 border-red-200">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <AlertCircle size={16} className="text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-900">Feil i preview</p>
                <p className="text-xs text-red-700 mt-1">{error}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Result */}
      {result && (
        <Card className="border-slate-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle2 size={16} className="text-green-600" />
              Resultat fra matching-preview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Step 1 */}
            <div>
              <p className="text-xs font-semibold text-slate-700 mb-2">Steg 1: Tolket input</p>
              <div className="bg-slate-50 rounded p-3 space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-600">Tolket kjede:</span>
                  <span className="font-mono text-slate-900">{result.parsed_chain || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Tolket sted:</span>
                  <span className="font-mono text-slate-900">{result.parsed_location || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Tolket navnebase:</span>
                  <span className="font-mono text-slate-900">{result.parsed_name_base || "—"}</span>
                </div>
              </div>
            </div>

            {/* Step 2 */}
            {result.candidate_pool_source && (
              <div>
                <p className="text-xs font-semibold text-slate-700 mb-2">Steg 2: Matchingskontekst</p>
                <div className="bg-slate-50 rounded p-3 space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Kandidatgrunnlag:</span>
                    <span className="font-mono text-slate-900">{result.candidate_pool_source}</span>
                  </div>
                  {result.candidates_count !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-slate-600">Antall kandidater:</span>
                      <span className="font-mono text-slate-900">{result.candidates_count}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 3 */}
            {result.top_candidates && result.top_candidates.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-700 mb-2">Steg 3: Beste kandidater</p>
                <div className="space-y-2">
                  {result.top_candidates.map((candidate, idx) => (
                    <div key={idx} className="bg-slate-50 rounded p-2.5 text-xs">
                      <div className="flex justify-between items-start mb-1.5">
                        <span className="font-medium text-slate-900">{candidate.name || "Ukjent"}</span>
                        <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-mono">
                          {(candidate.final_score || 0).toFixed(2)}
                        </span>
                      </div>
                      {candidate.chain && (
                        <div className="text-slate-600 mb-1">Kjede: {candidate.chain}</div>
                      )}
                      {candidate.city && (
                        <div className="text-slate-600 mb-1">By: {candidate.city}</div>
                      )}
                      {candidate.distance_km !== undefined && (
                        <div className="text-slate-600">Avstand: {candidate.distance_km.toFixed(2)} km</div>
                      )}
                      {candidate.score_breakdown && (
                        <div className="mt-2 pt-2 border-t border-slate-200 text-slate-500 space-y-0.5">
                          <p className="font-medium text-slate-600 mb-1">Poengdetaljer:</p>
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

            {/* Step 4 */}
            {result.final_decision && (
              <div>
                <p className="text-xs font-semibold text-slate-700 mb-2">Steg 4: Endelig beslutning</p>
                <div className="bg-slate-50 rounded p-3 space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Beslutning:</span>
                    <span className="font-mono font-medium text-slate-900">{result.final_decision}</span>
                  </div>
                  {result.matched_station_id && (
                    <div className="flex justify-between">
                      <span className="text-slate-600">Matchet stasjons-ID:</span>
                      <span className="font-mono text-slate-900">{result.matched_station_id}</span>
                    </div>
                  )}
                  {result.review_needed_reason && (
                    <div className="flex justify-between">
                      <span className="text-slate-600">Årsak til review:</span>
                      <span className="font-mono text-slate-900">{result.review_needed_reason}</span>
                    </div>
                  )}
                  {result.dominance_gap !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-slate-600">Dominance gap:</span>
                      <span className="font-mono text-slate-900">{result.dominance_gap.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 5 */}
            {result.debug_notes && (
              <div>
                <p className="text-xs font-semibold text-slate-700 mb-2">Steg 5: Debugnotater</p>
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