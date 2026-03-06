import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";
import { subDays, format } from "date-fns";

export default function PriceChangeIndicator({ observedPrices, selectedFuel }) {
  const change = useMemo(() => {
    const now = new Date();
    const today = format(now, "yyyy-MM-dd");
    const yesterday = format(subDays(now, 1), "yyyy-MM-dd");

    const todayPrices = observedPrices.filter(p =>
      p.fuelType === selectedFuel &&
      p.plausibilityStatus === "realistic_price" &&
      p.sourceName === "GooglePlaces" &&
      p.fetchedAt.split("T")[0] === today
    );

    const yesterdayPrices = observedPrices.filter(p =>
      p.fuelType === selectedFuel &&
      p.plausibilityStatus === "realistic_price" &&
      p.sourceName === "GooglePlaces" &&
      p.fetchedAt.split("T")[0] === yesterday
    );

    if (todayPrices.length === 0 || yesterdayPrices.length === 0) {
      return null;
    }

    const todayAvg = todayPrices.reduce((a, b) => a + b.priceNok, 0) / todayPrices.length;
    const yesterdayAvg = yesterdayPrices.reduce((a, b) => a + b.priceNok, 0) / yesterdayPrices.length;
    const diff = todayAvg - yesterdayAvg;
    const pctChange = ((diff / yesterdayAvg) * 100);

    // Mark as weak data if sample is very small (< 5 observations either day)
    const isWeakData = todayPrices.length < 5 || yesterdayPrices.length < 5;

    return {
      today: parseFloat(todayAvg.toFixed(2)),
      yesterday: parseFloat(yesterdayAvg.toFixed(2)),
      diff: parseFloat(diff.toFixed(2)),
      pctChange: parseFloat(pctChange.toFixed(1)),
      todayCount: todayPrices.length,
      yesterdayCount: yesterdayPrices.length,
      isWeakData
    };
  }, [observedPrices, selectedFuel]);

  if (!change) {
    return (
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Prisendring</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-500 text-center py-3 text-sm">Ikke nok data til prissammenligning</p>
        </CardContent>
      </Card>
    );
  }

  const isUp = change.diff > 0;
  const bg = isUp ? "bg-gradient-to-br from-red-50 to-red-100 border-red-200" : "bg-gradient-to-br from-green-50 to-green-100 border-green-200";
  const color = isUp ? "text-red-600" : "text-green-600";
  const Icon = isUp ? TrendingUp : TrendingDown;

  return (
    <Card className={`shadow-sm ${bg}`}>
      <CardHeader>
        <CardTitle className="text-base">Prisendring siste døgn</CardTitle>
        {change.isWeakData && (
          <p className="text-xs text-amber-700 mt-2 bg-amber-50 px-2 py-1 rounded border border-amber-200 w-fit">
            ⚠️ <strong>Begrenset datagrunnlag</strong> – Resultatet baseres på få observasjoner
          </p>
        )}
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-3">
          <Icon size={32} className={color} />
          <div className="flex-1">
            <div className={`text-lg font-bold ${color}`}>
              {change.diff > 0 ? "+" : ""}{change.diff} kr ({change.pctChange > 0 ? "+" : ""}{change.pctChange}%)
            </div>
            <p className="text-sm text-slate-600 mt-1">
              I dag: <span className="font-semibold">{change.today}</span> kr ({change.todayCount} obs.) vs i går: <span className="font-semibold">{change.yesterday}</span> kr ({change.yesterdayCount} obs.)
            </p>
            {change.isWeakData && (
              <p className="text-xs text-slate-500 mt-2 italic">
                Prisbevegelse kan være mindre pålitelig når datagrunnlaget er lite.
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}