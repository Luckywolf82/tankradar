import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const allPrices = await base44.entities.FuelPrice.list();
    const timestamp = new Date().toISOString();

    // Initialize aggregation structures
    const byLocationAndFuel = {};
    const bySource = {};
    const byCity = {};
    const byFuelType = {};
    let realistic_count = 0;
    let suspect_count = 0;
    let review_needed_count = 0;

    // Aggregate data across all dimensions
    for (const price of allPrices) {
      const loc = price.locationLabel || 'unlabeled';
      const fuel = price.fuelType || 'unknown';
      const source = price.sourceName || 'unknown_source';
      const status = price.plausibilityStatus || 'unknown_status';

      // By location + fuel type
      if (!byLocationAndFuel[loc]) byLocationAndFuel[loc] = {};
      if (!byLocationAndFuel[loc][fuel]) {
        byLocationAndFuel[loc][fuel] = { count: 0, prices: [], stationIds: new Set(), matched: 0 };
      }
      byLocationAndFuel[loc][fuel].count++;
      byLocationAndFuel[loc][fuel].prices.push(price.priceNok);
      if (price.stationId) {
        byLocationAndFuel[loc][fuel].stationIds.add(price.stationId);
        byLocationAndFuel[loc][fuel].matched++;
      }

      // By source
      if (!bySource[source]) bySource[source] = 0;
      bySource[source]++;

      // By city
      if (!byCity[loc]) byCity[loc] = 0;
      byCity[loc]++;

      // By fuel type
      if (!byFuelType[fuel]) byFuelType[fuel] = 0;
      byFuelType[fuel]++;

      // Plausibility status
      if (status === 'realistic_price') realistic_count++;
      else if (status === 'suspect_price_low' || status === 'suspect_price_high') suspect_count++;
      else if (status === 'review_needed') review_needed_count++;
    }

    // Build enhanced snapshot
    const snapshot = {
      timestamp,
      total_observations: allPrices.length,
      observations_per_source: bySource,
      observations_per_city: byCity,
      observations_per_fueltype: byFuelType,
      confidence_distribution: {
        insufficient_sample: 0,
        limited_sample: 0,
        reliable: 0
      },
      plausibility_distribution: {
        realistic_price: realistic_count,
        suspect_price: suspect_count,
        review_needed: review_needed_count,
        unknown_status: allPrices.length - (realistic_count + suspect_count + review_needed_count)
      },
      matched_vs_unmatched: {
        matched: 0,
        unmatched: 0
      },
      daily_ingest_rate: {
        note: 'Estimate based on observations per source and assumed fetch frequency',
        estimated_per_day: Math.round((allPrices.length / 16) * 4) // rough estimate with 4 fetches/day
      },
      by_location: {}
    };

    // Calculate matched vs unmatched
    for (const price of allPrices) {
      if (price.stationId) snapshot.matched_vs_unmatched.matched++;
      else snapshot.matched_vs_unmatched.unmatched++;
    }

    // Per-location detailed breakdown
    for (const [location, fuelTypes] of Object.entries(byLocationAndFuel)) {
      snapshot.by_location[location] = {
        total_obs: byCity[location],
        fuel_types: {}
      };

      for (const [fuel, data] of Object.entries(fuelTypes)) {
        const sampleSize = data.count;
        let confidence;

        if (sampleSize < 3) {
          confidence = 'insufficient_sample';
          snapshot.confidence_distribution.insufficient_sample++;
        } else if (sampleSize < 5) {
          confidence = 'limited_sample';
          snapshot.confidence_distribution.limited_sample++;
        } else {
          confidence = 'reliable';
          snapshot.confidence_distribution.reliable++;
        }

        snapshot.by_location[location].fuel_types[fuel] = {
          sample_size: sampleSize,
          confidence,
          matched: data.matched,
          unmatched: sampleSize - data.matched,
          avg_price: Number((data.prices.reduce((a, b) => a + b, 0) / data.prices.length).toFixed(2))
        };
      }
    }

    return Response.json(snapshot);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});