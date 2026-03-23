import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Fuel, MapPin, Camera } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

const PUMP_RADIUS_KM = 0.15; // 150m — "at pump" threshold
const FUEL_TYPES = [
  { key: "gasoline_95", label: "Bensin 95" },
  { key: "gasoline_98", label: "Bensin 98" },
  { key: "diesel",      label: "Diesel" },
];

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

export default function PumpModeCard({ onActivate }) {
  const [station, setStation] = useState(null);        // nearest within PUMP_RADIUS_KM
  const [distKm, setDistKm] = useState(null);
  const [userCoords, setUserCoords] = useState(null);
  const [step, setStep] = useState("idle");            // idle | hidden

  // GPS + station detection
  useEffect(() => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setUserCoords({ lat: latitude, lon: longitude });

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

  const handleSubmit = async () => {
    const filled = FUEL_TYPES.filter((f) => {
      const val = parseFloat(prices[f.key]?.replace(",", "."));
      return val >= 10 && val <= 30;
    });

    if (filled.length === 0) {
      setError("Fyll inn minst én pris (10–30 kr)");
      return;
    }

    setStep("submitting");
    setError(null);

    const now = new Date().toISOString();
    const user = await base44.auth.me().catch(() => null);

    await Promise.all(
      filled.map((f) => {
        const parsed = parseFloat(prices[f.key].replace(",", "."));
        return base44.entities.FuelPrice.create({
          stationId: station.id,
          station_name: station.name,
          station_chain: station.chain || null,
          fuelType: f.key,
          priceNok: parsed,
          priceType: "user_reported",
          sourceName: "user_reported",
          fetchedAt: now,
          sourceUpdatedAt: now,
          sourceFrequency: "unknown",
          confidenceScore: 0.75,
          confidenceReason: "PumpModeCard — user at pump, multi-fuel",
          parserVersion: "pump_mode_v1",
          plausibilityStatus:
            parsed >= 14 && parsed <= 26 ? "realistic_price" : "suspect_price_high",
          station_match_status: "matched_station_id",
          gps_latitude: userCoords?.lat ?? null,
          gps_longitude: userCoords?.lon ?? null,
          reportedByUserId: user?.email ?? null,
        });
      })
    );

    setStep("success");
    setTimeout(() => setStep("hidden"), 3000);
  };

  if (step === "hidden") return null;

  // Success state
  if (step === "success") {
    return (
      <Card className="shadow-md border-green-200 bg-green-50 mb-5">
        <CardContent className="py-4 px-4 flex items-center gap-3">
          <CheckCircle size={22} className="text-green-600 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-green-800">Priser rapportert!</p>
            <p className="text-xs text-green-600">{station?.name}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Loading / station not yet resolved
  if (!station) return null;

  return (
    <Card className="shadow-md border-orange-200 bg-gradient-to-r from-orange-50 to-amber-50 mb-5">
      <CardContent className="py-4 px-4">
        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <Fuel size={16} className="text-orange-600 shrink-0" />
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
            Pump-modus
          </span>
        </div>

        {/* Fuel price inputs */}
        <div className="space-y-2 mb-4">
          {FUEL_TYPES.map((f) => (
            <div key={f.key} className="flex items-center gap-3">
              <span className="text-sm text-slate-700 w-24 shrink-0">{f.label}</span>
              <div className="relative flex-1">
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="10"
                  max="30"
                  placeholder="—"
                  value={prices[f.key]}
                  onChange={(e) => {
                    setPrices((prev) => ({ ...prev, [f.key]: e.target.value }));
                    setError(null);
                  }}
                  disabled={step === "submitting"}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent disabled:opacity-50"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">
                  kr/l
                </span>
              </div>
            </div>
          ))}
        </div>

        {error && <p className="text-xs text-red-600 mb-3">{error}</p>}

        <Button
          onClick={handleSubmit}
          disabled={step === "submitting"}
          className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold gap-2"
        >
          {step === "submitting" ? (
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <Fuel size={15} />
              Rapporter priser
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}