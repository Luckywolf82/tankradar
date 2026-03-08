import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// ─── SHARED RULE ENGINE CONFIG ────────────────────────────────────────────────
// KILDE FOR SANNHET: Disse reglene MÅ holdes identisk synkronisert med
// classifyStationsRuleEngine. Prioritetsrekkefølge: H→A→C→B→D→E→F→G→uklassifisert

// H. Utenlandske stasjoner — høyeste prioritet
const FOREIGN_PATTERNS = [
  /\bpreem\b/i,
  /\bokq8\b/i,
  /\benonteki/i,
  /\bk-market\b/i,
  /\bk market\b/i,
  /\bq8\b/i,
  /\bteboil\b/i,
  /\bmacken\b/i,
  /\btännäs\b/i,
  /\bsälen\b/i,
  /\båre\b/i,
  /\bljungdalen\b/i,
  /\bklimpfjäll\b/i,
  /\bjokkmokk\b/i,
  /\bkilpisjärvi\b/i,
  /\brajamarket\b/i,
  /\bsuomen\b/i,
  /\bfinnland\b/i,
  /\bsverige\b/i,
  /\btärna vilt\b/i,
  /\bboxfjäll\b/i,
  /\bsirbmá\b/i,
];

// A. Sikre nasjonale kjeder
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

// C. Spesialtyper (evalueres FØR local_chains)
const SPECIAL_TYPES = [
  { stationType: 'lpg',          patterns: [/^lpg\b/i, /\blpg\b/i, /\bauto-gass\b/i, /\bautogass\b/i] },
  { stationType: 'cng',          patterns: [/^cng\b/i, /\bcng\b/i] },
  { stationType: 'cng',          patterns: ['hynion', 'hydrogen'] },
  { stationType: 'truck_diesel', patterns: ['truck diesel', 'truckdiesel', 'truck-diesel', 'lastebil diesel'] },
  { stationType: 'biogas',       patterns: ['biogass', 'biogas'] },
];

// B. Lokale/regionale kjeder
// NB: ^tank, ^tanken, \bbensin\b, \bdrivstoff\b er FJERNET
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

// D. Tankautomat
const TANKAUTOMAT_PATTERNS = [
  'tankautomat', 'tank automat', 'drivstoffautomat', 'bensinautomat',
];

// E. Marine/service (servicesenter fjernet — for bredt)
const MARINE_SERVICE_PATTERNS = [
  'marina', 'brygge', 'småbåthavn', 'småbåt', 'marin ',
  'gjestehamn', 'gjesthavn',
  'båtforening', 'fiskehavn', 'båthavn', 'havneanlegg',
  'kai', 'sjøfront', 'kanalen', 'bryggetorget',
];

// F. Retail/operatør
const RETAIL_OPERATOR_PATTERNS = [
  /\bcoop\b/i, /\bcoop extra\b/i, /\bcoop prix\b/i,
  /^spar\b/i, /\bspar bensin/i,
  /^joker\b/i,
  /\bnærbutikken\b/i, /\bnærbutik\b/i,
  /\bmatkroken\b/i,
  /\bhandlar\b/i,
  /^bunnpris\b/i,
  /\brema 1000\b/i, /\brema1000\b/i,
  /^kiwi\b/i,
  /^meny\b/i,
  /^extra\b/i,
];

// G. Generiske lokale navn (^tank og ^tanken er her nå)
const GENERIC_LOCAL_PATTERNS = [
  /^independent$/i,
  /^smia$/i,
  /^fitjar$/i,
  /^stasjonen$/i,
  /^pumpe$/i,
  /^pumpen$/i,
  /^max$/i,
  /^lokal$/i,
  /^nærservice$/i,
  /^bensinstasjonen$/i,
  /^tank$/i,
  /^tanken$/i,
];

// ─── HJELPEFUNKSJONER ──────────────────────────────────────────────────────────

const norm = (s) => {
  if (!s) return '';
  return s
    .toLowerCase()
    .replace(/^["']+|["']+$/g, '')
    .replace(/\s*\(.*?\)\s*/g, ' ')
    .replace(/[-–—]+/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
};

const normMatch = (s) => {
  return norm(s)
    .replace(/æ/g, 'ae')
    .replace(/ø/g, 'oe')
    .replace(/å/g, 'aa');
};

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

const classifyStation = (stationName) => {
  const n = norm(stationName);
  const nm = normMatch(stationName);

  if (FOREIGN_PATTERNS.some(p => p.test(n) || p.test(nm))) return 'possible_foreign';

  for (const { patterns } of SECURE_CHAINS) {
    if (matchesAny(stationName, patterns)) return 'secure_chain';
  }

  // C. Special types — FØR local chains
  for (const { patterns } of SPECIAL_TYPES) {
    if (matchesAny(stationName, patterns)) return 'special_type';
  }

  for (const { patterns } of LOCAL_CHAINS) {
    if (matchesAny(stationName, patterns)) return 'local_chain';
  }

  if (TANKAUTOMAT_PATTERNS.some(p => n.includes(p))) return 'automatic_fuel_station';
  if (MARINE_SERVICE_PATTERNS.some(p => n.includes(p.toLowerCase()))) return 'marine_service';
  if (RETAIL_OPERATOR_PATTERNS.some(p => p instanceof RegExp ? p.test(n) : n.includes(p))) return 'retail_operator';
  if (GENERIC_LOCAL_PATTERNS.some(p => p.test(n))) return 'generic_name';

  return 'unclassified';
};

// Klassifikasjoner som ikke trenger chain_unconfirmed review
const SKIP_CHAIN_REVIEW = new Set([
  'possible_foreign', 'secure_chain', 'local_chain',
  'special_type', 'automatic_fuel_station', 'marine_service',
  'retail_operator', 'generic_name',
]);

// Klassifikasjoner som auto-approves ut av review (trenger ikke manuell behandling)
const AUTO_APPROVE_CLASSIFICATIONS = new Set([
  'secure_chain', 'local_chain', 'special_type',
  'automatic_fuel_station', 'marine_service', 'retail_operator',
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
      auto_approved: 0,
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

      // Fiks/sync eksisterende pending reviews
      for (const rev of existingForStation) {
        if (rev.status !== 'pending') continue;

        if (AUTO_APPROVE_CLASSIFICATIONS.has(classification)) {
          // Auto-approve — trenger ikke manuell review
          toFix.push({ id: rev.id, update: { status: 'approved', notes: `Auto-klassifisert som ${classification} av regelmotor.` } });
          results.auto_approved++;
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

      // Opprett nye reviews
      if (classification === 'possible_foreign') {
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
      } else if (classification === 'generic_name') {
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
      } else if (classification === 'unclassified' && !station.chain) {
        toCreate.push({
          stationId: station.id,
          review_type: 'chain_unconfirmed',
          station_name: station.name,
          station_chain: null,
          station_latitude: station.latitude,
          station_longitude: station.longitude,
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

    // Fiks eksisterende reviews
    for (const { id, update } of toFix) {
      try {
        await base44.asServiceRole.entities.StationReview.update(id, update);
      } catch (e) { /* ignorer enkeltfeil */ }
      await new Promise(r => setTimeout(r, 25));
    }

    // Opprett nye reviews
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

    console.log(`[identifyStationReviewProblems] Opprettet: ${results.total_created} | Auto-approved: ${results.auto_approved} | Fikset: ${results.wrong_type_fixed} | Hoppet over: ${results.skipped_already_classified}`);

    return Response.json({ success: true, ...results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});