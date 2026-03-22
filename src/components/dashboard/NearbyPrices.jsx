import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Navigation, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { nb } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import SharePriceButton from "@/components/shared/SharePriceButton";
import { isStationPriceDisplayEligible } from "@/utils/fuelPriceEligibility";
import { resolveLatestPerStation, isFreshEnoughForNearbyRanking } from "@/utils/currentPriceResolver";

const normalizeFuel = (f) => {
  if (!f) return f;

  const map = {
    bensin: "gasoline_95",
    "bensin 95": "gasoline_95",
    "95": "gasoline_95",
    gasoline_95: "gasoline_95",

    "98": "gasoline_98",
    gasoline_98: "gasoline_98",

    diesel: "diesel",
    diesel_premium: "diesel_premium",
  };

  return map[f.toLowerCase()] || f;
};

const NEARBY_RADIUS_DEFAULT_KM = 10;
const NEARBY_RADIUS_STORAGE_KEY = "tankradar_nearby_radius_km";
const NEARBY_RADIUS_OPTIONS = [2, 5, 10, 20, 50];

function getNearbyRadiusKm() {
  try {
    const raw = localStorage.getItem(NEARBY_RADIUS_STORAGE_KEY);
    const val = parseFloat(raw);
    return isFinite(val) && val > 0 ? val : NEARBY_RADIUS_DEFAULT_KM;
  } catch {
    return NEARBY_RADIUS_DEFAULT_KM;
  }
}

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

const sourceLabel = {
  GooglePlaces: { text: "Google", color: "bg-blue-100 text-blue-700" },
  user_reported: { text: "Brukerpris", color: "bg-green-100 text-green-700" },
  FuelFinder: { text: "FuelFinder", color: "bg-orange-100 text-orange-700" },
  GlobalPetrolPrices: { text: "GPP", color: "bg-slate-100 text-slate-600" },
};

const fuelTypeLabel = {
  gasoline_95: "Bensin 95",
  gasoline_98: "Bensin 98",
  diesel: "Diesel",
  bensin_95: "Bensin 95",
  bensin_98: "Bensin 98",
  diesel_premium: "Diesel+",
};

