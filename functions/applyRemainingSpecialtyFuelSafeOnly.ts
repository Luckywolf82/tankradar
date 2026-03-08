import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const norm = (s) => (s || '').toLowerCase().replace(/[^\w\s]/g, '').trim();

const SPECIALTY_FUEL_SIGNALS = [
  'lpg',
  'cng',
  'hydrogen',
  'hynion',
  'biogas',
  'truck diesel',
  'parafin',
  'fyringsolje',
  'gass automat',
];

const SERVICE_DEALER_SIGNALS = [
  'service',
  'varmeservice',
  'sanitær',
  'landbruksverksted',
  'verksted',
  'bobilsenter',
  'motor',
  'bilservice',
  'forhandler',
];

const detectSignals = (stationName) => {
  const normalized = norm(stationName);
  const signals = {
    specialty_fuel: [],
    service_dealer: [],
  };

  for (const keyword of SPECIALTY_FUEL_SIGNALS) {
    if (normalized.includes(norm(keyword))) {
      signals.specialty_fuel.push(keyword);
    }
  }

  for (const keyword of SERVICE_DEALER_SIGNALS) {
    if (normalized.includes(norm(keyword))) {
      signals.service_dealer.push(keyword);
    }
  }

  return signals;
};

const classifyBucket = (stationName, signals) => {
  const hasFuelSignals = signals.specialty_fuel.length > 0;
  const hasServiceSignals = signals.service_dealer.length > 0;

  // Service/dealer signals present — skip
  if (hasServiceSignals) {
    return {
      bucket: 'service_or_dealer_manual_hold',
      confidence: 0,
      isSafe: false,
    };
  }

  // Clear specialty fuel signals only
  if (hasFuelSignals) {
    return {
      bucket: 'safe_specialty_fuel',
      confidence: 0.9,
      isSafe: true,
    };
  }

  // No clear signals — skip
  return {
    bucket: 'unclear_manual_review',
    confidence: 0,
    isSafe: false,
  };
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

  console.log('[applyRemainingSpecialtyFuelSafeOnly] Starting conservative apply...');

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

  // Fetch pending specialty_fuel_review reviews
  let reviews = [];
  page = 0;
  while (true) {
    const batch = await base44.asServiceRole.entities.StationReview.filter(
      { review_type: 'specialty_fuel_review', status: 'pending' },
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
    `[applyRemainingSpecialtyFuelSafeOnly] Found ${reviews.length} pending specialty_fuel_review records`
  );

  // Analyze and apply
  const applied = [];
  const skipped = [];

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

    const signals = detectSignals(station.name);
    const classification = classifyBucket(station.name, signals);

    // Only apply if safe and high confidence
    if (!classification.isSafe || classification.confidence < 0.85) {
      skipped.push({
        reviewId: review.id,
        stationName: station.name,
        reason: `Not safe or low confidence (bucket: ${classification.bucket}, confidence: ${classification.confidence.toFixed(2)})`,
      });
      continue;
    }

    // Apply: mark review as auto_resolved
    try {
      await base44.asServiceRole.entities.StationReview.update(review.id, {
        status: 'auto_resolved',
      });

      console.log(
        `[applyRemainingSpecialtyFuelSafeOnly] ✓ Auto-resolved: ${station.name}`
      );

      applied.push({
        reviewId: review.id,
        stationId: station.id,
        stationName: station.name,
        signals: signals.specialty_fuel,
      });
    } catch (error) {
      console.error(
        `[applyRemainingSpecialtyFuelSafeOnly] ✗ Failed for ${station.name}:`,
        error.message
      );
      skipped.push({
        reviewId: review.id,
        stationName: station.name,
        reason: `Error: ${error.message}`,
      });
    }
  }

  // Build summary
  const summary = {
    totalAnalyzed: reviews.length,
    totalApplied: applied.length,
    totalSkipped: skipped.length,
  };

  // Console logging
  console.log('[applyRemainingSpecialtyFuelSafeOnly] ── SUMMARY ──');
  console.log(`  Total analyzed: ${summary.totalAnalyzed}`);
  console.log(`  Applied (auto-resolved): ${summary.totalApplied}`);
  console.log(`  Skipped: ${summary.totalSkipped}`);
  if (applied.length > 0) {
    console.log(`  Applied examples:`);
    for (const item of applied) {
      console.log(`    • ${item.stationName} (signals: ${item.signals.join(', ')})`);
    }
  }

  return Response.json({
    success: true,
    summary,
    appliedExamples: applied.slice(0, 15),
    skippedExamples: skipped.slice(0, 10),
    fullAppliedRows: applied,
  });
});