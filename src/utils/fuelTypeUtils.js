/**
 * Canonical fuel-type utilities for station-price READ paths.
 *
 * Scope:
 * - read-path only
 * - no new business rules
 * - no new fuel types
 * - preserve already-observed aliases and labels
 */

/**
 * Canonical fuel types already observed in repo/read paths.
 * Do not add speculative values here.
 */
export const CANONICAL_FUEL_TYPES = Object.freeze({
  GASOLINE_95: "gasoline_95",
  GASOLINE_98: "gasoline_98",
  DIESEL: "diesel",
  DIESEL_PREMIUM: "diesel_premium",
  OTHER: "other",
});

/**
 * Legacy/observed aliases that may still appear in UI state or old rows.
 * These are normalized for READ-path consistency only.
 */
const FUEL_TYPE_ALIASES = Object.freeze({
  bensin: CANONICAL_FUEL_TYPES.GASOLINE_95,
  "bensin 95": CANONICAL_FUEL_TYPES.GASOLINE_95,
  "95": CANONICAL_FUEL_TYPES.GASOLINE_95,
  gasoline_95: CANONICAL_FUEL_TYPES.GASOLINE_95,
  bensin_95: CANONICAL_FUEL_TYPES.GASOLINE_95,

  "bensin 98": CANONICAL_FUEL_TYPES.GASOLINE_98,
  "98": CANONICAL_FUEL_TYPES.GASOLINE_98,
  gasoline_98: CANONICAL_FUEL_TYPES.GASOLINE_98,
  bensin_98: CANONICAL_FUEL_TYPES.GASOLINE_98,

  diesel: CANONICAL_FUEL_TYPES.DIESEL,

  diesel_premium: CANONICAL_FUEL_TYPES.DIESEL_PREMIUM,

  other: CANONICAL_FUEL_TYPES.OTHER,
});

/**
 * Shared display labels.
 * Keeps support for both canonical and legacy keys to avoid UI regressions
 * while call sites migrate.
 */
export const FUEL_TYPE_LABELS = Object.freeze({
  [CANONICAL_FUEL_TYPES.GASOLINE_95]: "Bensin 95",
  [CANONICAL_FUEL_TYPES.GASOLINE_98]: "Bensin 98",
  [CANONICAL_FUEL_TYPES.DIESEL]: "Diesel",
  [CANONICAL_FUEL_TYPES.DIESEL_PREMIUM]: "Diesel+",
  [CANONICAL_FUEL_TYPES.OTHER]: "Annet",

  bensin_95: "Bensin 95",
  bensin_98: "Bensin 98",
});

/**
 * Normalize user/UI input or legacy value to canonical fuelType.
 *
 * Rules:
 * - null/undefined/empty pass through unchanged
 * - trims and lowercases string input
 * - returns canonical alias when known
 * - returns trimmed original key when unknown
 * - does not invent or autocorrect unknown fuel types
 */
export function normalizeFuelType(input) {
  if (input == null) return input;

  const raw = String(input).trim();
  if (!raw) return raw;

  const key = raw.toLowerCase();
  return FUEL_TYPE_ALIASES[key] || key;
}

/**
 * Returns true if the value normalizes to one of the canonical fuel types.
 */
export function isKnownFuelType(input) {
  const normalized = normalizeFuelType(input);
  return Object.values(CANONICAL_FUEL_TYPES).includes(normalized);
}

/**
 * Resolve a display label for a fuel type without changing behavior.
 * Falls back to the normalized value, then original input, if unknown.
 */
export function getFuelTypeLabel(fuelType) {
  if (fuelType == null) return "Ukjent";

  const normalized = normalizeFuelType(fuelType);
  return (
    FUEL_TYPE_LABELS[fuelType] ||
    FUEL_TYPE_LABELS[normalized] ||
    normalized ||
    String(fuelType)
  );
}
