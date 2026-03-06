import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Fetch all FuelPrice records
    const allPrices = await base44.entities.FuelPrice.list('-fetchedAt', 10000);

    if (!allPrices || allPrices.length === 0) {
      return Response.json({
        total: 0,
        bySource: {},
        byCity: {},
        byFuelType: {},
        byQuality: {},
        byMatchConfidence: {},
        historicalCoverage: { last24h: 0, last7d: 0, last30d: 0 },
        report: "No data available"
      });
    }

    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // 1. TOTAL OBSERVASJONER
    const total = allPrices.length;

    // 2. OBSERVASJONER PER KILDE
    const bySource = {};
    allPrices.forEach(p => {
      const source = p.sourceName || 'unknown';
      if (!bySource[source]) {
        bySource[source] = 0;
      }
      bySource[source]++;
    });

    // 3. OBSERVASJONER PER BY (locationLabel)
    const byCity = {};
    allPrices.forEach(p => {
      const city = p.locationLabel || 'no_location';
      if (!byCity[city]) {
        byCity[city] = { count: 0, sampleSize: null };
      }
      byCity[city].count++;
    });
    // Identify weak samples
    Object.keys(byCity).forEach(city => {
      byCity[city].sampleSize = byCity[city].count < 5 ? 'weak' : byCity[city].count < 10 ? 'moderate' : 'strong';
    });

    // 4. OBSERVASJONER PER DRIVSTOFFTYPE
    const byFuelType = {};
    ['gasoline_95', 'gasoline_98', 'diesel', 'other'].forEach(fuel => {
      byFuelType[fuel] = allPrices.filter(p => p.fuelType === fuel).length;
    });

    // 5. DATAKVALITET
    const byQuality = {};
    ['realistic_price', 'suspect_price_low', 'suspect_price_high'].forEach(status => {
      byQuality[status] = allPrices.filter(p => p.plausibilityStatus === status).length;
    });

    // 6. MATCH-KVALITET (check for stationId existence as proxy for match quality)
    const byMatchConfidence = {
      matched: allPrices.filter(p => p.stationId).length,
      unmatched: allPrices.filter(p => !p.stationId).length
    };

    // 7. HISTORISK DEKNING
    const historicalCoverage = {
      last24h: allPrices.filter(p => new Date(p.fetchedAt) >= last24h).length,
      last7d: allPrices.filter(p => new Date(p.fetchedAt) >= last7d).length,
      last30d: allPrices.filter(p => new Date(p.fetchedAt) >= last30d).length
    };

    // Sort by count
    const sortedCities = Object.entries(byCity)
      .map(([city, data]) => ({ city, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);

    return Response.json({
      timestamp: new Date().toISOString(),
      total,
      bySource,
      byCityTopN: sortedCities,
      byFuelType,
      byQuality,
      byMatchConfidence,
      historicalCoverage,
      qualityRatio: {
        realistic_percent: ((byQuality.realistic_price || 0) / total * 100).toFixed(1),
        suspect_percent: (((byQuality.suspect_price_low || 0) + (byQuality.suspect_price_high || 0)) / total * 100).toFixed(1)
      },
      matchRatio: {
        matched_percent: (byMatchConfidence.matched / total * 100).toFixed(1),
        unmatched_percent: (byMatchConfidence.unmatched / total * 100).toFixed(1)
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});