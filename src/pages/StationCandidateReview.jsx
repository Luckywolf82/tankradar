import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, X, MapPin, AlertCircle, ChevronDown, ChevronUp, Unlink, Zap } from 'lucide-react';
import ReviewConsistencyCheck from '../components/admin/ReviewConsistencyCheck';

export default function StationCandidateReview() {
  const [candidates, setCandidates] = useState([]);
  const [groups, setGroups] = useState([]);
  const [ungrouped, setUngrouped] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedGroupId, setExpandedGroupId] = useState(null);
  const [selectedNames, setSelectedNames] = useState({});
  const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0, duplicate: 0 });
  const [splitGroupIds, setSplitGroupIds] = useState(new Set());
  const [autoProcessing, setAutoProcessing] = useState(false);

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

  const handleSplitGroup = async (groupId) => {
    // Toggle split mode - when split, show candidates individually
    setSplitGroupIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupId)) {
        newSet.delete(groupId);
      } else {
        newSet.add(groupId);
      }
      return newSet;
    });
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

  if (loading) {
    return <div className="p-6">Laster...</div>;
  }

  return (
    <div className="max-w-5xl mx-auto p-6 pb-24">
      <h1 className="text-3xl font-bold mb-6">Station-kandidater fra Google Places</h1>

      {/* Consistency Check */}
      <ReviewConsistencyCheck />

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
                    <div className="text-sm text-gray-600">{group.reason.join(', ')}</div>
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
                        onClick={() => handleSplitGroup(group.groupId)}
                        size="sm"
                        variant="outline"
                        className="text-orange-600 hover:text-orange-700 flex items-center gap-2"
                      >
                        <Unlink className="w-4 h-4" />
                        Splitt gruppe
                      </Button>
                      <div className="text-xs text-gray-600 mt-2">
                        Hvis disse er ulike stasjoner, splitt gruppen for å håndtere dem separat.
                      </div>
                    </div>
                  </CardContent>
                )}

                {/* Split view - show candidates individually */}
                {expandedGroupId === group.groupId && splitGroupIds.has(group.groupId) && (
                  <CardContent className="bg-orange-50 border-t space-y-4 p-4">
                    <div className="bg-orange-100 p-3 rounded border border-orange-300 text-sm text-orange-900">
                      <strong>Gruppe splittet:</strong> Kandidatene behandles nå separat. Velg handling for hver.
                    </div>
                    
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
                          <div className="flex gap-2 flex-wrap">
                            <Button
                              onClick={() => handleApprove(candidate, candidate.proposedName, [])}
                              size="sm"
                              className="bg-green-600 hover:bg-green-700"
                            >
                              Godkjenn (enkelt)
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

                    <div className="pt-2">
                      <Button
                        onClick={() => handleSplitGroup(group.groupId)}
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