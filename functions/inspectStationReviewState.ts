import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();

  if (!user || user.role !== 'admin') {
    return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const stationIds = body?.stationIds || [];

  if (!stationIds || stationIds.length === 0) {
    return Response.json({ error: 'stationIds array required' }, { status: 400 });
  }

  console.log(`[inspectStationReviewState] Inspecting ${stationIds.length} stations`);

  // Fetch all stations to map IDs to names
  let allStations = [];
  let page = 0;
  while (true) {
    const batch = await base44.asServiceRole.entities.Station.list('-created_date', 500, page * 500);
    if (!batch || batch.length === 0) break;
    allStations = allStations.concat(batch);
    if (batch.length < 500) break;
    page++;
  }

  const stationMap = {};
  for (const s of allStations) stationMap[s.id] = s;

  // Fetch all reviews
  let allReviews = [];
  page = 0;
  while (true) {
    const batch = await base44.asServiceRole.entities.StationReview.list('-created_date', 500, page * 500);
    if (!batch || batch.length === 0) break;
    allReviews = allReviews.concat(batch);
    if (batch.length < 500) break;
    page++;
  }

  const reviewsByStation = {};
  for (const r of allReviews) {
    if (!reviewsByStation[r.stationId]) reviewsByStation[r.stationId] = [];
    reviewsByStation[r.stationId].push(r);
  }

  // Build result for requested stations
  const result = [];

  for (const stationId of stationIds) {
    const station = stationMap[stationId];
    if (!station) {
      result.push({
        stationId,
        stationName: 'NOT_FOUND',
        reviews: [],
      });
      continue;
    }

    const reviews = reviewsByStation[stationId] || [];
    const reviewData = reviews.map(r => ({
      id: r.id,
      review_type: r.review_type,
      status: r.status,
      reviewReason: r.reviewReason,
      created_date: r.created_date,
      updated_date: r.updated_date,
    }));

    result.push({
      stationId,
      stationName: station.name,
      reviewCount: reviewData.length,
      reviews: reviewData,
    });

    console.log(`[inspectStationReviewState] ${station.name}: ${reviewData.length} reviews`);
    for (const r of reviewData) {
      console.log(`  - ${r.review_type} (${r.status}) — reason: ${r.reviewReason} — created: ${r.created_date?.substring(0, 10)}`);
    }
  }

  return Response.json({ success: true, stationsInspected: result.length, result });
});