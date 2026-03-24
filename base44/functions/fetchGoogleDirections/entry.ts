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

    // Use Routes API (New) — the legacy Directions API is not enabled on this project key.
    const routesUrl = `https://routes.googleapis.com/directions/v2:computeRoutes`;

    const body = {
      origin: { location: { latLng: { latitude: parseFloat(origin.split(",")[0]), longitude: parseFloat(origin.split(",")[1]) } } },
      destination: { address: destination },
      travelMode: "DRIVE",
      routingPreference: "TRAFFIC_UNAWARE",
      polylineEncoding: "ENCODED_POLYLINE",
      languageCode: "no",
    };

    const res = await fetch(routesUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.legs.distanceMeters,routes.legs.duration",
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();

    if (!data.routes || data.routes.length === 0) {
      return Response.json({ status: "NOT_FOUND", routes: [], error: data.error?.message || "No routes found" });
    }

    // Normalise to Directions-API-like shape so the frontend needs no changes
    const route = data.routes[0];
    const leg = route.legs?.[0];
    const distanceM = route.distanceMeters || 0;
    const durationSec = parseInt(route.duration?.replace("s", "") || "0", 10);

    return Response.json({
      status: "OK",
      routes: [{
        overview_polyline: { points: route.polyline.encodedPolyline },
        legs: [{
          distance: { text: `${(distanceM / 1000).toFixed(1)} km`, value: distanceM },
          duration: { text: `${Math.round(durationSec / 60)} min`, value: durationSec },
        }],
      }],
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
});