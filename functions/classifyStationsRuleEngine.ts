import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// ─── SHARED RULE ENGINE CONFIG ────────────────────────────────────────────────
// KILDE FOR SANNHET: Disse reglene MÅ holdes identisk synkronisert med
// identifyStationReviewProblems. Prioritetsrekkefølge: H→A→C→B→D→E→F→G→uklassifisert

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

// A. Sikre nasjonale kjeder → secure_chain (auto_confirmed)
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

// C. Spesialtyper (LPG/CNG/hydrogen/biogas) — evalueres FØR local_chains
// for å forhindre at f.eks. "Autogass AS" feilklassifiseres som lokal chain
const SPECIAL_TYPES = [
  { stationType: 'lpg',          patterns: [/^lpg\b/i, /\blpg\b/i, /\bauto-gass\b/i, /\bautogass\b/i] },
  { stationType: 'cng',          patterns: [/^cng\b/i, /\bcng\b/i] },
  { stationType: 'cng',          patterns: ['hynion', 'hydrogen'] },
  { stationType: 'truck_diesel', patterns: ['truck diesel', 'truckdiesel', 'truck-diesel', 'lastebil diesel'] },
  { stationType: 'biogas',       patterns: ['biogass', 'biogas'] },
];

// B. Regionale/lokale kjeder — etter special_types
// NB: ^tank, ^tanken, \bbensin\b, \bdrivstoff\b er FJERNET herfra
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

// F. Retail/dagligvare-operatør
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

// G. Generiske lokale navn → generic_name_review (manuell gjennomgang)
// NB: ^tank og ^tanken ER her nå (fjernet fra LOCAL_CHAINS)
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

