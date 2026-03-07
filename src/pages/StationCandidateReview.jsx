import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, X, MapPin, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';

export default function StationCandidateReview() {
  const [candidates, setCandidates] = useState([]);
  const [groups, setGroups] = useState([]);
  const [ungrouped, setUngrouped] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedGroupId, setExpandedGroupId] = useState(null);
  const [selectedNames, setSelectedNames] = useState({});
  const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0, duplicate: 0 });

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
    } catch (error) {
      console.error('Failed to load candidates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (candidate, overrideName = null) => {
    try {
      const finalName = overrideName || candidate.proposedName;
      
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

  const pending = candidates.filter(c => c.status === 'pending');

  if (loading) {
    return <div className="p-6">Laster...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-6 pb-24">
      <h1 className="text-3xl font-bold mb-6">Station-kandidater fra Google Places</h1>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-3xl font-bold text-yellow-600">{stats.pending}</div>
            <div className="text-sm text-gray-600">Venter på gjennomgang</div>
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

      {/* Pending candidates */}
      <div className="space-y-4">
        {pending.length === 0 ? (
          <div className="p-6 bg-gray-50 rounded-lg text-center">
            <p className="text-gray-600">Ingen kandidater å gjennomgå</p>
          </div>
        ) : (
          pending.map(candidate => (
            <Card key={candidate.id} className="border-l-4 border-l-yellow-400">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{candidate.proposedName}</CardTitle>
                    <div className="text-sm text-gray-600 mt-1">
                      {candidate.proposedChain && <span>{candidate.proposedChain} • </span>}
                      <span>{candidate.region}</span>
                    </div>
                  </div>
                  {candidate.matchConfidence > 0 && (
                    <div className="bg-orange-50 px-3 py-1 rounded text-sm">
                      Match: {(candidate.matchConfidence * 100).toFixed(0)}%
                    </div>
                  )}
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

                {candidate.matchCandidates.length > 0 && (
                  <div className="bg-orange-50 p-3 rounded border border-orange-200">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-orange-600" />
                      <div className="text-sm">
                        <strong>Mulig duplikat:</strong> {candidate.matchCandidates.length} stasjon(er) i nærheten
                      </div>
                    </div>
                  </div>
                )}

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
          ))
        )}
      </div>
    </div>
  );
}