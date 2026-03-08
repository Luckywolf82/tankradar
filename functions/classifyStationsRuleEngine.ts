import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// ─── RULE ENGINE KONFIGURASJON ────────────────────────────────────────────────

// A. Sikre nasjonale kjeder → auto_confirmed_chain
const SECURE_CHAINS = [
  { chain: 'Circle K',          patterns: ['circle k', 'circlek'] },
  { chain: 'Uno-X',             patterns: ['uno-x', 'unox', 'uno x'] },
  { chain: 'Esso',              patterns: ['esso'] },
  { chain: 'St1',               patterns: ['st1', 'st 1'] },
  { chain: 'YX',                patterns: ['yx '] },
  { chain: 'Best',              patterns: ['best '] },
  { chain: 'Shell',             patterns: ['shell'] },
  { chain: 'Equinor',           patterns: ['equinor'] },
  { chain: 'Statoil',           patterns: ['statoil'] },
  { chain: 'Automat1',          patterns: ['automat1', 'automat 1'] },
  { chain: 'MH24',              patterns: ['mh24'] },
  { chain: 'Max Bensin',        patterns: ['max bensin'] },
  { chain: 'Smart',             patterns: ['smart kongsvinger', 'smart '] },
];

// B. Regionale/lokale kjeder → auto_confirmed_chain (local tier)
const LOCAL_CHAINS = [
  { chain: 'Driv',              patterns: ['driv '] },
  { chain: 'Minol',             patterns: ['minol'] },
  { chain: 'Jæren Olje',        patterns: ['jæren olje', 'jæren oil', 'jaeren olje', 'jaeren oil'] },
  { chain: 'Agder Olje',        patterns: ['agder olje', 'agder oil'] },
  { chain: 'Knapphus Energi',   patterns: ['knapphus'] },
  { chain: 'Haltbakk Express',  patterns: ['haltbakk'] },
  { chain: 'Bunker Oil',        patterns: ['bunker oil', 'bunkeroil'] },
  { chain: 'Oljeleverandøren',  patterns: ['oljeleverand', 'oljeverand'] },
  { chain: 'SEO',               patterns: ['seo '] },
  { chain: 'Brandval Bensin',   patterns: ['brandval'] },
  { chain: 'Elstad Oljesenter', patterns: ['elstad'] },
  { chain: 'Trønder Oil',       patterns: ['trønder oil', 'tronder oil'] },
  { chain: 'Gasum',             patterns: ['gasum'] },
  { chain: 'Haugaland Olje',    patterns: ['haugaland olje', 'haugaland oil'] },
  { chain: 'Randøy Olje',       patterns: ['randøy olje', 'randoy olje'] },
  { chain: 'Finnøy Olje',       patterns: ['finnøy olje', 'finnoy olje'] },
  { chain: 'Buskerud Olje',     patterns: ['buskerud olje', 'buskerud oil'] },
];

// C. Spesialtyper (LPG/CNG/Hynion) → specialty_fuel_site
// MERK: Gasum er også kjede (lokal), men LPG/CNG-spesifikke sites klassifiseres her
const SPECIAL_TYPES = [
  { stationType: 'lpg',          patterns: [/^lpg\b/i, /\blpg\b/i] },
  { stationType: 'cng',          patterns: [/^cng\b/i, /\bcng\b/i] },
  { stationType: 'cng',          patterns: ['hynion'] }, // hydrogen/CNG
  { stationType: 'truck_diesel', patterns: ['truck diesel', 'truckdiesel', 'truck-diesel'] },
  { stationType: 'biogas',       patterns: ['biogass', 'biogas'] },
];

// D. Retail/operator → retail_fuel_operator
const RETAIL_OPERATORS = [
  { operator: 'Coop',         patterns: ['coop'] },
  { operator: 'Spar',         patterns: ['spar'] },
  { operator: 'Joker',        patterns: ['joker'] },
  { operator: 'Nærbutikken',  patterns: ['nærbutikken', 'nærbutik'] },
  { operator: 'Matkroken',    patterns: ['matkroken'] },
  { operator: "Handlar'n",    patterns: ['handlar'] },
];

// E. Marine/service fuel → marine_or_service_fuel_site
const MARINE_SERVICE_PATTERNS = [
  'marina', 'brygge', 'småbåthavn', 'småbåt', 'marin ',
  'gjestehamn', 'gjesthavn', 'camping', 'servicesenter', 'service senter',
  'båtforening', 'fiskehavn', 'havnekontor',
];

// F. Generiske lokale navn → generic_local_station_name (beholdes i review)
const GENERIC_LOCAL_PATTERNS = [
  /^tank\b/i,       // "Tank" eller "Tank Sted" → kan ha areaLabel fra rest av navn
  /^tanken\b/i,     // "Tanken" eller "Tanken Hjartdal"
  /^bensin$/i, /^bensinstasjon$/i,
  /^independent$/i,
  /^smia$/i, /^fitjar$/i,
  /^drivstoff$/i, /^stasjonen$/i, /^pumpe$/i,
];

