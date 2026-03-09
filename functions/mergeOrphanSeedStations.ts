import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * Auto-merger seed-stasjoner som ikke har prisdata med en OSM-tvilling.
 * Kriterier for auto-merge:
 * 1. Kandidat har sourceName starter med "seed_" 
 * 2. Kandidat har INGEN tilknyttede FuelPrice-records
 * 3. Det finnes en annen stasjon (ikke seed) innenfor 85m med samme kjede
 * 4. Normalisert navn-likhet >= 70%
 * 
 * Handling ved match:
 * - Redirect alle UserFavoriteStation fra seed → kanonisk
 * - Soft-delete seed-stasjonen (sett sourceName = "deprecated_seed")
 */

const MERGE_RADIUS_METERS = 85;
const NAME_SIMILARITY_THRESHOLD = 0.70;

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

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Hent alle stasjoner
    const allStations = await base44.asServiceRole.entities.Station.list();

    // Finn seed-stasjoner
    const seedStations = allStations.filter(s =>
      s.sourceName && s.sourceName.startsWith('seed_') && s.sourceName !== 'deprecated_seed'
    );

    // Finn ikke-seed stasjoner (OSM, GooglePlaces, osv.)
    const canonicalStations = allStations.filter(s =>
      !s.sourceName || !s.sourceName.startsWith('seed_')
    );

    // Bulk-hent alle stasjonspriser og favoritter for å unngå rate limits
    const allPrices = await base44.asServiceRole.entities.FuelPrice.list('-fetchedAt', 5000);
    const allFavorites = await base44.asServiceRole.entities.UserFavoriteStation.list();

    // Bygg opp set av stationIds som har prisdata
    const stationsWithPrices = new Set(allPrices.map(p => p.stationId).filter(Boolean));

    const results = {
      checked: 0,
      merged: 0,
      skipped_has_prices: 0,
      skipped_no_canonical_match: 0,
      skipped_low_similarity: 0,
      merges: []
    };

    for (const seed of seedStations) {
      results.checked++;

      if (!seed.latitude || !seed.longitude) {
        results.skipped_no_canonical_match++;
        continue;
      }

      // Sjekk om seed har prisdata (fra bulk-hentet set)
      if (stationsWithPrices.has(seed.id)) {
        results.skipped_has_prices++;
        continue;
      }

      // Finn kandidater: samme kjede, innenfor 85m, høy navn-likhet
      let bestMatch = null;
      let bestScore = 0;

      for (const canonical of canonicalStations) {
        if (!canonical.latitude || !canonical.longitude) continue;
        if (seed.chain && canonical.chain && seed.chain !== canonical.chain) continue;

        const dist = haversineMeters(seed.latitude, seed.longitude, canonical.latitude, canonical.longitude);
        if (dist > MERGE_RADIUS_METERS) continue;

        const sim = nameSimilarity(seed.name, canonical.name);
        if (sim < NAME_SIMILARITY_THRESHOLD) {
          results.skipped_low_similarity++;
          continue;
        }

        const score = sim * (1 - dist / MERGE_RADIUS_METERS);
        if (score > bestScore) {
          bestScore = score;
          bestMatch = { station: canonical, distance: Math.round(dist), similarity: sim };
        }
      }

      if (!bestMatch) {
        results.skipped_no_canonical_match++;
        continue;
      }

      // Redirect favorites fra seed → kanonisk (fra bulk-data)
      const favorites = allFavorites.filter(f => f.station === seed.id);
      for (const fav of favorites) {
        // Sjekk om det allerede finnes favoritt for kanonisk stasjon fra samme bruker
        const alreadyExists = allFavorites.some(f =>
          f.station === bestMatch.station.id && f.created_by === fav.created_by
        );
        if (!alreadyExists) {
          await base44.asServiceRole.entities.UserFavoriteStation.update(fav.id, {
            station: bestMatch.station.id
          });
        } else {
          await base44.asServiceRole.entities.UserFavoriteStation.delete(fav.id);
        }
      }

      // Marker seed som deprecated (soft delete)
      await base44.asServiceRole.entities.Station.update(seed.id, {
        sourceName: 'deprecated_seed',
        notes: `Auto-merged into ${bestMatch.station.id} (${bestMatch.station.name}) — dist: ${bestMatch.distance}m, sim: ${(bestMatch.similarity * 100).toFixed(0)}%`
      });

      results.merged++;
      results.merges.push({
        seed_id: seed.id,
        seed_name: seed.name,
        canonical_id: bestMatch.station.id,
        canonical_name: bestMatch.station.name,
        distance_m: bestMatch.distance,
        name_similarity_pct: Math.round(bestMatch.similarity * 100),
        favorites_redirected: favorites.length
      });
    }

    return Response.json({
      status: 'done',
      radius_m: MERGE_RADIUS_METERS,
      name_similarity_threshold: NAME_SIMILARITY_THRESHOLD,
      ...results
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});