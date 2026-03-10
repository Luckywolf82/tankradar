import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Database, Zap, CheckCircle2, AlertCircle, Archive, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function SystemHealthPanel() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalStations: 0,
    totalFuelPrices: 0,
    sourceCount: {},
    matchingStatus: { matched: 0, review_needed: 0, no_safe_match: 0 },
    stationCandidates: { pending: 0, approved: 0, rejected: 0, duplicate: 0 },
    mergeHistoryCount: 0,
    duplicateSignalsCount: 0,
  });

  useEffect(() => {
    const loadStats = async () => {
      try {
        setLoading(true);
        
        // Fetch all entities in parallel
        const [stations, prices, candidates, reviews, mergeLog] = await Promise.all([
          base44.entities.Station.list(),
          base44.entities.FuelPrice.list(),
          base44.entities.StationCandidate.list(),
          base44.entities.StationReview.list(),
          base44.entities.StationMergeLog.list(),
        ]);

        // Count sources from fuel prices
        const sourceCount = {};
        prices.forEach(price => {
          sourceCount[price.sourceName] = (sourceCount[price.sourceName] || 0) + 1;
        });

        // Count matching outcomes
        const matchingStatus = { matched: 0, review_needed: 0, no_safe_match: 0 };
        prices.forEach(price => {
          if (price.station_match_status === "matched_station_id") {
            matchingStatus.matched++;
          } else if (price.station_match_status === "review_needed_station_match") {
            matchingStatus.review_needed++;
          } else if (price.station_match_status === "no_safe_station_match") {
            matchingStatus.no_safe_match++;
          }
        });

        // Count station candidates by status
        const stationCandidates = { pending: 0, approved: 0, rejected: 0, duplicate: 0 };
        candidates.forEach(c => {
          if (c.status === "pending") stationCandidates.pending++;
          else if (c.status === "approved") stationCandidates.approved++;
          else if (c.status === "rejected") stationCandidates.rejected++;
          else if (c.status === "duplicate") stationCandidates.duplicate++;
        });

        // Count duplicate signals
        const duplicateSignalsCount = reviews.filter(r => r.review_type === "legacy_duplicate" || r.review_type === "duplicate_candidate").length;

        setStats({
          totalStations: stations.length,
          totalFuelPrices: prices.length,
          sourceCount,
          matchingStatus,
          stationCandidates,
          mergeHistoryCount: mergeLog.length,
          duplicateSignalsCount,
        });
      } catch (err) {
        console.error("Failed to load system health stats:", err);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, []);

  if (loading) {
    return (
      <div className="w-full p-6 flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={24} className="animate-spin text-slate-400 mx-auto mb-2" />
          <p className="text-xs text-slate-500">Loading system health…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* System Health Header */}
      <Card className="bg-gradient-to-r from-slate-50 to-slate-100 border border-slate-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2 text-slate-800">
            <Activity size={18} className="text-slate-600" />
            System Health Dashboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-slate-600">
            Overall health and metrics for TankRadar system. All data is read-only.
          </p>
        </CardContent>
      </Card>

      {/* Stations Section */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <Database size={14} className="text-blue-600" />
            Stations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-4">
            <div>
              <p className="text-xs text-slate-500 mb-1">Total Stations</p>
              <p className="text-2xl font-bold text-slate-900">{stats.totalStations}</p>
            </div>
            <div className="text-xs text-slate-400">
              canonical records in database
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Fuel Prices Section */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <Zap size={14} className="text-amber-600" />
            Fuel Prices
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-4">
            <div>
              <p className="text-xs text-slate-500 mb-1">Total FuelPrice Records</p>
              <p className="text-2xl font-bold text-slate-900">{stats.totalFuelPrices}</p>
            </div>
            <div className="text-xs text-slate-400">
              price observations stored
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sources Section */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-slate-700">Data Sources</CardTitle>
        </CardHeader>
        <CardContent>
          {Object.keys(stats.sourceCount).length === 0 ? (
            <p className="text-xs text-slate-500">No sources have data yet.</p>
          ) : (
            <div className="space-y-2">
              {Object.entries(stats.sourceCount)
                .sort((a, b) => b[1] - a[1])
                .map(([source, count]) => (
                  <div key={source} className="flex justify-between items-center text-xs">
                    <span className="text-slate-600">{source}</span>
                    <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded font-mono">
                      {count}
                    </span>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Matching Pipeline Section */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-slate-700">Matching Pipeline Outcomes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-green-50 border border-green-200 rounded p-3 text-center">
              <p className="text-2xl font-bold text-green-700">{stats.matchingStatus.matched}</p>
              <p className="text-xs text-green-600 mt-1">Matched</p>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded p-3 text-center">
              <p className="text-2xl font-bold text-amber-700">{stats.matchingStatus.review_needed}</p>
              <p className="text-xs text-amber-600 mt-1">Review Needed</p>
            </div>
            <div className="bg-red-50 border border-red-200 rounded p-3 text-center">
              <p className="text-2xl font-bold text-red-700">{stats.matchingStatus.no_safe_match}</p>
              <p className="text-xs text-red-600 mt-1">No Safe Match</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Station Candidates Section */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-slate-700">Station Candidates</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="bg-slate-50 border border-slate-200 rounded p-3 text-center">
              <p className="text-xl font-bold text-slate-700">{stats.stationCandidates.pending}</p>
              <p className="text-xs text-slate-600 mt-1">Pending</p>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded p-3 text-center">
              <p className="text-xl font-bold text-slate-700">{stats.stationCandidates.approved}</p>
              <p className="text-xs text-slate-600 mt-1">Approved</p>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded p-3 text-center">
              <p className="text-xl font-bold text-slate-700">{stats.stationCandidates.rejected}</p>
              <p className="text-xs text-slate-600 mt-1">Rejected</p>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded p-3 text-center">
              <p className="text-xl font-bold text-slate-700">{stats.stationCandidates.duplicate}</p>
              <p className="text-xs text-slate-600 mt-1">Duplicate</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Merge History Section */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <Archive size={14} className="text-purple-600" />
            Merge History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-4">
            <div>
              <p className="text-xs text-slate-500 mb-1">Executed Merges</p>
              <p className="text-2xl font-bold text-slate-900">{stats.mergeHistoryCount}</p>
            </div>
            <div className="text-xs text-slate-400">
              merge operations in audit log
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Duplicate Signals Section */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <AlertCircle size={14} className="text-orange-600" />
            Duplicate Signals
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-4">
            <div>
              <p className="text-xs text-slate-500 mb-1">Stations Flagged</p>
              <p className="text-2xl font-bold text-slate-900">{stats.duplicateSignalsCount}</p>
            </div>
            <div className="text-xs text-slate-400">
              potential duplicates detected
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}