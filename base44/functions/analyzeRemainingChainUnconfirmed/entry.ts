import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const norm = (s) => (s || '').toLowerCase().replace(/[^\w\s]/g, '').trim();

// Strict word-boundary patterns for each semantic bucket
const LOCAL_FUEL_SITE_PATTERNS = [
  { pattern: /\bbensin\b/, keyword: 'bensin' },
  { pattern: /\bdiesel\b/, keyword: 'diesel' },
  { pattern: /\bdrivstoff\b/, keyword: 'drivstoff' },
  { pattern: /\bpumpe\b/, keyword: 'pumpe' },
  { pattern: /\bservicesenter\b/, keyword: 'servicesenter' },
  { pattern: /\boljeservice\b/, keyword: 'oljeservice' },
  { pattern: /\btank\b/, keyword: 'tank' },
];

const SERVICE_OR_RETAIL_PATTERNS = [
  { pattern: /\bservicehandel\b/, keyword: 'servicehandel' },
  { pattern: /\bverksted\b/, keyword: 'verksted' },
  { pattern: /\bvarmeservice\b/, keyword: 'varmeservice' },
  { pattern: /\bbilservice\b/, keyword: 'bilservice' },
  { pattern: /\bhandel\b/, keyword: 'handel' },
];

const MARINE_OR_PORT_PATTERNS = [
  { pattern: /\bmarina\b/, keyword: 'marina' },
  { pattern: /\bhavn\b/, keyword: 'havn' },
  { pattern: /\bbåt\b/, keyword: 'båt' },
  { pattern: /\bbrygge\b/, keyword: 'brygge' },
  { pattern: /\bmarine\b/, keyword: 'marine' },
  { pattern: /\bsjø\b/, keyword: 'sjø' },
];

const KNOWN_CHAINS = [
  'circle k',
  'uno-x',
  'unox',
  'shell',
  'esso',
  'st1',
  'yx',
  'best',
];

const detectKeywords = (text, patterns) => {
  const normalized = norm(text);
  const detected = [];
  for (const { pattern, keyword } of patterns) {
    if (pattern.test(normalized)) {
      detected.push(keyword);
    }
  }
  return detected;
};

const classifyStation = (stationName, operator, stationType) => {
  // Check for known chain operators
  const combinedText = norm(stationName + ' ' + (operator || ''));
  for (const chain of KNOWN_CHAINS) {
    if (combinedText.includes(chain)) {
      return {
        bucket: 'possible_chain_operator',
        confidence: 0.85,
        keywords: [chain],
      };
    }
  }

  // Check for local fuel site keywords
  let keywords = detectKeywords(stationName, LOCAL_FUEL_SITE_PATTERNS);
  if (keywords.length > 0) {
    return {
      bucket: 'likely_local_fuel_site',
      confidence: 0.8,
      keywords,
    };
  }

  // Check for marine/port keywords
  keywords = detectKeywords(stationName, MARINE_OR_PORT_PATTERNS);
  if (keywords.length > 0) {
    return {
      bucket: 'likely_marine_or_port',
      confidence: 0.8,
      keywords,
    };
  }

  // Check for service/retail keywords
  keywords = detectKeywords(stationName, SERVICE_OR_RETAIL_PATTERNS);
  if (keywords.length > 0) {
    return {
      bucket: 'likely_service_or_retail',
      confidence: 0.75,
      keywords,
    };
  }

  // No confident signal
  return {
    bucket: 'unclear_manual_review',
    confidence: 0,
    keywords: [],
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

  console.log('[analyzeRemainingChainUnconfirmed] Starting analysis...');

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

  // Fetch only pending chain_unconfirmed reviews
  let pendingReviews = [];
  page = 0;
  while (true) {
    const batch = await base44.asServiceRole.entities.StationReview.filter(
      { review_type: 'chain_unconfirmed', status: 'pending' },
      '-created_date',
      500,
      page * 500
    );
    if (!batch || batch.length === 0) break;
    pendingReviews = pendingReviews.concat(batch);
    if (batch.length < 500) break;
    page++;
  }

  console.log(`[analyzeRemainingChainUnconfirmed] Found ${pendingReviews.length} pending chain_unconfirmed reviews`);

  const details = [];
  const bucketExamples = {
    likely_local_fuel_site: [],
    likely_service_or_retail: [],
    likely_marine_or_port: [],
    possible_chain_operator: [],
    unclear_manual_review: [],
  };
  const countsByBucket = {
    likely_local_fuel_site: 0,
    likely_service_or_retail: 0,
    likely_marine_or_port: 0,
    possible_chain_operator: 0,
    unclear_manual_review: 0,
  };

  for (const review of pendingReviews) {
    const station = stationMap[review.stationId];
    if (!station) continue;

    const { bucket, confidence, keywords } = classifyStation(
      station.name,
      station.operator,
      station.stationType
    );

    countsByBucket[bucket]++;

    const item = {
      reviewId: review.id,
      stationId: station.id,
      stationName: station.name,
      city: station.city || null,
      operator: station.operator || null,
      stationType: station.stationType || null,
      detectedKeywords: keywords,
      semanticBucket: bucket,
      semanticConfidence: confidence,
    };

    details.push(item);

    // Keep first 5 examples per bucket
    if (bucketExamples[bucket].length < 5) {
      bucketExamples[bucket].push(item);
    }
  }

  const summary = {
    totalAnalyzed: pendingReviews.length,
    countsByBucket,
  };

  console.log('[analyzeRemainingChainUnconfirmed] ── SUMMARY ──');
  console.log(`  Total analyzed: ${summary.totalAnalyzed}`);
  console.log(`  Counts by bucket:`, countsByBucket);
  console.log('[analyzeRemainingChainUnconfirmed] Analysis complete');

  return Response.json({
    success: true,
    summary,
    bucketExamples,
    allDetails: details,
  });
});