// G. Mulige utenlandske poster → possible_foreign_station
const FOREIGN_PATTERNS = [
  /\bpreem\b/i,
  /\bokq8\b/i,
  /\bneste\s+enonteki/i,  // "Neste Enontekiö" (Finland)
  /\benonteki/i,
  /\bk-market\b/i, /\bk market\b/i,
  /\bst1 se\b/i,
  /\bq8\b/i,
  /\bteboil\b/i,
  /åre\b/i,             // Åre (Sverige)
  /sälen/i,             // Sälen (Sverige)
  /klimpfjäll/i,        // Sverige
  /ljungdalen/i,        // Sverige
  /\bjokkmokk\b/i,
];

// ─── HJELPEFUNKSJONER ──────────────────────────────────────────────────────────

const norm = (s) => (s || '').toLowerCase().trim();

const matchesAny = (name, patterns) => {
  const n = norm(name);
  return patterns.some(p => {
    if (typeof p === 'string') return n.includes(p);
    if (p instanceof RegExp) return p.test(n);
    return false;
  });
};

const matchStartsWith = (name, patterns) => {
  const n = norm(name);
  return patterns.some(p => n.startsWith(p.toLowerCase()));
};

// Trekker ut potensielt areaLabel fra rest av navn etter prefix
// f.eks. "Tanken Hjartdal" → areaLabel="Hjartdal"
const extractAreaFromName = (stationName, prefixes) => {
  const n = norm(stationName);
  for (const prefix of prefixes) {
    const p = norm(prefix);
    if (n.startsWith(p)) {
      const rest = stationName.slice(prefix.length).trim();
      if (rest.length > 1 && rest.length < 40) return rest;
    }
  }
  return null;
};

// Kjører regelmotoren på ett stasjonsnavn
// Returnerer: { classification, chain, operator, stationType, reviewReason, areaLabel, note }
const classifyStation = (stationName) => {
  const n = norm(stationName);

  // G. Mulig utenlandsk — høyeste prioritet
  if (FOREIGN_PATTERNS.some(p => p.test(n))) {
    return {
      classification: 'possible_foreign',
      chain: null,
      operator: null,
      stationType: 'unknown',
      areaLabel: null,
      reviewReason: 'possible_foreign_station',
      note: `Navn matcher mønster for utenlandsk stasjon: "${stationName}"`
    };
  }

  // A. Sikre nasjonale kjeder → auto_confirmed_chain
  for (const { chain, patterns } of SECURE_CHAINS) {
    if (matchesAny(n, patterns)) {
      return {
        classification: 'secure_chain',
        chain,
        operator: null,
        stationType: 'standard',
        areaLabel: null,
        reviewReason: 'auto_classified',
        note: `Sikker kjede auto-bekreftet: "${stationName}" → "${chain}"`
      };
    }
  }

  // B. Lokale/regionale kjeder → auto_confirmed_chain (local tier)
  for (const { chain, patterns } of LOCAL_CHAINS) {
    if (matchesAny(n, patterns)) {
      return {
        classification: 'local_chain',
        chain,
        operator: null,
        stationType: 'standard',
        areaLabel: null,
        reviewReason: 'local_chain_detected',
        note: `Lokal kjede auto-bekreftet: "${stationName}" → "${chain}"`
      };
    }
  }

  // C. Spesialtyper (LPG/CNG/Hynion) → specialty_fuel_site
  for (const { stationType, patterns } of SPECIAL_TYPES) {
    if (matchesAny(n, patterns)) {
      return {
        classification: 'special_type',
        chain: null,
        operator: null,
        stationType,
        areaLabel: null,
        reviewReason: 'special_type_detected',
        note: `Spesialtype (specialty_fuel_site) detektert: "${stationName}" → stationType="${stationType}"`
      };
    }
  }

  // E. Marine/service fuel → marine_or_service_fuel_site
  if (MARINE_SERVICE_PATTERNS.some(p => n.includes(p.toLowerCase()))) {
    return {
      classification: 'marine_service',
      chain: null,
      operator: null,
      stationType: 'marine_fuel',
      areaLabel: null,
      reviewReason: 'special_type_detected',
      note: `Marin/service-site detektert: "${stationName}"`
    };
  }

  // D. Retail/operator → retail_fuel_operator
  for (const { operator, patterns } of RETAIL_OPERATORS) {
    if (matchesAny(n, patterns)) {
      return {
        classification: 'retail_operator',
        chain: null,
        operator,
        stationType: 'retail_fuel',
        areaLabel: null,
        reviewReason: 'retail_operator_detected',
        note: `Retail-operatør detektert: "${stationName}" → operator="${operator}"`
      };
    }
  }

  // F. Generiske lokale navn → generic_local_station_name (review med areaLabel-forslag)
  if (GENERIC_LOCAL_PATTERNS.some(p => p.test(n))) {
    const areaLabel = extractAreaFromName(stationName, ['Tanken ', 'Tank ']);
    return {
      classification: 'generic_name',
      chain: null,
      operator: null,
      stationType: 'unknown',
      areaLabel: areaLabel || null,
      reviewReason: 'generic_name',
      note: `Generisk lokalt navn flagget til review: "${stationName}"${areaLabel ? ` — foreslått areaLabel: "${areaLabel}"` : ''}`
    };
  }

  // Uklassifisert → chain_unconfirmed
  return {
    classification: 'unclassified',
    chain: null,
    operator: null,
    stationType: null,
    areaLabel: null,
    reviewReason: 'chain_unconfirmed',
    note: `Ingen regel matchet: "${stationName}"`
  };
};

