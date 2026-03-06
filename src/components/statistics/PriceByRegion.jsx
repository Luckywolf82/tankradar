import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function PriceByRegion({ data }) {
  const bensinData = data.filter(p => p.fuel_type === "bensin_95" && p.region);

  const byRegion = {};
  bensinData.forEach(p => {
    if (!byRegion[p.region]) byRegion[p.region] = [];
    byRegion[p.region].push(p.price);
  });

  const chartData = Object.entries(byRegion)
    .map(([region, prices]) => ({
      region: region.split(" ")[0], // Shorten for display
      fullRegion: region,
      avg: parseFloat((prices.reduce((s, v) => s + v, 0) / prices.length).toFixed(2)),
    }))
    .sort((a, b) => b.avg - a.avg);

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">Snittpriser per region</CardTitle>
        <p className="text-xs text-slate-400">Bensin 95 – community-data</p>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-slate-400">Ikke nok data ennå</div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" domain={["auto", "auto"]} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="region" tick={{ fontSize: 11 }} width={60} />
              <Tooltip formatter={(value, name, props) => [`${value} kr`, props.payload.fullRegion]} />
              <Bar dataKey="avg" fill="#3b82f6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}