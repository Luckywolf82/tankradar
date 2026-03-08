import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// ═══════════════════════════════════════════════════════════════════════════════
// SHARED CLASSIFICATION LOGIC (kept in sync with classifyStationsRuleEngine)
// ═══════════════════════════════════════════════════════════════════════════════

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

const matchesAny = (name, patterns) => {
  const nOrig = norm(name);
  const n = normMatch(name);
  return patterns.some(p => {
    if (typeof p === 'string') return nOrig.includes(p.toLowerCase()) || n.includes(normMatch(p));
    if (p instanceof RegExp) return p.test(nOrig) || p.test(n);
    return false;
  });
};

const FOREIGN_PATTERNS = [
  /\bpreem\b/i, /\bokq8\b/i, /\benonteki/i, /\bk-market\b/i, /\bk market\b/i,
  /\bq8\b/i, /\bteboil\b/i, /\bmacken\b/i, /\btännäs\b/i, /\bsälen\b/i,
  /\båre\b/i, /\bljungdalen\b/i, /\bklimpfjäll\b/i, /\bjokkmokk\b/i,
  /\bkilpisjärvi\b/i, /\brajamarket\b/i, /\bsuomen\b/i, /\bfinnland\b/i,
  /\bsverige\b/i, /\btärna vilt\b/i, /\bboxfjäll\b/i, /\bsirbmá\b/i, /\bsirbma\b/i,
];

const SPECIAL_TYPES = [
  { stationType: 'lpg',          patterns: [/^lpg\b/i, /\blpg\b/i, /\bauto-gass\b/i, /\bautogass\b/i, /\bauto gass\b/i] },
  { stationType: 'cng',          patterns: [/^cng\b/i, /\bcng\b/i, 'hynion', 'hydrogen'] },
  { stationType: 'truck_diesel', patterns: ['truck diesel', 'truckdiesel', 'truck-diesel', 'truckdisel', 'truck disel', 'lastebil diesel'] },
  { stationType: 'biogas',       patterns: ['biogass', 'biogas'] },
  { stationType: 'lpg',          patterns: ['parafin', 'fyringsolje'] },
];

const STRONG_FUEL_COMPOUNDS = [
  /\bbensin(pumpe|stasjon|salg|handel)?\b/i,
  /\bdrivstoff(salg|stasjon|anlegg)?\b/i,
  /\boljeservice\b/i, /\boljесenter\b/i, /\boljeleveand/i,
  /\btruckdiesel\b/i, /\btruckdisel\b/i,
  /\bfuel\b/i, /\bpetrol\b/i,
  /\bbensinautomat\b/i, /\bdrivstoffautomat\b/i,
];

const hasStrongFuelCompound = (name) => {
  const n = norm(name);
  const nm = normMatch(name);
  return STRONG_FUEL_COMPOUNDS.some(p => p.test(n) || p.test(nm));
};

const TOURISM_PATTERNS = [
  /\bcamping\b/i, /\bcamp\b/i, /\bfjordcamp\b/i,
  /\bkaf[eé]\b/i, /\bkafeteria\b/i, /\brestaurant\b/i,
  /\bturistsenter\b/i, /\bturisthytte\b/i, /\bturistcamp\b/i,
  /\bovernatting\b/i, /\bferiesenter\b/i, /\bresort\b/i,
  /\bmotell\b/i, /\bhyttepark\b/i,
];

const INDUSTRIAL_PATTERNS = [
  /\bmiljøpark\b/i, /\bmiljopark\b/i,
  /\bfrevar\b/i, /\bveolia\b/i,
  /\bavfall\b/i, /\brenovasjon\b/i,
  /\bgjenvinning\b/i, /\bsortering\b/i,
  /\bdeponi\b/i,
  /\bkommunal\b/i,
  /\bkf\b/i,
  /\bindustriomr/i,
  /\bcontainerhavn\b/i,
  /\blogistikk\b/i, /\bspedisjon\b/i,
];

const isNonFuelPoi = (name) => {
  if (hasStrongFuelCompound(name)) return false;
  const n = norm(name);
  const nm = normMatch(name);
  return (
    TOURISM_PATTERNS.some(p => p.test(n) || p.test(nm)) ||
    INDUSTRIAL_PATTERNS.some(p => p.test(n) || p.test(nm))
  );
};

const classifyStation = (stationName) => {
  const n = norm(stationName);
  const nm = normMatch(stationName);

  if (FOREIGN_PATTERNS.some(p => p.test(n) || p.test(nm)))
    return { classification: 'possible_foreign', chain: null, operator: null, stationType: 'unknown' };

  for (const { stationType, patterns } of SPECIAL_TYPES)
    if (matchesAny(stationName, patterns))
      return { classification: 'specialty_fuel_site', chain: null, operator: null, stationType };

  if (isNonFuelPoi(stationName))
    return { classification: 'non_fuel_poi', chain: null, operator: null, stationType: null };

  return { classification: 'unclassified', chain: null, operator: null, stationType: null };
};

