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

// Strong fuel terms — explicit product/facility names that confirm a fuel site
const hasStrongFuelSignal = (name) => {
  const n = norm(name);
  return /\b(bensinpumpe|bensinstasjon|drivstoffstasjon|tankstasjon|drivstoffsalg|bensinanlegg|oljeservice|olje ?service|olje ?salg|oljesenter|truckdiesel|truck ?diesel|truckdisel|truck ?disel|fyringsolje|bunkersolje|bunker ?olje|parafinsalg|dieselanlegg|bensinautomat|drivstoffautomat|tankautomat|fuel ?station|petrol ?station)\b/.test(n);
};

// Broad fuel terms — weaker but still meaningful fuel signal
const hasFuelSignal = (name) => {
  const n = norm(name);
  return hasStrongFuelSignal(name) ||
    /\b(bensin|drivstoff|diesel|olje|oil|parafin|fyringsolje|gass|auto ?gass|autogass|bunker|petrol|fuel|pumpe|tank|tanken)\b/.test(n);
};

// Specific fuel reason tags for more precise output
const getFuelReasonTags = (name) => {
  const n = norm(name);
  const tags = [];
  if (/\bbensinpumpe\b/.test(n)) tags.push('contains_bensinpumpe_term');
  if (/\b(bensin|bensinstasjon)\b/.test(n)) tags.push('contains_bensin_term');
  if (/\b(olje|oil|oljeservice|oljesenter)\b/.test(n)) tags.push('contains_oil_term');
  if (/\b(gass|auto ?gass|autogass)\b/.test(n)) tags.push('contains_gas_term');
  if (/\b(truckdiesel|truck ?diesel|truckdisel|truck ?disel)\b/.test(n)) tags.push('contains_truck_diesel_term');
  if (/\b(drivstoff|diesel|parafin|fyringsolje|bunker|petrol|fuel)\b/.test(n)) tags.push('contains_fuel_term');
  if (/\b(pumpe|tank|tanken|tankautomat|bensinautomat|drivstoffautomat)\b/.test(n)) tags.push('contains_tank_pump_term');
  return tags;
};

const hasCampingSignal = (name) => {
  const n = norm(name);
  return /\b(camp|camping|fjordcamp|hyttepark|kaffe|kafe|kafee|kafeteria|restaurant|turistsenter|turisthytte|gjestehavn|gjestefarm|gjestgiver|overnatting|turistcamp|naturcamp|friluft|feriesenter|resort|motell|pensjonat|cabin|hytte)\b/.test(n);
};

const hasServiceSignal = (name) => {
  const n = norm(name);
  return /\b(autoservice|bilservice|bilverksted|verksted|gummiservice|dekksenter|mekaniker|karosseri|bilvask|bildeler|traktor|maskin|hjul|bilsenteret|bilsenter|bilrep|piggfritt)\b/.test(n);
  // Note: "service" alone and "motor" excluded — too generic, would catch "Dalvik Oil Service"
};

const hasIndustrialSignal = (name) => {
  const n = norm(name);
  return /\b(kommune|kommunal|miljoepark|frevar|veolia|avfall|renovasjon|deponi|sortering|gjenvinning|industri|fabrikk|havneterminal|logistikk|spedisjon|containerhavn|industriomraade)\b/.test(n);
  // "anlegg", "lager", "terminal" excluded as too broad — could match fuel terminals
};

const hasRetailSignal = (name) => {
  const n = norm(name);
  return /\b(coop|joker|spar|matkroken|kiwi|rema ?1000|rema1000|meny|naerbutikken|extra|bunnpris|handlar|dagligvare)\b/.test(n);
};

