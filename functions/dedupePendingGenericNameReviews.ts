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

  console.log('[dedupePendingGenericNameReviews] Starting deduplication...');

  // Fetch all stations for reference
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
    `[dedupePendingGenericNameReviews] Found ${reviews.length} pending generic_name_review records`
  );

  // Group by stationId
  const groupsByStation = {};
  for (const review of reviews) {
    if (!groupsByStation[review.stationId]) {
      groupsByStation[review.stationId] = [];
    }
    groupsByStation[review.stationId].push(review);
  }

  // Find duplicates and auto-resolve them
  const keptReviews = [];
  const resolvedDuplicates = [];
  let totalDuplicateGroupsFound = 0;
  let totalDuplicateRowsResolved = 0;

  for (const [stationId, stationReviews] of Object.entries(groupsByStation)) {
    if (stationReviews.length > 1) {
      totalDuplicateGroupsFound++;
      
      // Sort by created_date descending (keep most recent)
      stationReviews.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));

      // Keep the first (most recent)
      const keptReview = stationReviews[0];
      keptReviews.push({
        reviewId: keptReview.id,
        stationId: keptReview.stationId,
        stationName: stationMap[stationId]?.name || 'unknown',
        createdDate: keptReview.created_date,
      });

      // Auto-resolve all others
      for (let i = 1; i < stationReviews.length; i++) {
        const duplicateReview = stationReviews[i];
        try {
          await base44.asServiceRole.entities.StationReview.update(
            duplicateReview.id,
            {
              status: 'auto_resolved',
              reviewReason: 'redundant_duplicate_review',
              notes: `Auto-resolved: redundant duplicate pending generic_name_review for same stationId (kept review: ${keptReview.id})`,
            }
          );

          totalDuplicateRowsResolved++;
          resolvedDuplicates.push({
            reviewId: duplicateReview.id,
            stationId: stationId,
            stationName: stationMap[stationId]?.name || 'unknown',
            createdDate: duplicateReview.created_date,
            keptReviewId: keptReview.id,
          });

          console.log(
            `[dedupePendingGenericNameReviews] ✓ Auto-resolved duplicate review ${duplicateReview.id} for station ${stationMap[stationId]?.name || stationId}`
          );
        } catch (error) {
          console.error(
            `[dedupePendingGenericNameReviews] ✗ Failed to auto-resolve ${duplicateReview.id}:`,
            error.message
          );
        }
      }
    } else {
      // Single pending review for this station - keep it
      const review = stationReviews[0];
      keptReviews.push({
        reviewId: review.id,
        stationId: review.stationId,
        stationName: stationMap[stationId]?.name || 'unknown',
        createdDate: review.created_date,
      });
    }
  }

  // Summary
  const summary = {
    totalPendingGenericReviewsScanned: reviews.length,
    duplicateGroupsFound: totalDuplicateGroupsFound,
    totalDuplicatePendingRowsAutoResolved: totalDuplicateRowsResolved,
    totalKeptReviews: keptReviews.length,
  };

  console.log('[dedupePendingGenericNameReviews] ── SUMMARY ──');
  console.log(
    `  Total pending generic_name_review scanned: ${summary.totalPendingGenericReviewsScanned}`
  );
  console.log(
    `  Duplicate groups found: ${summary.duplicateGroupsFound}`
  );
  console.log(
    `  Duplicate pending rows auto-resolved: ${summary.totalDuplicatePendingRowsAutoResolved}`
  );
  console.log(
    `  Reviews kept as pending: ${summary.totalKeptReviews}`
  );

  if (resolvedDuplicates.length > 0) {
    console.log(`  ── RESOLVED DUPLICATES EXAMPLES ──`);
    for (const item of resolvedDuplicates.slice(0, 10)) {
      console.log(
        `    • ${item.stationName} (kept: ${item.keptReviewId})`
      );
    }
  }

  return Response.json({
    success: true,
    summary,
    keptReviewExamples: keptReviews.slice(0, 20),
    resolvedDuplicateExamples: resolvedDuplicates.slice(0, 20),
    fullResolvedDuplicates: resolvedDuplicates,
  });
});