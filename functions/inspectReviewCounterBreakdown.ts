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

  console.log('[inspectReviewCounterBreakdown] Starting inspection...');

  // Fetch all StationReview records
  let allReviews = [];
  let page = 0;
  while (true) {
    const batch = await base44.asServiceRole.entities.StationReview.list(
      '-created_date',
      500,
      page * 500
    );
    if (!batch || batch.length === 0) break;
    allReviews = allReviews.concat(batch);
    if (batch.length < 500) break;
    page++;
  }

  console.log(`[inspectReviewCounterBreakdown] Total reviews: ${allReviews.length}`);

  // Build breakdown maps
  const reviewTypeMap = {}; // { review_type: total_count }
  const reviewTypeStatusMap = {}; // { review_type: { status: count } }
  const allStatuses = new Set();

  for (const review of allReviews) {
    const rt = review.review_type;
    const status = review.status;

    // Track all statuses found
    allStatuses.add(status);

    // Count by review_type
    if (!reviewTypeMap[rt]) {
      reviewTypeMap[rt] = 0;
    }
    reviewTypeMap[rt]++;

    // Count by review_type + status
    if (!reviewTypeStatusMap[rt]) {
      reviewTypeStatusMap[rt] = {};
    }
    if (!reviewTypeStatusMap[rt][status]) {
      reviewTypeStatusMap[rt][status] = 0;
    }
    reviewTypeStatusMap[rt][status]++;
  }

  // Calculate actionable pending (should be shown in UI as items needing review)
  const actionablePendingByType = {};
  for (const rt of Object.keys(reviewTypeStatusMap)) {
    const counts = reviewTypeStatusMap[rt];
    actionablePendingByType[rt] = counts['pending'] || 0;
  }

  // Calculate total non-pending by type (historical/resolved reviews)
  const nonPendingByType = {};
  for (const rt of Object.keys(reviewTypeStatusMap)) {
    const counts = reviewTypeStatusMap[rt];
    let nonPending = 0;
    for (const [status, count] of Object.entries(counts)) {
      if (status !== 'pending') {
        nonPending += count;
      }
    }
    nonPendingByType[rt] = nonPending;
  }

  // Diagnosis: determine if UI likely includes historical reviews
  const totalPending = Object.values(actionablePendingByType).reduce((a, b) => a + b, 0);
  const totalNonPending = Object.values(nonPendingByType).reduce((a, b) => a + b, 0);
  const likelyIncludingHistorical = totalNonPending > 0 ? 'YES' : 'NO';

  const diagnosis =
    likelyIncludingHistorical === 'YES'
      ? `YES — ${totalNonPending} non-pending reviews exist. If UI counters show high numbers, they likely include approved/rejected/auto_resolved reviews, not just pending actionable items.`
      : `NO — All ${totalPending} reviews are pending, no historical records.`;

  // Focus on key review types
  const focusTypes = [
    'generic_name_review',
    'chain_unconfirmed',
    'specialty_fuel_review',
    'non_fuel_poi_review',
    'local_fuel_site_review',
    'retail_fuel_operator_review',
  ];

  const focusBreakdown = {};
  for (const rt of focusTypes) {
    if (reviewTypeStatusMap[rt]) {
      focusBreakdown[rt] = {
        total: reviewTypeMap[rt] || 0,
        byStatus: reviewTypeStatusMap[rt],
        actionablePending: actionablePendingByType[rt] || 0,
        nonPending: nonPendingByType[rt] || 0,
      };
    }
  }

  console.log('[inspectReviewCounterBreakdown] ── SUMMARY ──');
  console.log(`  Total reviews: ${allReviews.length}`);
  console.log(`  Total pending (actionable): ${totalPending}`);
  console.log(`  Total non-pending (historical): ${totalNonPending}`);
  console.log(`  All statuses found: ${Array.from(allStatuses).sort().join(', ')}`);
  console.log(`  Likely including historical: ${likelyIncludingHistorical}`);

  console.log(`  ── BY REVIEW TYPE (all) ──`);
  for (const [rt, count] of Object.entries(reviewTypeMap).sort()) {
    console.log(`    ${rt}: ${count}`);
  }

  console.log(`  ── FOCUS TYPES BREAKDOWN ──`);
  for (const rt of focusTypes) {
    if (focusBreakdown[rt]) {
      const bd = focusBreakdown[rt];
      const statusStr = Object.entries(bd.byStatus)
        .map(([s, c]) => `${s}:${c}`)
        .join(' | ');
      console.log(
        `    ${rt}: total=${bd.total}, pending=${bd.actionablePending}, non-pending=${bd.nonPending} [${statusStr}]`
      );
    }
  }

  return Response.json({
    success: true,
    summary: {
      totalReviews: allReviews.length,
      totalPending: totalPending,
      totalNonPending: totalNonPending,
      allStatusesFound: Array.from(allStatuses).sort(),
      likelyIncludingHistorical: likelyIncludingHistorical,
      diagnosis: diagnosis,
    },
    countsByReviewType: reviewTypeMap,
    countsByReviewTypeAndStatus: reviewTypeStatusMap,
    actionablePendingByReviewType: actionablePendingByType,
    nonPendingByReviewType: nonPendingByType,
    focusTypesBreakdown: focusBreakdown,
  });
});