import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Fuel, MapPin, ChevronRight, TrendingDown } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

const PUMP_RADIUS_KM = 0.15; // 150m — "at pump" threshold

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

function distLabel(km) {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}

/**
 * PumpModeCard — shown when user is within 150m of a known station.
 *
 * Optional future props (not required now):
 *   estimatedSavingsText  — e.g. "Du sparte ~45 kr sist uke"
 *   contributionImpactText — e.g. "23 brukere brukte prisene dine"
 *   lastLoggedAt          — ISO date string of user's last log at this station
 */
export default function PumpModeCard({
  onActivate,
  estimatedSavingsText,
  contributionImpactText,
  lastLoggedAt,
}) {
  const [station, setStation] = useState(null);
  const [distKm, setDistKm] = useState(null);
  const [step, setStep] = useState("idle");

  // GPS + station detection — unchanged
  useEffect(() => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;

        const stations = await base44.entities.Station.list("-created_date", 2000);
        const nearby = stations
          .filter((s) => s.latitude && s.longitude && s.status !== "archived_duplicate")
          .map((s) => ({
            ...s,
            _distKm: haversineKm(latitude, longitude, s.latitude, s.longitude),
          }))
          .filter((s) => s._distKm <= PUMP_RADIUS_KM)
          .sort((a, b) => a._distKm - b._distKm);

        if (nearby.length === 0) {
          setStep("hidden");
          onActivate?.(false);
          return;
        }

        const nearest = nearby[0];
        setStation(nearest);
        onActivate?.(true);
        setDistKm(nearest._distKm);
      },
      () => { setStep("hidden"); onActivate?.(false); },
      { timeout: 8000, maximumAge: 60000 }
    );
  }, []);

  if (step === "hidden") return null;
  if (!station) return null;

  return (
    <Card className="shadow-md border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50 mb-5">
      <CardContent className="py-4 px-4">
        {/* Header — station identity */}
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
            <Fuel size={15} className="text-orange-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-800 truncate">{station.name}</p>
            <p className="text-xs text-slate-500 flex items-center gap-1">
              <MapPin size={10} />
              {distLabel(distKm)}
              {station.chain && (
                <span className="text-slate-400">· {station.chain}</span>
              )}
            </p>
          </div>
          <span className="text-xs bg-orange-100 text-orange-700 font-semibold px-2 py-0.5 rounded-full shrink-0">
            Pumpe i nærheten
          </span>
        </div>

        {/* Motivational context */}
        <div className="mb-3 px-1">
          {/* Optional savings hook — only rendered when prop is provided, never calculated here */}
          {estimatedSavingsText && (
            <div className="mb-2 flex items-center gap-1.5 text-xs text-green-700 font-medium bg-green-50 border border-green-100 rounded-lg px-2.5 py-1.5">
              <TrendingDown size={12} className="shrink-0" />
              {estimatedSavingsText}
            </div>
          )}

          <p className="text-xs text-slate-600 leading-relaxed">
            Registrer prisen her – så blir prisene rundt deg mer treffsikre neste gang du fyller.
          </p>
          {contributionImpactText && (
            <p className="mt-1 text-xs text-slate-400">{contributionImpactText}</p>
          )}
        </div>

        {/* Primary CTA */}
        <Link to={createPageUrl("LogPrice")}>
          <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold gap-2 text-sm">
            Registrer prisen her nå
            <ChevronRight size={15} />
          </Button>
        </Link>

        {/* Subtext — low friction, reinforces habit */}
        <p className="text-center text-xs text-slate-400 mt-2">
          Ta bilde av prisskiltet — tar under 10 sekunder
        </p>
      </CardContent>
    </Card>
  );
}