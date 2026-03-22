// src/utils/fuelTypeUtils.js

/**
 * Konverterer brukerinput eller UI-valgt drivstofftype til kanonisk fuelType-streng.
 * Eksempel: "bensin 95" eller "95" → "gasoline_95".
 * @param {string} input 
 * @returns {string|null} Kanonisk fuelType eller null hvis input tom.
 */
export function normalizeFuelType(input) {
  if (!input) return input;
  const key = input.trim().toLowerCase();
  const map = {
    bensin: "gasoline_95",
    "bensin 95": "gasoline_95",
    "95": "gasoline_95",
    gasoline_95: "gasoline_95",
    "98": "gasoline_98",
    gasoline_98: "gasoline_98",
    diesel: "diesel",
    diesel_premium: "diesel_premium",
    // Eventuelle ekstra aliaser kan legges til her.
  };
  return map[key] || key;
}

/**
 * *Valgfritt:* Kanoniske etiketter for drivstofftyper (brukes i UI hvis ønskelig).
 * Ikke implementert nå; kan legges til om nødvendig.
 */
// export const fuelTypeLabel = { ... };
