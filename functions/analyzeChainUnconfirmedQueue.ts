import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// Normalize text for matching
const norm = (s) => (s || '').toLowerCase().replace(/[^\w\s]/g, '').trim();
const normMatch = (s) => (s || '').toLowerCase().trim();

// Chain keyword patterns (strict matching only)
const CHAIN_PATTERNS = [
  {
    name: 'circle_k',
    bucket: 'likely_circle_k',
    keywords: ['circle k', 'circlek'],
    minConfidence: 0.85,
  },
  {
    name: 'shell',
    bucket: 'likely_shell',
    keywords: ['shell'],
    minConfidence: 0.9,
  },
  {
    name: 'esso',
    bucket: 'likely_esso',
    keywords: ['esso'],
    minConfidence: 0.9,
  },
  {
    name: 'st1',
    bucket: 'likely_st1',
    keywords: ['st1', 'st-1'],
    minConfidence: 0.85,
  },
  {
    name: 'uno-x',
    bucket: 'likely_unox',
    keywords: ['unox', 'uno-x'],
    minConfidence: 0.85,
  },
  {
    name: 'yx',
    bucket: 'likely_yx',
    keywords: ['yx'],
    minConfidence: 0.85,
  },
  {
    name: 'best',
    bucket: 'likely_best',
    keywords: ['best station', 'best as', 'best drivstoff'],
    minConfidence: 0.8,
  },
];

const detectLikelyChain = (stationName) => {
  const normalized = norm(stationName);
  const results = [];

  for (const pattern of CHAIN_PATTERNS) {
    for (const keyword of pattern.keywords) {
      if (normalized.includes(norm(keyword))) {
        results.push({
          chain: pattern.name,
          bucket: pattern.bucket,
          keyword,
          confidence: pattern.minConfidence,
        });
      }
    }
  }

  if (results.length === 0) {
    return {
      chain: null,
      bucket: 'unknown_chain',
      confidence: 0,
    };
  }

  // Return highest confidence match
  return results.reduce((best, current) =>
    current.confidence > best.confidence ? current : best
  );
};

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
    keywords: ['lpg', 'cng', 'hydrogen', 'biogas', 'etanol', 'parafin'],
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

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();

  if (!user || user.role !== 'admin') {
    return Response.json(
      { error: 'Forbidden: Admin access required' },
      { status: 403 }
    );
  }

  console.log('[analyzeChainUnconfirmedQueue] Starting analysis...');

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
    `[analyzeChainUnconfirmedQueue] Found ${reviews.length} pending chain_unconfirmed reviews`
  );

  // Analyze each review
  const analyzed = [];
  const bucketMap = {};
  const confidenceByBucket = {};
  const semanticBucketMap = {};
  const semanticConfidenceByBucket = {};

  for (const review of reviews) {
    const station = stationMap[review.stationId];
    if (!station) continue;

    const detection = detectLikelyChain(station.name);
    const semantic = classifySemanticBucket(station.name);

    const record = {
      reviewId: review.id,
      stationId: station.id,
      stationName: station.name,
      currentChain: station.chain || null,
      currentOperator: station.operator || null,
      currentStationType: station.stationType || null,
      // Chain detection
      detectedChain: detection.chain,
      chainBucket: detection.bucket,
      chainConfidence: detection.confidence,
      chainKeyword: detection.keyword || null,
      // Semantic reclassification
      semanticBucket: semantic.semanticBucket,
      semanticConfidence: semantic.semanticConfidence,
      semanticSignals: semantic.detectedSignals.map((s) => s.keyword),
    };

    analyzed.push(record);

    // Track chain stats
    if (!bucketMap[detection.bucket]) {
      bucketMap[detection.bucket] = 0;
      confidenceByBucket[detection.bucket] = [];
    }
    bucketMap[detection.bucket]++;
    confidenceByBucket[detection.bucket].push(detection.confidence);

    // Track semantic stats
    if (!semanticBucketMap[semantic.semanticBucket]) {
      semanticBucketMap[semantic.semanticBucket] = 0;
      semanticConfidenceByBucket[semantic.semanticBucket] = [];
    }
    semanticBucketMap[semantic.semanticBucket]++;
    semanticConfidenceByBucket[semantic.semanticBucket].push(
      semantic.semanticConfidence
    );
  }

  // Calculate average confidence per bucket
  const avgConfidenceByBucket = {};
  for (const [bucket, scores] of Object.entries(confidenceByBucket)) {
    avgConfidenceByBucket[bucket] =
      scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
  }

  const avgSemanticConfidenceByBucket = {};
  for (const [bucket, scores] of Object.entries(semanticConfidenceByBucket)) {
    avgSemanticConfidenceByBucket[bucket] =
      scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
  }

  // Extract examples per chain bucket
  const examplesByChainBucket = {};
  for (const bucket of [
    'likely_circle_k',
    'likely_shell',
    'likely_esso',
    'likely_st1',
    'likely_unox',
    'likely_yx',
    'likely_best',
    'unknown_chain',
  ]) {
    examplesByChainBucket[bucket] = analyzed
      .filter((a) => a.chainBucket === bucket)
      .slice(0, 10);
  }

  // Extract examples per semantic bucket
  const examplesBySemanticBucket = {};
  for (const bucket of [
    'likely_local_fuel_site',
    'likely_specialty_fuel_site',
    'likely_retail_fuel_operator',
    'likely_non_fuel_or_marine',
    'unclear_manual_review',
  ]) {
    examplesBySemanticBucket[bucket] = analyzed
      .filter((a) => a.semanticBucket === bucket)
      .slice(0, 10);
  }

  // Build summary
  const summary = {
    totalPendingChainUnconfirmed: reviews.length,
    chainDetection: {
      perBucket: bucketMap,
      avgConfidencePerBucket: avgConfidenceByBucket,
    },
    semanticReclassification: {
      perBucket: semanticBucketMap,
      avgConfidencePerBucket: avgSemanticConfidenceByBucket,
    },
  };

  // Console logging
  console.log('[analyzeChainUnconfirmedQueue] ── SUMMARY ──');
  console.log(
    `  Total pending chain_unconfirmed: ${summary.totalPendingChainUnconfirmed}`
  );
  console.log(`  ── CHAIN DETECTION (strict) ──`);
  for (const [bucket, count] of Object.entries(summary.chainDetection.perBucket)) {
    const avgConf = summary.chainDetection.avgConfidencePerBucket[bucket] || 0;
    console.log(
      `    - ${bucket}: ${count} (avg confidence: ${avgConf.toFixed(2)})`
    );
  }
  console.log(`  ── SEMANTIC RECLASSIFICATION ──`);
  for (const [bucket, count] of Object.entries(summary.semanticReclassification.perBucket)) {
    const avgConf = summary.semanticReclassification.avgConfidencePerBucket[bucket] || 0;
    console.log(
      `    - ${bucket}: ${count} (avg confidence: ${avgConf.toFixed(2)})`
    );
  }

  return Response.json({
    success: true,
    summary,
    examplesByChainBucket,
    examplesBySemanticBucket,
    fullResultRows: analyzed,
  });
});