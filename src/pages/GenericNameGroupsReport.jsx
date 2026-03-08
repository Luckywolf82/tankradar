import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp, MapPin, AlertTriangle, CheckCircle } from 'lucide-react';

export default function GenericNameGroupsReport() {
  const [groups, setGroups] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expandedPrefix, setExpandedPrefix] = useState(null);
  const [expandedCluster, setExpandedCluster] = useState(null);
  const [radiusKm, setRadiusKm] = useState(1.0);

  const runReport = async () => {
    setLoading(true);
    setGroups([]);
    setSummary(null);
    try {
      const res = await base44.functions.invoke('groupGenericNameStations', { radiusKm });
      setGroups(res.data.groups || []);
      setSummary(res.data.summary);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const clusterKey = (prefixIdx, clusterIdx) => `${prefixIdx}-${clusterIdx}`;

  return (
    <div className="max-w-4xl mx-auto p-6 pb-24">
      <h1 className="text-2xl font-bold mb-2">Generiske navn — grupperingsrapport</h1>
      <p className="text-gray-600 mb-6 text-sm">
        Stasjoner med generiske navn (Tanken, Matkroken, Joker osv.) gruppert etter navneprefix og geografisk nærhet.
        Clusters innen valgt radius vurderes som mulige duplikater.
      </p>

      {/* Innstillinger */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Duplikat-radius (km):</label>
          <select
            value={radiusKm}
            onChange={e => setRadiusKm(parseFloat(e.target.value))}
            className="border rounded px-2 py-1 text-sm"
          >
            <option value={0.3}>0.3 km</option>
            <option value={0.5}>0.5 km</option>
            <option value={1.0}>1.0 km</option>
            <option value={2.0}>2.0 km</option>
            <option value={5.0}>5.0 km</option>
          </select>
        </div>
        <Button onClick={runReport} disabled={loading} className="bg-violet-600 hover:bg-violet-700">
          {loading ? 'Analyserer...' : 'Kjør analyse'}
        </Button>
      </div>

      {/* Oppsummering */}
      {summary && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="pt-4 text-center">
              <div className="text-3xl font-bold text-violet-600">{summary.totalGenericStations}</div>
              <div className="text-xs text-gray-600">Generiske stasjoner totalt</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <div className="text-3xl font-bold text-blue-600">{summary.totalPrefixGroups}</div>
              <div className="text-xs text-gray-600">Unike navnegrupper</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <div className="text-3xl font-bold text-red-500">{summary.totalLikelyDuplicateClusters}</div>
              <div className="text-xs text-gray-600">Sannsynlige duplikat-clusters</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Gruppevisning */}
      <div className="space-y-3">
        {groups.map((group, prefixIdx) => (
          <Card key={group.prefix} className="border-l-4 border-l-violet-400">
            <button
              onClick={() => setExpandedPrefix(expandedPrefix === prefixIdx ? null : prefixIdx)}
              className="w-full p-4 flex justify-between items-center hover:bg-gray-50 text-left"
            >
              <div className="flex items-center gap-3">
                <span className="font-semibold capitalize">{group.prefix}</span>
                <Badge variant="secondary">{group.totalStations} stasjoner</Badge>
                <Badge variant="outline">{group.totalClusters} locations</Badge>
                {group.likelyDuplicateClusters > 0 && (
                  <Badge className="bg-red-100 text-red-700">
                    {group.likelyDuplicateClusters} duplikat
                  </Badge>
                )}
                {group.possibleDuplicateClusters > 0 && (
                  <Badge className="bg-yellow-100 text-yellow-700">
                    {group.possibleDuplicateClusters} mulig
                  </Badge>
                )}
              </div>
              {expandedPrefix === prefixIdx ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {expandedPrefix === prefixIdx && (
              <CardContent className="border-t bg-gray-50 p-4 space-y-2">
                {group.clusters.map((cluster, clusterIdx) => {
                  const key = clusterKey(prefixIdx, clusterIdx);
                  const isExpanded = expandedCluster === key;

                  return (
                    <div
                      key={clusterIdx}
                      className={`rounded border bg-white ${
                        cluster.likelyDuplicate
                          ? 'border-red-200'
                          : cluster.possibleDuplicate
                          ? 'border-yellow-200'
                          : 'border-gray-200'
                      }`}
                    >
                      <button
                        onClick={() => setExpandedCluster(isExpanded ? null : key)}
                        className="w-full p-3 flex justify-between items-center hover:bg-gray-50 text-left"
                      >
                        <div className="flex items-center gap-2 flex-wrap">
                          {cluster.likelyDuplicate ? (
                            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                          ) : cluster.possibleDuplicate ? (
                            <AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0" />
                          ) : (
                            <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                          )}
                          <span className="text-sm font-medium">
                            {cluster.names.join(' / ')}
                          </span>
                          {cluster.cities.length > 0 && (
                            <span className="text-xs text-gray-500 flex items-center gap-1">
                              <MapPin className="w-3 h-3" />{cluster.cities.join(', ')}
                            </span>
                          )}
                          <Badge variant="outline" className="text-xs">{cluster.stations.length} stk</Badge>
                          {cluster.likelyDuplicate && (
                            <Badge className="bg-red-100 text-red-700 text-xs">Trolig duplikat</Badge>
                          )}
                          {cluster.possibleDuplicate && !cluster.likelyDuplicate && (
                            <Badge className="bg-yellow-100 text-yellow-700 text-xs">Samme lokasjon</Badge>
                          )}
                        </div>
                        {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>

                      {isExpanded && (
                        <div className="border-t p-3 space-y-2 bg-gray-50">
                          {cluster.stations.map(s => (
                            <div key={s.id} className="bg-white rounded border p-2 text-sm">
                              <div className="font-medium">{s.name}</div>
                              <div className="text-gray-500 text-xs mt-0.5 space-y-0.5">
                                {s.chain && <div>Kjede: {s.chain}</div>}
                                {s.city && <div>By: {s.city}{s.areaLabel ? ` / ${s.areaLabel}` : ''}</div>}
                                {s.address && <div>Adresse: {s.address}</div>}
                                {s.latitude && (
                                  <div>
                                    GPS: {s.latitude.toFixed(5)}, {s.longitude.toFixed(5)}
                                  </div>
                                )}
                                <div>Type: {s.stationType}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      {groups.length === 0 && !loading && summary && (
        <p className="text-gray-500 text-center py-8">Ingen generiske grupper funnet.</p>
      )}
    </div>
  );
}