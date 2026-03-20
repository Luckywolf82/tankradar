/**
 * CANONICAL STATION-PRICE DISPLAY ELIGIBILITY CONTRACT
 *
 * This module defines the shared base rule for determining whether a FuelPrice
 * row is eligible for display on station-based price views (e.g. "Billigste nær
 * deg", station detail current-price sections).
 *
 * Design principles:
 *  - Station-strict: a row must be explicitly linked to a station via stationId.
 *  - Source-agnostic: no requirement on sourceName or source-specific metadata.
 *  - Not aggregate: national/regional average rows are excluded from station views.
 *  - Plausibility-gated: upstream write-gates are incomplete, so this check
 *    remains necessary at the display layer until all write paths are compliant.
 *  - Match-status-safe: rows explicitly flagged as unmatched or unsafe are
 *    excluded when the flag is present; rows without the flag (e.g. FuelFinder)
 *    are not additionally blocked by this rule alone.
 *
 * View-specific logic (radius filtering, latest-per-fuel-type grouping, sorting,
 * chart data construction, station coordinate checks) must run AFTER this base
 * eligibility check and must remain in the calling component.
 */

const EXCLUDED_PRICE_TYPES = new Set(["national_average", "regional_average"]);
const EXCLUDED_MATCH_STATUSES = new Set([
  "no_safe_station_match",
  "review_needed_station_match",
]);

/**
 * Returns true when a FuelPrice row passes the shared base display-eligibility
 * contract for station-based price views.
 *
 * @param {object} p - A FuelPrice entity row.
 * @returns {boolean}
 */
export function isStationPriceDisplayEligible(p) {
  // Must have a plausible price (upstream write-gates are not yet universally
  // enforced, so suspect rows exist in the database).
  if (p.plausibilityStatus !== "realistic_price") return false;

  // Must be linked to a station; rows without stationId cannot be displayed in
  // a station-based view regardless of other fields.
  if (!p.stationId) return false;

  // Must not be an aggregate price type — national/regional averages have no
  // meaningful place in per-station display surfaces.
  if (EXCLUDED_PRICE_TYPES.has(p.priceType)) return false;

  // When a station_match_status is explicitly declared and marks the row as
  // unmatched or unsafe, exclude it.  Rows where station_match_status is absent
  // (e.g. FuelFinder rows pre-contract-fix) are not excluded by this check
  // alone — the stationId presence check above already provides a basic gate.
  if (EXCLUDED_MATCH_STATUSES.has(p.station_match_status)) return false;

  return true;
}
