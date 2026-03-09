import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { nb } from "date-fns/locale";

const fuelTypeLabel = {
  gasoline_95: "Bensin 95",
  gasoline_98: "Bensin 98",
  diesel: "Diesel",
  bensin_95: "Bensin 95",
  bensin_98: "Bensin 98",
  diesel_premium: "Diesel+",
  other: "Annet",
};

const sourceLabel = {
  GooglePlaces: { text: "Google", color: "bg-blue-100 text-blue-700" },
  user_reported: { text: "Brukerpris", color: "bg-green-100 text-green-700" },
  FuelFinder: { text: "FuelFinder", color: "bg-orange-100 text-orange-700" },
};

const haversineKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export default function RecentPricesFeed() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [regional, setRegional] = useState(false);
  const [hasLocation, setHasLocation] = useState(null); // null=pending, true, false

  useEffect(() => {
    let userLocation = null;

    const getUserLocation = () =>
      new Promise((resolve) => {
        if (!navigator.geolocation) return resolve(null);
        const timeout = setTimeout(() => resolve(null), 4000);
        navigator.geolocation.getCurrentPosition(
          (pos) => { clearTimeout(timeout); resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }); },
          () => { clearTimeout(timeout); resolve(null); }
        );
      });

    Promise.all([
      getUserLocation(),
      base44.entities.FuelPrice.filter({ plausibilityStatus: "realistic_price" }, "-fetchedAt", 200),
      base44.entities.Station.list("-name", 2000),
    ]).then(([location, prices, stations]) => {
      userLocation = location;
      setHasLocation(!!location);

      const stationMap = {};
      stations.forEach((s) => { stationMap[s.id] = s; });

      // Require location — without it, don't show any prices
      if (!location) {
        setItems([]);
        return;
      }

      const nearbyStationIds = new Set(
        stations
          .filter((s) => s.latitude && s.longitude &&
            haversineKm(location.lat, location.lon, s.latitude, s.longitude) <= 50)
          .map((s) => s.id)
      );
      setRegional(nearbyStationIds.size > 0);

      const filtered = prices.filter((p) => {
        if (!p.stationId) return false;
        if (p.priceType === "national_average" || p.priceType === "regional_average") return false;
        if (p.station_match_status === "no_safe_station_match") return false;
        if (p.station_match_status === "review_needed_station_match") return false;
        if (!stationMap[p.stationId]) return false;
        if (!nearbyStationIds.has(p.stationId)) return false;
        return true;
      });

      const result = filtered.slice(0, 8).map((p) => ({
        ...p,
        _station: stationMap[p.stationId],
      }));

      setItems(result);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return null;

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Clock size={16} className="text-slate-400" />
          Siste rapporterte priser
          {regional && <span className="text-xs font-normal text-slate-400 ml-1">· i nærheten</span>}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-slate-400 py-3">Ingen ferske priser å vise akkurat nå</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {items.map((p) => {
              const src = sourceLabel[p.sourceName] || { text: p.sourceName, color: "bg-slate-100 text-slate-500" };
              const timeAgo = p.fetchedAt
                ? formatDistanceToNow(new Date(p.fetchedAt), { addSuffix: true, locale: nb })
                : null;
              const locationText = p._station?.city || p.locationLabel || null;
              const fuelLabel = fuelTypeLabel[p.fuelType] || p.fuelType;

              return (
                <div key={p.id} className="flex items-center gap-3 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">
                      {p._station.name}
                    </p>
                    <div className="flex items-center gap-2 flex-wrap mt-0.5">
                      <span className="text-xs text-slate-500">{fuelLabel}</span>
                      {locationText && (
                        <span className="text-xs text-slate-400">{locationText}</span>
                      )}
                      {timeAgo && (
                        <span className="text-xs text-slate-400">{timeAgo}</span>
                      )}
                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${src.color}`}>
                        {src.text}
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-lg font-bold text-slate-800">{p.priceNok.toFixed(2)}</p>
                    <p className="text-xs text-slate-400">kr/l</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}