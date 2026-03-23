import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * Delete all current GooglePlaces prices (both old 100x-scaled and new sub-0.5 scaled)
 * to prepare for re-fetch with correct understanding
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

    // Delete each one
    for (const price of googlePrices) {
      await base44.asServiceRole.entities.FuelPrice.delete(price.id);
      deletedCount++;
    }

    return Response.json({
      success: true,
      deletedCount: deletedCount,
      reason: "Cleared all GooglePlaces prices for fresh re-fetch with corrected parser"
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});