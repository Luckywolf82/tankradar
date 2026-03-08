import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const norm = (s) => (s || '').toLowerCase().replace(/[^\w\s]/g, '').trim();

// Strict word-boundary patterns for specialty fuel
const SPECIALTY_FUEL_PATTERNS = [
  { pattern: /\blpg\b/, keyword: 'lpg' },
  { pattern: /\bcng\b/, keyword: 'cng' },
  { pattern: /\bbiogass\b/, keyword: 'biogass' },
  { pattern: /\bgass automat\b/, keyword: 'gass automat' },
  { pattern: /\bparafin\b/, keyword: 'parafin' },
  { pattern: /\bfyringsolje\b/, keyword: 'fyringsolje' },
  { pattern: /\bhynion\b/, keyword: 'hynion' },
  { pattern: /\bhydrogen\b/, keyword: 'hydrogen' },
  { pattern: /\btruck diesel\b/, keyword: 'truck diesel' },
  { pattern: /\btruckdisel\b/, keyword: 'truckdisel' },
];

const FUEL_SITE_KEYWORDS = ['tanken', 'bensin', 'diesel', 'fuel', 'tank', 'service', 'station'];
const RETAIL_KEYWORDS = ['coop', 'spar', 'joker', 'meny', 'rema', 'narvesen', 'kiosk'];
const NON_FUEL_KEYWORDS = ['camping', 'kafé', 'restaurant', 'pub', 'hotell', 'museum', 'havn', 'marina'];

const classifySemanticBucket = (stationName, stationType, operator) => {
  const normalized = norm(stationName);
  
  // Check specialty fuel signals using strict word-boundary patterns
  for (const { pattern, keyword } of SPECIALTY_FUEL_PATTERNS) {
    if (pattern.test(normalized)) {
      return { bucket: 'likely_specialty_fuel', confidence: 0.9, keyword };
    }
  }
  
  // Check retail operator signals
  if (operator) {
    const normOperator = norm(operator);
    for (const kw of RETAIL_KEYWORDS) {
      if (normOperator.includes(kw)) {
        return { bucket: 'likely_retail_fuel', confidence: 0.85, keyword: kw };
      }
    }
  }
  
  // Check non-fuel signals
  for (const kw of NON_FUEL_KEYWORDS) {
    if (normalized.includes(kw)) {
      return { bucket: 'likely_non_fuel', confidence: 0.8, keyword: kw };
    }
  }
  
  // Check fuel site signals
  for (const kw of FUEL_SITE_KEYWORDS) {
    if (normalized.includes(kw)) {
      return { bucket: 'likely_local_fuel_site', confidence: 0.75, keyword: kw };
    }
  }
  
  return { bucket: 'unclassified', confidence: 0, keyword: null };
};

const determineTargetReviewType = (semanticBucket, semanticConfidence, stationType, operator) => {
  if (semanticBucket === 'likely_local_fuel_site' && semanticConfidence >= 0.9) {
    return { targetType: 'local_fuel_site_review', safe: true };
  }
  if (semanticBucket === 'likely_specialty_fuel' && semanticConfidence >= 0.9) {
    return { targetType: 'specialty_fuel_review', safe: true };
  }
  if (stationType === 'retail_fuel' && operator) {
    return { targetType: 'retail_fuel_operator_review', safe: true };
  }
  return { targetType: null, safe: false };
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

  console.log('[resolveSemanticChainUnconfirmed] Starting processing...');

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

  console.log(`[resolveSemanticChainUnconfirmed] Found ${pendingReviews.length} pending chain_unconfirmed reviews`);

  const reclassified = [];
  const skipped = [];

  for (const review of pendingReviews) {
    const station = stationMap[review.stationId];
    if (!station) {
      skipped.push({
        reviewId: review.id,
        stationName: review.station_name || 'unknown',
        reason: 'Station not found',
      });
      continue;
    }

    const { bucket, confidence, keyword } = classifySemanticBucket(
      station.name,
      station.stationType,
      station.operator
    );

    const { targetType, safe } = determineTargetReviewType(bucket, confidence, station.stationType, station.operator);

    if (!safe || !targetType) {
      skipped.push({
        reviewId: review.id,
        stationName: station.name,
        reason: `Not safe: bucket=${bucket}, confidence=${confidence}`,
      });
      continue;
    }

    try {
      // Update the review in place by changing review_type
      await base44.asServiceRole.entities.StationReview.update(review.id, {
        review_type: targetType,
        notes: `Reclassified from chain_unconfirmed: semantic bucket=${bucket}, confidence=${confidence}, keyword="${keyword}"`,
      });

      reclassified.push({
        reviewId: review.id,
        stationId: station.id,
        stationName: station.name,
        previousReviewType: 'chain_unconfirmed',
        newReviewType: targetType,
        semanticBucket: bucket,
        semanticConfidence: confidence,
      });

      console.log(
        `[resolveSemanticChainUnconfirmed] ✓ Reclassified ${station.name} to ${targetType}`
      );
    } catch (error) {
      console.error(
        `[resolveSemanticChainUnconfirmed] ✗ Failed to reclassify ${station.name}:`,
        error.message
      );
      skipped.push({
        reviewId: review.id,
        stationName: station.name,
        reason: `Error: ${error.message}`,
      });
    }
  }

  const reclassifiedByType = {};
  for (const item of reclassified) {
    const key = item.newReviewType;
    if (!reclassifiedByType[key]) reclassifiedByType[key] = 0;
    reclassifiedByType[key]++;
  }

  const summary = {
    totalAnalyzed: pendingReviews.length,
    totalReclassified: reclassified.length,
    totalSkipped: skipped.length,
    reclassifiedByTargetType: reclassifiedByType,
  };

  console.log('[resolveSemanticChainUnconfirmed] ── SUMMARY ──');
  console.log(`  Total analyzed: ${summary.totalAnalyzed}`);
  console.log(`  Reclassified: ${summary.totalReclassified}`);
  console.log(`  Skipped: ${summary.totalSkipped}`);
  console.log(`  By target type:`, reclassifiedByType);

  if (reclassified.length > 0) {
    console.log(`  Examples:`, reclassified.slice(0, 5).map(r => `${r.stationName} → ${r.newReviewType}`).join(' | '));
  }

  return Response.json({
    success: true,
    summary,
    reclassifiedExamples: reclassified.slice(0, 20),
    skippedExamples: skipped.slice(0, 10),
  });
});