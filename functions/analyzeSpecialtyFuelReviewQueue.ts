import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const norm = (s) => {
  if (!s) return '';
  return s.toLowerCase()
    .replace(/^["']+|["']+$/g, '')
    .replace(/\s*\(.*?\)\s*/g, ' ')
    .replace(/[-–—]+/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
};

const normMatch = (s) => norm(s).replace(/æ/g, 'ae').replace(/ø/g, 'oe').replace(/å/g, 'aa');

const FUEL_SIGNALS = [
  'lpg', 'gass', 'hydrogen', 'h2', 'cng', 'parafin', 'fyringsolje',
  'diesel', 'truck', 'marina', 'bunkring', 'bensin', 'drivstoff',
  'automat', 'pumpe',
];

const NON_FUEL_SIGNALS = [
  'camping', 'kafé', 'cafe', 'restaurant', 'hotell', 'hotel',
  'park', 'museum', 'miljø', 'miljo', 'kommune', 'industri',
  'turist', 'hytter', 'overnatting', 'feriesenter', 'resort',
];

const SERVICE_SIGNALS = [
  'verksted', 'autoservice', 'bil', 'motor', 'service',
  'traktor', 'maskin', 'mekaniker', 'værksted',
];

const detectSignals = (name) => {
  const n = norm(name);
  const nm = normMatch(name);
  const signals = [];

  for (const sig of FUEL_SIGNALS) {
    if (n.includes(sig) || nm.includes(normMatch(sig))) {
      signals.push(`fuel:${sig}`);
    }
  }

  for (const sig of NON_FUEL_SIGNALS) {
    if (n.includes(sig) || nm.includes(normMatch(sig))) {
      signals.push(`non_fuel:${sig}`);
    }
  }

  for (const sig of SERVICE_SIGNALS) {
    if (n.includes(sig) || nm.includes(normMatch(sig))) {
      signals.push(`service:${sig}`);
    }
  }

  return signals;
};

const deriveBucket = (stationType, signalsDetected) => {
  const hasFuelSignal = signalsDetected.some(s => s.startsWith('fuel:'));
  const hasNonFuelSignal = signalsDetected.some(s => s.startsWith('non_fuel:'));
  const hasServiceSignal = signalsDetected.some(s => s.startsWith('service:'));

  const hasMarina = signalsDetected.some(s => s === 'fuel:marina' || s === 'fuel:bunkring');
  const hasTruck = signalsDetected.some(s => s === 'fuel:truck');

  // Clear specialty fuel site types
  if (stationType === 'lpg' || stationType === 'cng' || stationType === 'truck_diesel' || stationType === 'biogas' || stationType === 'marine_fuel') {
    if (hasMarina) return 'likely_marina_fuel';
    return 'likely_specialty_fuel';
  }

  // Signal-based detection
  if (hasMarina) return 'likely_marina_fuel';
  if (hasTruck && hasFuelSignal) return 'likely_specialty_fuel';
  if (hasNonFuelSignal && !hasFuelSignal) return 'likely_non_fuel_poi';
  if (hasServiceSignal && !hasFuelSignal) return 'likely_service_point';
  if (hasFuelSignal && !hasNonFuelSignal) return 'likely_specialty_fuel';

  return 'unclear_manual_review';
};

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();

  if (!user || user.role !== 'admin') {
    return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }

  console.log(`[analyzeSpecialtyFuelReviewQueue] Starting analysis...`);

  // Fetch all stations
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

  // Fetch pending specialty_fuel_review records
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

  console.log(`[analyzeSpecialtyFuelReviewQueue] Found ${reviews.length} pending specialty_fuel_reviews`);

  // Analyze each review
  const analyzed = [];
  const bucketMap = {};
  const signalMap = {};
  const countryMap = {};
  const chainPresenceMap = { has_chain: 0, no_chain: 0 };

  for (const review of reviews) {
    const station = stationMap[review.stationId];
    if (!station) continue;

    const signals = detectSignals(station.name);
    const bucket = deriveBucket(station.stationType, signals);
    const country = station.region ? 'NO' : 'unknown';

    // Track bucket
    if (!bucketMap[bucket]) bucketMap[bucket] = 0;
    bucketMap[bucket]++;

    // Track signals
    for (const sig of signals) {
      if (!signalMap[sig]) signalMap[sig] = 0;
      signalMap[sig]++;
    }

    // Track country
    if (!countryMap[country]) countryMap[country] = 0;
    countryMap[country]++;

    // Track chain presence
    if (station.chain) chainPresenceMap.has_chain++;
    else chainPresenceMap.no_chain++;

    analyzed.push({
      stationId: station.id,
      stationName: station.name,
      derivedBucket: bucket,
      signalsDetected: signals,
      chain: station.chain || null,
      operator: station.operator || null,
      stationType: station.stationType || null,
      reviewReason: review.reviewReason,
      created_date: review.created_date,
    });
  }

  // Build examples per bucket
  const examplesByBucket = {};
  const buckets = Object.keys(bucketMap);
  for (const bucket of buckets) {
    examplesByBucket[bucket] = analyzed
      .filter(a => a.derivedBucket === bucket)
      .slice(0, 10);
  }

  // Sort signals by frequency
  const signalsByFrequency = Object.entries(signalMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20);

  // Build summary
  const summary = {
    totalPendingSpecialtyFuelReviews: reviews.length,
    distributionByDerivedBucket: bucketMap,
    examplesByBucket,
    distributionByKeywordSignals: Object.fromEntries(signalsByFrequency),
    distributionByCountry: countryMap,
    distributionByChainPresence: chainPresenceMap,
  };

  // Console logging
  console.log('[analyzeSpecialtyFuelReviewQueue] ── SUMMARY ──');
  console.log(`  Total pending specialty_fuel_reviews: ${summary.totalPendingSpecialtyFuelReviews}`);
  console.log(`  Distribution by derived bucket:`);
  for (const [bucket, count] of Object.entries(summary.distributionByDerivedBucket)) {
    console.log(`    - ${bucket}: ${count}`);
  }
  console.log(`  Top keyword signals:`);
  for (const [signal, count] of signalsByFrequency.slice(0, 10)) {
    console.log(`    - ${signal}: ${count}`);
  }
  console.log(`  Chain presence:`);
  console.log(`    - has_chain: ${summary.distributionByChainPresence.has_chain}`);
  console.log(`    - no_chain: ${summary.distributionByChainPresence.no_chain}`);

  return Response.json({
    success: true,
    summary,
    fullResultRows: analyzed,
  });
});