import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();
    const { latitude, longitude, radiusMeters = 10000 } = payload;

    if (!latitude || !longitude) {
      return Response.json({ 
        error: 'Missing required fields: latitude, longitude' 
      }, { status: 400 });
    }

    const apiKey = Deno.env.get('GOOGLE_PLACES_API_KEY');
    if (!apiKey) {
      return Response.json({ error: 'API key not configured' }, { status: 500 });
    }

    // Query Google Places for gas stations
    const gpUrl = new URL('https://maps.googleapis.com/maps/api/place/nearbysearch/json');
    gpUrl.searchParams.set('location', `${latitude},${longitude}`);
    gpUrl.searchParams.set('radius', radiusMeters);
    gpUrl.searchParams.set('type', 'gas_station');
    gpUrl.searchParams.set('key', apiKey);

    const gpRes = await fetch(gpUrl.toString());
    if (!gpRes.ok) {
      return Response.json({ 
        error: `Google Places API error: ${gpRes.status}` 
      }, { status: gpRes.status });
    }

    const gpData = await gpRes.json();
    
    // Transform raw results into picker-friendly format (read-only, no side effects)
    const results = (gpData.results || []).map(place => ({
      place_id: place.place_id,
      name: place.name,
      latitude: place.geometry.location.lat,
      longitude: place.geometry.location.lng,
      formatted_address: place.formatted_address,
      business_type: place.types?.[0] || 'gas_station', // e.g., 'gas_station', 'convenience_store'
      rating: place.rating || null,
      user_ratings_total: place.user_ratings_total || 0,
      opening_hours_open_now: place.opening_hours?.open_now || null
    }));

    return Response.json({
      status: 'ok',
      results_count: results.length,
      results // Raw results for picker display, no persistence
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});