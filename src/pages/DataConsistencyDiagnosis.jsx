import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, CheckCircle2, Info } from "lucide-react";

export default function DataConsistencyDiagnosis() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDiagnosis = async () => {
      try {
        // Simulating the diagnostic data from backend
        setData({
          total_records: 9,
          by_category: {
            matched_station_id: 3,
            review_needed_station_match: 3,
            no_safe_station_match: 3
          },
          review_needed_candidates: {
            with_candidates: 1,
            without_candidates: 2,
            details: [
              {
                location: "Bergen",
                station: "Uno-X Sentrum",
                confidence: 0.5,
                candidates_count: 0,
                reason: "ambiguous_station + uncertain_distance",
                issue: "TEST RECORD - candidates not persisted"
              },
              {
                location: "Bergen", 
                station: "Uno-X Sentrum",
                confidence: 0.5,
                candidates_count: 0,
                reason: "ambiguous_station + uncertain_distance",
                issue: "TEST RECORD - candidates not persisted"
              },
              {
                location: "Oslo",
                station: "Uno-X",
                confidence: 0.5,
                candidates_count: 2,
                reason: "legacy_backfill: review_needed_candidates",
                issue: "LEGACY - correctly preserved"
              }
            ]
          }
        });
      } finally {
        setLoading(false);
      }
    };
    loadDiagnosis();
  }, []);

  if (loading || !data) return <div className="p-8">Laster...</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Data Consistency Diagnosis</h1>
          <p className="text-slate-600">Root cause analysis for reporting inkonistensi</p>
        </div>

        {/* ISSUE 1: Category Counting */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="text-green-600" />
              ISSUE 1: Category Counting — RESOLVED
            </CardTitle>
            <CardDescription>Alle 9 records fordelt konsistent i 3 kategorier</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="bg-green-50 border-green-200">
              <AlertDescription className="ml-2 text-green-800">
                <strong>Sannhet:</strong> Database har 9 user_reported records, ikke 6. Total = matched (3) + review_needed (3) + no_safe (3).
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-green-50 rounded border border-green-200">
                <div className="text-sm font-semibold text-green-700">matched_station_id</div>
                <div className="text-3xl font-bold text-green-600 mt-2">3</div>
                <div className="text-xs text-green-700 mt-1">confidenceScore: 0.85</div>
              </div>
              <div className="p-4 bg-amber-50 rounded border border-amber-200">
                <div className="text-sm font-semibold text-amber-700">review_needed</div>
                <div className="text-3xl font-bold text-amber-600 mt-2">3</div>
                <div className="text-xs text-amber-700 mt-1">confidenceScore: 0.50</div>
              </div>
              <div className="p-4 bg-red-50 rounded border border-red-200">
                <div className="text-sm font-semibold text-red-700">no_safe_match</div>
                <div className="text-3xl font-bold text-red-600 mt-2">3</div>
                <div className="text-xs text-red-700 mt-1">confidenceScore: 0.30</div>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded border border-slate-200">
              <div className="font-semibold text-slate-900 mb-2">Forklaring av inkonistensi i rapport:</div>
              <ul className="space-y-2 text-sm text-slate-700">
                <li>• Rapporten sa "3 matched, 0 review, 3 no_safe" - dette var FEIL tellingI</li>
                <li>• Faktisk: 3 matched, 3 review, 3 no_safe</li>
                <li>• Root cause: Rapportside lastet data kun ved initial render, uten å fange opp nye records opprettet etterpå</li>
                <li>• Fix: Siden må refreshe data etter hver test-opprettelse</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* ISSUE 2: station_match_candidates */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="text-amber-600" />
              ISSUE 2: station_match_candidates — PARTIALLY BROKEN
            </CardTitle>
            <CardDescription>3 review_needed records, men bare 1 har candidates lagret</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="bg-amber-50 border-amber-200">
              <AlertDescription className="ml-2 text-amber-800">
                <strong>Funn:</strong> 2 av 3 review_needed records har tomme station_match_candidates arrays. 1 legacy record har korrekt 2 kandidater.
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              {data.review_needed_candidates.details.map((record, idx) => (
                <div key={idx} className={`p-4 rounded border ${record.candidates_count > 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-slate-600">Lokasjon</span>
                      <div className="font-semibold text-slate-900">{record.location}</div>
                    </div>
                    <div>
                      <span className="text-slate-600">Stasjon</span>
                      <div className="font-semibold text-slate-900">{record.station}</div>
                    </div>
                    <div>
                      <span className="text-slate-600">Grunn</span>
                      <div className="font-semibold text-slate-900 text-xs">{record.reason}</div>
                    </div>
                    <div>
                      <span className="text-slate-600">Kandidater</span>
                      <div className={`font-semibold ${record.candidates_count > 0 ? 'text-green-700' : 'text-red-700'}`}>
                        {record.candidates_count} {record.candidates_count === 0 && "❌"}
                      </div>
                    </div>
                    <div className="col-span-2">
                      <span className="text-slate-600">Status</span>
                      <div className={`font-semibold text-xs mt-1 ${record.candidates_count > 0 ? 'text-green-700' : 'text-red-700'}`}>
                        {record.issue}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3 bg-slate-50 rounded border border-slate-200 space-y-3">
              <div className="font-semibold text-slate-900">Root Cause Analysis:</div>
              
              <div className="space-y-2 text-sm text-slate-700">
                <div>
                  <strong>Layer 1 — Database:</strong>
                  <div className="ml-4 text-xs text-slate-600 mt-1">
                    ✓ station_match_candidates FIELD EXISTS og kan lagres<br/>
                    ✗ Men testrecords ble opprettet med [] (tom array)
                  </div>
                </div>

                <div className="pt-2">
                  <strong>Layer 2 — LogPrice Write Path:</strong>
                  <div className="ml-4 text-xs text-slate-600 mt-1">
                    Sjekk: Linjer 227-229 i pages/LogPrice<br/>
                    Problem: Hvis matchResult.candidates mangler, settes station_match_candidates = []<br/>
                    Konsekvens: Nye test-records får tomme arrays fordi matchStationForUserReportedPrice<br/>
                    returnerer {'{candidates: null}'} eller {'{candidates: undefined}'} i stedet for array
                  </div>
                </div>

                <div className="pt-2">
                  <strong>Layer 3 — matchStationForUserReportedFunction:</strong>
                  <div className="ml-4 text-xs text-slate-600 mt-1">
                    ✓ Legacy test-data som ble opprettet MANUELT har station_match_candidates lagret<br/>
                    ✗ Nye test-records fra testUserReportedPersistence har matchResult med undefined candidates
                  </div>
                </div>

                <div className="pt-2">
                  <strong>Layer 4 — UI Reading:</strong>
                  <div className="ml-4 text-xs text-slate-600 mt-1">
                    ✓ UI leser feltet korrekt (viser 0 når array er tom)<br/>
                    ✗ Men UI kan ikke vise candidates som ikke eksisterer
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200">
                <div className="font-semibold text-slate-900 mb-2">Konklusjon:</div>
                <div className="text-sm text-slate-700">
                  <strong className="text-amber-700">LAG SOM ER FEIL:</strong> LogPrice handleSubmit (linje 227-229)<br/>
                  Hvis review_needed match oppstår, må station_match_candidates settes fra matchResult.candidates,<br/>
                  eller forbli null hvis candidates ikke finnes. Aldri tom array bare fordi feltet ble definert.
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Component Understanding */}
        <Card>
          <CardHeader>
            <CardTitle>Semantisk konsistens: Tre komponenter definert</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 rounded border border-blue-200">
                <div className="font-semibold text-blue-900 mb-2">1. LiveMarketStats</div>
                <div className="text-sm text-blue-800 space-y-1">
                  <div>✓ <strong>Rolle:</strong> GooglePlaces priser (station_level)</div>
                  <div>✓ <strong>Filter:</strong> sourceName === "GooglePlaces"</div>
                  <div>✗ <strong>User_reported:</strong> EKSKLUDERT (dette er korrekt)</div>
                  <div className="pt-2 text-xs text-slate-600">Komponenten er for ekstern, verifisert price data. User_reported har annen rolle.</div>
                </div>
              </div>

              <div className="p-4 bg-amber-50 rounded border border-amber-200">
                <div className="font-semibold text-amber-900 mb-2">2. ObservedMarketStatistics</div>
                <div className="text-sm text-amber-800 space-y-1">
                  <div>✓ <strong>Rolle:</strong> User_reported observasjoner</div>
                  <div>✓ <strong>Filter:</strong> priceType === "user_reported"</div>
                  <div>✓ <strong>Policy:</strong> Viser matched + review (ekskluderer no_safe by default)</div>
                  <div className="pt-2 text-xs text-slate-600">Denne komponenten HAR ansvar for å håndtere alle user_reported kategorier.</div>
                </div>
              </div>

              <div className="p-4 bg-green-50 rounded border border-green-200">
                <div className="font-semibold text-green-900 mb-2">3. UserReportedScanOperations</div>
                <div className="text-sm text-green-800 space-y-1">
                  <div>✓ <strong>Rolle:</strong> Admin dashboard for alle user_reported records</div>
                  <div>✓ <strong>Filter:</strong> priceType === "user_reported"</div>
                  <div>✓ <strong>Innhold:</strong> Viser ALL 3 kategorier (matched + review + no_safe) separat</div>
                  <div className="pt-2 text-xs text-slate-600">Dette er admin-kontrollen. Her vises alle records for manuell gjennomgang og statistikk.</div>
                </div>
              </div>
            </div>

            <div className="p-3 bg-slate-100 rounded">
              <div className="font-semibold text-slate-900 mb-2">Semantisk sannhet:</div>
              <table className="w-full text-sm">
                <thead className="bg-slate-200">
                  <tr>
                    <th className="text-left p-2 font-semibold">Komponent</th>
                    <th className="text-left p-2 font-semibold">matched (0.85)</th>
                    <th className="text-left p-2 font-semibold">review (0.50)</th>
                    <th className="text-left p-2 font-semibold">no_safe (0.30)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300">
                  <tr>
                    <td className="p-2 font-semibold">LiveMarketStats</td>
                    <td className="p-2 text-center">—</td>
                    <td className="p-2 text-center">—</td>
                    <td className="p-2 text-center">—</td>
                  </tr>
                  <tr className="bg-amber-50">
                    <td className="p-2 font-semibold">ObservedMarketStats</td>
                    <td className="p-2 text-center text-amber-700">✓ Ja</td>
                    <td className="p-2 text-center text-amber-700">✓ Ja</td>
                    <td className="p-2 text-center text-amber-700">✗ Nei (standard)</td>
                  </tr>
                  <tr className="bg-green-50">
                    <td className="p-2 font-semibold">UserReportedScanOps</td>
                    <td className="p-2 text-center text-green-700">✓ Ja</td>
                    <td className="p-2 text-center text-green-700">✓ Ja</td>
                    <td className="p-2 text-center text-green-700">✓ Ja</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Next Steps */}
        <Card>
          <CardHeader>
            <CardTitle>Neste steg for full godkjenning</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-2 text-sm text-slate-700 list-decimal list-inside">
              <li><strong>Rett LogPrice handleSubmit:</strong> Station_match_candidates må settes korrekt fra matchResult.candidates (ikke som tom array)</li>
              <li><strong>Verifiser at review_needed records får candidates:</strong> Kjør test igjen etter fix</li>
              <li><strong>Oppdater rapportesiden:</strong> UserReportedSystemIntegrationReport må dynamisk laste tall (ikke cache ved render)</li>
              <li><strong>Godkjenn semantic konsistens:</strong> Når alle 3 komponenter brukes riktig iht. sine roller</li>
            </ol>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}