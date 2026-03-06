import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle, AlertCircle, XCircle } from 'lucide-react';

export default function UserReportedScanOperations() {
  const [stats, setStats] = useState({
    totalScans: 0,
    matched: 0,
    reviewNeeded: 0,
    noSafe: 0,
    matchedPct: 0,
    reviewPct: 0,
    noSafePct: 0,
  });
  const [fuelPrices, setFuelPrices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const prices = await base44.entities.FuelPrice.filter({ priceType: 'user_reported' });
        setFuelPrices(prices);
        
        const total = prices.length;
        const m = prices.filter(p => p.station_match_status === 'matched_station_id').length;
        const r = prices.filter(p => p.station_match_status === 'review_needed_station_match').length;
        const n = prices.filter(p => p.station_match_status === 'no_safe_station_match').length;

        setStats({
          totalScans: total,
          matched: m,
          reviewNeeded: r,
          noSafe: n,
          matchedPct: total ? Math.round((m / total) * 100) : 0,
          reviewPct: total ? Math.round((r / total) * 100) : 0,
          noSafePct: total ? Math.round((n / total) * 100) : 0,
        });
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const statusConfig = {
    matched_station_id: {
      icon: <CheckCircle className="w-5 h-5 text-green-600" />,
      label: 'Matched',
      color: 'bg-green-50',
      border: 'border-green-200',
    },
    review_needed_station_match: {
      icon: <AlertCircle className="w-5 h-5 text-amber-600" />,
      label: 'Review Needed',
      color: 'bg-amber-50',
      border: 'border-amber-200',
    },
    no_safe_station_match: {
      icon: <XCircle className="w-5 h-5 text-red-600" />,
      label: 'No Safe Match',
      color: 'bg-red-50',
      border: 'border-red-200',
    },
  };

  if (loading) {
    return <div className="p-6 text-center text-gray-500">Laster data...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">User Reported Scan Operations</h1>
        <p className="text-slate-600">Driftsoversikt for scan-priser fra bruker</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Total Scans</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">{stats.totalScans}</div>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-900 flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Matched
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-700">{stats.matched}</div>
            <p className="text-xs text-green-600 mt-1">{stats.matchedPct}%</p>
          </CardContent>
        </Card>

        <Card className="border-amber-200 bg-amber-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-amber-900 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Review Needed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-700">{stats.reviewNeeded}</div>
            <p className="text-xs text-amber-600 mt-1">{stats.reviewPct}%</p>
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-red-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-900 flex items-center gap-2">
              <XCircle className="w-4 h-4" />
              No Safe Match
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-700">{stats.noSafe}</div>
            <p className="text-xs text-red-600 mt-1">{stats.noSafePct}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Details by Status */}
      <Tabs defaultValue="matched" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="matched">Matched ({stats.matched})</TabsTrigger>
          <TabsTrigger value="review">Review Needed ({stats.reviewNeeded})</TabsTrigger>
          <TabsTrigger value="nosafe">No Safe ({stats.noSafe})</TabsTrigger>
        </TabsList>

        <TabsContent value="matched">
          <Card>
            <CardHeader>
              <CardTitle>Auto-Matched Scans</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {fuelPrices
                  .filter(p => p.station_match_status === 'matched_station_id')
                  .map(price => (
                    <div key={price.id} className="p-3 border border-green-200 rounded-lg bg-green-50">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-slate-900">{price.station_name}</p>
                          <div className="flex gap-2 mt-1">
                            <Badge variant="outline">{price.fuelType}</Badge>
                            <Badge variant="outline">{price.priceNok} NOK/L</Badge>
                            <Badge variant="outline">{price.station_chain}</Badge>
                          </div>
                          <p className="text-xs text-slate-600 mt-2">{price.station_match_notes}</p>
                        </div>
                        <CheckCircle className="w-5 h-5 text-green-600 mt-1" />
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="review">
          <Card>
            <CardHeader>
              <CardTitle>Manual Review Required</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {fuelPrices
                  .filter(p => p.station_match_status === 'review_needed_station_match')
                  .map(price => (
                    <div key={price.id} className="p-3 border border-amber-200 rounded-lg bg-amber-50">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-slate-900">{price.station_name}</p>
                          <div className="flex gap-2 mt-1">
                            <Badge variant="outline">{price.fuelType}</Badge>
                            <Badge variant="outline">{price.priceNok} NOK/L</Badge>
                            <Badge variant="outline">{price.station_chain}</Badge>
                          </div>
                          <p className="text-xs text-slate-600 mt-2">{price.station_match_notes}</p>
                          {price.station_match_candidates?.length > 0 && (
                            <div className="mt-2 text-xs">
                              <p className="font-medium">Candidates: {price.station_match_candidates.length}</p>
                              <p className="text-slate-500">{price.station_match_candidates.join(', ')}</p>
                            </div>
                          )}
                        </div>
                        <AlertCircle className="w-5 h-5 text-amber-600 mt-1" />
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="nosafe">
          <Card>
            <CardHeader>
              <CardTitle>No Safe Match</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {fuelPrices
                  .filter(p => p.station_match_status === 'no_safe_station_match')
                  .map(price => (
                    <div key={price.id} className="p-3 border border-red-200 rounded-lg bg-red-50">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-slate-900">{price.station_name}</p>
                          <div className="flex gap-2 mt-1">
                            <Badge variant="outline">{price.fuelType}</Badge>
                            <Badge variant="outline">{price.priceNok} NOK/L</Badge>
                            <Badge variant="outline">{price.station_chain}</Badge>
                          </div>
                          <p className="text-xs text-slate-600 mt-2">{price.station_match_notes}</p>
                        </div>
                        <XCircle className="w-5 h-5 text-red-600 mt-1" />
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Metadata Reference */}
      <Card className="border-slate-200 bg-slate-50">
        <CardHeader>
          <CardTitle className="text-base">Mandatory Metadata Per user_reported Scan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <p className="font-medium text-slate-900">Always Present:</p>
            <ul className="list-disc list-inside text-slate-600 space-y-1 mt-1">
              <li><code>sourceName = "user_reported"</code></li>
              <li><code>priceType = "user_reported"</code></li>
              <li><code>fetchedAt</code> (timestamp)</li>
              <li><code>plausibilityStatus</code> (realistic_price, suspect_low, suspect_high)</li>
              <li><code>locationLabel</code> (city or region)</li>
            </ul>
          </div>

          <div>
            <p className="font-medium text-slate-900">Station Match Metadata:</p>
            <ul className="list-disc list-inside text-slate-600 space-y-1 mt-1">
              <li><code>station_match_status</code> (matched_station_id | review_needed | no_safe)</li>
              <li><code>stationId</code> (if matched_station_id or auto-assigned)</li>
              <li><code>station_match_candidates</code> (array, if review_needed)</li>
              <li><code>station_match_notes</code> (reasoning)</li>
              <li><code>station_name</code> (from scan)</li>
              <li><code>station_chain</code> (from scan)</li>
            </ul>
          </div>

          <div>
            <p className="font-medium text-slate-900">Reference Metadata:</p>
            <ul className="list-disc list-inside text-slate-600 space-y-1 mt-1">
              <li><code>confidenceScore = 1.0</code> (user assertion)</li>
              <li><code>sourceFrequency = "unknown"</code></li>
              <li><code>parserVersion = "user_reported_v1"</code></li>
              <li><code>rawPayloadSnippet</code> (optional debug info)</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Dashboard Integration Guide */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-base text-blue-900">Dashboard Integration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-blue-900">
          <div>
            <p className="font-medium">matched_station_id:</p>
            <p>Treat as confirmed station-level price. Include in regional/city statistics. Mark as user-contributed source.</p>
          </div>
          <div>
            <p className="font-medium">review_needed_station_match:</p>
            <p>Do NOT include in primary statistics. Flag for manual curation team. Store as separate "pending" dataset.</p>
          </div>
          <div>
            <p className="font-medium">no_safe_station_match:</p>
            <p>Do NOT include in any statistics. Log in audit trail. May use for new station discovery (requires manual approval).</p>
          </div>
        </CardContent>
      </Card>

      {/* Matching Thresholds Reference */}
      <Card className="border-slate-300">
        <CardHeader>
          <CardTitle className="text-base">Matching Thresholds (LOCKED)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm font-mono">
          <div className="p-2 bg-gray-100 rounded">SCORE_MATCHED = 65 (requires high confidence)</div>
          <div className="p-2 bg-gray-100 rounded">SCORE_REVIEW_THRESHOLD = 35 (requires some signal)</div>
          <div className="p-2 bg-gray-100 rounded">score &lt; 35 → no_safe_station_match</div>
          <div className="p-2 bg-gray-100 rounded">35 ≤ score &lt; 65 → review_needed_station_match</div>
          <div className="p-2 bg-gray-100 rounded">score ≥ 65 → matched_station_id</div>
        </CardContent>
      </Card>
    </div>
  );
}