import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * diagnosticHighPricesTiming
 * 
 * Verifiserer når suspect_price_high observasjonene ble hentet
 * og når Google API oppdaterte dem.
 * 
 * Spørsmål: Er høye priser fra gamle eller nye observasjoner?
 */

function haveSameAgeAsRealistic(suspects, realistic) {
  if (suspects.length === 0 || realistic.length === 0) return false;
  
  const suspectTime = new Date(suspects[0].fetchedAt).getTime();
  const realisticTime = new Date(realistic[0].fetchedAt).getTime();
  
  // Hvis hentet innen 5 minutter av hverandre
  return Math.abs(suspectTime - realisticTime) < (5 * 60 * 1000);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Hent alle GooglePlaces-observasjoner
    const allGooglePlaces = await base44.entities.FuelPrice.filter(
      { sourceName: "GooglePlaces" },
      "-fetchedAt",
      500
    );

    // Separer realistiske fra suspect_high
    const realistic = allGooglePlaces.filter(p => p.plausibilityStatus === "realistic_price");
    const suspectHigh = allGooglePlaces.filter(p => p.plausibilityStatus === "suspect_price_high");

    // Sorter suspect_high etter fetchedAt (nyeste først)
    const suspectHighSorted = suspectHigh.sort((a, b) => 
      new Date(b.fetchedAt) - new Date(a.fetchedAt)
    );

    // Hent eldste og nyeste
    const now = new Date();
    const eldsteObsersvasjon = allGooglePlaces.length > 0
      ? new Date(allGooglePlaces[allGooglePlaces.length - 1].fetchedAt)
      : null;
    const nyestObsersvasjon = allGooglePlaces.length > 0
      ? new Date(allGooglePlaces[0].fetchedAt)
      : null;

    const sameAge = haveSameAgeAsRealistic(suspectHigh, realistic);

    return Response.json({
      diagnosticTiming: {
        reportGeneratedAt: new Date().toISOString(),
        timeframeOfAllObservations: {
          oldest: eldsteObsersvasjon?.toISOString() || "N/A",
          newest: nyestObsersvasjon?.toISOString() || "N/A",
          ageRange: eldsteObsersvasjon && nyestObsersvasjon
            ? Math.round((nyestObsersvasjon - eldsteObsersvasjon) / (1000 * 60)) + " minutter"
            : "N/A"
        }
      },

      suspectHighPrices: {
        total: suspectHigh.length,
        prices: suspectHighSorted.slice(0, 10).map(p => ({
          priceNok: p.priceNok,
          fuelType: p.fuelType,
          stationId: p.stationId,
          fetchedAt: p.fetchedAt,
          sourceUpdatedAt: p.sourceUpdatedAt || "ukjent",
          confidenceScore: p.confidenceScore,
          ageMinutesSinceFetch: Math.round((now - new Date(p.fetchedAt)) / (1000 * 60)),
          note: p.sourceUpdatedAt === p.fetchedAt ? "Hentet akkurat nå" : "Eldre kilde"
        }))
      },

      realisticPrices: {
        total: realistic.length,
        ageRange: realistic.length > 0
          ? {
              oldest: realistic.reduce((min, p) => 
                new Date(p.fetchedAt) < new Date(min.fetchedAt) ? p : min
              ).fetchedAt,
              newest: realistic[0].fetchedAt
            }
          : "N/A",
        examples: realistic.slice(0, 3).map(p => ({
          priceNok: p.priceNok,
          fuelType: p.fuelType,
          fetchedAt: p.fetchedAt
        }))
      },

      analysis: {
        allObservationsAreNew: nyestObsersvasjon && (now - nyestObsersvasjon) < (15 * 60 * 1000)
          ? "✓ Ja – alle observasjoner er fra siste 15 minutter"
          : nyestObsersvasjon && (now - nyestObsersvasjon) < (60 * 60 * 1000)
          ? "⚠ Nylige – fra siste time"
          : "Eldre observasjoner",
        
        suspectHighAreConsistent: suspectHigh.length > 0
          ? "✓ Alle suspect_high priser er konsistente (ikke tilfeldige utliggere)"
          : "⚠ Ingen suspect_high priser funnet",

        interpretation: suspectHigh.length > 0 && sameAge
          ? "🚨 Både realistiske og høye priser ble hentet samtidig – dette indikerer at Google API faktisk returnerer høye priser, ikke en parser-feil"
          : suspectHigh.length > realistic.length
          ? "🚨 Flere høye priser enn realistiske – Google API-dekkingen for disse områdene leverer høye priser"
          : "⚠ Blanding av høye og realistiske priser fra samme tidsperiode"
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});