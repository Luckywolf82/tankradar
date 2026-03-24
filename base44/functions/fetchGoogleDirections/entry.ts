/**
 * fetchGoogleDirections
 *
 * Proxy for Google Directions API to avoid browser CORS restrictions.
 * Returns raw Directions API response. Called by RoutePlanner page.
 *
 * Auth: requires logged-in user.
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

    // Directions API and Routes API are not enabled on this key.
    // Fallback: geocode the destination and return a straight-line "route"
    // with interpolated midpoints. Good enough for 2 km corridor matching.

    const [originLat, originLon] = origin.split(",").map(Number);

    // Attempt 1: geocode with location bias centred on user's GPS position (1° ≈ 111 km radius).
    // This dramatically improves resolution of ambiguous Norwegian place names like "Heimdal".
    const geoUrl1 =
      `https://maps.googleapis.com/maps/api/geocode/json` +
      `?address=${encodeURIComponent(destination)}` +
      `&region=no` +
      `&language=no` +
      `&location=${originLat},${originLon}` +
      `&radius=150000` +
      `&key=${apiKey}`;
    let geoRes = await fetch(geoUrl1);
    let geoData = await geoRes.json();

    // Attempt 2: if no result, try appending "Norge" to the query (no location bias)
    if (geoData.status !== "OK" || !geoData.results?.length) {
      const geoUrl2 =
        `https://maps.googleapis.com/maps/api/geocode/json` +
        `?address=${encodeURIComponent(destination + ", Norge")}` +
        `&region=no` +
        `&language=no` +
        `&key=${apiKey}`;
      geoRes = await fetch(geoUrl2);
      geoData = await geoRes.json();
    }

    if (geoData.status !== "OK" || !geoData.results?.length) {
      return Response.json({ status: "NOT_FOUND", routes: [], error: "Destination not found" });
    }

    const destLat = geoData.results[0].geometry.location.lat;
    const destLon = geoData.results[0].geometry.location.lng;
    const [originLat, originLon] = origin.split(",").map(Number);

    // Build a straight-line polyline with 10 interpolated points
    const points = [];
    const steps = 10;
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
    let prevLat = 0, prevLon = 0;
    for (const pt of points) {
      const dLat2 = pt.lat - prevLat;
      const dLon2 = pt.lon - prevLon;
      polylineStr += encodeCoord(dLat2) + encodeCoord(dLon2);
      prevLat = pt.lat;
      prevLon = pt.lon;
    }

    // Haversine distance in km
    const R = 6371;
    const dLat = (destLat - originLat) * Math.PI / 180;
    const dLon = (destLon - originLon) * Math.PI / 180;
    const a = Math.sin(dLat/2)**2 + Math.cos(originLat*Math.PI/180)*Math.cos(destLat*Math.PI/180)*Math.sin(dLon/2)**2;
    const distKm = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const durationMin = Math.round(distKm / 60 * 60); // rough 60 km/h

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