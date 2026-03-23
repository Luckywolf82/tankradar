import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const norm = (s) => (s || '').toLowerCase().replace(/[^\w\s]/g, '').trim();

const FUEL_SITE_SIGNALS = [
  'bensin',
  'drivstoff',
  'tank',
  'tanken',
  'pumpe',
  'automat',
  'fuel',
  'diesel',
];

const RETAIL_OPERATOR_SIGNALS = [
  'spar',
  'coop',
  'joker',
  'butikk',
  'handel',
  'nærbutikk',
  'marked',
  'supermarket',
  'kiosk',
];

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

const DUPLICATE_HINTS = [
  'a',
  'i',
  'og',
  'til',
  '1',
  '2',
  'nord',
  'sør',
  'øst',
  'vest',
];

const detectSignals = (stationName, chain, operator) => {
  const normalized = norm(stationName);
  const signals = {
    fuel_site: [],
    retail_operator: [],
    non_fuel_poi: [],
    duplicate_hints: [],
  };

  // Check fuel signals
  for (const keyword of FUEL_SITE_SIGNALS) {
    if (normalized.includes(norm(keyword))) {
      signals.fuel_site.push(keyword);
    }
  }

  // Check retail/operator signals
  for (const keyword of RETAIL_OPERATOR_SIGNALS) {
    if (
      normalized.includes(norm(keyword)) ||
      (chain && norm(chain).includes(norm(keyword))) ||
      (operator && norm(operator).includes(norm(keyword)))
    ) {
      signals.retail_operator.push(keyword);
    }
  }

  // Check non-fuel POI signals
  for (const keyword of NON_FUEL_POI_SIGNALS) {
    if (normalized.includes(norm(keyword))) {
      signals.non_fuel_poi.push(keyword);
    }
  }

  // Check for duplicate hints (very short/generic names)
  if (normalized.length <= 3) {
    signals.duplicate_hints.push('very_short_name');
  }
  for (const hint of DUPLICATE_HINTS) {
    if (normalized === norm(hint)) {
      signals.duplicate_hints.push('single_letter_or_generic_word');
    }
  }

  return signals;
};

const classifyBucket = (stationName, chain, operator, signals) => {
  const hasFuelSignals = signals.fuel_site.length > 0;
  const hasRetailSignals = signals.retail_operator.length > 0;
  const hasPOISignals = signals.non_fuel_poi.length > 0;
  const hasDuplicateHints = signals.duplicate_hints.length > 0;

  // Non-fuel POI takes priority
  if (hasPOISignals) {
    return {
      bucket: 'likely_non_fuel_poi',
      confidence: 0.85,
      explanation: `Non-fuel POI signals: ${signals.non_fuel_poi.join(', ')}`,
    };
  }

  // Retail/operator with or without fuel signals
  if (hasRetailSignals) {
    return {
      bucket: 'likely_retail_fuel_operator',
      confidence: 0.8,
      explanation: `Retail/operator signals: ${signals.retail_operator.join(', ')}`,
    };
  }

  // Clear fuel signals indicate local fuel site
  if (hasFuelSignals) {
    return {
      bucket: 'likely_local_fuel_site',
      confidence: 0.85,
      explanation: `Fuel site signals: ${signals.fuel_site.join(', ')}`,
    };
  }

  // Duplicate hints
  if (hasDuplicateHints) {
    return {
      bucket: 'possible_duplicate_or_merge_candidate',
      confidence: 0.6,
      explanation: `Generic/short name hints: ${signals.duplicate_hints.join(', ')} — possible duplicate candidate`,
    };
  }

  // Truly generic with no clear signals
  return {
    bucket: 'true_generic_manual_review',
    confidence: 0.9,
    explanation: 'No clear signals detected — requires manual review',
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

  console.log('[analyzeGenericNameQueue] Starting analysis of generic_name_review queue...');

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

  // Fetch pending generic_name_review reviews
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
    `[analyzeGenericNameQueue] Found ${reviews.length} pending generic_name_review records`
  );

  // Analyze each review
  const analyzed = [];
  const bucketMap = {};
  const examplesByBucket = {};

  for (const review of reviews) {
    const station = stationMap[review.stationId];
    if (!station) continue;

    const signals = detectSignals(
      station.name,
      station.chain,
      station.operator
    );
    const classification = classifyBucket(
      station.name,
      station.chain,
      station.operator,
      signals
    );

    const record = {
      reviewId: review.id,
      stationId: station.id,
      stationName: station.name,
      currentChain: station.chain || null,
      currentOperator: station.operator || null,
      currentStationType: station.stationType || null,
      derivedBucket: classification.bucket,
      confidence: classification.confidence,
      detectedSignals: {
        fuel_site: signals.fuel_site,
        retail_operator: signals.retail_operator,
        non_fuel_poi: signals.non_fuel_poi,
        duplicate_hints: signals.duplicate_hints,
      },
      explanation: classification.explanation,
    };

    analyzed.push(record);

    // Track distribution
    if (!bucketMap[classification.bucket]) {
      bucketMap[classification.bucket] = 0;
      examplesByBucket[classification.bucket] = [];
    }
    bucketMap[classification.bucket]++;
    if (examplesByBucket[classification.bucket].length < 15) {
      examplesByBucket[classification.bucket].push(record);
    }
  }

  // Build summary
  const summary = {
    totalPendingGenericNameReviews: reviews.length,
    distributionByBucket: bucketMap,
  };

  // Console logging
  console.log('[analyzeGenericNameQueue] ── SUMMARY ──');
  console.log(`  Total pending generic_name_review: ${summary.totalPendingGenericNameReviews}`);
  console.log(`  Distribution by bucket:`);
  for (const [bucket, count] of Object.entries(summary.distributionByBucket)) {
    console.log(`    - ${bucket}: ${count}`);
  }

  if (Object.values(examplesByBucket).some((ex) => ex.length > 0)) {
    console.log(`  ── EXAMPLES BY BUCKET ──`);
    for (const [bucket, examples] of Object.entries(examplesByBucket)) {
      if (examples.length > 0) {
        console.log(`  ${bucket}:`);
        for (const ex of examples.slice(0, 5)) {
          console.log(
            `    • ${ex.stationName} (confidence: ${ex.confidence.toFixed(2)}, signals: ${Object.values(ex.detectedSignals).flat().join(', ') || 'none'})`
          );
        }
      }
    }
  }

  return Response.json({
    success: true,
    summary,
    examplesByBucket,
    fullResultRows: analyzed,
  });
});