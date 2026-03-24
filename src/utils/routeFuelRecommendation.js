/**
 * routeFuelRecommendation
 *
 * Given a decoded polyline (array of {lat, lon} points), a selected fuel type,
 * and all CurrentStationPrices rows, finds the best fuel stop along the route.
 *
 * DATA SOURCE: CurrentStationPrices only.
 *
 * Key design decisions:
 *  - Segment-distance geometry: point-to-segment projection (not nearest vertex)
 *  - Two-pass corridor: primary 2 km, fallback 4 km — never silent
 *  - Route-specific freshness: 24 h (stricter than Nearby's 7 d — local to this utility)
 *  - referenceStation: must be a DISTINCT corridor candidate; prefer the most expensive
 *    alternative (worst realistic alternative = strongest honest baseline)
 *  - baselineQuality: "strong" (≥2 corridor candidates) | "weak" (only 1 alternative) | null (none)
 *  - savingsEstimate: only when referenceStation != null AND bestStation is cheaper
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ROUTE_CORRIDOR_KM_PRIMARY  = 2;   // first-pass search corridor
const ROUTE_CORRIDOR_KM_FALLBACK = 4;   // widened only when primary yields 0 results
const FILL_LITERS = 40;

/**
 * Route-specific freshness: 24 hours.
 * Intentionally stricter than NEARBY_FRESHNESS_MAX_AGE_MS (7 days).
 * NOT imported from currentPriceResolver — this is a route-only threshold.
 * If this needs to change in future, change it here only.
 */
const ROUTE_FRESHNESS_MAX_AGE_MS = 24 * 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// Geometry
// ---------------------------------------------------------------------------

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

/**
 * Minimum distance in km from point P to any SEGMENT of the polyline.
 *
 * Improvement over the previous nearest-vertex approach: projects P onto each
 * segment [A, B] and uses the clamped projection as the candidate closest point.
 * This means a station sitting perpendicular to a long segment — but far from
 * either endpoint vertex — is no longer penalised with an inflated distance.
 *
 * Coordinate system: we use a flat (Cartesian) approximation per segment,
 * which is accurate to <0.1% over the corridor distances we care about (≤5 km).
 * No external GIS dependency required.
 *
 * @param {number} lat
 * @param {number} lon
 * @param {Array<{lat: number, lon: number}>} polyline
 * @returns {number} km
 */
function minDistToPolylineKm(lat, lon, polyline) {
  if (polyline.length === 0) return Infinity;
  if (polyline.length === 1) return haversineKm(lat, lon, polyline[0].lat, polyline[0].lon);

  // Convert to a locally-flat coordinate frame centred on the point P.
  // 1 degree latitude ≈ 111.32 km everywhere.
  // 1 degree longitude ≈ 111.32 * cos(lat) km.
  const cosLat = Math.cos((lat * Math.PI) / 180);
  const KM_PER_DEG_LAT = 111.32;
  const KM_PER_DEG_LON = 111.32 * cosLat;

  const px = (lon - lon) * KM_PER_DEG_LON; // always 0
  const py = (lat - lat) * KM_PER_DEG_LAT; // always 0

  let minDist = Infinity;

  for (let i = 0; i < polyline.length - 1; i++) {
    const A = polyline[i];
    const B = polyline[i + 1];

    // Segment endpoints in flat km relative to P
    const ax = (A.lon - lon) * KM_PER_DEG_LON;
    const ay = (A.lat - lat) * KM_PER_DEG_LAT;
    const bx = (B.lon - lon) * KM_PER_DEG_LON;
    const by = (B.lat - lat) * KM_PER_DEG_LAT;

    // Segment vector
    const dx = bx - ax;
    const dy = by - ay;
    const lenSq = dx * dx + dy * dy;

    let closestDist;
    if (lenSq === 0) {
      // Degenerate segment (A == B)
      closestDist = Math.sqrt(ax * ax + ay * ay);
    } else {
      // t = dot(P - A, B - A) / |B - A|^2, clamped to [0, 1]
      // P is at origin (0,0), so P - A = (-ax, -ay)
      const t = Math.max(0, Math.min(1, ((-ax) * dx + (-ay) * dy) / lenSq));
      const cx = ax + t * dx;
      const cy = ay + t * dy;
      closestDist = Math.sqrt(cx * cx + cy * cy);
    }

    if (closestDist < minDist) minDist = closestDist;
  }

  // Also check the last vertex (in case polyline has only 1 segment already handled)
  const lastPt = polyline[polyline.length - 1];
  const ldx = (lastPt.lon - lon) * KM_PER_DEG_LON;
  const ldy = (lastPt.lat - lat) * KM_PER_DEG_LAT;
  const lastDist = Math.sqrt(ldx * ldx + ldy * ldy);
  if (lastDist < minDist) minDist = lastDist;

  return minDist;
}

// ---------------------------------------------------------------------------
// Freshness (route-specific — does NOT touch currentPriceResolver)
// ---------------------------------------------------------------------------

/**
 * Returns true if the price row is fresh enough for ROUTE recommendations.
 * Uses ROUTE_FRESHNESS_MAX_AGE_MS (24 h) instead of Nearby's 7-day threshold.
 * Intentionally isolated here — does not change NearbyPrices behaviour.
 */
