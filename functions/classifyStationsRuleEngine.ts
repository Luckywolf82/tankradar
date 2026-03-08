import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// ─── FEATURE FLAGS ────────────────────────────────────────────────────────────
const ENABLE_DUPLICATE_DETECTION = false;
const ENABLE_NEARBY_CHAIN_MATCH = false;

// ═══════════════════════════════════════════════════════════════════════════════
// SHARED RULE ENGINE CONFIG
// SINGLE SOURCE OF TRUTH — kept in sync with identifyStationReviewProblems
//
// Precedence order (deterministic, explicit):
//   1. FOREIGN_PATTERNS          → possible_foreign
//   2. SECURE_CHAINS             → secure_chain
//   3. SPECIAL_TYPES             → specialty_fuel_site  (LPG/CNG/H2/biogas/truck/parafin)
//   4. NON_FUEL_PATTERNS         → non_fuel_poi         (tourism/industrial — no fuel signal)
//   5. LOCAL_CHAINS              → local_chain
//   6. TANKAUTOMAT_PATTERNS      → automatic_fuel_station
//   7. MARINE_SERVICE_PATTERNS   → marine_fuel
//   8. RETAIL_OPERATORS          → retail_fuel_operator
//   9. GENERIC_LOCAL_PATTERNS    → generic_name
//  10. (fallthrough)             → unclassified
//
// NOTE: Generic words "tank", "tanken", "bensin", "drivstoff" alone are NOT chain signals.
// NOTE: NON_FUEL_PATTERNS only win if no strong fuel compound is present in the name.
// ═══════════════════════════════════════════════════════════════════════════════

// 1. Foreign / border — highest priority
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

// 3. Specialty fuel types — evaluated BEFORE local chains
//    Maps to classification: specialty_fuel_site / review_type: specialty_fuel_review
const SPECIAL_TYPES = [
  { stationType: 'lpg',          patterns: [/^lpg\b/i, /\blpg\b/i, /\bauto-gass\b/i, /\bautogass\b/i, /\bauto gass\b/i] },
  { stationType: 'cng',          patterns: [/^cng\b/i, /\bcng\b/i, 'hynion', 'hydrogen'] },
  { stationType: 'truck_diesel', patterns: ['truck diesel', 'truckdiesel', 'truck-diesel', 'truckdisel', 'truck disel', 'lastebil diesel'] },
  { stationType: 'biogas',       patterns: ['biogass', 'biogas'] },
  { stationType: 'unknown',      patterns: ['parafin', 'fyringsolje'] }, // heating fuel — specialty
];

// Compound fuel terms that OVERRIDE non-fuel signals (prevents false non-fuel classification)
// e.g. "Eidsfoss Bensin", "Kjeldebotn Drivstoff AS" must stay as fuel sites
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

// 4. Non-fuel POI patterns — tourism, industrial, municipal
//    Maps to classification: non_fuel_poi / review_type: non_fuel_poi_review
//    Only wins when NO strong fuel compound is present.
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
  /\bkf\b/i,          // kommunalt foretak suffix
  /\bindustriomr/i,
  /\bcontainerhavn\b/i,
  /\blogistikk\b/i, /\bspedisjon\b/i,
];

// Combined check: name matches tourism or industrial signal AND no strong fuel compound
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

// TANKEN_NAME_PATTERNS — separate from generic, should trigger possible_local_fuel_site review
const TANKEN_NAME_PATTERNS = [
  /^tank$/i,
  /^tanken$/i,
];

// 9. Generic local names — plain names with no stronger signal
const GENERIC_LOCAL_PATTERNS = [
  /^independent$/i, /^smia$/i, /^fitjar$/i, /^stasjonen$/i,
  /^pumpe$/i, /^pumpen$/i, /^max$/i, /^lokal$/i,
  /^nærservice$/i, /^bensinstasjonen$/i,
];

// ─── CLASSIFICATION OUTCOME MODEL ─────────────────────────────────────────────
// Maps classification → { review_type, reviewReason, stationType, resolves }
// resolves=true means this classification auto-closes a pending chain_unconfirmed review

