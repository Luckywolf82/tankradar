import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Navigation, Fuel, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { nb } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import SharePriceButton from "@/components/shared/SharePriceButton";
import { isStationPriceDisplayEligible } from "@/utils/fuelPriceEligibility";
import {
  resolveLatestPerStation,
  isFreshEnoughForNearbyRanking,
} from "@/utils/currentPriceResolver";

const NEARBY_RADIUS_DEFAULT_KM = 10;
const NEARBY_RADIUS_STORAGE_KEY = "tankradar_nearby_radius_km";

// Toggle to expose the pipeline debug panel (set to false to hide)
const DEBUG_NEARBY = true;

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
  const radiusKm = getNearbyRadiusKm();
  const [gpsState, setGpsState] = useState("pending"); // pending | ok | denied | unavailable
  const [userCoords, setUserCoords] = useState(null);
  const [stations, setStations] = useState([]);
  const [prices, setPrices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nearbyResults, setNearbyResults] = useState([]);
  const [debugInfo, setDebugInfo] = useState(null);

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
              radiusKm
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

      // --- DEBUG: partial pipeline info when data is incomplete ---
      if (DEBUG_NEARBY) {
        const sWithCoords = stations.filter((s) => s.id && s.latitude && s.longitude);
        const sInRadius = userCoords
          ? sWithCoords.filter(
              (s) =>
                haversineKm(userCoords.lat, userCoords.lon, s.latitude, s.longitude) <= radiusKm
            )
          : [];
        setDebugInfo({
          stations_total_loaded: stations.length,
          stations_with_id_and_coords: sWithCoords.length,
          stations_within_radius_prequery: sInRadius.length,
          fuelprice_rows_raw_fetched: prices.length,
          eligible_after_base_contract: 0,
          eligible_after_station_join_and_coords: 0,
          eligible_after_distance_filter: 0,
          latest_per_station_count: 0,
          fresh_after_7_day_filter: 0,
          final_sorted_count: 0,
          strongestGateLabel: null,
          strongestGateDrop: 0,
          sampleExcluded: [],
        });
      }
      // --- END DEBUG ---
      return;
    }

    // Build a stationId -> station map
    const stationMap = {};
    stations.forEach((s) => {
      if (s.id) stationMap[s.id] = s;
    });

    // Apply shared base display-eligibility contract with strict matched-station
    // requirement (NearbyPrices only — not applied in StationDetails).
    // This ensures current nearby ranking only uses rows that have an explicit
    // confirmed station match (station_match_status === "matched_station_id").
    // Then apply NearbyPrices-specific view rule: station must exist with valid
    // coordinates for distance calc.
    const eligible = prices.filter((p) => {
      if (!isStationPriceDisplayEligible(p, { requireMatchedStationId: true })) return false;
      const station = stationMap[p.stationId];
      if (!station || !station.latitude || !station.longitude) return false;
      return true;
    });

    // Compute distance and filter by radius
    const withDistance = eligible.map((p) => {
      const station = stationMap[p.stationId];
      const dist = haversineKm(userCoords.lat, userCoords.lon, station.latitude, station.longitude);
      return { ...p, _station: station, _distanceKm: dist };
    }).filter((p) => p._distanceKm <= radiusKm);

    // Use shared resolver: latest display-eligible row per station
    const byStation = resolveLatestPerStation(withDistance);
    const latestArr = Object.values(byStation);

    // NearbyPrices freshness policy: exclude very old rows from ranking so
    // they do not appear as "current nearby cheapest".  A fresh user_reported
    // row still wins; a 12-day-old row does not dominate the ranking.
    // stationHistory in StationDetails is unaffected — this filter only applies
    // to Nearby ranking and NOT to the display of last-known prices.
    const fresh = latestArr.filter(isFreshEnoughForNearbyRanking);

    // Sort: cheapest first, then nearest
    const sorted = fresh.sort((a, b) => {
      if (a.priceNok !== b.priceNok) return a.priceNok - b.priceNok;
      return a._distanceKm - b._distanceKm;
    });

    setNearbyResults(sorted.slice(0, 8));

    // --- DEBUG: full pipeline debug info ---
    if (DEBUG_NEARBY) {
      const sWithCoords = stations.filter((s) => s.id && s.latitude && s.longitude);
      const sInRadius = sWithCoords.filter(
        (s) => haversineKm(userCoords.lat, userCoords.lon, s.latitude, s.longitude) <= radiusKm
      );

      // Stage E (split from production's combined E+F): base contract only
      const eligE = prices.filter((p) =>
        isStationPriceDisplayEligible(p, { requireMatchedStationId: true })
      );
      // Stage F is the production `eligible` (E + station join + coords)
      // Stage G is `withDistance`, Stage H is `latestArr`, Stage I is `fresh`

      const gates = [
        {
          label: "D→E (base contract)",
          before: prices.length,
          after: eligE.length,
          excluded: prices.filter(
            (p) => !isStationPriceDisplayEligible(p, { requireMatchedStationId: true })
          ),
        },
        {
          label: "E→F (station join + coords)",
          before: eligE.length,
          after: eligible.length,
          excluded: eligE.filter((p) => {
            const s = stationMap[p.stationId];
            return !(s && s.latitude && s.longitude);
          }),
        },
        {
          label: "F→G (distance filter)",
          before: eligible.length,
          after: withDistance.length,
          excluded: eligible.filter((p) => {
            const s = stationMap[p.stationId];
            const dist = haversineKm(userCoords.lat, userCoords.lon, s.latitude, s.longitude);
            return dist > radiusKm;
          }),
        },
        {
          label: "G→H (dedup latest per station)",
          before: withDistance.length,
          after: latestArr.length,
          excluded: (() => {
            const kept = new Set(latestArr.map((r) => r.id));
            return withDistance.filter((r) => !kept.has(r.id));
          })(),
        },
        {
          label: "H→I (7-day freshness)",
          before: latestArr.length,
          after: fresh.length,
          excluded: latestArr.filter((r) => !isFreshEnoughForNearbyRanking(r)),
        },
      ];

      let maxDrop = 0;
      let strongestGate = null;
      for (const g of gates) {
        const drop = g.before - g.after;
        if (drop > maxDrop) {
          maxDrop = drop;
          strongestGate = g;
        }
      }

      setDebugInfo({
        stations_total_loaded: stations.length,
        stations_with_id_and_coords: sWithCoords.length,
        stations_within_radius_prequery: sInRadius.length,
        fuelprice_rows_raw_fetched: prices.length,
        eligible_after_base_contract: eligE.length,
        eligible_after_station_join_and_coords: eligible.length,
        eligible_after_distance_filter: withDistance.length,
        latest_per_station_count: latestArr.length,
        fresh_after_7_day_filter: fresh.length,
        final_sorted_count: sorted.slice(0, 8).length,
        strongestGateLabel: strongestGate?.label ?? null,
        strongestGateDrop: maxDrop,
        sampleExcluded: strongestGate ? strongestGate.excluded.slice(0, 5) : [],
      });
    }
    // --- END DEBUG ---
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
          <span className="ml-auto text-xs font-normal text-slate-400">innen {radiusKm} km</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {nearbyResults.length === 0 ? (
          <div className="text-sm text-slate-400 py-3">
            {prices.length === 0
              ? "Ingen priser funnet i nærheten akkurat nå"
              : `For lite datagrunnlag i området (${radiusKm} km radius)`}
            {DEBUG_NEARBY && (
              <div className="mt-1 text-xs text-amber-600 font-mono">
                [DEBUG] raw fetched rows: {prices.length} | nearby station ids: {debugInfo?.stations_within_radius_prequery ?? "?"}
              </div>
            )}
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
            Kun {nearbyResults.length} stasjon{nearbyResults.length !== 1 ? "er" : ""} med {fuelTypeLabel[selectedFuel] || selectedFuel}-pris funnet innen {radiusKm} km.
          </p>
        )}

        {DEBUG_NEARBY && debugInfo && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs font-mono">
            <div className="font-bold text-amber-700 mb-2">🐛 DEBUG — NearbyPrices Pipeline</div>

            <div className="space-y-0.5 text-slate-600 mb-2">
              <div>selectedFuel: <span className="font-semibold text-slate-800">{selectedFuel}</span></div>
              <div>radiusKm: <span className="font-semibold text-slate-800">{radiusKm}</span></div>
              <div>gpsState: <span className="font-semibold text-slate-800">{gpsState}</span></div>
              <div>userCoords: <span className="font-semibold text-slate-800">{userCoords ? `${userCoords.lat.toFixed(4)}, ${userCoords.lon.toFixed(4)}` : "null"}</span></div>
            </div>

            <div className="space-y-0.5 text-slate-700">
              <div>A. stations_total_loaded: <span className="font-semibold">{debugInfo.stations_total_loaded}</span></div>
              <div>B. stations_with_id_and_coords: <span className="font-semibold">{debugInfo.stations_with_id_and_coords}</span></div>
              <div>C. stations_within_radius_prequery: <span className="font-semibold">{debugInfo.stations_within_radius_prequery}</span></div>
              <div>D. fuelprice_rows_raw_fetched: <span className="font-semibold">{debugInfo.fuelprice_rows_raw_fetched}</span></div>
              <div>E. eligible_after_base_contract: <span className="font-semibold">{debugInfo.eligible_after_base_contract}</span></div>
              <div>F. eligible_after_station_join_and_coords: <span className="font-semibold">{debugInfo.eligible_after_station_join_and_coords}</span></div>
              <div>G. eligible_after_distance_filter: <span className="font-semibold">{debugInfo.eligible_after_distance_filter}</span></div>
              <div>H. latest_per_station_count: <span className="font-semibold">{debugInfo.latest_per_station_count}</span></div>
              <div>I. fresh_after_7_day_filter: <span className="font-semibold">{debugInfo.fresh_after_7_day_filter}</span></div>
              <div>J. final_sorted_count: <span className="font-semibold">{debugInfo.final_sorted_count}</span></div>
            </div>

            {debugInfo.fuelprice_rows_raw_fetched === 0 && (
              <div className="mt-2 text-red-600 font-semibold">⚠ No raw rows fetched — stages E–J are all 0</div>
            )}

            {debugInfo.strongestGateLabel && debugInfo.strongestGateDrop > 0 && (
              <div className="mt-2">
                <div className="text-amber-700 font-semibold">
                  Strongest gate: {debugInfo.strongestGateLabel} (−{debugInfo.strongestGateDrop} rows)
                </div>
                {debugInfo.sampleExcluded.length > 0 && (
                  <div className="mt-1">
                    <div className="text-slate-500 mb-1">Sample excluded rows (up to 5):</div>
                    {debugInfo.sampleExcluded.map((row, i) => (
                      <div key={row.id ?? i} className="mt-1 p-1.5 bg-white border border-amber-100 rounded">
                        <span className="text-slate-500">id:</span> {row.id?.slice(-8) ?? "?"}{" "}|{" "}
                        <span className="text-slate-500">stationId:</span> {row.stationId?.slice(-8) ?? "?"}{" "}|{" "}
                        <span className="text-slate-500">fuel:</span> {row.fuelType ?? "?"}{" "}|{" "}
                        <span className="text-slate-500">price:</span> {row.priceNok ?? "?"}{" "}|{" "}
                        <span className="text-slate-500">plausibility:</span> {row.plausibilityStatus ?? "undefined"}{" "}|{" "}
                        <span className="text-slate-500">priceType:</span> {row.priceType ?? "undefined"}{" "}|{" "}
                        <span className="text-slate-500">matchStatus:</span> {row.station_match_status ?? "undefined"}{" "}|{" "}
                        <span className="text-slate-500">fetchedAt:</span> {row.fetchedAt ? new Date(row.fetchedAt).toLocaleDateString("nb-NO") : "null"}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {debugInfo.strongestGateDrop === 0 && debugInfo.fuelprice_rows_raw_fetched > 0 && (
              <div className="mt-2 text-green-700">No significant gate eliminations detected</div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}