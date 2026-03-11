import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingDown, TrendingUp, Minus } from "lucide-react";

export default function SmartFillIndicator({ ssbData, observedPrices, selectedFuel }) {
  const stats = useMemo(() => {
    // Map fuel types
    const fuelMap = {
      gasoline_95: "bensin",
      gasoline_98: "bensin",
      diesel: "diesel"
    };
    const ssbFuelType = fuelMap[selectedFuel] || selectedFuel;

    // Latest SSB historical average (official reference level)
    const latestSSB = ssbData
      .filter(d => d.fuel_type === ssbFuelType)
      .sort((a, b) => {
        const dateA = new Date(`${a.year}-${String(a.month).padStart(2, "0")}-01`);
        const dateB = new Date(`${b.year}-${String(b.month).padStart(2, "0")}-01`);
        return dateB - dateA;
      })[0];

    // Current observed market average (realistic prices only)
    const observed = observedPrices
      .filter(p => 
        p.fuelType === selectedFuel && 
        p.plausibilityStatus === "realistic_price" &&
        p.sourceName === "GooglePlaces"
      )
      .map(p => p.priceNok);

    const observedAvg = observed.length ? (observed.reduce((a, b) => a + b, 0) / observed.length) : null;

    if (!latestSSB || !observedAvg) {
      return { status: "no_data", observedAvg: null, reference: null, deviation: null, sampleSize: observed.length };
    }

    const deviation = observedAvg - latestSSB.price;
    let status = "normal";

    if (deviation <= -0.50) {
      status = "good_time_to_fill";
    } else if (deviation >= 0.50) {
      status = "wait_if_possible";
    } else {
      status = "normal";
    }

    return {
      status,
      observedAvg: parseFloat(observedAvg.toFixed(2)),
      reference: latestSSB.price,
      deviation: parseFloat(deviation.toFixed(2)),
      sampleSize: observed.length,
      referenceLabel: `SSB ${latestSSB.year}-${String(latestSSB.month).padStart(2, "0")}`
    };
  }, [ssbData, observedPrices, selectedFuel]);

  if (stats.status === "no_data") {
    return (
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Smart fyll-indikator</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-500 text-center py-4">Ikke nok data til å beregne indikator ennå</p>
        </CardContent>
      </Card>
    );
  }

  const statusConfig = {
    good_time_to_fill: {
      label: "God tid å fylle",
      bg: "bg-gradient-to-br from-green-50 to-green-100",
      border: "border-green-200",
      icon: TrendingDown,
      color: "text-green-600",
      desc: "Prisene er under normalt nivå"
    },
    normal: {
      label: "Normalt nivå",
      bg: "bg-gradient-to-br from-slate-50 to-slate-100",
      border: "border-slate-200",
      icon: Minus,
      color: "text-slate-600",
      desc: "Prisene er nær normalt nivå"
    },
    wait_if_possible: {
      label: "Vent hvis mulig",
      bg: "bg-gradient-to-br from-amber-50 to-amber-100",
      border: "border-amber-200",
      icon: TrendingUp,
      color: "text-amber-600",
      desc: "Prisene er over normalt nivå"
    }
  };

  const config = statusConfig[stats.status];
  const Icon = config.icon;

  return (
    <Card className={`shadow-sm ${config.bg} ${config.border}`}>
      <CardHeader>
        <CardTitle className="text-base">Smart fyll-indikator</CardTitle>
        <p className="text-xs text-slate-500 mt-1">Nasjonalt marked nå vs. historisk normalnivå</p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Status indicator */}
          <div className="flex items-center gap-3">
            <Icon size={32} className={config.color} />
            <div>
              <div className={`text-lg font-bold ${config.color}`}>{config.label}</div>
              <p className="text-sm text-slate-600">{config.desc}</p>
            </div>
          </div>

          {/* Price comparison */}
          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-200">
            <div>
              <p className="text-xs text-slate-500">Marked nå</p>
              <p className="text-2xl font-bold text-slate-800">{stats.observedAvg} <span className="text-sm font-normal">kr/l</span></p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Normalt nivå</p>
              <p className="text-2xl font-bold text-slate-600">{stats.reference} <span className="text-sm font-normal">kr/l</span></p>
              <p className="text-xs text-slate-400 mt-0.5">{stats.referenceLabel}</p>
            </div>
          </div>

          <p className={`text-sm font-medium ${stats.deviation < 0 ? "text-green-600" : stats.deviation > 0 ? "text-amber-600" : "text-slate-500"}`}>
            {stats.deviation > 0 ? "+" : ""}{stats.deviation} kr fra normalt ({((stats.deviation / stats.reference) * 100).toFixed(1)}%)
          </p>

          <p className="text-xs text-slate-400">
            Basert på sanntidspriser fra Google Places · SSB som offisiell referanse
          </p>
        </div>
      </CardContent>
    </Card>
  );
}