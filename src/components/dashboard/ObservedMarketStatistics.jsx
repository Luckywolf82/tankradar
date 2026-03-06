import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle } from "lucide-react";

export default function ObservedMarketStatistics({ allPrices, selectedFuel, includeUnconfirmed = false }) {
  const [showBreakdown, setShowBreakdown] = useState(false);

  const stats = useMemo(() => {
    // Filter: realistic prices only
    let filtered = allPrices.filter(p =>
      p.fuelType === selectedFuel &&
      p.plausibilityStatus === "realistic_price"
    );

    // Breakdown by match status
    const matched = filtered.filter(p => p.station_match_status === "matched_station_id");
    const review = filtered.filter(p => p.station_match_status === "review_needed_station_match");
    const noSafe = filtered.filter(p => p.station_match_status === "no_safe_station_match");

    // Apply policy: exclude no_safe by default unless explicitly included
    let displayed = [];
    if (includeUnconfirmed) {
      displayed = filtered;
    } else {
      displayed = [...matched, ...review];
    }

    if (displayed.length === 0) {
      return null;
    }

    const prices = displayed.map(p => p.priceNok).sort((a, b) => a - b);
    const sum = prices.reduce((a, b) => a + b, 0);
    const avg = sum / prices.length;
    const median = prices.length % 2 === 0
      ? (prices[prices.length / 2 - 1] + prices[prices.length / 2]) / 2
      : prices[Math.floor(prices.length / 2)];

    return {
      count: prices.length,
      average: parseFloat(avg.toFixed(2)),
      median: parseFloat(median.toFixed(2)),
      min: parseFloat(prices[0].toFixed(2)),
      max: parseFloat(prices[prices.length - 1].toFixed(2)),
      gap: parseFloat((prices[prices.length - 1] - prices[0]).toFixed(2)),
      breakdown: {
        matched: matched.length,
        review: review.length,
        noSafe: noSafe.length
      }
    };
  }, [allPrices, selectedFuel, includeUnconfirmed]);

  if (!stats) {
    return (
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Observerte markedspriser (brukerrapporter)</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-500 text-center py-4">Ingen observerte brukerprisrapporter ennå</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base">Observerte markedspriser (brukerrapporter)</CardTitle>
            <p className="text-xs text-slate-400 mt-1">
              {stats.count} observasjoner
              {!includeUnconfirmed && stats.breakdown.noSafe > 0 && ` (+${stats.breakdown.noSafe} ubekreftede ikke inkludert)`}
            </p>
          </div>
          <Badge variant="outline" className="ml-2">
            {includeUnconfirmed ? "Alle kilder" : "Verifiserte"}
          </Badge>
        </div>
        {!includeUnconfirmed && (
          <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-900 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>
              Disse prisene er brukerrapporterte observasjoner. Kun stasjoner med sikker matching er inkludert.
            </span>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
            <p className="text-xs text-blue-700 uppercase tracking-wide font-semibold">Gjennomsnitt</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">{stats.average}</p>
            <p className="text-xs text-blue-600 mt-1">kr/l</p>
          </div>
          <div className="bg-indigo-50 rounded-lg p-3 border border-indigo-100">
            <p className="text-xs text-indigo-700 uppercase tracking-wide font-semibold">Median</p>
            <p className="text-2xl font-bold text-indigo-600 mt-1">{stats.median}</p>
            <p className="text-xs text-indigo-600 mt-1">kr/l</p>
          </div>
          <div className="bg-amber-50 rounded-lg p-3 border border-amber-100">
            <p className="text-xs text-amber-700 uppercase tracking-wide font-semibold">Prisgap</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">{stats.gap}</p>
            <p className="text-xs text-amber-600 mt-1">kr/l</p>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-200 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">Billigste</span>
            <span className="font-semibold text-slate-800">{stats.min} kr</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">Dyreste</span>
            <span className="font-semibold text-slate-800">{stats.max} kr</span>
          </div>
        </div>

        {/* Breakdown by confidence */}
        <button
          onClick={() => setShowBreakdown(!showBreakdown)}
          className="w-full mt-4 text-xs font-medium text-slate-600 hover:text-slate-900 py-2 border-t border-slate-200"
        >
          {showBreakdown ? "Skjul" : "Vis"} konfidensfordeling
        </button>

        {showBreakdown && (
          <div className="p-3 bg-slate-50 rounded space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                <span className="text-slate-700">Bekreftet stasjon (0.85 konfidens)</span>
              </div>
              <span className="font-semibold text-slate-900">{stats.breakdown.matched}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
                <span className="text-slate-700">Usikker stasjon (0.50 konfidens)</span>
              </div>
              <span className="font-semibold text-slate-900">{stats.breakdown.review}</span>
            </div>
            {includeUnconfirmed && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                  <span className="text-slate-700">Ukjent stasjon (0.30 konfidens)</span>
                </div>
                <span className="font-semibold text-slate-900">{stats.breakdown.noSafe}</span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}