import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * Hent ferdig datastruktur for fuel price dashboard
 * Inkluderer favoritter, historikk, benchmarks med rolle-basert begrensning
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isPremium = user.role === 'premium';
    const maxHistoryDays = isPremium ? 365 : 30;

    // Beregn historikk-cutoff
    const now = new Date();
    const cutoffDate = new Date(now.getTime() - maxHistoryDays * 24 * 60 * 60 * 1000);

    // 1. Hent brukerens favoritter
    const favorites = await base44.entities.UserFavoriteStation.filter({
      created_by: user.email,
    });

    const favoritesWithDetails = await Promise.all(
      favorites.map(async (fav) => {
        const station = await base44.asServiceRole.entities.Station.get(
          fav.station
        );
        return {
          stationId: fav.station,
          stationName: station?.name || 'Ukjent',
          stationChain: station?.chain,
          fuelType: fav.fuelType,
        };
      })
    );

    // 2. Hent historiske priser for favoritter (med tidsbegrensning)
    const priceHistory = {};
    for (const fav of favoritesWithDetails) {
      const prices = await base44.asServiceRole.entities.FuelPrice.filter({
        stationId: fav.stationId,
        fuelType: fav.fuelType,
      });

      priceHistory[fav.stationId] = prices
        .filter((p) => new Date(p.fetchedAt) >= cutoffDate)
        .map((p) => ({
          priceNok: p.priceNok,
          fetchedAt: p.fetchedAt,
          source: p.sourceName,
          confidence: p.confidenceScore,
        }))
        .sort((a, b) => new Date(a.fetchedAt) - new Date(b.fetchedAt));
    }

    // 3. Hent nasjonalt gjennomsnitt (for alle)
    const nationalBenchmark = await base44.asServiceRole.entities.NationalFuelBenchmark.filter(
      {},
      '-effectiveDate',
      10
    );

    const benchmarksByFuelType = {};
    nationalBenchmark.forEach((b) => {
      if (!benchmarksByFuelType[b.fuelType]) {
        benchmarksByFuelType[b.fuelType] = b;
      }
    });

    // 4. Hent regionalt gjennomsnitt (bare premium)
    let regionalBenchmarks = null;
    if (isPremium && favoritesWithDetails.length > 0) {
      const stationWithRegion = await base44.asServiceRole.entities.Station.get(
        favoritesWithDetails[0].stationId
      );
      
      if (stationWithRegion?.region) {
        regionalBenchmarks = await base44.asServiceRole.entities.RegionalFuelBenchmark.filter(
          {
            regionName: stationWithRegion.region,
          },
          '-effectiveDate',
          10
        );
      }
    }

    return Response.json({
      user: {
        email: user.email,
        role: user.role,
        isPremium,
      },
      limits: {
        maxHistoryDays,
        maxFavorites: isPremium ? 999999 : 3,
        canCreateAlerts: isPremium,
        canAccessRegionalBenchmark: isPremium,
      },
      favorites: favoritesWithDetails,
      priceHistory,
      nationalBenchmark: benchmarksByFuelType,
      regionalBenchmark: regionalBenchmarks || null,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});