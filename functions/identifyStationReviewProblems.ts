import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// ─── INLINE REGELMOTOR (identisk logikk som classifyStationsRuleEngine) ───────
// Disse listene MÅ holdes synkronisert med classifyStationsRuleEngine.

const SECURE_CHAINS = [
  { chain: 'Circle K',   patterns: ['circle k', 'circlek'] },
  { chain: 'Uno-X',      patterns: ['uno-x', 'unox', 'uno x'] },
  { chain: 'Esso',       patterns: ['esso'] },
  { chain: 'St1',        patterns: ['st1', 'st 1'] },
  { chain: 'YX',         patterns: [/^yx\b/i, /\byx \b/i] },
  { chain: 'Best',       patterns: [/^best\b/i] },
  { chain: 'Shell',      patterns: ['shell'] },
  { chain: 'Equinor',    patterns: ['equinor'] },
  { chain: 'Statoil',    patterns: ['statoil'] },
  { chain: 'Automat1',   patterns: ['automat1', 'automat 1'] },
  { chain: 'MH24',       patterns: ['mh24'] },
  { chain: 'Max Bensin', patterns: ['max bensin'] },
  { chain: 'Smart',      patterns: [/^smart\b/i] },
  { chain: 'Prio',       patterns: [/^prio\b/i] },
  { chain: 'Texaco',     patterns: ['texaco'] },
  { chain: 'BP',         patterns: [/^bp\b/i] },
];

const LOCAL_CHAINS = [
  { chain: 'Driv',              patterns: [/^driv\b/i] },
  { chain: 'Minol',             patterns: ['minol'] },
  { chain: 'Jæren Olje',        patterns: ['jæren olje', 'jæren oil', 'jaeren olje', 'jaeren oil', 'jæren energi'] },
  { chain: 'Agder Olje',        patterns: ['agder olje', 'agder oil'] },
  { chain: 'Knapphus Energi',   patterns: ['knapphus'] },
  { chain: 'Haltbakk Express',  patterns: ['haltbakk'] },
  { chain: 'Bunker Oil',        patterns: ['bunker oil', 'bunkeroil'] },
  { chain: 'Oljeleverandøren',  patterns: ['oljeleverand', 'oljeverand'] },
  { chain: 'SEO',               patterns: [/^seo\b/i] },
  { chain: 'Brandval Bensin',   patterns: ['brandval'] },
  { chain: 'Elstad Oljesenter', patterns: ['elstad'] },
  { chain: 'Trønder Oil',       patterns: ['trønder oil', 'tronder oil'] },
  { chain: 'Gasum',             patterns: [/^gasum\b/i] },
  { chain: 'Haugaland Olje',    patterns: ['haugaland olje', 'haugaland oil'] },
  { chain: 'Randøy Olje',       patterns: ['randøy olje', 'randoy olje'] },
  { chain: 'Finnøy Olje',       patterns: ['finnøy olje', 'finnoy olje'] },
  { chain: 'Buskerud Olje',     patterns: ['buskerud olje', 'buskerud oil'] },
  { chain: 'Bendiks Olje',      patterns: ['bendiks olje', 'bendiks oil'] },
];

const SPECIAL_TYPE_PATTERNS = [
  /^lpg\b/i, /\blpg\b/i,
  /^cng\b/i, /\bcng\b/i,
  /\bhynion\b/i, /\bhydrogen\b/i,
  /\bbiogass\b/i, /\bbiogas\b/i,
  /\btruck.?diesel\b/i, /\btruckdisel\b/i,
  /\bautogass\b/i, /\bauto-gass\b/i,
];

const TANKAUTOMAT_PATTERNS = ['tankautomat', 'tank automat', 'drivstoffautomat', 'bensinautomat'];

const MARINE_SERVICE_PATTERNS = [
  'marina', 'brygge', 'småbåthavn', 'småbåt', 'marin ',
  'gjestehamn', 'gjesthavn', 'camping', 'servicesenter',
  'båtforening', 'fiskehavn', 'havnekontor', 'båthavn', 'havneanlegg',
  'sjøfront', 'kanalen', 'fjordcamp',
];

const RETAIL_OPERATOR_PATTERNS = [
  /\bcoop\b/i, /^spar\b/i, /^joker\b/i, /^bunnpris\b/i,
  /\bnærbutikken\b/i, /\bmatkroken\b/i, /\bhandlar\b/i,
  /\brema 1000\b/i, /\brema1000\b/i, /^kiwi\b/i, /^meny\b/i, /^extra\b/i,
  /\bmatrkoken\b/i, // typo-variant
];

