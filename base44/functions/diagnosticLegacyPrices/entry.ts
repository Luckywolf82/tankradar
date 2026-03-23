import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * diagnosticLegacyPrices
 * 
 * DIAGNOSTIKK BARE – INGEN ENDRINGER
 * 
 * Verifiserer om de 6 suspect_price_high postene er legacy-poster
 * fra før parseren ble låst korrekt.
 * 
 * Rapporterer:
 * - createdAt (når posten ble opprettet i databasen)
 * - fetchedAt (når prisene ble hentet)
 * - sourceUpdatedAt (når Google API oppdaterte dem)
 * - parserVersion (hvilken parser-versjon brukt)
 * - priceNok (den lagrede prisen)
 */

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

    // Separer
    const suspectHigh = allGooglePlaces.filter(p => p.plausibilityStatus === "suspect_price_high");
    const realistic = allGooglePlaces.filter(p => p.plausibilityStatus === "realistic_price");

    // Sorter suspect_high etter createdAt (eldste først)
    const suspectHighByCreation = suspectHigh.sort((a, b) => 
      new Date(a.created_date) - new Date(b.created_date)
    );

    // Sorter realistic etter createdAt
    const realisticByCreation = realistic.sort((a, b) => 
      new Date(a.created_date) - new Date(b.created_date)
    );

    // Finn eldste og nyeste createdAt over alle observasjoner
    const allByCreation = allGooglePlaces.sort((a, b) => 
      new Date(a.created_date) - new Date(b.created_date)
    );

    const oldestCreated = allByCreation[0];
    const newestCreated = allByCreation[allByCreation.length - 1];

    return Response.json({
      timelineAnalysis: {
        reportGeneratedAt: new Date().toISOString(),
        oldestPostCreatedAt: oldestCreated?.created_date || "N/A",
        newestPostCreatedAt: newestCreated?.created_date || "N/A",
        note: "Alle poster opprettet innen samme periode antas å være fra samme fetch-kjøring"
      },

      suspectHighPrices: {
        total: suspectHigh.length,
        details: suspectHighByCreation.map(p => ({
          priceNok: p.priceNok,
          fuelType: p.fuelType,
          stationId: p.stationId,
          createdAt: p.created_date,
          fetchedAt: p.fetchedAt,
          sourceUpdatedAt: p.sourceUpdatedAt || "null",
          parserVersion: p.parserVersion || "unknown",
          plausibilityStatus: p.plausibilityStatus,
          confidenceScore: p.confidenceScore,
          age: {
            createdMinutesAgo: Math.round((new Date() - new Date(p.created_date)) / (1000 * 60)),
            fetchedMinutesAgo: Math.round((new Date() - new Date(p.fetchedAt)) / (1000 * 60))
          }
        }))
      },

      realisticPrices: {
        total: realistic.length,
        oldestCreatedAt: realisticByCreation[0]?.created_date || "N/A",
        newestCreatedAt: realisticByCreation[realisticByCreation.length - 1]?.created_date || "N/A",
        samples: realisticByCreation.slice(0, 3).map(p => ({
          priceNok: p.priceNok,
          fuelType: p.fuelType,
          createdAt: p.created_date,
          fetchedAt: p.fetchedAt,
          parserVersion: p.parserVersion || "unknown"
        }))
      },

      diagnosis: {
        timestampComparison: suspectHighByCreation.length > 0 && realisticByCreation.length > 0
          ? {
              suspectHighOldestCreated: suspectHighByCreation[0].created_date,
              realisticNewestCreated: realisticByCreation[realisticByCreation.length - 1].created_date,
              interpretation: new Date(suspectHighByCreation[0].created_date) < new Date(realisticByCreation[0].created_date)
                ? "🚨 LEGACY: De høye prisene ble opprettet FØR de realistiske – indikerer gamle poster fra før parser-fix"
                : "⚠ CONCURRENT: De høye prisene ble opprettet samtidig som realistiske – kunne være fra samme fetch med blandet output"
            }
          : "Ikke nok data for sammenligning",

        parserVersionCheck: suspectHighByCreation.length > 0
          ? {
              suspectHighParserVersions: [...new Set(suspectHighByCreation.map(p => p.parserVersion || "unknown"))],
              realisticParserVersions: [...new Set(realisticByCreation.map(p => p.parserVersion || "unknown"))],
              note: "Hvis suspect_high bruker eldre parserVersion, bekrefter det legacy-teori"
            }
          : "N/A",

        recommendation: suspectHighByCreation.length > 0 && 
                       suspectHighByCreation[0].created_date && 
                       new Date(suspectHighByCreation[0].created_date) < new Date(realisticByCreation[0].created_date)
          ? "✓ BEVIST LEGACY: De 6 høye prisene er gamle feilskalerte poster. Kan slettes som test-artefakter."
          : "⚠ USIKKERT: Høye og realistiske priser fra samme periode – krever ytterligere analyse av rå API-data"
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});