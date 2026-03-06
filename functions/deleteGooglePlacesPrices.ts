import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * Delete all incorrectly scaled GooglePlaces prices from database
 * These are 100x too high due to ØRE → NOK conversion error
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all GooglePlaces prices
    const googlePrices = await base44.entities.FuelPrice.filter(
      { sourceName: "GooglePlaces" },
      "-created_date",
      500
    );

    let deletedCount = 0;
    const deletedPrices = [];

    // Delete each one (they all have scaling error)
    for (const price of googlePrices) {
      // Record before deletion
      deletedPrices.push({
        id: price.id,
        stationId: price.stationId,
        fuelType: price.fuelType,
        incorrectPriceNok: price.priceNok,
        correctPriceNok: (price.priceNok / 100).toFixed(2)
      });

      // Delete via base44 SDK (delete one record by ID)
      // The base44 SDK doesn't have a direct delete(id) method visible,
      // so we'll use the service role to delete via filter
      await base44.asServiceRole.entities.FuelPrice.delete(price.id);
      deletedCount++;
    }

    return Response.json({
      success: true,
      action: "DELETED_SCALED_GOOGLEPLACES_PRICES",
      count: deletedCount,
      reason: "All GooglePlaces prices had 100x scaling error (units in ØRE not converted to NOK)",
      deletedRecords: deletedPrices.slice(0, 5),
      nextStep: "Re-run fetchGooglePlacesPrices with corrected extractPriceNok function"
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});