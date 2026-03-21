/**
 * CANONICAL CURRENT-PRICE RESOLVER
 *
 * Shared resolver for determining the current/latest station-linked price per
 * station and fuel type.  All views that display a "current price" should use
 * these helpers instead of re-implementing the same deduplication logic.
 *
 * Design principles:
 *  - Uses isStationPriceDisplayEligible as the shared base eligibility gate.
 *  - Selects the latest row by fetchedAt among eligible rows.
 *  - Does NOT apply global freshness filtering by default — callers that need
 *    freshness (e.g. NearbyPrices ranking) should pass results through isFresh().
 *  - Source-agnostic: relies on recency only, no source-specific logic.
 *
 * View-specific behavior:
 *  - StationDetails ("Siste kjente priser"): call getLatestPerFuel(); do NOT
 *    apply isFresh() — the last reported price must always be visible regardless
 *    of age.
 *  - NearbyPrices ("Billigste nær deg"): call getLatestPerStation(); then filter
 *    with isFresh() so stale prices do not dominate ranking.
 */

import { isStationPriceDisplayEligible } from "./fuelPriceEligibility";

// ── Freshness policy ──────────────────────────────────────────────────────────

/**
 * Maximum age (in milliseconds) for a price row to be considered fresh enough
 * to participate in NearbyPrices ranking.
 *
 * Adjust this value to change the NearbyPrices staleness cut-off.
 * Default: 7 days.
 */
export const NEARBY_FRESHNESS_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Returns true when a FuelPrice row is fresh enough to be included in
 * NearbyPrices ranking.
 *
 * Relies on recency only — no source-specific logic.
 * Rows without fetchedAt are treated as stale.
 *
 * @param {object} row           - A FuelPrice entity row.
 * @param {number} [thresholdMs] - Max age in ms. Defaults to NEARBY_FRESHNESS_THRESHOLD_MS.
 * @returns {boolean}
 */
export function isFresh(row, thresholdMs = NEARBY_FRESHNESS_THRESHOLD_MS) {
  if (!row.fetchedAt) return false;
  return Date.now() - new Date(row.fetchedAt).getTime() <= thresholdMs;
}

// ── Latest-resolution helpers ─────────────────────────────────────────────────

/**
 * Selects the latest display-eligible row per (stationId, fuelType) pair.
 *
 * Useful when a full per-station-per-fuel breakdown is needed across many
 * stations (e.g. aggregated dashboard views).
 *
 * Does NOT apply freshness filtering.
 *
 * @param {object[]} rows - FuelPrice entity rows.
 * @returns {object} Plain object keyed by `"${stationId}__${fuelType}"` →
 *   latest eligible row.
 */
export function getLatestPerStationFuel(rows) {
  const result = {};
  rows.forEach((p) => {
    if (!isStationPriceDisplayEligible(p)) return;
    const key = `${p.stationId}__${p.fuelType}`;
    if (!result[key] || p.fetchedAt > result[key].fetchedAt) {
      result[key] = p;
    }
  });
  return result;
}

/**
 * Selects the latest display-eligible row per fuelType, across all rows
 * provided.
 *
 * Intended for single-station views (StationDetails "Siste kjente priser"):
 * pass the full station history and get back one row per fuel type, always
 * reflecting the most recently reported price regardless of age.
 *
 * Does NOT apply freshness filtering — the last known price is always visible
 * even if it is older.
 *
 * @param {object[]} rows - FuelPrice entity rows (typically for one station).
 * @returns {object} Plain object keyed by fuelType → latest eligible row.
 */
export function getLatestPerFuel(rows) {
  const result = {};
  rows.forEach((p) => {
    if (!isStationPriceDisplayEligible(p)) return;
    if (!result[p.fuelType] || p.fetchedAt > result[p.fuelType].fetchedAt) {
      result[p.fuelType] = p;
    }
  });
  return result;
}

/**
 * Selects the latest display-eligible row per stationId, optionally limited
 * to a single fuel type.
 *
 * Intended for multi-station ranking (NearbyPrices "Billigste nær deg"):
 * after calling this, filter the results with isFresh() to prevent stale
 * prices from dominating the ranking.
 *
 * Does NOT apply freshness filtering on its own.
 *
 * @param {object[]} rows          - FuelPrice entity rows (may span multiple stations).
 * @param {string}  [selectedFuel] - If provided, only rows with this fuelType are considered.
 * @returns {object} Plain object keyed by stationId → latest eligible row.
 */
export function getLatestPerStation(rows, selectedFuel) {
  const result = {};
  rows.forEach((p) => {
    if (!isStationPriceDisplayEligible(p)) return;
    if (selectedFuel !== undefined && p.fuelType !== selectedFuel) return;
    if (!result[p.stationId] || p.fetchedAt > result[p.stationId].fetchedAt) {
      result[p.stationId] = p;
    }
  });
  return result;
}
