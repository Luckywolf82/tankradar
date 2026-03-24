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

    const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&mode=driving&language=no&key=${apiKey}`;

    const res = await fetch(url);
    const data = await res.json();

    return Response.json(data);
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
});