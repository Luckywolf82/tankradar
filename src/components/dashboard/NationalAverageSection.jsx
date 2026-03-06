import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";
import { subDays } from "date-fns";

export default function NationalAverageSection({ prices }) {
  if (!prices || prices.length === 0) {
    return (
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Nasjonalt snitt</CardTitle>
        </CardHeader>
        <CardContent className="text-slate-400 text-center py-6">
          Ingen nasjonale gjennomsnittspriser hentet ennå
        </CardContent>
      </Card>
    );
  }

  // Find latest national_average entries
  const latestByFuel = {};
  prices.forEach(p => {
    if (p.priceType === "national_average") {
      if (!latestByFuel[p.fuelType] || new Date(p.fetchedAt) > new Date(latestByFuel[p.fuelType].fetchedAt)) {
        latestByFuel[p.fuelType] = p;
      }
    }
  });

  const fuelLabels = {
    gasoline_95: "Bensin 95",
    gasoline_98: "Bensin 98",
    diesel: "Diesel",
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {Object.entries(latestByFuel).map(([fuelType, price]) => {
        // Calculate day-ago price if available
        const allForFuel = prices.filter(p => p.fuelType === fuelType && p.priceType === "national_average");
        const yesterday = allForFuel.find(p => {
          const pDate = new Date(p.fetchedAt);
          const dayAgo = subDays(new Date(), 1);
          return pDate.toDateString() === dayAgo.toDateString();
        });

        const change = yesterday ? price.priceNok - yesterday.priceNok : null;
        const changePercent = yesterday && yesterday.priceNok ? ((change / yesterday.priceNok) * 100).toFixed(1) : null;

        return (
          <Card key={fuelType} className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-slate-600 font-medium">
                {fuelLabels[fuelType] || fuelType}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-800">
                {price.priceNok.toFixed(2)} kr
              </div>
              {change !== null && (
                <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${change >= 0 ? "text-red-600" : "text-green-600"}`}>
                  {change >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                  {Math.abs(change).toFixed(2)} kr ({changePercent}%)
                </div>
              )}
              <p className="text-xs text-slate-400 mt-2">
                Kilde: {price.sourceName} • Oppdatert {new Date(price.fetchedAt).toLocaleDateString("nb-NO")}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}