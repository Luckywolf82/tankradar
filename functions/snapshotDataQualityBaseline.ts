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

    // Group by location and fuel type
    const byLocationAndFuel = {};

    for (const price of allPrices) {
      const loc = price.locationLabel || 'unlabeled';
      const fuel = price.fuelType || 'unknown';

      if (!byLocationAndFuel[loc]) {
        byLocationAndFuel[loc] = {};
      }
      if (!byLocationAndFuel[loc][fuel]) {
        byLocationAndFuel[loc][fuel] = { count: 0, prices: [] };
      }

      byLocationAndFuel[loc][fuel].count++;
      byLocationAndFuel[loc][fuel].prices.push(price.priceNok);
    }

    // Build confidence snapshot
    const snapshot = {
      timestamp,
      total_records: allPrices.length,
      confidence_distribution: {
        insufficient_sample: 0,
        limited_sample: 0,
        reliable: 0
      },
      by_location: {}
    };

    for (const [location, fuelTypes] of Object.entries(byLocationAndFuel)) {
      snapshot.by_location[location] = {
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
          avg_price: Number((data.prices.reduce((a, b) => a + b, 0) / data.prices.length).toFixed(2))
        };
      }
    }

    return Response.json(snapshot);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});