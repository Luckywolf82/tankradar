import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ScatterChart, Scatter } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, CheckCircle } from "lucide-react";

export default function VerifiedStationStats({ fuelPrices, loading }) {
  // Filter only high-confidence verified matches
  const verifiedPrices = useMemo(() => {
    return fuelPrices.filter(p => 
      p.confidenceScore >= 0.80 && 
      p.stationId && 
      p.priceType === "station_level"
    );
  }, [fuelPrices]);

  // By station summary
  const byStation = useMemo(() => {
    const stations = {};
    verifiedPrices.forEach(p => {
      const key = p.stationId;
      if (!stations[key]) {
        stations[key] = {
          stationId: key,
          prices: [],
          confidence: p.confidenceScore,
          sourceName: p.sourceName,
          locationLabel: p.locationLabel
        };
      }
      stations[key].prices.push(p.priceNok);
    });

    return Object.values(stations)
      .map(s => ({
        ...s,
        avg: parseFloat((s.prices.reduce((a, b) => a + b, 0) / s.prices.length).toFixed(2)),
        count: s.prices.length
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 12);
  }, [verifiedPrices]);

  // Confidence distribution
  const confidenceDistribution = useMemo(() => {
    const distribution = {
      high: { count: 0, label: "High (0.90+)" },
      medium: { count: 0, label: "Medium (0.80-0.89)" }
    };

    verifiedPrices.forEach(p => {
      if (p.confidenceScore >= 0.90) distribution.high.count += 1;
      else if (p.confidenceScore >= 0.80) distribution.medium.count += 1;
    });

    return [
      { category: distribution.high.label, count: distribution.high.count, fill: "#10b981" },
      { category: distribution.medium.label, count: distribution.medium.count, fill: "#3b82f6" }
    ];
  }, [verifiedPrices]);

  // Source breakdown
  const sourceBreakdown = useMemo(() => {
    const sources = {};
    verifiedPrices.forEach(p => {
      if (!sources[p.sourceName]) sources[p.sourceName] = 0;
      sources[p.sourceName] += 1;
    });

    return Object.entries(sources)
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count);
  }, [verifiedPrices]);

  if (loading) {
    return <Skeleton className="h-96 w-full" />;
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-900 flex items-center gap-2">
              <CheckCircle size={16} /> Verifiserte stasjoner
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{byStation.length}</div>
            <p className="text-xs text-green-700 mt-1">Unike stasjoner (high confidence)</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-indigo-900">Verifiserte observasjoner</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-indigo-600">{verifiedPrices.length}</div>
            <p className="text-xs text-indigo-700 mt-1">Prisrader (confidence ≥0.80)</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-slate-50 to-slate-100 border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-900">Gjennomsnittlig sted/stasjon</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-600">
              {byStation.length > 0 ? Math.round(verifiedPrices.length / byStation.length) : 0}
            </div>
            <p className="text-xs text-slate-600 mt-1">Observasjoner per stasjon</p>
          </CardContent>
        </Card>
      </div>

      {/* Confidence Distribution */}
      {confidenceDistribution.some(d => d.count > 0) && (
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Tillitsfordeling</CardTitle>
            <p className="text-xs text-slate-400">High-confidence stasjonsmatcher</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={confidenceDistribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="category" tick={{ fontSize: 11 }} angle={-15} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(value) => `${value} obs.`} />
                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                  {confidenceDistribution.map((entry, index) => (
                    <Bar key={index} dataKey="count" fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Source Breakdown */}
      {sourceBreakdown.length > 0 && (
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Verifisert etter kilde</CardTitle>
            <p className="text-xs text-slate-400">Antall high-confidence observasjoner per datakilde</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {sourceBreakdown.map((item) => (
                <div key={item.source} className="flex justify-between items-center">
                  <span className="text-sm text-slate-700">{item.source}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 h-6 bg-slate-100 rounded" style={{
                      backgroundImage: `linear-gradient(to right, #10b981 ${(item.count / Math.max(...sourceBreakdown.map(s => s.count))) * 100}%, #e5e7eb ${(item.count / Math.max(...sourceBreakdown.map(s => s.count))) * 100}%)`
                    }}></div>
                    <span className="text-sm font-semibold text-slate-800 w-12 text-right">{item.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top stations by observation count */}
      {byStation.length > 0 && (
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Mest observerte stasjoner</CardTitle>
            <p className="text-xs text-slate-400">High-confidence matches ordnet etter antall observasjoner</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {byStation.map((station, idx) => (
                <div key={idx} className="flex justify-between items-center p-2 bg-slate-50 rounded text-sm">
                  <div className="flex-1">
                    <div className="font-medium text-slate-800">{idx + 1}. {station.locationLabel || station.stationId}</div>
                    <div className="text-xs text-slate-500">{station.sourceName}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-slate-800">{station.avg} kr</div>
                    <div className="text-xs text-slate-500">{station.count} obs. · {(station.confidence * 100).toFixed(0)}%</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {verifiedPrices.length === 0 && (
        <Card className="shadow-sm border-amber-200 bg-amber-50">
          <CardContent className="h-40 flex flex-col items-center justify-center">
            <AlertCircle size={32} className="text-amber-600 mb-2" />
            <p className="text-slate-600 text-center">Ingen high-confidence stasjonsobservasjoner ennå.</p>
            <p className="text-xs text-slate-500 text-center mt-2">Trenger minst confidenceScore ≥0.80 og stationId</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}