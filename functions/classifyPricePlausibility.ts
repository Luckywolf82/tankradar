/**
 * classifyPricePlausibility
 * 
 * Klassifiserer prisplausibilitet basert på norske prisforhold.
 * IKKE endrer priceNok, bare klassifiserer.
 * 
 * Regler:
 * - priceNok < 10 → suspect_price_low
 * - priceNok > 40 → suspect_price_high
 * - 10-40 → realistic_price
 */

function classifyPricePlausibility(priceNok) {
  if (priceNok === null || priceNok === undefined) {
    return null;
  }

  if (priceNok < 10) {
    return "suspect_price_low";
  }
  
  if (priceNok > 40) {
    return "suspect_price_high";
  }
  
  return "realistic_price";
}

export { classifyPricePlausibility };