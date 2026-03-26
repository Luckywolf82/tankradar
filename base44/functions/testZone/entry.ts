import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * testZone — zone-level test function
 *
 * Runs a production-equivalent GP fetch for a single zone.
 * Returns per-fetch-point saturation data + zone-level coverage metrics.
 *
 * Saturation: a fetch point is saturated if it returned >= 18 results
 * (Nearby Search cap is 20; >=18 suggests result truncation).
 *
 * Does NOT persist prices. Does NOT touch FuelPrice or FetchLog.
 * Updates GPFetchZone.lastZoneTestAt, zoneTestCount, lastZoneTestStats.
 *
 * This is fetch cost-control only. Does NOT interact with StationReview.
 */

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

function getFetchPointsForZone(zone) {
  if ((zone.zoneType || 'circle') === 'corridor') return corridorFetchPoints(zone);
  return [{ latitude: zone.latitude, longitude: zone.longitude, radiusMeters: zone.radiusMeters || 5000 }];
}

function isStationInCircle(station, zone) {
  if (!station.latitude || !station.longitude) return false;
  return distMeters(station.latitude, station.longitude, zone.latitude, zone.longitude) <= (zone.radiusMeters || 5000);
}

function pointToSegmentDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  if (dx === 0 && dy === 0) return distMeters(px, py, ax, ay);
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  return distMeters(px, py, ax + t * dx, ay + t * dy);
}

function isStationInCorridor(station, zone) {
  if (!station.latitude || !station.longitude) return false;
  const points = parseCorridorPoints(zone);
  if (points.length < 2) return isStationInCircle(station, { ...zone, radiusMeters: zone.bufferMeters || 2000 });
  const buffer = zone.bufferMeters || 2000;
  for (let i = 0; i < points.length - 1; i++) {
    const d = pointToSegmentDist(station.latitude, station.longitude, points[i].lat, points[i].lng, points[i + 1].lat, points[i + 1].lng);
    if (d <= buffer) return true;
  }
  return false;
}

function isStationInZone(station, zone) {
  const zoneType = zone.zoneType || 'circle';
  return zoneType === 'corridor' ? isStationInCorridor(station, zone) : isStationInCircle(station, zone);
}

