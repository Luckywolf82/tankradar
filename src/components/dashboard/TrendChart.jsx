import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format, parseISO, subDays } from "date-fns";
import { nb } from "date-fns/locale";

export default function TrendChart({ prices, fuelLabel }) {
  // Group by date and calculate daily average
  const last90 = prices.filter(p => p.date_observed && new Date(p.date_observed) >= subDays(new Date(), 90));

  const byDate = {};
  last90.forEach(p => {
    if (!byDate[p.date_observed]) byDate[p.date_observed] = [];
    byDate[p.date_observed].push(p.price);
  });

  const chartData = Object.entries(byDate)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, priceArr]) => ({
      date,
      avg: parseFloat((priceArr.reduce((s, v) => s + v, 0) / priceArr.length).toFixed(2)),
      label: format(parseISO(date), "d. MMM", { locale: nb }),
    }));

  if (chartData.length === 0) {
    return (
      <Card className="shadow-sm">
        <CardHeader><CardTitle className="text-base">Pristrend siste 90 dager</CardTitle></CardHeader>
        <CardContent className="h-48 flex items-center justify-center text-slate-400">Ikke nok data ennå</CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">Pristrend – {fuelLabel}</CardTitle>
        <p className="text-xs text-slate-400">Daglig snitt (community), siste 90 dager</p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 11 }} domain={["auto", "auto"]} tickFormatter={v => `${v}`} />
            <Tooltip formatter={(value) => [`${value} kr`, "Snitt"]} />
            <Line type="monotone" dataKey="avg" stroke="#3b82f6" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}