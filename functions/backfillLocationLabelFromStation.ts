import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Fetch all FuelPrice records
    const allPrices = await base44.entities.FuelPrice.list();
    console.log(`Processing ${allPrices.length} FuelPrice records`);

    // Find records missing locationLabel
    const missingLocationLabel = allPrices.filter(p => !p.locationLabel);
    console.log(`Found ${missingLocationLabel.length} records missing locationLabel`);

    const backfillReport = {
      attempted: 0,
      successful: 0,
      failed: 0,
      skipped_no_stationId: 0,
      skipped_station_not_found: 0,
      skipped_station_no_city: 0,
      backfilled_records: [],
      failed_records: []
    };

    // Attempt backfill
    for (const price of missingLocationLabel) {
      backfillReport.attempted++;

      // Rule 1: stationId must exist
      if (!price.stationId) {
        backfillReport.skipped_no_stationId++;
        continue;
      }

      // Rule 2: Station-record must exist
      let station;
      try {
        station = await base44.entities.Station.get(price.stationId);
      } catch (e) {
        backfillReport.skipped_station_not_found++;
        backfillReport.failed_records.push({
          id: price.id,
          stationId: price.stationId,
          reason: 'Station record not found'
        });
        continue;
      }

      // Rule 3: Station.city must be set
      if (!station || !station.city) {
        backfillReport.skipped_station_no_city++;
        backfillReport.failed_records.push({
          id: price.id,
          stationId: price.stationId,
          reason: 'Station.city is empty or null'
        });
        continue;
      }

      // Safe to backfill
      try {
        await base44.entities.FuelPrice.update(price.id, {
          locationLabel: station.city
        });
        backfillReport.successful++;
        backfillReport.backfilled_records.push({
          id: price.id,
          stationId: price.stationId,
          locationLabel: station.city,
          fuelType: price.fuelType,
          sourceName: price.sourceName
        });
      } catch (e) {
        backfillReport.failed++;
        backfillReport.failed_records.push({
          id: price.id,
          stationId: price.stationId,
          reason: e.message
        });
      }
    }

    // Fetch updated dataset
    const finalPrices = await base44.entities.FuelPrice.list();

    // Distribution per city
    const cityDistribution = {};
    for (const p of finalPrices) {
      if (p.locationLabel) {
        cityDistribution[p.locationLabel] = (cityDistribution[p.locationLabel] || 0) + 1;
      }
    }

    // Verify final state
    const stillMissing = finalPrices.filter(p => !p.locationLabel);

    return Response.json({
      backfill_summary: {
        attempted: backfillReport.attempted,
        successful: backfillReport.successful,
        failed: backfillReport.failed,
        skipped: {
          no_stationId: backfillReport.skipped_no_stationId,
          station_not_found: backfillReport.skipped_station_not_found,
          station_no_city: backfillReport.skipped_station_no_city
        }
      },
      final_state: {
        total_records: finalPrices.length,
        with_locationLabel: finalPrices.filter(p => p.locationLabel).length,
        missing_locationLabel: stillMissing.length
      },
      city_distribution: cityDistribution,
      backfilled_records_sample: backfillReport.backfilled_records.slice(0, 10),
      still_missing_analysis: stillMissing.map(p => ({
        id: p.id,
        stationId: p.stationId || 'null',
        sourceName: p.sourceName,
        reason: 'Check station reference or Station.city value'
      })),
      regional_stats_readiness: {
        cities_with_data: Object.keys(cityDistribution).length,
        observation_coverage: Object.entries(cityDistribution).map(([city, count]) => ({
          city,
          observations: count
        }))
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});