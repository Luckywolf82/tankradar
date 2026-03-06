import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * LiveMarketStats Component
 * 
 * Displays verified, current fuel prices from GooglePlaces API
 * filtered by fuel type and plausibility check.
 * 
 * DATA SOURCE: GooglePlaces only (station_level)
 * GRANULARITY: Station-level verified prices
 * UPDATE FREQUENCY: Near-realtime
 * 
 * NOTE: User-reported prices are NOT included in this component.
 * User-reported crowdsourced data is displayed separately in ObservedMarketStatistics.
 * 
 * This component shows only realistic, verified prices from active stations
 * to provide a reliable baseline for market price monitoring.
 */
export default function LiveMarketStats({ observedPrices, selectedFuel }) {
  const stats = useMemo(() => {
    // Filter observed prices (realistic only, GooglePlaces only)
    const filtered = observedPrices.filter(p =>
      p.fuelType === selectedFuel &&
      p.plausibilityStatus === "realistic_price" &&
      p.sourceName === "GooglePlaces"
    );

    if (filtered.length === 0) {
      return null;
    }

    const prices = filtered.map(p => p.priceNok).sort((a, b) => a - b);
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
      gap: parseFloat((prices[prices.length - 1] - prices[0]).toFixed(2))
    };
  }, [observedPrices, selectedFuel]);

  if (!stats) {
    return (
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Live markedspriser</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-500 text-center py-4">Ingen observerte priser ennå</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">Live markedspriser</CardTitle>
        <p className="text-xs text-slate-400">{stats.count} observasjoner fra Google Places</p>
      </CardHeader>
      <CardContent>
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
        <div className="mt-4 pt-4 border-t border-slate-200">
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">Billigste</span>
            <span className="font-semibold text-slate-800">{stats.min} kr</span>
          </div>
          <div className="flex justify-between text-sm mt-2">
            <span className="text-slate-600">Dyreste</span>
            <span className="font-semibold text-slate-800">{stats.max} kr</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}