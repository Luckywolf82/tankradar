import React, { useState, useEffect } from "react";
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Navigation, TrendingDown, MapPin } from "lucide-react";

const AVG_TANK_LITERS = 50;

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function RouteSavingsCard({ selectedFuel = "gasoline_95" }) {
  const [state, setState] = useState("idle"); // idle | loading | ready | no_savings | error
  const [nearest, setNearest] = useState(null);
  const [cheaper, setCheaper] = useState(null);

  useEffect(() => {
    if (!navigator.geolocation) return;
    setState("loading");

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const [stations, prices] = await Promise.all([
            base44.entities.Station.filter({ status: "active" }, "-created_date", 500),
            base44.entities.FuelPrice.filter({ fuelType: selectedFuel }, "-fetchedAt", 500),
          ]);

          // Build a quick lookup: stationId → latest price
          const priceByStation = {};
          for (const p of prices) {
            if (!p.stationId || !p.priceNok) continue;
            if (!priceByStation[p.stationId] || p.fetchedAt > priceByStation[p.stationId].fetchedAt) {
              priceByStation[p.stationId] = p;
            }
          }

          // Annotate stations with distance + price
          const candidates = stations
            .filter(
              (s) =>
                s.latitude &&
                s.longitude &&
                priceByStation[s.id]
            )
            .map((s) => ({
              ...s,
              distKm: haversineKm(latitude, longitude, s.latitude, s.longitude),
              price: priceByStation[s.id].priceNok,
            }))
            .filter((s) => s.distKm <= 15)
            .sort((a, b) => a.distKm - b.distKm);

          if (candidates.length < 2) {
            setState("no_savings");
            return;
          }

          const nearestStation = candidates[0];
          // Find cheapest that's NOT the nearest
          const cheaperStation = [...candidates]
            .filter((s) => s.id !== nearestStation.id)
            .sort((a, b) => a.price - b.price)[0];

          if (!cheaperStation || cheaperStation.price >= nearestStation.price) {
            setState("no_savings");
            return;
          }

          const savingsPerTank = Math.round(
            (nearestStation.price - cheaperStation.price) * AVG_TANK_LITERS
          );

          if (savingsPerTank < 5) {
            setState("no_savings");
            return;
          }

          setNearest(nearestStation);
          setCheaper({ ...cheaperStation, savingsPerTank });
          setState("ready");
        } catch {
          setState("error");
        }
      },
      () => setState("error")
    );
  }, [selectedFuel]);

  if (state === "idle" || state === "loading" || state === "error" || state === "no_savings") {
    return null;
  }

  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${cheaper.latitude},${cheaper.longitude}&travelmode=driving`;
  const nearestLabel = [nearest.chain, nearest.areaLabel].filter(Boolean).join(" ") || nearest.name;
  const cheaperLabel = [cheaper.chain, cheaper.areaLabel].filter(Boolean).join(" ") || cheaper.name;

  return (
    <Card className="shadow-sm border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50 mb-5">
      <CardContent className="py-4 px-4">
        <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-3">Din rute</p>

        <div className="space-y-2 mb-3">
          <div className="flex items-start gap-2">
            <MapPin size={14} className="text-slate-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-slate-500">Vanlig stopp</p>
              <p className="text-sm font-medium text-slate-800">
                {nearestLabel} — {nearest.price.toFixed(2)} kr
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <TrendingDown size={14} className="text-green-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-slate-500">Billigere på ruten</p>
              <p className="text-sm font-medium text-slate-800">
                {cheaperLabel} — {cheaper.price.toFixed(2)} kr
                <span className="text-xs text-slate-400 ml-1">
                  ({cheaper.distKm.toFixed(1)} km)
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <TrendingDown size={14} className="text-green-700 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-slate-500">Du sparer</p>
              <p className="text-sm font-bold text-green-700">
                ≈{cheaper.savingsPerTank} kr per tank
              </p>
            </div>
          </div>
        </div>

        <a href={mapsUrl} target="_blank" rel="noopener noreferrer">
          <Button size="sm" className="bg-blue-600 hover:bg-blue-700 gap-1.5 w-full sm:w-auto">
            <Navigation size={14} />
            Naviger dit
          </Button>
        </a>
      </CardContent>
    </Card>
  );
}