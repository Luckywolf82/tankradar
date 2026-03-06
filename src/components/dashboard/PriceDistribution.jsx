import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function PriceDistribution({ observedPrices, selectedFuel }) {
  const chartData = useMemo(() => {
    const prices = observedPrices
      .filter(p =>
        p.fuelType === selectedFuel &&
        p.plausibilityStatus === "realistic_price" &&
        p.sourceName === "GooglePlaces"
      )
      .map(p => p.priceNok)
      .sort((a, b) => a - b);

    if (prices.length === 0) return [];

    const min = Math.floor(Math.min(...prices) * 2) / 2;
    const max = Math.ceil(Math.max(...prices) * 2) / 2;
    const bins = [];

    for (let i = min; i < max; i += 0.5) {
      bins.push({
        range: `${i.toFixed(1)}-${(i + 0.5).toFixed(1)}`,
        count: 0
      });
    }

    prices.forEach(price => {
      const binIdx = Math.floor((price - min) * 2);
      if (binIdx >= 0 && binIdx < bins.length) {
        bins[binIdx].count += 1;
      }
    });

    return bins.filter(b => b.count > 0);
  }, [observedPrices, selectedFuel]);

  if (chartData.length === 0) {
    return (
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Prisfordeling</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-500 text-center py-4">Ingen data til prisfordeling</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">Prisfordeling</CardTitle>
        <p className="text-xs text-slate-400">Antall observasjoner per priskategori</p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="range" tick={{ fontSize: 11 }} angle={-45} textAnchor="end" height={60} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip formatter={(value) => `${value} obs.`} />
            <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}