const CLASSIFICATION_OUTCOMES = {
  possible_foreign:       { review_type: 'possible_foreign_station', reviewReason: 'possible_foreign_station', stationType: null,         resolves: false },
  secure_chain:           { review_type: null,                        reviewReason: 'auto_classified',          stationType: 'standard',   resolves: true  },
  specialty_fuel_site:    { review_type: 'specialty_fuel_review',     reviewReason: 'specialty_fuel_detected',  stationType: null,         resolves: true  },
  non_fuel_poi:           { review_type: 'non_fuel_poi_review',       reviewReason: 'non_fuel_poi_detected',    stationType: null,         resolves: true  },
  local_chain:            { review_type: null,                        reviewReason: 'local_chain_detected',     stationType: 'standard',   resolves: true  },
  automatic_fuel_station: { review_type: null,                        reviewReason: 'auto_classified',          stationType: 'standard',   resolves: true  },
  marine_fuel:            { review_type: null,                        reviewReason: 'special_type_detected',   stationType: 'marine_fuel', resolves: true  },
  retail_fuel_operator:   { review_type: null,                        reviewReason: 'retail_operator_detected', stationType: 'retail_fuel', resolves: true  },
  generic_name:           { review_type: 'generic_name_review',       reviewReason: 'generic_name',            stationType: null,          resolves: false },
  unclassified:           { review_type: 'chain_unconfirmed',         reviewReason: 'chain_unconfirmed',       stationType: null,          resolves: false },
};

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
  const nOrig = norm(name);
  const n = normMatch(name);
  return patterns.some(p => {
    if (typeof p === 'string') return nOrig.includes(p.toLowerCase()) || n.includes(normMatch(p));
    if (p instanceof RegExp) return p.test(nOrig) || p.test(n);
    return false;
  });
};

