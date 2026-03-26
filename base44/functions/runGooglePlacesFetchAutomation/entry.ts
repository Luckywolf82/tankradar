import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * runGooglePlacesFetchAutomation — zone-driven GP fetch engine
 *
 * Supports zone types:
 *   circle   — single center + radiusMeters
 *   corridor — JSON polyline + bufferMeters + radiusMeters (fetch point radius)
 *
 * For circle zones: one GP API call at zone center.
 * For corridor zones: multiple GP API calls sampled along the route every ~4 km.
 *
 * Rules:
 * ✓ Only isActive zones run
 * ✓ Parser locked (gp_v1)
 * ✓ Plausibility check before persistence
 * ✓ In-memory dedup (stationId|fuelType|price|updateTime)
 * ✓ No merge engine
 * ✓ Batch create
 * ✓ FetchLog per run
 * ✓ Zone lastFetchedAt updated after each zone
 */

// ── Geometry (inlined — no local imports in Deno) ────────────────────────────

const GEO_R = 6371000;
function toRad(d) { return d * Math.PI / 180; }

function distMeters(lat1, lon1, lat2, lon2) {
  const dLat = toRad(lat2 - lat1), dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return GEO_R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function parseCorridorPoints(zone) {
  if (!zone.corridorPoints) return [];
  try {
    const pts = JSON.parse(zone.corridorPoints);
    return Array.isArray(pts) && pts.length >= 2 ? pts : [];
  } catch { return []; }
}

/**
 * For a corridor zone, generate GP fetch sample points spaced ~stepMeters apart.
 * Each point gets a radiusMeters equal to zone.radiusMeters (the fetch radius per call).
 */
function corridorFetchPoints(zone, stepMeters = 4000) {
  const points = parseCorridorPoints(zone);
  if (points.length < 2) {
    return [{ latitude: zone.latitude, longitude: zone.longitude, radiusMeters: zone.radiusMeters || 5000 }];
  }

  const fetchRadius = zone.radiusMeters || 5000;
  const result = [];
  let accumulated = 0;
  result.push({ latitude: points[0].lat, longitude: points[0].lng, radiusMeters: fetchRadius });

  for (let i = 0; i < points.length - 1; i++) {
    const A = points[i], B = points[i + 1];
    const segLen = distMeters(A.lat, A.lng, B.lat, B.lng);
    let offset = accumulated === 0 ? stepMeters : stepMeters - accumulated;

    while (offset <= segLen) {
      const t = offset / segLen;
      result.push({
        latitude: A.lat + t * (B.lat - A.lat),
        longitude: A.lng + t * (B.lng - A.lng),
        radiusMeters: fetchRadius,
      });
      offset += stepMeters;
    }
    accumulated = segLen - (offset - stepMeters);
    if (accumulated < 0) accumulated = 0;
  }

  const last = points[points.length - 1];
  const lastAdded = result[result.length - 1];
  if (distMeters(lastAdded.latitude, lastAdded.longitude, last.lat, last.lng) > 500) {
    result.push({ latitude: last.lat, longitude: last.lng, radiusMeters: fetchRadius });
  }
  return result;
}

/** Get list of fetch points for any zone type */
function getFetchPointsForZone(zone) {
  if ((zone.zoneType || 'circle') === 'corridor') {
    return corridorFetchPoints(zone);
  }
  return [{ latitude: zone.latitude, longitude: zone.longitude, radiusMeters: zone.radiusMeters || 5000 }];
}

// ── GP API ───────────────────────────────────────────────────────────────────

function normalizeChain(name) {
  if (!name) return null;
  const n = name.toLowerCase().trim().replace(/[-\s]+/g, ' ');
  const map = {
    'esso norway': 'esso', 'essono': 'esso', 'essopluss': 'esso',
    'circle k': 'circle k', 'circlekiosk': 'circle k', 'circlekiosks': 'circle k', 'circlek': 'circle k',
    'uno x': 'uno x', 'uno-x': 'uno x', 'unox': 'uno x', 'unoxpress': 'uno x',
  };
  return map[n] || n;
}

function normalizeFuelType(t) {
  return { SP95: 'gasoline_95', SP98: 'gasoline_98', DIESEL: 'diesel' }[t] || null;
}

function extractPriceNok(p) {
  if (!p || p.currencyCode !== 'NOK') return null;
  return (Number(p.units) || 0) + (Number(p.nanos) || 0) / 1e9;
}

function classifyPlausibility(priceNok) {
  if (!priceNok) return null;
  if (priceNok < 10) return 'suspect_price_low';
  if (priceNok > 30) return 'suspect_price_high';
  return 'realistic_price';
}

function matchStation(googlePlace, allStations) {
  const gName = googlePlace.displayName?.text || '';
  const gLat = googlePlace.location?.latitude;
  const gLon = googlePlace.location?.longitude;
  if (!gLat || !gLon) return null;

  const lower = gName.toLowerCase();
  let chain = null;
  if (lower.includes('circle k')) chain = 'circle k';
  else if (lower.includes('uno') && lower.includes('x')) chain = 'uno x';
  else if (lower.includes('esso')) chain = 'esso';
  else if (lower.includes('shell')) chain = 'shell';
  else if (lower.includes('statoil')) chain = 'statoil';
  else if (lower.includes('st1')) chain = 'st1';
  if (!chain) return null;

  const normChain = normalizeChain(chain);
  let best = null, bestDist = Infinity;

  for (const s of allStations) {
    if (!s.latitude || !s.longitude || !s.chain) continue;
    const d = distMeters(gLat, gLon, s.latitude, s.longitude);
    if (d > 500 || normalizeChain(s.chain) !== normChain) continue;
    let conf = 0;
    if (d < 50) conf = gName.toLowerCase().includes((s.name || '').toLowerCase()) ? 0.90 : 0.85;
    else if (d < 150) conf = 0.80;
    else if (d < 300) conf = 0.65;
    else conf = 0.55;
    if (d < bestDist) { best = { station: s, distanceMeters: d, confidence: conf }; bestDist = d; }
  }
  return best;
}

async function fetchGPForPoint(apiKey, point, zoneName) {
  try {
    const res = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.fuelOptions',
      },
      body: JSON.stringify({
        includedTypes: ['gas_station'],
        maxResultCount: 20,
        locationRestriction: {
          circle: { center: { latitude: point.latitude, longitude: point.longitude }, radius: point.radiusMeters },
        },
      }),
    });
    if (!res.ok) return { success: false, error: `HTTP ${res.status}`, zone: zoneName };
    const data = await res.json();
    return { success: true, places: data.places || [] };
  } catch (err) {
    return { success: false, error: err.message, zone: zoneName };
  }
}

// ── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  const startedAt = new Date().toISOString();
  try {
    const base44 = createClientFromRequest(req);
    const db = base44.asServiceRole;

    const apiKey = Deno.env.get('GOOGLE_PLACES_API_KEY');
    if (!apiKey) return Response.json({ error: 'GOOGLE_PLACES_API_KEY not set' }, { status: 500 });

    // 1. Load active zones
    const allZones = await db.entities.GPFetchZone.list();
    const activeZones = allZones.filter(z => z.isActive === true);

    if (activeZones.length === 0) {
      return Response.json({ success: true, message: 'No active GPFetchZones. Nothing to fetch.', activeZones: 0, totalZones: allZones.length });
    }

    // 2. Station catalog — fetch scope controlled by fetchScopeStatus.
    // out_of_scope = explicitly excluded. keep + monitor + legacy (no field set) = included.
    // reviewStatus is NOT used for fetch scope control.
    const allStationsRaw = await db.entities.Station.list();
    const allStations = allStationsRaw.filter(s => s.fetchScopeStatus !== 'out_of_scope');

    // 3. Dedup snapshot
    const existingGP = await db.entities.FuelPrice.filter({ sourceName: 'GooglePlaces' }, '-created_date', 2000);
    const dedupMap = {};
    for (const row of existingGP) {
      const key = `${row.stationId}|${row.fuelType}`;
      if (!dedupMap[key]) dedupMap[key] = { priceNok: row.priceNok, sourceUpdatedAt: row.sourceUpdatedAt };
    }

    // 4. Stats
    const stats = {
      zonesActive: activeZones.length, zonesTotal: allZones.length, zoneSummaries: [],
      totalAPIResults: 0, withPrices: 0, withoutPrices: 0,
      matched: 0, unmatched: 0, highConf: 0, reviewNeeded: 0,
      plausibility: { realistic_price: 0, suspect_price_low: 0, suspect_price_high: 0 },
      created: 0, deduped: 0, skipped: 0,
    };

    const newRecords = [];
    // Track GP place IDs seen this run to avoid double-counting overlapping fetch points
    const seenPlaceIds = new Set();

    // 5. Process each active zone
    for (const zone of activeZones) {
      const fetchPoints = getFetchPointsForZone(zone);
      let zoneCreated = 0, zoneMatched = 0, zonePlaces = 0;

      for (const point of fetchPoints) {
        const result = await fetchGPForPoint(apiKey, point, zone.name);
        if (!result.success) continue;

        for (const place of result.places) {
          // Skip places already processed this run (corridor zones overlap)
          if (seenPlaceIds.has(place.id)) continue;
          seenPlaceIds.add(place.id);

          stats.totalAPIResults++;
          zonePlaces++;

          const fuelOptions = place.fuelOptions?.fuelPrices || [];
          if (fuelOptions.length === 0) { stats.withoutPrices++; continue; }
          stats.withPrices++;

          const match = matchStation(place, allStations);
          if (!match) { stats.unmatched++; continue; }

          stats.matched++;
          zoneMatched++;
          const { station, distanceMeters: d, confidence } = match;

          if (d > 200 || confidence < 0.70) stats.reviewNeeded++;
          else stats.highConf++;

          for (const fp of fuelOptions) {
            const fuelType = normalizeFuelType(fp.type);
            if (!fuelType) { stats.skipped++; continue; }
            const priceNok = extractPriceNok(fp.price);
            if (!priceNok) { stats.skipped++; continue; }

            const plaus = classifyPlausibility(priceNok);
            stats.plausibility[plaus]++;

            const sourceUpdatedAt = fp.updateTime || null;
            const key = `${station.id}|${fuelType}`;
            const existing = dedupMap[key];
            if (existing && existing.priceNok === priceNok && existing.sourceUpdatedAt === sourceUpdatedAt) {
              stats.deduped++;
              continue;
            }

            newRecords.push({
              stationId: station.id,
              fuelType,
              priceNok,
              priceType: 'station_level',
              sourceName: 'GooglePlaces',
              sourceUrl: null,
              sourceUpdatedAt,
              fetchedAt: new Date().toISOString(),
              sourceFrequency: 'near_realtime',
              confidenceScore: confidence,
              parserVersion: 'gp_v1',
              plausibilityStatus: plaus,
              station_match_status: 'matched_station_id',
              rawPayloadSnippet: `zone=${zone.name} zoneType=${zone.zoneType || 'circle'} | ${fp.type} | ${Math.round(priceNok * 100) / 100} NOK/L`,
            });
            zoneCreated++;
          }
        }
      }

      // Update zone lastFetchedAt
      await db.entities.GPFetchZone.update(zone.id, {
        lastFetchedAt: new Date().toISOString(),
        lastFetchStats: JSON.stringify({
          zoneType: zone.zoneType || 'circle',
          fetchPoints: fetchPoints.length,
          places: zonePlaces,
          matched: zoneMatched,
          created: zoneCreated,
        }),
      });

      stats.zoneSummaries.push({
        zone: zone.name,
        zoneType: zone.zoneType || 'circle',
        priority: zone.priority,
        fetchPoints: fetchPoints.length,
        places: zonePlaces,
        matched: zoneMatched,
        created: zoneCreated,
      });
    }

    // 6. Batch create
    if (newRecords.length > 0) {
      await db.entities.FuelPrice.bulkCreate(newRecords);
      stats.created = newRecords.length;
    }

    // 7. Materialize
    for (const r of newRecords) {
      if (r.plausibilityStatus === 'realistic_price') {
        db.functions.invoke('materializeCurrentStationPrice', r).catch(() => {});
      }
    }

    // 8. FetchLog
    await db.entities.FetchLog.create({
      sourceName: 'GooglePlaces',
      startedAt,
      finishedAt: new Date().toISOString(),
      success: true,
      httpStatus: 200,
      stationsFound: stats.totalAPIResults,
      pricesFound: stats.withPrices,
      recordsCreated: stats.created,
      recordsSkipped: stats.deduped + stats.skipped,
      parserVersion: 'gp_v1',
      notes: `zones=${stats.zonesActive}/${stats.zonesTotal} api=${stats.totalAPIResults} matched=${stats.matched} high=${stats.highConf} review=${stats.reviewNeeded} created=${stats.created} dedup=${stats.deduped}`,
    });

    return Response.json({
      success: true,
      automation: { executedAt: startedAt, completedAt: new Date().toISOString() },
      zones: { active: stats.zonesActive, total: stats.zonesTotal, summaries: stats.zoneSummaries },
      dataflow: { api_results: stats.totalAPIResults, with_prices: stats.withPrices, without_prices: stats.withoutPrices, matched: stats.matched, unmatched: stats.unmatched },
      classification: { high_confidence: stats.highConf, review_needed: stats.reviewNeeded },
      plausibility: stats.plausibility,
      persistence: { created: stats.created, deduplicated: stats.deduped, skipped: stats.skipped },
    });

  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
});