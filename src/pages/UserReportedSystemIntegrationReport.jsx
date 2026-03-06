import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, AlertCircle, Info } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function UserReportedSystemIntegrationReport() {
  const [data, setData] = useState({
    userReported: [],
    googlePlaces: [],
    ssbData: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [ur, gp] = await Promise.all([
          base44.entities.FuelPrice.filter({ priceType: "user_reported" }),
          base44.entities.FuelPrice.filter({ sourceName: "GooglePlaces" })
        ]);
        setData({ userReported: ur, googlePlaces: gp, ssbData: [] });
      } catch (err) {
        console.error("Failed to load data:", err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Categorize user_reported records
  const matched = data.userReported.filter(r => r.station_match_status === "matched_station_id");
  const review = data.userReported.filter(r => r.station_match_status === "review_needed_station_match");
  const noSafe = data.userReported.filter(r => r.station_match_status === "no_safe_station_match");

  const getConfidenceColor = (score) => {
    if (score === 0.85) return "bg-green-50 border-green-200";
    if (score === 0.50) return "bg-amber-50 border-amber-200";
    if (score === 0.30) return "bg-red-50 border-red-200";
    return "bg-slate-50";
  };

  const getConfidenceBadge = (score) => {
    if (score === 0.85) return <Badge className="bg-green-600">Høy (0.85)</Badge>;
    if (score === 0.50) return <Badge className="bg-amber-600">Moderat (0.50)</Badge>;
    if (score === 0.30) return <Badge className="bg-red-600">Lav (0.30)</Badge>;
    return <Badge variant="outline">Ukjent</Badge>;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">User Reported Data - System Integration</h1>
          <p className="text-slate-600">Verifisering av hvordan låst produksjonsmodell integreres i app</p>
        </div>

        {/* Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Totalt user_reported</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">{data.userReported.length}</div>
              <p className="text-xs text-slate-500 mt-1">records i database</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-green-700">Verified (Matched)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{matched.length}</div>
              <p className="text-xs text-slate-500 mt-1">confidenceScore 0.85</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-amber-700">Observed (Review)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-amber-600">{review.length}</div>
              <p className="text-xs text-slate-500 mt-1">confidenceScore 0.50</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-red-700">Unconfirmed (No Safe)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">{noSafe.length}</div>
              <p className="text-xs text-slate-500 mt-1">confidenceScore 0.30</p>
            </CardContent>
          </Card>
        </div>

        {/* 1. Verified Station Statistics */}
        <Card>
          <CardHeader>
            <CardTitle>1. Verified Station Statistics (LiveMarketStats)</CardTitle>
            <CardDescription>
              Komponenten <code>LiveMarketStats</code> - kun GooglePlaces data
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="bg-blue-50 border-blue-200">
              <Info className="h-4 w-4" />
              <AlertDescription className="ml-2 text-sm">
                <strong>Observasjon:</strong> LiveMarketStats filtrerer BARE GooglePlaces, ikke user_reported!
              </AlertDescription>
            </Alert>

            <div className="bg-slate-50 p-4 rounded border border-slate-200 font-mono text-sm">
              <div className="text-slate-600 mb-3">Filter logic:</div>
              <div className="space-y-1 text-slate-800">
                <div>• fuelType === selectedFuel</div>
                <div>• plausibilityStatus === "realistic_price"</div>
                <div className="font-semibold text-green-700">• sourceName === "GooglePlaces" ✓</div>
              </div>
            </div>

            <div className="p-4 bg-amber-50 rounded border border-amber-200">
              <div className="font-semibold text-amber-900 mb-2">⚠ Status: User_reported UTELATT</div>
              <p className="text-sm text-amber-800">
                User_reported records vises IKKE i LiveMarketStats. Komponenten er designet for GooglePlaces-data kun.
              </p>
            </div>

            <div className="text-sm text-slate-700 space-y-2">
              <p><strong>Records som brukes:</strong> {data.googlePlaces.length} GooglePlaces priser</p>
              <p><strong>Records som IKKE brukes:</strong> {data.userReported.length} user_reported priser</p>
            </div>
          </CardContent>
        </Card>

        {/* 2. Observed Market Statistics */}
        <Card>
          <CardHeader>
            <CardTitle>2. Observed Market Statistics (ObservedMarketStatistics)</CardTitle>
            <CardDescription>
              Komponenten viser alle user_reported observasjoner med riktig filtreringslogikk
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="ml-2 text-sm text-green-800">
                <strong>Status KORREKT:</strong> ObservedMarketStatistics implementerer policy for user_reported data
              </AlertDescription>
            </Alert>

            <div className="bg-slate-50 p-4 rounded border border-slate-200 font-mono text-sm space-y-3">
              <div className="text-slate-600">Filtreringslogikk:</div>
              <div className="space-y-1 text-slate-800">
                <div>• fuelType === selectedFuel</div>
                <div>• plausibilityStatus === "realistic_price"</div>
                <div className="font-semibold text-green-700">• priceType === "user_reported" ✓</div>
              </div>

              <div className="border-t border-slate-300 pt-3 text-slate-600">Policy (default, includeUnconfirmed=false):</div>
              <div className="space-y-1 text-slate-800">
                <div className="font-semibold text-green-700">✓ Included: matched_station_id</div>
                <div className="font-semibold text-amber-700">✓ Included: review_needed_station_match</div>
                <div className="font-semibold text-red-700">✗ Excluded: no_safe_station_match (by default)</div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-green-50 rounded border border-green-200">
                <div className="text-sm font-semibold text-green-700">Inkludert</div>
                <div className="text-2xl font-bold text-green-600 mt-1">{matched.length + review.length}</div>
                <div className="text-xs text-green-700 mt-1">matched + review</div>
              </div>
              <div className="p-3 bg-red-50 rounded border border-red-200">
                <div className="text-sm font-semibold text-red-700">Ekskludert (standard)</div>
                <div className="text-2xl font-bold text-red-600 mt-1">{noSafe.length}</div>
                <div className="text-xs text-red-700 mt-1">no_safe_station_match</div>
              </div>
              <div className="p-3 bg-blue-50 rounded border border-blue-200">
                <div className="text-sm font-semibold text-blue-700">Statistikk basert på</div>
                <div className="text-xl font-bold text-blue-600 mt-1">Konfidens</div>
                <div className="text-xs text-blue-700 mt-1">0.85 + 0.50</div>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded">
              <div className="font-semibold text-slate-900 mb-2">Konfidensfordeling (vises som toggle):</div>
              <div className="space-y-2 text-sm text-slate-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    <span>Bekreftet stasjon (0.85)</span>
                  </div>
                  <span className="font-semibold">{matched.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
                    <span>Usikker stasjon (0.50)</span>
                  </div>
                  <span className="font-semibold">{review.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                    <span>Ukjent stasjon (0.30)</span>
                  </div>
                  <span className="font-semibold">{noSafe.length} (ekskludert)</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 3. Manual Review Queue */}
        <Card>
          <CardHeader>
            <CardTitle>3. Manual Review Queue (Admin)</CardTitle>
            <CardDescription>
              Behandling av ambiguous og unconfirmed data
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="bg-yellow-50 border-yellow-200">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="ml-2 text-sm text-yellow-800">
                <strong>Status:</strong> Review queue eksisterer i database men ingen dedikert admin UI implementert ennå
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <div className="p-3 bg-slate-50 rounded border border-slate-200">
                <div className="font-semibold text-slate-900 mb-2">Review Queue Eligibility:</div>
                <div className="space-y-2 text-sm text-slate-700">
                  <div>✓ <strong>review_needed_station_match ({review.length} records)</strong></div>
                  <div className="ml-4 text-xs text-slate-600">Kandidater finnes, men matching usikker. Warte på manuell gjennomgang.</div>
                  
                  <div className="pt-2">✗ <strong>no_safe_station_match ({noSafe.length} records)</strong></div>
                  <div className="ml-4 text-xs text-slate-600">For lite sikker matching for manuell review. Primært for geospatial clustering/discovery.</div>
                </div>
              </div>

              <div className="p-3 bg-blue-50 rounded border border-blue-200">
                <div className="font-semibold text-blue-900 mb-2">Implementeringsstatus:</div>
                <div className="space-y-1 text-sm text-blue-800">
                  <div>• Data finnes i database</div>
                  <div>• Filtreringslogikk er definert</div>
                  <div>• Admin dashboard side: <code>UserReportedScanOperations</code> (pages)</div>
                  <div>• UI for manuelle godkjennelser: PLANLAGT i neste fase</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Live Data Examples */}
        <Card>
          <CardHeader>
            <CardTitle>Live Data Examples</CardTitle>
            <CardDescription>Konkrete eksempler fra hver kategori</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            
            {/* Example 1: Matched */}
            {matched.length > 0 && (
              <div>
                <div className="text-sm font-semibold text-green-700 mb-2">
                  ✓ Verified Station (0.85 konfidens) — Inkludert i ObservedMarketStatistics
                </div>
                <div className={`p-4 rounded border ${getConfidenceColor(matched[0]?.confidenceScore)}`}>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-slate-600">Pris</span>
                      <div className="font-semibold text-slate-900">{matched[0]?.priceNok} NOK/L</div>
                    </div>
                    <div>
                      <span className="text-slate-600">Lokasjon</span>
                      <div className="font-semibold text-slate-900">{matched[0]?.locationLabel}</div>
                    </div>
                    <div>
                      <span className="text-slate-600">Stasjon</span>
                      <div className="font-semibold text-slate-900">{matched[0]?.station_name || "—"}</div>
                    </div>
                    <div>
                      <span className="text-slate-600">Drivstoff</span>
                      <div className="font-semibold text-slate-900">{matched[0]?.fuelType}</div>
                    </div>
                    <div className="col-span-2">
                      <span className="text-slate-600">Grunn</span>
                      <div className="font-semibold text-slate-900">{matched[0]?.confidenceReason}</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Example 2: Review */}
            {review.length > 0 && (
              <div>
                <div className="text-sm font-semibold text-amber-700 mb-2">
                  ⚠ Ambiguous Station (0.50 konfidens) — Inkludert i ObservedMarketStatistics
                </div>
                <div className={`p-4 rounded border ${getConfidenceColor(review[0]?.confidenceScore)}`}>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-slate-600">Pris</span>
                      <div className="font-semibold text-slate-900">{review[0]?.priceNok} NOK/L</div>
                    </div>
                    <div>
                      <span className="text-slate-600">Lokasjon</span>
                      <div className="font-semibold text-slate-900">{review[0]?.locationLabel}</div>
                    </div>
                    <div>
                      <span className="text-slate-600">Stasjon</span>
                      <div className="font-semibold text-slate-900">{review[0]?.station_name || "—"}</div>
                    </div>
                    <div>
                      <span className="text-slate-600">Kandidater</span>
                      <div className="font-semibold text-slate-900">{review[0]?.station_match_candidates?.length || 0}</div>
                    </div>
                    <div className="col-span-2">
                      <span className="text-slate-600">Grunn</span>
                      <div className="font-semibold text-slate-900">{review[0]?.confidenceReason}</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Example 3: No Safe Match */}
            {noSafe.length > 0 && (
              <div>
                <div className="text-sm font-semibold text-red-700 mb-2">
                  ✗ Unconfirmed Station (0.30 konfidens) — EKSKLUDERT fra ObservedMarketStatistics (standard)
                </div>
                <div className={`p-4 rounded border ${getConfidenceColor(noSafe[0]?.confidenceScore)}`}>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-slate-600">Pris</span>
                      <div className="font-semibold text-slate-900">{noSafe[0]?.priceNok} NOK/L</div>
                    </div>
                    <div>
                      <span className="text-slate-600">Lokasjon</span>
                      <div className="font-semibold text-slate-900">{noSafe[0]?.locationLabel}</div>
                    </div>
                    <div>
                      <span className="text-slate-600">Stasjon</span>
                      <div className="font-semibold text-slate-900">{noSafe[0]?.station_name || "—"}</div>
                    </div>
                    <div>
                      <span className="text-slate-600">GPS</span>
                      <div className="font-semibold text-slate-900">
                        {noSafe[0]?.gps_latitude ? `${noSafe[0]?.gps_latitude.toFixed(4)}, ${noSafe[0]?.gps_longitude.toFixed(4)}` : "—"}
                      </div>
                    </div>
                    <div className="col-span-2">
                      <span className="text-slate-600">Grunn</span>
                      <div className="font-semibold text-slate-900">{noSafe[0]?.confidenceReason}</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Component Usage Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Component Usage & Filtration Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="text-left p-2 font-semibold">Component</th>
                      <th className="text-left p-2 font-semibold">Source Filter</th>
                      <th className="text-left p-2 font-semibold">User Reported</th>
                      <th className="text-left p-2 font-semibold">Policy Applied</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    <tr>
                      <td className="p-2 font-mono text-xs">LiveMarketStats</td>
                      <td className="p-2">sourceName === "GooglePlaces"</td>
                      <td className="p-2"><Badge variant="destructive">Excluded</Badge></td>
                      <td className="p-2 text-slate-600">N/A</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-mono text-xs">ObservedMarketStats</td>
                      <td className="p-2">priceType === "user_reported"</td>
                      <td className="p-2"><Badge className="bg-green-600">Included</Badge></td>
                      <td className="p-2 text-slate-600">✓ matched + review (no_safe excluded)</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-mono text-xs">UserReportedScanOps</td>
                      <td className="p-2">priceType === "user_reported"</td>
                      <td className="p-2"><Badge className="bg-blue-600">All Categories</Badge></td>
                      <td className="p-2 text-slate-600">✓ Grouped by match_status</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}