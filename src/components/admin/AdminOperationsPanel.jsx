import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Zap, ChevronDown, ChevronUp, AlertTriangle, Settings } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function AdminOperationsPanel({ onLoadCandidates }) {
  const [autoProcessing, setAutoProcessing] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    operations: true,
    dataQuality: false,
    analysis: false,
    maintenance: false,
    tuning: false,
    dangerZone: false,
  });
  const [confirmModal, setConfirmModal] = useState(null);
  const [ruleEngineResult, setRuleEngineResult] = useState(null);
  const [geocodeResult, setGeocodeResult] = useState(null);
  const [mergePreviewResult, setMergePreviewResult] = useState(null);
  const [backfillResult, setBackfillResult] = useState(null);
  const [backfillLoading, setBackfillLoading] = useState(false);
  const [backfillBatchSize, setBackfillBatchSize] = useState(75);
  const [backfillOffset, setBackfillOffset] = useState(0);

  const NEARBY_RADIUS_STORAGE_KEY = 'tankradar_nearby_radius_km';
  const [nearbyRadiusKm, setNearbyRadiusKm] = useState(() => {
    try {
      const raw = localStorage.getItem(NEARBY_RADIUS_STORAGE_KEY);
      const val = parseFloat(raw);
      return isFinite(val) && val > 0 ? val : 10;
    } catch {
      return 10;
    }
  });

  const saveNearbyRadius = (val) => {
    const safe = isFinite(val) && val > 0 ? val : 10;
    setNearbyRadiusKm(safe);
    try {
      localStorage.setItem(NEARBY_RADIUS_STORAGE_KEY, String(safe));
    } catch { /* ignore */ }
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const executeWithConfirmation = (fn, isDangerous = false) => {
    if (isDangerous) {
      setConfirmModal(fn);
    } else {
      fn();
    }
  };

  const SectionHeader = ({ icon: IconComponent, title }) => (
    <div className="flex items-center gap-2 mb-3">
      <IconComponent className="w-5 h-5 text-gray-700" />
      <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
    </div>
  );

  const CollapsibleSection = ({ title, icon: IconComponent, children, isExpanded, section, isDanger = false }) => (
    <div className={`mb-6 border rounded-lg ${isDanger ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-white'}`}>
      <button
        onClick={() => toggleSection(section)}
        className={`w-full p-4 flex items-center justify-between font-medium transition-colors ${
          isDanger ? 'hover:bg-red-100' : 'hover:bg-gray-50'
        }`}
      >
        <SectionHeader icon={IconComponent} title={title} />
        {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
      </button>
      {isExpanded && (
        <div className="border-t border-gray-200 p-4 space-y-3">
          {children}
        </div>
      )}
    </div>
  );

  const OperationButton = ({ onClick, loading, isDanger = false, children }) => (
    <Button
      onClick={onClick}
      disabled={loading}
      className={`w-full justify-start ${isDanger ? 'bg-red-600 hover:bg-red-700' : 'bg-slate-600 hover:bg-slate-700'}`}
    >
      <Zap className="w-4 h-4 mr-2" />
      {loading ? 'Behandler...' : children}
    </Button>
  );

  return (
    <>
      <div className="mb-8 space-y-4">
        {/* DRIFT */}
        <CollapsibleSection
          title="DRIFT"
          icon={Zap}
          section="operations"
          isExpanded={expandedSections.operations}
        >
          <div className="space-y-3">
            <OperationButton
              onClick={async () => {
                setAutoProcessing(true);
                try {
                  const result = await base44.functions.invoke('processStationCandidates');
                  console.log('[ProcessCandidates] Result:', result.data);
                  onLoadCandidates();
                } catch (e) {
                  console.error('[ProcessCandidates] Failed:', e);
                } finally {
                  setAutoProcessing(false);
                }
              }}
              loading={autoProcessing}
            >
              Prosesser pending kandidater (regelmotor)
            </OperationButton>

            <OperationButton
              onClick={async () => {
                setAutoProcessing(true);
                try {
                  const result = await base44.functions.invoke('runStationReviewPipeline');
                  console.log('[Pipeline UI] Full result:', result.data);
                  onLoadCandidates();
                } catch (e) {
                  console.error('[Pipeline UI] Full pipeline failed:', e);
                } finally {
                  setAutoProcessing(false);
                }
              }}
              loading={autoProcessing}
            >
              Kjør full review pipeline
            </OperationButton>

            <OperationButton
              onClick={async () => {
                setAutoProcessing(true);
                try {
                  await base44.functions.invoke('identifyStationReviewProblems');
                  onLoadCandidates();
                } catch (e) {
                  console.error('Scan failed:', e);
                } finally {
                  setAutoProcessing(false);
                }
              }}
              loading={autoProcessing}
            >
              Scan Station-data for problemer
            </OperationButton>

            <OperationButton
              onClick={async () => {
                setAutoProcessing(true);
                try {
                  const result = await base44.functions.invoke('geocodeStationsFromCoordinates', { batchSize: 80 });
                  setGeocodeResult(result.data);
                  onLoadCandidates();
                } catch (e) {
                  console.error('Geocoding failed:', e);
                } finally {
                  setAutoProcessing(false);
                }
              }}
              loading={autoProcessing}
            >
              Geocode neste batch (80 stk)
            </OperationButton>

            {geocodeResult && (
              <div className="mt-3 p-3 bg-teal-50 border border-teal-200 rounded-lg text-sm">
                <div className="font-semibold text-teal-900 mb-2">Geocoding resultat</div>
                <div className="grid grid-cols-2 gap-2 text-teal-800">
                  <div>Oppdatert: <strong>{geocodeResult.summary?.updated ?? 0}</strong></div>
                  <div>Feilet: <strong>{geocodeResult.summary?.failed ?? 0}</strong></div>
                  <div>Gjenstår: <strong>{geocodeResult.summary?.remaining ?? 0}</strong></div>
                </div>
                <button onClick={() => setGeocodeResult(null)} className="text-xs text-gray-600 hover:text-gray-900 underline mt-2">
                  Lukk
                </button>
              </div>
            )}
          </div>
        </CollapsibleSection>

        {/* DATAKVALITET */}
        <CollapsibleSection
          title="DATAKVALITET"
          icon={Zap}
          section="dataQuality"
          isExpanded={expandedSections.dataQuality}
        >
          <div className="space-y-3">
            <OperationButton
              onClick={async () => {
                setAutoProcessing(true);
                try {
                  const result = await base44.functions.invoke('autoApproveExactDuplicates');
                  console.log('Auto-approval result:', result.data);
                  onLoadCandidates();
                } catch (e) {
                  console.error('Auto-approval failed:', e);
                } finally {
                  setAutoProcessing(false);
                }
              }}
              loading={autoProcessing}
            >
              Auto-godkjenn eksakte duplikater
            </OperationButton>

            <OperationButton
              onClick={async () => {
                setAutoProcessing(true);
                try {
                  const result = await base44.functions.invoke('autoConfirmChainFromName');
                  console.log('Auto chain confirmation:', result.data);
                  onLoadCandidates();
                } catch (e) {
                  console.error('Auto chain confirmation failed:', e);
                } finally {
                  setAutoProcessing(false);
                }
              }}
              loading={autoProcessing}
            >
              Auto-bekreft kjede fra navn
            </OperationButton>

            <OperationButton
              onClick={async () => {
                setAutoProcessing(true);
                try {
                  const result = await base44.functions.invoke('autoFillLocationFromName');
                  console.log('Auto location fill:', result.data);
                  onLoadCandidates();
                } catch (e) {
                  console.error('Auto location fill failed:', e);
                } finally {
                  setAutoProcessing(false);
                }
              }}
              loading={autoProcessing}
            >
              Auto-fyll stedsinfo fra navn
            </OperationButton>

            <OperationButton
              onClick={async () => {
                setAutoProcessing(true);
                setMergePreviewResult(null);
                try {
                  const result = await base44.functions.invoke('mergeOrphanSeedStations', { preview: true });
                  setMergePreviewResult(result.data);
                } catch (e) {
                  console.error('Merge preview failed:', e);
                } finally {
                  setAutoProcessing(false);
                }
              }}
              loading={autoProcessing}
            >
              Preview: merge orphan seed-stasjoner
            </OperationButton>

            {mergePreviewResult && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">
                <div className="font-semibold text-blue-900 mb-1">
                  Merge-kandidater: {mergePreviewResult.merge_candidates} (av {mergePreviewResult.total_seed_stations} seed-stasjoner)
                </div>
                {mergePreviewResult.candidates?.map((c, i) => (
                  <div key={i} className="text-blue-800 text-xs mb-1">
                    <strong>{c.seed_name}</strong> → {c.canonical_name} ({c.distance_m}m, {c.name_similarity_pct}% likhet{c.favorites_to_redirect > 0 ? `, ${c.favorites_to_redirect} favoritter` : ''})
                  </div>
                ))}
                <button onClick={() => setMergePreviewResult(null)} className="text-xs text-gray-500 underline mt-1">Lukk</button>
              </div>
            )}
          </div>
        </CollapsibleSection>

        {/* ANALYSE */}
        <CollapsibleSection
          title="ANALYSE"
          icon={Zap}
          section="analysis"
          isExpanded={expandedSections.analysis}
        >
          <div className="space-y-3">
            <Button
              onClick={async () => {
                console.log('[Analyze UI] Fetching pending review analysis...');
                try {
                  const result = await base44.functions.invoke('analyzePendingStationReviews');
                  console.log('[Analyze UI] Full result:', result.data);
                } catch (e) {
                  console.error('[Analyze UI] Analysis failed:', e);
                }
              }}
              className="w-full justify-start bg-slate-600 hover:bg-slate-700"
            >
              <Zap className="w-4 h-4 mr-2" />
              Analyze pending reviews
            </Button>

            <Button
              onClick={async () => {
                console.log('[Preview Safe Mass UI] Previewing safe mass reclassification...');
                try {
                  const result = await base44.functions.invoke('applySafeMassReviewReclassification', { dryRun: true, includeForeign: false });
                  console.log('[Preview Safe Mass UI] Full result:', result.data);
                } catch (e) {
                  console.error('[Preview Safe Mass UI] Preview failed:', e);
                }
              }}
              className="w-full justify-start bg-slate-600 hover:bg-slate-700"
            >
              <Zap className="w-4 h-4 mr-2" />
              Preview review reclassification
            </Button>

            <Button
              onClick={async () => {
                console.log('[Preview Semantic Chain UI] Previewing semantic chain cleanup...');
                try {
                  const result = await base44.functions.invoke('previewResolveSemanticChainUnconfirmed');
                  console.log('[Preview Semantic Chain UI] Full result:', result.data);
                } catch (e) {
                  console.error('[Preview Semantic Chain UI] Preview failed:', e);
                }
              }}
              className="w-full justify-start bg-slate-600 hover:bg-slate-700"
            >
              <Zap className="w-4 h-4 mr-2" />
              Preview semantic chain cleanup
            </Button>
          </div>
        </CollapsibleSection>

        {/* VEDLIKEHOLD */}
        <CollapsibleSection
          title="VEDLIKEHOLD"
          icon={Zap}
          section="maintenance"
          isExpanded={expandedSections.maintenance}
        >
          <div className="space-y-3">
            <div className="flex gap-2 items-center text-xs text-gray-600">
              <label className="whitespace-nowrap">Batch size:</label>
              <input
                type="number"
                min={1}
                max={200}
                value={backfillBatchSize}
                onChange={(e) => setBackfillBatchSize(Math.min(200, Math.max(1, Number(e.target.value) || 75)))}
                className="w-20 border border-gray-300 rounded px-2 py-1 text-xs"
              />
              <label className="whitespace-nowrap">Offset:</label>
              <input
                type="number"
                min={0}
                value={backfillOffset}
                onChange={(e) => setBackfillOffset(Math.max(0, Number(e.target.value) || 0))}
                className="w-20 border border-gray-300 rounded px-2 py-1 text-xs"
              />
              <button
                onClick={() => setBackfillOffset(0)}
                className="text-xs text-gray-500 hover:text-gray-800 underline"
              >
                Reset
              </button>
            </div>
            <OperationButton
              onClick={async () => {
                setBackfillLoading(true);
                setBackfillResult(null);
                try {
                  const result = await base44.functions.invoke('backfillFuelPriceStationFields', { dryRun: true, limit: backfillBatchSize, offset: backfillOffset });
                  setBackfillResult(result.data);
                } catch (e) {
                  console.error('[Backfill DryRun] Failed:', e);
                  setBackfillResult({ error: e.message });
                } finally {
                  setBackfillLoading(false);
                }
              }}
              loading={backfillLoading}
            >
              Dry Run: backfill stasjonsfelt på FuelPrice
            </OperationButton>

            {backfillResult && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs font-mono">
                <div className="font-semibold text-blue-900 mb-2">
                  {backfillResult.dryRun ? '⚠ DRY RUN — ingen skriving' : '✓ Kjørt live'}
                </div>
                {backfillResult.error ? (
                  <div className="text-red-700">{backfillResult.error}</div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-1 text-blue-800 mb-2">
                      <div>offset: <strong>{backfillResult.offset}</strong></div>
                      <div>limit: <strong>{backfillResult.limit}</strong></div>
                      <div>scanned: <strong>{backfillResult.scanned}</strong></div>
                      <div>candidatesFound: <strong>{backfillResult.candidatesFound}</strong></div>
                      <div>updated: <strong>{backfillResult.updated}</strong></div>
                      <div>skipped: <strong>{backfillResult.skipped}</strong></div>
                      <div>errors: <strong>{backfillResult.errors}</strong></div>
                      <div>hasMore: <strong>{backfillResult.hasMore ? `yes (next: ${backfillResult.nextOffset})` : 'no'}</strong></div>
                    </div>
                    {backfillResult.summary && (
                      <div className="text-blue-700 mb-2 italic">{backfillResult.summary}</div>
                    )}
                    {backfillResult.hasMore && (
                      <button
                        onClick={() => setBackfillOffset(backfillResult.nextOffset)}
                        className="text-xs text-blue-600 hover:text-blue-900 underline mr-3"
                      >
                        Set offset → {backfillResult.nextOffset}
                      </button>
                    )}
                    {backfillResult.sampleUpdated?.length > 0 && (
                      <div className="mb-1">
                        <div className="font-semibold text-blue-900">sampleUpdated ({backfillResult.sampleUpdated.length}):</div>
                        {backfillResult.sampleUpdated.map((row, i) => (
                          <div key={i} className="text-blue-700 pl-2">{row.priceId} [{row.sourceName}] → {row.fieldsSet?.join(', ')}</div>
                        ))}
                      </div>
                    )}
                    {backfillResult.sampleSkipped?.length > 0 && (
                      <div className="mb-1">
                        <div className="font-semibold text-blue-900">sampleSkipped ({backfillResult.sampleSkipped.length}):</div>
                        {backfillResult.sampleSkipped.map((row, i) => (
                          <div key={i} className="text-blue-700 pl-2">{row.priceId} — {row.reason}</div>
                        ))}
                      </div>
                    )}
                    {backfillResult.sampleErrors?.length > 0 && (
                      <div className="mb-1">
                        <div className="font-semibold text-red-700">sampleErrors ({backfillResult.sampleErrors.length}):</div>
                        {backfillResult.sampleErrors.map((row, i) => (
                          <div key={i} className="text-red-600 pl-2">{row.priceId} — {row.error}</div>
                        ))}
                      </div>
                    )}
                  </>
                )}
                <button onClick={() => setBackfillResult(null)} className="text-xs text-gray-500 hover:text-gray-900 underline mt-2">Lukk</button>
              </div>
            )}
          </div>
        </CollapsibleSection>

        {/* INNSTILLINGER */}
        <CollapsibleSection
          title="INNSTILLINGER"
          icon={Settings}
          section="tuning"
          isExpanded={expandedSections.tuning}
        >
          <div className="space-y-3">
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-xs font-semibold text-yellow-900 mb-2">⚙ Tuning: NearbyPrices radius</p>
              <div className="flex gap-2 items-center flex-wrap text-xs text-gray-600 mb-2">
                <label className="whitespace-nowrap font-medium">NearbyPrices radiusKm:</label>
                <input
                  type="number"
                  min={1}
                  max={200}
                  step={1}
                  value={nearbyRadiusKm}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    saveNearbyRadius(isFinite(val) && val > 0 ? val : 10);
                  }}
                  className="w-20 border border-gray-300 rounded px-2 py-1 text-xs"
                />
                <span className="text-xs text-gray-500">km (default: 10)</span>
                <button
                  onClick={() => saveNearbyRadius(10)}
                  className="text-xs text-gray-500 hover:text-gray-800 underline"
                >
                  Reset
                </button>
              </div>
              <p className="text-xs text-yellow-700">
                Aktiv verdi: <strong>{nearbyRadiusKm} km</strong>.{" "}
                <button
                  onClick={() => window.location.reload()}
                  className="underline hover:text-yellow-900"
                >
                  Last inn på nytt
                </button>{" "}
                for at Nearby bruker ny verdi.
              </p>
            </div>
          </div>
        </CollapsibleSection>

        {/* FAREOMRÅDE */}
        <CollapsibleSection
          title="⚠ FAREOMRÅDE"
          icon={AlertTriangle}
          section="dangerZone"
          isExpanded={expandedSections.dangerZone}
          isDanger={true}
        >
          <div className="space-y-3">
            <OperationButton
              onClick={() => executeWithConfirmation(async () => {
                setBackfillLoading(true);
                setBackfillResult(null);
                try {
                  const result = await base44.functions.invoke('backfillFuelPriceStationFields', { dryRun: false, limit: backfillBatchSize, offset: backfillOffset });
                  setBackfillResult(result.data);
                  if (result.data?.nextOffset != null) {
                    setBackfillOffset(result.data.nextOffset);
                  }
                } catch (e) {
                  console.error('[Backfill Apply] Failed:', e);
                  setBackfillResult({ error: e.message });
                } finally {
                  setBackfillLoading(false);
                }
              }, true)}
              loading={backfillLoading}
              isDanger={true}
            >
              Apply: backfill stasjonsfelt på FuelPrice (live)
            </OperationButton>

            <OperationButton
              onClick={() => executeWithConfirmation(async () => {
                setAutoProcessing(true);
                try {
                  const result = await base44.functions.invoke('applySafeMassReviewReclassification', { dryRun: false, includeForeign: false });
                  console.log('[Apply Safe Mass UI] Result:', result.data);
                  onLoadCandidates();
                } catch (e) {
                  console.error('[Apply Safe Mass UI] Apply failed:', e);
                } finally {
                  setAutoProcessing(false);
                }
              }, true)}
              loading={autoProcessing}
              isDanger={true}
            >
              Apply safe mass reclassification
            </OperationButton>

            <OperationButton
              onClick={() => executeWithConfirmation(async () => {
                setAutoProcessing(true);
                try {
                  const result = await base44.functions.invoke('resolveSemanticChainUnconfirmed');
                  console.log('[Apply Semantic Chain UI] Result:', result.data);
                  onLoadCandidates();
                } catch (e) {
                  console.error('[Apply Semantic Chain UI] Apply failed:', e);
                } finally {
                  setAutoProcessing(false);
                }
              }, true)}
              loading={autoProcessing}
              isDanger={true}
            >
              Apply semantic chain cleanup
            </OperationButton>

            <OperationButton
              onClick={() => executeWithConfirmation(async () => {
                setAutoProcessing(true);
                try {
                  const result = await base44.functions.invoke('applyHistoricalStationReclassification', { dryRun: false });
                  console.log('[Apply Historical Reclassification UI] Result:', result.data);
                  onLoadCandidates();
                } catch (e) {
                  console.error('[Apply Historical Reclassification UI] Apply failed:', e);
                } finally {
                  setAutoProcessing(false);
                }
              }, true)}
              loading={autoProcessing}
              isDanger={true}
            >
              Apply historical reclassification
            </OperationButton>

            <OperationButton
              onClick={() => executeWithConfirmation(async () => {
                setAutoProcessing(true);
                try {
                  const result = await base44.functions.invoke('mergeOrphanSeedStations', { preview: false });
                  console.log('[MergeOrphan] Result:', result.data);
                  alert(`Merget: ${result.data?.merged_this_run ?? 0} stasjoner. Gjenstår: ${result.data?.remaining ?? 0}`);
                  setMergePreviewResult(null);
                  onLoadCandidates();
                } catch (e) {
                  console.error('[MergeOrphan] Failed:', e);
                } finally {
                  setAutoProcessing(false);
                }
              }, true)}
              loading={autoProcessing}
              isDanger={true}
            >
              Apply: merge orphan seed-stasjoner (maks 10)
            </OperationButton>

            <OperationButton
              onClick={() => executeWithConfirmation(async () => {
                const preview = await base44.functions.invoke('deleteForeignStations', { dryRun: true });
                const count = preview.data?.count ?? 0;
                const names = (preview.data?.stations ?? []).map(s => s.name).join('\n');
                if (count === 0) {
                  alert('Ingen utenlandske stasjoner funnet.');
                  return;
                }
                if (!window.confirm(`Vil du slette ${count} utenlandske stasjoner?\n\n${names}\n\nDette kan ikke angres.`)) {
                  return;
                }
                setAutoProcessing(true);
                try {
                  const result = await base44.functions.invoke('deleteForeignStations', { dryRun: false });
                  alert(`Slettet ${result.data?.deletedStations} stasjoner og ${result.data?.deletedReviews} reviews.`);
                  onLoadCandidates();
                } catch (e) {
                  console.error('Delete foreign failed:', e);
                } finally {
                  setAutoProcessing(false);
                }
              }, true)}
              loading={autoProcessing}
              isDanger={true}
            >
              Slett alle utenlandske stasjoner
            </OperationButton>
          </div>
        </CollapsibleSection>
      </div>

      {/* Confirmation Modal */}
      <AlertDialog open={!!confirmModal} onOpenChange={() => setConfirmModal(null)}>
        <AlertDialogContent>
          <AlertDialogTitle>Bekreft destruktiv operasjon</AlertDialogTitle>
          <AlertDialogDescription>
            Denne handlingen kan endre eller slette store mengder stasjonsdata.
            Er du sikker på at du vil fortsette?
          </AlertDialogDescription>
          <div className="flex justify-end gap-3">
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmModal) confirmModal();
                setConfirmModal(null);
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Bekreft
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}