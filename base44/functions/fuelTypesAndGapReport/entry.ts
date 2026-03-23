import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const allPrices = await base44.entities.FuelPrice.list();

    // Fuel type standardization
    const fuelTypeNames = {
      'diesel': 'Diesel',
      'europdiesel': 'Eurodiesel',
      'gasoline_95': 'Bensin 95',
      'gasoline_98': 'Bensin 98'
    };

    // Group by location and fuel type
    const byLocationAndFuel = {};

    for (const price of allPrices) {
      const loc = price.locationLabel || 'unlabeled';
      const fuel = price.fuelType || 'unknown';

      if (!byLocationAndFuel[loc]) {
        byLocationAndFuel[loc] = {};
      }
      if (!byLocationAndFuel[loc][fuel]) {
        byLocationAndFuel[loc][fuel] = [];
      }

      byLocationAndFuel[loc][fuel].push(price);
    }

    // Generate detailed report with gap confidence
    const report = {
      fuel_type_harmonization: {
        standardized_types: fuelTypeNames,
        rule: 'Fuel types are never mixed in the same statistical calculation',
        separation_rule: 'Each fuel type has its own observations, average, median, and gap'
      },
      price_gap_confidence_rules: {
        insufficient_sample: { min: 0, max: 2, rule: 'Gap shown but marked as unrelable (too few observations)' },
        limited_sample: { min: 3, max: 4, rule: 'Gap shown but marked as limited (small sample)' },
        reliable: { min: 5, threshold: Infinity, rule: 'Gap shown as reliable metric' }
      },
      detailed_examples: {
        note: 'Two concrete examples with gap confidence marking',
        examples: {}
      }
    };

    // Generate 2 concrete examples: Oslo and Trondheim
    const exampleCities = ['Oslo', 'Trondheim'];

    for (const city of exampleCities) {
      if (!byLocationAndFuel[city]) continue;

      const cityData = {
        location: city,
        fuel_types: []
      };

      for (const [fuelType, prices] of Object.entries(byLocationAndFuel[city])) {
        const sampleSize = prices.length;
        const sorted = prices.map(p => p.priceNok).sort((a, b) => a - b);

        const avg = sorted.reduce((a, b) => a + b, 0) / sorted.length;
        const median = sorted.length % 2 === 0
          ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
          : sorted[Math.floor(sorted.length / 2)];

        const min = sorted[0];
        const max = sorted[sorted.length - 1];
        const gap = max - min;

        let confidence;
        if (sampleSize < 3) {
          confidence = 'insufficient_sample';
        } else if (sampleSize < 5) {
          confidence = 'limited_sample';
        } else {
          confidence = 'reliable';
        }

        const fuelTypeEntry = {
          fuel_type: fuelTypeNames[fuelType] || fuelType,
          raw_fuel_type: fuelType,
          sample_size: sampleSize,
          observations: prices.map(p => ({
            price: p.priceNok,
            source: p.sourceName,
            priceType: p.priceType
          })),
          statistics: {
            average: Number(avg.toFixed(2)),
            median: Number(median.toFixed(2)),
            min: Number(min.toFixed(2)),
            max: Number(max.toFixed(2)),
            price_gap: Number(gap.toFixed(2))
          },
          gap_confidence: confidence,
          gap_note: confidence === 'insufficient_sample'
            ? `⚠ Insufficient sample (${sampleSize} obs) - gap unreliable`
            : confidence === 'limited_sample'
            ? `⚠ Limited sample (${sampleSize} obs) - gap should be treated with caution`
            : `✓ Reliable sample (${sampleSize} obs) - gap is meaningful`
        };

        cityData.fuel_types.push(fuelTypeEntry);
      }

      report.detailed_examples.examples[city] = cityData;
    }

    // Summary table
    const allFuelTypes = new Set();
    for (const locData of Object.values(byLocationAndFuel)) {
      for (const fuel of Object.keys(locData)) {
        allFuelTypes.add(fuel);
      }
    }

    report.observed_fuel_types_in_system = Array.from(allFuelTypes).map(ft => ({
      raw_type: ft,
      display_name: fuelTypeNames[ft] || ft,
      found_in_locations: Object.keys(byLocationAndFuel).filter(loc =>
        byLocationAndFuel[loc][ft]
      )
    }));

    return Response.json(report);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});