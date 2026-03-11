import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";

export default function HistoricalSSBTrend({ ssbData, selectedFuel, loading }) {
  const fuelMap = {
    gasoline_95: "bensin",
    gasoline_98: "bensin",
    diesel: "diesel"
  };

  const chartData = useMemo(() => {
    const ssbFuelType = fuelMap[selectedFuel] || selectedFuel;
    const filtered = ssbData.filter(d => d.fuel_type === ssbFuelType);

    const byMonth = {};
    filtered.forEach(d => {
      const key = `${d.year}-${String(d.month).padStart(2, "0")}`;
      if (!byMonth[key]) byMonth[key] = { label: key };
      byMonth[key][d.fuel_type] = d.price;
    });

    return Object.values(byMonth)
      .sort((a, b) => a.label.localeCompare(b.label))
      .slice(-12); // Last 12 months
  }, [ssbData, selectedFuel]);

  if (loading) {
    return <Skeleton className="h-64 w-full" />;
  }

  if (chartData.length === 0) {
    return (
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Historisk trend (SSB)</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-500 text-center py-8">Ingen SSB-data lastet inn ennå</p>
        </CardContent>
      </Card>
    );
  }

  const ssbFuelType = fuelMap[selectedFuel];

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">Historisk trend (SSB)</CardTitle>
        <p className="text-xs text-slate-400">Nasjonalt snitt (SSB) · siste 12 måneder</p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} domain={["auto", "auto"]} />
            <Tooltip formatter={(value) => `${value} kr/l`} />
            <Legend />
            <Line
              type="monotone"
              dataKey={ssbFuelType}
              stroke="#3b82f6"
              strokeWidth={2}
              dot={false}
              name={ssbFuelType === "bensin" ? "Bensin" : "Diesel"}
            />
          </LineChart>
        </ResponsiveContainer>

      </CardContent>
    </Card>
  );
}