import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Upload, Play, AlertCircle, CheckCircle, Loader } from 'lucide-react';

export default function SeedImport() {
  const [file, setFile] = useState(null);
  const [fileContent, setFileContent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [batchSize, setBatchSize] = useState(50);
  const [currentBatch, setCurrentBatch] = useState(0);
  const [batchResults, setBatchResults] = useState([]);
  const [error, setError] = useState(null);
  const [dryRunMode, setDryRunMode] = useState(true);

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
        setCurrentBatch(0);
        setBatchResults([]);
        setError(null);
      } catch (err) {
        setError(`Error parsing CSV: ${err.message}`);
      }
    };
    reader.readAsText(uploaded);
  };

  const processBatch = async (batchIndex) => {
    if (!fileContent) {
      setError('No file loaded');
      return;
    }

    const start = batchIndex * batchSize;
    const end = start + batchSize;
    const batchRows = fileContent.slice(start, end);

    if (batchRows.length === 0) {
      setError('No more rows to process');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const records = batchRows.map(row => ({
        name: row.name,
        address: row.address || null,
        city: row.city,
        latitude: parseFloat(row.latitude),
        longitude: parseFloat(row.longitude),
        sourceName: row.sourceName || 'seed_import',
        sourceStationId: row.sourceStationId,
      }));

      const response = await base44.functions.invoke('seedStationsBatchImport', {
        batchRows: records,
        batchIndex,
        dedupRadius: 150,
        chainNormalization: true,
        dryRun: dryRunMode,
      });

      setBatchResults(prev => [...prev, response.data]);
      setCurrentBatch(batchIndex + 1);
    } catch (err) {
      // Ignore 405 logging errors
      if (!err.message?.includes('405')) {
        setError(err.message);
      }
      setBatchResults(prev => [...prev, {
        batchIndex,
        batchRows: batchRows.length,
        inserted: 0,
        skipped: batchRows.length,
        conflicts: 0,
        dryRun: dryRunMode,
        error: err.message,
      }]);
      setCurrentBatch(batchIndex + 1);
    } finally {
      setLoading(false);
    }
  };

  const totalBatches = fileContent ? Math.ceil(fileContent.length / batchSize) : 0;
  const totals = {
    inserted: batchResults.reduce((sum, r) => sum + r.inserted, 0),
    skipped: batchResults.reduce((sum, r) => sum + r.skipped, 0),
    conflicts: batchResults.reduce((sum, r) => sum + r.conflicts, 0),
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Seed Import (Batch-Based)</h1>
        <p className="text-slate-600">Import fuel stations in controlled batches to avoid timeouts</p>
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
            disabled={loading}
            className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-green-600 file:text-white hover:file:bg-green-700"
          />
          {file && (
            <div className="p-3 bg-green-50 border border-green-200 rounded">
              <p className="text-sm">✓ Loaded: <strong>{file}</strong> ({fileContent?.length} rows total)</p>
              <p className="text-xs text-slate-600 mt-1">Will process in batches of <strong>{batchSize}</strong> rows ({totalBatches} batches)</p>
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

      {/* Batch Configuration */}
      {fileContent && !batchResults.length && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Play size={20} />
              Step 2: Configure & Start
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Batch Size (rows per request)</label>
              <input
                type="number"
                min="10"
                max="500"
                value={batchSize}
                onChange={(e) => setBatchSize(parseInt(e.target.value) || 50)}
                disabled={loading}
                className="w-full px-3 py-2 border border-slate-300 rounded text-sm"
              />
              <p className="text-xs text-slate-600 mt-1">Recommended: 50-100 rows. Larger = faster but higher timeout risk.</p>
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={dryRunMode}
                  onChange={(e) => setDryRunMode(e.target.checked)}
                  disabled={loading}
                />
                Dry-Run Mode (validate dedup without writing)
              </label>
              <p className="text-xs text-slate-600 mt-1">✓ Shows inserted/skipped/conflicts for each batch before committing</p>
            </div>

            <Button
              onClick={() => processBatch(0)}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 w-full"
            >
              {loading ? (
                <>
                  <Loader size={16} className="animate-spin mr-2" />
                  Processing Batch...
                </>
              ) : (
                `▶ Start Batch 1 / ${totalBatches}`
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Progress */}
      {batchResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle size={20} className="text-green-600" />
              Progress: Batch {currentBatch} / {totalBatches}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Overall Progress Bar */}
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Overall Progress</span>
                <span>{currentBatch}/{totalBatches} batches ({Math.round((currentBatch/totalBatches)*100)}%)</span>
              </div>
              <Progress value={(currentBatch/totalBatches)*100} className="h-2" />
            </div>

            {/* Cumulative Totals */}
            <div className="grid grid-cols-4 gap-3">
              <div className="p-3 bg-slate-100 rounded">
                <p className="text-xs text-slate-600">Rows Processed</p>
                <p className="text-2xl font-bold">{currentBatch * batchSize}</p>
              </div>
              <div className="p-3 bg-green-100 rounded">
                <p className="text-xs text-slate-600">Inserted</p>
                <p className="text-2xl font-bold text-green-700">{totals.inserted}</p>
              </div>
              <div className="p-3 bg-yellow-100 rounded">
                <p className="text-xs text-slate-600">Skipped</p>
                <p className="text-2xl font-bold text-yellow-700">{totals.skipped}</p>
              </div>
              <div className="p-3 bg-orange-100 rounded">
                <p className="text-xs text-slate-600">Conflicts</p>
                <p className="text-2xl font-bold text-orange-700">{totals.conflicts}</p>
              </div>
            </div>

            {/* Mode Notice */}
            <div className={`p-4 border rounded ${dryRunMode ? 'bg-blue-50 border-blue-200' : 'bg-green-50 border-green-200'}`}>
              <p className={`text-sm ${dryRunMode ? 'text-blue-800' : 'text-green-800'}`}>
                <strong>{dryRunMode ? 'DRY-RUN MODE' : 'LIVE MODE'}:</strong> {dryRunMode ? 'Data is validated but NOT written to database.' : 'Data IS being written to database.'}
              </p>
            </div>

            {/* Batch History */}
            {batchResults.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">Batch History</h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {batchResults.map((batch, i) => (
                    <div key={i} className="p-3 bg-slate-50 border border-slate-200 rounded flex justify-between items-center">
                      <div>
                        <p className="text-sm font-mono">Batch {batch.batchIndex + 1} ({batch.batchRows} rows)</p>
                        <p className="text-xs text-slate-600">
                          ✓ {batch.inserted} | ⊘ {batch.skipped} | ! {batch.conflicts}
                        </p>
                      </div>
                      {batch.error && (
                        <span className="text-xs text-red-600">Error</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Next Action */}
            <div className="flex gap-3">
              {currentBatch < totalBatches && (
                <Button
                  onClick={() => processBatch(currentBatch)}
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-700 flex-1"
                >
                  {loading ? (
                    <>
                      <Loader size={16} className="animate-spin mr-2" />
                      Processing...
                    </>
                  ) : (
                    `▶ Continue: Batch ${currentBatch + 1} / ${totalBatches}`
                  )}
                </Button>
              )}
              {currentBatch >= totalBatches && (
                <div className="flex-1 p-4 bg-green-50 border border-green-200 rounded">
                  <p className="text-sm text-green-800">
                    ✓ All batches processed! Total: {totals.inserted} inserted, {totals.skipped} skipped, {totals.conflicts} conflicts.
                  </p>
                </div>
              )}
              <Button
                onClick={() => {
                  setFile(null);
                  setFileContent(null);
                  setCurrentBatch(0);
                  setBatchResults([]);
                  setError(null);
                }}
                variant="outline"
              >
                Reset
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}