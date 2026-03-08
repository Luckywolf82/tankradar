import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// ─── SYNC MED classifyStationsRuleEngine / identifyStationReviewProblems ───────
// Disse reglene er identisk synkronisert med de to andre regelmotor-filene.
// Ved endring skal ALLE tre oppdateres.

// EKSKLUDERTE (special_types + retail + generiske) — skal aldri auto-bekreftes
const EXCLUDED_FROM_CHAIN = [
  /^lpg\b/i, /\blpg\b/i, /\bauto-gass\b/i, /\bautogass\b/i,
  /^cng\b/i, /\bcng\b/i,
  /\bhynion\b/i, /\bhydrogen\b/i,
  /\bbiogass\b/i, /\bbiogas\b/i,
  /\btruck.?diesel\b/i, /\btruckdiesel/i,
  /^tank$/i, /^tanken$/i,
  /^bensin$/i, /^bensinstasjon$/i, /^bensinstasjonen$/i,
  /^drivstoff$/i, /^pumpe$/i, /^pumpen$/i,
  /^stasjon$/i, /^stasjonen$/i,
  /^independent$/i, /^max$/i, /^smia$/i, /^fitjar$/i,
  /^lokal$/i, /^nærservice$/i,
  /\bmarina\b/i, /\bbrygge\b/i, /\bbåthavn\b/i, /\bsmåbåthavn\b/i,
  /\bgjestehamn\b/i, /\bgjesthavn\b/i,
  /\bcamping\b/i,
  /\bcoop\b/i, /^spar\b/i, /^joker\b/i, /^bunnpris\b/i,
  /\bnærbutikk/i, /\bmatkroken\b/i, /\bhandlar/i,
  /\brema 1000\b/i, /\brema1000\b/i,
  /^kiwi\b/i, /^meny\b/i, /^extra\b/i,
  /\bk-market\b/i, /\bk market\b/i,
];

// TIER A: Nasjonale kjeder (SECURE_CHAINS) — auto-confirm
const AUTO_CONFIRM_CHAINS = [
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
  // Lokale kjeder med høy sikkerhet
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

// TIER B: Tvetydige mønstre — forslag, ikke auto-confirm
const SUGGESTED_CHAINS = [
  { chain: 'YX',   patterns: [/^yx$/i] },
  { chain: 'Best', patterns: [/^best$/i] },
  { chain: 'Driv', patterns: [/^driv$/i] },
  { chain: 'SEO',  patterns: [/^seo$/i] },
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

const normMatch = (s) => norm(s).replace(/æ/g, 'ae').replace(/ø/g, 'oe').replace(/å/g, 'aa');

const matchesPattern = (name, patterns) => {
  const nOrig = norm(name);
  const n = normMatch(name);
  return patterns.some(p => {
    if (typeof p === 'string') {
      return nOrig.includes(p.toLowerCase()) || n.includes(normMatch(p));
    }
    if (p instanceof RegExp) return p.test(nOrig) || p.test(n);
    return false;
  });
};

const isExcluded = (name) => {
  const n = norm(name);
  return EXCLUDED_FROM_CHAIN.some(p => p.test(n));
};

const matchAutoConfirm = (name) => {
  for (const { chain, patterns } of AUTO_CONFIRM_CHAINS) {
    if (matchesPattern(name, patterns)) return chain;
  }
  return null;
};

const matchSuggested = (name) => {
  const n = norm(name);
  for (const { chain, patterns } of SUGGESTED_CHAINS) {
    for (const p of patterns) {
      if (typeof p === 'string' && n === p) return chain;
      if (p instanceof RegExp && p.test(n)) return chain;
    }
  }
  return null;
};

const classifyReview = (name) => {
  if (isExcluded(name)) {
    return { tier: 'excluded', chain: null, reason: 'Navn er eksplisitt ekskludert fra chain-auto-confirm' };
  }
  const autoChain = matchAutoConfirm(name);
  if (autoChain) {
    return { tier: 'auto_confirmed_chain', chain: autoChain, reason: `Navn matcher sikkert mønster for "${autoChain}"` };
  }
  const suggestedChain = matchSuggested(name);
  if (suggestedChain) {
    return { tier: 'chain_suggested', chain: suggestedChain, reason: `Navn antyder mulig "${suggestedChain}", men er ikke entydig` };
  }
  return { tier: 'not_a_chain_candidate', chain: null, reason: 'Ingen regel matchet — krever manuell review' };
};

// ─── HANDLER ──────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const reviews = await base44.asServiceRole.entities.StationReview.filter({
      review_type: 'chain_unconfirmed',
      status: 'pending'
    });

    const results = { autoConfirmed: [], chainSuggested: [], excluded: [], notAChainCandidate: [], errors: [] };

    for (const review of reviews) {
      try {
        const { tier, chain, reason } = classifyReview(review.station_name);

        if (tier === 'auto_confirmed_chain') {
          await base44.asServiceRole.entities.StationReview.update(review.id, {
            status: 'approved',
            station_chain: chain,
            notes: `Auto-bekreftet (Tier A): "${review.station_name}" → "${chain}"`
          });
          if (review.stationId) {
            await base44.asServiceRole.entities.Station.update(review.stationId, { chain });
          }
          results.autoConfirmed.push({ id: review.id, stationId: review.stationId, name: review.station_name, chain, reason });

        } else if (tier === 'chain_suggested') {
          await base44.asServiceRole.entities.StationReview.update(review.id, {
            notes: `Chain-forslag (Tier B): "${chain}" — krever manuell bekreftelse. ${reason}`
          });
          results.chainSuggested.push({ id: review.id, stationId: review.stationId, name: review.station_name, suggestedChain: chain, reason });

        } else if (tier === 'excluded') {
          results.excluded.push({ id: review.id, name: review.station_name, reason });
        } else {
          results.notAChainCandidate.push({ id: review.id, name: review.station_name, reason });
        }
      } catch (error) {
        results.errors.push({ reviewId: review.id, error: error.message });
      }
      await new Promise(r => setTimeout(r, 25));
    }

    return Response.json({
      success: true,
      summary: {
        totalReviewed: reviews.length,
        autoConfirmed: results.autoConfirmed.length,
        chainSuggested: results.chainSuggested.length,
        excluded: results.excluded.length,
        manualReviewNeeded: results.notAChainCandidate.length,
        errors: results.errors.length,
        rules: {
          autoConfirmPatterns: AUTO_CONFIRM_CHAINS.map(c => c.chain),
          excludedNote: 'LPG, CNG, Tankautomat, Tank, Tanken, marine, dagligvare, retail'
        }
      },
      details: {
        autoConfirmed: results.autoConfirmed,
        chainSuggested: results.chainSuggested,
        excluded: results.excluded.slice(0, 20),
        notAChainCandidate: results.notAChainCandidate.slice(0, 20),
        errors: results.errors
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});