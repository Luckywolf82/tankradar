import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

const FUEL_OPTIONS = [
  { id: "gasoline_95", label: "Bensin 95", ssbKey: "bensin" },
  { id: "diesel",      label: "Diesel",    ssbKey: "diesel" },
];

function classifyPrice(currentPrice, historicalPrices) {
  if (!historicalPrices.length) return null;
  const sorted = [...historicalPrices].sort((a, b) => a - b);
  const p25 = sorted[Math.floor(sorted.length * 0.25)];
  const p75 = sorted[Math.floor(sorted.length * 0.75)];
  const avg = sorted.reduce((s, v) => s + v, 0) / sorted.length;
  const delta = currentPrice - avg;

  let band, label, color, bg, icon, advice;
  if (currentPrice <= p25) {
    band = "low";
    label = "Lave priser";
    color = "text-green-700";
    bg = "bg-green-50 border-green-200";
    icon = <TrendingDown size={18} className="text-green-600" />;
    advice = "Gode priser nå — fyll gjerne";
  } else if (currentPrice >= p75) {
    band = "high";
    label = "Høye priser";
    color = "text-red-700";
    bg = "bg-red-50 border-red-200";
    icon = <TrendingUp size={18} className="text-red-600" />;
    advice = "Priser er høye — vent om mulig";
  } else {
    band = "normal";
    label = "Normale priser";
    color = "text-amber-700";
    bg = "bg-amber-50 border-amber-200";
    icon = <Minus size={18} className="text-amber-600" />;
    advice = "Priser er normale akkurat nå";
  }

  return { band, label, color, bg, icon, advice, avg, delta, p25, p75 };
}

const BAND_SEGMENTS = ["low", "normal", "high"];
const SEGMENT_COLORS = { low: "bg-green-400", normal: "bg-amber-400", high: "bg-red-400" };
const SEGMENT_INACTIVE = { low: "bg-green-100", normal: "bg-amber-100", high: "bg-red-100" };

export default function NationalFuelBarometer({ selectedFuel }) {
  const [loading, setLoading] = useState(true);
  const [currentPrice, setCurrentPrice] = useState(null);
  const [classification, setClassification] = useState(null);
  const [dataSource, setDataSource] = useState(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setClassification(null);
      setCurrentPrice(null);

      const fuelOpt = FUEL_OPTIONS.find(f => f.id === selectedFuel);

      const [nationalPrices, ssbData] = await Promise.all([
        base44.entities.FuelPrice.filter(
          { fuelType: selectedFuel, priceType: "national_average", sourceName: "GlobalPetrolPrices" },
          "-fetchedAt",
          5
        ),
        base44.entities.SSBData.filter({ fuel_type: fuelOpt.ssbKey }, "-year", 24),
      ]);

      const latest = nationalPrices[0] || null;
      if (!latest) {
        setLoading(false);
        return;
      }

      setCurrentPrice(latest.priceNok);
      setDataSource(latest.sourceName);

      const historical = ssbData.map(r => r.price).filter(Boolean);
      const result = classifyPrice(latest.priceNok, historical);
      setClassification(result);
      setLoading(false);
    };

    load();
  }, [selectedFuel, FUEL_OPTIONS]);

  return (
    <Card className="shadow-sm">
      <CardContent className="pt-4 pb-4">
        {/* Header row */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm font-semibold text-slate-800">Prisbarometer</p>
            <p className="text-xs text-slate-400">Nasjonalt snitt vs. historikk</p>
          </div>
          {/* Fuel type toggle */}
          <div className="flex rounded-lg border border-slate-200 overflow-hidden">
            {FUEL_OPTIONS.map(opt => (
              <button
                key={opt.id}
                onClick={() => setSelectedFuel(opt.id)}
                className={`px-3 py-1 text-xs font-medium transition-colors ${
                  selectedFuel === opt.id
                    ? "bg-slate-800 text-white"
                    : "bg-white text-slate-500 hover:bg-slate-50"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-slate-400 text-sm py-3">
            <div className="w-4 h-4 border-2 border-slate-300 border-t-transparent rounded-full animate-spin" />
            Laster prisdata…
          </div>
        ) : !currentPrice ? (
          <div className="text-sm text-slate-400 py-3">
            Ingen nasjonale prisdata funnet for {FUEL_OPTIONS.find(f => f.id === selectedFuel)?.label}.
          </div>
        ) : (
          <div className={`rounded-xl border p-4 ${classification?.bg || "bg-slate-50 border-slate-200"}`}>
            {/* Price + band label */}
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className={`text-3xl font-bold ${classification?.color || "text-slate-800"}`}>
                  {currentPrice.toFixed(2)}
                  <span className="text-base font-normal ml-1">kr/l</span>
                </p>
                {classification?.avg && (
                  <p className="text-xs text-slate-500 mt-0.5">
                    Snitt (hist.): {classification.avg.toFixed(2)} kr/l
                    {" · "}
                    {classification.delta >= 0 ? "+" : ""}{classification.delta.toFixed(2)} kr
                  </p>
                )}
              </div>
              <div className="flex flex-col items-end gap-1">
                <div className="flex items-center gap-1.5">
                  {classification?.icon}
                  <span className={`text-sm font-semibold ${classification?.color}`}>
                    {classification?.label || "Ukjent"}
                  </span>
                </div>
              </div>
            </div>

            {/* 3-segment bar */}
            <div className="flex gap-1 mb-3">
              {BAND_SEGMENTS.map(seg => (
                <div
                  key={seg}
                  className={`h-2 flex-1 rounded-full ${
                    classification?.band === seg
                      ? SEGMENT_COLORS[seg]
                      : SEGMENT_INACTIVE[seg]
                  }`}
                />
              ))}
            </div>

            {/* Low / Normal / High labels */}
            <div className="flex justify-between text-xs text-slate-400 mb-3">
              <span>Lavt</span>
              <span>Normalt</span>
              <span>Høyt</span>
            </div>

            {/* Advice */}
            {classification?.advice && (
              <p className={`text-xs font-medium ${classification.color}`}>
                {classification.advice}
              </p>
            )}
          </div>
        )}

        {/* Data attribution */}
        {dataSource && !loading && (
          <p className="text-xs text-slate-300 mt-2">
            Kilde: {dataSource} · Historikk: SSB månedlig
          </p>
        )}
      </CardContent>
    </Card>
  );
}