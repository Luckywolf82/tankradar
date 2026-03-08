import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// ─── EKSPLISITT EKSKLUSJONSLISTE ──────────────────────────────────────────────
// Disse navnene skal ALDRI auto-bekreftes som chain, og skal ikke engang foreslås.
// De flagges til manuell review.
const EXCLUDED_FROM_CHAIN = [
  /^lpg\b/i,
  /^cng\b/i,
  /\blpg\b/i,
  /\bcng\b/i,
  /^tank$/i,
  /^tanken$/i,
  /^truck.?diesel/i,
  /^truckdiesel/i,
  /\bmarina\b/i,
  /\bbrygge\b/i,
  /\bcamping\b/i,
  /\bbåthavn\b/i,
  /\bsmåbåthavn\b/i,
  /^bensin$/i,
  /^bensinstasjon$/i,
  /^drivstoff$/i,
  /^pumpe$/i,
  /^stasjon$/i,
  /^stasjonen$/i,
  /^independent$/i,
  /^max$/i,
  /^smia$/i,
  /\bspar\b/i,
  /\bcoop\b/i,
  /\bjoker\b/i,
  /\bnærbutikk/i,
  /\bk-market\b/i,
  /\bhandlar/i,
];

// ─── TIER A: AUTO-CONFIRM ─────────────────────────────────────────────────────
// Høy sikkerhet: nasjonale kjeder med svært tydelige og unike navn-mønstre.
// Regel: starter med eller inneholder kjede som tydelig token.
const AUTO_CONFIRM_CHAINS = [
  { chain: 'Circle K',   patterns: ['circle k', 'circlek'] },
  { chain: 'Uno-X',      patterns: ['uno-x', 'unox', 'uno x'] },
  { chain: 'Esso',       patterns: ['esso'] },
  { chain: 'St1',        patterns: ['st1', 'st 1'] },
  { chain: 'Shell',      patterns: ['shell'] },
  { chain: 'YX',         patterns: ['yx '] },
  { chain: 'Best',       patterns: ['best '] },
  { chain: 'Equinor',    patterns: ['equinor'] },
  { chain: 'Statoil',    patterns: ['statoil'] },
  { chain: 'Gasum',      patterns: ['gasum'] },
  { chain: 'Automat1',   patterns: ['automat1', 'automat 1'] },
  { chain: 'Trønder Oil', patterns: ['trønder oil', 'tronder oil'] },
  { chain: 'Driv',       patterns: ['driv '] },
  { chain: 'Minol',      patterns: ['minol'] },
  { chain: 'Jæren Olje', patterns: ['jæren olje', 'jæren oil', 'jaeren olje', 'jaeren oil'] },
  { chain: 'Agder Olje', patterns: ['agder olje', 'agder oil'] },
  { chain: 'Knapphus',   patterns: ['knapphus'] },
  { chain: 'Haltbakk Express', patterns: ['haltbakk'] },
  { chain: 'Bunker Oil', patterns: ['bunker oil', 'bunkeroil'] },
  { chain: 'Oljeleverandøren', patterns: ['oljeleverand', 'oljeverand'] },
  { chain: 'SEO',        patterns: ['seo '] },
  { chain: 'Brandval Bensin', patterns: ['brandval'] },
  { chain: 'Elstad Oljesenter', patterns: ['elstad'] },
];

// ─── TIER B: CHAIN SUGGESTED ──────────────────────────────────────────────────
// Lav-til-middels sikkerhet: navn inneholder noe som kan indikere kjede,
// men er ikke entydig nok til auto-confirm.
// Lagres som suggestion, ikke auto-approved.
const SUGGESTED_CHAINS = [
  { chain: 'YX',    patterns: [/^yx$/i, /\byx\b/i] },
  { chain: 'Best',  patterns: [/^best$/i] },
  { chain: 'Driv',  patterns: [/^driv$/i] },
  { chain: 'SEO',   patterns: [/^seo$/i] },
];

// ─── HJELPEFUNKSJONER ──────────────────────────────────────────────────────────

const norm = (s) => (s || '').toLowerCase().trim();

const isExcluded = (name) => {
  const n = norm(name);
  return EXCLUDED_FROM_CHAIN.some(p => p.test(n));
};

const matchAutoConfirm = (name) => {
  const n = norm(name);
  for (const { chain, patterns } of AUTO_CONFIRM_CHAINS) {
    for (const p of patterns) {
      if (n.startsWith(p) || n.includes(` ${p}`) || n.includes(`-${p}`) || n === p.trim()) {
        return chain;
      }
    }
  }
  return null;
};

const matchSuggested = (name) => {
  const n = norm(name);
  for (const { chain, patterns } of SUGGESTED_CHAINS) {
    for (const p of patterns) {
      if (typeof p === 'string' && (n.startsWith(p) || n === p)) return chain;
      if (p instanceof RegExp && p.test(n)) return chain;
    }
  }
  return null;
};

// ─── KLASSIFISERING ───────────────────────────────────────────────────────────
// Returnerer: { tier, chain, reason }
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

    const results = {
      autoConfirmed: [],
      chainSuggested: [],
      excluded: [],
      notAChainCandidate: [],
      errors: []
    };

    for (const review of reviews) {
      try {
        const { tier, chain, reason } = classifyReview(review.station_name);

        if (tier === 'auto_confirmed_chain') {
          // Auto-godkjenn: oppdater review og station
          await base44.asServiceRole.entities.StationReview.update(review.id, {
            status: 'approved',
            station_chain: chain,
            notes: `Auto-bekreftet (Tier A): "${review.station_name}" → "${chain}"`
          });
          // Oppdater også Station-record
          if (review.stationId) {
            await base44.asServiceRole.entities.Station.update(review.stationId, { chain });
          }
          results.autoConfirmed.push({ id: review.id, stationId: review.stationId, name: review.station_name, chain, reason });

        } else if (tier === 'chain_suggested') {
          // Suggestion: legg til notat, men behold status pending
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
          autoConfirmPatterns: AUTO_CONFIRM_CHAINS.map(c => ({ chain: c.chain, patterns: c.patterns })),
          suggestedPatterns: SUGGESTED_CHAINS.map(c => ({ chain: c.chain })),
          excludedNote: 'LPG, CNG, Tank, Tanken, Truck Diesel, marina, brygge, camping, dagligvare (Spar, Coop, Joker osv.)'
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