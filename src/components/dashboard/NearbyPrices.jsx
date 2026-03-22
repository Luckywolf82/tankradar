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
import { getFuelTypeLabel } from "@/utils/fuelTypeUtils";
import { fetchFuelPricesByStationsAndFuel } from "@/utils/fuelPriceQueries";
import { adaptCurrentStationPriceRows } from "@/utils/currentStationPricesAdapter";

// ─────────────────────────────────────────────────────────────────────────────
// VERIFICATION FLAG
// Flip to true ONLY after confirming parity in browser console.
// When true, NearbyPrices reads from CurrentStationPrices instead of
// the legacy Station + FuelPrice two-query path.
// ─────────────────────────────────────────────────────────────────────────────
const USE_CSP_PATH = true;

// Set to true ONLY when you need to re-run parity checks in the browser console.
// When false, the old Station + FuelPrice path is never fetched — eliminating 429s.
const ENABLE_NEARBY_PARITY_DEBUG = false;

const NEARBY_RADIUS_DEFAULT_KM = 10;
const NEARBY_RADIUS_STORAGE_KEY = "tankradar_nearby_radius_km";
const NEARBY_RADIUS_OPTIONS = [2, 5, 10, 20, 30];

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

// ─────────────────────────────────────────────────────────────────────────────
// SHARED PIPELINE
// Both paths converge here. Input rows must already have _station attached.
// No eligibility/resolver/freshness logic is changed — identical to legacy path.
// ─────────────────────────────────────────────────────────────────────────────
function runNearbyPipeline(rowsWithStation, userCoords, radiusKm, pathLabel = "path") {
  const eligible = rowsWithStation.filter((p) => {
    if (!isStationPriceDisplayEligible(p, { requireMatchedStationId: true })) return false;
    if (!p._station?.latitude || !p._station?.longitude) return false;
    return true;
  });

  const withDistance = eligible
    .map((p) => ({
      ...p,
      _distanceKm: haversineKm(
        userCoords.lat,
        userCoords.lon,
        p._station.latitude,
        p._station.longitude
      ),
    }))
    .filter((p) => p._distanceKm <= radiusKm)
    // Guard: rows without a parseable fetchedAt cannot win resolveLatestPerStation
    // correctly (new Date(null) = epoch-0, which beats any null-initiated comparison).
    // Exclude them here so they cannot displace rows with valid timestamps.
    // These rows still appear in staleFallback only if NO valid-timestamp rows exist.
    .filter((p) => {
      if (!p.fetchedAt) return false;
      const t = new Date(p.fetchedAt).getTime();
      return Number.isFinite(t) && t > 0;
    });

  const byStation = resolveLatestPerStation(withDistance);
  const latestArr = Object.values(byStation);

  // ── FRESHNESS DIAGNOSTICS ─────────────────────────────────────────────────
  // Dev-only: logs actual fetchedAt values and freshness evaluation per row.
  // Remove once root cause is confirmed and parity is proven.
  const now = Date.now();
  console.group(`[TankRadar][${pathLabel}] Freshness diagnostic — ${latestArr.length} candidate(s) | input=${rowsWithStation.length} eligible=${eligible.length} inRadius=${withDistance.length}`);
  latestArr.forEach((row) => {
    const fetchedAt = row.fetchedAt;
    const parsedMs = fetchedAt ? new Date(fetchedAt).getTime() : null;
    const ageMs = parsedMs != null ? now - parsedMs : null;
    const ageHours = ageMs != null ? (ageMs / 3_600_000).toFixed(1) : "N/A";
    const isFresh = isFreshEnoughForNearbyRanking(row);
    // Also log updated_date to detect the "updated_date is recent but fetchedAt is old" pattern
    console.log(
      `  stationId=${row.stationId}` +
      ` | fetchedAt=${fetchedAt ?? "NULL"} (type=${typeof fetchedAt})` +
      ` | updated_date=${row.updated_date ?? "N/A"}` +
      ` | ageHours=${ageHours}` +
      ` | isFresh=${isFresh}` +
      ` | match=${row.station_match_status}` +
      ` | plausibility=${row.plausibilityStatus}` +
      ` | priceType=${row.priceType}` +
      ` | priceNok=${row.priceNok}`
    );
  });
  if (latestArr.length === 0) {
    console.warn("  No candidates in latestArr. Check eligibility gate and radius.");
    // Sample a few ineligible rows to reveal why they were dropped
    rowsWithStation.slice(0, 3).forEach((r) => {
      console.log(`  [SAMPLE ineligible] stationId=${r.stationId} match=${r.station_match_status} plausibility=${r.plausibilityStatus} priceType=${r.priceType} fetchedAt=${r.fetchedAt} _station.lat=${r._station?.latitude}`);
    });
  }
  console.groupEnd();
  // ── END DIAGNOSTICS ───────────────────────────────────────────────────────

  // FIXED: wrap in arrow fn to prevent filter() from passing (element, index, array)
  // to isFreshEnoughForNearbyRanking. Without the wrapper, `index` (0, 1, 2…) overrides
  // the default maxAgeMs parameter, making every row fail freshness.
  const fresh = latestArr.filter((row) => isFreshEnoughForNearbyRanking(row));

  const sorted = [...fresh].sort((a, b) => {
    if (a.priceNok !== b.priceNok) return a.priceNok - b.priceNok;
    return a._distanceKm - b._distanceKm;
  });

  // Fallback only triggers when NO rows pass freshness (genuinely > 7 days old).
  // Sort by price first (cheapest = most useful), distance as tiebreaker.
  const staleFallbackResults =
    fresh.length === 0 && latestArr.length > 0
      ? [...latestArr]
          .sort((a, b) => {
            if (a.priceNok !== b.priceNok) return a.priceNok - b.priceNok;
            return a._distanceKm - b._distanceKm;
          })
          .slice(0, 8)
      : [];

  return {
    nearbyResults: sorted.slice(0, 8),
    staleFallbackResults,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// PARITY CHECKER — console output only, invisible to users
// ─────────────────────────────────────────────────────────────────────────────
function logParityReport(oldNearby, cspNearby, oldStale, cspStale) {
  const oldIds = oldNearby.map((p) => p.stationId);
  const cspIds = cspNearby.map((p) => p.stationId);

  const onlyInOld = oldIds.filter((id) => !cspIds.includes(id));
  const onlyInCSP = cspIds.filter((id) => !oldIds.includes(id));

  const priceMismatches = cspNearby
    .map((csp) => {
      const old = oldNearby.find((o) => o.stationId === csp.stationId);
      if (!old) return null;
      if (Math.abs(old.priceNok - csp.priceNok) > 0.001) {
        return { stationId: csp.stationId, oldPrice: old.priceNok, cspPrice: csp.priceNok };
      }
      return null;
    })
    .filter(Boolean);

  const fetchedAtMismatches = cspNearby
    .map((csp) => {
      const old = oldNearby.find((o) => o.stationId === csp.stationId);
      if (!old) return null;
      if (old.fetchedAt !== csp.fetchedAt) {
        return { stationId: csp.stationId, oldFetchedAt: old.fetchedAt, cspFetchedAt: csp.fetchedAt };
      }
      return null;
    })
    .filter(Boolean);

  const orderMatch = JSON.stringify(oldIds) === JSON.stringify(cspIds);

  const parityPassed =
    onlyInOld.length === 0 &&
    onlyInCSP.length === 0 &&
    priceMismatches.length === 0 &&
    orderMatch;

  console.group("[TankRadar] NearbyPrices parity check");
  console.log(
    `Old path: ${oldNearby.length} results, ${oldStale.length} stale`,
    "| CSP path:", cspNearby.length, "results,", cspStale.length, "stale"
  );
  if (onlyInOld.length) console.warn("  Only in OLD path:", onlyInOld);
  if (onlyInCSP.length) console.warn("  Only in CSP path:", onlyInCSP);
  if (priceMismatches.length) console.warn("  Price mismatches:", priceMismatches);
  if (fetchedAtMismatches.length) console.info("  fetchedAt differs (expected if CSP has newer data):", fetchedAtMismatches.length, "stations");
  if (!orderMatch) console.warn("  Ranking order differs. Old:", oldIds, "| CSP:", cspIds);
  console.log("  PARITY:", parityPassed ? "✅ PASSED — safe to flip USE_CSP_PATH = true" : "❌ FAILED — investigate before switching");
  console.groupEnd();
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function NearbyPrices({ selectedFuel }) {
  const navigate = useNavigate();
  const [radiusKm, setRadiusKm] = useState(getNearbyRadiusKm());
  const [gpsState, setGpsState] = useState("pending"); // pending | ok | denied | unavailable
  const [userCoords, setUserCoords] = useState(null);

  // Old path raw data
  const [stations, setStations] = useState([]);
  const [prices, setPrices] = useState([]);

  // CSP path raw data (verification shadow)
  const [cspRows, setCspRows] = useState([]);

  const [loading, setLoading] = useState(true);
  const [nearbyResults, setNearbyResults] = useState([]);
  const [staleFallbackResults, setStaleFallbackResults] = useState([]);

  // GPS acquisition — unchanged
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

  // Data fetch — both paths in parallel
  useEffect(() => {
    if (gpsState !== "ok" || !userCoords) return;

    setLoading(true);

    // CSP path — single query, always fetched
    const cspPath = base44.entities.CurrentStationPrices.list()
      .then((rows) => setCspRows(rows));

    if (ENABLE_NEARBY_PARITY_DEBUG) {
      // Old path — only fetched when parity debug is active
      const oldPath = base44.entities.Station.list("-created_date", 2000)
        .then((stationsData) => {
          setStations(stationsData);

          const nearbyIds = stationsData
            .filter((s) => s.id && s.latitude && s.longitude)
            .filter((s) => haversineKm(userCoords.lat, userCoords.lon, s.latitude, s.longitude) <= radiusKm)
            .map((s) => s.id);

          if (nearbyIds.length === 0) {
            setPrices([]);
            return;
          }

          return fetchFuelPricesByStationsAndFuel({
            stationIds: nearbyIds,
            selectedFuel,
            limit: 20,
          }).then((rows) => setPrices(rows));
        });

      Promise.all([oldPath, cspPath]).finally(() => setLoading(false));
    } else {
      cspPath.finally(() => setLoading(false));
    }
  }, [gpsState, selectedFuel, userCoords, radiusKm]);

  // Processing — both pipelines run, results compared, active path drives display
  useEffect(() => {
    if (!userCoords) {
      setNearbyResults([]);
      setStaleFallbackResults([]);
      return;
    }

    // ── OLD PATH ──────────────────────────────────────────────────────────────
    let oldNearby = [];
    let oldStale = [];

    if (stations.length && prices.length) {
      const stationMap = {};
      stations.forEach((s) => { if (s.id) stationMap[s.id] = s; });

      const oldRowsWithStation = prices
        .filter((p) => {
          const s = stationMap[p.stationId];
          return s && s.latitude && s.longitude;
        })
        .map((p) => ({ ...p, _station: stationMap[p.stationId] }));

      const result = runNearbyPipeline(oldRowsWithStation, userCoords, radiusKm, "OLD");
      oldNearby = result.nearbyResults;
      oldStale = result.staleFallbackResults;
    }

    // ── CSP PATH (verification shadow) ───────────────────────────────────────
    let cspNearby = [];
    let cspStale = [];

    if (cspRows.length) {
      // Adapter already embeds _station from CSP fields
      const adapted = adaptCurrentStationPriceRows(cspRows, selectedFuel);

      // Pre-filter to rows with coordinates before pipeline (mirrors old path's stationMap check)
      const withCoords = adapted.filter(
        (p) => p._station?.latitude != null && p._station?.longitude != null
      );

      const result = runNearbyPipeline(withCoords, userCoords, radiusKm, "CSP");
      cspNearby = result.nearbyResults;
      cspStale = result.staleFallbackResults;
    }

    // ── PARITY CHECK (dev console only — requires ENABLE_NEARBY_PARITY_DEBUG) ──
    if (ENABLE_NEARBY_PARITY_DEBUG && stations.length && cspRows.length) {
      logParityReport(oldNearby, cspNearby, oldStale, cspStale);
    }

    // ── ACTIVE PATH ───────────────────────────────────────────────────────────
    // USE_CSP_PATH = false → display driven by old path (no user-visible change).
    // Flip to true after parity confirmed in console.
    setNearbyResults(USE_CSP_PATH ? cspNearby : oldNearby);
    setStaleFallbackResults(USE_CSP_PATH ? cspStale : oldStale);

  }, [userCoords, stations, prices, cspRows, radiusKm, selectedFuel]);

  // ── RENDER (unchanged) ─────────────────────────────────────────────────────

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
              <span className="text-xs text-amber-500">(eldre data — over 7 dager)</span>
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

                // Dynamic age label — only shown for genuinely old prices (> 7 days fallback)
                const ageLabel = (() => {
                  if (!p.fetchedAt) return null;
                  const ageMs = Date.now() - new Date(p.fetchedAt).getTime();
                  const ageDays = ageMs / (24 * 3_600_000);
                  if (ageDays > 7) return { text: "Eldre pris", color: "bg-amber-100 text-amber-700" };
                  if (ageDays > 1) return { text: "Ikke helt oppdatert", color: "bg-yellow-50 text-yellow-700" };
                  return null; // < 24h — no label needed
                })();

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

                        {ageLabel && (
                          <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${ageLabel.color}`}>
                            {ageLabel.text}
                          </span>
                        )}
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
            {getFuelTypeLabel(selectedFuel)}-pris funnet innen {radiusKm} km.
          </p>
        )}
      </CardContent>
    </Card>
  );
}