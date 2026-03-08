import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * Hent brukerens favoritt stasjoner med full relasjondata
 * Frontend skal ikke querye UserFavoriteStation direkte
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Hent brukerens favoritter
    const favorites = await base44.entities.UserFavoriteStation.filter({
      created_by: user.email,
    });

    // Hent stasjondetaljer for hver favoritt
    const enriched = await Promise.all(
      favorites.map(async (fav) => {
        const station = await base44.asServiceRole.entities.Station.get(
          fav.station
        );
        return {
          id: fav.id,
          stationId: fav.station,
          stationName: station?.name || 'Ukjent',
          stationChain: station?.chain,
          fuelType: fav.fuelType,
          createdAt: fav.created_date,
        };
      })
    );

    return Response.json({
      favorites: enriched,
      count: enriched.length,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});