import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// ─── SHARED NORMALIZATION (kept in sync with analyzePendingStationReviews) ────

const norm = (s) => {
  if (!s) return '';
  return s.toLowerCase()
    .replace(/[æ]/g, 'ae').replace(/[ø]/g, 'oe').replace(/[å]/g, 'aa')
    .replace(/[-–—]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

// ─── SIGNAL HELPERS (identical to analyzePendingStationReviews) ───────────────

const hasStrongFuelSignal = (name) => {
  const n = norm(name);
  return /\b(bensinpumpe|bensinstasjon|drivstoffstasjon|tankstasjon|drivstoffsalg|bensinanlegg|oljeservice|olje ?service|olje ?salg|oljesenter|truckdiesel|truck ?diesel|truckdisel|truck ?disel|fyringsolje|bunkersolje|bunker ?olje|parafinsalg|dieselanlegg|bensinautomat|drivstoffautomat|tankautomat|fuel ?station|petrol ?station)\b/.test(n);
};

const hasFuelSignal = (name) => {
  const n = norm(name);
  return hasStrongFuelSignal(name) ||
    /\b(bensin|drivstoff|diesel|olje|oil|parafin|fyringsolje|gass|auto ?gass|autogass|bunker|petrol|fuel|pumpe|tank|tanken)\b/.test(n);
};

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
};

const hasIndustrialSignal = (name) => {
  const n = norm(name);
  return /\b(kommune|kommunal|miljoepark|frevar|veolia|avfall|renovasjon|deponi|sortering|gjenvinning|industri|fabrikk|havneterminal|logistikk|spedisjon|containerhavn|industriomraade)\b/.test(n);
};

const hasRetailSignal = (name) => {
  const n = norm(name);
  return /\b(coop|joker|spar|matkroken|kiwi|rema ?1000|rema1000|meny|naerbutikken|extra|bunnpris|handlar|dagligvare)\b/.test(n);
};

const hasForeignSignal = (name) => {
  const n = norm(name);
  if (/\b(preem|okq8|teboil|suomen|rajamarket|k market)\b/.test(n)) return true;
  if (/sirbm/.test(n)) return true;
  if (/\b(saelen|tanna|ljungdalen|klimpfjaell|jokkmokk|boxfjaell|taernae)\b/.test(n)) return true;
  if (/\b(kilpisjaervi|finnland|finland)\b/.test(n)) return true;
  if (/\b(sverige|sweden)\b/.test(n)) return true;
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

// ─── BUCKET ASSIGNMENT (same precedence as analyzePendingStationReviews) ──────

function assignBucket(name, chain, operator, stationType) {
  const reasonTags = [];

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
  for (const tag of getFuelReasonTags(name)) reasonTags.push(tag);

  const fuelSignal       = hasFuelSignal(name);
  const strongFuelSignal = hasStrongFuelSignal(name);
  const campingSignal    = hasCampingSignal(name);
  const industrialSignal = hasIndustrialSignal(name);

  if (hasForeignSignal(name))
    return { analysisBucket: 'likely_foreign_or_border_case', reasonTags,
      explanation: `Name matches known foreign/border station patterns: "${name}"` };

  if (hasSpecialtySignal(name) || stationType === 'lpg' || stationType === 'cng' || stationType === 'biogas')
    return { analysisBucket: 'likely_specialty_fuel_site', reasonTags,
      explanation: `Name or stationType indicates specialty fuel: "${name}"` };

  if (hasRetailSignal(name) || operator)
    return { analysisBucket: 'likely_retail_fuel_operator', reasonTags,
      explanation: `Name matches retail operator or operator field is set: "${name}"` };

  if (campingSignal && !strongFuelSignal)
    return { analysisBucket: 'likely_camping_or_tourism', reasonTags,
      explanation: `Name contains camping/tourism terms with no strong fuel signal: "${name}"` };

  if (hasMarineSignal(name) && !strongFuelSignal) {
    reasonTags.push('missing_supporting_fuel_signal');
    return { analysisBucket: 'likely_non_fuel_poi', reasonTags,
      explanation: `Name indicates marine facility without fuel signal: "${name}"` };
  }

  if (industrialSignal && !strongFuelSignal && !fuelSignal)
    return { analysisBucket: 'likely_industrial_or_municipal_facility', reasonTags,
      explanation: `Name contains industrial/municipal terms with no fuel signal: "${name}"` };

  if (hasServiceSignal(name) && !fuelSignal) {
    reasonTags.push('missing_supporting_fuel_signal');
    return { analysisBucket: 'likely_service_point', reasonTags,
      explanation: `Name contains service/workshop terms with no fuel signal: "${name}"` };
  }

  if (fuelSignal || chain || stationType === 'retail_fuel') {
    if (!reasonTags.some(t => t.startsWith('contains_'))) reasonTags.push('contains_fuel_term');
    if (fuelSignal && !chain) reasonTags.push('fuel_signal_overrode_unclear');
    return { analysisBucket: 'likely_local_fuel_site', reasonTags,
      explanation: `Name contains fuel terms or chain/stationType set: "${name}"` };
  }

  if (isGenericName(name))
    return { analysisBucket: 'likely_generic_name_only', reasonTags,
      explanation: `Name is a known generic / non-specific name: "${name}"` };

  reasonTags.push('missing_supporting_fuel_signal');
  return { analysisBucket: 'unclear_manual_review', reasonTags,
    explanation: `No clear signal found for bucketing: "${name}"` };
}

// ─── RECLASSIFICATION RULES ───────────────────────────────────────────────────

// Safe buckets: these may be automatically reclassified
const SAFE_BUCKETS = new Set([
  'likely_foreign_or_border_case',
  'likely_specialty_fuel_site',
  'likely_camping_or_tourism',
  'likely_industrial_or_municipal_facility',
]);

// Mapping from analysis bucket → target review_type
const BUCKET_TO_TARGET_REVIEW_TYPE = {
  likely_foreign_or_border_case:           'possible_foreign_station',
  likely_specialty_fuel_site:              'specialty_fuel_review',
  likely_camping_or_tourism:               'non_fuel_poi_review',
  likely_industrial_or_municipal_facility: 'non_fuel_poi_review',
};

// Review types that are confirmed to exist in the current StationReview model
const SUPPORTED_REVIEW_TYPES = new Set([
  'legacy_duplicate',
  'chain_unconfirmed',
  'generic_name_review',
  'seed_conflict',
  'possible_foreign_station',
  'duplicate_candidate',
]);

// ─── HANDLER ──────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();

  if (!user || user.role !== 'admin') {
    return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const dryRun = body?.dryRun !== false; // default: true (safe)

  console.log(`[previewStationReviewReclassification] mode=${dryRun ? 'DRY_RUN' : 'APPLY'}`);

  // ── Fetch pending reviews ──
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
  console.log(`[previewStationReviewReclassification] Fetched ${allPending.length} pending reviews`);

  // ── Fetch stations for context ──
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

  // ── Build proposals ──
  const proposals = [];

  for (const review of allPending) {
    // Only consider chain_unconfirmed and generic_name_review as source types
    if (!['chain_unconfirmed', 'generic_name_review'].includes(review.review_type)) continue;

    const station     = stationMap[review.stationId] || {};
    const name        = review.station_name        || station.name        || '(unknown)';
    const chain       = review.station_chain       || station.chain       || null;
    const operator    = review.station_operator    || station.operator    || null;
    const stationType = review.station_stationType || station.stationType || null;

    const { analysisBucket, reasonTags, explanation } = assignBucket(name, chain, operator, stationType);

    // Only build a proposal if this lands in a safe reclassification bucket
    if (!SAFE_BUCKETS.has(analysisBucket)) continue;

    const targetReviewType = BUCKET_TO_TARGET_REVIEW_TYPE[analysisBucket];

    // Skip if the target is the same as current (no change needed)
    if (targetReviewType === review.review_type) continue;

    const blockedByMissingReviewType = !SUPPORTED_REVIEW_TYPES.has(targetReviewType);
    const safeToReclassify = SAFE_BUCKETS.has(analysisBucket) && !blockedByMissingReviewType;

    proposals.push({
      reviewId: review.id,
      stationId: review.stationId,
      stationName: name,
      currentReviewType: review.review_type,
      analysisBucket,
      targetReviewType,
      safeToReclassify,
      blockedByMissingReviewType,
      wouldUpdate: safeToReclassify,
      didUpdate: false,       // filled in during apply phase
      reasonTags,
      explanation,
    });
  }

  // ── Apply phase (dryRun: false only) ──
  let totalActuallyUpdated = 0;
  const BATCH = 30;

  if (!dryRun) {
    const applicableProposals = proposals.filter(p => p.safeToReclassify && !p.blockedByMissingReviewType);

    for (let i = 0; i < applicableProposals.length; i += BATCH) {
      const slice = applicableProposals.slice(i, i + BATCH);
      await Promise.all(slice.map(async (p) => {
        await base44.asServiceRole.entities.StationReview.update(p.reviewId, {
          review_type: p.targetReviewType,
          notes: `Reclassified by previewStationReviewReclassification: ${p.analysisBucket} → ${p.targetReviewType}. Reason: ${p.explanation}`,
        });
        p.didUpdate = true;
        totalActuallyUpdated++;
      }));
      if (i + BATCH < applicableProposals.length) await new Promise(r => setTimeout(r, 60));
    }
  }

  // ── Build summary ──
  const totalProposed         = proposals.length;
  const totalSafelyApplicable = proposals.filter(p => p.safeToReclassify).length;
  const totalBlocked          = proposals.filter(p => p.blockedByMissingReviewType).length;
  const totalUnsafe           = proposals.filter(p => !p.safeToReclassify && !p.blockedByMissingReviewType).length;

  const byCurrentReviewType = {};
  const byTargetReviewType  = {};
  const examplesByTarget    = {};
  const skippedUnsafeExamples = [];

  for (const p of proposals) {
    byCurrentReviewType[p.currentReviewType] = (byCurrentReviewType[p.currentReviewType] || 0) + 1;
    byTargetReviewType[p.targetReviewType]   = (byTargetReviewType[p.targetReviewType] || 0) + 1;

    if (!examplesByTarget[p.targetReviewType]) examplesByTarget[p.targetReviewType] = [];
    if (examplesByTarget[p.targetReviewType].length < 5) examplesByTarget[p.targetReviewType].push(p.stationName);

    if (!p.safeToReclassify && skippedUnsafeExamples.length < 5) {
      skippedUnsafeExamples.push({ name: p.stationName, bucket: p.analysisBucket, reason: p.blockedByMissingReviewType ? 'blocked_missing_review_type' : 'not_in_safe_buckets' });
    }
  }

  const summary = {
    mode: dryRun ? 'dry_run' : 'apply',
    totalAnalyzedForReclassification: allPending.filter(r => ['chain_unconfirmed', 'generic_name_review'].includes(r.review_type)).length,
    totalProposedForReclassification: totalProposed,
    totalSafelyApplicable,
    totalBlockedByMissingReviewType: totalBlocked,
    totalUnsafe,
    totalActuallyUpdated,
    byCurrentReviewType,
    byTargetReviewType,
    examplesByTarget,
    skippedUnsafeExamples,
  };

  // ── Console logging ──
  console.log('[previewStationReviewReclassification] ── SUMMARY ──');
  console.log(`  Mode: ${dryRun ? 'DRY_RUN (no writes)' : 'APPLY'}`);
  console.log(`  Scope: chain_unconfirmed + generic_name_review pending reviews`);
  console.log(`  Total in scope: ${summary.totalAnalyzedForReclassification}`);
  console.log(`  Total proposed for reclassification: ${totalProposed}`);
  console.log(`  Total safely applicable: ${totalSafelyApplicable}`);
  console.log(`  Total blocked by missing review_type: ${totalBlocked}`);
  console.log(`  Total actually updated: ${totalActuallyUpdated}`);
  console.log('  By current review type:', byCurrentReviewType);
  console.log('  By target review type:', byTargetReviewType);

  for (const [target, examples] of Object.entries(examplesByTarget)) {
    const blocked = proposals.filter(p => p.targetReviewType === target && p.blockedByMissingReviewType).length;
    console.log(`  [→ ${target}] examples: ${examples.join(' | ')}${blocked > 0 ? ` (${blocked} BLOCKED — review_type not in schema)` : ''}`);
  }

  if (skippedUnsafeExamples.length > 0) {
    console.log('  Skipped (unsafe/blocked):', skippedUnsafeExamples.map(e => `${e.name} (${e.reason})`).join(' | '));
  }

  return Response.json({ success: true, summary, proposals });
});