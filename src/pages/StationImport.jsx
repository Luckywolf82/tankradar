import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';

export default function StationImport() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleImport = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await base44.functions.invoke('importOSMStations', {});
      if (response.data.success) {
        setResult(response.data);
      } else {
        setError(response.data.error || 'Import failed');
      }
    } catch (err) {
      setError(err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Station Import (Admin)</h1>
          <p className="text-slate-600 mt-2">Import fuel stations from OpenStreetMap to expand the Station database.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Import Stations from OpenStreetMap</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>Current:</strong> Fixture data for Trondheim area (5 stations)<br />
                <strong>Note:</strong> This uses realistic OSM data. Live Overpass API integration will be added after validation.
              </p>
            </div>

            <Button
              onClick={handleImport}
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 text-white h-10"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 animate-spin" size={18} />
                  Importing...
                </>
              ) : (
                'Start Import'
              )}
            </Button>
          </CardContent>
        </Card>

        {result && (
          <Card className="border-green-200 bg-green-50">
            <CardHeader className="border-b border-green-200">
              <div className="flex items-center gap-2">
                <CheckCircle className="text-green-600" size={24} />
                <CardTitle className="text-green-800">Import Successful</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 pt-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-600">OSM Stations Found</p>
                  <p className="text-2xl font-bold text-slate-900">{result.osmStationsFound}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-600">New Stations Imported</p>
                  <p className="text-2xl font-bold text-green-600">{result.newStationsImported}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-600">Duplicates Skipped</p>
                  <p className="text-2xl font-bold text-slate-900">{result.duplicatesSkipped}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-600">Total in Database</p>
                  <p className="text-2xl font-bold text-slate-900">{result.totalStationsAfterImport}</p>
                </div>
              </div>

              <div className="bg-white rounded-lg p-3 border border-green-200">
                <p className="text-xs font-semibold text-slate-700 mb-2">Coverage</p>
                <p className="text-sm text-slate-700">
                  <strong>Trondheim/Trøndelag:</strong> {result.trondheimTradelagCount} stations
                </p>
              </div>

              {result.duplicates.length > 0 && (
                <div className="bg-white rounded-lg p-3 border border-amber-200">
                  <p className="text-xs font-semibold text-slate-700 mb-2">Sample Duplicates Skipped</p>
                  <div className="space-y-1 text-xs text-slate-600">
                    {result.duplicates.map((dup, i) => (
                      <p key={i}>
                        "{dup.osmName}" matched "{dup.existingName}" ({dup.distance}km)
                      </p>
                    ))}
                  </div>
                </div>
              )}

              <p className="text-sm text-green-700 italic">{result.message}</p>
            </CardContent>
          </Card>
        )}

        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardHeader className="border-b border-red-200">
              <div className="flex items-center gap-2">
                <AlertCircle className="text-red-600" size={24} />
                <CardTitle className="text-red-800">Import Error</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <p className="text-sm text-red-700">{error}</p>
            </CardContent>
          </Card>
        )}

        <Card className="bg-slate-100 border-slate-200">
          <CardHeader>
            <CardTitle className="text-sm">About This Import</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-slate-700 space-y-2">
            <p>
              <strong>Data Source:</strong> fixture_test_data based on realistic OpenStreetMap coordinates
            </p>
            <p>
              <strong>Current Scope:</strong> Trondheim / Trøndelag region
            </p>
            <p>
              <strong>Deduplication:</strong> Uses normalized station name + geographic distance (200m threshold)
            </p>
            <p>
              <strong>Next Steps:</strong> Live Overpass API integration after validation
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}