import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Fetch all current FuelPrice records
    const allPrices = await base44.entities.FuelPrice.list();
    console.log(`Analyzing ${allPrices.length} FuelPrice records for locationLabel gap`);

    // Categorize by source
    const bySource = {
      'GooglePlaces': [],
      'FuelFinder': [],
      'GlobalPetrolPrices': [],
      'user_reported': [],
      'unknown': []
    };

    for (const price of allPrices) {
      const source = price.sourceName || 'unknown';
      const bucket = bySource[source] || (bySource[source] = []);
      bucket.push(price);
    }

    // Analyze each source
    const analysis = {};

    for (const [source, records] of Object.entries(bySource)) {
      if (records.length === 0) continue;

      const missing = records.filter(r => !r.locationLabel);
      const has = records.filter(r => r.locationLabel);

      analysis[source] = {
        total: records.length,
        with_locationLabel: has.length,
        missing_locationLabel: missing.length,
        details: {
          with_label: has.map(r => ({ id: r.id, label: r.locationLabel })),
          missing_analysis: []
        }
      };

      // For each record missing locationLabel, analyze potential sources
      for (const rec of missing) {
        const potential = {
          id: rec.id,
          priceNok: rec.priceNok,
          fuelType: rec.fuelType,
          stationId: rec.stationId || 'null',
          potential_sources: []
        };

        // Option 1: Station.city via stationId
        if (rec.stationId) {
          potential.potential_sources.push({
            source: 'Station.city',
            available: true,
            reason: `Has stationId: ${rec.stationId}`
          });
        } else {
          potential.potential_sources.push({
            source: 'Station.city',
            available: false,
            reason: 'No stationId in record'
          });
        }

        // Option 2: Metadata from source
        if (source === 'GooglePlaces') {
          potential.potential_sources.push({
            source: 'GooglePlaces API response',
            available: 'unknown_without_raw_payload',
            reason: 'May have been in original response - needs rawPayloadSnippet inspection'
          });
        } else if (source === 'FuelFinder') {
          potential.potential_sources.push({
            source: 'FuelFinder API response',
            available: 'unknown_without_raw_payload',
            reason: 'May have been in original response - needs rawPayloadSnippet inspection'
          });
        } else if (source === 'GlobalPetrolPrices') {
          potential.potential_sources.push({
            source: 'GlobalPetrolPrices national aggregate',
            available: false,
            reason: 'National average source - no city granularity'
          });
        } else if (source === 'user_reported') {
          potential.potential_sources.push({
            source: 'User geolocation at report time',
            available: 'requires_new_field',
            reason: 'Could capture city from browser geolocation during report'
          });
        }

        analysis[source].details.missing_analysis.push(potential);
      }
    }

    // Summarize by safe backfill opportunity
    const backfillOpportunities = {
      safe_via_station_city: 0,
      possible_via_raw_payload_inspection: 0,
      impossible_national_aggregate: 0,
      requires_new_data_capture: 0,
      total_missing: 0
    };

    for (const [source, data] of Object.entries(analysis)) {
      if (!data.details.missing_analysis) continue;
      
      for (const rec of data.details.missing_analysis) {
        backfillOpportunities.total_missing++;
        
        const hasSafeStation = rec.potential_sources.some(
          p => p.source === 'Station.city' && p.available === true
        );
        
        if (hasSafeStation) {
          backfillOpportunities.safe_via_station_city++;
        } else if (source === 'GooglePlaces' || source === 'FuelFinder') {
          backfillOpportunities.possible_via_raw_payload_inspection++;
        } else if (source === 'GlobalPetrolPrices') {
          backfillOpportunities.impossible_national_aggregate++;
        } else if (source === 'user_reported') {
          backfillOpportunities.requires_new_data_capture++;
        }
      }
    }

    return Response.json({
      summary: {
        total_records: allPrices.length,
        total_missing_locationLabel: allPrices.filter(p => !p.locationLabel).length,
        backfill_opportunities: backfillOpportunities
      },
      by_source: analysis
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});