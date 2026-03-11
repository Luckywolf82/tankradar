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
        <div className="flex items-end gap-6 mb-4">
          <div>
            <p className="text-xs text-slate-500">Snitt</p>
            <p className="text-2xl font-bold text-slate-800">{stats.average} <span className="text-sm font-normal text-slate-500">kr/l</span></p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Median</p>
            <p className="text-xl font-semibold text-slate-600">{stats.median} <span className="text-sm font-normal text-slate-400">kr/l</span></p>
          </div>
        </div>
        <div className="border-t border-slate-100 pt-3 space-y-1.5">
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Billigste</span>
            <span className="font-semibold text-green-700">{stats.min} kr</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Dyreste</span>
            <span className="font-semibold text-slate-700">{stats.max} kr</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Prisgap</span>
            <span className="font-medium text-slate-600">{stats.gap} kr</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}