// ─── HANDLER ──────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Hent alle stations
    const stations = await base44.asServiceRole.entities.Station.list();

    const counts = {
      secure_chain: 0,
      local_chain: 0,
      special_type: 0,
      marine_service: 0,
      retail_operator: 0,
      generic_name: 0,
      possible_foreign: 0,
      unclassified: 0,
    };

    const details = {
      secure_chain: [],
      local_chain: [],
      special_type: [],
      marine_service: [],
      retail_operator: [],
      generic_name: [],
      possible_foreign: [],
      unclassified: [],
    };

    const stationUpdates = [];

    for (const station of stations) {
      const result = classifyStation(station.name);
      counts[result.classification]++;
      details[result.classification].push({
        id: station.id,
        name: station.name,
        chain: result.chain,
        operator: result.operator,
        stationType: result.stationType,
        note: result.note,
      });

      // Bygg oppdatering basert på klassifisering
      const update = {};

      if (result.chain && !station.chain) {
        update.chain = result.chain;
      }
      if (result.operator && !station.operator) {
        update.operator = result.operator;
      }
      if (result.stationType && result.stationType !== 'unknown' && result.stationType !== null && !station.stationType) {
        update.stationType = result.stationType;
      }
      if (result.areaLabel && !station.areaLabel) {
        update.areaLabel = result.areaLabel;
      }

      if (Object.keys(update).length > 0) {
        stationUpdates.push({ id: station.id, update });
      }
    }

    // Utfør oppdateringer med liten pause for å unngå rate-limiting
    let updatedCount = 0;
    let updateErrors = 0;
    for (const { id, update } of stationUpdates) {
      try {
        await base44.asServiceRole.entities.Station.update(id, update);
        updatedCount++;
      } catch (e) {
        updateErrors++;
      }
      // Liten forsinkelse
      await new Promise(r => setTimeout(r, 30));
    }

    // Oppdater tilhørende StationReview-records med reviewReason
    const pendingReviews = await base44.asServiceRole.entities.StationReview.filter({ status: 'pending' });
    const stationMap = Object.fromEntries(stations.map(s => [s.id, s]));

    let reviewsUpdated = 0;
    for (const review of pendingReviews) {
      const station = stationMap[review.stationId];
      if (!station) continue;
      const result = classifyStation(station.name);

      // Oppdater review_type og reviewReason basert på ny klassifisering
      let newReviewType = review.review_type;
      if (result.classification === 'possible_foreign') newReviewType = 'possible_foreign_station';
      if (result.classification === 'generic_name') newReviewType = 'generic_name_review';
      if (result.classification === 'special_type' || result.classification === 'marine_service') newReviewType = 'generic_name_review';
      if (result.classification === 'unclassified') newReviewType = 'chain_unconfirmed';

      try {
        await base44.asServiceRole.entities.StationReview.update(review.id, {
          reviewReason: result.reviewReason,
          review_type: newReviewType,
          station_stationType: result.stationType || undefined,
          station_operator: result.operator || undefined,
        });
        reviewsUpdated++;
      } catch (e) {
        // ignorer enkeltfeil
      }
      await new Promise(r => setTimeout(r, 20));
    }

    return Response.json({
      success: true,
      summary: {
        totalStations: stations.length,
        stationUpdates: updatedCount,
        updateErrors,
        reviewsUpdated,
        perClassification: {
          secure_chain: counts.secure_chain,
          local_chain: counts.local_chain,
          special_type: counts.special_type,
          retail_operator: counts.retail_operator,
          generic_name: counts.generic_name,
          possible_foreign: counts.possible_foreign,
          chain_unconfirmed: counts.unclassified,
        }
      },
      details: {
        secure_chain: details.secure_chain.slice(0, 20),
        local_chain: details.local_chain.slice(0, 20),
        special_type: details.special_type,
        retail_operator: details.retail_operator,
        generic_name: details.generic_name,
        possible_foreign: details.possible_foreign,
        unclassified_sample: details.unclassified.slice(0, 10),
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});