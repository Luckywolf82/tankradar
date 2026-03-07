import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Zap, CheckCircle2, AlertCircle } from "lucide-react";

export default function SeedTrondheimStations() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleSeed = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await base44.functions.invoke('seedTrondheimStations');
      setResult(response.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Zap size={24} className="text-amber-600" />
          <h1 className="text-3xl font-bold text-slate-900">Seed Trondheim Stations</h1>
        </div>
        <p className="text-slate-600">Importer kjent liste av bensinstasjoner i Trondheim til Station-tabellen</p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Informasjon</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="font-semibold text-blue-900 mb-1">Hva gjøres:</p>
            <ul className="text-blue-900 space-y-1 list-disc list-inside">
              <li>Importer 34 kjente Trondheim-stasjoner som verified base</li>
              <li>Sjekker for eksisterende stasjoner innen 150m før opprettelse</li>
              <li>Markerer med sourceName="seed_trondheim"</li>
              <li>Ingen sletting, kun insert eller skip</li>
            </ul>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-2">
            <AlertTriangle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-900">Admin-operasjon</p>
              <p className="text-amber-800 text-xs">Denne operasjonen endrer databasen direkte. Kjør kun bevisst.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="mb-6">
        <Button
          onClick={handleSeed}
          disabled={loading}
          className="bg-amber-600 hover:bg-amber-700 w-full"
        >
          {loading ? "Importerer..." : "Start Seed Import"}
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
        <Card className="mb-6 border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-green-900">
              <CheckCircle2 size={18} />
              Seed Import Fullført
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-3 rounded border border-green-200">
                <div className="text-2xl font-bold text-green-700">{result.seedListTotal}</div>
                <div className="text-xs text-slate-600">Stasjoner i seed-liste</div>
              </div>
              <div className="bg-white p-3 rounded border border-green-200">
                <div className="text-2xl font-bold text-blue-700">{result.inserted}</div>
                <div className="text-xs text-slate-600">Insertet</div>
              </div>
              <div className="bg-white p-3 rounded border border-orange-200">
                <div className="text-2xl font-bold text-orange-700">{result.skipped}</div>
                <div className="text-xs text-slate-600">Hoppet over (eksisterende)</div>
              </div>
              <div className="bg-white p-3 rounded border border-slate-200">
                <div className="text-2xl font-bold text-slate-700">{result.totalStationCountAfter}</div>
                <div className="text-xs text-slate-600">Total Station count</div>
              </div>
            </div>

            <div className="bg-white p-3 rounded border border-slate-200">
              <p className="text-sm font-semibold text-slate-900 mb-2">Sample av resultater:</p>
              <div className="space-y-1 text-xs text-slate-700">
                {result.sampleResults && result.sampleResults.map((r, i) => (
                  <div key={i} className="flex justify-between">
                    <span>{r.name}</span>
                    <span className={r.status === 'inserted' ? 'text-green-600' : 'text-orange-600'}>
                      {r.status}
                      {r.reason && ` (${r.reason})`}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-slate-100 p-3 rounded text-xs text-slate-700">
              <p className="font-semibold mb-1">Neste steg:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Test StationPicker på LogPrice-siden i Trondheim-området</li>
                <li>Bekreft at nye stasjoner er synlige i brukerens område</li>
                <li>Monitor LogPrice-innsendinger for å bekrefte dekning</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}