function isRouteFresh(fetchedAt) {
  if (!fetchedAt) return false;
  return Date.now() - new Date(fetchedAt).getTime() <= ROUTE_FRESHNESS_MAX_AGE_MS;
}

/**
 * Returns the fresh price for fuelType from a CSP row, using route-specific freshness.
 */
function getRouteFreshPrice(row, fuelType) {
  const priceField    = fuelType === "gasoline_95" ? "gasoline_95_price"    : fuelType === "diesel" ? "diesel_price"    : null;
  const fetchedAtField = fuelType === "gasoline_95" ? "gasoline_95_fetchedAt" : fuelType === "diesel" ? "diesel_fetchedAt" : null;

  if (!priceField || !fetchedAtField) return null;
  const price    = row[priceField];
  const fetchedAt = row[fetchedAtField];
  if (price == null || !fetchedAt) return null;
  if (!isRouteFresh(fetchedAt)) return null;
  return price;
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * findBestRouteStop
 *
 * @param {Array<{lat: number, lon: number}>} polyline   - Route points
 * @param {string}   fuelType    - "gasoline_95" | "diesel"
 * @param {Array}    cspRows     - CurrentStationPrices rows
 * @param {{lat: number, lon: number}} userCoords        - GPS start position
 *
 * @returns {{
 *   bestStation: object|null,
 *   referenceStation: object|null,
 *   savingsEstimate: number|null,
 *   corridorKmUsed: number,
 *   usedFallbackCorridor: boolean,
 *   baselineQuality: "strong"|"weak"|null
 * }}
 */
export function findBestRouteStop(polyline, fuelType, cspRows, userCoords) {
  const EMPTY = {
    bestStation: null,
    referenceStation: null,
    savingsEstimate: null,
    corridorKmUsed: ROUTE_CORRIDOR_KM_PRIMARY,
    usedFallbackCorridor: false,
    baselineQuality: null,
  };

  if (!polyline || polyline.length === 0 || !cspRows || cspRows.length === 0) {
    return EMPTY;
  }

  // Pre-filter: active stations with a route-fresh price and valid GPS
  const eligible = cspRows
    .filter((row) => {
      if (row.stationStatus === "archived_duplicate") return false;
      if (row.latitude == null || row.longitude == null) return false;
      return getRouteFreshPrice(row, fuelType) != null;
    })
    .map((row) => {
      const price       = getRouteFreshPrice(row, fuelType);
      const distToRoute = minDistToPolylineKm(row.latitude, row.longitude, polyline);
      const distToUser  = haversineKm(userCoords.lat, userCoords.lon, row.latitude, row.longitude);
      return { ...row, _price: price, _distToRoute: distToRoute, _distToUser: distToUser };
    });

  // Two-pass corridor search — never silent about expansion
  let candidates = eligible.filter((r) => r._distToRoute <= ROUTE_CORRIDOR_KM_PRIMARY);
  let usedFallback = false;
  let corridorUsed = ROUTE_CORRIDOR_KM_PRIMARY;

  if (candidates.length === 0) {
    candidates = eligible.filter((r) => r._distToRoute <= ROUTE_CORRIDOR_KM_FALLBACK);
    if (candidates.length > 0) {
      usedFallback = true;
      corridorUsed = ROUTE_CORRIDOR_KM_FALLBACK;
    }
  }

  if (candidates.length === 0) {
    return { ...EMPTY, corridorKmUsed: corridorUsed, usedFallbackCorridor: false };
  }

  // Best = cheapest corridor candidate
  const bestStation = [...candidates].sort((a, b) => a._price - b._price)[0];

  // Reference station selection:
  //  - Must be a DISTINCT corridor candidate (same stationId excluded)
  //  - Prefer the MOST EXPENSIVE alternative — this gives the strongest honest baseline.
  //    (Comparing against the cheapest alternative understates savings and feels misleading.)
  //  - baselineQuality: "strong" if ≥2 alternative corridor candidates, "weak" if exactly 1
  const alternatives = candidates.filter((c) => c.stationId !== bestStation.stationId);
  let referenceStation = null;
  let baselineQuality = null;

  if (alternatives.length >= 2) {
    // Strong baseline: pick the most expensive alternative (worst realistic option)
    referenceStation = [...alternatives].sort((a, b) => b._price - a._price)[0];
    baselineQuality = "strong";
  } else if (alternatives.length === 1) {
    referenceStation = alternatives[0];
    baselineQuality = "weak";
  }
  // else: referenceStation stays null, baselineQuality stays null

  // Savings — only when referenceStation is pricier
  let savingsEstimate = null;
  if (referenceStation !== null && bestStation._price < referenceStation._price) {
    const diff = referenceStation._price - bestStation._price;
    savingsEstimate = Math.round(diff * FILL_LITERS);
  }

  return {
    bestStation,
    referenceStation,
    savingsEstimate,
    corridorKmUsed: corridorUsed,
    usedFallbackCorridor: usedFallback,
    baselineQuality,
  };
}

// ---------------------------------------------------------------------------
// Polyline decoder
// ---------------------------------------------------------------------------

/**
 * Decode a Google Directions encoded polyline string into [{lat, lon}] array.
 */
export function decodePolyline(encoded) {
  if (!encoded) return [];
  const points = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;

    shift = 0;
    result = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;

    points.push({ lat: lat / 1e5, lon: lng / 1e5 });
  }

  return points;
}