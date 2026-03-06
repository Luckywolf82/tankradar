import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * Opprett test-fixture priser med plausibilitetklassifisering
 * for å demonstrere klassifiseringslaget
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

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Slett eksisterende GooglePlaces-priser
    const existing = await base44.asServiceRole.entities.FuelPrice.filter(
      { sourceName: "GooglePlaces" },
      "-created_date",
      500
    );

    for (const price of existing) {
      await base44.asServiceRole.entities.FuelPrice.delete(price.id);
    }

    // Opprett fixture priser med kjente klassifiseringer
    const fixturePrices = [
      // Realistic prices (10-40 NOK/L)
      {
        priceNok: 23.50,
        fuelType: "gasoline_95",
        label: "Oslo sentrum - SP95"
      },
      {
        priceNok: 22.95,
        fuelType: "diesel",
        label: "Trondheim - DIESEL"
      },
      {
        priceNok: 21.45,
        fuelType: "gasoline_95",
        label: "Bergen - SP95"
      },
      // Suspect low (<10 NOK/L)
      {
        priceNok: 5.50,
        fuelType: "gasoline_95",
        label: "Test error - suspiciously low"
      },
      {
        priceNok: 8.75,
        fuelType: "diesel",
        label: "Another suspect low"
      },
      // Suspect high (>40 NOK/L)
      {
        priceNok: 45.00,
        fuelType: "diesel",
        label: "Test error - suspiciously high"
      }
    ];

    const results = [];
    const nowIso = new Date().toISOString();

    for (const fixture of fixturePrices) {
      const plausibilityStatus = classifyPricePlausibility(fixture.priceNok);
      
      const created = await base44.entities.FuelPrice.create({
        fuelType: fixture.fuelType,
        priceNok: fixture.priceNok,
        priceType: "station_level",
        sourceName: "GooglePlaces",
        sourceUrl: null,
        sourceUpdatedAt: nowIso,
        fetchedAt: nowIso,
        sourceFrequency: "near_realtime",
        confidenceScore: 0.75,
        parserVersion: "gp_v1",
        rawPayloadSnippet: `${fixture.label} | ${fixture.priceNok} NOK/L | ${plausibilityStatus}`
      });

      results.push({
        priceNok: fixture.priceNok,
        fuelType: fixture.fuelType,
        label: fixture.label,
        plausibilityStatus: plausibilityStatus,
        id: created.id
      });
    }

    return Response.json({
      message: "Created fixture prices for plausibility demonstration",
      count: results.length,
      fixtures: results
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});