// Strengthened foreign/border detection — covers Nordic/Finnish border patterns
const hasForeignSignal = (name) => {
  const n = norm(name);
  // Exact well-known foreign chains/places
  if (/\b(preem|okq8|teboil|suomen|rajamarket|k market)\b/.test(n)) return true;
  // Sirbmá / Sirbma — Sami village at Norway/Finland border
  if (/sirbm/.test(n)) return true;
  // Swedish place names known to appear in Norwegian station data
  if (/\b(saelen|tanna|ljungdalen|klimpfjaell|jokkmokk|boxfjaell|taernae)\b/.test(n)) return true;
  // Finnish territory indicators
  if (/\b(kilpisjaervi|finnland|finland)\b/.test(n)) return true;
  // Swedish language indicators
  if (/\b(sverige|sweden)\b/.test(n)) return true;
  // Åre — major Swedish ski resort, sometimes appears in data
  if (/\baere\b/.test(n) && !/naerbutikk|naerservice|naeromraade/.test(n)) return true;
  return false;
};

const hasSpecialtySignal = (name) => {
  const n = norm(name);
  return /\b(lpg|cng|hydrogen|gass automat|biogass|biogas|hynion|autogass|auto gass|komprimert gass|flytende gass|lng|soergass|soer ?gass)\b/.test(n);
};

const isGenericName = (name) => {
  const n = norm(name);
  return /^(independent|smia|fitjar|stasjon|stasjonen|pumpe|pumpen|max|lokal|naerservice|bensinstasjonen|tank|tanken|tank og kiosk|kiosk og bensin|bensin og kiosk|bensinstasjon|drivstoffautomat|tankautomat)$/.test(n);
};

const hasMarineSignal = (name) => {
  const n = norm(name);
  return /\b(marina|brygge|smaabaat|smabaathavn|baatforening|fiskehavn|baathavn|gjesthavn|gjestehamn|havneanlegg|kai|sjoefront|kanalen|bryggetorget)\b/.test(n);
};

// ─── SUGGESTED ACTION MAPPING ─────────────────────────────────────────────────

const BUCKET_SUGGESTIONS = {
  likely_local_fuel_site:                  { suggestedReviewType: 'local_fuel_review',               suggestedClassification: 'local_fuel_site',          suggestedAction: 'manual_verify_local_operator_or_chain' },
  likely_non_fuel_poi:                     { suggestedReviewType: 'non_fuel_poi_review',              suggestedClassification: 'non_fuel_poi',              suggestedAction: 'manual_exclude_or_reclassify' },
  likely_service_point:                    { suggestedReviewType: 'service_point_review',             suggestedClassification: 'service_point',             suggestedAction: 'manual_verify_fuel_presence' },
  likely_camping_or_tourism:               { suggestedReviewType: 'non_fuel_poi_review',              suggestedClassification: 'camping_or_tourism',        suggestedAction: 'manual_exclude_or_reclassify' },
  likely_industrial_or_municipal_facility: { suggestedReviewType: 'non_fuel_poi_review',              suggestedClassification: 'industrial_or_municipal',   suggestedAction: 'manual_exclude_or_reclassify' },
  likely_specialty_fuel_site:              { suggestedReviewType: 'specialty_fuel_review',            suggestedClassification: 'specialty_fuel_site',       suggestedAction: 'reclassify_review' },
  likely_retail_fuel_operator:             { suggestedReviewType: 'retail_fuel_operator_review',      suggestedClassification: 'retail_fuel_operator',      suggestedAction: 'reclassify_or_auto_resolve_if_supported' },
  likely_foreign_or_border_case:           { suggestedReviewType: 'possible_foreign_station',         suggestedClassification: 'foreign_or_border_case',    suggestedAction: 'manual_verify_foreign_or_border_case' },
  likely_generic_name_only:                { suggestedReviewType: 'generic_name_review',              suggestedClassification: 'generic_name',              suggestedAction: 'keep_generic_review' },
  likely_duplicate_or_review_noise:        { suggestedReviewType: 'duplicate_candidate',              suggestedClassification: 'duplicate_or_noise',        suggestedAction: 'review_for_deduplication' },
  unclear_manual_review:                   { suggestedReviewType: 'chain_unconfirmed',                suggestedClassification: 'unclear',                   suggestedAction: 'manual_review' },
};

