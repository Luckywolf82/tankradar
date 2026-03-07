import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin } from "lucide-react";

export default function StationDiscoveryQueue() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.FuelPrice.filter({ station_match_status: "no_safe_station_match" }, "-created_date", 200)
      .then(setItems)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <Card className="mb-4">
      <CardContent className="pt-4 text-sm text-slate-400">Laster discovery-data...</CardContent>
    </Card>
  );

  // Grupper på station_name + station_chain som enkel clustering
  const groups = {};
  items.forEach(item => {
    const key = `${item.station_chain || "Ukjent kjede"}|||${item.station_name || "Ukjent navn"}`;
    if (!groups[key]) groups[key] = { station_chain: item.station_chain, station_name: item.station_name, count: 0, samples: [] };
    groups[key].count++;
    if (groups[key].samples.length < 2) groups[key].samples.push(item.locationLabel || item.station_match_notes || "–");
  });

  const sorted = Object.values(groups).sort((a, b) => b.count - a.count);

  return (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <div className="p-1.5 rounded-lg bg-purple-50">
            <MapPin size={16} className="text-purple-600" />
          </div>
          Station Discovery Queue
          <span className="ml-auto text-xs font-normal text-slate-400">{items.length} poster</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {sorted.length === 0 ? (
          <p className="text-sm text-slate-400">Ingen no_safe_station_match funnet.</p>
        ) : (
          <>
            <p className="text-xs text-slate-500 mb-3">
              Gruppert på stasjonsnavn + kjede. Placeholder for framtidig geospatial clustering.
            </p>
            <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
              {sorted.map((g, i) => (
                <div key={i} className="py-2.5 flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-slate-800">
                      {g.station_name || <span className="text-slate-400 italic">Ukjent navn</span>}
                    </p>
                    <p className="text-xs text-slate-500">
                      {g.station_chain || "Ukjent kjede"} — {g.samples[0]}
                    </p>
                  </div>
                  <span className="text-xs bg-purple-100 text-purple-700 rounded-full px-2 py-0.5 font-medium whitespace-nowrap">
                    {g.count} rapport{g.count !== 1 ? "er" : ""}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-400 mt-3">
              Begrensning: Ingen GPS-clustering ennå. Gruppering er kun basert på navn/kjede.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}