// ─── HANDLER ──────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();

  if (!user || user.role !== 'admin') {
    return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const dryRun = body?.dryRun !== false; // default: true (safe)
  const includeForeign = body?.includeForeign === true; // default: false (conservative)
  const limit = body?.limit || null; // no limit by default

  console.log(`[applySafeMassReviewReclassification] mode=${dryRun ? 'DRY_RUN' : 'APPLY'} includeForeign=${includeForeign} limit=${limit || 'none'}`);

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

  if (limit) allStations = allStations.slice(0, limit);

  // Fetch all reviews
  let allReviews = [];
  page = 0;
  while (true) {
    const batch = await base44.asServiceRole.entities.StationReview.list('-created_date', 500, page * 500);
    if (!batch || batch.length === 0) break;
    allReviews = allReviews.concat(batch);
    if (batch.length < 500) break;
    page++;
  }
  const reviewsByStation = {};
  for (const r of allReviews) {
    if (!reviewsByStation[r.stationId]) reviewsByStation[r.stationId] = [];
    reviewsByStation[r.stationId].push(r);
  }

  // ── Identify safe candidates ──
  const candidates = [];

  for (const station of allStations) {
    const result = classifyStation(station.name);
    const historicalReviews = reviewsByStation[station.id] || [];

    let category = null;
    let targetReviewType = null;

    // Only safe allowed categories
    if (result.classification === 'non_fuel_poi') {
      const hasNonFuelReview = historicalReviews.some(r => r.review_type === 'non_fuel_poi_review');
      if (!hasNonFuelReview) {
        category = 'outdated_non_fuel_poi';
        targetReviewType = 'non_fuel_poi_review';
      }
    } else if (result.classification === 'specialty_fuel_site') {
      const hasSpecialtyReview = historicalReviews.some(r => r.review_type === 'specialty_fuel_review');
      if (!hasSpecialtyReview) {
        category = 'outdated_specialty_fuel';
        targetReviewType = 'specialty_fuel_review';
      }
    } else if (includeForeign && result.classification === 'possible_foreign') {
      const hasForeignReview = historicalReviews.some(r => r.review_type === 'possible_foreign_station');
      if (!hasForeignReview) {
        category = 'outdated_foreign';
        targetReviewType = 'possible_foreign_station';
      }
    }

    if (!category) continue;

    const hadActiveChainUnconfirmed = historicalReviews.some(r => r.status === 'pending' && r.review_type === 'chain_unconfirmed');
    const hadHistoricalApprovedReviews = historicalReviews.some(r => r.status === 'approved' || r.status === 'auto_resolved');

    candidates.push({
      stationId: station.id,
      stationName: station.name,
      category,
      targetReviewType,
      hadActiveChainUnconfirmed,
      hadHistoricalApprovedReviews,
      historicalReviews: historicalReviews.slice(),
    });
  }

  console.log(`[applySafeMassReviewReclassification] Found ${candidates.length} safe candidates for mass reclassification`);

  // ── Apply phase ──
  const applied = [];
  const skipped = [];
  const BATCH = 20;

  if (!dryRun) {
    for (let i = 0; i < candidates.length; i += BATCH) {
      const slice = candidates.slice(i, i + BATCH);

      await Promise.all(slice.map(async (c) => {
        try {
          const station = stationMap[c.stationId];
          if (!station) {
            skipped.push({ stationId: c.stationId, stationName: c.stationName, reason: 'station_not_found' });
            return;
          }

          const pendingChainUnconfirmed = c.historicalReviews.find(r => r.status === 'pending' && r.review_type === 'chain_unconfirmed');

          if (pendingChainUnconfirmed) {
            // Update the existing review to the target type
            await base44.asServiceRole.entities.StationReview.update(pendingChainUnconfirmed.id, {
              review_type: c.targetReviewType,
              notes: `Bulk reclassified by applySafeMassReviewReclassification: chain_unconfirmed → ${c.targetReviewType} (${c.category})`,
            });
            applied.push({
              stationId: c.stationId,
              stationName: c.stationName,
              category: c.category,
              targetReviewType: c.targetReviewType,
              actionTaken: 'updated_existing_chain_unconfirmed',
              hadActiveChainUnconfirmed: true,
              hadHistoricalApprovedReviews: c.hadHistoricalApprovedReviews,
              explanation: `Updated existing chain_unconfirmed to ${c.targetReviewType}`,
              reasonTags: [c.category, 'lifecycle_safe'],
            });
          } else {
            // Create new review
            const newReview = {
              stationId: c.stationId,
              review_type: c.targetReviewType,
              station_name: station.name,
              station_chain: station.chain || null,
              station_latitude: station.latitude,
              station_longitude: station.longitude,
              status: 'pending',
              issue_description: `Station now classified as ${c.category} using current rules.`,
              suggested_action: `Review and confirm station type. Station was previously not recognized as this category.`,
              reviewReason: c.targetReviewType === 'specialty_fuel_review' ? 'specialty_fuel_detected' : c.targetReviewType === 'non_fuel_poi_review' ? 'non_fuel_poi_detected' : 'possible_foreign_station',
              source_report: 'applySafeMassReviewReclassification',
            };
            await base44.asServiceRole.entities.StationReview.create(newReview);
            applied.push({
              stationId: c.stationId,
              stationName: c.stationName,
              category: c.category,
              targetReviewType: c.targetReviewType,
              actionTaken: 'created_new_review',
              hadActiveChainUnconfirmed: false,
              hadHistoricalApprovedReviews: c.hadHistoricalApprovedReviews,
              explanation: `Created new ${c.targetReviewType} review`,
              reasonTags: [c.category, 'lifecycle_safe'],
            });
          }
        } catch (e) {
          skipped.push({ stationId: c.stationId, stationName: c.stationName, reason: `error: ${e.message}` });
          console.error(`[applySafeMassReviewReclassification] Error processing ${c.stationName}:`, e.message);
        }
      }));

      if (i + BATCH < candidates.length) await new Promise(r => setTimeout(r, 80));
    }
  }

  // ── Build summary ──
  const summary = {
    mode: dryRun ? 'dry_run' : 'apply',
    includeForeign,
    totalStationsAnalyzed: allStations.length,
    totalCandidatesIdentified: candidates.length,
    totalApplied: applied.length,
    totalSkipped: skipped.length,
    appliedByCategory: {
      outdated_non_fuel_poi: applied.filter(a => a.category === 'outdated_non_fuel_poi').length,
      outdated_specialty_fuel: applied.filter(a => a.category === 'outdated_specialty_fuel').length,
      outdated_foreign: applied.filter(a => a.category === 'outdated_foreign').length,
    },
    appliedByReviewType: {
      non_fuel_poi_review: applied.filter(a => a.targetReviewType === 'non_fuel_poi_review').length,
      specialty_fuel_review: applied.filter(a => a.targetReviewType === 'specialty_fuel_review').length,
      possible_foreign_station: applied.filter(a => a.targetReviewType === 'possible_foreign_station').length,
    },
    appliedByAction: {
      updated_existing_chain_unconfirmed: applied.filter(a => a.actionTaken === 'updated_existing_chain_unconfirmed').length,
      created_new_review: applied.filter(a => a.actionTaken === 'created_new_review').length,
    },
    skippedByReason: {
      station_not_found: skipped.filter(s => s.reason === 'station_not_found').length,
      errors: skipped.filter(s => s.reason.startsWith('error')).length,
    },
    appliedExamples: applied.slice(0, 15),
    skippedExamples: skipped.slice(0, 5),
  };

  // Console logging
  console.log('[applySafeMassReviewReclassification] ── SUMMARY ──');
  console.log(`  Mode: ${dryRun ? 'DRY_RUN (no writes)' : 'APPLY'}`);
  console.log(`  Total stations analyzed: ${summary.totalStationsAnalyzed}`);
  console.log(`  Total candidates identified: ${summary.totalCandidatesIdentified}`);
  console.log(`  Total applied: ${summary.totalApplied}`);
  console.log(`  Total skipped: ${summary.totalSkipped}`);
  console.log(`  Applied by category:`);
  console.log(`    - outdated_non_fuel_poi: ${summary.appliedByCategory.outdated_non_fuel_poi}`);
  console.log(`    - outdated_specialty_fuel: ${summary.appliedByCategory.outdated_specialty_fuel}`);
  console.log(`    - outdated_foreign: ${summary.appliedByCategory.outdated_foreign}`);
  console.log(`  Applied by action:`);
  console.log(`    - updated_existing_chain_unconfirmed: ${summary.appliedByAction.updated_existing_chain_unconfirmed}`);
  console.log(`    - created_new_review: ${summary.appliedByAction.created_new_review}`);

  if (applied.length > 0) {
    console.log('  Applied stations (sample):');
    for (const a of applied.slice(0, 20)) {
      console.log(`    • ${a.stationName} (${a.actionTaken} → ${a.targetReviewType})`);
    }
  }

  return Response.json({ success: true, summary });
});