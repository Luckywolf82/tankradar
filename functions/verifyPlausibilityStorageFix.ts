import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * Verifiserer at plausibilityStatus lagres direkte på FuelPrice-tabellen
 * (ikke bare i rawPayloadSnippet eller fixture-data)
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Hent siste GooglePlaces-priser
    const googlePrices = await base44.entities.FuelPrice.filter(
      { sourceName: "GooglePlaces" },
      "-fetchedAt",
      10
    );

    const verification = {
      totalRetrieved: googlePrices.length,
      fieldPresentCount: 0,
      fieldMissingCount: 0,
      observations: []
    };

    for (const price of googlePrices) {
      const obs = {
        id: price.id,
        priceNok: price.priceNok,
        fuelType: price.fuelType,
        sourceName: price.sourceName,
        stationId: price.stationId,
        fetchedAt: price.fetchedAt,
        sourceUpdatedAt: price.sourceUpdatedAt,
        plausibilityStatus: price.plausibilityStatus,
        fieldStored: price.plausibilityStatus !== null && price.plausibilityStatus !== undefined,
        rawPayloadSnippet: price.rawPayloadSnippet
      };

      verification.observations.push(obs);

      if (obs.fieldStored) {
        verification.fieldPresentCount++;
      } else {
        verification.fieldMissingCount++;
      }
    }

    // Velg 3 ekte eksempler hvis tilgjengelige
    const realObservations = verification.observations
      .filter(o => o.fieldStored)
      .slice(0, 3);

    const status = verification.fieldPresentCount > 0 
      ? "✓ LAGRING FUNGERER" 
      : "✗ LAGRING FEILER";

    return Response.json({
      status: status,
      verification: verification,
      realExamples: realObservations.length > 0 ? realObservations : null,
      recommendation: verification.fieldPresentCount > 0 
        ? "OK - plausibilityStatus lagres korrekt. Dashboard kan nå filtrere basert på dette feltet."
        : "PROBLEM - plausibilityStatus lagres ikke. Sjekk at create() kaller feldene riktig."
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});