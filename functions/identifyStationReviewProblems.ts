import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// ═══════════════════════════════════════════════════════════════════════════════
// SHARED RULE ENGINE CONFIG
// SINGLE SOURCE OF TRUTH — kept in sync with classifyStationsRuleEngine
//
// Precedence order (deterministic, explicit):
//   1. FOREIGN_PATTERNS
//   2. SECURE_CHAINS
//   3. SPECIAL_TYPES             (LPG/CNG/H2/biogas/truck/parafin)
//   4. NON_FUEL_PATTERNS         (tourism/industrial — no fuel compound)
//   5. LOCAL_CHAINS
//   6. TANKAUTOMAT_PATTERNS
//   7. MARINE_SERVICE_PATTERNS
//   8. RETAIL_OPERATOR_PATTERNS
//   9. GENERIC_LOCAL_PATTERNS
//  10. unclassified
// ═══════════════════════════════════════════════════════════════════════════════

// 1. Foreign / border
const FOREIGN_PATTERNS = [
  /\bpreem\b/i, /\bokq8\b/i, /\benonteki/i, /\bk-market\b/i, /\bk market\b/i,
  /\bq8\b/i, /\bteboil\b/i, /\bmacken\b/i, /\btännäs\b/i, /\bsälen\b/i,
  /\båre\b/i, /\bljungdalen\b/i, /\bklimpfjäll\b/i, /\bjokkmokk\b/i,
  /\bkilpisjärvi\b/i, /\brajamarket\b/i, /\bsuomen\b/i, /\bfinnland\b/i,
  /\bsverige\b/i, /\btärna vilt\b/i, /\bboxfjäll\b/i, /\bsirbmá\b/i,
  /\bsirbma\b/i,
];

// 2. Secure national chains
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

// 3. Specialty fuel types
const SPECIAL_TYPES = [
  { stationType: 'lpg',          patterns: [/^lpg\b/i, /\blpg\b/i, /\bauto-gass\b/i, /\bautogass\b/i, /\bauto gass\b/i] },
  { stationType: 'cng',          patterns: [/^cng\b/i, /\bcng\b/i, 'hynion', 'hydrogen'] },
  { stationType: 'truck_diesel', patterns: ['truck diesel', 'truckdiesel', 'truck-diesel', 'truckdisel', 'truck disel', 'lastebil diesel'] },
  { stationType: 'biogas',       patterns: ['biogass', 'biogas'] },
  { stationType: 'lpg',          patterns: ['parafin', 'fyringsolje'] },
];

// Strong fuel compound terms — prevent false non-fuel classification
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

// 4. Non-fuel POI patterns
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

// 5. Local / regional chains
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

// 6. Tankautomat
const TANKAUTOMAT_PATTERNS = ['tankautomat', 'tank automat', 'drivstoffautomat', 'bensinautomat'];

// 7. Marine / boat service
const MARINE_SERVICE_PATTERNS = [
  'marina', 'brygge', 'småbåthavn', 'småbåt', 'marin ',
  'gjestehamn', 'gjesthavn', 'båtforening', 'fiskehavn', 'båthavn',
  'havneanlegg', 'kai', 'sjøfront', 'kanalen', 'bryggetorget',
];

// 8. Retail operators
const RETAIL_OPERATOR_PATTERNS = [
  /\bcoop\b/i, /\bcoop extra\b/i, /\bcoop prix\b/i,
  /^spar\b/i, /\bspar bensin/i,
  /^joker\b/i,
  /\bnærbutikken\b/i, /\bnærbutik\b/i,
  /\bmatkroken\b/i,
  /\bhandlar\b/i,
  /^bunnpris\b/i,
  /\brema 1000\b/i, /\brema1000\b/i,
  /^kiwi\b/i, /^meny\b/i, /^extra\b/i,
];

