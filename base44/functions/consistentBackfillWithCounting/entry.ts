import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Step 1: Fetch all FuelPrice records
    const allPrices = await base44.entities.FuelPrice.list();
    console.log(`Total FuelPrice records: ${allPrices.length}`);

    // Step 2: Categorize each record consistently
    const healthy = [];
    const recoverable = [];
    const irreparable = [];

    for (const price of allPrices) {
      const issues = [];
      
      // Check for issues
      if (!price.sourceName) issues.push('missing_sourceName');
      if (!price.plausibilityStatus) issues.push('missing_plausibilityStatus');
      if (!price.locationLabel && !price.stationId) issues.push('missing_locationLabel_and_stationId');
      if (price.priceNok == null || price.priceNok <= 0) issues.push('invalid_price');
      if (!price.fetchedAt) issues.push('missing_fetchedAt');

      // Categorize
      if (issues.includes('invalid_price')) {
        irreparable.push({ id: price.id, reason: 'invalid_price', price: price.priceNok });
      } else if (issues.length === 0) {
        healthy.push(price.id);
      } else {
        // Can be recovered
        recoverable.push({ id: price.id, issues });
      }
    }

    console.log(`Categorization: ${healthy.length} healthy, ${recoverable.length} recoverable, ${irreparable.length} irreparable`);
    const sum = healthy.length + recoverable.length + irreparable.length;
    console.log(`Sum check: ${sum} (should equal ${allPrices.length})`);

    if (sum !== allPrices.length) {
      return Response.json({
        error: 'Categorization mismatch',
        total: allPrices.length,
        healthy: healthy.length,
        recoverable: recoverable.length,
        irreparable: irreparable.length,
        sum
      }, { status: 400 });
    }

    // Step 3a: Backfill sourceName for user_reported (no stationId)
    let sourceName_backfilled = 0;
    for (const rec of recoverable) {
      const price = allPrices.find(p => p.id === rec.id);
      if (rec.issues.includes('missing_sourceName') && !price.stationId) {
        await base44.entities.FuelPrice.update(price.id, { sourceName: 'user_reported' });
        sourceName_backfilled++;
      }
    }

    // Step 3b: Backfill plausibilityStatus
    let plausibility_backfilled = 0;
    for (const rec of recoverable) {
      const price = allPrices.find(p => p.id === rec.id);
      if (rec.issues.includes('missing_plausibilityStatus') && price.priceNok > 0) {
        let status = 'realistic_price';
        if (price.priceNok < 10 || price.priceNok > 25) {
          status = price.priceNok < 10 ? 'suspect_price_low' : 'suspect_price_high';
        }
        await base44.entities.FuelPrice.update(price.id, { plausibilityStatus: status });
        plausibility_backfilled++;
      }
    }

    // Step 3c: Backfill locationLabel from Station.city
    let locationLabel_backfilled = 0;
    for (const rec of recoverable) {
      const price = allPrices.find(p => p.id === rec.id);
      if (rec.issues.includes('missing_locationLabel_and_stationId') && price.stationId) {
        try {
          const station = await base44.entities.Station.get(price.stationId);
          if (station?.city) {
            await base44.entities.FuelPrice.update(price.id, { locationLabel: station.city });
            locationLabel_backfilled++;
          }
        } catch (e) {
          console.log(`Could not find station ${price.stationId}`);
        }
      }
    }

    // Step 3d: Delete irreparable
    let deleted = 0;
    for (const irr of irreparable) {
      await base44.entities.FuelPrice.delete(irr.id);
      deleted++;
    }

    // Step 4: Count final state
    const finalPrices = await base44.entities.FuelPrice.list();
    const sourceNameCounts = {};
    const plausibilityCounts = {};
    const locationLabelCounts = {};

    for (const p of finalPrices) {
      sourceNameCounts[p.sourceName || 'null'] = (sourceNameCounts[p.sourceName || 'null'] || 0) + 1;
      plausibilityCounts[p.plausibilityStatus || 'null'] = (plausibilityCounts[p.plausibilityStatus || 'null'] || 0) + 1;
      locationLabelCounts[p.locationLabel ? 'present' : 'null'] = (locationLabelCounts[p.locationLabel ? 'present' : 'null'] || 0) + 1;
    }

    return Response.json({
      before: {
        total: allPrices.length,
        healthy: healthy.length,
        recoverable: recoverable.length,
        irreparable: irreparable.length
      },
      backfill: {
        sourceName_backfilled,
        plausibility_backfilled,
        locationLabel_backfilled
      },
      deleted,
      after: {
        total: finalPrices.length,
        sourceNameDistribution: sourceNameCounts,
        plausibilityDistribution: plausibilityCounts,
        locationLabelDistribution: locationLabelCounts
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});