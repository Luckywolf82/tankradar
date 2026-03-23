import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * Auto-merger seed-stasjoner som ikke har prisdata med en OSM-tvilling.
 * Kriterier for auto-merge:
 * 1. sourceName starter med "seed_"
 * 2. Ingen tilknyttede FuelPrice-records
 * 3. Annen stasjon (ikke seed) innenfor 85m med samme kjede
 * 4. Normalisert navn-likhet >= 70%
 *
 * Mode:
 * - preview=true  → bare rapporter hva som VILLE blitt merget, ingen skriving
 * - preview=false → faktisk merge (limit=10 om gangen for å unngå timeout)
 */

const MERGE_RADIUS_METERS = 85;
const NAME_SIMILARITY_THRESHOLD = 0.70;
const BATCH_LIMIT = 10;

function haversineMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function normalizeName(name) {
  return (name || '').toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^a-z0-9æøå ]/g, '')
    .trim();
}

function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

function nameSimilarity(a, b) {
  const na = normalizeName(a);
  const nb = normalizeName(b);
  if (!na || !nb) return 0;
  const maxLen = Math.max(na.length, nb.length);
  return 1 - levenshtein(na, nb) / maxLen;
}

function findBestCanonicalMatch(seed, canonicalStations) {
  let bestMatch = null;
  let bestScore = 0;

  for (const canonical of canonicalStations) {
    if (!canonical.latitude || !canonical.longitude) continue;
    if (seed.chain && canonical.chain && seed.chain !== canonical.chain) continue;

    const dist = haversineMeters(seed.latitude, seed.longitude, canonical.latitude, canonical.longitude);
    if (dist > MERGE_RADIUS_METERS) continue;

    const sim = nameSimilarity(seed.name, canonical.name);
    if (sim < NAME_SIMILARITY_THRESHOLD) continue;

    const score = sim * (1 - dist / MERGE_RADIUS_METERS);
    if (score > bestScore) {
      bestScore = score;
      bestMatch = { station: canonical, distance: Math.round(dist), similarity: sim };
    }
  }
  return bestMatch;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const preview = body.preview !== false; // default: preview=true

    // Hent alle stasjoner
    const allStations = await base44.asServiceRole.entities.Station.list();

    const seedStations = allStations.filter(s =>
      s.sourceName && s.sourceName.startsWith('seed_') && s.sourceName !== 'deprecated_seed'
    );
    const canonicalStations = allStations.filter(s =>
      !s.sourceName || !s.sourceName.startsWith('seed_')
    );

    // Hent alle priser og favoritter i bulk
    const allPrices = await base44.asServiceRole.entities.FuelPrice.list('-fetchedAt', 5000);
    const allFavorites = await base44.asServiceRole.entities.UserFavoriteStation.list();

    const stationsWithPrices = new Set(allPrices.map(p => p.stationId).filter(Boolean));

    // Finn kandidater til merge
    const mergeCandidates = [];
    for (const seed of seedStations) {
      if (!seed.latitude || !seed.longitude) continue;
      if (stationsWithPrices.has(seed.id)) continue;

      const bestMatch = findBestCanonicalMatch(seed, canonicalStations);
      if (!bestMatch) continue;

      mergeCandidates.push({
        seed,
        canonical: bestMatch.station,
        distance_m: bestMatch.distance,
        name_similarity_pct: Math.round(bestMatch.similarity * 100),
        favorites_to_redirect: allFavorites.filter(f => f.station === seed.id).length
      });
    }

    if (preview) {
      return Response.json({
        mode: 'preview',
        radius_m: MERGE_RADIUS_METERS,
        name_similarity_threshold: NAME_SIMILARITY_THRESHOLD,
        total_seed_stations: seedStations.length,
        merge_candidates: mergeCandidates.length,
        candidates: mergeCandidates.map(c => ({
          seed_id: c.seed.id,
          seed_name: c.seed.name,
          seed_source: c.seed.sourceName,
          canonical_id: c.canonical.id,
          canonical_name: c.canonical.name,
          canonical_source: c.canonical.sourceName,
          distance_m: c.distance_m,
          name_similarity_pct: c.name_similarity_pct,
          favorites_to_redirect: c.favorites_to_redirect
        }))
      });
    }

    // Faktisk merge — maks BATCH_LIMIT om gangen
    const toMerge = mergeCandidates.slice(0, BATCH_LIMIT);
    const mergeResults = [];

    for (const candidate of toMerge) {
      const { seed, canonical } = candidate;
      const favorites = allFavorites.filter(f => f.station === seed.id);

      for (const fav of favorites) {
        const alreadyExists = allFavorites.some(f =>
          f.station === canonical.id && f.created_by === fav.created_by
        );
        if (!alreadyExists) {
          await base44.asServiceRole.entities.UserFavoriteStation.update(fav.id, {
            station: canonical.id
          });
        } else {
          await base44.asServiceRole.entities.UserFavoriteStation.delete(fav.id);
        }
      }

      await base44.asServiceRole.entities.Station.update(seed.id, {
        sourceName: 'deprecated_seed',
        notes: `Auto-merged into ${canonical.id} (${canonical.name}) — dist: ${candidate.distance_m}m, sim: ${candidate.name_similarity_pct}%`
      });

      mergeResults.push({
        seed_id: seed.id,
        seed_name: seed.name,
        canonical_id: canonical.id,
        canonical_name: canonical.name,
        distance_m: candidate.distance_m,
        name_similarity_pct: candidate.name_similarity_pct,
        favorites_redirected: favorites.length
      });
    }

    return Response.json({
      mode: 'merge',
      radius_m: MERGE_RADIUS_METERS,
      name_similarity_threshold: NAME_SIMILARITY_THRESHOLD,
      total_candidates: mergeCandidates.length,
      merged_this_run: mergeResults.length,
      remaining: Math.max(0, mergeCandidates.length - mergeResults.length),
      merges: mergeResults
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});