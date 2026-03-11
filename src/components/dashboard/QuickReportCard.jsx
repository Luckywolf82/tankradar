import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Zap, CheckCircle, ChevronRight } from "lucide-react";

const CONFIDENT_RADIUS_KM = 0.3;  // single-station confidence threshold
const SEARCH_RADIUS_KM = 1.0;

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

export default function QuickReportCard() {
  const [gpsState, setGpsState] = useState("pending"); // pending | ok | denied | unavailable
  const [userCoords, setUserCoords] = useState(null);
  const [nearbyStations, setNearbyStations] = useState([]); // sorted by distance
  const [selectedStation, setSelectedStation] = useState(null);
  const [step, setStep] = useState("idle"); // idle | pick-station | pick-fuel | enter-price | submitting | success
  const [selectedFuel, setSelectedFuel] = useState(null);
  const [priceInput, setPriceInput] = useState("");
  const [error, setError] = useState(null);
  const priceRef = useRef(null);

  // GPS
  useEffect(() => {
    if (!navigator.geolocation) {
      setGpsState("unavailable");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        setGpsState("ok");
      },
      () => setGpsState("denied"),
      { timeout: 8000, maximumAge: 60000 }
    );
  }, []);

  // Load stations when GPS ok
  useEffect(() => {
    if (gpsState !== "ok" || !userCoords) return;
    base44.entities.Station.list("-created_date", 2000).then((stations) => {
      const withDist = stations
        .filter((s) => s.latitude && s.longitude && s.status !== "archived_duplicate")
        .map((s) => ({
          ...s,
          _distKm: haversineKm(userCoords.lat, userCoords.lon, s.latitude, s.longitude),
        }))
        .filter((s) => s._distKm <= SEARCH_RADIUS_KM)
        .sort((a, b) => a._distKm - b._distKm)
        .slice(0, 5);
      setNearbyStations(withDist);
    });
  }, [gpsState, userCoords]);

  // Focus price input when entering that step
  useEffect(() => {
    if (step === "enter-price" && priceRef.current) {
      setTimeout(() => priceRef.current?.focus(), 100);
    }
  }, [step]);

  const handleFuelTap = (fuelKey) => {
    setSelectedFuel(fuelKey);
    setStep("enter-price");
    setPriceInput("");
    setError(null);
  };

  const handleStationSelect = (station) => {
    setSelectedStation(station);
    setStep("pick-fuel");
  };

  const handleStartReport = () => {
    if (nearbyStations.length === 0) return;
    const nearest = nearbyStations[0];
    // If nearest is within confident radius and no close competitor, skip picker
    const confident =
      nearbyStations.length === 1 ||
      (nearest._distKm <= CONFIDENT_RADIUS_KM &&
        (nearbyStations[1]?._distKm ?? 999) - nearest._distKm > 0.1);
    if (confident) {
      setSelectedStation(nearest);
      setStep("pick-fuel");
    } else {
      setStep("pick-station");
    }
  };

  const handleSubmit = async () => {
    const parsed = parseFloat(priceInput.replace(",", "."));
    if (!parsed || parsed < 10 || parsed > 30) {
      setError("Skriv inn en realistisk pris (10–30 kr)");
      return;
    }
    setStep("submitting");
    setError(null);

    const now = new Date().toISOString();
    const user = await base44.auth.me().catch(() => null);

    await base44.entities.FuelPrice.create({
      stationId: selectedStation.id,
      station_name: selectedStation.name,
      station_chain: selectedStation.chain || null,
      fuelType: selectedFuel,
      priceNok: parsed,
      priceType: "user_reported",
      sourceName: "user_reported",
      fetchedAt: now,
      sourceUpdatedAt: now,
      sourceFrequency: "unknown",
      confidenceScore: 0.7,
      confidenceReason: "QuickReportCard — user at pump",
      parserVersion: "quick_report_v1",
      plausibilityStatus: parsed >= 14 && parsed <= 26 ? "realistic_price" : "suspect_price_high",
      station_match_status: "matched_station_id",
      gps_latitude: userCoords?.lat ?? null,
      gps_longitude: userCoords?.lon ?? null,
      reportedByUserId: user?.email ?? null,
    });

    setStep("success");
    setTimeout(() => {
      setStep("idle");
      setSelectedStation(null);
      setSelectedFuel(null);
      setPriceInput("");
    }, 2500);
  };

  const reset = () => {
    setStep("idle");
    setSelectedStation(null);
    setSelectedFuel(null);
    setPriceInput("");
    setError(null);
  };

  // ── Render helpers ──

  if (gpsState === "denied" || gpsState === "unavailable") return null;

  if (gpsState === "pending" || nearbyStations.length === 0) {
    return (
      <Card className="shadow-sm border-green-100 bg-green-50 mb-5">
        <CardContent className="py-3 px-4 flex items-center gap-2 text-green-700 text-sm">
          <Zap size={15} className="shrink-0" />
          <span className="text-xs text-green-600">
            {gpsState === "pending" ? "Finner posisjon…" : "Ingen stasjoner funnet i nærheten (1 km)"}
          </span>
        </CardContent>
      </Card>
    );
  }

  // ── SUCCESS ──
  if (step === "success") {
    return (
      <Card className="shadow-sm border-green-200 bg-green-50 mb-5">
        <CardContent className="py-4 px-4 flex items-center gap-3">
          <CheckCircle size={20} className="text-green-600 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-green-800">Pris rapportert!</p>
            <p className="text-xs text-green-600">{selectedStation?.name} · {FUEL_TYPES.find(f => f.key === selectedFuel)?.label} · {priceInput} kr/l</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const nearest = nearbyStations[0];

  // ── IDLE — show quick-report prompt ──
  if (step === "idle") {
    return (
      <Card className="shadow-sm border-green-100 mb-5">
        <CardContent className="py-3 px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap size={15} className="text-green-600 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-slate-800">{nearest.name}</p>
                <p className="text-xs text-slate-500 flex items-center gap-1">
                  <MapPin size={10} /> {distLabel(nearest._distKm)}
                  {nearest.chain && <span className="text-slate-400">· {nearest.chain}</span>}
                </p>
              </div>
            </div>
            <Button
              size="sm"
              className="bg-green-600 hover:bg-green-700 text-white h-8 text-xs px-3 gap-1"
              onClick={handleStartReport}
            >
              Spar på drivstoff <ChevronRight size={13} />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ── PICK STATION ──
  if (step === "pick-station") {
    return (
      <Card className="shadow-sm border-green-100 mb-5">
        <CardContent className="py-4 px-4">
          <p className="text-sm font-semibold text-slate-700 mb-3">Hvilken stasjon er du på?</p>
          <div className="space-y-2">
            {nearbyStations.map((s) => (
              <button
                key={s.id}
                onClick={() => handleStationSelect(s)}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg border border-slate-200 bg-white hover:border-green-400 hover:bg-green-50 transition-colors text-left"
              >
                <div>
                  <p className="text-sm font-medium text-slate-800">{s.name}</p>
                  {s.chain && <p className="text-xs text-slate-400">{s.chain}</p>}
                </div>
                <span className="text-xs text-slate-400 ml-3 shrink-0">{distLabel(s._distKm)}</span>
              </button>
            ))}
            <button
              onClick={reset}
              className="text-xs text-slate-400 hover:text-slate-600 mt-1 underline"
            >
              Avbryt
            </button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ── PICK FUEL ──
  if (step === "pick-fuel") {
    return (
      <Card className="shadow-sm border-green-100 mb-5">
        <CardContent className="py-4 px-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-semibold text-slate-800">{selectedStation?.name}</p>
              <p className="text-xs text-slate-400">{distLabel(selectedStation?._distKm ?? 0)}</p>
            </div>
            <button onClick={reset} className="text-xs text-slate-400 hover:text-slate-600 underline">Avbryt</button>
          </div>
          <div className="flex gap-2 flex-wrap">
            {FUEL_TYPES.map((f) => (
              <button
                key={f.key}
                onClick={() => handleFuelTap(f.key)}
                className="px-4 py-2 rounded-lg border border-slate-200 bg-white hover:border-green-500 hover:bg-green-50 text-sm font-medium text-slate-700 transition-colors"
              >
                {f.label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // ── ENTER PRICE ──
  if (step === "enter-price" || step === "submitting") {
    const fuelLabel = FUEL_TYPES.find(f => f.key === selectedFuel)?.label;
    return (
      <Card className="shadow-sm border-green-200 mb-5">
        <CardContent className="py-4 px-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-semibold text-slate-800">{selectedStation?.name}</p>
              <p className="text-xs text-slate-500">{fuelLabel}</p>
            </div>
            <button onClick={reset} className="text-xs text-slate-400 hover:text-slate-600 underline">Avbryt</button>
          </div>
          <div className="flex gap-2 items-center">
            <div className="relative flex-1">
              <input
                ref={priceRef}
                type="number"
                inputMode="decimal"
                step="0.01"
                min="10"
                max="30"
                placeholder="18.99"
                value={priceInput}
                onChange={(e) => { setPriceInput(e.target.value); setError(null); }}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-lg font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent"
                disabled={step === "submitting"}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">kr/l</span>
            </div>
            <Button
              onClick={handleSubmit}
              disabled={!priceInput || step === "submitting"}
              className="bg-green-600 hover:bg-green-700 text-white h-10 px-5 shrink-0"
            >
              {step === "submitting" ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : "Send"}
            </Button>
          </div>
          {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
        </CardContent>
      </Card>
    );
  }

  return null;
}