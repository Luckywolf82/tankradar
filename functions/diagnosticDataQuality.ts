import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Fetch all FuelPrice records
    const allPrices = await base44.entities.FuelPrice.list('-fetchedAt', 1000);

    if (!allPrices || allPrices.length === 0) {
      return Response.json({
        total: 0,
        report: "No data available"
      });
    }

    const total = allPrices.length;

    // PROBLEM 1: locationLabel analysis
    const locationLabelStats = {
      total,
      hasLocation: 0,
      noLocation: 0,
      byLocationValue: {}
    };

    allPrices.forEach(p => {
      const location = p.locationLabel || 'no_location';
      if (location === 'no_location' || !p.locationLabel) {
        locationLabelStats.noLocation++;
      } else {
        locationLabelStats.hasLocation++;
      }
      
      if (!locationLabelStats.byLocationValue[location]) {
        locationLabelStats.byLocationValue[location] = [];
      }
      locationLabelStats.byLocationValue[location].push({
        id: p.id,
        sourceName: p.sourceName,
        fuelType: p.fuelType,
        priceNok: p.priceNok,
        stationId: p.stationId,
        created_date: p.created_date
      });
    });

    // PROBLEM 2: sourceName analysis
    const sourceNameStats = {
      total,
      bySource: {},
      unknownSources: []
    };

    allPrices.forEach(p => {
      const source = p.sourceName || 'unknown';
      if (!sourceNameStats.bySource[source]) {
        sourceNameStats.bySource[source] = 0;
      }
      sourceNameStats.bySource[source]++;
      
      if (source === 'unknown' || !p.sourceName) {
        sourceNameStats.unknownSources.push({
          id: p.id,
          locationLabel: p.locationLabel,
          fuelType: p.fuelType,
          priceNok: p.priceNok,
          fetchedAt: p.fetchedAt,
          created_date: p.created_date
        });
      }
    });

    // PROBLEM 3: plausibilityStatus analysis
    const plausibilityStats = {
      total,
      byStatus: {
        realistic_price: 0,
        suspect_price_low: 0,
        suspect_price_high: 0,
        unknown: 0
      },
      suspectPrices: {
        low: [],
        high: []
      }
    };

    allPrices.forEach(p => {
      const status = p.plausibilityStatus || 'unknown';
      if (plausibilityStats.byStatus[status] !== undefined) {
        plausibilityStats.byStatus[status]++;
      } else {
        plausibilityStats.byStatus.unknown++;
      }
      
      if (status === 'suspect_price_low') {
        plausibilityStats.suspectPrices.low.push({
          id: p.id,
          priceNok: p.priceNok,
          sourceName: p.sourceName,
          locationLabel: p.locationLabel,
          fuelType: p.fuelType,
          fetchedAt: p.fetchedAt
        });
      } else if (status === 'suspect_price_high') {
        plausibilityStats.suspectPrices.high.push({
          id: p.id,
          priceNok: p.priceNok,
          sourceName: p.sourceName,
          locationLabel: p.locationLabel,
          fuelType: p.fuelType,
          fetchedAt: p.fetchedAt
        });
      }
    });

    // Cross-analysis: no location + unknown source
    const problematicRecords = allPrices.filter(p => 
      (!p.locationLabel || p.locationLabel === 'no_location') && 
      (!p.sourceName || p.sourceName === 'unknown')
    );

    // Realistic prices breakdown
    const realisticPrices = allPrices.filter(p => p.plausibilityStatus === 'realistic_price');
    const realisticBySource = {};
    realisticPrices.forEach(p => {
      const source = p.sourceName || 'unknown';
      if (!realisticBySource[source]) {
        realisticBySource[source] = 0;
      }
      realisticBySource[source]++;
    });

    return Response.json({
      timestamp: new Date().toISOString(),
      total,
      locationLabel: {
        ...locationLabelStats,
        topLocations: Object.entries(locationLabelStats.byLocationValue)
          .map(([location, records]) => ({
            location,
            count: records.length,
            percentage: ((records.length / total) * 100).toFixed(1),
            sources: [...new Set(records.map(r => r.sourceName))],
            sample: records.slice(0, 2)
          }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 15)
      },
      sourceName: {
        ...sourceNameStats,
        unknownCount: sourceNameStats.unknownSources.length,
        unknownSample: sourceNameStats.unknownSources.slice(0, 5)
      },
      plausibility: {
        ...plausibilityStats,
        suspectPrices: {
          lowCount: plausibilityStats.suspectPrices.low.length,
          lowSample: plausibilityStats.suspectPrices.low.slice(0, 3),
          highCount: plausibilityStats.suspectPrices.high.length,
          highSample: plausibilityStats.suspectPrices.high.slice(0, 3)
        },
        realisticBySource
      },
      problematic: {
        noLocationAndNoSource: problematicRecords.length,
        sample: problematicRecords.slice(0, 5)
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});