import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * Sletter alle GooglePlaces-priser for å tillate ny fetch med plausibilitetklassifisering.
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Hent alle GooglePlaces-priser
    const prices = await base44.asServiceRole.entities.FuelPrice.filter(
      { sourceName: "GooglePlaces" },
      "-created_date",
      500
    );

    let deleted = 0;
    for (const price of prices) {
      await base44.asServiceRole.entities.FuelPrice.delete(price.id);
      deleted++;
    }

    return Response.json({
      success: true,
      message: `Deleted ${deleted} GooglePlaces price observations`,
      reason: "Preparing for re-fetch with plausibilityStatus classification",
      nextStep: "Call fetchGooglePlacesPrices to populate with new classification"
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});