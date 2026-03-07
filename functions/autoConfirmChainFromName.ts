import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// Kjedeliste - konservativ og utvidbar
const KNOWN_CHAINS = [
  'Circle K',
  'Uno-X',
  'Esso',
  'St1',
  'YX',
  'Best',
  'Shell',
  'Trønder Oil',
  'Gasum',
  'Automat1',
  'Statoil',
  'Equinor'
];

// Normaliserer navn for sammenlikning
const normalizeName = (name) => {
  if (!name) return '';
  return name.toLowerCase().trim();
};

// Sjekker om station-navn matches kjent kjede
const matchChainFromName = (stationName) => {
  if (!stationName) return null;

  const normalized = normalizeName(stationName);

  for (const chain of KNOWN_CHAINS) {
    const normalizedChain = normalizeName(chain);

    // Regel 1: Navn starter med kjede
    if (normalized.startsWith(normalizedChain)) {
      return chain;
    }

    // Regel 2: Kjede er første ord og tydelig atskilt
    const firstWord = normalized.split(/[\s\-–—]/)[0];
    if (firstWord === normalizedChain) {
      return chain;
    }

    // Regel 3: "Kjede Stasjon" eller "Kjede-navn"
    if (normalized.includes(`${normalizedChain} `) || normalized.includes(`${normalizedChain}-`)) {
      return chain;
    }
  }

  return null;
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Hent alle chain_unconfirmed reviews
    const reviews = await base44.asServiceRole.entities.StationReview.filter({
      review_type: 'chain_unconfirmed',
      status: 'pending'
    });

    const results = {
      confirmed: [],
      stillPending: [],
      errors: []
    };

    // Prosesser hver review
    for (const review of reviews) {
      try {
        // Sjekk om chain mangler
        if (!review.station_chain || review.station_chain === 'unknown' || review.station_chain === null) {
          // Prøv å finne chain fra navn
          const matchedChain = matchChainFromName(review.station_name);

          if (matchedChain) {
            // Oppdater review til approved med chain
            await base44.asServiceRole.entities.StationReview.update(review.id, {
              status: 'approved',
              station_chain: matchedChain,
              notes: `Auto-bekreftet chain fra navn: "${review.station_name}" → "${matchedChain}"`
            });

            results.confirmed.push({
              id: review.id,
              stationId: review.stationId,
              stationName: review.station_name,
              detectedChain: matchedChain
            });
          } else {
            results.stillPending.push({
              id: review.id,
              stationId: review.stationId,
              stationName: review.station_name,
              reason: 'Navn matcher ikke kjent kjede'
            });
          }
        } else {
          results.stillPending.push({
            id: review.id,
            stationId: review.stationId,
            stationName: review.station_name,
            reason: 'Chain allerede satt'
          });
        }
      } catch (error) {
        results.errors.push({
          reviewId: review.id,
          error: error.message
        });
      }
    }

    return Response.json({
      success: true,
      summary: {
        totalReviewed: reviews.length,
        chainConfirmed: results.confirmed.length,
        stillPending: results.stillPending.length,
        errors: results.errors.length,
        knownChainsUsed: KNOWN_CHAINS
      },
      details: results
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});