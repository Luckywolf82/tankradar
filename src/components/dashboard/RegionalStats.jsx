import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

export default function RegionalStats({ observedPrices, ssbData, selectedFuel }) {
  const stats = useMemo(() => {
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

    // Group by location
    const byLocation = {};
    observedPrices
      .filter(p =>
        p.fuelType === selectedFuel &&
        p.plausibilityStatus === "realistic_price" &&
        p.sourceName === "GooglePlaces" &&
        p.locationLabel
      )
      .forEach(p => {
        if (!byLocation[p.locationLabel]) {
          byLocation[p.locationLabel] = [];
        }
        byLocation[p.locationLabel].push(p.priceNok);
      });

    const results = Object.entries(byLocation)
      .map(([location, prices]) => {
        const sorted = prices.sort((a, b) => a - b);
        const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
        const median = sorted.length % 2 === 0
          ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
          : sorted[Math.floor(sorted.length / 2)];

        let deviation = null;
        if (ssbReference) {
          deviation = parseFloat((avg - ssbReference).toFixed(2));
        }

        return {
          location: location.length > 25 ? location.substring(0, 25) + "..." : location,
          fullLocation: location,
          avg: parseFloat(avg.toFixed(2)),
          median: parseFloat(median.toFixed(2)),
          count: prices.length,
          deviation
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
        <CardTitle className="text-base">Regional statistikk</CardTitle>
        <p className="text-xs text-slate-400">Topp 6 lokasjoner etter antall observasjoner</p>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {stats.results.map((region, idx) => (
            <div key={idx} className="bg-slate-50 rounded-lg p-3 border border-slate-200">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <p className="font-semibold text-slate-800 text-sm">{region.location}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <div>
                      <p className="text-xs text-slate-500">Gjennomsnitt</p>
                      <p className="text-lg font-bold text-slate-800">{region.avg} kr</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Median</p>
                      <p className="text-lg font-bold text-slate-600">{region.median} kr</p>
                    </div>
                  </div>
                  {region.count < 5 && (
                    <div className="flex items-center gap-1 mt-2 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded w-fit">
                      <AlertCircle size={14} />
                      <span>Lavt dataogrunnlag ({region.count} obs.)</span>
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500 uppercase">Obs.</p>
                  <p className="text-xl font-bold text-slate-800">{region.count}</p>
                  {region.deviation !== null && (
                    <div className="mt-2 text-xs font-semibold">
                      <p className={region.deviation < 0 ? "text-green-600" : region.deviation > 0 ? "text-amber-600" : "text-slate-600"}>
                        {region.deviation > 0 ? "+" : ""}{region.deviation} kr
                      </p>
                      <p className="text-slate-500">vs nasjonalt</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}