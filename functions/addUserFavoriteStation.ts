import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * Opprett favoritt stasjon for bruker med duplikat- og grensekontroll
 * Frontend skal ikke calle UserFavoriteStation.create() direkte
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { stationId, fuelType } = await req.json();

    if (!stationId || !fuelType) {
      return Response.json(
        { error: 'Missing stationId or fuelType' },
        { status: 400 }
      );
    }

    // Sjekk freemium limit
    const isPremium = user.role === 'premium';
    const maxFavorites = isPremium ? 999999 : 3;

    const userFavorites = await base44.entities.UserFavoriteStation.filter(
      { created_by: user.email }
    );

    if (userFavorites.length >= maxFavorites) {
      return Response.json({
        status: 'limit_reached',
        message: `Maksimalt ${maxFavorites} favoritter. Oppgrader til premium for ubegrenset.`,
        currentCount: userFavorites.length,
        limit: maxFavorites,
      });
    }

    // Sjekk duplikat
    const existing = userFavorites.find(
      (fav) => fav.station === stationId && fav.fuelType === fuelType
    );

    if (existing) {
      return Response.json({
        status: 'already_exists',
        message: 'Du har allerede denne stasjonen som favoritt.',
        id: existing.id,
      });
    }

    // Opprett favoritt
    const newFavorite = await base44.entities.UserFavoriteStation.create({
      station: stationId,
      fuelType,
    });

    return Response.json({
      status: 'created',
      id: newFavorite.id,
      station: stationId,
      fuelType,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});