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
        const [stations, prices, candidates, reviews, mergeLog] = await Promise.all([
          base44.entities.Station.list(),
          base44.entities.FuelPrice.list(),
          base44.entities.StationCandidate.list(),
          base44.entities.StationReview.list(),
          base44.entities.StationMergeLog.list(),
        ]);

        const sourceCount = {};
        prices.forEach(price => {
          sourceCount[price.sourceName] = (sourceCount[price.sourceName] || 0) + 1;
        });

        const matchingStatus = { matched: 0, review_needed: 0, no_safe_match: 0 };
        prices.forEach(price => {
          if (price.station_match_status === "matched_station_id") matchingStatus.matched++;
          else if (price.station_match_status === "review_needed_station_match") matchingStatus.review_needed++;
          else if (price.station_match_status === "no_safe_station_match") matchingStatus.no_safe_match++;
        });

        const stationCandidates = { pending: 0, approved: 0, rejected: 0, duplicate: 0 };
        candidates.forEach(c => {
          if (c.status === "pending") stationCandidates.pending++;
          else if (c.status === "approved") stationCandidates.approved++;
          else if (c.status === "rejected") stationCandidates.rejected++;
          else if (c.status === "duplicate") stationCandidates.duplicate++;
        });

        const duplicateSignalsCount = reviews.filter(r =>
          r.review_type === "legacy_duplicate" || r.review_type === "duplicate_candidate"
        ).length;

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
        console.error("Klarte ikke å laste systemhelsedata:", err);
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
          <p className="text-xs text-slate-500">Laster systemhelse...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="bg-gradient-to-r from-slate-50 to-slate-100 border border-slate-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2 text-slate-800">
            <Activity size={18} className="text-slate-600" />
            Systemhelse
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-slate-600">
            Overordnede nøkkeltall for TankRadar-systemet. Alle data er kun lesbare.
          </p>
        </CardContent>
      </Card>

      {/* Stasjoner */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <Database size={14} className="text-blue-600" />
            Stasjoner
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-4">
            <div>
              <p className="text-xs text-slate-500 mb-1">Totalt antall stasjoner</p>
              <p className="text-2xl font-bold text-slate-900">{stats.totalStations}</p>
            </div>
            <div className="text-xs text-slate-400">kanoniske poster i databasen</div>
          </div>
        </CardContent>
      </Card>

      {/* Drivstoffpriser */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <Zap size={14} className="text-amber-600" />
            Drivstoffpriser
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-4">
            <div>
              <p className="text-xs text-slate-500 mb-1">Totale FuelPrice-poster</p>
              <p className="text-2xl font-bold text-slate-900">{stats.totalFuelPrices}</p>
            </div>
            <div className="text-xs text-slate-400">prisobservasjoner lagret</div>
          </div>
        </CardContent>
      </Card>

      {/* Datakilder */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-slate-700">Datakilder</CardTitle>
        </CardHeader>
        <CardContent>
          {Object.keys(stats.sourceCount).length === 0 ? (
            <p className="text-xs text-slate-500">Ingen kilder har data ennå.</p>
          ) : (
            <div className="space-y-2">
              {Object.entries(stats.sourceCount)
                .sort((a, b) => b[1] - a[1])
                .map(([source, count]) => (
                  <div key={source} className="flex justify-between items-center text-xs">
                    <span className="text-slate-600">{source}</span>
                    <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded font-mono">{count}</span>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Matching-pipeline */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-slate-700">Matching-pipeline-utfall</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-green-50 border border-green-200 rounded p-3 text-center">
              <p className="text-2xl font-bold text-green-700">{stats.matchingStatus.matched}</p>
              <p className="text-xs text-green-600 mt-1">Matchet</p>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded p-3 text-center">
              <p className="text-2xl font-bold text-amber-700">{stats.matchingStatus.review_needed}</p>
              <p className="text-xs text-amber-600 mt-1">Trenger review</p>
            </div>
            <div className="bg-red-50 border border-red-200 rounded p-3 text-center">
              <p className="text-2xl font-bold text-red-700">{stats.matchingStatus.no_safe_match}</p>
              <p className="text-xs text-red-600 mt-1">Ingen trygg match</p>
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            Hva betyr dette? «Matchet» = automatisk koblet til stasjon. «Trenger review» = for usikker for automatisk avgjørelse. «Ingen trygg match» = kunne ikke kobles.
          </p>
        </CardContent>
      </Card>

      {/* Stasjonskandidater */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-slate-700">Stasjonskandidater</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="bg-slate-50 border border-slate-200 rounded p-3 text-center">
              <p className="text-xl font-bold text-slate-700">{stats.stationCandidates.pending}</p>
              <p className="text-xs text-slate-600 mt-1">Ventende</p>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded p-3 text-center">
              <p className="text-xl font-bold text-slate-700">{stats.stationCandidates.approved}</p>
              <p className="text-xs text-slate-600 mt-1">Godkjent</p>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded p-3 text-center">
              <p className="text-xl font-bold text-slate-700">{stats.stationCandidates.rejected}</p>
              <p className="text-xs text-slate-600 mt-1">Avvist</p>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded p-3 text-center">
              <p className="text-xl font-bold text-slate-700">{stats.stationCandidates.duplicate}</p>
              <p className="text-xs text-slate-600 mt-1">Duplikat</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sammenslåingshistorikk */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <Archive size={14} className="text-purple-600" />
            Sammenslåingshistorikk
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-4">
            <div>
              <p className="text-xs text-slate-500 mb-1">Utførte sammenslåinger</p>
              <p className="text-2xl font-bold text-slate-900">{stats.mergeHistoryCount}</p>
            </div>
            <div className="text-xs text-slate-400">sammenslåingsoperasjoner i revisjonsloggen</div>
          </div>
        </CardContent>
      </Card>

      {/* Duplikatsignaler */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <AlertCircle size={14} className="text-orange-600" />
            Duplikatsignaler
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-4">
            <div>
              <p className="text-xs text-slate-500 mb-1">Stasjoner flagget</p>
              <p className="text-2xl font-bold text-slate-900">{stats.duplicateSignalsCount}</p>
            </div>
            <div className="text-xs text-slate-400">mulige duplikater oppdaget</div>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            Anbefalt neste handling: Kjør duplikatskann under «Duplikater og deduplisering»-fanen.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}