const haversineMeters = (lat1, lon1, lat2, lon2) => {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const nameSimilarity = (a, b) => {
  const na = normMatch(a), nb = normMatch(b);
  if (na === nb) return 1.0;
  const bigrams = (s) => { const set = new Set(); for (let i = 0; i < s.length - 1; i++) set.add(s.slice(i, i + 2)); return set; };
  const ba = bigrams(na), bb = bigrams(nb);
  let inter = 0;
  for (const g of ba) { if (bb.has(g)) inter++; }
  const union = ba.size + bb.size - inter;
  return union === 0 ? 0 : inter / union;
};

const gridKey = (lat, lon) => `${Math.floor(lat * 90)}_${Math.floor(lon * 55)}`;

// ─── MAIN CLASSIFICATION FUNCTION ─────────────────────────────────────────────
// Returns: { classification, chain, operator, stationType, reviewReason }

const classifyStation = (stationName) => {
  const n = norm(stationName);
  const nm = normMatch(stationName);

  // 1. TANKEN_NAME_PATTERNS — before generic check
  if (TANKEN_NAME_PATTERNS.some(p => p.test(n)))
    return { classification: 'unclassified', chain: null, operator: null, stationType: 'unknown', reviewReason: 'possible_local_fuel_site' };

  // 2. Foreign
  if (FOREIGN_PATTERNS.some(p => p.test(n) || p.test(nm)))
    return { classification: 'possible_foreign', chain: null, operator: null, stationType: 'unknown', reviewReason: 'possible_foreign_station' };

  // 3. Secure chains
  for (const { chain, patterns } of SECURE_CHAINS)
    if (matchesAny(stationName, patterns))
      return { classification: 'secure_chain', chain, operator: null, stationType: 'standard', reviewReason: 'auto_classified' };

  // 4. Specialty fuel — before local chains, before non-fuel
  for (const { stationType, patterns } of SPECIAL_TYPES)
    if (matchesAny(stationName, patterns))
      return { classification: 'specialty_fuel_site', chain: null, operator: null, stationType, reviewReason: 'specialty_fuel_detected' };

  // 5. Non-fuel POI — only if no strong fuel compound in name
  if (isNonFuelPoi(stationName))
    return { classification: 'non_fuel_poi', chain: null, operator: null, stationType: null, reviewReason: 'non_fuel_poi_detected' };

  // 6. Local chains
  for (const { chain, patterns } of LOCAL_CHAINS)
    if (matchesAny(stationName, patterns))
      return { classification: 'local_chain', chain, operator: null, stationType: 'standard', reviewReason: 'local_chain_detected' };

  // 6. Tankautomat
  if (TANKAUTOMAT_PATTERNS.some(p => n.includes(p)))
    return { classification: 'automatic_fuel_station', chain: null, operator: null, stationType: 'standard', reviewReason: 'auto_classified' };

  // 7. Marine
  if (MARINE_SERVICE_PATTERNS.some(p => n.includes(p.toLowerCase())))
    return { classification: 'marine_fuel', chain: null, operator: null, stationType: 'marine_fuel', reviewReason: 'special_type_detected' };

  // 8. Retail operators
  for (const { operator, patterns } of RETAIL_OPERATORS)
    if (matchesAny(stationName, patterns))
      return { classification: 'retail_fuel_operator', chain: null, operator, stationType: 'retail_fuel', reviewReason: 'retail_operator_detected' };

  // 9. Generic name
  if (GENERIC_LOCAL_PATTERNS.some(p => p.test(n)))
    return { classification: 'generic_name', chain: null, operator: null, stationType: 'unknown', reviewReason: 'generic_name' };

  // 10. Unclassified
  return { classification: 'unclassified', chain: null, operator: null, stationType: null, reviewReason: 'chain_unconfirmed' };
};

// Classifications where existing chain_unconfirmed reviews should be auto-resolved
const AUTO_RESOLVES_CHAIN_REVIEW = new Set([
  'secure_chain', 'local_chain', 'specialty_fuel_site',
  'automatic_fuel_station', 'marine_fuel', 'retail_fuel_operator',
  'non_fuel_poi',
]);
const SKIP_NEARBY = new Set(['possible_foreign', 'marine_fuel', 'specialty_fuel_site', 'non_fuel_poi', 'generic_name', 'unclassified']);

// ─── HANDLER ──────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  const totalStart = Date.now();
  try {
    const base44 = createClientFromRequest(req);
    const isScheduled = req.headers.get('x-automation-source') === 'scheduled';

    if (!isScheduled) {
      const user = await base44.auth.me();
      if (user?.role !== 'admin')
        return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const RUN_LIMIT = 200;

    // ── Fetch stations ──
    let t = Date.now();
    let allStations = [];
    let page = 0;
    while (true) {
      const batch = await base44.asServiceRole.entities.Station.list('-created_date', 500, page * 500);
      if (!batch || batch.length === 0) break;
      allStations = allStations.concat(batch);
      if (batch.length < 500) break;
      page++;
    }
    console.log(`[timing] fetch stations: ${Date.now() - t}ms (n=${allStations.length})`);

    // ── Fetch pending reviews ──
    t = Date.now();
    let allPendingReviews = [];
    page = 0;
    while (true) {
      const batch = await base44.asServiceRole.entities.StationReview.filter({ status: 'pending' }, '-created_date', 500, page * 500);
      if (!batch || batch.length === 0) break;
      allPendingReviews = allPendingReviews.concat(batch);
      if (batch.length < 500) break;
      page++;
    }
    const pendingBefore = allPendingReviews.length;
    console.log(`[timing] fetch pending reviews: ${Date.now() - t}ms (n=${pendingBefore})`);

    const pendingByStation = {};
    for (const r of allPendingReviews) {
      if (!pendingByStation[r.stationId]) pendingByStation[r.stationId] = [];
      pendingByStation[r.stationId].push(r);
    }

    const stationsToProcess = allStations.slice(0, RUN_LIMIT);
    console.log(`[timing] processing ${stationsToProcess.length} of ${allStations.length} stations (RUN_LIMIT=${RUN_LIMIT})`);

    // ── Duplicate detection (spatial grid, feature-flagged) ──
    t = Date.now();
    const duplicateFlaggedIds = new Set();
    const duplicatePairs = [];

    if (ENABLE_DUPLICATE_DETECTION) {
      const spatialGrid = {};
      for (const s of stationsToProcess) {
        if (!s.latitude || !s.longitude) continue;
        const key = gridKey(s.latitude, s.longitude);
        if (!spatialGrid[key]) spatialGrid[key] = [];
        spatialGrid[key].push(s);
      }
      for (const s of stationsToProcess) {
        if (!s.latitude || !s.longitude) continue;
        const baseLat = Math.floor(s.latitude * 90);
        const baseLon = Math.floor(s.longitude * 55);
        for (let dlat = -1; dlat <= 1; dlat++) {
          for (let dlon = -1; dlon <= 1; dlon++) {
            const neighbors = spatialGrid[`${baseLat + dlat}_${baseLon + dlon}`] || [];
            for (const other of neighbors) {
              if (other.id <= s.id) continue;
              const dist = haversineMeters(s.latitude, s.longitude, other.latitude, other.longitude);
              if (dist < 50 && norm(s.name) === norm(other.name)) {
                duplicateFlaggedIds.add(other.id);
                duplicatePairs.push({ a: { id: s.id, name: s.name }, b: { id: other.id, name: other.name }, distanceMeters: Math.round(dist) });
              }
            }
          }
        }
      }
    }
    console.log(`[timing] duplicate detection (enabled=${ENABLE_DUPLICATE_DETECTION}): ${Date.now() - t}ms (pairs=${duplicatePairs.length})`);

    // ── Chain bucket / nearby prep ──
    t = Date.now();
    const chainBuckets = {};
    if (ENABLE_NEARBY_CHAIN_MATCH) {
      for (const s of allStations) {
        if (!s.chain || !s.latitude || !s.longitude) continue;
        if (!chainBuckets[s.chain]) chainBuckets[s.chain] = [];
        chainBuckets[s.chain].push(s);
      }
    }
    const NEARBY_DISTANCE_M = 80;
    const NEARBY_SIMILARITY = 0.88;

    const findNearbyChainMatch = (station, classificationChain) => {
      if (!ENABLE_NEARBY_CHAIN_MATCH) return null;
      const chain = classificationChain || station.chain;
      if (!chain || !station.latitude || !station.longitude) return null;
      const bucket = chainBuckets[chain] || [];
      for (const candidate of bucket) {
        if (candidate.id === station.id) continue;
        const dist = haversineMeters(station.latitude, station.longitude, candidate.latitude, candidate.longitude);
        if (dist > NEARBY_DISTANCE_M) continue;
        const sim = nameSimilarity(station.name, candidate.name);
        if (sim >= NEARBY_SIMILARITY) return { name: candidate.name, dist: Math.round(dist), sim: sim.toFixed(2) };
      }
      return null;
    };
    console.log(`[timing] chain bucket / nearby prep (enabled=${ENABLE_NEARBY_CHAIN_MATCH}): ${Date.now() - t}ms`);

    // ── Classification loop ──
    t = Date.now();
    const classCounts = {
      secure_chain: 0, local_chain: 0, specialty_fuel_site: 0, non_fuel_poi: 0,
      marine_fuel: 0, retail_fuel_operator: 0, generic_name: 0,
      possible_foreign: 0, automatic_fuel_station: 0, unclassified: 0,
    };

    const lifecycle = {
      chainReviewsAutoResolved: 0, specialtyFuelResolved: 0, nonFuelPoiResolved: 0,
      nearbyAutoResolved: 0,
      foreignCreated: 0, genericCreated: 0, chainUnconfirmedCreated: 0,
      specialtyFuelReviewCreated: 0, nonFuelPoiReviewCreated: 0,
      reclassifiedFromChainUnconfirmed: 0,
      reviewsUpdatedNotDuplicated: 0, duplicateCandidatesMarked: 0, stationsUpdated: 0,
    };

    const details = {
      possible_foreign: [], generic_name: [], specialty_fuel: [], non_fuel_poi: [],
      auto_resolved_sample: [],
    };
    const stationUpdates = [];
    const reviewResolutions = [];
    const reviewCreations = [];

    for (const station of stationsToProcess) {
      const result = classifyStation(station.name);
      classCounts[result.classification] = (classCounts[result.classification] || 0) + 1;

      if (result.classification === 'possible_foreign') details.possible_foreign.push({ id: station.id, name: station.name });
      if (result.classification === 'generic_name') details.generic_name.push({ id: station.id, name: station.name });
      if (result.classification === 'specialty_fuel_site') details.specialty_fuel.push({ id: station.id, name: station.name });
      if (result.classification === 'non_fuel_poi') details.non_fuel_poi.push({ id: station.id, name: station.name });

      // Station field updates — only push if actual changes
      const stationUpdate = {};
      if (result.chain && station.chain !== result.chain) stationUpdate.chain = result.chain;
      if (result.operator && station.operator !== result.operator) stationUpdate.operator = result.operator;
      if (result.stationType && result.stationType !== 'unknown' && result.stationType !== null && station.stationType !== result.stationType)
        stationUpdate.stationType = result.stationType;
      if (Object.keys(stationUpdate).length > 0) stationUpdates.push({ id: station.id, update: stationUpdate });

      const existingPending = pendingByStation[station.id] || [];
      const outcome = CLASSIFICATION_OUTCOMES[result.classification];

      // 1. Nearby same-chain auto-resolve (feature-flagged)
      if (!SKIP_NEARBY.has(result.classification)) {
        const nearby = findNearbyChainMatch(station, result.chain);
        if (nearby) {
          for (const rev of existingPending) {
            reviewResolutions.push({ id: rev.id, update: {
              status: 'auto_resolved',
              reviewReason: 'nearby_same_chain',
              notes: `Auto-resolved: nearby_same_chain (${nearby.dist}m, likhet ${nearby.sim}) mot "${nearby.name}"`,
            }});
            lifecycle.nearbyAutoResolved++;
          }
          continue;
        }
      }

      // 2. Auto-resolve classifications that resolve chain reviews
      if (AUTO_RESOLVES_CHAIN_REVIEW.has(result.classification)) {
        for (const rev of existingPending) {
          if (rev.review_type === 'chain_unconfirmed') {
            // Reclassify into more specific review type if one exists, else auto-resolve
            const targetReviewType = outcome.review_type;
            if (targetReviewType) {
              // Reclassify the old chain_unconfirmed into specific type
              reviewResolutions.push({ id: rev.id, update: {
                review_type: targetReviewType,
                reviewReason: outcome.reviewReason,
                notes: `Reklassifisert fra chain_unconfirmed: ${result.classification} (${result.reviewReason})`,
              }});
              lifecycle.reclassifiedFromChainUnconfirmed++;
              if (result.classification === 'specialty_fuel_site') lifecycle.specialtyFuelResolved++;
              if (result.classification === 'non_fuel_poi') lifecycle.nonFuelPoiResolved++;
            } else {
              // Classifications like secure_chain, local_chain → just auto-resolve
              const note = result.chain
                ? `Auto-resolved: kjede bekreftet som "${result.chain}" av regelmotor`
                : `Auto-resolved: klassifisert som ${result.classification}`;
              reviewResolutions.push({ id: rev.id, update: {
                status: 'auto_resolved',
                reviewReason: result.reviewReason,
                station_chain: result.chain || undefined,
                station_operator: result.operator || undefined,
                station_stationType: result.stationType || undefined,
                notes: note,
              }});
              lifecycle.chainReviewsAutoResolved++;
              details.auto_resolved_sample.push({ name: station.name, reason: note });
            }
          } else {
            reviewResolutions.push({ id: rev.id, update: { reviewReason: result.reviewReason } });
            lifecycle.reviewsUpdatedNotDuplicated++;
          }
        }
        continue;
      }

      // 3. Possible foreign — create/ensure correct review type
      if (result.classification === 'possible_foreign') {
        const existingForeign = existingPending.find(r => r.review_type === 'possible_foreign_station');
        if (!existingForeign) {
          for (const rev of existingPending) {
            if (rev.review_type !== 'possible_foreign_station')
              reviewResolutions.push({ id: rev.id, update: { status: 'auto_resolved', notes: 'Overskrevet: reklassifisert som possible_foreign' } });
          }
          reviewCreations.push({
            stationId: station.id, review_type: 'possible_foreign_station',
            station_name: station.name, station_chain: station.chain || null,
            station_latitude: station.latitude, station_longitude: station.longitude,
            status: 'pending',
            issue_description: `Mulig utenlandsk stasjon: "${station.name}"`,
            suggested_action: 'Verifiser om dette er norsk stasjon, eller avvis',
            reviewReason: 'possible_foreign_station', source_report: 'rule_engine_classify',
          });
          lifecycle.foreignCreated++;
        } else {
          lifecycle.reviewsUpdatedNotDuplicated++;
        }
        continue;
      }

      // 4. Generic name
      if (result.classification === 'generic_name') {
        const existingGeneric = existingPending.find(r => r.review_type === 'generic_name_review');
        if (!existingGeneric) {
          reviewCreations.push({
            stationId: station.id, review_type: 'generic_name_review',
            station_name: station.name, station_chain: station.chain || null,
            station_latitude: station.latitude, station_longitude: station.longitude,
            status: 'pending',
            issue_description: `Generisk stasjonsnavn: "${station.name}"`,
            suggested_action: 'Finn spesifikt navn eller merge med annen stasjon',
            reviewReason: 'generic_name', source_report: 'rule_engine_classify',
          });
          lifecycle.genericCreated++;
        } else {
          lifecycle.reviewsUpdatedNotDuplicated++;
        }
        continue;
      }

      // 5. Unclassified without chain → chain_unconfirmed
      if (result.classification === 'unclassified' && !station.chain) {
        const existingChainReview = existingPending.find(r => r.review_type === 'chain_unconfirmed');
        if (!existingChainReview) {
          reviewCreations.push({
            stationId: station.id, review_type: 'chain_unconfirmed',
            station_name: station.name, station_chain: null,
            station_latitude: station.latitude, station_longitude: station.longitude,
            status: 'pending',
            issue_description: `Kjede ikke bekreftet for "${station.name}"`,
            suggested_action: 'Verifiser kjede basert på navn og lokalisering',
            source_report: 'rule_engine_classify',
          });
          lifecycle.chainUnconfirmedCreated++;
        } else {
          lifecycle.reviewsUpdatedNotDuplicated++;
        }
        continue;
      }

      // 6. Unclassified with chain already set → close chain_unconfirmed
      if (result.classification === 'unclassified' && station.chain) {
        for (const rev of existingPending) {
          if (rev.review_type === 'chain_unconfirmed') {
            reviewResolutions.push({ id: rev.id, update: {
              status: 'auto_resolved',
              notes: `Auto-resolved: station har allerede chain="${station.chain}"`,
            }});
            lifecycle.chainReviewsAutoResolved++;
          }
        }
      }

      // 7. Duplicate candidates (feature-flagged)
      if (ENABLE_DUPLICATE_DETECTION && duplicateFlaggedIds.has(station.id)) {
        const existingDup = existingPending.find(r => r.review_type === 'duplicate_candidate');
        if (!existingDup) {
          reviewCreations.push({
            stationId: station.id, review_type: 'duplicate_candidate',
            station_name: station.name, station_chain: station.chain || null,
            station_latitude: station.latitude, station_longitude: station.longitude,
            status: 'duplicate_candidate',
            issue_description: `Mulig duplikat av annen stasjon (< 50m, identisk navn)`,
            suggested_action: 'Merge eller fjern duplikat',
            reviewReason: 'auto_classified', source_report: 'rule_engine_classify',
          });
          lifecycle.duplicateCandidatesMarked++;
        }
      }
    }
    console.log(`[timing] classification loop: ${Date.now() - t}ms (updates=${stationUpdates.length} resolutions=${reviewResolutions.length} creations=${reviewCreations.length})`);

    // ── Station updates ──
    t = Date.now();
    const BATCH = 40;
    let stationsUpdated = 0;
    for (let i = 0; i < stationUpdates.length; i += BATCH) {
      await Promise.all(stationUpdates.slice(i, i + BATCH).map(({ id, update }) =>
        base44.asServiceRole.entities.Station.update(id, update).then(() => stationsUpdated++).catch(() => {})
      ));
      if (i + BATCH < stationUpdates.length) await new Promise(r => setTimeout(r, 60));
    }
    lifecycle.stationsUpdated = stationsUpdated;
    console.log(`[timing] station updates: ${Date.now() - t}ms (wrote=${stationsUpdated})`);

    // ── Review resolutions ──
    t = Date.now();
    for (let i = 0; i < reviewResolutions.length; i += BATCH) {
      await Promise.all(reviewResolutions.slice(i, i + BATCH).map(({ id, update }) =>
        base44.asServiceRole.entities.StationReview.update(id, update).catch(() => {})
      ));
      if (i + BATCH < reviewResolutions.length) await new Promise(r => setTimeout(r, 60));
    }
    console.log(`[timing] review resolutions: ${Date.now() - t}ms (n=${reviewResolutions.length})`);

    // ── Review creations ──
    t = Date.now();
    const CREATE_BATCH = 50;
    for (let i = 0; i < reviewCreations.length; i += CREATE_BATCH) {
      await base44.asServiceRole.entities.StationReview.bulkCreate(reviewCreations.slice(i, i + CREATE_BATCH)).catch(e => console.error('bulkCreate failed:', e.message));
      if (i + CREATE_BATCH < reviewCreations.length) await new Promise(r => setTimeout(r, 80));
    }
    console.log(`[timing] review creations: ${Date.now() - t}ms (n=${reviewCreations.length})`);

    const totalAutoResolved = lifecycle.chainReviewsAutoResolved + lifecycle.nearbyAutoResolved;
    const totalReclassified = lifecycle.reclassifiedFromChainUnconfirmed;
    const totalNewPending = lifecycle.foreignCreated + lifecycle.genericCreated + lifecycle.chainUnconfirmedCreated + lifecycle.specialtyFuelReviewCreated + lifecycle.nonFuelPoiReviewCreated;
    const netChange = totalNewPending - totalAutoResolved - totalReclassified;
    const totalMs = Date.now() - totalStart;

    console.log(`[classifyStationsRuleEngine] SUMMARY:`);
    console.log(`  Total: ${totalMs}ms | processed=${stationsToProcess.length}/${allStations.length}`);
    console.log(`  Auto-resolved (chain confirmed): ${lifecycle.chainReviewsAutoResolved}`);
    console.log(`  Reclassified from chain_unconfirmed: ${totalReclassified} (specialty_fuel=${lifecycle.specialtyFuelResolved}, non_fuel_poi=${lifecycle.nonFuelPoiResolved})`);
    console.log(`  New pending created: foreign=${lifecycle.foreignCreated}, generic=${lifecycle.genericCreated}, chain_unconfirmed=${lifecycle.chainUnconfirmedCreated}`);
    console.log(`  Net queue change: ${netChange > 0 ? '+' : ''}${netChange}`);
    if (details.specialty_fuel.length > 0) console.log(`  Specialty fuel examples: ${details.specialty_fuel.slice(0, 5).map(s => s.name).join(' | ')}`);
    if (details.non_fuel_poi.length > 0) console.log(`  Non-fuel POI examples: ${details.non_fuel_poi.slice(0, 5).map(s => s.name).join(' | ')}`);

    return Response.json({
      success: true,
      summary: {
        totalStations: allStations.length,
        processedStations: stationsToProcess.length,
        runLimit: RUN_LIMIT,
        stationUpdates: stationsUpdated,
        totalRuntimeMs: totalMs,
        lifecycle: {
          pendingBefore,
          autoResolved: {
            chainConfirmed: lifecycle.chainReviewsAutoResolved,
            specialTypeOrRetail: lifecycle.specialtyFuelResolved + lifecycle.nonFuelPoiResolved,
            nearbyAutoResolved: lifecycle.nearbyAutoResolved,
            total: totalAutoResolved,
          },
          reclassifiedFromChainUnconfirmed: totalReclassified,
          newPendingCreated: {
            possibleForeign: lifecycle.foreignCreated,
            genericName: lifecycle.genericCreated,
            chainUnconfirmed: lifecycle.chainUnconfirmedCreated,
            specialtyFuelReview: lifecycle.specialtyFuelReviewCreated,
            nonFuelPoiReview: lifecycle.nonFuelPoiReviewCreated,
            total: totalNewPending,
          },
          duplicateCandidatesMarked: lifecycle.duplicateCandidatesMarked,
          estimatedNetChange: netChange,
          nearbyThresholds: { distanceMeters: NEARBY_DISTANCE_M, nameSimilarity: NEARBY_SIMILARITY },
        },
        perClassification: {
          secure_chain: classCounts.secure_chain,
          local_chain: classCounts.local_chain,
          special_type: classCounts.specialty_fuel_site,
          specialty_fuel_site: classCounts.specialty_fuel_site,
          non_fuel_poi: classCounts.non_fuel_poi,
          marine_service: classCounts.marine_fuel,
          retail_operator: classCounts.retail_fuel_operator,
          generic_name: classCounts.generic_name,
          possible_foreign: classCounts.possible_foreign,
          automatic_fuel_station: classCounts.automatic_fuel_station,
          chain_unconfirmed: classCounts.unclassified,
          possible_duplicate: duplicatePairs.length,
        },
        featureFlags: { ENABLE_DUPLICATE_DETECTION, ENABLE_NEARBY_CHAIN_MATCH },
      },
      details: {
        possible_foreign: details.possible_foreign,
        generic_name: details.generic_name.slice(0, 20),
        specialty_fuel: details.specialty_fuel.slice(0, 20),
        non_fuel_poi: details.non_fuel_poi.slice(0, 20),
        possible_duplicate: duplicatePairs.slice(0, 20),
        auto_resolved_sample: details.auto_resolved_sample.slice(0, 20),
      },
    });
  } catch (error) {
    console.log(`[timing] TOTAL (error): ${Date.now() - totalStart}ms`);
    return Response.json({ error: error.message }, { status: 500 });
  }
});