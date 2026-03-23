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

const NON_FUEL_POI_SIGNALS = [
  'restaurant',
  'kafé',
  'pub',
  'hotell',
  'museum',
  'butikk',
  'kiosk',
  'market',
  'supermarket',
  'barn',
  'camping',
];

const detectSignals = (stationName) => {
  const normalized = norm(stationName);
  const signals = {
    specialty_fuel: [],
    service_dealer: [],
    non_fuel_poi: [],
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

  for (const keyword of NON_FUEL_POI_SIGNALS) {
    if (normalized.includes(norm(keyword))) {
      signals.non_fuel_poi.push(keyword);
    }
  }

  return signals;
};

const classifyBucket = (stationName, signals) => {
  const hasFuelSignals = signals.specialty_fuel.length > 0;
  const hasServiceSignals = signals.service_dealer.length > 0;
  const hasPOISignals = signals.non_fuel_poi.length > 0;

  // If service/dealer signals present, prefer manual hold even if fuel signals exist
  if (hasServiceSignals && hasFuelSignals) {
    return {
      bucket: 'service_or_dealer_manual_hold',
      confidence: 0.8,
      explanation: `Strong service/dealer signals (${signals.service_dealer.join(', ')}) with fuel signals — manual review required`,
    };
  }

  if (hasServiceSignals) {
    return {
      bucket: 'service_or_dealer_manual_hold',
      confidence: 0.85,
      explanation: `Service/dealer pattern detected (${signals.service_dealer.join(', ')}) — not primary fuel site`,
    };
  }

  // Clear specialty fuel signals with no service/dealer conflict
  if (hasFuelSignals) {
    return {
      bucket: 'safe_specialty_fuel',
      confidence: 0.9,
      explanation: `Clear specialty fuel signals: ${signals.specialty_fuel.join(', ')}`,
    };
  }

  // Non-fuel POI signals
  if (hasPOISignals) {
    return {
      bucket: 'likely_non_fuel_poi',
      confidence: 0.8,
      explanation: `Non-fuel POI signals detected (${signals.non_fuel_poi.join(', ')})`,
    };
  }

  // No clear signals
  return {
    bucket: 'unclear_manual_review',
    confidence: 0,
    explanation: 'No strong signals detected — requires manual review',
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

  console.log('[analyzeRemainingSpecialtyFuelQueue] Starting analysis of specialty_fuel_review queue...');

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
    `[analyzeRemainingSpecialtyFuelQueue] Found ${reviews.length} pending specialty_fuel_review records`
  );

  // Analyze each review
  const analyzed = [];
  const bucketMap = {};
  const examplesByBucket = {};

  for (const review of reviews) {
    const station = stationMap[review.stationId];
    if (!station) continue;

    const signals = detectSignals(station.name);
    const classification = classifyBucket(station.name, signals);

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
        specialty_fuel: signals.specialty_fuel,
        service_dealer: signals.service_dealer,
        non_fuel_poi: signals.non_fuel_poi,
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
    totalPendingSpecialtyFuelReviews: reviews.length,
    distributionByBucket: bucketMap,
  };

  // Console logging
  console.log('[analyzeRemainingSpecialtyFuelQueue] ── SUMMARY ──');
  console.log(`  Total pending specialty_fuel_review: ${summary.totalPendingSpecialtyFuelReviews}`);
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