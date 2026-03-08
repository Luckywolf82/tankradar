import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Zap, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
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
    dangerZone: false,
  });
  const [confirmModal, setConfirmModal] = useState(null);
  const [ruleEngineResult, setRuleEngineResult] = useState(null);
  const [geocodeResult, setGeocodeResult] = useState(null);

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
        {/* OPERATIONS */}
        <CollapsibleSection
          title="OPERATIONS"
          icon={Zap}
          section="operations"
          isExpanded={expandedSections.operations}
        >
          <div className="space-y-3">
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

        {/* DATA QUALITY */}
        <CollapsibleSection
          title="DATA QUALITY"
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
          </div>
        </CollapsibleSection>

        {/* ANALYSIS */}
        <CollapsibleSection
          title="ANALYSIS"
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

        {/* ADMIN / DANGER ZONE */}
        <CollapsibleSection
          title="ADMIN / DANGER ZONE"
          icon={AlertTriangle}
          section="dangerZone"
          isExpanded={expandedSections.dangerZone}
          isDanger={true}
        >
          <div className="space-y-3">
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
          <AlertDialogTitle>Confirm destructive operation</AlertDialogTitle>
          <AlertDialogDescription>
            This action may modify or delete large amounts of station data.
            Are you sure you want to continue?
          </AlertDialogDescription>
          <div className="flex justify-end gap-3">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmModal) confirmModal();
                setConfirmModal(null);
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Confirm
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}