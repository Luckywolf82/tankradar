import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// ─── NORMALIZATION ────────────────────────────────────────────────────────────

const norm = (s) => {
  if (!s) return '';
  return s.toLowerCase()
    .replace(/[æ]/g, 'ae').replace(/[ø]/g, 'oe').replace(/[å]/g, 'aa')
    .replace(/[-–—]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

// ─── SIGNAL HELPERS ───────────────────────────────────────────────────────────

const hasFuelSignal = (name) => {
  const n = norm(name);
  return /\b(bensin|drivstoff|bensinstasjon|tankstasjon|drivstoffstasjon|olje|fuel|diesel|parafin|fyringsolje|pumpe|tank|tanken|auto ?gass|bunker|petrol)\b/.test(n);
};

const hasCampingSignal = (name) => {
  const n = norm(name);
  return /\b(camp|camping|fjordcamp|hyttepark|kaffe|kafe|kafee|kafeteria|restaurant|turistsenter|turisthytte|gjestehavn|gjestefarm|gjestgiver|overnatting|turistcamp|naturcamp|friluft|feriesenter|resort|motell|pensjonat|cabin|hytte)\b/.test(n);
};

const hasServiceSignal = (name) => {
  const n = norm(name);
  return /\b(service|servicesenter|autoservice|bilservice|bilverksted|verksted|gummiservice|dekksenter|mekaniker|karosseri|bilvask|bildeler|motor|traktor|maskin|hjul|bil |bilsenteret|bilsenter|automat|bilrep|piggfritt)\b/.test(n);
};

const hasIndustrialSignal = (name) => {
  const n = norm(name);
  return /\b(kommune|kommunal|miljoepark|frevar|veolia|avfall|renovasjon|anlegg|deponi|sortering|gjenvinning|industri|fabrikk|lager|terminal|havneterminal|logistikk|spedisjon|containerhavn|industriomraade)\b/.test(n);
};

const hasRetailSignal = (name) => {
  const n = norm(name);
  return /\b(coop|joker|spar|matkroken|kiwi|rema ?1000|rema1000|meny|naerbutikken|nærbutikken|extra|bunnpris|handlar|ica|nk|dagligvare)\b/.test(n);
};

const hasForeignSignal = (name) => {
  const n = norm(name);
  return /\b(preem|okq8|teboil|suomen|sirbmae|sirbma|rajamarket|k-market|k market|finnland|finland|sverige|sweden|tanna|saelen|aere|ljungdalen|klimpfjaell|jokkmokk|kilpisjaervi|boxfjaell|taernae vilt|taernae)\b/.test(n);
};

const hasSpecialtySignal = (name) => {
  const n = norm(name);
  return /\b(lpg|cng|hydrogen|gass automat|biogass|biogas|hynion|autogass|auto gass|komprimert gass|flytende gass|lng)\b/.test(n);
};

const isGenericName = (name) => {
  const n = norm(name);
  return /^(independent|smia|fitjar|stasjon|stasjonen|pumpe|pumpen|max|lokal|naerservice|bensinstasjonen|tank|tanken|tank og kiosk|kiosk og bensin|bensin og kiosk|bensinstasjon|drivstoffautomat|tankautomat)$/.test(n);
};

const hasMarineSignal = (name) => {
  const n = norm(name);
  return /\b(marina|brygge|smaabaat|smabaathavn|baatforening|fiskehavn|baathavn|gjesthavn|gjestehamn|havneanlegg|kai|sjoefront|kanalen|bryggetorget)\b/.test(n);
};

// ─── BUCKET ASSIGNMENT (deterministic precedence) ─────────────────────────────

function assignBucket(name, chain, operator, stationType, reviewType) {
  const reasonTags = [];
  let analysisBucket = 'unclear_manual_review';

  const n = norm(name);

  // Pre-collect signals
  if (hasForeignSignal(name)) reasonTags.push('matches_foreign_pattern');
  if (hasSpecialtySignal(name)) reasonTags.push('contains_specialty_fuel_term');
  if (hasRetailSignal(name)) reasonTags.push('matches_retail_operator');
  if (hasCampingSignal(name)) reasonTags.push('contains_camping_term');
  if (hasIndustrialSignal(name)) reasonTags.push('contains_industrial_term');
  if (hasServiceSignal(name)) reasonTags.push('contains_service_term');
  if (hasFuelSignal(name)) reasonTags.push('contains_fuel_term');
  if (isGenericName(name)) reasonTags.push('generic_name_pattern');
  if (hasMarineSignal(name)) reasonTags.push('contains_marine_term');
  if (chain) reasonTags.push('has_existing_chain');
  if (operator) reasonTags.push('has_operator');
  if (stationType && stationType !== 'unknown') reasonTags.push('has_station_type');

  // Precedence order
  // 1. Foreign
  if (hasForeignSignal(name)) {
    analysisBucket = 'likely_foreign_or_border_case';
    return { analysisBucket, reasonTags, explanation: `Name matches known foreign station patterns: "${name}"` };
  }

  // 2. Specialty fuel
  if (hasSpecialtySignal(name) || stationType === 'lpg' || stationType === 'cng' || stationType === 'biogas') {
    analysisBucket = 'likely_specialty_fuel_site';
    return { analysisBucket, reasonTags, explanation: `Name or stationType indicates specialty fuel (LPG/CNG/biogas/hydrogen): "${name}"` };
  }

  // 3. Retail operator
  if (hasRetailSignal(name) || operator) {
    analysisBucket = 'likely_retail_fuel_operator';
    return { analysisBucket, reasonTags, explanation: `Name matches retail operator or operator field is set: "${name}" (operator: ${operator || 'via name'})` };
  }

  // 4. Camping / tourism
  if (hasCampingSignal(name)) {
    analysisBucket = 'likely_camping_or_tourism';
    return { analysisBucket, reasonTags, explanation: `Name contains camping or tourism terms with no stronger fuel evidence: "${name}"` };
  }

  // 5. Marine
  if (hasMarineSignal(name)) {
    analysisBucket = 'likely_non_fuel_poi';
    reasonTags.push('missing_supporting_fuel_signal');
    return { analysisBucket, reasonTags, explanation: `Name indicates marine facility: "${name}"` };
  }

  // 6. Industrial / municipal
  if (hasIndustrialSignal(name)) {
    analysisBucket = 'likely_industrial_or_municipal_facility';
    return { analysisBucket, reasonTags, explanation: `Name contains industrial or municipal terms: "${name}"` };
  }

  // 7. Service point (vehicle service / workshop) — only if no fuel signal
  if (hasServiceSignal(name) && !hasFuelSignal(name)) {
    analysisBucket = 'likely_service_point';
    reasonTags.push('missing_supporting_fuel_signal');
    return { analysisBucket, reasonTags, explanation: `Name contains service/workshop terms with no fuel signal: "${name}"` };
  }

  // 8. Local fuel site (has fuel signal, or has known chain, or explicitly named as fuel facility)
  if (hasFuelSignal(name) || chain) {
    analysisBucket = 'likely_local_fuel_site';
    return { analysisBucket, reasonTags, explanation: `Name contains fuel terms or chain is set: "${name}" (chain: ${chain || 'via name'})` };
  }

  // 9. Generic name only
  if (isGenericName(name)) {
    analysisBucket = 'likely_generic_name_only';
    return { analysisBucket, reasonTags, explanation: `Name is a known generic / non-specific name: "${name}"` };
  }

  // 10. Unclear
  reasonTags.push('missing_supporting_fuel_signal');
  analysisBucket = 'unclear_manual_review';
  return { analysisBucket, reasonTags, explanation: `No clear signal found for bucketing: "${name}"` };
}

// ─── HANDLER ──────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();

  if (!user || user.role !== 'admin') {
    return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }

  // Fetch all pending reviews (paginated)
  let allPending = [];
  let page = 0;
  while (true) {
    const batch = await base44.asServiceRole.entities.StationReview.filter(
      { status: 'pending' }, '-created_date', 500, page * 500
    );
    if (!batch || batch.length === 0) break;
    allPending = allPending.concat(batch);
    if (batch.length < 500) break;
    page++;
  }

  console.log(`[analyzePendingStationReviews] Fetched ${allPending.length} pending reviews`);

  // Fetch all stations for context lookup (by id map)
  let allStations = [];
  page = 0;
  while (true) {
    const batch = await base44.asServiceRole.entities.Station.list('-created_date', 500, page * 500);
    if (!batch || batch.length === 0) break;
    allStations = allStations.concat(batch);
    if (batch.length < 500) break;
    page++;
  }
  const stationMap = {};
  for (const s of allStations) stationMap[s.id] = s;

  // Detect duplicate review noise: same stationId + review_type appearing more than once
  const reviewKeyCount = {};
  for (const r of allPending) {
    const key = `${r.stationId}__${r.review_type}`;
    reviewKeyCount[key] = (reviewKeyCount[key] || 0) + 1;
  }

  // Analyze each review
  const details = [];
  const bucketCounts = {};
  const reviewTypeCounts = {};

  for (const review of allPending) {
    const station = stationMap[review.stationId] || {};

    // Resolve best available name
    const name = review.station_name || station.name || '(unknown)';
    const chain = review.station_chain || station.chain || null;
    const operator = review.station_operator || station.operator || null;
    const stationType = review.station_stationType || station.stationType || null;
    const city = station.city || null;
    const municipality = station.city || null; // city is closest available
    const areaLabel = station.areaLabel || null;
    const latitude = review.station_latitude || station.latitude || null;
    const longitude = review.station_longitude || station.longitude || null;

    // Duplicate review noise detection
    const key = `${review.stationId}__${review.review_type}`;
    const isDuplicateNoise = reviewKeyCount[key] > 1;

    let { analysisBucket, reasonTags, explanation } = assignBucket(name, chain, operator, stationType, review.review_type);

    if (isDuplicateNoise) {
      reasonTags.push('possible_duplicate_review');
      // Override to noise bucket only if no strong signal already pulled it elsewhere
      if (analysisBucket === 'unclear_manual_review') {
        analysisBucket = 'likely_duplicate_or_review_noise';
        explanation = `Multiple pending reviews with same stationId + review_type: "${name}"`;
      }
    }

    // Count
    bucketCounts[analysisBucket] = (bucketCounts[analysisBucket] || 0) + 1;
    reviewTypeCounts[review.review_type] = (reviewTypeCounts[review.review_type] || 0) + 1;

    details.push({
      reviewId: review.id,
      stationId: review.stationId,
      stationName: name,
      reviewType: review.review_type,
      currentChain: chain,
      currentOperator: operator,
      currentStationType: stationType,
      analysisBucket,
      reasonTags,
      explanation,
      coordinates: latitude && longitude ? { lat: latitude, lon: longitude } : null,
      city,
      municipality,
      areaLabel,
    });
  }

  // Build top examples per bucket (up to 5 names each)
  const examplesByBucket = {};
  for (const item of details) {
    if (!examplesByBucket[item.analysisBucket]) examplesByBucket[item.analysisBucket] = [];
    if (examplesByBucket[item.analysisBucket].length < 5) {
      examplesByBucket[item.analysisBucket].push(item.stationName);
    }
  }

  // Misbucketed counts: non-fuel items that ended up as chain_unconfirmed
  const misbucketedChainUnconfirmed = details.filter(d =>
    d.reviewType === 'chain_unconfirmed' &&
    ['likely_camping_or_tourism', 'likely_service_point', 'likely_industrial_or_municipal_facility',
     'likely_non_fuel_poi', 'likely_foreign_or_border_case', 'likely_duplicate_or_review_noise'].includes(d.analysisBucket)
  ).length;

  const misbucketedGenericName = details.filter(d =>
    d.reviewType === 'generic_name_review' &&
    ['likely_local_fuel_site', 'likely_retail_fuel_operator', 'likely_specialty_fuel_site'].includes(d.analysisBucket)
  ).length;

  const summary = {
    totalPendingAnalyzed: allPending.length,
    byReviewType: reviewTypeCounts,
    byAnalysisBucket: bucketCounts,
    examplesByBucket,
    misbucketedAsChainUnconfirmed: misbucketedChainUnconfirmed,
    misbucketedAsGenericNameReview: misbucketedGenericName,
    likelyNonFuelTotal: (bucketCounts['likely_camping_or_tourism'] || 0) +
      (bucketCounts['likely_service_point'] || 0) +
      (bucketCounts['likely_industrial_or_municipal_facility'] || 0) +
      (bucketCounts['likely_non_fuel_poi'] || 0),
    likelyLocalFuelTotal: bucketCounts['likely_local_fuel_site'] || 0,
    likelyRetailTotal: bucketCounts['likely_retail_fuel_operator'] || 0,
    likelySpecialtyTotal: bucketCounts['likely_specialty_fuel_site'] || 0,
    likelyForeignTotal: bucketCounts['likely_foreign_or_border_case'] || 0,
    likelyGenericTotal: bucketCounts['likely_generic_name_only'] || 0,
    likelyDuplicateNoiseTotal: bucketCounts['likely_duplicate_or_review_noise'] || 0,
    unclearTotal: bucketCounts['unclear_manual_review'] || 0,
  };

  // Console logging
  console.log('[analyzePendingStationReviews] ── ANALYSIS SUMMARY ──');
  console.log(`  Total pending analyzed: ${allPending.length}`);
  console.log('  By review_type:', reviewTypeCounts);
  console.log('  By analysis bucket:', bucketCounts);
  console.log(`  Likely non-fuel total: ${summary.likelyNonFuelTotal}`);
  console.log(`  Likely local fuel total: ${summary.likelyLocalFuelTotal}`);
  console.log(`  Likely retail fuel total: ${summary.likelyRetailTotal}`);
  console.log(`  Likely specialty fuel total: ${summary.likelySpecialtyTotal}`);
  console.log(`  Likely foreign/border total: ${summary.likelyForeignTotal}`);
  console.log(`  Likely generic name total: ${summary.likelyGenericTotal}`);
  console.log(`  Likely duplicate/noise total: ${summary.likelyDuplicateNoiseTotal}`);
  console.log(`  Unclear (manual review needed): ${summary.unclearTotal}`);
  console.log(`  Misbucketed as chain_unconfirmed: ${misbucketedChainUnconfirmed}`);
  console.log(`  Misbucketed as generic_name_review: ${misbucketedGenericName}`);
  for (const [bucket, examples] of Object.entries(examplesByBucket)) {
    console.log(`  [${bucket}] examples: ${examples.join(' | ')}`);
  }

  return Response.json({ success: true, summary, details });
});