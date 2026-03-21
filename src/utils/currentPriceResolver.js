/**
 * CANONICAL CURRENT-PRICE RESOLVER
 *
 * Provides shared "latest per station/fuel" resolution on top of rows that
 * already pass the display-eligibility contract (isStationPriceDisplayEligible).
 *
 * Design principles:
 *  - Recency-based: "latest" is always the row with the greatest fetchedAt.
 *  - No global age exclusion by default: callers that need a freshness gate
 *    must opt in via isFreshEnoughForNearbyRanking (or a custom threshold).
 *  - Source-agnostic: no preference for any sourceName.
 *
 * Supported resolution modes (callers choose what they need):
 *  1. resolveLatestPerFuelType   — latest per fuelType within a single station
 *  2. resolveLatestPerStation    — latest per stationId across multiple stations
 *  3. resolveLatestPerStationAndFuelType — latest per (stationId, fuelType) pair
 *
 * Freshness opt-in:
 *  - isFreshEnoughForNearbyRanking — NearbyPrices calls this after resolving
 *    latest rows to prevent very stale prices from ranking as current nearby cheapest.
 *  - NEARBY_FRESHNESS_MAX_AGE_MS — the default age threshold; adjust here to change
 *    the Nearby freshness policy globally without touching view code.
 */

/**
 * Default maximum age (in milliseconds) for a price row to be considered
 * fresh enough for ranking in "Billigste nær deg" (NearbyPrices).
 * Currently 7 days.
 */
export const NEARBY_FRESHNESS_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Returns true when a price row is fresh enough for Nearby ranking.
 *
 * This helper is intentionally opt-in. Views that should always show the
 * last known price regardless of age (e.g. StationDetails) must NOT call
 * this function.
 *
 * @param {object} row - A FuelPrice row (must have fetchedAt).
 * @param {number} [maxAgeMs] - Override the default maximum age in ms.
 * @returns {boolean}
 */
export function isFreshEnoughForNearbyRanking(row, maxAgeMs = NEARBY_FRESHNESS_MAX_AGE_MS) {
  if (!row.fetchedAt) return false;
  return Date.now() - new Date(row.fetchedAt).getTime() <= maxAgeMs;
}

/**
 * Returns the latest (by fetchedAt) row per fuelType, across rows for a
 * SINGLE station.
 *
 * Usage: StationDetails — "Siste kjente priser" section.
 * Callers pass displayPrices (already filtered by isStationPriceDisplayEligible).
 * No freshness filtering is applied here.
 *
 * @param {object[]} eligibleRows - Rows already filtered by isStationPriceDisplayEligible.
 * @returns {{ [fuelType: string]: object }} Map of fuelType → latest row.
 */
export function resolveLatestPerFuelType(eligibleRows) {
  const result = {};
  for (const row of eligibleRows) {
    const existing = result[row.fuelType];
    if (!existing || new Date(row.fetchedAt) > new Date(existing.fetchedAt)) {
      result[row.fuelType] = row;
    }
  }
  return result;
}

/**
 * Returns the latest (by fetchedAt) row per stationId, across rows for
 * MULTIPLE stations (typically all for the same fuelType).
 *
 * Usage: NearbyPrices — one latest price per station for the selected fuel.
 * After calling this function, NearbyPrices applies isFreshEnoughForNearbyRanking
 * to prevent very stale rows from ranking as current nearby cheapest.
 *
 * @param {object[]} eligibleRows - Rows already filtered by isStationPriceDisplayEligible.
 * @returns {{ [stationId: string]: object }} Map of stationId → latest row.
 */
export function resolveLatestPerStation(eligibleRows) {
  const result = {};
  for (const row of eligibleRows) {
    const existing = result[row.stationId];
    if (!existing || new Date(row.fetchedAt) > new Date(existing.fetchedAt)) {
      result[row.stationId] = row;
    }
  }
  return result;
}

/**
 * Returns the latest (by fetchedAt) row per (stationId, fuelType) pair,
 * across rows for MULTIPLE stations and MULTIPLE fuel types.
 *
 * Usage: cross-station multi-fuel scenarios.
 *
 * @param {object[]} eligibleRows - Rows already filtered by isStationPriceDisplayEligible.
 * @returns {{ [key: string]: object }} Map of "stationId|fuelType" → latest row.
 */
export function resolveLatestPerStationAndFuelType(eligibleRows) {
  const result = {};
  for (const row of eligibleRows) {
    const key = `${row.stationId}|${row.fuelType}`;
    const existing = result[key];
    if (!existing || new Date(row.fetchedAt) > new Date(existing.fetchedAt)) {
      result[key] = row;
    }
  }
  return result;
}
