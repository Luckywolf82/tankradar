import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

export default function StationPricesSection({ title, region, prices }) {
  // Filter station_level data for this region
  const stationData = prices.filter(
    p => p.priceType === "station_level" && p.region === region
  );

  if (!stationData || stationData.length === 0) {
    return (
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertCircle size={18} className="text-slate-400" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-slate-400 text-center py-8">
          <p className="text-sm">Station-level data for {region} er ikke hentet ennå.</p>
          <p className="text-xs mt-1">Denne seksjonen vil bli populert når FuelFinder-scraper er aktiv.</p>
        </CardContent>
      </Card>
    );
  }

  // Group by station and get cheapest per fuel type
  const byStation = {};
  stationData.forEach(p => {
    if (!byStation[p.stationId]) {
      byStation[p.stationId] = {
        name: p.stationName,
        chain: p.chain,
        city: p.city,
        prices: [],
      };
    }
    byStation[p.stationId].prices.push(p);
  });

  // Get cheapest station (lowest average price across fuel types)
  const stations = Object.values(byStation).sort((a, b) => {
    const avgA = a.prices.reduce((s, p) => s + p.priceNok, 0) / a.prices.length;
    const avgB = b.prices.reduce((s, p) => s + p.priceNok, 0) / b.prices.length;
    return avgA - avgB;
  });

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <p className="text-xs text-slate-400 mt-1">{stations.length} stasjoner</p>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {stations.slice(0, 5).map(station => (
            <div key={station.name} className="p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-800">{station.name}</p>
                  <p className="text-xs text-slate-500">{station.chain} • {station.city}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-slate-800">
                    {(station.prices.reduce((s, p) => s + p.priceNok, 0) / station.prices.length).toFixed(2)} kr
                  </p>
                  <p className="text-xs text-slate-400">snitt</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}