// ─── BUCKET ASSIGNMENT (deterministic precedence) ─────────────────────────────

function assignBucket(name, chain, operator, stationType, reviewType) {
  const reasonTags = [];

  // Pre-collect signals
  if (hasForeignSignal(name))    reasonTags.push('matches_foreign_pattern');
  if (hasSpecialtySignal(name))  reasonTags.push('contains_specialty_fuel_term');
  if (hasRetailSignal(name))     reasonTags.push('matches_retail_operator');
  if (hasCampingSignal(name))    reasonTags.push('contains_camping_term');
  if (hasIndustrialSignal(name)) reasonTags.push('contains_industrial_term');
  if (hasServiceSignal(name))    reasonTags.push('contains_service_term');
  if (hasMarineSignal(name))     reasonTags.push('contains_marine_term');
  if (isGenericName(name))       reasonTags.push('matches_generic_name_pattern');
  if (chain)                     reasonTags.push('has_existing_chain');
  if (operator)                  reasonTags.push('has_operator');
  if (stationType && stationType !== 'unknown') reasonTags.push('has_station_type');

  // Specific fuel reason tags
  for (const tag of getFuelReasonTags(name)) reasonTags.push(tag);

  const fuelSignal      = hasFuelSignal(name);
  const strongFuelSignal = hasStrongFuelSignal(name);
  const campingSignal   = hasCampingSignal(name);
  const industrialSignal = hasIndustrialSignal(name);

  // ── PRECEDENCE ──

  // 1. Foreign / border — beats everything
  if (hasForeignSignal(name)) {
    return { analysisBucket: 'likely_foreign_or_border_case', reasonTags,
      explanation: `Name matches known foreign/border station patterns: "${name}"` };
  }

  // 2. Specialty fuel — beats generic/service ambiguity
  if (hasSpecialtySignal(name) || stationType === 'lpg' || stationType === 'cng' || stationType === 'biogas') {
    return { analysisBucket: 'likely_specialty_fuel_site', reasonTags,
      explanation: `Name or stationType indicates specialty fuel (LPG/CNG/biogas/hydrogen/gas): "${name}"` };
  }

  // 3. Retail operator — known grocery-attached fuel
  if (hasRetailSignal(name) || operator) {
    return { analysisBucket: 'likely_retail_fuel_operator', reasonTags,
      explanation: `Name matches retail operator or operator field is set: "${name}" (operator: ${operator || 'via name'})` };
  }

  // 4. Camping / tourism — wins unless a STRONG fuel term is present
  //    "Camping og bensin" → fuel wins; "Camping Kafé" → camping wins
  if (campingSignal && !strongFuelSignal) {
    return { analysisBucket: 'likely_camping_or_tourism', reasonTags,
      explanation: `Name contains camping/tourism terms with no strong fuel signal: "${name}"` };
  }

  // 5. Marine — wins unless strong fuel term present
  if (hasMarineSignal(name) && !strongFuelSignal) {
    reasonTags.push('missing_supporting_fuel_signal');
    return { analysisBucket: 'likely_non_fuel_poi', reasonTags,
      explanation: `Name indicates marine facility without fuel signal: "${name}"` };
  }

  // 6. Industrial / municipal — wins unless strong fuel term present
  if (industrialSignal && !strongFuelSignal && !fuelSignal) {
    return { analysisBucket: 'likely_industrial_or_municipal_facility', reasonTags,
      explanation: `Name contains industrial/municipal terms with no fuel signal: "${name}"` };
  }

  // 7. Service point — only wins when there is NO fuel signal
  if (hasServiceSignal(name) && !fuelSignal) {
    reasonTags.push('missing_supporting_fuel_signal');
    return { analysisBucket: 'likely_service_point', reasonTags,
      explanation: `Name contains vehicle service/workshop terms with no fuel signal: "${name}"` };
  }

  // 8. Fuel signal present (any strength) → local fuel site
  //    Covers: Myrvåg Bensinpumpe, Steigen Oljeservice, Dalvik Oil, Truckdisel, etc.
  if (fuelSignal || chain || stationType === 'retail_fuel') {
    if (!reasonTags.some(t => t.startsWith('contains_'))) {
      reasonTags.push('contains_fuel_term');
    }
    if (fuelSignal && !chain) reasonTags.push('fuel_signal_overrode_unclear');
    return { analysisBucket: 'likely_local_fuel_site', reasonTags,
      explanation: `Name contains fuel terms or chain/stationType set: "${name}" (chain: ${chain || 'via name/type'})` };
  }

  // 9. Generic name only
  if (isGenericName(name)) {
    return { analysisBucket: 'likely_generic_name_only', reasonTags,
      explanation: `Name is a known generic / non-specific name: "${name}"` };
  }

  // 10. Unclear — no strong signal from any direction
  reasonTags.push('missing_supporting_fuel_signal');
  return { analysisBucket: 'unclear_manual_review', reasonTags,
    explanation: `No clear signal found for bucketing: "${name}"` };
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

  // Fetch all stations for context lookup
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

  // Duplicate review noise detection: same stationId + review_type > 1
  const reviewKeyCount = {};
  for (const r of allPending) {
    const key = `${r.stationId}__${r.review_type}`;
    reviewKeyCount[key] = (reviewKeyCount[key] || 0) + 1;
  }

  // Analyze each review
  const details = [];
  const bucketCounts = {};
  const reviewTypeCounts = {};
  const suggestedReviewTypeCounts = {};
  const suggestedActionCounts = {};

  // Tracking examples for enhanced summary
  const upgradedFromUnclear = [];       // fuel signal overrode unclear
  const likelyForeignExamples = [];
  const likelyNonFuelMisbucketed = [];  // non-fuel POIs currently sitting as chain_unconfirmed

  for (const review of allPending) {
    const station = stationMap[review.stationId] || {};

    const name        = review.station_name     || station.name      || '(unknown)';
    const chain       = review.station_chain    || station.chain     || null;
    const operator    = review.station_operator || station.operator  || null;
    const stationType = review.station_stationType || station.stationType || null;
    const city        = station.city      || null;
    const areaLabel   = station.areaLabel || null;
    const latitude    = review.station_latitude  || station.latitude  || null;
    const longitude   = review.station_longitude || station.longitude || null;

    // Duplicate review noise
    const key = `${review.stationId}__${review.review_type}`;
    const isDuplicateNoise = reviewKeyCount[key] > 1;

    let { analysisBucket, reasonTags, explanation } = assignBucket(name, chain, operator, stationType, review.review_type);

    if (isDuplicateNoise) {
      if (!reasonTags.includes('possible_duplicate_review')) reasonTags.push('possible_duplicate_review');
      if (analysisBucket === 'unclear_manual_review') {
        analysisBucket = 'likely_duplicate_or_review_noise';
        explanation = `Multiple pending reviews with same stationId + review_type: "${name}"`;
      }
    }

    // Check for conflicting signals
    const hasConflict = (hasCampingSignal(name) && hasFuelSignal(name)) ||
                        (hasServiceSignal(name) && hasFuelSignal(name)) ||
                        (hasIndustrialSignal(name) && hasFuelSignal(name));
    if (hasConflict && !reasonTags.includes('conflicting_signals_present')) {
      reasonTags.push('conflicting_signals_present');
    }

    const suggestions = BUCKET_SUGGESTIONS[analysisBucket] || BUCKET_SUGGESTIONS['unclear_manual_review'];

    // Count
    bucketCounts[analysisBucket] = (bucketCounts[analysisBucket] || 0) + 1;
    reviewTypeCounts[review.review_type] = (reviewTypeCounts[review.review_type] || 0) + 1;
    suggestedReviewTypeCounts[suggestions.suggestedReviewType] = (suggestedReviewTypeCounts[suggestions.suggestedReviewType] || 0) + 1;
    suggestedActionCounts[suggestions.suggestedAction] = (suggestedActionCounts[suggestions.suggestedAction] || 0) + 1;

    // Track enhanced examples
    if (reasonTags.includes('fuel_signal_overrode_unclear') && upgradedFromUnclear.length < 10) {
      upgradedFromUnclear.push({ name, bucket: analysisBucket, tags: reasonTags });
    }
    if (analysisBucket === 'likely_foreign_or_border_case' && likelyForeignExamples.length < 10) {
      likelyForeignExamples.push(name);
    }
    if (
      review.review_type === 'chain_unconfirmed' &&
      ['likely_camping_or_tourism', 'likely_service_point', 'likely_industrial_or_municipal_facility',
       'likely_non_fuel_poi', 'likely_foreign_or_border_case', 'likely_duplicate_or_review_noise'].includes(analysisBucket) &&
      likelyNonFuelMisbucketed.length < 10
    ) {
      likelyNonFuelMisbucketed.push({ name, bucket: analysisBucket });
    }

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
      suggestedReviewType: suggestions.suggestedReviewType,
      suggestedClassification: suggestions.suggestedClassification,
      suggestedAction: suggestions.suggestedAction,
      coordinates: latitude && longitude ? { lat: latitude, lon: longitude } : null,
      city,
      municipality: city,
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
    bySuggestedReviewType: suggestedReviewTypeCounts,
    bySuggestedAction: suggestedActionCounts,
    examplesByBucket,
    upgradedFromUnclearExamples: upgradedFromUnclear,
    likelyForeignExamples,
    likelyNonFuelMisbucketedAsChainUnconfirmed: likelyNonFuelMisbucketed,
    misbucketedAsChainUnconfirmed: misbucketedChainUnconfirmed,
    misbucketedAsGenericNameReview: misbucketedGenericName,
    likelyNonFuelTotal: (bucketCounts['likely_camping_or_tourism'] || 0) +
      (bucketCounts['likely_service_point'] || 0) +
      (bucketCounts['likely_industrial_or_municipal_facility'] || 0) +
      (bucketCounts['likely_non_fuel_poi'] || 0),
    likelyLocalFuelTotal:    bucketCounts['likely_local_fuel_site'] || 0,
    likelyRetailTotal:       bucketCounts['likely_retail_fuel_operator'] || 0,
    likelySpecialtyTotal:    bucketCounts['likely_specialty_fuel_site'] || 0,
    likelyForeignTotal:      bucketCounts['likely_foreign_or_border_case'] || 0,
    likelyGenericTotal:      bucketCounts['likely_generic_name_only'] || 0,
    likelyDuplicateNoiseTotal: bucketCounts['likely_duplicate_or_review_noise'] || 0,
    unclearTotal:            bucketCounts['unclear_manual_review'] || 0,
  };

  // Console logging
  console.log('[analyzePendingStationReviews] ── ANALYSIS SUMMARY ──');
  console.log(`  Total pending analyzed: ${allPending.length}`);
  console.log('  By review_type:', reviewTypeCounts);
  console.log('  By analysis bucket:', bucketCounts);
  console.log('  By suggested review type:', suggestedReviewTypeCounts);
  console.log('  By suggested action:', suggestedActionCounts);
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
  if (upgradedFromUnclear.length > 0) {
    console.log('  Upgraded from unclear by fuel signal:', upgradedFromUnclear.map(e => e.name).join(' | '));
  }
  if (likelyForeignExamples.length > 0) {
    console.log('  Likely foreign/border cases:', likelyForeignExamples.join(' | '));
  }
  if (likelyNonFuelMisbucketed.length > 0) {
    console.log('  Non-fuel misbucketed as chain_unconfirmed:', likelyNonFuelMisbucketed.map(e => `${e.name} (${e.bucket})`).join(' | '));
  }
  for (const [bucket, examples] of Object.entries(examplesByBucket)) {
    console.log(`  [${bucket}] examples: ${examples.join(' | ')}`);
  }

  return Response.json({ success: true, summary, details });
});