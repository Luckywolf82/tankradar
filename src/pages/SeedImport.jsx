import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Upload, Play, AlertCircle, CheckCircle } from 'lucide-react';

export default function SeedImport() {
  const [file, setFile] = useState(null);
  const [fileContent, setFileContent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [dryRun, setDryRun] = useState(true);

  const handleFileUpload = (e) => {
    const uploaded = e.target.files[0];
    if (!uploaded) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target.result;
        const lines = text.trim().split('\n');
        const headers = lines[0].split(',').map(h => h.trim());
        
        const rows = lines.slice(1).map(line => {
          const values = line.split(',').map(v => v.trim().replace(/^"(.*)"$/, '$1'));
          const obj = {};
          headers.forEach((h, i) => {
            obj[h] = values[i];
          });
          return obj;
        });

        setFile(uploaded.name);
        setFileContent(rows);
        setError(null);
      } catch (err) {
        setError(`Error parsing CSV: ${err.message}`);
      }
    };
    reader.readAsText(uploaded);
  };

  const runImport = async (testMode = true) => {
    if (!fileContent) {
      setError('No file loaded');
      return;
    }

    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const records = fileContent.map(row => ({
        name: row.name,
        address: row.address || null,
        city: row.city,
        latitude: parseFloat(row.latitude),
        longitude: parseFloat(row.longitude),
        sourceName: row.sourceName,
        sourceStationId: row.sourceStationId,
        seedBatch: row.seedBatch,
      }));

      const response = await base44.functions.invoke('seedStationsFromList', {
        sourceList: records,
        dedupRadius: 150,
        chainNormalization: true,
        dryRun: testMode,
      });

      setResult(response.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Seed Import</h1>
        <p className="text-slate-600">Import fuel stations from CSV</p>
      </div>

      {/* File Upload */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload size={20} />
            Step 1: Upload CSV
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <input
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-green-600 file:text-white hover:file:bg-green-700"
          />
          {file && (
            <div className="p-3 bg-green-50 border border-green-200 rounded">
              <p className="text-sm">✓ Loaded: <strong>{file}</strong> ({fileContent?.length} rows)</p>
            </div>
          )}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded flex gap-2">
              <AlertCircle size={16} className="text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Test Run */}
      {fileContent && !result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Play size={20} />
              Step 2: Test Import
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-slate-600">
              Run a dry-run on the first batch to validate deduplication and conflicts before full import.
            </p>
            <Button
              onClick={() => runImport(true)}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {loading ? 'Testing...' : '▶ Run Dry-Run Test (First 100)'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle size={20} className="text-green-600" />
              Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Summary */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-slate-100 rounded">
                <p className="text-xs text-slate-600">Total Read</p>
                <p className="text-2xl font-bold">{result.totalRead}</p>
              </div>
              <div className="p-3 bg-green-100 rounded">
                <p className="text-xs text-slate-600">Inserted</p>
                <p className="text-2xl font-bold text-green-700">{result.inserted}</p>
              </div>
              <div className="p-3 bg-yellow-100 rounded">
                <p className="text-xs text-slate-600">Skipped</p>
                <p className="text-2xl font-bold text-yellow-700">{result.skipped.length}</p>
              </div>
              <div className="p-3 bg-orange-100 rounded">
                <p className="text-xs text-slate-600">Conflicts (Review)</p>
                <p className="text-2xl font-bold text-orange-700">{result.conflicts.length}</p>
              </div>
            </div>

            {/* Dry Run Notice */}
            {result.dryRun && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded">
                <p className="text-sm text-blue-800">
                  <strong>DRY RUN MODE:</strong> No data was written. Review results and click "Full Import" to proceed.
                </p>
              </div>
            )}

            {/* Skipped Details */}
            {result.skipped.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">Skipped ({result.skipped.length})</h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {result.skipped.slice(0, 10).map((skip, i) => (
                    <div key={i} className="text-xs p-2 bg-yellow-50 border border-yellow-200 rounded">
                      <p className="font-mono text-yellow-900">{skip.source || 'Unknown'}</p>
                      <p className="text-yellow-700">{skip.reason} {skip.distance ? `(${skip.distance}m)` : ''}</p>
                    </div>
                  ))}
                  {result.skipped.length > 10 && (
                    <p className="text-xs text-slate-500">... and {result.skipped.length - 10} more</p>
                  )}
                </div>
              </div>
            )}

            {/* Conflicts Details */}
            {result.conflicts.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">Conflicts ({result.conflicts.length})</h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {result.conflicts.slice(0, 5).map((conflict, i) => (
                    <div key={i} className="text-xs p-2 bg-orange-50 border border-orange-200 rounded">
                      <p className="font-mono text-orange-900">{conflict.sourceRecord.name}</p>
                      <p className="text-orange-700">
                        May duplicate: {conflict.existingRecord.name} → {conflict.suggestedAction}
                      </p>
                    </div>
                  ))}
                  {result.conflicts.length > 5 && (
                    <p className="text-xs text-slate-500">... and {result.conflicts.length - 5} more</p>
                  )}
                </div>
              </div>
            )}

            {/* Actions */}
            {result.dryRun && (
              <div className="flex gap-3">
                <Button
                  onClick={() => runImport(false)}
                  disabled={loading}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {loading ? 'Importing...' : '✓ Full Import'}
                </Button>
                <Button
                  onClick={() => setResult(null)}
                  variant="outline"
                >
                  Modify & Re-test
                </Button>
              </div>
            )}

            {!result.dryRun && (
              <div className="p-4 bg-green-50 border border-green-200 rounded">
                <p className="text-sm text-green-800">
                  ✓ Import complete! {result.inserted} stations added to database.
                  {result.conflicts.length > 0 && (
                    <> {result.conflicts.length} conflicts awaiting review in StationCandidateReview.</>
                  )}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}