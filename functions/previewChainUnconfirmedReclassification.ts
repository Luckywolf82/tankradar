import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// Normalize text for matching
const norm = (s) => (s || '').toLowerCase().replace(/[^\w\s]/g, '').trim();

// Semantic bucketing for chain_unconfirmed reviews
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

  // Highest scoring bucket wins
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
  // Don't reclassify unclear items
  if (semanticBucket === 'unclear_manual_review') {
    return {
      targetReviewType: null,
      safeToReclassify: false,
      explanation: 'Unclear signals - requires manual review',
    };
  }

  // Check for retail operator + already set → retail_fuel_operator_review (safe resolution)
  // This takes priority over local_fuel_site to avoid false positives like "Esspartner Drivstoff"
  if (station.operator && station.stationType === 'retail_fuel') {
    return {
      targetReviewType: 'retail_fuel_operator_review',
      safeToReclassify: true,
      explanation: `Already retail_fuel with operator "${station.operator}" - safe to reclassify away from chain_unconfirmed`,
    };
  }

  // Local fuel site → local_fuel_site_review
  if (semanticBucket === 'likely_local_fuel_site') {
    return {
      targetReviewType: 'local_fuel_site_review',
      safeToReclassify: true,
      explanation: 'Clear local fuel site signals (tanken, bensin, drivstoff, etc)',
    };
  }

  // Specialty fuel → specialty_fuel_review
  if (semanticBucket === 'likely_specialty_fuel') {
    return {
      targetReviewType: 'specialty_fuel_review',
      safeToReclassify: true,
      explanation: 'Clear specialty fuel signals (lpg, cng, biogas, parafin, gass automat, etc)',
    };
  }

  // Retail operator signals (without operator already set)
  if (semanticBucket === 'likely_retail_fuel_operator') {
    return {
      targetReviewType: null,
      safeToReclassify: false,
      explanation: 'Retail operator signals but missing operator or incorrect stationType - requires manual review',
    };
  }

  // Non-fuel / marine → don't reclassify into chain context
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

  console.log('[previewChainUnconfirmedReclassification] Starting preview analysis...');

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
    `[previewChainUnconfirmedReclassification] Found ${reviews.length} pending chain_unconfirmed reviews`
  );

  // Analyze each review for reclassification
  const analyzed = [];
  const reclassificationMap = {};
  const safeCount = { total: 0, byType: {} };
  const manualHoldCount = { total: 0 };

  for (const review of reviews) {
    const station = stationMap[review.stationId];
    if (!station) continue;

    const semantic = classifySemanticBucket(station.name);
    const reclassification = mapSemanticToReviewType(semantic.semanticBucket, station);

    const record = {
      reviewId: review.id,
      stationId: station.id,
      stationName: station.name,
      currentReviewType: 'chain_unconfirmed',
      currentChain: station.chain || null,
      currentOperator: station.operator || null,
      currentStationType: station.stationType || null,
      // Semantic analysis
      semanticBucket: semantic.semanticBucket,
      semanticConfidence: semantic.semanticConfidence,
      semanticSignals: semantic.detectedSignals.map((s) => s.keyword),
      // Reclassification proposal
      targetReviewType: reclassification.targetReviewType,
      safeToReclassify: reclassification.safeToReclassify,
      explanation: reclassification.explanation,
    };

    analyzed.push(record);

    // Track stats
    if (reclassification.safeToReclassify && reclassification.targetReviewType) {
      safeCount.total++;
      if (!safeCount.byType[reclassification.targetReviewType]) {
        safeCount.byType[reclassification.targetReviewType] = 0;
      }
      safeCount.byType[reclassification.targetReviewType]++;
      
      if (!reclassificationMap[reclassification.targetReviewType]) {
        reclassificationMap[reclassification.targetReviewType] = 0;
      }
      reclassificationMap[reclassification.targetReviewType]++;
    } else if (!reclassification.safeToReclassify) {
      manualHoldCount.total++;
    }
  }

  // Extract examples by target review type
  const examplesByTarget = {};
  for (const targetType of [
    'local_fuel_site_review',
    'specialty_fuel_review',
    'retail_fuel_operator_review',
    'non_fuel_poi_review',
  ]) {
    examplesByTarget[targetType] = analyzed
      .filter((a) => a.targetReviewType === targetType && a.safeToReclassify)
      .slice(0, 15);
  }

  // Count items that stay in manual review
  const manualReviewStay = analyzed.filter(
    (a) => !a.safeToReclassify
  ).length;

  // Build summary
  const summary = {
    totalAnalyzed: reviews.length,
    totalProposedForReclassification: safeCount.total,
    totalManualReviewRequired: manualReviewStay,
    proposedByTargetType: reclassificationMap,
  };

  // Console logging
  console.log('[previewChainUnconfirmedReclassification] ── SUMMARY ──');
  console.log(`  Total analyzed: ${summary.totalAnalyzed}`);
  console.log(`  Safe to reclassify: ${summary.totalProposedForReclassification}`);
  console.log(`  Manual review required: ${summary.totalManualReviewRequired}`);
  console.log(`  Distribution by target type:`);
  for (const [type, count] of Object.entries(summary.proposedByTargetType)) {
    console.log(`    - ${type}: ${count}`);
  }

  if (Object.values(examplesByTarget).some((ex) => ex.length > 0)) {
    console.log(`  ── EXAMPLES BY TARGET ──`);
    for (const [type, examples] of Object.entries(examplesByTarget)) {
      if (examples.length > 0) {
        console.log(`  ${type}:`);
        for (const ex of examples.slice(0, 5)) {
          console.log(
            `    • ${ex.stationName} (confidence: ${ex.semanticConfidence.toFixed(2)})`
          );
        }
      }
    }
  }

  return Response.json({
    success: true,
    summary,
    examplesByTarget,
    fullResultRows: analyzed,
  });
});