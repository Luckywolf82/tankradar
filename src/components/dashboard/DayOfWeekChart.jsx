import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { getDay } from "date-fns";

const DAYS = ["Søn", "Man", "Tir", "Ons", "Tor", "Fre", "Lør"];
const DAYS_FULL = ["Søndag", "Mandag", "Tirsdag", "Onsdag", "Torsdag", "Fredag", "Lørdag"];

export default function DayOfWeekChart({ prices }) {
  const dayStats = Array.from({ length: 7 }, (_, i) => {
    const dayPrices = prices.filter(p => p.date_observed && getDay(new Date(p.date_observed)) === i);
    const avg = dayPrices.length ? dayPrices.reduce((s, p) => s + p.price, 0) / dayPrices.length : null;
    return { day: DAYS[i], fullDay: DAYS_FULL[i], avg: avg ? parseFloat(avg.toFixed(2)) : null, count: dayPrices.length };
  }).filter(d => d.avg !== null);

  if (dayStats.length === 0) {
    return (
      <Card className="shadow-sm">
        <CardHeader><CardTitle className="text-base">Billigste ukedag</CardTitle></CardHeader>
        <CardContent className="h-48 flex items-center justify-center text-slate-400">Ikke nok data ennå</CardContent>
      </Card>
    );
  }

  const minAvg = Math.min(...dayStats.map(d => d.avg));

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">Gjennomsnittspris per ukedag</CardTitle>
        <p className="text-xs text-slate-400">Basert på community-data</p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={dayStats} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="day" tick={{ fontSize: 12 }} />
            <YAxis
              tick={{ fontSize: 11 }}
              domain={["auto", "auto"]}
              tickFormatter={v => `${v}`}
            />
            <Tooltip
              formatter={(value, name, props) => [`${value} kr`, props.payload.fullDay]}
              labelFormatter={() => ""}
            />
            <Bar dataKey="avg" radius={[4, 4, 0, 0]}>
              {dayStats.map((entry, index) => (
                <Cell
                  key={index}
                  fill={entry.avg === minAvg ? "#16a34a" : "#3b82f6"}
                  opacity={entry.avg === minAvg ? 1 : 0.75}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <p className="text-xs text-center text-green-700 mt-1 font-medium">
          Grønn = billigste dag i snitt
        </p>
      </CardContent>
    </Card>
  );
}