import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";

export default function ValidateStationData() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleValidate = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await base44.functions.invoke('validateStationData');
      setResult(response.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleValidate();
  }, []);

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <CheckCircle2 size={24} className="text-blue-600" />
          <h1 className="text-3xl font-bold text-slate-900">Valider Station Data</h1>
        </div>
        <p className="text-slate-600">Sjekk for dubletter, overlappinger og datakvalitet etter seed-import</p>
      </div>

      <div className="mb-6 flex gap-3">
        <Button
          onClick={handleValidate}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {loading ? (
            <>
              <RefreshCw size={16} className="mr-2 animate-spin" />
              Validerer...
            </>
          ) : (
            "Kjør Validering"
          )}
        </Button>
        <Button
          onClick={async () => {
            try {
              const response = await base44.functions.invoke('exportStationDataCsv');
              const blob = new Blob([response.data], { type: 'text/csv; charset=utf-8' });
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `Station_Data_${new Date().toISOString().split('T')[0]}.csv`;
              document.body.appendChild(a);
              a.click();
              window.URL.revokeObjectURL(url);
              a.remove();
            } catch (err) {
              alert('Feil ved eksport: ' + err.message);
            }
          }}
          className="bg-green-600 hover:bg-green-700"
        >
          Eksporter CSV
        </Button>
      </div>

      {error && (
        <Card className="mb-6 border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-red-900">
              <AlertCircle size={18} />
              Feil
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-red-800">{error}</p>
          </CardContent>
        </Card>
      )}

      {result && (
        <div className="space-y-6">
          {/* Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Oversikt</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-50 p-3 rounded border border-slate-200">
                  <div className="text-2xl font-bold text-slate-900">{result.totalStations}</div>
                  <div className="text-xs text-slate-600">Totalt stasjoner</div>
                </div>
                <div className="bg-green-50 p-3 rounded border border-green-200">
                  <div className="text-2xl font-bold text-green-700">{result.seedStations}</div>
                  <div className="text-xs text-slate-600">Seed-importert</div>
                </div>
                <div className="bg-amber-50 p-3 rounded border border-amber-200">
                  <div className="text-2xl font-bold text-amber-700">{result.otherStations}</div>
                  <div className="text-xs text-slate-600">Andre kilder</div>
                </div>
                <div className="bg-blue-50 p-3 rounded border border-blue-200">
                  <div className="text-2xl font-bold text-blue-700">{result.trondheimCoverage.seedStationsInArea}</div>
                  <div className="text-xs text-slate-600">Seed i Trondheim-område</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Issues Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Datakvalitetsproblemer</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-red-50 p-4 rounded border border-red-200">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle size={16} className="text-red-600" />
                    <span className="font-semibold text-red-900">Manglende felt</span>
                  </div>
                  <div className="text-3xl font-bold text-red-700 mb-1">{result.stats.stationsWithMissingFields}</div>
                  <p className="text-xs text-red-700">stasjoner med ufullstendige data</p>
                </div>

                <div className="bg-red-50 p-4 rounded border border-red-200">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle size={16} className="text-red-600" />
                    <span className="font-semibold text-red-900">Eksakte dubletter</span>
                  </div>
                  <div className="text-3xl font-bold text-red-700 mb-1">{result.stats.possibleExactDuplicates}</div>
                  <p className="text-xs text-red-700">identiske navn + lokasjon</p>
                </div>

                <div className="bg-orange-50 p-4 rounded border border-orange-200">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle size={16} className="text-orange-600" />
                    <span className="font-semibold text-orange-900">Lignende navn</span>
                  </div>
                  <div className="text-3xl font-bold text-orange-700 mb-1">{result.stats.almostLikeStations}</div>
                  <p className="text-xs text-orange-700">>85% likhets samme kjede + nær</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Missing Fields Detail */}
          {result.missingFields.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Stasjoner med manglende felt (topp 20)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {result.missingFields.map((item, idx) => (
                    <div key={idx} className="bg-red-50 p-2 rounded border border-red-200 text-xs">
                      <div className="font-semibold text-red-900">{item.name}</div>
                      <div className="text-red-700">ID: {item.id}</div>
                      <div className="text-red-600 mt-1">Manglende: {item.missing.join(', ')}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Exact Duplicates */}
          {result.possibleDuplicates.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Eksakte dubletter (topp 10)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {result.possibleDuplicates.map((item, idx) => (
                    <div key={idx} className="bg-red-50 p-3 rounded border border-red-200 text-xs">
                      <div className="font-semibold text-red-900 mb-1">Kandidat #{idx + 1}</div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-white p-2 rounded">
                          <div className="font-medium text-slate-900">{item.station1.name}</div>
                          <div className="text-slate-600">{item.station1.chain}</div>
                          <div className="text-xs text-slate-500 mt-1">ID: {item.station1.id}</div>
                        </div>
                        <div className="bg-white p-2 rounded">
                          <div className="font-medium text-slate-900">{item.station2.name}</div>
                          <div className="text-slate-600">{item.station2.chain}</div>
                          <div className="text-xs text-slate-500 mt-1">ID: {item.station2.id}</div>
                        </div>
                      </div>
                      <div className="text-red-700 mt-2">Avstand: {item.distanceM}m</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Almost Like */}
          {result.almostLike.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Lignende navn samme kjede (topp 10)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {result.almostLike.map((item, idx) => (
                    <div key={idx} className="bg-orange-50 p-3 rounded border border-orange-200 text-xs">
                      <div className="font-semibold text-orange-900 mb-1">Kandidat #{idx + 1} ({item.nameSimilarity}% lik)</div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-white p-2 rounded">
                          <div className="font-medium text-slate-900">{item.station1.name}</div>
                          <div className="text-slate-600">{item.station1.chain}</div>
                          <div className="text-xs text-slate-500 mt-1">ID: {item.station1.id}</div>
                        </div>
                        <div className="bg-white p-2 rounded">
                          <div className="font-medium text-slate-900">{item.station2.name}</div>
                          <div className="text-slate-600">{item.station2.chain}</div>
                          <div className="text-xs text-slate-500 mt-1">ID: {item.station2.id}</div>
                        </div>
                      </div>
                      <div className="text-orange-700 mt-2">Avstand: {item.distanceM}m</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Trondheim Coverage */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Trondheim-område dekning</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-green-50 p-4 rounded border border-green-200">
                  <div className="text-2xl font-bold text-green-700">{result.trondheimCoverage.seedStationsInArea}</div>
                  <div className="text-sm text-slate-600">Seed-importerte stasjoner i området</div>
                </div>
                <div className="bg-blue-50 p-4 rounded border border-blue-200">
                  <div className="text-2xl font-bold text-blue-700">{result.trondheimCoverage.otherStationsInArea}</div>
                  <div className="text-sm text-slate-600">Andre kilder i området</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Summary */}
          <Card className="bg-blue-50 border-blue-200">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2 text-blue-900">
                <CheckCircle2 size={18} />
                Rapport
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-blue-900 space-y-2">
              <p>✓ Station-tabellen har {result.totalStations} stasjoner totalt</p>
              <p>✓ {result.seedStations} stasjon(er) fra seed-import (Trondheim-listen)</p>
              <p>✓ {result.trondheimCoverage.seedStationsInArea} seed-stasjon(er) aktiv i Trondheim-området</p>
              {result.stats.stationsWithMissingFields === 0 ? (
                <p className="text-green-700 font-semibold">✓ Alle stasjoner har fullstendige data</p>
              ) : (
                <p className="text-red-700 font-semibold">⚠ {result.stats.stationsWithMissingFields} stasjon(er) mangler felt</p>
              )}
              {result.stats.possibleExactDuplicates === 0 ? (
                <p className="text-green-700 font-semibold">✓ Ingen eksakte dubletter funnet</p>
              ) : (
                <p className="text-red-700 font-semibold">⚠ {result.stats.possibleExactDuplicates} eksakt duplett(er) funnet</p>
              )}
              {result.stats.almostLikeStations === 0 ? (
                <p className="text-green-700 font-semibold">✓ Ingen lignende navn på samme kjede + nær</p>
              ) : (
                <p className="text-orange-700 font-semibold">⚠ {result.stats.almostLikeStations} lignende kombinasjon(er) funnet</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}