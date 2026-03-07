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
      } else if (response.status === 403) {
        setError('Admin access required. Please contact an administrator.');
      } else if (response.status === 401) {
        setError('You must be logged in to perform this action.');
      } else {
        setError(response.data.error || 'Import failed');
      }
    } catch (err) {
      if (err.response?.status === 403) {
        setError('Admin access required. Please contact an administrator.');
      } else if (err.response?.status === 401) {
        setError('You must be logged in to perform this action.');
      } else {
        setError(err.message || 'Request failed. Check your connection.');
      }
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
            <div className="bg-amber-50 border-2 border-amber-300 rounded-lg p-4">
              <p className="text-sm font-semibold text-amber-900 mb-2">⚠️ FIXTURE_TEST_DATA — NOT PRODUCTION READY</p>
              <p className="text-sm text-amber-800">
                <strong>Current Status:</strong> Validates import pipeline only<br />
                <strong>Data Source:</strong> Hardcoded fixture (realistic coordinates, but not live OSM)<br />
                <strong>Coverage:</strong> Does NOT represent actual station dekning<br />
                <strong>Next Step:</strong> Live Overpass API or alternative import source needed for production
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
            <CardTitle className="text-sm">🔬 What This Validates</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-slate-700 space-y-3">
            <div>
              <p className="font-semibold text-slate-900">Import Pipeline (VALIDATED)</p>
              <ul className="list-disc ml-4 mt-1 space-y-0.5">
                <li>Deduplication logic (name + geographic distance)</li>
                <li>Station record creation in database</li>
                <li>Admin-only access control</li>
                <li>Error handling and logging</li>
              </ul>
            </div>
            <div>
              <p className="font-semibold text-slate-900">NOT Validated (Live Sources)</p>
              <ul className="list-disc ml-4 mt-1 space-y-0.5">
                <li>Actual Overpass API connectivity</li>
                <li>Real OSM station coverage</li>
                <li>Live deduplication against production data</li>
                <li>Regional dekning completeness</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-red-50 border-red-200">
          <CardHeader>
            <CardTitle className="text-sm text-red-900">⚙️ Roadmap: Fixture → Production</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-slate-700 space-y-3">
            <div>
              <p className="font-semibold text-slate-900 mb-1">Current Blocker: Live Overpass API</p>
              <p className="text-slate-600 mb-2">
                Overpass API returns XML by default. Base44 Deno runtime may have restrictions on:
              </p>
              <ul className="list-disc ml-4 space-y-0.5 text-slate-600">
                <li>Long-running external HTTP requests (timeouts)</li>
                <li>Rate limiting or IP blocking from Overpass</li>
                <li>TLS/SSL certificate validation</li>
              </ul>
            </div>
            <div className="border-t border-red-200 pt-3 mt-3">
              <p className="font-semibold text-slate-900 mb-1">Recommended Production Path</p>
              <ol className="list-decimal ml-4 space-y-1 text-slate-600">
                <li><strong>Option A (Preferred):</strong> Use pre-cached OSM data dump (weekly refresh via scheduled task)</li>
                <li><strong>Option B:</strong> Third-party OSM geocoding service (e.g., Nominatim) with better uptime SLA</li>
                <li><strong>Option C:</strong> Manual OSM bulk import + scheduled automation (separate from live price fetching)</li>
              </ol>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}