import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { AlertCircle, TrendingUp } from "lucide-react";
import { format, parseISO } from "date-fns";
import { nb } from "date-fns/locale";

/**
 * StationHistoryCard
 * 
 * Displays historical FuelPrice observations for a single station + fuel type combo.
 * 
 * Shows:
 * - Latest price + sourceUpdatedAt
 * - Previous price (if available)
 * - Observation count
 * - Simple trend graph (if >1 observation)
 * - Clear source attribution (GooglePlaces = supplement)
 * - Single-observation indicator (no trend)
 */

// Known low-confidence matches that need warning
const LOW_CONFIDENCE_STATIONS = {
  "69aae82f8c0186903a326f9f": {
    reason: "Svak navnematch + moderat distanse (218m) – krever validering",
    warningLevel: "review_needed"
  }
};

export default function StationHistoryCard({ stationId, stationName, chain, fuelType, fuelLabel, observations }) {
  const [sorted, setSorted] = useState([]);
  const isLowConfidence = LOW_CONFIDENCE_STATIONS[stationId];

  useEffect(() => {
    // Sort by fetchedAt descending
    const s = [...observations].sort((a, b) => 
      new Date(b.fetchedAt) - new Date(a.fetchedAt)
    );
    setSorted(s);
  }, [observations]);

  if (!sorted || sorted.length === 0) {
    return (
      <Card className="shadow-sm border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-slate-700">
            {stationName} – {fuelLabel}
          </CardTitle>
          <p className="text-xs text-slate-500 mt-1">{chain}</p>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-2 text-slate-400">
            <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
            <p className="text-xs">Ingen observasjoner ennå for denne kombinasjonen.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const latest = sorted[0];
  const previous = sorted.length > 1 ? sorted[1] : null;
  const observationCount = sorted.length;
  const hasHistory = observationCount > 1;

  // Chart data: last 10 observations, chronological
  const chartData = sorted
    .slice(0, 10)
    .reverse()
    .map((obs, idx) => ({
      date: format(parseISO(obs.fetchedAt), "d. MMM", { locale: nb }),
      price: obs.priceNok,
      sourceUpdatedAt: obs.sourceUpdatedAt ? format(parseISO(obs.sourceUpdatedAt), "HH:mm", { locale: nb }) : "ukjent"
    }));

  // Price change
  const priceDiff = previous ? (latest.priceNok - previous.priceNok).toFixed(2) : null;
  const trend = priceDiff > 0 ? "↑" : priceDiff < 0 ? "↓" : "→";
  const trendColor = priceDiff > 0 ? "text-red-600" : priceDiff < 0 ? "text-green-600" : "text-slate-500";

  return (
    <Card className="shadow-sm border-slate-200">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-sm font-semibold text-slate-700">
              {stationName} – {fuelLabel}
            </CardTitle>
            <p className="text-xs text-slate-500 mt-1">{chain} • {observationCount} observasjon{observationCount !== 1 ? "er" : ""}</p>
          </div>
          <div className="text-right">
            <p className="font-bold text-lg text-slate-800">{latest.priceNok.toFixed(2)} kr</p>
            <p className="text-xs text-slate-400">nåværende</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Source attribution */}
        <div className="p-2 bg-blue-50 rounded border border-blue-200">
          <p className="text-xs text-blue-700">
            <strong>Kilde:</strong> {latest.sourceName || "Ukjent"}
            {latest.sourceName === "GooglePlaces" && (
              <span className="block text-xs mt-1">
                ⚠️ <em>Supplement-kilde (partial coverage)</em>
              </span>
            )}
          </p>
          {latest.sourceUpdatedAt && (
            <p className="text-xs text-blue-600 mt-1">
              Oppdatert: {format(parseISO(latest.sourceUpdatedAt), "d. MMM HH:mm", { locale: nb })}
            </p>
          )}
        </div>

        {/* Current vs previous */}
        {previous && (
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="p-2 bg-slate-50 rounded">
              <p className="text-xs text-slate-500">Forrige</p>
              <p className="font-semibold text-slate-800">{previous.priceNok.toFixed(2)} kr</p>
            </div>
            <div className={`p-2 rounded ${priceDiff > 0 ? "bg-red-50" : priceDiff < 0 ? "bg-green-50" : "bg-slate-50"}`}>
              <p className={`text-xs ${trendColor}`}>Endring</p>
              <p className={`font-semibold text-lg ${trendColor}`}>
                {trend} {Math.abs(priceDiff).toFixed(2)} kr
              </p>
            </div>
          </div>
        )}

        {/* History graph or single-observation note */}
        {hasHistory ? (
          <div>
            <p className="text-xs text-slate-600 font-medium mb-2">Historisk utvikling</p>
            <ResponsiveContainer width="100%" height={140}>
              <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10 }} width={30} />
                <Tooltip 
                  formatter={(value) => [`${value.toFixed(2)} kr`, "Pris"]}
                  contentStyle={{ backgroundColor: "#fff", border: "1px solid #e2e8f0", borderRadius: "4px" }}
                />
                <Line type="monotone" dataKey="price" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
            <p className="text-xs text-slate-400 mt-2">Siste {Math.min(10, observationCount)} observasjoner</p>
          </div>
        ) : (
          <div className="p-3 bg-slate-50 rounded border border-slate-200">
            <div className="flex items-start gap-2">
              <AlertCircle size={14} className="text-slate-500 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-slate-600">
                Kun {observationCount} observasjon – ikke nok data for trendvisning.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}