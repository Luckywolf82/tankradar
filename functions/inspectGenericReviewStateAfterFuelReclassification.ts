import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();

  if (!user || user.role !== 'admin') {
    return Response.json(
      { error: 'Forbidden: Admin access required' },
      { status: 403 }
    );
  }

  console.log('[inspectGenericReviewStateAfterFuelReclassification] Starting inspection...');

  // Fetch all local_fuel_site_review records (pending or approved)
  let localFuelReviews = [];
  let page = 0;
  while (true) {
    const batch = await base44.asServiceRole.entities.StationReview.filter(
      { review_type: 'local_fuel_site_review' },
      '-created_date',
      500,
      page * 500
    );
    if (!batch || batch.length === 0) break;
    localFuelReviews = localFuelReviews.concat(batch);
    if (batch.length < 500) break;
    page++;
  }

  console.log(
    `[inspectGenericReviewStateAfterFuelReclassification] Found ${localFuelReviews.length} local_fuel_site_review records`
  );

  // Collect unique stationIds with local fuel site reviews
  const stationIdsWithLocalFuelReview = new Set();
  for (const review of localFuelReviews) {
    stationIdsWithLocalFuelReview.add(review.stationId);
  }

  console.log(
    `[inspectGenericReviewStateAfterFuelReclassification] Unique stations with local_fuel_site_review: ${stationIdsWithLocalFuelReview.size}`
  );

  // For each station, fetch generic_name_review records
  const inspectionResults = [];
  const stationsWithOldGenericStillPending = [];
  const stationsWhereGenericWasResolved = [];
  const stationsWithMultipleConflictingPendingReviews = [];

  for (const stationId of stationIdsWithLocalFuelReview) {
    let genericReviews = [];
    page = 0;
    while (true) {
      const batch = await base44.asServiceRole.entities.StationReview.filter(
        { stationId: stationId, review_type: 'generic_name_review' },
        '-created_date',
        500,
        page * 500
      );
      if (!batch || batch.length === 0) break;
      genericReviews = genericReviews.concat(batch);
      if (batch.length < 500) break;
      page++;
    }

    if (genericReviews.length > 0) {
      // Get the local fuel review for this station (to show relation)
      const localReviewForStation = localFuelReviews.find(
        (r) => r.stationId === stationId
      );

      // Count pending vs resolved generic reviews
      const pendingGenericCount = genericReviews.filter(
        (r) => r.status === 'pending'
      ).length;
      const resolvedGenericCount = genericReviews.filter(
        (r) => r.status !== 'pending'
      ).length;

      // Check for multiple conflicting pending reviews
      const hasMultiplePending =
        pendingGenericCount > 1 &&
        localReviewForStation &&
        localReviewForStation.status === 'pending';

      const record = {
        stationId: stationId,
        stationName: localReviewForStation?.station_name || 'unknown',
        hasLocalFuelReview: !!localReviewForStation,
        localFuelReviewStatus: localReviewForStation?.status || null,
        localFuelReviewId: localReviewForStation?.id || null,
        localFuelReviewCreatedDate: localReviewForStation?.created_date || null,
        genericReviewCount: genericReviews.length,
        pendingGenericCount: pendingGenericCount,
        resolvedGenericCount: resolvedGenericCount,
        hasMultipleConflictingPendingReviews: hasMultiplePending,
        genericReviews: genericReviews.map((r) => ({
          reviewId: r.id,
          review_type: r.review_type,
          status: r.status,
          created_date: r.created_date,
          updated_date: r.updated_date,
          reviewReason: r.reviewReason || null,
          notes: r.notes || null,
        })),
      };

      inspectionResults.push(record);

      // Categorize
      if (pendingGenericCount > 0) {
        stationsWithOldGenericStillPending.push({
          stationId: stationId,
          stationName: record.stationName,
          pendingGenericCount: pendingGenericCount,
          localFuelReviewStatus: localReviewForStation?.status,
        });
      } else if (resolvedGenericCount > 0) {
        stationsWhereGenericWasResolved.push({
          stationId: stationId,
          stationName: record.stationName,
          resolvedGenericCount: resolvedGenericCount,
        });
      }

      if (hasMultiplePending) {
        stationsWithMultipleConflictingPendingReviews.push({
          stationId: stationId,
          stationName: record.stationName,
          pendingGenericCount: pendingGenericCount,
          localFuelReviewStatus: localReviewForStation?.status,
        });
      }
    }
  }

  const summary = {
    totalStationsInspected: stationIdsWithLocalFuelReview.size,
    stationsWithGenericReviewHistory: inspectionResults.length,
    stationsWithOldGenericStillPending: stationsWithOldGenericStillPending.length,
    stationsWhereGenericWasResolved: stationsWhereGenericWasResolved.length,
    stationsWithMultipleConflictingPendingReviews:
      stationsWithMultipleConflictingPendingReviews.length,
  };

  console.log('[inspectGenericReviewStateAfterFuelReclassification] ── SUMMARY ──');
  console.log(`  Total stations with local_fuel_site_review: ${summary.totalStationsInspected}`);
  console.log(
    `  Stations with generic_name_review history: ${summary.stationsWithGenericReviewHistory}`
  );
  console.log(
    `  Stations with old generic still PENDING: ${summary.stationsWithOldGenericStillPending}`
  );
  console.log(
    `  Stations where generic was resolved: ${summary.stationsWhereGenericWasResolved}`
  );
  console.log(
    `  Stations with multiple conflicting pending: ${summary.stationsWithMultipleConflictingPendingReviews}`
  );

  if (stationsWithOldGenericStillPending.length > 0) {
    console.log(`  ── PROBLEMATIC: OLD GENERIC STILL PENDING ──`);
    for (const station of stationsWithOldGenericStillPending.slice(0, 10)) {
      console.log(
        `    • ${station.stationName} (${station.pendingGenericCount} pending generic, local_fuel status: ${station.localFuelReviewStatus})`
      );
    }
  }

  if (stationsWithMultipleConflictingPendingReviews.length > 0) {
    console.log(`  ── CONFLICTS: MULTIPLE PENDING REVIEWS ──`);
    for (const station of stationsWithMultipleConflictingPendingReviews.slice(0, 10)) {
      console.log(
        `    • ${station.stationName} (${station.pendingGenericCount} pending generic, local_fuel: ${station.localFuelReviewStatus})`
      );
    }
  }

  return Response.json({
    success: true,
    summary,
    stationsWithOldGenericStillPending: stationsWithOldGenericStillPending.slice(0, 25),
    stationsWhereGenericWasResolved: stationsWhereGenericWasResolved.slice(0, 25),
    stationsWithMultipleConflictingPendingReviews: stationsWithMultipleConflictingPendingReviews.slice(0, 25),
    fullInspectionResults: inspectionResults,
  });
});