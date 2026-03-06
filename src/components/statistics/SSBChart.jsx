import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";

export default function SSBChart({ ssbData, loading }) {
  // Build monthly data points
  const byMonth = {};
  ssbData.forEach(d => {
    const key = `${d.year}-${String(d.month).padStart(2, "0")}`;
    if (!byMonth[key]) byMonth[key] = { label: key };
    byMonth[key][d.fuel_type] = d.price;
  });

  const chartData = Object.values(byMonth).sort((a, b) => a.label.localeCompare(b.label));

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">Historiske priser fra SSB</CardTitle>
        <p className="text-xs text-slate-400">Månedlige gjennomsnittspriser (offisielle tall)</p>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-64 w-full" />
        ) : chartData.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-slate-400 gap-2">
            <p>Ingen SSB-data lastet inn ennå.</p>
            <p className="text-sm">Klikk "Oppdater SSB-data" for å hente historiske priser.</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={Math.floor(chartData.length / 8)} />
              <YAxis tick={{ fontSize: 11 }} domain={["auto", "auto"]} />
              <Tooltip formatter={(value, name) => [`${value} kr/l`, name === "bensin" ? "Bensin" : "Diesel"]} />
              <Legend formatter={(value) => value === "bensin" ? "Bensin" : "Diesel"} />
              <Line type="monotone" dataKey="bensin" stroke="#3b82f6" strokeWidth={2} dot={false} name="bensin" />
              <Line type="monotone" dataKey="diesel" stroke="#f59e0b" strokeWidth={2} dot={false} name="diesel" />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}