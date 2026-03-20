import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Navigation, Fuel, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { nb } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import SharePriceButton from "@/components/shared/SharePriceButton";

const RADIUS_KM = 10;

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
  const [gpsState, setGpsState] = useState("pending"); // pending | ok | denied | unavailable
  const [userCoords, setUserCoords] = useState(null);
  const [stations, setStations] = useState([]);
  const [prices, setPrices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nearbyResults, setNearbyResults] = useState([]);

  // Get GPS
  useEffect(() => {
    if (!navigator.geolocation) {
      setGpsState("unavailable");
      setLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        setGpsState("ok");
      },
      () => {
        setGpsState("denied");
        setLoading(false);
      },
      { timeout: 8000 }
    );
  }, []);

  // Load stations, then query FuelPrice per nearby station to avoid global-limit truncation
  useEffect(() => {
    if (gpsState !== "ok" || !userCoords) return;
    setLoading(true);
    base44.entities.Station.list("-created_date", 2000)
      .then((stationsData) => {
        setStations(stationsData);

        // Determine nearby station IDs up-front so we query only relevant stations.
        // This mirrors StationDetails' per-stationId query and avoids the global
        // 1000-row truncation bias that can hide fresh local rows.
        const nearbyIds = stationsData
          .filter((s) => s.id && s.latitude && s.longitude)
          .filter(
            (s) =>
              haversineKm(userCoords.lat, userCoords.lon, s.latitude, s.longitude) <=
              RADIUS_KM
          )
          .map((s) => s.id);

        if (nearbyIds.length === 0) {
          setPrices([]);
          setLoading(false);
          return;
        }

        return Promise.all(
          nearbyIds.map((id) =>
            base44.entities.FuelPrice.filter(
              { stationId: id, fuelType: selectedFuel },
              "-fetchedAt",
              20
            )
          )
        ).then((arrays) => setPrices(arrays.flat()));
      })
      .finally(() => setLoading(false));
  }, [gpsState, selectedFuel, userCoords]);

  // Compute nearby results whenever data changes
  useEffect(() => {
    if (!userCoords || !stations.length || !prices.length) {
      setNearbyResults([]);
      return;
    }

    // Build a stationId -> station map
    const stationMap = {};
    stations.forEach((s) => {
      if (s.id) stationMap[s.id] = s;
    });

    // Filter prices:
    // - must be station_level or user_reported with matched_station_id
    // - must have a stationId linking to a Station with lat/lon
    // - exclude no_safe_station_match
    // - exclude suspect prices
    const eligible = prices.filter((p) => {
      if (p.plausibilityStatus !== "realistic_price") return false;
      if (p.station_match_status === "no_safe_station_match") return false;
      if (!p.stationId) return false;
      if (p.priceType === "national_average" || p.priceType === "regional_average") return false;
      const station = stationMap[p.stationId];
      if (!station || !station.latitude || !station.longitude) return false;
      return true;
    });

    // Compute distance and filter by radius
    const withDistance = eligible.map((p) => {
      const station = stationMap[p.stationId];
      const dist = haversineKm(userCoords.lat, userCoords.lon, station.latitude, station.longitude);
      return { ...p, _station: station, _distanceKm: dist };
    }).filter((p) => p._distanceKm <= RADIUS_KM);

    // Deduplicate: keep freshest price per station (for selected fuel)
    const byStation = {};
    withDistance.forEach((p) => {
      const key = p.stationId;
      if (!byStation[key] || new Date(p.fetchedAt) > new Date(byStation[key].fetchedAt)) {
        byStation[key] = p;
      }
    });

    // Sort: cheapest first, then nearest
    const sorted = Object.values(byStation).sort((a, b) => {
      if (a.priceNok !== b.priceNok) return a.priceNok - b.priceNok;
      return a._distanceKm - b._distanceKm;
    });

    setNearbyResults(sorted.slice(0, 8));
  }, [userCoords, stations, prices]);

  // --- Render states ---

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
          <span className="ml-auto text-xs font-normal text-slate-400">innen {RADIUS_KM} km</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {nearbyResults.length === 0 ? (
          <div className="text-sm text-slate-400 py-3">
            {prices.length === 0
              ? "Ingen priser funnet i nærheten akkurat nå"
              : `For lite datagrunnlag i området (${RADIUS_KM} km radius)`}
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {nearbyResults.map((p, i) => {
              const src = sourceLabel[p.sourceName] || { text: p.sourceName, color: "bg-slate-100 text-slate-500" };
              const distText = p._distanceKm < 1
                ? `${Math.round(p._distanceKm * 1000)} m`
                : `${p._distanceKm.toFixed(1)} km`;
              const fuelLabel = fuelTypeLabel[p.fuelType] || p.fuelType;
              const updatedText = p.fetchedAt
                ? formatDistanceToNow(new Date(p.fetchedAt), { addSuffix: true, locale: nb })
                : null;

              return (
                <div key={p.id} className="flex items-center gap-3 py-3 cursor-pointer hover:bg-slate-50 rounded-lg px-1 -mx-1 transition-colors" onClick={() => navigate(createPageUrl(`StationDetails?stationId=${p.stationId}`))}>

                  <span className="text-sm font-bold text-slate-400 w-4 text-center">{i + 1}</span>
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
        )}
        {nearbyResults.length > 0 && nearbyResults.length < 3 && (
          <p className="text-xs text-slate-400 mt-2 border-t border-slate-100 pt-2">
            Kun {nearbyResults.length} stasjon{nearbyResults.length !== 1 ? "er" : ""} med {fuelTypeLabel[selectedFuel] || selectedFuel}-pris funnet innen {RADIUS_KM} km.
          </p>
        )}
      </CardContent>
    </Card>
  );
}