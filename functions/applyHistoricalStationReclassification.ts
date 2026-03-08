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

const SECURE_CHAINS = [
  { chain: 'Circle K',    patterns: ['circle k', 'circlek'] },
  { chain: 'Uno-X',       patterns: ['uno-x', 'unox', 'uno x'] },
  { chain: 'Esso',        patterns: ['esso'] },
  { chain: 'St1',         patterns: ['st1', 'st 1'] },
  { chain: 'YX',          patterns: [/^yx\b/i, /\byx \b/i] },
  { chain: 'Best',        patterns: [/^best\b/i] },
  { chain: 'Shell',       patterns: ['shell'] },
  { chain: 'Equinor',     patterns: ['equinor'] },
  { chain: 'Statoil',     patterns: ['statoil'] },
  { chain: 'Automat1',    patterns: ['automat1', 'automat 1'] },
  { chain: 'MH24',        patterns: ['mh24'] },
  { chain: 'Max Bensin',  patterns: ['max bensin'] },
  { chain: 'Smart',       patterns: [/^smart kongsvinger/i] },
  { chain: 'Prio',        patterns: [/^prio\b/i] },
  { chain: 'Texaco',      patterns: ['texaco'] },
  { chain: 'BP',          patterns: [/^bp\b/i] },
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

const LOCAL_CHAINS = [
  { chain: 'Driv',              patterns: [/^driv\b/i] },
  { chain: 'Minol',             patterns: ['minol'] },
  { chain: 'Jæren Olje',        patterns: ['jæren olje', 'jæren oil', 'jaeren olje', 'jaeren oil', 'jæren energi'] },
  { chain: 'Agder Olje',        patterns: ['agder olje', 'agder oil'] },
  { chain: 'Knapphus Energi',   patterns: ['knapphus'] },
  { chain: 'Haltbakk Express',  patterns: ['haltbakk'] },
  { chain: 'Bunker Oil',        patterns: ['bunker oil', 'bunkeroil'] },
  { chain: 'Oljeleverandøren',  patterns: ['oljeleverand'] },
  { chain: 'SEO',               patterns: [/^seo\b/i] },
  { chain: 'Brandval Bensin',   patterns: ['brandval'] },
  { chain: 'Elstad Oljesenter', patterns: ['elstad'] },
  { chain: 'Trønder Oil',       patterns: ['trønder oil', 'tronder oil'] },
  { chain: 'Gasum',             patterns: [/^gasum\b/i] },
  { chain: 'Haugaland Olje',    patterns: ['haugaland olje'] },
  { chain: 'Randøy Olje',       patterns: ['randøy olje', 'randoy olje'] },
  { chain: 'Finnøy Olje',       patterns: ['finnøy olje', 'finnoy olje'] },
  { chain: 'Buskerud Olje',     patterns: ['buskerud olje'] },
  { chain: 'Bendiks Olje',      patterns: ['bendiks olje'] },
  { chain: 'Flatanger Olje',    patterns: ['flatanger olje'] },
  { chain: 'Romsdal Olje',      patterns: ['romsdal olje'] },
  { chain: 'Nordfjord Olje',    patterns: ['nordfjord olje'] },
  { chain: 'Sunnmøre Olje',     patterns: ['sunnmøre olje', 'sunnmore olje'] },
  { chain: 'Torghatten Energi', patterns: ['torghatten energi'] },
  { chain: 'Setesdal Olje',     patterns: ['setesdal olje'] },
  { chain: 'Haugen Olje',       patterns: ['haugen olje'] },
  { chain: 'Lyse Energi',       patterns: ['lyse energi'] },
];

const TANKAUTOMAT_PATTERNS = ['tankautomat', 'tank automat', 'drivstoffautomat', 'bensinautomat'];

const MARINE_SERVICE_PATTERNS = [
  'marina', 'brygge', 'småbåthavn', 'småbåt', 'marin ',
  'gjestehamn', 'gjesthavn', 'båtforening', 'fiskehavn', 'båthavn',
  'havneanlegg', 'kai', 'sjøfront', 'kanalen', 'bryggetorget',
];

const RETAIL_OPERATORS = [
  { operator: 'Coop',        patterns: [/\bcoop\b/i] },
  { operator: 'Coop Extra',  patterns: [/\bcoop extra\b/i] },
  { operator: 'Coop Prix',   patterns: [/\bcoop prix\b/i] },
  { operator: 'Spar',        patterns: [/^spar\b/i, /\bspar bensin/i] },
  { operator: 'Joker',       patterns: [/^joker\b/i] },
  { operator: 'Nærbutikken', patterns: ['nærbutikken', 'nærbutik'] },
  { operator: 'Matkroken',   patterns: ['matkroken'] },
  { operator: "Handlar'n",   patterns: ['handlar'] },
  { operator: 'Bunnpris',    patterns: [/^bunnpris\b/i] },
  { operator: 'Rema 1000',   patterns: ['rema 1000', 'rema1000'] },
  { operator: 'Kiwi',        patterns: [/^kiwi\b/i] },
  { operator: 'Meny',        patterns: [/^meny\b/i] },
  { operator: 'Extra',       patterns: [/^extra\b/i] },
];

const GENERIC_LOCAL_PATTERNS = [
  /^independent$/i, /^smia$/i, /^fitjar$/i, /^stasjonen$/i,
  /^pumpe$/i, /^pumpen$/i, /^max$/i, /^lokal$/i,
  /^nærservice$/i, /^bensinstasjonen$/i, /^tank$/i, /^tanken$/i,
];

const classifyStation = (stationName) => {
  const n = norm(stationName);
  const nm = normMatch(stationName);

  if (FOREIGN_PATTERNS.some(p => p.test(n) || p.test(nm)))
    return { classification: 'possible_foreign', chain: null, operator: null, stationType: 'unknown', reviewReason: 'possible_foreign_station' };

  for (const { chain, patterns } of SECURE_CHAINS)
    if (matchesAny(stationName, patterns))
      return { classification: 'secure_chain', chain, operator: null, stationType: 'standard', reviewReason: 'auto_classified' };

  for (const { stationType, patterns } of SPECIAL_TYPES)
    if (matchesAny(stationName, patterns))
      return { classification: 'specialty_fuel_site', chain: null, operator: null, stationType, reviewReason: 'specialty_fuel_detected' };

  if (isNonFuelPoi(stationName))
    return { classification: 'non_fuel_poi', chain: null, operator: null, stationType: null, reviewReason: 'non_fuel_poi_detected' };

  for (const { chain, patterns } of LOCAL_CHAINS)
    if (matchesAny(stationName, patterns))
      return { classification: 'local_chain', chain, operator: null, stationType: 'standard', reviewReason: 'local_chain_detected' };

  if (TANKAUTOMAT_PATTERNS.some(p => norm(stationName).includes(p)))
    return { classification: 'automatic_fuel_station', chain: null, operator: null, stationType: 'standard', reviewReason: 'auto_classified' };

  if (MARINE_SERVICE_PATTERNS.some(p => norm(stationName).includes(p.toLowerCase())))
    return { classification: 'marine_fuel', chain: null, operator: null, stationType: 'marine_fuel', reviewReason: 'special_type_detected' };

  for (const { operator, patterns } of RETAIL_OPERATORS)
    if (matchesAny(stationName, patterns))
      return { classification: 'retail_fuel_operator', chain: null, operator, stationType: 'retail_fuel', reviewReason: 'retail_operator_detected' };

  if (GENERIC_LOCAL_PATTERNS.some(p => p.test(n)))
    return { classification: 'generic_name', chain: null, operator: null, stationType: 'unknown', reviewReason: 'generic_name' };

  return { classification: 'unclassified', chain: null, operator: null, stationType: null, reviewReason: 'chain_unconfirmed' };
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

  console.log(`[applyHistoricalStationReclassification] mode=${dryRun ? 'DRY_RUN' : 'APPLY'}`);

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

  // ── Find candidates for safe reclassification ──
  const candidates = [];

  for (const station of allStations) {
    const result = classifyStation(station.name);
    const historicalReviews = reviewsByStation[station.id] || [];

    let category = null;
    let targetReviewType = null;

    // Only process safe categories: outdated_non_fuel_poi and outdated_specialty_fuel
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
    }

    if (!category) continue;

    candidates.push({
      stationId: station.id,
      stationName: station.name,
      category,
      targetReviewType,
      historicalReviews: historicalReviews.slice(),
    });
  }

  console.log(`[applyHistoricalStationReclassification] Found ${candidates.length} candidates for safe reclassification`);

  // ── Apply phase ──
  const applied = [];
  const skipped = [];
  const BATCH = 25;

  if (!dryRun) {
    for (let i = 0; i < candidates.length; i += BATCH) {
      const slice = candidates.slice(i, i + BATCH);

      await Promise.all(slice.map(async (c) => {
        try {
          const station = stationMap[c.stationId];
          if (!station) {
            skipped.push({ name: c.stationName, reason: 'station_not_found' });
            return;
          }

          // Check if we should update an existing pending chain_unconfirmed or create new
          const pendingChainUnconfirmed = c.historicalReviews.find(r => r.status === 'pending' && r.review_type === 'chain_unconfirmed');

          if (pendingChainUnconfirmed) {
            // Update the existing review to the target type
            await base44.asServiceRole.entities.StationReview.update(pendingChainUnconfirmed.id, {
              review_type: c.targetReviewType,
              notes: `Reclassified by applyHistoricalStationReclassification: chain_unconfirmed → ${c.targetReviewType} (station now classified as ${c.category})`,
            });
            applied.push({
              stationName: c.stationName,
              action: 'updated_existing_chain_unconfirmed',
              targetReviewType: c.targetReviewType,
              reason: c.category,
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
              reviewReason: c.targetReviewType === 'specialty_fuel_review' ? 'specialty_fuel_detected' : 'non_fuel_poi_detected',
              source_report: 'applyHistoricalStationReclassification',
            };
            await base44.asServiceRole.entities.StationReview.create(newReview);
            applied.push({
              stationName: c.stationName,
              action: 'created_new_review',
              targetReviewType: c.targetReviewType,
              reason: c.category,
            });
          }
        } catch (e) {
          skipped.push({ name: c.stationName, reason: `error: ${e.message}` });
          console.error(`[applyHistoricalStationReclassification] Error processing ${c.stationName}:`, e.message);
        }
      }));

      if (i + BATCH < candidates.length) await new Promise(r => setTimeout(r, 80));
    }
  }

  // ── Build summary ──
  const summary = {
    mode: dryRun ? 'dry_run' : 'apply',
    totalCandidatesIdentified: candidates.length,
    totalApplied: applied.length,
    totalSkipped: skipped.length,
    appliedByAction: {
      updated_existing_chain_unconfirmed: applied.filter(a => a.action === 'updated_existing_chain_unconfirmed').length,
      created_new_review: applied.filter(a => a.action === 'created_new_review').length,
    },
    appliedByCategory: {
      outdated_non_fuel_poi: applied.filter(a => a.reason === 'outdated_non_fuel_poi').length,
      outdated_specialty_fuel: applied.filter(a => a.reason === 'outdated_specialty_fuel').length,
    },
    appliedByReviewType: {
      non_fuel_poi_review: applied.filter(a => a.targetReviewType === 'non_fuel_poi_review').length,
      specialty_fuel_review: applied.filter(a => a.targetReviewType === 'specialty_fuel_review').length,
    },
    appliedExamples: applied.slice(0, 10),
    skippedExamples: skipped.slice(0, 5),
  };

  // Console logging
  console.log('[applyHistoricalStationReclassification] ── SUMMARY ──');
  console.log(`  Mode: ${dryRun ? 'DRY_RUN (no writes)' : 'APPLY'}`);
  console.log(`  Total candidates identified: ${summary.totalCandidatesIdentified}`);
  console.log(`  Total applied: ${summary.totalApplied}`);
  console.log(`  Total skipped: ${summary.totalSkipped}`);
  console.log(`  Applied by action:`);
  console.log(`    - Updated existing chain_unconfirmed: ${summary.appliedByAction.updated_existing_chain_unconfirmed}`);
  console.log(`    - Created new review: ${summary.appliedByAction.created_new_review}`);
  console.log(`  Applied by review type:`);
  console.log(`    - non_fuel_poi_review: ${summary.appliedByReviewType.non_fuel_poi_review}`);
  console.log(`    - specialty_fuel_review: ${summary.appliedByReviewType.specialty_fuel_review}`);

  if (applied.length > 0) {
    console.log('  Applied stations:');
    for (const a of applied.slice(0, 15)) {
      console.log(`    • ${a.stationName} (${a.action} → ${a.targetReviewType})`);
    }
  }

  return Response.json({ success: true, summary });
});