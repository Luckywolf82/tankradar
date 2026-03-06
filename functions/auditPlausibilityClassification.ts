import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * auditPlausibilityClassification
 * 
 * Rapporterer plausibilitetklassifisering av alle GooglePlaces-observasjoner.
 * Viser: antall realistic, suspect_low, suspect_high + konkrete eksempler.
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Hent alle GooglePlaces-priser som er lagret
    const allGooglePrices = await base44.entities.FuelPrice.filter(
      { sourceName: "GooglePlaces" },
      "-fetchedAt",
      500
    );

    // Klassifiser basert på rawPayloadSnippet (som nå inneholder klassifisering)
    // Fallback: klassifiser manuelt basert på priceNok
    const classification = {
      realistic_price: [],
      suspect_price_low: [],
      suspect_price_high: [],
      unclassified: []
    };

    for (const price of allGooglePrices) {
      let status = price.plausibilityStatus;
      
      // Hvis plausibilityStatus ikke finnes, klassifiser basert på priceNok
      if (!status) {
        if (price.priceNok < 10) {
          status = "suspect_price_low";
        } else if (price.priceNok > 40) {
          status = "suspect_price_high";
        } else {
          status = "realistic_price";
        }
      }
      
      if (classification[status]) {
        classification[status].push(price);
      } else {
        classification.unclassified.push(price);
      }
    }

    // Velg konkrete eksempler: en fra hver kategori som har data
    const examples = [];
    
    if (classification.realistic_price.length > 0) {
      examples.push({
        category: "realistic_price",
        example: classification.realistic_price[0]
      });
    }

    if (classification.suspect_price_low.length > 0) {
      examples.push({
        category: "suspect_price_low",
        example: classification.suspect_price_low[0]
      });
    }

    if (classification.suspect_price_high.length > 0) {
      examples.push({
        category: "suspect_price_high",
        example: classification.suspect_price_high[0]
      });
    }

    return Response.json({
      auditPlausibilityClassification: {
        totalObservations: allGooglePrices.length,
        classificationSummary: {
          realistic_price: classification.realistic_price.length,
          suspect_price_low: classification.suspect_price_low.length,
          suspect_price_high: classification.suspect_price_high.length,
          unclassified: classification.unclassified.length
        },
        thresholds: {
          low_threshold: "< 10 NOK/L",
          high_threshold: "> 40 NOK/L",
          realistic_range: "10-40 NOK/L"
        }
      },
      concreteExamples: examples.map(e => ({
        classification: e.category,
        priceNok: e.example.priceNok,
        fuelType: e.example.fuelType,
        station: e.example.stationId || "unknown",
        fetchedAt: e.example.fetchedAt,
        plausibilityStatus: e.example.plausibilityStatus,
        status: e.category === "realistic_price" 
          ? "✓ Valid for display" 
          : "✗ Suspect – hold back from dashboard"
      }))
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});