export default function NearbyPrices({ selectedFuel }) {
  const navigate = useNavigate();
  const [radiusKm, setRadiusKm] = useState(getNearbyRadiusKm());
  const [gpsState, setGpsState] = useState("pending"); // pending | ok | denied | unavailable
  const [userCoords, setUserCoords] = useState(null);
  const [stations, setStations] = useState([]);
  const [prices, setPrices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nearbyResults, setNearbyResults] = useState([]);
  const [staleFallbackResults, setStaleFallbackResults] = useState([]);

  useEffect(() => {
    if (!navigator.geolocation) {
      setGpsState("unavailable");
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserCoords({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
        });
        setGpsState("ok");
      },
      () => {
        setGpsState("denied");
        setLoading(false);
      },
      { timeout: 8000 }
    );
  }, []);

  useEffect(() => {
    if (gpsState !== "ok" || !userCoords) return;

    setLoading(true);

    base44.entities.Station.list("-created_date", 2000)
      .then((stationsData) => {
        setStations(stationsData);

        const nearbyIds = stationsData
          .filter((s) => s.id && s.latitude && s.longitude)
          .filter(
            (s) =>
              haversineKm(userCoords.lat, userCoords.lon, s.latitude, s.longitude) <= radiusKm
          )
          .map((s) => s.id);

        if (nearbyIds.length === 0) {
          setPrices([]);
          setLoading(false);
          return;
        }

        const normalizedFuel = normalizeFuel(selectedFuel);

        return Promise.all(
          nearbyIds.map((id) =>
            base44.entities.FuelPrice.filter(
              { stationId: id, fuelType: normalizedFuel },
              "-fetchedAt",
              20
            )
          )
        ).then((arrays) => setPrices(arrays.flat()));
      })
      .finally(() => setLoading(false));
  }, [gpsState, selectedFuel, userCoords, radiusKm]);

  useEffect(() => {
    if (!userCoords || !stations.length || !prices.length) {
      setNearbyResults([]);
      setStaleFallbackResults([]);
      return;
    }

    const stationMap = {};
    stations.forEach((s) => {
      if (s.id) stationMap[s.id] = s;
    });

    const eligible = prices.filter((p) => {
      if (!isStationPriceDisplayEligible(p, { requireMatchedStationId: true })) return false;
      const station = stationMap[p.stationId];
      if (!station || !station.latitude || !station.longitude) return false;
      return true;
    });

    const withDistance = eligible
      .map((p) => {
        const station = stationMap[p.stationId];
        const dist = haversineKm(
          userCoords.lat,
          userCoords.lon,
          station.latitude,
          station.longitude
        );
        return { ...p, _station: station, _distanceKm: dist };
      })
      .filter((p) => p._distanceKm <= radiusKm);

    const byStation = resolveLatestPerStation(withDistance);
    const latestArr = Object.values(byStation);

    const fresh = latestArr.filter(isFreshEnoughForNearbyRanking);

    const sorted = fresh.sort((a, b) => {
      if (a.priceNok !== b.priceNok) return a.priceNok - b.priceNok;
      return a._distanceKm - b._distanceKm;
    });

    setNearbyResults(sorted.slice(0, 8));

    const staleFallback =
      fresh.length === 0 && latestArr.length > 0
        ? [...latestArr].sort((a, b) => a._distanceKm - b._distanceKm).slice(0, 8)
        : [];

    setStaleFallbackResults(staleFallback);
  }, [userCoords, stations, prices, radiusKm]);

  if (gpsState === "denied" || gpsState === "unavailable") {
    return (
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Navigation size={16} className="text-blue-500" />
            Billigste nær deg
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 py-3 text-slate-500">
            <MapPin size={18} className="text-slate-400" />
            <span className="text-sm">Tillat posisjon for å se priser nær deg</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (gpsState === "pending" || loading) {
    return (
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Navigation size={16} className="text-blue-500" />
            Billigste nær deg
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-slate-400 text-sm py-2">
            <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
            Henter posisjon og priser…
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Navigation size={16} className="text-blue-500" />
          Billigste nær deg
          <select
            value={radiusKm}
            onChange={(e) => {
              const val = Number(e.target.value);
              localStorage.setItem(NEARBY_RADIUS_STORAGE_KEY, String(val));
              setRadiusKm(val);
            }}
            aria-label="Velg søkeradius i kilometer"
            className="ml-auto text-xs font-normal text-slate-500 bg-transparent border border-slate-200 rounded px-1.5 py-0.5 cursor-pointer hover:border-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
          >
            {NEARBY_RADIUS_OPTIONS.map((km) => (
              <option key={km} value={km}>
                innen {km} km
              </option>
            ))}
          </select>
        </CardTitle>
      </CardHeader>

      <CardContent>
        {nearbyResults.length === 0 && staleFallbackResults.length === 0 ? (
          <div className="text-sm text-slate-400 py-3">
            {prices.length === 0
              ? "Ingen priser funnet i nærheten akkurat nå"
              : `Ingen priser funnet innen ${radiusKm} km`}
          </div>
        ) : nearbyResults.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {nearbyResults.map((p, i) => {
              const src = sourceLabel[p.sourceName] || {
                text: p.sourceName,
                color: "bg-slate-100 text-slate-500",
              };

              const distText =
                p._distanceKm < 1
                  ? `${Math.round(p._distanceKm * 1000)} m`
                  : `${p._distanceKm.toFixed(1)} km`;

              const updatedText = p.fetchedAt
                ? formatDistanceToNow(new Date(p.fetchedAt), {
                    addSuffix: true,
                    locale: nb,
                  })
                : null;

              return (
                <div
                  key={p.id}
                  className="flex items-center gap-3 py-3 cursor-pointer hover:bg-slate-50 rounded-lg px-1 -mx-1 transition-colors"
                  onClick={() => navigate(createPageUrl(`StationDetails?stationId=${p.stationId}`))}
                >
                  <span className="text-sm font-bold text-slate-400 w-4 text-center">
                    {i + 1}
                  </span>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">
                      {p._station.name}
                    </p>

                    <div className="flex items-center gap-2 flex-wrap mt-0.5">
                      <span className="text-xs text-slate-500 flex items-center gap-0.5">
                        <MapPin size={10} /> {distText}
                      </span>

                      {p._station.chain && (
                        <span className="text-xs text-slate-400">{p._station.chain}</span>
                      )}

                      {updatedText && (
                        <span className="text-xs text-slate-400 flex items-center gap-0.5">
                          <Clock size={10} /> {updatedText}
                        </span>
                      )}

                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${src.color}`}>
                        {src.text}
                      </span>
                    </div>
                  </div>

                  <div className="text-right shrink-0 flex items-center gap-1">
                    <SharePriceButton
                      stationId={p.stationId}
                      stationName={p._station.name}
                      priceNok={p.priceNok}
                      fuelType={p.fuelType}
                    />
                    <div>
                      <p className="text-lg font-bold text-green-700">{p.priceNok.toFixed(2)}</p>
                      <p className="text-xs text-slate-400">kr/l</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-2 mb-2 pb-1 border-b border-amber-100">
              <Clock size={13} className="text-amber-500" />
              <span className="text-xs font-semibold text-amber-700">
                Siste kjente priser nær deg
              </span>
              <span className="text-xs text-amber-500">(ikke ferske priser)</span>
            </div>

            <div className="divide-y divide-slate-100">
              {staleFallbackResults.map((p) => {
                const src = sourceLabel[p.sourceName] || {
                  text: p.sourceName,
                  color: "bg-slate-100 text-slate-500",
                };

                const distText =
                  p._distanceKm < 1
                    ? `${Math.round(p._distanceKm * 1000)} m`
                    : `${p._distanceKm.toFixed(1)} km`;

                const updatedText = p.fetchedAt
                  ? formatDistanceToNow(new Date(p.fetchedAt), {
                      addSuffix: true,
                      locale: nb,
                    })
                  : null;

                return (
                  <div
                    key={p.id}
                    className="flex items-center gap-3 py-3 cursor-pointer hover:bg-slate-50 rounded-lg px-1 -mx-1 transition-colors"
                    onClick={() => navigate(createPageUrl(`StationDetails?stationId=${p.stationId}`))}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">
                        {p._station.name}
                      </p>

                      <div className="flex items-center gap-2 flex-wrap mt-0.5">
                        <span className="text-xs text-slate-500 flex items-center gap-0.5">
                          <MapPin size={10} /> {distText}
                        </span>

                        {p._station.chain && (
                          <span className="text-xs text-slate-400">{p._station.chain}</span>
                        )}

                        {updatedText && (
                          <span className="text-xs text-slate-400 flex items-center gap-0.5">
                            <Clock size={10} /> {updatedText}
                          </span>
                        )}

                        <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${src.color}`}>
                          {src.text}
                        </span>

                        <span className="text-xs px-1.5 py-0.5 rounded-full font-medium bg-amber-100 text-amber-700">
                          Eldre pris
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0 flex items-center gap-1">
                      <SharePriceButton
                        stationId={p.stationId}
                        stationName={p._station.name}
                        priceNok={p.priceNok}
                        fuelType={p.fuelType}
                      />
                      <div>
                        <p className="text-lg font-bold text-amber-700">{p.priceNok.toFixed(2)}</p>
                        <p className="text-xs text-slate-400">kr/l</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {nearbyResults.length > 0 && nearbyResults.length < 3 && (
          <p className="text-xs text-slate-400 mt-2 border-t border-slate-100 pt-2">
            Kun {nearbyResults.length} stasjon{nearbyResults.length !== 1 ? "er" : ""} med{" "}
            {fuelTypeLabel[selectedFuel] || selectedFuel}-pris funnet innen {radiusKm} km.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
