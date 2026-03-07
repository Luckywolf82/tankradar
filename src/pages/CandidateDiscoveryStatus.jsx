import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { AlertCircle, CheckCircle, Info } from 'lucide-react';

export default function CandidateDiscoveryStatus() {
  const [stats, setStats] = useState(null);
  const [groupData, setGroupData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    try {
      // Get candidate stats
      const allCandidates = await base44.entities.StationCandidate.list();
      const pendingCandidates = allCandidates.filter(c => c.status === 'pending');

      setStats({
        total: allCandidates.length,
        pending: pendingCandidates.length,
        approved: allCandidates.filter(c => c.status === 'approved').length,
        rejected: allCandidates.filter(c => c.status === 'rejected').length,
        duplicate: allCandidates.filter(c => c.status === 'duplicate').length,
      });

      // Get grouping data
      const groupRes = await base44.functions.invoke('groupStationCandidates');
      setGroupData(groupRes.data);
    } catch (error) {
      console.error('Failed to load status:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-6">Laster...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-6 pb-24">
      <h1 className="text-3xl font-bold mb-6">Kandidat-oppdagerstatus</h1>

      {/* Overall stats */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Totalt kandidater</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Venter på gjennomgang</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Godkjente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{stats.approved}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Markert som duplikat</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-600">{stats.duplicate}</div>
          </CardContent>
        </Card>
      </div>

      {/* Grouping insights */}
      {groupData && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="w-5 h-5" />
              Grouping-analyse
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 p-4 rounded">
                <div className="text-sm font-semibold text-blue-900">Grupperte kandidater</div>
                <div className="text-2xl font-bold text-blue-600">{groupData.groupedCount}</div>
                <div className="text-xs text-blue-700 mt-1">{groupData.groups.length} grupper funnet</div>
              </div>
              <div className="bg-green-50 p-4 rounded">
                <div className="text-sm font-semibold text-green-900">Individuelle kandidater</div>
                <div className="text-2xl font-bold text-green-600">{groupData.ungroupedCount}</div>
                <div className="text-xs text-green-700 mt-1">Ikke matchet med andre</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="border rounded p-3">
                <div className="text-sm font-semibold">Duplikat-grupper</div>
                <div className="text-lg font-bold text-orange-600">{groupData.summary.duplicateGroups}</div>
                <div className="text-xs text-gray-600 mt-1">Samme sourceStationId, samme sted</div>
              </div>
              <div className="border rounded p-3">
                <div className="text-sm font-semibold">Samme-sted-grupper</div>
                <div className="text-lg font-bold text-purple-600">{groupData.summary.sameLocationGroups}</div>
                <div className="text-xs text-gray-600 mt-1">Samme fysiske lokasjon, ulike navn</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* System flow documentation */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            Systemflyt
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="bg-blue-50 border-l-4 border-blue-400 p-3 rounded">
            <div className="font-semibold text-sm">1. Discovery (deduplisering)</div>
            <div className="text-sm text-gray-700 mt-1">
              Hver Google Places-søk sjekker mot eksisterende StationCandidate-er (sourceStationId).
              Hvis samme kandidat finnes allerede, hoppes den over.
            </div>
          </div>

          <div className="bg-purple-50 border-l-4 border-purple-400 p-3 rounded">
            <div className="font-semibold text-sm">2. Grouping (identifisering)</div>
            <div className="text-sm text-gray-700 mt-1">
              Systemet grupperer kandidater basert på:
              <ul className="mt-1 ml-4 space-y-1">
                <li>• &lt;50m distance + samme sourceStationId = duplikat</li>
                <li>• &lt;200m + tilsvarende adresse = samme sted</li>
                <li>• &lt;500m + svært lik navn (90%+) = samme sted</li>
                <li>• Samme kjede + lik navn + &lt;300m = samme sted</li>
              </ul>
            </div>
          </div>

          <div className="bg-green-50 border-l-4 border-green-400 p-3 rounded">
            <div className="font-semibold text-sm">3. Review (navn-valg)</div>
            <div className="text-sm text-gray-700 mt-1">
              For grupperte kandidater kan admin velge hovednavn før godkjenning.
              Systemet støtter senere prisinnmeldinger som signal for stasjonbekreftelse.
            </div>
          </div>

          <div className="bg-orange-50 border-l-4 border-orange-400 p-3 rounded">
            <div className="font-semibold text-sm">4. Cleanup (trygg deduplisering)</div>
            <div className="text-sm text-gray-700 mt-1">
              Duplikater kan merkes (non-destructive) eller slettes. 
              Cleanup-funksjonen krever eksplisitt admin-handling.
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-2">
        <Link to={createPageUrl('DiscoverStations')} className="inline-block">
          <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            Kjør discovery
          </button>
        </Link>
        <Link to={createPageUrl('StationCandidateReview')} className="inline-block">
          <button className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
            Gå til gjennomgang
          </button>
        </Link>
      </div>

      {/* Notes */}
      <Card className="mt-8 bg-gray-50">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            Viktig informasjon
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-gray-700 space-y-2">
          <p>
            <strong>Deduplisering:</strong> Samme Google Places-kandidat vil aldri legges inn to ganger.
          </p>
          <p>
            <strong>Gruppering:</strong> Kandidater gruppert basert på koordinater, adresse og navn — ikke på filtrering av kvalitet.
            Alle relevante kandidater kommer inn.
          </p>
          <p>
            <strong>Navnvalg:</strong> Admin kan velge hvilket navn som skal brukes når samme branding/sted har flere navn.
          </p>
          <p>
            <strong>Fremtidig:</strong> Prisinnmeldinger kan senere brukes som signal for å styrke bekreftelse av stasjoner.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}