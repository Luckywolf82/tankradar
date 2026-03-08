import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, X, MapPin, AlertCircle, ChevronDown, ChevronUp, Unlink, Zap } from 'lucide-react';
import ReviewConsistencyCheck from '../components/admin/ReviewConsistencyCheck';
import MasteringMetrics from '../components/admin/MasteringMetrics';

export default function StationCandidateReview() {
  const [candidates, setCandidates] = useState([]);
  const [groups, setGroups] = useState([]);
  const [ungrouped, setUngrouped] = useState([]);
  const [stationReviews, setStationReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedGroupId, setExpandedGroupId] = useState(null);
  const [expandedStationReviewId, setExpandedStationReviewId] = useState(null);
  const [selectedNames, setSelectedNames] = useState({});
  const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0, duplicate: 0 });
  const [stationStats, setStationStats] = useState({ chain_unconfirmed: 0, generic_names: 0, pending_total: 0 });
  const [splitGroupIds, setSplitGroupIds] = useState(new Set());
  const [autoProcessing, setAutoProcessing] = useState(false);
  const [splitClusters, setSplitClusters] = useState({});
  const [autoChainResult, setAutoChainResult] = useState(null);
  const [ruleEngineResult, setRuleEngineResult] = useState(null);
  const [geocodeResult, setGeocodeResult] = useState(null);

  useEffect(() => {
    loadCandidates();
  }, []);

  const loadCandidates = async () => {
    setLoading(true);
    try {
      const all = await base44.entities.StationCandidate.list();
      setCandidates(all);
      
      // Load groupings
      const groupRes = await base44.functions.invoke('groupStationCandidates');
      setGroups(groupRes.data.groups || []);
      setUngrouped(groupRes.data.ungrouped || []);
      
      const newStats = { pending: 0, approved: 0, rejected: 0, duplicate: 0 };
      all.forEach(c => newStats[c.status]++);
      setStats(newStats);

      // Load Station reviews
      const reviews = await base44.entities.StationReview.list();
      setStationReviews(reviews);
      
      const stationStatsNew = { chain_unconfirmed: 0, generic_names: 0, pending_total: 0 };
      reviews.forEach(r => {
        if (r.status === 'pending') {
          stationStatsNew.pending_total++;
          if (r.review_type === 'chain_unconfirmed') stationStatsNew.chain_unconfirmed++;
          if (r.review_type === 'generic_name_review') stationStatsNew.generic_names++;
        }
      });
      setStationStats(stationStatsNew);
    } catch (error) {
      console.error('Failed to load candidates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (candidate, overrideName = null, groupMembers = []) => {
    try {
      const finalName = overrideName || candidate.proposedName;
      
      // Approve selected candidate
      await base44.entities.StationCandidate.update(candidate.id, { status: 'approved' });
      
      // Create Station from candidate
      await base44.entities.Station.create({
        name: finalName,
        chain: candidate.proposedChain,
        latitude: candidate.latitude,
        longitude: candidate.longitude,
        address: candidate.address,
        city: candidate.region,
        region: candidate.region,
        sourceName: 'GooglePlaces',
        sourceStationId: candidate.sourceStationId,
      });

      // Mark rest of group members as duplicate
      for (const member of groupMembers) {
        if (member.id !== candidate.id) {
          await base44.entities.StationCandidate.update(member.id, { 
            status: 'duplicate',
            notes: `Duplicate of approved station: ${candidate.id}`
          });
        }
      }

      loadCandidates();
    } catch (error) {
      console.error('Failed to approve:', error);
    }
  };

  const handleReject = async (candidate) => {
    try {
      await base44.entities.StationCandidate.update(candidate.id, { status: 'rejected' });
      loadCandidates();
    } catch (error) {
      console.error('Failed to reject:', error);
    }
  };

  const handleDuplicate = async (candidate) => {
    try {
      await base44.entities.StationCandidate.update(candidate.id, { status: 'duplicate' });
      loadCandidates();
    } catch (error) {
      console.error('Failed to mark as duplicate:', error);
    }
  };

  const handleStationReviewApprove = async (review) => {
    try {
      await base44.entities.StationReview.update(review.id, { status: 'approved' });
      loadCandidates();
    } catch (error) {
      console.error('Failed to approve station review:', error);
    }
  };

  const handleStationReviewReject = async (review) => {
    try {
      await base44.entities.StationReview.update(review.id, { status: 'rejected' });
      loadCandidates();
    } catch (error) {
      console.error('Failed to reject station review:', error);
    }
  };

  const handleStationReviewDuplicate = async (review, duplicateOf = null) => {
    try {
      await base44.entities.StationReview.update(review.id, { 
        status: 'duplicate',
        duplicate_of_station_id: duplicateOf,
      });
      loadCandidates();
    } catch (error) {
      console.error('Failed to mark station as duplicate:', error);
    }
  };

  const handleSplitGroup = async (groupId, groupCandidates) => {
    try {
      // Call backend to split by likeness
      const result = await base44.functions.invoke('splitGroupByLikeness', {
        groupId,
        groupCandidates,
      });

      setSplitClusters(prev => ({
        ...prev,
        [groupId]: result.data.clusters,
      }));

      setSplitGroupIds(prev => {
        const newSet = new Set(prev);
        newSet.add(groupId);
        return newSet;
      });
    } catch (error) {
      console.error('Failed to split group:', error);
    }
  };

  const handleAutoApproveExactDuplicates = async () => {
    setAutoProcessing(true);
    try {
      const result = await base44.functions.invoke('autoApproveExactDuplicates');
      console.log('Auto-approval result:', result.data);
      loadCandidates();
    } catch (error) {
      console.error('Auto-approval failed:', error);
    } finally {
      setAutoProcessing(false);
    }
  };

  const handleAutoConfirmChainFromName = async () => {
    setAutoProcessing(true);
    try {
      const result = await base44.functions.invoke('autoConfirmChainFromName');
      setAutoChainResult(result.data);
      console.log('Auto chain confirmation result:', result.data);
      loadCandidates();
    } catch (error) {
      console.error('Auto chain confirmation failed:', error);
    } finally {
      setAutoProcessing(false);
    }
  };

  const handleAutoFillLocation = async () => {
    setAutoProcessing(true);
    try {
      const result = await base44.functions.invoke('autoFillLocationFromName');
      setAutoChainResult(result.data);
      console.log('Auto location fill result:', result.data);
      loadCandidates();
    } catch (error) {
      console.error('Auto location fill failed:', error);
    } finally {
      setAutoProcessing(false);
    }
  };

  if (loading) {
    return <div className="p-6">Laster...</div>;
  }

  return (
    <div className="max-w-5xl mx-auto p-6 pb-24">
      <h1 className="text-3xl font-bold mb-6">Station Mastering Hub</h1>
      <p className="text-gray-600 mb-6">Google Places-kandidater + Station-data review</p>

      {/* Metrics & Export */}
      <div className="mb-8">
        <MasteringMetrics />
      </div>

      {/* Consistency Check */}
      <ReviewConsistencyCheck />

      {/* Auto-approve exact duplicates */}
      <div className="mb-6 space-y-3">
        <div>
          <Button
            onClick={handleAutoApproveExactDuplicates}
            disabled={autoProcessing}
            className="bg-purple-600 hover:bg-purple-700 flex items-center gap-2"
          >
            <Zap className="w-4 h-4" />
            {autoProcessing ? 'Behandler...' : 'Auto-godkjenn eksakte duplikater'}
          </Button>
          <p className="text-xs text-gray-600 mt-2">
            Godkjenner automatisk første kandidat og markerer resten som duplikater når navn, adresse og koordinater er eksakt like.
          </p>
        </div>
        
        <div>
          <Button
            onClick={() => base44.functions.invoke('identifyStationReviewProblems').then(() => loadCandidates())}
            disabled={autoProcessing}
            className="bg-indigo-600 hover:bg-indigo-700 flex items-center gap-2"
          >
            <Zap className="w-4 h-4" />
            {autoProcessing ? 'Skanninger...' : 'Scan Station-data for problemer'}
          </Button>
          <p className="text-xs text-gray-600 mt-2">
            Identifiserer mangel på kjede, generiske navn og andre problemer i Station-tabellen.
          </p>
        </div>

        <div>
          <Button
            onClick={handleAutoConfirmChainFromName}
            disabled={autoProcessing}
            className="bg-green-600 hover:bg-green-700 flex items-center gap-2"
          >
            <Zap className="w-4 h-4" />
            {autoProcessing ? 'Behandler...' : 'Auto-bekreft kjede fra navn'}
          </Button>
          <p className="text-xs text-gray-600 mt-2">
            Bekrefter kjede automatisk for station_review med chain_unconfirmed der navn matcher kjent kjede.
          </p>
        </div>

        <div>
          <Button
            onClick={handleAutoFillLocation}
            disabled={autoProcessing}
            className="bg-cyan-600 hover:bg-cyan-700 flex items-center gap-2"
          >
            <Zap className="w-4 h-4" />
            {autoProcessing ? 'Behandler...' : 'Auto-fyll stedsinfo fra navn'}
          </Button>
          <p className="text-xs text-gray-600 mt-2">
            Fyller inn by og områdenavn automatisk fra stasjonsnavn der det er entydig.
          </p>
        </div>

        <div className="border-t pt-3">
          <Button
            onClick={async () => {
              setAutoProcessing(true);
              try {
                const result = await base44.functions.invoke('classifyStationsRuleEngine');
                setRuleEngineResult(result.data);
                loadCandidates();
              } catch (e) {
                console.error('Rule engine failed:', e);
              } finally {
                setAutoProcessing(false);
              }
            }}
            disabled={autoProcessing}
            className="bg-violet-600 hover:bg-violet-700 flex items-center gap-2"
          >
            <Zap className="w-4 h-4" />
            {autoProcessing ? 'Klassifiserer...' : 'Kjør regelmotor (full klassifisering)'}
          </Button>
          <p className="text-xs text-gray-600 mt-2">
            Klassifiserer alle stasjoner etter regelmotor (kjeder, spesialtyper, retail, generiske navn). Kjøres også automatisk daglig kl 03:00.
          </p>
        </div>

        <div className="border-t pt-3">
          <Button
            onClick={async () => {
              setAutoProcessing(true);
              try {
                // Først dry-run for å se rapport
                const result = await base44.functions.invoke('verifyGenericNameStations', { dryRun: false });
                setRuleEngineResult({ ...result.data, _type: 'verify_generic' });
                loadCandidates();
              } catch (e) {
                console.error('Verify generic names failed:', e);
              } finally {
                setAutoProcessing(false);
              }
            }}
            disabled={autoProcessing}
            className="bg-amber-600 hover:bg-amber-700 flex items-center gap-2 mb-3"
          >
            <Zap className="w-4 h-4" />
            {autoProcessing ? 'Verifiserer...' : 'Verifiser Tanken/stedsnavn mot geocodet lokasjon'}
          </Button>
          <p className="text-xs text-gray-600 mb-3">
            Sjekker om stedsnavn i stasjonsnavn (f.eks. "Tanken Hjartdal") stemmer med geocodet by/kommune. Setter areaLabel automatisk der det matcher.
          </p>
        </div>

        <div className="border-t pt-3">
          <Button
            onClick={async () => {
              // Dry run først for å vise hva som vil bli slettet
              const preview = await base44.functions.invoke('deleteForeignStations', { dryRun: true });
              const count = preview.data?.count ?? 0;
              const names = (preview.data?.stations ?? []).map(s => s.name).join('\n');
              if (count === 0) { alert('Ingen utenlandske stasjoner funnet.'); return; }
              if (!window.confirm(`Vil du slette ${count} utenlandske stasjoner?\n\n${names}\n\nDette kan ikke angres.`)) return;
              setAutoProcessing(true);
              try {
                const result = await base44.functions.invoke('deleteForeignStations', { dryRun: false });
                alert(`Slettet ${result.data?.deletedStations} stasjoner og ${result.data?.deletedReviews} reviews.`);
                loadCandidates();
              } catch (e) {
                console.error('Delete foreign failed:', e);
              } finally {
                setAutoProcessing(false);
              }
            }}
            disabled={autoProcessing}
            className="bg-red-700 hover:bg-red-800 flex items-center gap-2"
          >
            <X className="w-4 h-4" />
            {autoProcessing ? 'Sletter...' : 'Slett alle utenlandske stasjoner'}
          </Button>
          <p className="text-xs text-gray-600 mt-2">
            Sletter stasjoner som matcher utenlandske mønstre (Preem, Tännäs, Sälen, Åre, K-market, Kilpisjärvi osv.) samt tilhørende reviews. Viser forhåndsvisning før sletting.
          </p>
        </div>

        <div className="border-t pt-3">
          <Button
            onClick={async () => {
              setAutoProcessing(true);
              try {
                const result = await base44.functions.invoke('geocodeStationsFromCoordinates', { batchSize: 80 });
                setGeocodeResult(result.data);
                loadCandidates();
              } catch (e) {
                console.error('Geocoding failed:', e);
              } finally {
                setAutoProcessing(false);
              }
            }}
            disabled={autoProcessing}
            className="bg-teal-600 hover:bg-teal-700 flex items-center gap-2"
          >
            <Zap className="w-4 h-4" />
            {autoProcessing ? 'Geocoder batch...' : 'Geocode neste batch (80 stk)'}
          </Button>
          <p className="text-xs text-gray-600 mt-2">
            Kjører én batch på 80 stk manuelt. Automatisk scheduled kjøring hvert 5. minutt tar resten — ingen manuell oppfølging nødvendig.
          </p>
        </div>
      </div>

      {/* Rule engine results */}
      {ruleEngineResult?._type === 'verify_generic' && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <h3 className="font-semibold text-amber-900 mb-3">Verifisering av Tanken/stedsnavn — resultat</h3>
          <div className="grid grid-cols-2 gap-3 mb-4 sm:grid-cols-4 text-center">
            <div className="bg-white rounded p-2 border">
              <div className="text-2xl font-bold text-amber-600">{ruleEngineResult.summary?.totalGenericStations ?? 0}</div>
              <div className="text-xs text-gray-600">Totalt generiske</div>
            </div>
            <div className="bg-white rounded p-2 border">
              <div className="text-2xl font-bold text-green-600">{ruleEngineResult.summary?.verified ?? 0}</div>
              <div className="text-xs text-gray-600">Verifisert ✓</div>
            </div>
            <div className="bg-white rounded p-2 border">
              <div className="text-2xl font-bold text-red-500">{ruleEngineResult.summary?.mismatch ?? 0}</div>
              <div className="text-xs text-gray-600">Mismatch ✗</div>
            </div>
            <div className="bg-white rounded p-2 border">
              <div className="text-2xl font-bold text-gray-400">{ruleEngineResult.summary?.noGeocode ?? 0}</div>
              <div className="text-xs text-gray-600">Mangler geocoding</div>
            </div>
          </div>
          {ruleEngineResult.summary?.areaLabelUpdated > 0 && (
            <div className="text-sm text-green-700 font-medium mb-2">✓ {ruleEngineResult.summary.areaLabelUpdated} stasjoner fikk areaLabel satt automatisk</div>
          )}
          {ruleEngineResult.details?.mismatch?.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded p-3 mb-3">
              <div className="text-sm font-semibold text-red-800 mb-1">Mismatch — stedsnavn i navn stemmer ikke med geocodet by:</div>
              {ruleEngineResult.details.mismatch.map(s => (
                <div key={s.id} className="text-sm text-red-700">⚑ {s.name} → geocodet by: "{s.geocodedCity || 'ukjent'}"</div>
              ))}
            </div>
          )}
          {ruleEngineResult.details?.verified?.length > 0 && (
            <div className="bg-green-50 border border-green-200 rounded p-3 mb-3">
              <div className="text-sm font-semibold text-green-800 mb-1">Verifisert (stedsnavn matcher geocodet lokasjon):</div>
              {ruleEngineResult.details.verified.slice(0, 10).map(s => (
                <div key={s.id} className="text-sm text-green-700">✓ {s.name} → matchet på {s.matchedOn}: "{s.city}"</div>
              ))}
              {ruleEngineResult.details.verified.length > 10 && (
                <div className="text-xs text-gray-500">... og {ruleEngineResult.details.verified.length - 10} til</div>
              )}
            </div>
          )}
          <button onClick={() => setRuleEngineResult(null)} className="text-sm text-gray-600 hover:text-gray-900 underline">Lukk resultat</button>
        </div>
      )}

      {ruleEngineResult && !ruleEngineResult._type && (
        <div className="mb-6 p-4 bg-violet-50 border border-violet-200 rounded-lg">
          <h3 className="font-semibold text-violet-900 mb-3">Regelmotor — klassifiseringsresultat</h3>
          <div className="grid grid-cols-3 gap-3 mb-4 text-center sm:grid-cols-5">
            {[
              { label: 'Auto-bekreftet kjede', key: 'secure_chain', color: 'text-green-600' },
              { label: 'Lokale kjeder', key: 'local_chain', color: 'text-blue-600' },
              { label: 'Spesialtype (LPG/CNG)', key: 'special_type', color: 'text-amber-600' },
              { label: 'Marin/service', key: 'marine_service', color: 'text-cyan-600' },
              { label: 'Retail/operatør', key: 'retail_operator', color: 'text-orange-600' },
              { label: 'Generisk lokalt navn', key: 'generic_name', color: 'text-red-600' },
              { label: 'Mulig utland', key: 'possible_foreign', color: 'text-red-800' },
              { label: 'Tankautomat', key: 'automatic_fuel_station', color: 'text-teal-600' },
              { label: 'Mulig duplikat', key: 'possible_duplicate', color: 'text-pink-600' },
              { label: 'Uklassifisert', key: 'chain_unconfirmed', color: 'text-gray-500' },
            ].map(({ label, key, color }) => (
              <div key={key} className="bg-white rounded p-2 border">
                <div className={`text-2xl font-bold ${color}`}>{ruleEngineResult.summary?.perClassification?.[key] ?? 0}</div>
                <div className="text-xs text-gray-600">{label}</div>
              </div>
            ))}
          </div>
          <div className="text-sm text-gray-700 mb-2">
            <strong>Stasjoner oppdatert:</strong> {ruleEngineResult.summary?.stationUpdates ?? 0} av {ruleEngineResult.summary?.totalStations ?? 0}
          </div>
          <div className="text-sm text-gray-700 mb-1">
            <strong>Reviews oppdatert med reviewReason:</strong> {ruleEngineResult.summary?.reviewsUpdated ?? 0}
          </div>
          {ruleEngineResult.summary?.possibleDuplicatePairs > 0 && (
            <div className="text-sm text-pink-700 font-medium mb-3">
              ⚑ {ruleEngineResult.summary.possibleDuplicatePairs} mulige duplikat-par funnet (samme navn + &lt;50m avstand)
            </div>
          )}
          {ruleEngineResult.details?.possible_foreign?.length > 0 && (
            <div className="mb-3 bg-red-50 border border-red-200 rounded p-3">
              <div className="text-sm font-semibold text-red-800 mb-1">Mulige utenlandske poster:</div>
              {ruleEngineResult.details.possible_foreign.map(s => (
                <div key={s.id} className="text-sm text-red-700">⚑ {s.name}</div>
              ))}
            </div>
          )}
          {ruleEngineResult.details?.generic_name?.length > 0 && (
            <div className="mb-3 bg-yellow-50 border border-yellow-200 rounded p-3">
              <div className="text-sm font-semibold text-yellow-800 mb-1">Generiske navn flagget til review:</div>
              {ruleEngineResult.details.generic_name.map(s => (
                <div key={s.id} className="text-sm text-yellow-700">⚠ {s.name}</div>
              ))}
            </div>
          )}
          {ruleEngineResult.details?.possible_duplicate?.length > 0 && (
            <div className="mb-3 bg-pink-50 border border-pink-200 rounded p-3">
              <div className="text-sm font-semibold text-pink-800 mb-1">Mulige duplikater (samme navn + &lt;50m):</div>
              {ruleEngineResult.details.possible_duplicate.map((pair, i) => (
                <div key={i} className="text-sm text-pink-700">
                  ⚑ "{pair.a.name}" ↔ "{pair.b.name}" — {pair.distanceMeters}m
                </div>
              ))}
            </div>
          )}
          {ruleEngineResult.details?.automatic_fuel_station?.length > 0 && (
            <div className="mb-3 bg-teal-50 border border-teal-200 rounded p-3">
              <div className="text-sm font-semibold text-teal-800 mb-1">Tankautomater:</div>
              {ruleEngineResult.details.automatic_fuel_station.map(s => (
                <div key={s.id} className="text-sm text-teal-700">⚙ {s.name}</div>
              ))}
            </div>
          )}
          <button onClick={() => setRuleEngineResult(null)} className="text-sm text-gray-600 hover:text-gray-900 underline">
            Lukk resultat
          </button>
        </div>
      )}

      {/* Geocode results */}
      {geocodeResult && (
        <div className="mb-6 p-4 bg-teal-50 border border-teal-200 rounded-lg">
          <h3 className="font-semibold text-teal-900 mb-3">Geocoding fra koordinater — resultat</h3>
          <div className="grid grid-cols-2 gap-3 mb-4 sm:grid-cols-4 text-center">
            <div className="bg-white rounded p-2 border">
              <div className="text-2xl font-bold text-teal-600">{geocodeResult.summary?.updated ?? 0}</div>
              <div className="text-xs text-gray-600">Oppdatert</div>
            </div>
            <div className="bg-white rounded p-2 border">
              <div className="text-2xl font-bold text-red-500">{geocodeResult.summary?.failed ?? 0}</div>
              <div className="text-xs text-gray-600">Feilet</div>
            </div>
            <div className="bg-white rounded p-2 border">
              <div className="text-2xl font-bold text-gray-500">{geocodeResult.summary?.remaining ?? 0}</div>
              <div className="text-xs text-gray-600">{geocodeResult.summary?.done ? '✓ Alle ferdig!' : 'Gjenstår (auto kjører)'}</div>
            </div>
            <div className="bg-white rounded p-2 border">
              <div className="text-2xl font-bold text-gray-700">{geocodeResult.summary?.totalNeedingGeocode ?? 0}</div>
              <div className="text-xs text-gray-600">Totalt trenger geocoding</div>
            </div>
          </div>
          {geocodeResult.details?.updated?.length > 0 && (
            <div className="bg-white rounded p-3 border text-sm mb-2">
              <div className="font-semibold text-teal-800 mb-1">Eksempler oppdatert:</div>
              {geocodeResult.details.updated.slice(0, 5).map(s => (
                <div key={s.id} className="text-gray-700">
                  {s.name} → {Object.entries(s.updates).map(([k, v]) => `${k}: ${v}`).join(', ')}
                </div>
              ))}
            </div>
          )}
          <button onClick={() => setGeocodeResult(null)} className="text-sm text-gray-600 hover:text-gray-900 underline">
            Lukk resultat
          </button>
        </div>
      )}

      {/* Auto-chain results */}
      {autoChainResult && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <h3 className="font-semibold text-green-900 mb-3">Auto-bekreftelse av kjede — resultat (3-nivå)</h3>

          {/* Teller-grid */}
          <div className="grid grid-cols-2 gap-3 mb-4 sm:grid-cols-4">
            <div className="bg-white rounded p-3 border text-center">
              <div className="text-2xl font-bold text-green-600">{autoChainResult.summary.autoConfirmed ?? autoChainResult.summary.chainConfirmed ?? 0}</div>
              <div className="text-xs text-gray-600">Tier A: Auto-bekreftet</div>
            </div>
            <div className="bg-white rounded p-3 border text-center">
              <div className="text-2xl font-bold text-blue-600">{autoChainResult.summary.chainSuggested ?? 0}</div>
              <div className="text-xs text-gray-600">Tier B: Forslag</div>
            </div>
            <div className="bg-white rounded p-3 border text-center">
              <div className="text-2xl font-bold text-gray-500">{autoChainResult.summary.manualReviewNeeded ?? autoChainResult.summary.stillPending ?? 0}</div>
              <div className="text-xs text-gray-600">Tier C: Manuell review</div>
            </div>
            <div className="bg-white rounded p-3 border text-center">
              <div className="text-2xl font-bold text-orange-500">{autoChainResult.summary.excluded ?? 0}</div>
              <div className="text-xs text-gray-600">Ekskludert (LPG/CNG/retail)</div>
            </div>
          </div>

          {/* Tier A detaljer */}
          {(autoChainResult.details?.autoConfirmed ?? autoChainResult.details?.confirmed ?? []).length > 0 && (
            <div className="mb-3 bg-green-100 rounded p-3">
              <div className="text-sm font-semibold text-green-900 mb-2">✓ Tier A — Auto-bekreftet:</div>
              <div className="space-y-0.5 text-sm">
                {(autoChainResult.details.autoConfirmed ?? autoChainResult.details.confirmed).slice(0, 8).map(item => (
                  <div key={item.id} className="text-green-800">{item.name ?? item.stationName} → <strong>{item.chain ?? item.detectedChain}</strong></div>
                ))}
                {(autoChainResult.details.autoConfirmed ?? autoChainResult.details.confirmed).length > 8 && (
                  <div className="text-gray-500 text-xs">... og {(autoChainResult.details.autoConfirmed ?? autoChainResult.details.confirmed).length - 8} til</div>
                )}
              </div>
            </div>
          )}

          {/* Tier B detaljer */}
          {(autoChainResult.details?.chainSuggested ?? []).length > 0 && (
            <div className="mb-3 bg-blue-50 rounded p-3">
              <div className="text-sm font-semibold text-blue-900 mb-2">~ Tier B — Forslag (krever manuell bekreftelse):</div>
              <div className="space-y-0.5 text-sm">
                {autoChainResult.details.chainSuggested.slice(0, 8).map(item => (
                  <div key={item.id} className="text-blue-800">{item.name} → mulig <strong>{item.suggestedChain}</strong></div>
                ))}
              </div>
            </div>
          )}

          {/* Regler-oppsummering */}
          {autoChainResult.summary.rules && (
            <div className="text-xs text-gray-500 mt-2 border-t pt-2">
              <strong>Ekskludert fra auto-confirm:</strong> {autoChainResult.summary.rules.excludedNote}
            </div>
          )}

          <button onClick={() => setAutoChainResult(null)} className="text-sm text-gray-600 hover:text-gray-900 underline mt-3 block">
            Lukk resultat
          </button>
        </div>
      )}

      {/* Stats: GooglePlaces Candidates */}
      <div className="mb-8">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Google Places Kandidater</h3>
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-yellow-600">{stats.pending}</div>
              <div className="text-sm text-gray-600">Venter</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-green-600">{stats.approved}</div>
              <div className="text-sm text-gray-600">Godkjent</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-red-600">{stats.rejected}</div>
              <div className="text-sm text-gray-600">Avvist</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-gray-600">{stats.duplicate}</div>
              <div className="text-sm text-gray-600">Duplikat</div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Stats: Station Reviews */}
      {stationStats.pending_total > 0 && (
        <div className="mb-8">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Station-data Review</h3>
          <div className="grid grid-cols-3 gap-4">
            <Card className="border-l-4 border-l-purple-400">
              <CardContent className="pt-6">
                <div className="text-3xl font-bold text-purple-600">{stationStats.pending_total}</div>
                <div className="text-sm text-gray-600">Venter</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-3xl font-bold text-orange-600">{stationStats.chain_unconfirmed}</div>
                <div className="text-sm text-gray-600">Kjede mangler</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-3xl font-bold text-blue-600">{stationStats.generic_names}</div>
                <div className="text-sm text-gray-600">Generisk navn</div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Station Reviews Section */}
      {stationReviews.filter(r => r.status === 'pending').length > 0 && (
        <div className="mb-10">
          <h2 className="text-xl font-semibold mb-4 text-purple-900">Station-Data Review ({stationReviews.filter(r => r.status === 'pending').length})</h2>
          <div className="space-y-3">
            {stationReviews.filter(r => r.status === 'pending').map(review => (
              <Card key={review.id} className="border-l-4 border-l-purple-400">
                <button
                  onClick={() => setExpandedStationReviewId(expandedStationReviewId === review.id ? null : review.id)}
                  className="w-full p-4 flex justify-between items-center hover:bg-gray-50"
                >
                  <div className="text-left">
                    <div className="font-semibold">
                      {review.station_name}
                      {review.station_chain && <span className="text-sm text-gray-600 ml-2">({review.station_chain})</span>}
                    </div>
                    <div className="text-sm text-gray-600">
                      {review.review_type.replace(/_/g, ' ')} • {review.station_latitude?.toFixed(4)}, {review.station_longitude?.toFixed(4)}
                    </div>
                  </div>
                  {expandedStationReviewId === review.id ? <ChevronUp /> : <ChevronDown />}
                </button>

                {expandedStationReviewId === review.id && (
                  <CardContent className="bg-purple-50 border-t space-y-4 p-4">
                    <div className="bg-white p-3 rounded border">
                      <div className="text-sm font-semibold mb-2">Problem:</div>
                      <p className="text-sm text-gray-700">{review.issue_description}</p>
                      
                      {review.suggested_action && (
                        <div className="mt-3 pt-3 border-t">
                          <div className="text-sm font-semibold mb-1">Anbefaling:</div>
                          <p className="text-sm text-gray-700">{review.suggested_action}</p>
                        </div>
                      )}
                      
                      {review.notes && (
                        <div className="mt-3 pt-3 border-t">
                          <div className="text-sm font-semibold mb-1">Reviewer-notater:</div>
                          <p className="text-sm text-gray-700">{review.notes}</p>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 flex-wrap">
                      <Button
                        onClick={() => handleStationReviewApprove(review)}
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Check className="w-4 h-4 mr-1" />
                        Godkjenn
                      </Button>
                      <Button
                        onClick={() => handleStationReviewDuplicate(review)}
                        size="sm"
                        variant="outline"
                      >
                        <MapPin className="w-4 h-4 mr-1" />
                        Duplikat
                      </Button>
                      <Button
                        onClick={() => handleStationReviewReject(review)}
                        size="sm"
                        variant="outline"
                        className="text-red-600"
                      >
                        <X className="w-4 h-4 mr-1" />
                        Avvis
                      </Button>
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Grouped candidates */}
      {groups.length > 0 && (
        <div className="mb-10">
          <h2 className="text-xl font-semibold mb-4 text-blue-900">Grupperte kandidater ({groups.length})</h2>
          <div className="space-y-3">
            {groups.map(group => (
              <Card key={group.groupId} className="border-l-4 border-l-blue-400">
                <button
                  onClick={() => setExpandedGroupId(expandedGroupId === group.groupId ? null : group.groupId)}
                  className="w-full p-4 flex justify-between items-center hover:bg-gray-50"
                >
                  <div className="text-left">
                    <div className="font-semibold">
                      {group.candidates.length} kandidater {group.groupType === 'duplicate' ? '(mulig duplikat)' : '(samme sted)'}
                    </div>
                    <div className="text-sm text-gray-600">{group.reason?.join(', ') || 'Gruppert'}</div>
                  </div>
                  {expandedGroupId === group.groupId ? <ChevronUp /> : <ChevronDown />}
                </button>

                {expandedGroupId === group.groupId && !splitGroupIds.has(group.groupId) && (
                  <CardContent className="bg-gray-50 border-t space-y-4 p-4">
                    {/* Name selection for same location */}
                    {group.groupType === 'same_location' && (
                      <div className="bg-blue-50 p-3 rounded border border-blue-200">
                        <div className="text-sm font-semibold mb-2">Velg hovednavn for denne lokasjonen:</div>
                        <div className="space-y-2">
                          {group.candidates.map(c => (
                            <label key={c.id} className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name={`group-${group.groupId}`}
                                value={c.id}
                                checked={selectedNames[group.groupId] === c.id}
                                onChange={e => setSelectedNames({...selectedNames, [group.groupId]: e.target.value})}
                                className="cursor-pointer"
                              />
                              <span className="text-sm">{c.proposedName} ({c.address || 'ingen adresse'})</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Individual candidates in group */}
                    <div className="space-y-3">
                      {group.candidates.map(candidate => (
                        <div key={candidate.id} className="bg-white p-3 rounded border">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <div className="font-semibold">{candidate.proposedName}</div>
                              <div className="text-sm text-gray-600">{candidate.address}</div>
                              <div className="text-xs text-gray-500">{candidate.latitude.toFixed(4)}, {candidate.longitude.toFixed(4)}</div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              onClick={() => handleApprove(candidate, selectedNames[group.groupId] ? group.candidates.find(c => c.id === selectedNames[group.groupId])?.proposedName : null, group.candidates)}
                              size="sm"
                              className="bg-green-600 hover:bg-green-700"
                            >
                              Godkjenn
                            </Button>
                            <Button
                              onClick={() => handleReject(candidate)}
                              size="sm"
                              variant="outline"
                              className="text-red-600"
                            >
                              Avvis
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Split group button */}
                    <div className="mt-4 pt-4 border-t">
                      <Button
                        onClick={() => handleSplitGroup(group.groupId, group.candidates)}
                        size="sm"
                        variant="outline"
                        className="text-orange-600 hover:text-orange-700 flex items-center gap-2"
                      >
                        <Unlink className="w-4 h-4" />
                        Splitt gruppe
                      </Button>
                      <div className="text-xs text-gray-600 mt-2">
                        Splitter automatisk kandidater med ulik navn/adresse.
                      </div>
                    </div>
                  </CardContent>
                )}

                {/* Split view - show clusters */}
                {expandedGroupId === group.groupId && splitGroupIds.has(group.groupId) && splitClusters[group.groupId] && (
                  <CardContent className="bg-orange-50 border-t space-y-4 p-4">
                    <div className="bg-orange-100 p-3 rounded border border-orange-300 text-sm text-orange-900">
                      <strong>Gruppe splittet i {splitClusters[group.groupId].length} grupper</strong>
                    </div>
                    
                    {splitClusters[group.groupId].map((cluster, clusterIdx) => (
                      <div key={cluster.newGroupId} className="bg-white p-4 rounded border-l-4 border-l-orange-400">
                        <div className="font-semibold text-sm mb-3">Gruppe {clusterIdx + 1} ({cluster.count} kandidater)</div>
                        <div className="space-y-3">
                          {cluster.candidates.map(candidate => (
                            <div key={candidate.id} className="bg-gray-50 p-3 rounded">
                              <div className="flex justify-between items-start mb-2">
                                <div>
                                  <div className="font-semibold text-sm">{candidate.proposedName}</div>
                                  <div className="text-xs text-gray-600">{candidate.address}</div>
                                  <div className="text-xs text-gray-500">{candidate.latitude.toFixed(4)}, {candidate.longitude.toFixed(4)}</div>
                                </div>
                              </div>
                              <div className="flex gap-2 flex-wrap">
                                <Button
                                  onClick={() => handleApprove(candidate, candidate.proposedName, [])}
                                  size="sm"
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  Godkjenn
                                </Button>
                                <Button
                                  onClick={() => handleDuplicate(candidate)}
                                  size="sm"
                                  variant="outline"
                                >
                                  Duplikat
                                </Button>
                                <Button
                                  onClick={() => handleReject(candidate)}
                                  size="sm"
                                  variant="outline"
                                  className="text-red-600"
                                >
                                  Avvis
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}

                    <div className="pt-2">
                      <Button
                        onClick={() => {
                          setSplitGroupIds(prev => {
                            const newSet = new Set(prev);
                            newSet.delete(group.groupId);
                            return newSet;
                          });
                          setSplitClusters(prev => {
                            const newClusters = { ...prev };
                            delete newClusters[group.groupId];
                            return newClusters;
                          });
                        }}
                        size="sm"
                        variant="ghost"
                        className="text-gray-600"
                      >
                        Angre splitting
                      </Button>
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Ungrouped candidates */}
      {ungrouped.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4 text-gray-900">Individuelle kandidater ({ungrouped.length})</h2>
          <div className="space-y-4">
            {ungrouped.map(candidate => (
              <Card key={candidate.id} className="border-l-4 border-l-green-400">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{candidate.proposedName}</CardTitle>
                      <div className="text-sm text-gray-600 mt-1">
                        {candidate.proposedChain && <span>{candidate.proposedChain} • </span>}
                        <span>{candidate.region}</span>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm font-semibold text-gray-700">Adresse</div>
                      <div className="text-sm">{candidate.address || 'Ingen'}</div>
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-gray-700">Koordinater</div>
                      <div className="text-sm">{candidate.latitude.toFixed(4)}, {candidate.longitude.toFixed(4)}</div>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      onClick={() => handleApprove(candidate)}
                      className="bg-green-600 hover:bg-green-700 flex items-center gap-2"
                    >
                      <Check className="w-4 h-4" />
                      Godkjenn
                    </Button>
                    <Button
                      onClick={() => handleDuplicate(candidate)}
                      variant="outline"
                      className="flex items-center gap-2"
                    >
                      <MapPin className="w-4 h-4" />
                      Duplikat
                    </Button>
                    <Button
                      onClick={() => handleReject(candidate)}
                      variant="outline"
                      className="text-red-600 hover:text-red-700 flex items-center gap-2"
                    >
                      <X className="w-4 h-4" />
                      Avvis
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {groups.length === 0 && ungrouped.length === 0 && (
        <div className="p-6 bg-gray-50 rounded-lg text-center">
          <p className="text-gray-600">Ingen kandidater å gjennomgå</p>
        </div>
      )}
    </div>
  );
}