import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const norm = (s) => (s || '').toLowerCase().replace(/[^\w\s]/g, '').trim();

const CLEAR_TANKEN_INDICATORS = ['tanken', 'tank'];

const NON_FUEL_POI_SIGNALS = [
  'camping',
  'kafé',
  'restaurant',
  'pub',
  'hotell',
  'museum',
  'havn',
  'servicesenter',
  'verksted',
  'bar',
  'pizzeria',
  'grill',
  'guesthouse',
  'bed',
  'breakfast',
];

const isClearTankenCase = (stationName, stationChain) => {
  const normalizedName = norm(stationName);
  const normalizedChain = norm(stationChain);

  // Check if chain is Tanken
  if (normalizedChain.includes('tanken')) {
    return true;
  }

  // Check if name is clearly Tanken/Tank
  for (const indicator of CLEAR_TANKEN_INDICATORS) {
    if (normalizedName === indicator) {
      return true;
    }
  }

  return false;
};

const hasConflictingNonFuelSignals = (stationName) => {
  const normalized = norm(stationName);
  for (const keyword of NON_FUEL_POI_SIGNALS) {
    if (normalized.includes(norm(keyword))) {
      return true;
    }
  }
  return false;
};

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();

  if (!user || user.role !== 'admin') {
    return Response.json(
      { error: 'Forbidden: Admin access required' },
      { status: 403 }
    );
  }

  console.log('[resolveMisbucketedGenericFuelSiteReviews] Starting scan...');

  // Fetch all stations
  let allStations = [];
  let page = 0;
  while (true) {
    const batch = await base44.asServiceRole.entities.Station.list(
      '-created_date',
      500,
      page * 500
    );
    if (!batch || batch.length === 0) break;
    allStations = allStations.concat(batch);
    if (batch.length < 500) break;
    page++;
  }
  const stationMap = {};
  for (const s of allStations) stationMap[s.id] = s;

  // Fetch all pending generic_name_review reviews
  let reviews = [];
  page = 0;
  while (true) {
    const batch = await base44.asServiceRole.entities.StationReview.filter(
      { review_type: 'generic_name_review', status: 'pending' },
      '-created_date',
      500,
      page * 500
    );
    if (!batch || batch.length === 0) break;
    reviews = reviews.concat(batch);
    if (batch.length < 500) break;
    page++;
  }

  console.log(
    `[resolveMisbucketedGenericFuelSiteReviews] Found ${reviews.length} pending generic_name_review records`
  );

  const skipped = [];
  const reclassified = [];
  const autoResolved = [];

  for (const review of reviews) {
    const station = stationMap[review.stationId];
    if (!station) {
      skipped.push({
        reviewId: review.id,
        stationName: review.station_name || 'unknown',
        reason: 'Station not found',
      });
      continue;
    }

    // Check if it's a clear Tanken case
    if (!isClearTankenCase(station.name, station.chain)) {
      skipped.push({
        reviewId: review.id,
        stationName: station.name,
        reason: 'Not a clear Tanken case',
      });
      continue;
    }

    // Check for conflicting non-fuel signals
    if (hasConflictingNonFuelSignals(station.name)) {
      skipped.push({
        reviewId: review.id,
        stationName: station.name,
        reason: 'Conflicting non-fuel POI signals detected',
      });
      continue;
    }

    // Check if local_fuel_site_review already exists
    let existingLocalFuelReview = null;
    try {
      const existingReviews = await base44.asServiceRole.entities.StationReview.filter(
        { stationId: station.id, review_type: 'local_fuel_site_review' },
        '-created_date',
        1
      );
      if (existingReviews && existingReviews.length > 0) {
        existingLocalFuelReview = existingReviews[0];
      }
    } catch (error) {
      console.error(
        `[resolveMisbucketedGenericFuelSiteReviews] Error checking for local_fuel_site_review: ${error.message}`
      );
    }

    try {
      // If local_fuel_site_review doesn't exist, create one
      if (!existingLocalFuelReview) {
        await base44.asServiceRole.entities.StationReview.create({
          stationId: station.id,
          review_type: 'local_fuel_site_review',
          status: 'approved',
          reviewReason: 'auto_classified',
          station_name: station.name,
          station_chain: station.chain || null,
          station_operator: station.operator || null,
          station_stationType: station.stationType || null,
          station_latitude: station.latitude || null,
          station_longitude: station.longitude || null,
          issue_description: 'Tanken fuel site — auto-classified as confirmed local fuel site',
          notes: 'Auto-created: Clear Tanken fuel site case, reclassified from generic_name_review',
        });
      }

      // Mark the generic_name_review as auto_resolved
      await base44.asServiceRole.entities.StationReview.update(review.id, {
        status: 'auto_resolved',
        notes: `Auto-resolved: Clear Tanken fuel site case. Reclassified to local_fuel_site_review.`,
      });

      reclassified.push({
        reviewId: review.id,
        stationId: station.id,
        stationName: station.name,
        chain: station.chain,
        action: existingLocalFuelReview ? 'updated_existing' : 'created_new',
      });

      console.log(
        `[resolveMisbucketedGenericFuelSiteReviews] ✓ Reclassified ${station.name} to local_fuel_site_review`
      );
    } catch (error) {
      console.error(
        `[resolveMisbucketedGenericFuelSiteReviews] ✗ Failed for ${station.name}:`,
        error.message
      );
      skipped.push({
        reviewId: review.id,
        stationName: station.name,
        reason: `Error: ${error.message}`,
      });
    }
  }

  const summary = {
    totalScanned: reviews.length,
    totalReclassified: reclassified.length,
    totalAutoResolved: autoResolved.length,
    totalSkipped: skipped.length,
  };

  console.log('[resolveMisbucketedGenericFuelSiteReviews] ── SUMMARY ──');
  console.log(`  Total scanned: ${summary.totalScanned}`);
  console.log(`  Reclassified to local_fuel_site_review: ${summary.totalReclassified}`);
  console.log(`  Auto-resolved: ${summary.totalAutoResolved}`);
  console.log(`  Skipped: ${summary.totalSkipped}`);

  if (reclassified.length > 0) {
    console.log(`  ── RECLASSIFIED EXAMPLES ──`);
    for (const item of reclassified.slice(0, 10)) {
      console.log(
        `    • ${item.stationName} (chain: ${item.chain || 'none'}, action: ${item.action})`
      );
    }
  }

  return Response.json({
    success: true,
    summary,
    reclassifiedExamples: reclassified.slice(0, 20),
    skippedExamples: skipped.slice(0, 10),
    fullReclassifiedRows: reclassified,
  });
});