const GENERIC_LOCAL_PATTERNS = [
  /^tank$/i, /^tanken$/i, /^tanken\s/i, /^tank\s/i,
  /^bensin$/i, /^bensinstasjon$/i, /^independent$/i,
  /^smia$/i, /^fitjar$/i, /^drivstoff$/i, /^stasjonen$/i,
  /^pumpe$/i, /^pumpen$/i, /^max$/i, /^lokal$/i,
  /^nærservice$/i, /^bensinstasjonen$/i,
];

const FOREIGN_PATTERNS = [
  /\bpreem\b/i, /\bokq8\b/i, /\benonteki/i, /\bk-market\b/i, /\bk market\b/i,
  /\bst1 se\b/i, /\bq8\b/i, /\bteboil\b/i, /\bmacken\b/i, /\btännäs\b/i,
  /\bsälen\b/i, /åre\b/i, /klimpfjäll/i, /ljungdalen/i, /\bjokkmokk\b/i,
  /\bkilpisjärvi\b/i, /\brajamarket\b/i, /\btärna vilt\b/i, /\bboxfjäll\b/i,
  /\bsirbmá\b/i,
];

const norm = (s) => {
  if (!s) return '';
  return s.toLowerCase()
    .replace(/\s*\(.*?\)\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const matchesAny = (name, patterns) => {
  const n = norm(name);
  return patterns.some(p => {
    if (typeof p === 'string') return n.includes(p.toLowerCase());
    if (p instanceof RegExp) return p.test(n);
    return false;
  });
};

// Klassifiserer en stasjon — returnerer classification
const classifyStation = (stationName) => {
  const n = norm(stationName);

  if (FOREIGN_PATTERNS.some(p => p.test(n))) return 'possible_foreign';

  for (const { patterns } of SECURE_CHAINS) {
    if (matchesAny(n, patterns)) return 'secure_chain';
  }
  for (const { patterns } of LOCAL_CHAINS) {
    if (matchesAny(n, patterns)) return 'local_chain';
  }

  if (SPECIAL_TYPE_PATTERNS.some(p => p instanceof RegExp ? p.test(n) : n.includes(p))) return 'special_type';
  if (TANKAUTOMAT_PATTERNS.some(p => n.includes(p))) return 'automatic_fuel_station';
  if (MARINE_SERVICE_PATTERNS.some(p => n.includes(p.toLowerCase()))) return 'marine_service';
  if (RETAIL_OPERATOR_PATTERNS.some(p => p instanceof RegExp ? p.test(n) : n.includes(p))) return 'retail_operator';
  if (GENERIC_LOCAL_PATTERNS.some(p => p.test(n))) return 'generic_name';

  return 'unclassified';
};

// Stasjoner som IKKE trenger chain_unconfirmed review
const SKIP_CHAIN_REVIEW = new Set([
  'possible_foreign', 'secure_chain', 'local_chain',
  'special_type', 'automatic_fuel_station', 'marine_service',
  'retail_operator', 'generic_name',
]);

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
      special_type_created: 0,
      skipped_already_classified: 0,
      skipped_existing_review: 0,
      wrong_type_fixed: 0,
      total_created: 0,
      timestamp: new Date().toISOString(),
    };

    // Hent alle stasjoner
    let allStations = [];
    let page = 0;
    while (true) {
      const batch = await base44.asServiceRole.entities.Station.list('-created_date', 500, page * 500);
      if (!batch || batch.length === 0) break;
      allStations = allStations.concat(batch);
      if (batch.length < 500) break;
      page++;
    }

    // Hent eksisterende reviews
    const existingReviews = await base44.asServiceRole.entities.StationReview.list();
    // Map: stationId → liste over reviews
    const reviewsByStation = {};
    for (const r of existingReviews) {
      if (!reviewsByStation[r.stationId]) reviewsByStation[r.stationId] = [];
      reviewsByStation[r.stationId].push(r);
    }

    const toCreate = [];
    const toFix = []; // { id, update } for feilklassifiserte eksisterende reviews

    for (const station of allStations) {
      if (station.sourceName === 'GooglePlaces') continue;

      const classification = classifyStation(station.name);
      const existingForStation = reviewsByStation[station.id] || [];

      // ── Fix eksisterende chain_unconfirmed reviews som burde vært noe annet ──
      for (const rev of existingForStation) {
        if (rev.status !== 'pending') continue;
        if (rev.review_type !== 'chain_unconfirmed') continue;

        if (classification === 'possible_foreign') {
          toFix.push({ id: rev.id, update: { review_type: 'possible_foreign_station', reviewReason: 'possible_foreign_station' } });
          results.wrong_type_fixed++;
        } else if (classification === 'generic_name') {
          toFix.push({ id: rev.id, update: { review_type: 'generic_name_review', reviewReason: 'generic_name' } });
          results.wrong_type_fixed++;
        } else if (SKIP_CHAIN_REVIEW.has(classification) && classification !== 'unclassified') {
          // Disse trenger ikke chain_unconfirmed review — sett til approved automatisk
          toFix.push({ id: rev.id, update: { status: 'approved', notes: `Auto-klassifisert som ${classification} av regelmotor. Ikke behov for manuell chain-review.` } });
          results.wrong_type_fixed++;
        }
      }

      // ── Opprett nye reviews kun for stasjoner som faktisk trenger det ──
      const hasExistingPending = existingForStation.some(r => r.status === 'pending');

      if (SKIP_CHAIN_REVIEW.has(classification)) {
        // Disse klassifiseringene trenger ikke chain_unconfirmed review
        if (classification === 'possible_foreign' && !existingForStation.some(r => r.review_type === 'possible_foreign_station' && r.status === 'pending')) {
          toCreate.push({
            stationId: station.id,
            review_type: 'possible_foreign_station',
            station_name: station.name,
            station_chain: station.chain || null,
            station_latitude: station.latitude,
            station_longitude: station.longitude,
            status: 'pending',
            issue_description: `Mulig utenlandsk stasjon: "${station.name}"`,
            suggested_action: 'Verifiser om dette er en norsk stasjon, eller marker som avvist',
            reviewReason: 'possible_foreign_station',
            source_report: 'rule_engine_classify',
          });
          results.possible_foreign_created++;
          results.total_created++;
        } else if (classification === 'generic_name' && !existingForStation.some(r => r.review_type === 'generic_name_review' && r.status === 'pending')) {
          toCreate.push({
            stationId: station.id,
            review_type: 'generic_name_review',
            station_name: station.name,
            station_chain: station.chain || null,
            station_latitude: station.latitude,
            station_longitude: station.longitude,
            status: 'pending',
            issue_description: `Generisk stasjonsnavn: "${station.name}"`,
            suggested_action: 'Finn spesifikt navn eller merge med annen stasjon',
            reviewReason: 'generic_name',
            source_report: 'rule_engine_classify',
          });
          results.generic_names_created++;
          results.total_created++;
        } else {
          results.skipped_already_classified++;
        }
      } else {
        // unclassified → chain_unconfirmed
        if (!station.chain && !existingForStation.some(r => r.review_type === 'chain_unconfirmed' && r.status === 'pending')) {
          toCreate.push({
            stationId: station.id,
            review_type: 'chain_unconfirmed',
            station_name: station.name,
            station_chain: null,
            station_latitude: station.latitude,
            station_longitude: station.longitude,
            status: 'pending',
            issue_description: `Kjede er ikke bekreftet: "${station.name}" på ${station.address || 'ukjent adresse'}`,
            suggested_action: 'Verifiser kjede basert på navn og lokalisering',
            source_report: 'rule_engine_classify',
          });
          results.chain_unconfirmed_created++;
          results.total_created++;
        } else {
          results.skipped_existing_review++;
        }
      }
    }

    // Fiks eksisterende feilklassifiserte reviews
    for (const { id, update } of toFix) {
      try {
        await base44.asServiceRole.entities.StationReview.update(id, update);
      } catch (e) { /* ignorer enkeltfeil */ }
      await new Promise(r => setTimeout(r, 25));
    }

    // Opprett nye reviews i batches
    const BATCH_SIZE = 25;
    for (let i = 0; i < toCreate.length; i += BATCH_SIZE) {
      const batch = toCreate.slice(i, i + BATCH_SIZE);
      try {
        await base44.asServiceRole.entities.StationReview.bulkCreate(batch);
      } catch (err) {
        console.error(`Batch insert failed:`, err.message);
      }
      await new Promise(r => setTimeout(r, 100));
    }

    console.log(`[identifyStationReviewProblems] Opprettet: ${results.total_created} | Fikset: ${results.wrong_type_fixed} | Hoppet over (klassifisert): ${results.skipped_already_classified}`);

    return Response.json({ success: true, ...results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});