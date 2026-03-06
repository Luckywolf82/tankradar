import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";

export default function GooglePlacesObservedStats({ fuelPrices, loading }) {
  // Filter GooglePlaces data only
  const googlePlacesPrices = useMemo(() => {
    return fuelPrices.filter(p => p.sourceName === "GooglePlaces");
  }, [fuelPrices]);

  // Statistics by fuel type
  const stats = useMemo(() => {
    const byFuelType = {};

    googlePlacesPrices.forEach(p => {
      if (!byFuelType[p.fuelType]) {
        byFuelType[p.fuelType] = [];
      }
      byFuelType[p.fuelType].push(p.priceNok);
    });

    const result = {};
    Object.entries(byFuelType).forEach(([fuelType, prices]) => {
      const sorted = prices.sort((a, b) => a - b);
      const n = sorted.length;
      const sum = sorted.reduce((a, b) => a + b, 0);
      const avg = sum / n;
      const median = n % 2 === 0 ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2 : sorted[Math.floor(n / 2)];
      const min = sorted[0];
      const max = sorted[n - 1];

      result[fuelType] = {
        count: n,
        average: parseFloat(avg.toFixed(2)),
        median: parseFloat(median.toFixed(2)),
        min: parseFloat(min.toFixed(2)),
        max: parseFloat(max.toFixed(2)),
        spread: parseFloat((max - min).toFixed(2))
      };
    });

    return result;
  }, [googlePlacesPrices]);

  // Price distribution for chart
  const distributionData = useMemo(() => {
    const fuelType = "gasoline_95";
    const prices = googlePlacesPrices
      .filter(p => p.fuelType === fuelType)
      .map(p => p.priceNok)
      .sort((a, b) => a - b);

    if (prices.length === 0) return [];

    const min = Math.floor(Math.min(...prices) * 2) / 2;
    const max = Math.ceil(Math.max(...prices) * 2) / 2;
    const bins = [];
    
    for (let i = min; i < max; i += 0.5) {
      bins.push({ range: `${i.toFixed(1)}-${(i + 0.5).toFixed(1)}`, count: 0 });
    }

    prices.forEach(price => {
      const binIdx = Math.floor((price - min) * 2);
      if (binIdx >= 0 && binIdx < bins.length) {
        bins[binIdx].count += 1;
      }
    });

    return bins.filter(b => b.count > 0);
  }, [googlePlacesPrices]);

  // By region
  const byRegion = useMemo(() => {
    const regions = {};
    googlePlacesPrices.forEach(p => {
      if (!p.locationLabel) return;
      if (!regions[p.locationLabel]) regions[p.locationLabel] = [];
      regions[p.locationLabel].push(p.priceNok);
    });

    return Object.entries(regions)
      .map(([region, prices]) => ({
        region: region.length > 20 ? region.substring(0, 20) + "..." : region,
        fullRegion: region,
        avg: parseFloat((prices.reduce((a, b) => a + b, 0) / prices.length).toFixed(2)),
        count: prices.length
      }))
      .sort((a, b) => b.avg - a.avg)
      .slice(0, 8);
  }, [googlePlacesPrices]);

  if (loading) {
    return <Skeleton className="h-96 w-full" />;
  }

  const gasoline95 = stats["gasoline_95"];
  const diesel = stats["diesel"];

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {gasoline95 && (
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-blue-900">Bensin 95</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{gasoline95.average} kr</div>
              <p className="text-xs text-blue-700 mt-1">Gjennomsnitt ({gasoline95.count} obs.)</p>
              <p className="text-xs text-blue-600 mt-2">Median: {gasoline95.median} kr</p>
              <p className="text-xs text-blue-600">Spredning: {gasoline95.spread} kr</p>
            </CardContent>
          </Card>
        )}
        {diesel && (
          <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-amber-900">Diesel</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">{diesel.average} kr</div>
              <p className="text-xs text-amber-700 mt-1">Gjennomsnitt ({diesel.count} obs.)</p>
              <p className="text-xs text-amber-600 mt-2">Median: {diesel.median} kr</p>
              <p className="text-xs text-amber-600">Spredning: {diesel.spread} kr</p>
            </CardContent>
          </Card>
        )}
        <Card className="bg-gradient-to-br from-slate-50 to-slate-100 border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-900">Samlet dekning</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-600">{googlePlacesPrices.length}</div>
            <p className="text-xs text-slate-600 mt-1">Prisrader hentet</p>
            <p className="text-xs text-slate-500 mt-2">Delvis dekning – Google Places</p>
          </CardContent>
        </Card>
      </div>

      {/* Price Distribution */}
      {distributionData.length > 0 && (
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Prisfordeling (Bensin 95)</CardTitle>
            <p className="text-xs text-slate-400">Antall observasjoner per priskategori</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={distributionData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="range" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(value) => `${value} obs.`} />
                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* By Region */}
      {byRegion.length > 0 && (
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Gjennomsnittspris per lokasjon</CardTitle>
            <p className="text-xs text-slate-400">Topp 8 observerte områder fra Google Places</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={byRegion} layout="vertical" margin={{ top: 5, right: 20, left: 120, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" domain={["auto", "auto"]} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="region" tick={{ fontSize: 10 }} />
                <Tooltip formatter={(value, name, props) => [`${value} kr (${props.payload.count} obs.)`, props.payload.fullRegion]} />
                <Bar dataKey="avg" fill="#f59e0b" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {googlePlacesPrices.length === 0 && (
        <Card className="shadow-sm">
          <CardContent className="h-40 flex items-center justify-center text-slate-400">
            Ingen Google Places-data hentet ennå. Kjør GooglePlaces-hentingen først.
          </CardContent>
        </Card>
      )}
    </div>
  );
}