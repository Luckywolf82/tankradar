import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function RegionalStats({ observedPrices, stations = [], ssbData, selectedFuel }) {
  const stats = useMemo(() => {
    // Build stationId -> city lookup
    const stationCityMap = {};
    stations.forEach(s => {
      if (s.id && s.city) stationCityMap[s.id] = s.city;
    });
    // Map fuel types for SSB comparison
    const fuelMap = {
      gasoline_95: "bensin",
      gasoline_98: "bensin",
      diesel: "diesel"
    };
    const ssbFuelType = fuelMap[selectedFuel];

    // Latest SSB reference
    const latestSSB = ssbData
      .filter(d => d.fuel_type === ssbFuelType)
      .sort((a, b) => {
        const dateA = new Date(`${a.year}-${String(a.month).padStart(2, "0")}-01`);
        const dateB = new Date(`${b.year}-${String(b.month).padStart(2, "0")}-01`);
        return dateB - dateA;
      })[0];

    const ssbReference = latestSSB?.price || null;

    // Group by locationLabel (city/place name from FuelPrice.locationLabel)
    // This is NOT geographic grouping - it's based on the explicit location label in each observation
    const byCity = {};
    // Normalize fuelType aliases before filtering
    const fuelAliases = {
      gasoline_95: ["gasoline_95", "bensin_95"],
      gasoline_98: ["gasoline_98", "bensin_98"],
      diesel: ["diesel", "diesel_premium"],
    };
    const acceptedFuelTypes = fuelAliases[selectedFuel] || [selectedFuel];

    observedPrices
      .filter(p =>
        acceptedFuelTypes.includes(p.fuelType) &&
        p.plausibilityStatus === "realistic_price" &&
        p.priceType !== "national_average"
      )
      .forEach(p => {
        // Prefer station.city via stationId, fallback to locationLabel
        const cityKey = (p.stationId && stationCityMap[p.stationId]) || p.locationLabel;
        if (!cityKey) return;
        if (!byCity[cityKey]) byCity[cityKey] = [];
        byCity[cityKey].push(p.priceNok);
      });

    const results = Object.entries(byCity)
      .map(([cityName, prices]) => {
        const sorted = prices.sort((a, b) => a - b);
        const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
        const median = sorted.length % 2 === 0
          ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
          : sorted[Math.floor(sorted.length / 2)];

        let deviation = null;
        if (ssbReference) {
          deviation = parseFloat((avg - ssbReference).toFixed(2));
        }

        // Mark as weak foundation if sample is very small
        const isWeakSample = prices.length < 5;

        return {
          city: cityName.length > 30 ? cityName.substring(0, 30) + "..." : cityName,
          fullCity: cityName,
          avg: parseFloat(avg.toFixed(2)),
          median: parseFloat(median.toFixed(2)),
          count: prices.length,
          deviation,
          isWeakSample
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    return { results, ssbReference };
  }, [observedPrices, ssbData, selectedFuel]);

  if (stats.results.length === 0) {
    return (
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Regional statistikk</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-500 text-center py-4">Ingen regional data ennå</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">Statistikk per by</CardTitle>
        {stats.ssbReference && (
          <p className="text-xs text-slate-400">SSB referanse: {stats.ssbReference} kr/l</p>
        )}
      </CardHeader>
      <CardContent className="px-4 pb-2">
        <div className="divide-y divide-slate-100">
          {stats.results.map((city, idx) => (
            <div key={idx} className="py-3 flex items-center justify-between gap-3">
              {/* City name + obs count */}
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <p className="font-semibold text-slate-800 text-sm truncate">{city.city}</p>
                  <span className={`text-xs shrink-0 ${city.isWeakSample ? 'text-amber-600 font-medium' : 'text-slate-400'}`}>
                    {city.count} obs.{city.isWeakSample && " · ⚠ Lavt datagrunnlag"}
                  </span>
                </div>
              </div>

              {/* Prices */}
              <div className="flex items-center gap-4 shrink-0">
                <div className="text-right">
                  <p className="text-lg font-bold text-slate-800 leading-tight">{city.avg} kr</p>
                  <p className="text-xs text-slate-400">snitt</p>
                </div>
                {city.deviation !== null && (
                  <div className="text-right w-14">
                    <p className={`text-sm font-semibold leading-tight ${
                      city.deviation < 0 ? "text-green-600" : city.deviation > 0 ? "text-amber-600" : "text-slate-500"
                    }`}>
                      {city.deviation > 0 ? "+" : ""}{city.deviation}
                    </p>
                    <p className="text-xs text-slate-400">vs SSB</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}