async function fetchGPForPoint(apiKey, point) {
  const res = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': 'places.id,places.displayName,places.location,places.fuelOptions',
    },
    body: JSON.stringify({
      includedTypes: ['gas_station'],
      maxResultCount: 20,
      locationRestriction: {
        circle: { center: { latitude: point.latitude, longitude: point.longitude }, radius: point.radiusMeters },
      },
    }),
  });
  if (!res.ok) return { success: false, error: `HTTP ${res.status}`, resultsCount: 0 };
  const data = await res.json();
  return { success: true, places: data.places || [], resultsCount: (data.places || []).length };
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { zoneId } = body;
  if (!zoneId) return Response.json({ error: 'zoneId required' }, { status: 400 });

  const apiKey = Deno.env.get('GOOGLE_PLACES_API_KEY');
  if (!apiKey) return Response.json({ error: 'GOOGLE_PLACES_API_KEY not set' }, { status: 500 });

  const db = base44.asServiceRole;

  // Load zone
  const allZones = await db.entities.GPFetchZone.list();
  const zone = allZones.find(z => z.id === zoneId);
  if (!zone) return Response.json({ error: 'Zone not found' }, { status: 404 });

  // Load stations to classify coverage
  const allStations = await db.entities.Station.filter({ status: 'active' });
  const stationsInZone = allStations.filter(s => isStationInZone(s, zone));

  // Load DB coverage (GP prices only) for stations in this zone
  const stationIds = stationsInZone.map(s => s.id);
  const dbCoveredIds = new Set();
  const dbWeakIds = new Set(); // DB rows exist but no fuelTypes

  if (stationIds.length > 0) {
    const gpPrices = await db.entities.FuelPrice.filter({ sourceName: 'GooglePlaces' }, '-fetchedAt', 2000);
    const byStation = {};
    for (const p of gpPrices) {
      if (!p.stationId || !stationIds.includes(p.stationId)) continue;
      if (!byStation[p.stationId]) byStation[p.stationId] = { hasFuelType: false };
      if (p.fuelType) byStation[p.stationId].hasFuelType = true;
    }
    for (const [sid, info] of Object.entries(byStation)) {
      if (info.hasFuelType) dbCoveredIds.add(sid);
      else dbWeakIds.add(sid);
    }
  }

  // Fetch points + saturation tracking
  const fetchPoints = getFetchPointsForZone(zone);
  const SATURATION_THRESHOLD = 18;

  const fetchPointResults = [];
  const seenPlaceIds = new Set();
  const allFetchedPlaces = []; // all unique GP places returned, for per-station matching
  let totalPlaces = 0;
  let totalWithPrices = 0;
  let apiErrors = 0;

  for (const point of fetchPoints) {
    const result = await fetchGPForPoint(apiKey, point);
    if (!result.success) {
      apiErrors++;
      fetchPointResults.push({ latitude: point.latitude, longitude: point.longitude, resultsCount: 0, saturated: false, error: result.error });
      continue;
    }
    const newPlaces = result.places.filter(p => !seenPlaceIds.has(p.id));
    for (const p of newPlaces) { seenPlaceIds.add(p.id); allFetchedPlaces.push(p); }

    const saturated = result.resultsCount >= SATURATION_THRESHOLD;
    totalPlaces += newPlaces.length;
    totalWithPrices += newPlaces.filter(p => p.fuelOptions?.fuelPrices?.length > 0).length;

    fetchPointResults.push({
      latitude: point.latitude,
      longitude: point.longitude,
      resultsCount: result.resultsCount,
      newResultsCount: newPlaces.length,
      saturated,
    });
  }

  // ── Per-station GP match assessment ──────────────────────────────────────────
  // For each station in zone, find the closest GP place returned by the fetch.
  // Match threshold: 300m (conservative — GP places within 300m of station coords are candidates).
  // We do NOT write to DB here — this is diagnostic only.
  const MATCH_RADIUS_METERS = 300;

  const stationResults = stationsInZone.map(station => {
    // Find closest GP place
    let closestPlace = null;
    let closestDist = Infinity;
    for (const place of allFetchedPlaces) {
      const loc = place.location;
      if (!loc?.latitude || !loc?.longitude) continue;
      const d = distMeters(station.latitude, station.longitude, loc.latitude, loc.longitude);
      if (d < closestDist) { closestDist = d; closestPlace = place; }
    }

    const gpReached = closestPlace !== null && closestDist <= MATCH_RADIUS_METERS;
    const hasPrices = gpReached && (closestPlace.fuelOptions?.fuelPrices?.length > 0);
    const inDbCovered = dbCoveredIds.has(station.id);
    const inDbWeak = dbWeakIds.has(station.id);

    // Per-station scope recommendation
    let scopeRecommendation;
    if (inDbCovered) {
      scopeRecommendation = 'keep'; // has DB prices — strong signal
    } else if (hasPrices) {
      scopeRecommendation = 'keep'; // live GP match with prices
    } else if (gpReached && !hasPrices) {
      scopeRecommendation = 'monitor'; // reached but no price data
    } else if (inDbWeak) {
      scopeRecommendation = 'monitor'; // DB rows but no fuel types
    } else {
      scopeRecommendation = 'remove_candidate'; // not reached, no DB, no prices
    }

    return {
      stationId: station.id,
      stationName: station.name,
      stationChain: station.chain || null,
      latitude: station.latitude,
      longitude: station.longitude,
      gpReached,
      closestGpDistanceMeters: closestPlace ? Math.round(closestDist) : null,
      closestGpName: closestPlace?.displayName?.text || null,
      hasPrices,
      fuelPriceCount: hasPrices ? closestPlace.fuelOptions.fuelPrices.length : 0,
      inDbCovered,
      inDbWeak,
      scopeRecommendation,
    };
  });

  // Zone-level metrics from DB state
  const totalStations = stationsInZone.length;
  const coveredCount = stationsInZone.filter(s => dbCoveredIds.has(s.id)).length;
  const weakCount = stationsInZone.filter(s => dbWeakIds.has(s.id) && !dbCoveredIds.has(s.id)).length;
  const untestedCount = stationsInZone.filter(s => !dbCoveredIds.has(s.id) && !dbWeakIds.has(s.id)).length;

  const coverageRate = totalStations > 0 ? coveredCount / totalStations : null;
  const wasteRate = totalStations > 0 ? untestedCount / totalStations : null;
  const coveredPerPoint = fetchPoints.length > 0 ? coveredCount / fetchPoints.length : null;
  const costPerRun = fetchPoints.length * 0.049;
  const costPerCovered = coveredCount > 0 ? costPerRun / coveredCount : null;

  const saturatedCount = fetchPointResults.filter(r => r.saturated).length;
  const saturationRate = fetchPoints.length > 0 ? saturatedCount / fetchPoints.length : 0;

  // Zone decision logic (data-only, multi-signal)
  // Requires at least 2 test runs for DISABLE_CANDIDATE
  const prevTestCount = zone.zoneTestCount || 0;
  const newTestCount = prevTestCount + 1;

  function computeZoneDecision(metrics, testCount) {
    const { coverageRate, wasteRate, coveredPerPoint, saturationRate, totalStations } = metrics;

    if (totalStations === 0) return { decision: 'monitor', reasons: ['No stations in zone.'] };

    const issues = [];
    const positives = [];

    if (coverageRate !== null) {
      if (coverageRate < 0.15) issues.push(`Very low coverage: ${Math.round(coverageRate * 100)}% of stations covered.`);
      else if (coverageRate < 0.35) issues.push(`Low coverage: ${Math.round(coverageRate * 100)}% of stations covered.`);
      else positives.push(`Coverage: ${Math.round(coverageRate * 100)}%`);
    }

    if (wasteRate !== null && totalStations >= 3) {
      if (wasteRate > 0.80) issues.push(`High waste: ${Math.round(wasteRate * 100)}% of stations still untested.`);
      else if (wasteRate > 0.60) issues.push(`Elevated waste: ${Math.round(wasteRate * 100)}% untested.`);
      else positives.push(`Waste: ${Math.round(wasteRate * 100)}% untested`);
    }

    if (coveredPerPoint !== null && totalStations >= 3) {
      if (coveredPerPoint < 0.5) issues.push(`Very low yield: ${coveredPerPoint.toFixed(1)} covered stations per fetch point.`);
      else if (coveredPerPoint < 1.5) issues.push(`Low yield: ${coveredPerPoint.toFixed(1)} covered/point.`);
      else positives.push(`Yield: ${coveredPerPoint.toFixed(1)} covered/point`);
    }

    if (saturationRate > 0.7) {
      issues.push(`High saturation: ${Math.round(saturationRate * 100)}% of fetch points hit the result cap — area may need more fetch points.`);
    } else if (saturationRate > 0.4) {
      issues.push(`Moderate saturation: ${Math.round(saturationRate * 100)}% of fetch points near result cap.`);
    } else if (saturationRate < 0.1 && positives.length > 0) {
      positives.push(`Low saturation: fetch points are not result-capped.`);
    }

    // Decision rules
    if (issues.length === 0) {
      return { decision: 'keep', reasons: positives.length > 0 ? positives : ['All metrics look good.'] };
    }

    if (issues.length >= 2 && testCount >= 2) {
      return { decision: 'disable_candidate', reasons: issues };
    }

    return { decision: 'monitor', reasons: issues };
  }

  const { decision, reasons: decisionReasons } = computeZoneDecision(
    { coverageRate, wasteRate, coveredPerPoint, saturationRate, totalStations },
    newTestCount
  );

  // Persist test metadata to zone
  const removeCandidates = stationResults.filter(r => r.scopeRecommendation === 'remove_candidate');
  const testStats = JSON.stringify({
    testedAt: new Date().toISOString(),
    totalStations,
    coveredCount,
    weakCount,
    untestedCount,
    coverageRate: coverageRate != null ? Math.round(coverageRate * 1000) / 1000 : null,
    wasteRate: wasteRate != null ? Math.round(wasteRate * 1000) / 1000 : null,
    coveredPerPoint: coveredPerPoint != null ? Math.round(coveredPerPoint * 100) / 100 : null,
    saturationRate: Math.round(saturationRate * 1000) / 1000,
    saturatedFetchPoints: saturatedCount,
    totalFetchPoints: fetchPoints.length,
    costPerRun: Math.round(costPerRun * 10000) / 10000,
    costPerCovered: costPerCovered != null ? Math.round(costPerCovered * 10000) / 10000 : null,
    decision,
    decisionReasons,
    apiErrors,
    removeCandidateCount: removeCandidates.length,
  });

  await db.entities.GPFetchZone.update(zoneId, {
    lastZoneTestAt: new Date().toISOString(),
    zoneTestCount: newTestCount,
    lastZoneTestStats: testStats,
  });

  return Response.json({
    success: true,
    zone: { id: zone.id, name: zone.name, zoneType: zone.zoneType || 'circle' },
    coverage: {
      totalStations,
      coveredCount,
      weakCount,
      untestedCount,
      coverageRate,
      wasteRate,
      coveredPerPoint,
      costPerRun,
      costPerCovered,
    },
    saturation: {
      totalFetchPoints: fetchPoints.length,
      saturatedFetchPoints: saturatedCount,
      saturationRate,
      threshold: SATURATION_THRESHOLD,
      fetchPointResults,
    },
    apiResults: {
      totalPlaces,
      totalWithPrices,
      apiErrors,
    },
    decision: {
      decision,
      reasons: decisionReasons,
      testCount: newTestCount,
      requiresMultipleTests: decision === 'disable_candidate' ? false : newTestCount < 2,
    },
    stationResults,
  });
});