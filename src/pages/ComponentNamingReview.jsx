import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, AlertCircle } from "lucide-react";

export default function ComponentNamingReview() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Component Naming & Semantics Review</h1>
          <p className="text-slate-600">Vurdering av komponentnavn for semantisk presisjon</p>
        </div>

        {/* Current State */}
        <Card>
          <CardHeader>
            <CardTitle>1. LiveMarketStats — Navn vs. realitet</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            
            <Alert className="bg-blue-50 border-blue-200">
              <Info className="h-4 w-4" />
              <AlertDescription className="ml-2">
                <strong>Navn:</strong> "LiveMarketStats"<br/>
                <strong>Faktisk innhold:</strong> GooglePlaces priser kun
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <div>
                <div className="font-semibold text-slate-900 mb-2">Nåværende implementasjon:</div>
                <div className="bg-slate-50 p-3 rounded border border-slate-200 text-sm font-mono">
                  <div className="text-slate-600">Filter:</div>
                  <div className="text-slate-800 ml-2">sourceName === "GooglePlaces"</div>
                </div>
              </div>

              <div>
                <div className="font-semibold text-slate-900 mb-2">Data som vises:</div>
                <ul className="space-y-1 text-sm text-slate-700 list-disc list-inside">
                  <li>Station-level priser fra GooglePlaces API</li>
                  <li>Plausibilitetssjekkede priser</li>
                  <li>Statistikk basert på delings- og matching-data</li>
                </ul>
              </div>

              <div>
                <div className="font-semibold text-slate-900 mb-2">Data som IKKE vises:</div>
                <ul className="space-y-1 text-sm text-slate-700 list-disc list-inside">
                  <li>User_reported priser (utelatt helt)</li>
                  <li>Nasjonale gjennomsnitt</li>
                  <li>Historiske SSB-data</li>
                </ul>
              </div>
            </div>

            <Alert className="bg-amber-50 border-amber-200">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="ml-2 text-amber-800">
                <strong>Vurdering:</strong> Navnet "LiveMarketStats" er <strong>teknisk unøyaktig</strong>. 
                Det er mer presist et "GooglePlaces-basert stasjonspris-dashboard" eller "Verified Station Prices".
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* Analysis */}
        <Card>
          <CardHeader>
            <CardTitle>2. Semantisk analyse</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            
            <div className="space-y-3">
              <div className="p-4 bg-slate-50 rounded border border-slate-200">
                <div className="font-semibold text-slate-900 mb-2">Problem med "LiveMarketStats":</div>
                <ul className="space-y-2 text-sm text-slate-700">
                  <li>✗ <strong>"Live"</strong> antyder real-time synkronisering fra flere kilder</li>
                  <li>✗ <strong>"Market"</strong> antyder nasjonalt eller regionalt marked, ikke enkle stasjoner</li>
                  <li>✗ <strong>"Stats"</strong> antyder aggregert statistikk, ikke enkeltpriser</li>
                  <li>✓ Komponenten viser faktisk: verifiserte, nåværende priser fra GooglePlaces</li>
                </ul>
              </div>

              <div className="p-4 bg-green-50 rounded border border-green-200">
                <div className="font-semibold text-green-900 mb-2">Mer nøyaktige alternativ-navn:</div>
                <table className="w-full text-sm">
                  <thead className="bg-green-100">
                    <tr>
                      <th className="text-left p-2">Alternativ navn</th>
                      <th className="text-left p-2">Presisjon</th>
                      <th className="text-left p-2">Fordeler</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-green-200">
                    <tr>
                      <td className="p-2 font-mono">VerifiedStationPrices</td>
                      <td className="p-2 text-green-700">Høy</td>
                      <td className="p-2 text-xs">Klart at det er verifisert, stasjon-spesifikt</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-mono">GooglePlacesPrices</td>
                      <td className="p-2 text-green-700">Svært høy</td>
                      <td className="p-2 text-xs">Eksplisitt kildeidentifikasjon</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-mono">StationLevelStats</td>
                      <td className="p-2 text-yellow-700">Moderat</td>
                      <td className="p-2 text-xs">Tydeliggjør granularitet, men mindre kildespesifikt</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-mono">LiveStationPrices</td>
                      <td className="p-2 text-green-700">Høy</td>
                      <td className="p-2 text-xs">Bevarer "Live", men tydeliggjør at det er stasjoner</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recommendation */}
        <Card>
          <CardHeader>
            <CardTitle>3. Anbefaling</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            
            <div className="space-y-3 text-sm text-slate-700">
              <div className="p-3 bg-blue-50 rounded border border-blue-200">
                <div className="font-semibold text-blue-900 mb-1">Nå (Ikke kritisk):</div>
                <div>La "LiveMarketStats" være som det er. Det fungerer, og bruker forstår konteksten.</div>
              </div>

              <div className="p-3 bg-yellow-50 rounded border border-yellow-200">
                <div className="font-semibold text-yellow-900 mb-1">Før fullstendig produksjon:</div>
                <div>Vurder omdøping til <code className="bg-yellow-100 px-2 py-1 rounded">VerifiedStationPrices</code> eller <code className="bg-yellow-100 px-2 py-1 rounded">GooglePlacesPrices</code></div>
              </div>

              <div className="p-3 bg-green-50 rounded border border-green-200">
                <div className="font-semibold text-green-900 mb-1">Hvis du beholder "LiveMarketStats":</div>
                <div>Dokumenter eksplisitt i komponenten at den filtrerer GooglePlaces kun. Legg til kommentar i toppen.</div>
              </div>
            </div>

            <div className="p-4 bg-slate-100 rounded border border-slate-300 font-mono text-xs">
              <div className="text-slate-700 mb-2">Eksempel dokumentasjon:</div>
              <div className="bg-white p-2 rounded text-slate-800">
{`/**
 * LiveMarketStats Component
 * 
 * Displays verified, current fuel prices from GooglePlaces API
 * filtered by fuel type and plausibility check.
 * 
 * DATA SOURCE: GooglePlaces only
 * GRANULARITY: Station-level
 * FREQUENCY: Near-realtime
 * 
 * Note: User_reported prices are NOT included in this component.
 * See ObservedMarketStatistics for crowdsourced data.
 */`}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Impact on Users */}
        <Card>
          <CardHeader>
            <CardTitle>4. Påvirkning på bruker-opplevelse</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-red-50 rounded border border-red-200">
                <div className="font-semibold text-red-900 mb-2">Risiko med nåværende navn:</div>
                <ul className="text-xs text-red-800 space-y-1 list-disc list-inside">
                  <li>Brukeren forventer "markedsdata"</li>
                  <li>Forventer data fra flere kilder</li>
                  <li>Kan være forvirring når no_safe-data ikke vises</li>
                </ul>
              </div>

              <div className="p-3 bg-green-50 rounded border border-green-200">
                <div className="font-semibold text-green-900 mb-2">Fordel med klarere navn:</div>
                <ul className="text-xs text-green-800 space-y-1 list-disc list-inside">
                  <li>Tydelig hva som vises</li>
                  <li>Forklarer hvorfor ingen user_reported</li>
                  <li>Setter forventninger korrekt</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Conclusion */}
        <Card>
          <CardHeader>
            <CardTitle>Konklusjon</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-700 space-y-3">
            <p>
              <strong>Navn-presisjon:</strong> "LiveMarketStats" er ikke feil, men heller generisk. 
              Det er en GooglPlaces-filtrert komponent som viser verifiserte stasjonspriser.
            </p>
            <p>
              <strong>Handlingspunkt:</strong> Lag tilleggsdokumentasjon for at komponenten bruker GooglePlaces kun, 
              og at user_reported data håndteres av ObservedMarketStatistics i stedet.
            </p>
            <p>
              <strong>Prioritet:</strong> Lav. Fungerer som det er, men burde være på backlog for semantisk oppklaring 
              når systemet nærmer seg fullstendig produksjon.
            </p>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}