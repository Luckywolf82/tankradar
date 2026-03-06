import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

const COLORS = ["#3b82f6", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6", "#ec4899", "#6b7280"];

export default function PriceByChain({ data }) {
  const bensinData = data.filter(p => p.fuel_type === "bensin_95" && p.station_chain);

  const byChain = {};
  bensinData.forEach(p => {
    if (!byChain[p.station_chain]) byChain[p.station_chain] = [];
    byChain[p.station_chain].push(p.price);
  });

  const chartData = Object.entries(byChain)
    .map(([chain, prices]) => ({
      chain,
      avg: parseFloat((prices.reduce((s, v) => s + v, 0) / prices.length).toFixed(2)),
      count: prices.length,
    }))
    .sort((a, b) => a.avg - b.avg);

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">Snittpriser per kjede</CardTitle>
        <p className="text-xs text-slate-400">Bensin 95 – billigst til dyreste</p>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-slate-400">Ikke nok data ennå</div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="chain" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 11 }} domain={["auto", "auto"]} />
              <Tooltip formatter={(value, name, props) => [`${value} kr (${props.payload.count} obs.)`, "Snitt"]} />
              <Bar dataKey="avg" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}