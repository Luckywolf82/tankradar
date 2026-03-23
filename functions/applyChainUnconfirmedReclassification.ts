import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const norm = (s) => (s || '').toLowerCase().replace(/[^\w\s]/g, '').trim();

const SEMANTIC_SIGNALS = {
  local_fuel_site: {
    keywords: [
      'tanken',
      'bensin',
      'drivstoff',
      'diesel',
      'oktan',
      'shell select',
      'prisbillig',
      'lokaltank',
    ],
    score: 1.0,
  },
  specialty_fuel: {
    keywords: ['lpg', 'cng', 'hydrogen', 'biogas', 'etanol', 'parafin', 'gass', 'automat'],
    score: 0.9,
  },
  retail_fuel_operator: {
    keywords: [
      'coop',
      'spar',
      'joker',
      'rema',
      'kiwi',
      'extra',
      'meny',
      'narvesen',
    ],
    score: 0.85,
  },
  non_fuel_or_marine: {
    keywords: [
      'båt',
      'marina',
      'sjø',
      'marine',
      'restaurant',
      'kafé',
      'pub',
      'museum',
      'hotell',
      'verksted',
      'mekaniker',
      'automat',
    ],
    score: 0.8,
  },
};

const classifySemanticBucket = (stationName) => {
  const normalized = norm(stationName);
  const detectedSignals = [];

  for (const [bucketName, config] of Object.entries(SEMANTIC_SIGNALS)) {
    for (const keyword of config.keywords) {
      if (normalized.includes(norm(keyword))) {
        detectedSignals.push({
          bucket: bucketName,
          keyword,
          score: config.score,
        });
      }
    }
  }

  if (detectedSignals.length === 0) {
    return {
      semanticBucket: 'unclear_manual_review',
      detectedSignals: [],
      semanticConfidence: 0,
    };
  }

  const best = detectedSignals.reduce((a, b) =>
    a.score > b.score ? a : b
  );

  return {
    semanticBucket: `likely_${best.bucket}`,
    detectedSignals,
    semanticConfidence: best.score,
  };
};

const mapSemanticToReviewType = (semanticBucket, station) => {
  if (semanticBucket === 'unclear_manual_review') {
    return {
      targetReviewType: null,
      safeToReclassify: false,
      explanation: 'Unclear signals - requires manual review',
    };
  }

  if (station.operator && station.stationType === 'retail_fuel') {
    return {
      targetReviewType: 'retail_fuel_operator_review',
      safeToReclassify: true,
      explanation: `Already retail_fuel with operator "${station.operator}" - safe to reclassify away from chain_unconfirmed`,
    };
  }

  if (semanticBucket === 'likely_local_fuel_site') {
    return {
      targetReviewType: 'local_fuel_site_review',
      safeToReclassify: true,
      explanation: 'Clear local fuel site signals (tanken, bensin, drivstoff, etc)',
    };
  }

  if (semanticBucket === 'likely_specialty_fuel') {
    return {
      targetReviewType: 'specialty_fuel_review',
      safeToReclassify: true,
      explanation: 'Clear specialty fuel signals (lpg, cng, biogas, parafin, gass automat, etc)',
    };
  }

  if (semanticBucket === 'likely_retail_fuel_operator') {
    return {
      targetReviewType: null,
      safeToReclassify: false,
      explanation: 'Retail operator signals but missing operator or incorrect stationType - requires manual review',
    };
  }

  if (semanticBucket === 'likely_non_fuel_or_marine') {
    return {
      targetReviewType: 'non_fuel_poi_review',
      safeToReclassify: true,
      explanation: 'Non-fuel or marine facility signals - reclassify away from chain_unconfirmed',
    };
  }

  return {
    targetReviewType: null,
    safeToReclassify: false,
    explanation: 'Unknown semantic bucket',
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

  console.log('[applyChainUnconfirmedReclassification] Starting reclassification...');

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

  // Fetch pending chain_unconfirmed reviews
  let reviews = [];
  page = 0;
  while (true) {
    const batch = await base44.asServiceRole.entities.StationReview.filter(
      { review_type: 'chain_unconfirmed', status: 'pending' },
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
    `[applyChainUnconfirmedReclassification] Found ${reviews.length} pending chain_unconfirmed reviews`
  );

  // Apply reclassification
  const applied = [];
  const skipped = [];
  const appliedByType = {};

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

    const semantic = classifySemanticBucket(station.name);
    const reclassification = mapSemanticToReviewType(semantic.semanticBucket, station);

    if (!reclassification.safeToReclassify || !reclassification.targetReviewType) {
      skipped.push({
        reviewId: review.id,
        stationName: station.name,
        reason: reclassification.explanation,
      });
      continue;
    }

    // Apply the reclassification
    try {
      await base44.asServiceRole.entities.StationReview.update(review.id, {
        review_type: reclassification.targetReviewType,
      });

      console.log(
        `[applyChainUnconfirmedReclassification] ✓ ${station.name} → ${reclassification.targetReviewType}`
      );

      applied.push({
        reviewId: review.id,
        stationId: station.id,
        stationName: station.name,
        targetReviewType: reclassification.targetReviewType,
      });

      if (!appliedByType[reclassification.targetReviewType]) {
        appliedByType[reclassification.targetReviewType] = 0;
      }
      appliedByType[reclassification.targetReviewType]++;
    } catch (error) {
      console.error(
        `[applyChainUnconfirmedReclassification] ✗ Failed to apply for ${station.name}:`,
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
    appliedByTargetType: appliedByType,
  };

  // Console logging
  console.log('[applyChainUnconfirmedReclassification] ── SUMMARY ──');
  console.log(`  Total analyzed: ${summary.totalAnalyzed}`);
  console.log(`  Applied: ${summary.totalApplied}`);
  console.log(`  Skipped: ${summary.totalSkipped}`);
  console.log(`  Applied by target type:`);
  for (const [type, count] of Object.entries(summary.appliedByTargetType)) {
    console.log(`    - ${type}: ${count}`);
  }

  return Response.json({
    success: true,
    summary,
    appliedExamples: applied.slice(0, 15),
    skippedExamples: skipped.slice(0, 10),
    fullAppliedRows: applied,
  });
});