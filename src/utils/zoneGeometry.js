/**
 * zoneGeometry.js
 * Shared geometry utilities for GPFetchZone membership checks and rendering.
 * Used by both CoverageMapExplorer (frontend) and runGooglePlacesFetchAutomation (backend).
 */

const R = 6371000; // Earth radius in meters

export function toRad(deg) { return deg * Math.PI / 180; }

/** Haversine distance in meters between two lat/lon points */
export function distanceMeters(lat1, lon1, lat2, lon2) {
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Shortest distance in meters from point P to line segment AB.
 * All inputs are { lat, lng } objects.
 */
export function distanceToSegmentMeters(P, A, B) {
  // Project onto segment in flat-earth approximation (fine for <200km segments)
  const ax = A.lng, ay = A.lat;
  const bx = B.lng, by = B.lat;
  const px = P.lng, py = P.lat;

  const dx = bx - ax, dy = by - ay;
  const lenSq = dx * dx + dy * dy;

  if (lenSq === 0) {
    // A === B, just return point-to-point distance
    return distanceMeters(P.lat, P.lng, A.lat, A.lng);
  }

  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
  const closestLat = ay + t * dy;
  const closestLng = ax + t * dx;

  return distanceMeters(P.lat, P.lng, closestLat, closestLng);
}

/**
 * Parse corridorPoints from a GPFetchZone record.
 * Returns array of { lat, lng } or [] on error.
 */
export function parseCorridorPoints(zone) {
  if (!zone.corridorPoints) return [];
  try {
    const pts = JSON.parse(zone.corridorPoints);
    if (!Array.isArray(pts) || pts.length < 2) return [];
    return pts;
  } catch {
    return [];
  }
}

/**
 * Check if a station is inside a zone (any type).
 * Returns true/false.
 */
export function isStationInZone(station, zone) {
  if (!station.latitude || !station.longitude) return false;

  const zoneType = zone.zoneType || 'circle';

  if (zoneType === 'circle') {
    const d = distanceMeters(station.latitude, station.longitude, zone.latitude, zone.longitude);
    return d <= (zone.radiusMeters || 5000);
  }

  if (zoneType === 'corridor') {
    const points = parseCorridorPoints(zone);
    if (points.length < 2) {
      // Fallback to circle using first point
      const d = distanceMeters(station.latitude, station.longitude, zone.latitude, zone.longitude);
      return d <= (zone.bufferMeters || 2000);
    }
    const P = { lat: station.latitude, lng: station.longitude };
    const buffer = zone.bufferMeters || 2000;
    for (let i = 0; i < points.length - 1; i++) {
      const d = distanceToSegmentMeters(P, points[i], points[i + 1]);
      if (d <= buffer) return true;
    }
    return false;
  }

  return false;
}

/**
 * For corridor zones: generate fetch sample points along the route
 * spaced approximately every `stepMeters` meters.
 * Used by the fetch automation to decide where to call Google Places.
 */
export function corridorFetchPoints(zone, stepMeters = 4000) {
  const points = parseCorridorPoints(zone);
  if (points.length < 2) return [{ latitude: zone.latitude, longitude: zone.longitude, radiusMeters: zone.radiusMeters || 5000 }];

  const fetchPoints = [];
  let accumulated = 0;
  fetchPoints.push({ latitude: points[0].lat, longitude: points[0].lng, radiusMeters: zone.radiusMeters || 5000 });

  for (let i = 0; i < points.length - 1; i++) {
    const A = points[i];
    const B = points[i + 1];
    const segLen = distanceMeters(A.lat, A.lng, B.lat, B.lng);
    let offset = accumulated === 0 ? stepMeters : stepMeters - accumulated;

    while (offset <= segLen) {
      const t = offset / segLen;
      fetchPoints.push({
        latitude: A.lat + t * (B.lat - A.lat),
        longitude: A.lng + t * (B.lng - A.lng),
        radiusMeters: zone.radiusMeters || 5000,
      });
      offset += stepMeters;
    }
    accumulated = segLen - (offset - stepMeters);
    if (accumulated < 0) accumulated = 0;
  }

  // Always include final endpoint
  const last = points[points.length - 1];
  const lastAdded = fetchPoints[fetchPoints.length - 1];
  if (distanceMeters(lastAdded.latitude, lastAdded.longitude, last.lat, last.lng) > 500) {
    fetchPoints.push({ latitude: last.lat, longitude: last.lng, radiusMeters: zone.radiusMeters || 5000 });
  }

  return fetchPoints;
}