// 9. Generic local names
const GENERIC_LOCAL_PATTERNS = [
  /^independent$/i, /^smia$/i, /^fitjar$/i, /^stasjonen$/i,
  /^pumpe$/i, /^pumpen$/i, /^max$/i, /^lokal$/i,
  /^nærservice$/i, /^bensinstasjonen$/i, /^tank$/i, /^tanken$/i,
];

// ─── HELPERS ──────────────────────────────────────────────────────────────────

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
  const n = normMatch(name);
  const nOrig = norm(name);
  return patterns.some(p => {
    if (typeof p === 'string') {
      const pNorm = normMatch(p);
      return nOrig.includes(p.toLowerCase()) || n.includes(pNorm);
    }
    if (p instanceof RegExp) return p.test(nOrig) || p.test(n);
    return false;
  });
};

// ─── CLASSIFICATION FUNCTION (same precedence as classifyStationsRuleEngine) ──

const classifyStation = (stationName) => {
  const n = norm(stationName);
  const nm = normMatch(stationName);

  if (FOREIGN_PATTERNS.some(p => p.test(n) || p.test(nm))) return 'possible_foreign';

  for (const { patterns } of SECURE_CHAINS)
    if (matchesAny(stationName, patterns)) return 'secure_chain';

  for (const { patterns } of SPECIAL_TYPES)
    if (matchesAny(stationName, patterns)) return 'specialty_fuel_site';

  if (isNonFuelPoi(stationName)) return 'non_fuel_poi';

  for (const { patterns } of LOCAL_CHAINS)
    if (matchesAny(stationName, patterns)) return 'local_chain';

  if (TANKAUTOMAT_PATTERNS.some(p => n.includes(p))) return 'automatic_fuel_station';
  if (MARINE_SERVICE_PATTERNS.some(p => n.includes(p.toLowerCase()))) return 'marine_fuel';
  if (RETAIL_OPERATOR_PATTERNS.some(p => p instanceof RegExp ? p.test(n) : n.includes(p))) return 'retail_fuel_operator';
  if (GENERIC_LOCAL_PATTERNS.some(p => p.test(n))) return 'generic_name';

  return 'unclassified';
};

// Classifications that should not generate a chain_unconfirmed review
const SKIP_CHAIN_REVIEW = new Set([
  'possible_foreign', 'secure_chain', 'local_chain',
  'specialty_fuel_site', 'automatic_fuel_station', 'marine_fuel',
  'retail_fuel_operator', 'generic_name', 'non_fuel_poi',
]);

// Classifications that auto-approve / resolve pending chain_unconfirmed reviews
const AUTO_APPROVE_CLASSIFICATIONS = new Set([
  'secure_chain', 'local_chain', 'specialty_fuel_site',
  'automatic_fuel_station', 'marine_fuel', 'retail_fuel_operator',
  'non_fuel_poi',
]);

// Map classification → correct review_type for new or reclassified reviews
const CLASSIFICATION_TO_REVIEW_TYPE = {
  possible_foreign:    'possible_foreign_station',
  generic_name:        'generic_name_review',
  specialty_fuel_site: 'specialty_fuel_review',
  non_fuel_poi:        'non_fuel_poi_review',
  unclassified:        'chain_unconfirmed',
};

const CLASSIFICATION_TO_REASON = {
  possible_foreign:    'possible_foreign_station',
  generic_name:        'generic_name',
  specialty_fuel_site: 'specialty_fuel_detected',
  non_fuel_poi:        'non_fuel_poi_detected',
  unclassified:        'chain_unconfirmed',
};

