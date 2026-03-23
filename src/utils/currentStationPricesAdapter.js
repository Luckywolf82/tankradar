/**
 * ADAPTER: CurrentStationPrices → FuelPrice-shaped row
 *
 * Converts a single CurrentStationPrices row into a FuelPrice-shaped object
 * that is compatible with the existing eligibility, resolver, and freshness
 * pipeline (isStationPriceDisplayEligible, resolveLatestPerStation,
 * isFreshEnoughForNearbyRanking) without modifying any of those utilities.
 *
 * Shape contract:
 *   Input:  CurrentStationPrices row (one per stationId)
 *   Output: FuelPrice-shaped object for the requested fuelType, or null if the
 *           row has no data for that fuel type.
 *
 * The output object carries:
 *   id, stationId, fuelType, priceNok, fetchedAt, plausibilityStatus,
 *   station_match_status, priceType, sourceName,
 *   _station: { name, chain, latitude, longitude }
 *
 * _distanceKm is NOT added here — NearbyPrices computes it inline from
 * _station.latitude / _station.longitude, which are provided.
 *
 * Supported fuelTypes: "gasoline_95", "diesel"
 */

const SUPPORTED = new Set(['gasoline_95', 'diesel']);

/**
 * @param {object} cspRow  - A CurrentStationPrices entity row.
 * @param {string} fuelType - "gasoline_95" or "diesel"
 * @returns {object|null}   - FuelPrice-shaped object, or null if no data for this fuel.
 */
export function adaptCurrentStationPriceRow(cspRow, fuelType) {
  if (!cspRow || !SUPPORTED.has(fuelType)) return null;

  // Unpack the correct fuel block
  let priceNok, fetchedAt, plausibilityStatus, station_match_status, priceType;

  if (fuelType === 'gasoline_95') {
    priceNok            = cspRow.gasoline_95_price;
    fetchedAt           = cspRow.gasoline_95_fetchedAt;
    plausibilityStatus  = cspRow.gasoline_95_plausibilityStatus;
    station_match_status = cspRow.gasoline_95_stationMatchStatus;
    priceType           = cspRow.gasoline_95_priceType;
  } else {
    // diesel
    priceNok            = cspRow.diesel_price;
    fetchedAt           = cspRow.diesel_fetchedAt;
    plausibilityStatus  = cspRow.diesel_plausibilityStatus;
    station_match_status = cspRow.diesel_stationMatchStatus;
    priceType           = cspRow.diesel_priceType;
  }

  // No price data for this fuel type on this station row — skip
  if (priceNok == null) return null;

  return {
    // Identity
    id:                   cspRow.id,           // React key
    stationId:            cspRow.stationId,

    // Fuel-specific fields (unpacked from fuel block)
    fuelType,
    priceNok,
    fetchedAt,
    plausibilityStatus,
    station_match_status,
    priceType:            priceType || null,

    // Row-level metadata
    sourceName:           cspRow.sourceName || null,

    // Station object shape expected by NearbyPrices render + distance calculation
    _station: {
      name:      cspRow.stationName   || null,
      chain:     cspRow.stationChain  || null,
      status:    cspRow.stationStatus || 'active',
      latitude:  cspRow.latitude      ?? null,
      longitude: cspRow.longitude     ?? null,
    },
  };
}

/**
 * Batch-adapt an array of CurrentStationPrices rows for a given fuelType.
 * Rows with no price data for the requested fuel are omitted (return null → filtered).
 *
 * @param {object[]} cspRows - Array of CurrentStationPrices rows.
 * @param {string}   fuelType - "gasoline_95" or "diesel"
 * @returns {object[]} FuelPrice-shaped rows, ready for the eligibility/resolver pipeline.
 */
export function adaptCurrentStationPriceRows(cspRows, fuelType) {
  if (!Array.isArray(cspRows) || !fuelType) return [];
  return cspRows
    .map((row) => adaptCurrentStationPriceRow(row, fuelType))
    .filter(Boolean);
}