// Normalisering for lagring (ikke for matching)
const norm = (s) => {
  if (!s) return '';
  return s
    .toLowerCase()
    .replace(/^["']+|["']+$/g, '')       // fjern ledende/etterfølgende anførselstegn
    .replace(/\s*\(.*?\)\s*/g, ' ')      // fjern (...) suffikser
    .replace(/[-–—]+/g, '-')             // normaliser dash
    .replace(/\s+/g, ' ')               // normaliser mellomrom
    .trim();
};

// Normalisering for matching (æøå → ascii)
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

// Trekk ut areaLabel fra stasjonsnavn etter kjent prefix
const extractAreaFromName = (stationName, prefixes) => {
  const n = norm(stationName);
  for (const prefix of prefixes) {
    const p = norm(prefix);
    if (n.startsWith(p)) {
      const rest = stationName.replace(new RegExp('^' + prefix, 'i'), '').trim();
      if (rest.length > 1 && rest.length < 40) return rest;
    }
  }
  return null;
};

// Haversine-avstand i meter
const haversineMeters = (lat1, lon1, lat2, lon2) => {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

// Enkel name-similarity (Jaccard på bigrams)
const nameSimilarity = (a, b) => {
  const bigrams = (s) => {
    const set = new Set();
    for (let i = 0; i < s.length - 1; i++) set.add(s.slice(i, i + 2));
    return set;
  };
  const na = normMatch(a);
  const nb = normMatch(b);
  if (na === nb) return 1.0;
  const ba = bigrams(na);
  const bb = bigrams(nb);
  let intersection = 0;
  for (const g of ba) { if (bb.has(g)) intersection++; }
  const union = ba.size + bb.size - intersection;
  return union === 0 ? 0 : intersection / union;
};

// ─── KLASSIFISERING ────────────────────────────────────────────────────────────

const classifyStation = (stationName) => {
  const n = norm(stationName);

  // H. Utenlandsk — høyeste prioritet
  if (FOREIGN_PATTERNS.some(p => p.test(n) || p.test(normMatch(stationName)))) {
    return {
      classification: 'possible_foreign',
      chain: null, operator: null, stationType: 'unknown', areaLabel: null,
      reviewReason: 'possible_foreign_station',
      note: `Utenlandsk stasjon: "${stationName}"`,
    };
  }

  // A. Sikre nasjonale kjeder
  for (const { chain, patterns } of SECURE_CHAINS) {
    if (matchesAny(stationName, patterns)) {
      return {
        classification: 'secure_chain',
        chain, operator: null, stationType: 'standard', areaLabel: null,
        reviewReason: 'auto_classified',
        note: `Nasjonal kjede: "${stationName}" → "${chain}"`,
      };
    }
  }

  // C. Spesialtyper (før local chains)
  for (const { stationType, patterns } of SPECIAL_TYPES) {
    if (matchesAny(stationName, patterns)) {
      return {
        classification: 'special_type',
        chain: null, operator: null, stationType, areaLabel: null,
        reviewReason: 'special_type_detected',
        note: `Spesialtype: "${stationName}" → stationType="${stationType}"`,
      };
    }
  }

  // B. Lokale/regionale kjeder
  for (const { chain, patterns } of LOCAL_CHAINS) {
    if (matchesAny(stationName, patterns)) {
      return {
        classification: 'local_chain',
        chain, operator: null, stationType: 'standard', areaLabel: null,
        reviewReason: 'local_chain_detected',
        note: `Lokal kjede: "${stationName}" → "${chain}"`,
      };
    }
  }

  // D. Tankautomat
  if (TANKAUTOMAT_PATTERNS.some(p => n.includes(p))) {
    return {
      classification: 'automatic_fuel_station',
      chain: null, operator: null, stationType: 'standard', areaLabel: null,
      reviewReason: 'auto_classified',
      note: `Tankautomat: "${stationName}"`,
    };
  }

  // E. Marine/service
  if (MARINE_SERVICE_PATTERNS.some(p => n.includes(p.toLowerCase()))) {
    return {
      classification: 'marine_service',
      chain: null, operator: null, stationType: 'marine_fuel', areaLabel: null,
      reviewReason: 'special_type_detected',
      note: `Marin/service: "${stationName}"`,
    };
  }

  // F. Retail/operatør
  for (const { operator, patterns } of RETAIL_OPERATORS) {
    if (matchesAny(stationName, patterns)) {
      return {
        classification: 'retail_operator',
        chain: null, operator, stationType: 'retail_fuel', areaLabel: null,
        reviewReason: 'retail_operator_detected',
        note: `Retail: "${stationName}" → operator="${operator}"`,
      };
    }
  }

  // G. Generiske lokale navn
  if (GENERIC_LOCAL_PATTERNS.some(p => p.test(n))) {
    const areaLabel = extractAreaFromName(stationName, ['Tanken ', 'Tank ', 'Bensin ']);
    return {
      classification: 'generic_name',
      chain: null, operator: null, stationType: 'unknown',
      areaLabel: areaLabel || null,
      reviewReason: 'generic_name',
      note: `Generisk navn: "${stationName}"${areaLabel ? ` — foreslått areaLabel: "${areaLabel}"` : ''}`,
    };
  }

  // Uklassifisert
  return {
    classification: 'unclassified',
    chain: null, operator: null, stationType: null, areaLabel: null,
    reviewReason: 'chain_unconfirmed',
    note: `Ingen regel matchet: "${stationName}"`,
  };
};

// ─── HANDLER ──────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const isScheduled = req.headers.get('x-automation-source') === 'scheduled';

    if (!isScheduled) {
      const user = await base44.auth.me();
      if (user?.role !== 'admin') {
        return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
      }
    }

    const body = await req.json().catch(() => ({}));
    const batchSize = body.batchSize || 200;

    // Hent alle stasjoner
    let allStations = [];
    let page = 0;
    const pageSize = 500;
    while (true) {
      const batch = await base44.asServiceRole.entities.Station.list('-created_date', pageSize, page * pageSize);
      if (!batch || batch.length === 0) break;
      allStations = allStations.concat(batch);
      if (batch.length < pageSize) break;
      page++;
    }

    // ── Proximity duplicate detection (< 50m, identisk normalisert navn) ──
    const possibleDuplicates = [];
    const duplicateFlaggedIds = new Set();
    for (let i = 0; i < allStations.length; i++) {
      const a = allStations[i];
      if (!a.latitude || !a.longitude) continue;
      for (let j = i + 1; j < allStations.length; j++) {
        const b = allStations[j];
        if (!b.latitude || !b.longitude) continue;
        const dist = haversineMeters(a.latitude, a.longitude, b.latitude, b.longitude);
        if (dist < 50 && norm(a.name) === norm(b.name)) {
          duplicateFlaggedIds.add(b.id);
          possibleDuplicates.push({
            a: { id: a.id, name: a.name },
            b: { id: b.id, name: b.name },
            distanceMeters: Math.round(dist),
          });
        }
      }
    }

    const counts = {
      secure_chain: 0, local_chain: 0, special_type: 0,
      marine_service: 0, retail_operator: 0, generic_name: 0,
      possible_foreign: 0, automatic_fuel_station: 0,
      possible_duplicate: duplicateFlaggedIds.size,
      unclassified: 0,
    };

    const details = {
      secure_chain: [], local_chain: [], special_type: [],
      marine_service: [], retail_operator: [], generic_name: [],
      possible_foreign: [], automatic_fuel_station: [],
      possible_duplicate: possibleDuplicates,
      unclassified: [],
    };

    const stationUpdates = [];

    for (const station of allStations) {
      const result = classifyStation(station.name);
      const key = result.classification === 'unclassified' ? 'unclassified' : result.classification;
      counts[key] = (counts[key] || 0) + 1;
      if (details[key]) {
        details[key].push({ id: station.id, name: station.name, chain: result.chain, operator: result.operator, stationType: result.stationType, note: result.note });
      }

      const update = {};
      // Sett chain hvis regelmotor har en navngitt verdi
      if (result.chain) update.chain = result.chain;
      if (result.operator && !station.operator) update.operator = result.operator;
      if (result.stationType && result.stationType !== 'unknown' && result.stationType !== null && !station.stationType) {
        update.stationType = result.stationType;
      }
      if (result.areaLabel && !station.areaLabel) update.areaLabel = result.areaLabel;

      if (Object.keys(update).length > 0) {
        stationUpdates.push({ id: station.id, update });
      }
    }

    // Skriv oppdateringer
    const updateBatch = stationUpdates.slice(0, batchSize);
    const remaining = stationUpdates.length - updateBatch.length;

    let updatedCount = 0;
    let updateErrors = 0;
    for (const { id, update } of updateBatch) {
      try {
        await base44.asServiceRole.entities.Station.update(id, update);
        updatedCount++;
      } catch (e) { updateErrors++; }
      await new Promise(r => setTimeout(r, 30));
    }

    // ── nearby_same_chain_auto_resolve ──────────────────────────────────────
    // Regler: innen 80m + samme chain + name similarity >= 0.88
    // Ikke bruk på: foreign, marine, special_type, generic_name, chain=unknown
    const NEARBY_DISTANCE_M = 80;
    const NEARBY_SIMILARITY_THRESHOLD = 0.88;
    const SKIP_NEARBY = new Set(['possible_foreign', 'marine_service', 'special_type', 'generic_name']);

    const pendingReviews = await base44.asServiceRole.entities.StationReview.filter({ status: 'pending' });
    const stationMap = Object.fromEntries(allStations.map(s => [s.id, s]));

    let nearbyAutoResolved = 0;
    let nearbyDuplicateCandidates = 0;
    let reviewsUpdated = 0;

    for (const review of pendingReviews) {
      const reviewStation = stationMap[review.stationId];
      if (!reviewStation) continue;

      const result = classifyStation(reviewStation.name);

      // Synkroniser reviewReason og review_type
      let newReviewType = review.review_type;
      if (result.classification === 'possible_foreign') newReviewType = 'possible_foreign_station';
      if (result.classification === 'generic_name') newReviewType = 'generic_name_review';
      if (result.classification === 'special_type' || result.classification === 'marine_service') newReviewType = 'generic_name_review';
      if (result.classification === 'unclassified') newReviewType = 'chain_unconfirmed';

      // nearby_same_chain_auto_resolve
      let nearbyResolved = false;
      if (
        !SKIP_NEARBY.has(result.classification) &&
        reviewStation.chain &&
        reviewStation.latitude && reviewStation.longitude
      ) {
        for (const candidate of allStations) {
          if (candidate.id === reviewStation.id) continue;
          if (!candidate.latitude || !candidate.longitude) continue;
          if (candidate.chain !== reviewStation.chain) continue;

          const dist = haversineMeters(
            reviewStation.latitude, reviewStation.longitude,
            candidate.latitude, candidate.longitude
          );
          if (dist > NEARBY_DISTANCE_M) continue;

          const sim = nameSimilarity(reviewStation.name, candidate.name);
          if (sim >= NEARBY_SIMILARITY_THRESHOLD) {
            // Trygg auto-resolve
            try {
              await base44.asServiceRole.entities.StationReview.update(review.id, {
                status: 'approved',
                reviewReason: 'auto_classified',
                notes: `Auto-resolved: nearby_same_chain (${Math.round(dist)}m, similarity ${sim.toFixed(2)}) mot stasjon "${candidate.name}"`,
              });
              nearbyAutoResolved++;
              nearbyResolved = true;
            } catch (e) { /* ignorer */ }
            break;
          }
        }
      }

      if (!nearbyResolved) {
        try {
          await base44.asServiceRole.entities.StationReview.update(review.id, {
            reviewReason: result.reviewReason,
            review_type: newReviewType,
            station_stationType: result.stationType || undefined,
            station_operator: result.operator || undefined,
          });
          reviewsUpdated++;
        } catch (e) { /* ignorer */ }
      }

      await new Promise(r => setTimeout(r, 20));
    }

    console.log(`[classifyRuleEngine] Stasjoner: ${allStations.length} | Oppdatert: ${updatedCount} | Gjenstår: ${remaining} | Duplikat-par: ${possibleDuplicates.length} | NearbyAutoResolved: ${nearbyAutoResolved}`);

    return Response.json({
      success: true,
      summary: {
        totalStations: allStations.length,
        stationUpdates: updatedCount,
        updateErrors,
        reviewsUpdated,
        possibleDuplicatePairs: possibleDuplicates.length,
        nearbyAutoResolved,
        nearbyDuplicateCandidates,
        nearbyThresholds: { distanceMeters: NEARBY_DISTANCE_M, nameSimilarity: NEARBY_SIMILARITY_THRESHOLD },
        perClassification: {
          secure_chain: counts.secure_chain,
          local_chain: counts.local_chain,
          special_type: counts.special_type,
          marine_service: counts.marine_service,
          retail_operator: counts.retail_operator,
          generic_name: counts.generic_name,
          possible_foreign: counts.possible_foreign,
          automatic_fuel_station: counts.automatic_fuel_station,
          possible_duplicate: counts.possible_duplicate,
          chain_unconfirmed: counts.unclassified,
        },
      },
      details: {
        secure_chain: details.secure_chain.slice(0, 20),
        local_chain: details.local_chain.slice(0, 20),
        special_type: details.special_type,
        marine_service: details.marine_service,
        retail_operator: details.retail_operator,
        generic_name: details.generic_name,
        possible_foreign: details.possible_foreign,
        automatic_fuel_station: details.automatic_fuel_station,
        possible_duplicate: details.possible_duplicate.slice(0, 30),
        unclassified_sample: details.unclassified.slice(0, 20),
      },
      remaining,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});