// ─── HANDLER ──────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const results = {
      chain_unconfirmed_created: 0,
      generic_names_created: 0,
      possible_foreign_created: 0,
      specialty_fuel_review_created: 0,
      non_fuel_poi_review_created: 0,
      reclassified_from_chain_unconfirmed: 0,
      skipped_already_classified: 0,
      skipped_existing_review: 0,
      wrong_type_fixed: 0,
      auto_approved: 0,
      total_created: 0,
      timestamp: new Date().toISOString(),
    };

    const sampleByType = {
      specialty_fuel_review: [],
      non_fuel_poi_review: [],
      possible_foreign_station: [],
    };

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

    // Fetch existing reviews (all statuses — we need to fix misbucketed pending)
    const existingReviews = await base44.asServiceRole.entities.StationReview.list();
    const reviewsByStation = {};
    for (const r of existingReviews) {
      if (!reviewsByStation[r.stationId]) reviewsByStation[r.stationId] = [];
      reviewsByStation[r.stationId].push(r);
    }

    const toCreate = [];
    const toFix = [];

    for (const station of allStations) {
      if (station.sourceName === 'GooglePlaces') continue;

      const classification = classifyStation(station.name);
      const existingForStation = reviewsByStation[station.id] || [];
      const targetReviewType = CLASSIFICATION_TO_REVIEW_TYPE[classification];
      const targetReason    = CLASSIFICATION_TO_REASON[classification];

      // Fix / sync existing pending reviews
      for (const rev of existingForStation) {
        if (rev.status !== 'pending') continue;

        if (AUTO_APPROVE_CLASSIFICATIONS.has(classification)) {
          // These are now positively classified — auto-resolve
          toFix.push({ id: rev.id, update: {
            status: 'auto_resolved',
            reviewReason: targetReason || 'auto_classified',
            notes: `Auto-resolved: klassifisert som ${classification} av regelmotor.`,
          }});
          results.auto_approved++;
          results.wrong_type_fixed++;
        } else if (
          rev.review_type === 'chain_unconfirmed' &&
          targetReviewType && targetReviewType !== 'chain_unconfirmed'
        ) {
          // Reclassify broad chain_unconfirmed into specific review type
          toFix.push({ id: rev.id, update: {
            review_type: targetReviewType,
            reviewReason: targetReason,
            notes: `Reklassifisert fra chain_unconfirmed: ${classification}`,
          }});
          results.reclassified_from_chain_unconfirmed++;
          results.wrong_type_fixed++;
        } else if (classification === 'possible_foreign' && rev.review_type !== 'possible_foreign_station') {
          toFix.push({ id: rev.id, update: { review_type: 'possible_foreign_station', reviewReason: 'possible_foreign_station' } });
          results.wrong_type_fixed++;
        } else if (classification === 'generic_name' && rev.review_type !== 'generic_name_review') {
          toFix.push({ id: rev.id, update: { review_type: 'generic_name_review', reviewReason: 'generic_name' } });
          results.wrong_type_fixed++;
        }
      }

      const hasExistingPending = existingForStation.some(r => r.status === 'pending');
      if (hasExistingPending) {
        results.skipped_existing_review++;
        continue;
      }

      // Create new reviews for classifications that need them
      if (classification === 'possible_foreign') {
        toCreate.push({
          stationId: station.id, review_type: 'possible_foreign_station',
          station_name: station.name, station_chain: station.chain || null,
          station_latitude: station.latitude, station_longitude: station.longitude,
          status: 'pending',
          issue_description: `Mulig utenlandsk stasjon: "${station.name}"`,
          suggested_action: 'Verifiser om dette er en norsk stasjon, eller marker som avvist',
          reviewReason: 'possible_foreign_station', source_report: 'rule_engine_classify',
        });
        results.possible_foreign_created++;
        results.total_created++;
        if (sampleByType.possible_foreign_station.length < 5) sampleByType.possible_foreign_station.push(station.name);

      } else if (classification === 'specialty_fuel_site') {
        toCreate.push({
          stationId: station.id, review_type: 'specialty_fuel_review',
          station_name: station.name, station_chain: station.chain || null,
          station_latitude: station.latitude, station_longitude: station.longitude,
          status: 'pending',
          issue_description: `Spesialdrivstoff-stasjon identifisert: "${station.name}"`,
          suggested_action: 'Verifiser stationType (LPG/CNG/H2/biogas/truck/parafin) og godkjenn',
          reviewReason: 'specialty_fuel_detected', source_report: 'rule_engine_classify',
        });
        results.specialty_fuel_review_created++;
        results.total_created++;
        if (sampleByType.specialty_fuel_review.length < 5) sampleByType.specialty_fuel_review.push(station.name);

      } else if (classification === 'non_fuel_poi') {
        toCreate.push({
          stationId: station.id, review_type: 'non_fuel_poi_review',
          station_name: station.name, station_chain: station.chain || null,
          station_latitude: station.latitude, station_longitude: station.longitude,
          status: 'pending',
          issue_description: `Mulig ikke-drivstoff POI: "${station.name}" (camping/turiststed/industri)`,
          suggested_action: 'Verifiser om dette er en reell drivstoffstasjon — avvis eller omklassifiser',
          reviewReason: 'non_fuel_poi_detected', source_report: 'rule_engine_classify',
        });
        results.non_fuel_poi_review_created++;
        results.total_created++;
        if (sampleByType.non_fuel_poi_review.length < 5) sampleByType.non_fuel_poi_review.push(station.name);

      } else if (classification === 'generic_name') {
        toCreate.push({
          stationId: station.id, review_type: 'generic_name_review',
          station_name: station.name, station_chain: station.chain || null,
          station_latitude: station.latitude, station_longitude: station.longitude,
          status: 'pending',
          issue_description: `Generisk stasjonsnavn: "${station.name}"`,
          suggested_action: 'Finn spesifikt navn eller merge med annen stasjon',
          reviewReason: 'generic_name', source_report: 'rule_engine_classify',
        });
        results.generic_names_created++;
        results.total_created++;

      } else if (classification === 'unclassified' && !station.chain) {
        toCreate.push({
          stationId: station.id, review_type: 'chain_unconfirmed',
          station_name: station.name, station_chain: null,
          station_latitude: station.latitude, station_longitude: station.longitude,
          status: 'pending',
          issue_description: `Kjede ikke bekreftet: "${station.name}" på ${station.address || 'ukjent adresse'}`,
          suggested_action: 'Verifiser kjede basert på navn og lokalisering',
          source_report: 'rule_engine_classify',
        });
        results.chain_unconfirmed_created++;
        results.total_created++;

      } else {
        results.skipped_already_classified++;
      }
    }

    // Apply fixes
    for (const { id, update } of toFix) {
      try { await base44.asServiceRole.entities.StationReview.update(id, update); } catch (e) { /* ignore */ }
      await new Promise(r => setTimeout(r, 25));
    }

    // Create new reviews
    const BATCH_SIZE = 25;
    for (let i = 0; i < toCreate.length; i += BATCH_SIZE) {
      try {
        await base44.asServiceRole.entities.StationReview.bulkCreate(toCreate.slice(i, i + BATCH_SIZE));
      } catch (err) {
        console.error(`Batch insert failed:`, err.message);
      }
      await new Promise(r => setTimeout(r, 100));
    }

    console.log(`[identifyStationReviewProblems] SUMMARY:`);
    console.log(`  Created: ${results.total_created} | Auto-approved: ${results.auto_approved} | Fixed: ${results.wrong_type_fixed}`);
    console.log(`  Reclassified from chain_unconfirmed: ${results.reclassified_from_chain_unconfirmed}`);
    console.log(`  New by type: foreign=${results.possible_foreign_created}, generic=${results.generic_names_created}, specialty_fuel=${results.specialty_fuel_review_created}, non_fuel_poi=${results.non_fuel_poi_review_created}, chain_unconfirmed=${results.chain_unconfirmed_created}`);
    if (sampleByType.specialty_fuel_review.length > 0) console.log(`  Specialty fuel examples: ${sampleByType.specialty_fuel_review.join(' | ')}`);
    if (sampleByType.non_fuel_poi_review.length > 0) console.log(`  Non-fuel POI examples: ${sampleByType.non_fuel_poi_review.join(' | ')}`);
    if (sampleByType.possible_foreign_station.length > 0) console.log(`  Foreign examples: ${sampleByType.possible_foreign_station.join(' | ')}`);

    return Response.json({ success: true, ...results, sampleByType });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});