/**
 * routeFuelRecommendation
 *
 * Given a decoded polyline (array of {lat, lon} points), a selected fuel type,
 * and all CurrentStationPrices rows, finds the best fuel stop along the route.
 *
 * Uses the same price eligibility / freshness logic as NearbyPrices.
 * DATA SOURCE: CurrentStationPrices only.
 */

import { isFreshEnoughForNearbyRanking } from "./currentPriceResolver";

const ROUTE_CORRIDOR_KM = 2; // stations within 2 km of any route point
const FILL_LITERS = 40;

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
 * Minimum distance in km from a point to any segment of the polyline.
 * Simple per-vertex nearest approach (sufficient for 2 km corridor).
 */
function minDistToPolylineKm(lat, lon, polyline) {
  let minDist = Infinity;
  for (const pt of polyline) {
    const d = haversineKm(lat, lon, pt.lat, pt.lon);
    if (d < minDist) minDist = d;
  }
  return minDist;
}

/**
 * Get fresh price from a CSP row for a given fuelType.
 * Mirrors getFreshPrice in SavingsSummaryCard exactly.
 */
function getFreshPrice(row, fuelType) {
  const priceField = fuelType === "gasoline_95" ? "gasoline_95_price"
    : fuelType === "diesel" ? "diesel_price"
    : null;
  const fetchedAtField = fuelType === "gasoline_95" ? "gasoline_95_fetchedAt"
    : fuelType === "diesel" ? "diesel_fetchedAt"
    : null;

  if (!priceField || !fetchedAtField) return null;
  const price = row[priceField];
  const fetchedAt = row[fetchedAtField];
  if (price == null || !fetchedAt) return null;
  if (!isFreshEnoughForNearbyRanking({ fetchedAt, priceNok: price })) return null;
  return price;
}

/**
 * Main export.
 *
 * @param {Array<{lat: number, lon: number}>} polyline - Route points
 * @param {string} fuelType - e.g. "gasoline_95" | "diesel"
 * @param {Array} cspRows - CurrentStationPrices rows
 * @param {{lat: number, lon: number}} userCoords - User's current position (GPS start)
 * @returns {{ bestStation: object|null, nearestStation: object|null, savingsEstimate: number|null }}
 */
export function findBestRouteStop(polyline, fuelType, cspRows, userCoords) {
  if (!polyline || polyline.length === 0 || !cspRows || cspRows.length === 0) {
    return { bestStation: null, nearestStation: null, savingsEstimate: null };
  }

  // Build candidate list: active stations with fresh price along route corridor
  const candidates = cspRows
    .filter((row) => {
      if (row.stationStatus === "archived_duplicate") return false;
      if (row.latitude == null || row.longitude == null) return false;
      const price = getFreshPrice(row, fuelType);
      if (price == null) return false;
      return true;
    })
    .map((row) => {
      const price = getFreshPrice(row, fuelType);
      const distToRoute = minDistToPolylineKm(row.latitude, row.longitude, polyline);
      const distToUser = haversineKm(userCoords.lat, userCoords.lon, row.latitude, row.longitude);
      return { ...row, _price: price, _distToRoute: distToRoute, _distToUser: distToUser };
    })
    .filter((row) => row._distToRoute <= ROUTE_CORRIDOR_KM);

  if (candidates.length === 0) {
    return { bestStation: null, nearestStation: null, savingsEstimate: null };
  }

  // Best = cheapest along route
  const bestStation = [...candidates].sort((a, b) => a._price - b._price)[0];

  // Reference station = nearest candidate with a DIFFERENT stationId than bestStation.
  // This prevents comparing bestStation against itself when only one corridor station exists.
  const alternativeCandidates = candidates.filter(
    (c) => c.stationId !== bestStation.stationId
  );
  const referenceStation = alternativeCandidates.length > 0
    ? [...alternativeCandidates].sort((a, b) => a._distToUser - b._distToUser)[0]
    : null;

  // Savings estimate: only when a distinct reference station exists AND it is more expensive.
  // Never show savings if no valid alternative baseline exists.
  let savingsEstimate = null;
  if (
    referenceStation !== null &&
    bestStation._price < referenceStation._price
  ) {
    const diff = referenceStation._price - bestStation._price;
    savingsEstimate = Math.round(diff * FILL_LITERS);
  }

  return { bestStation, referenceStation, savingsEstimate };
}

/**
 * Decode a Google Directions encoded polyline string into [{lat, lon}] array.
 * Standard polyline encoding algorithm.
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