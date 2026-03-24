/**
 * fetchGoogleDirections
 *
 * Geocodes destination with GPS-position bias (improves Norwegian place name resolution),
 * then returns a straight-line interpolated polyline (Directions/Routes API not enabled on this key).
 *
 * KOMPROMISS: Directions API and Routes API are not enabled on the project's API key.
 * Fallback: Geocoding API (active) + straight-line interpolation.
 * Impact: polyline follows straight line, not roads. Sufficient for 2 km corridor station matching.
 * Granularity: unaffected — station price data is from CSP, not this function.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { origin, destination } = await req.json();

    if (!origin || !destination) {
      return Response.json({ error: 'origin and destination required' }, { status: 400 });
    }

    const apiKey = Deno.env.get('GOOGLE_PLACES_API_KEY');
    if (!apiKey) return Response.json({ error: 'API key not configured' }, { status: 500 });

    const [originLat, originLon] = origin.split(",").map(Number);

    // Attempt 1: geocode with GPS-position proximity bias.
    // The `location` + `radius` params bias results toward the user's area, which significantly
    // improves resolution of common Norwegian district names (e.g. "Heimdal", "Moholt").
    async function geocode(address, withBias) {
      let url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&region=no&language=no`;
      if (withBias) {
        url += `&location=${originLat},${originLon}&radius=150000`;
      }
      url += `&key=${apiKey}`;
      const res = await fetch(url);
      return res.json();
    }

    // Try with bias first, then without (+ "Norge" suffix), then bare fallback
    let geoData = await geocode(destination, true);
    if (geoData.status !== "OK" || !geoData.results?.length) {
      geoData = await geocode(destination + ", Norge", false);
    }
    if (geoData.status !== "OK" || !geoData.results?.length) {
      geoData = await geocode(destination, false);
    }

    if (geoData.status !== "OK" || !geoData.results?.length) {
      return Response.json({ status: "NOT_FOUND", routes: [], error: "Destination not found" });
    }

    const destLat = geoData.results[0].geometry.location.lat;
    const destLon = geoData.results[0].geometry.location.lng;

    // Build a straight-line polyline with 10 interpolated points
    const steps = 10;
    const points = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      points.push({
        lat: originLat + (destLat - originLat) * t,
        lon: originLon + (destLon - originLon) * t,
      });
    }

    // Encode as Google polyline (standard algorithm)
    function encodeCoord(delta) {
      let value = Math.round(delta * 1e5);
      value = value < 0 ? ~(value << 1) : value << 1;
      let encoded = "";
      while (value >= 0x20) {
        encoded += String.fromCharCode((0x20 | (value & 0x1f)) + 63);
        value >>= 5;
      }
      encoded += String.fromCharCode(value + 63);
      return encoded;
    }

    let polylineStr = "";
    let prevLat = 0;
    let prevLon = 0;
    for (const pt of points) {
      polylineStr += encodeCoord(pt.lat - prevLat) + encodeCoord(pt.lon - prevLon);
      prevLat = pt.lat;
      prevLon = pt.lon;
    }

    // Haversine distance
    const R = 6371;
    const dLat = (destLat - originLat) * Math.PI / 180;
    const dLon = (destLon - originLon) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
      Math.cos(originLat * Math.PI / 180) * Math.cos(destLat * Math.PI / 180) *
      Math.sin(dLon / 2) ** 2;
    const distKm = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const durationMin = Math.round(distKm / 60 * 60);

    return Response.json({
      status: "OK",
      routes: [{
        overview_polyline: { points: polylineStr },
        legs: [{
          distance: { text: `${distKm.toFixed(1)} km`, value: Math.round(distKm * 1000) },
          duration: { text: `${durationMin} min`, value: durationMin * 60 },
        }],
      }],
      _note: "straight_line_approximation",
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
});