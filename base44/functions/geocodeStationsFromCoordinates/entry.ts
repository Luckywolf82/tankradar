import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const GOOGLE_API_KEY = Deno.env.get('GOOGLE_PLACES_API_KEY');

// Map Norwegian fylke/region names from Google to our enum values
const REGION_MAP = {
  'Oslo': 'Oslo og Akershus',
  'Akershus': 'Oslo og Akershus',
  'Innlandet': 'Innlandet',
  'Viken': 'Viken',
  'Vestfold og Telemark': 'Vestfold og Telemark',
  'Telemark': 'Vestfold og Telemark',
  'Vestfold': 'Vestfold og Telemark',
  'Agder': 'Agder',
  'Rogaland': 'Rogaland',
  'Vestland': 'Vestland',
  'Hordaland': 'Vestland',
  'Sogn og Fjordane': 'Vestland',
  'Møre og Romsdal': 'Møre og Romsdal',
  'Trøndelag': 'Trøndelag',
  'Sør-Trøndelag': 'Trøndelag',
  'Nord-Trøndelag': 'Trøndelag',
  'Nordland': 'Nordland',
  'Troms': 'Troms',
  'Troms og Finnmark': 'Troms',
  'Finnmark': 'Finnmark',
};

const normalizeRegion = (components) => {
  for (const comp of components) {
    if (comp.types.includes('administrative_area_level_1')) {
      const name = comp.long_name;
      for (const [key, val] of Object.entries(REGION_MAP)) {
        if (name.toLowerCase().includes(key.toLowerCase())) return val;
      }
    }
  }
  return null;
};

const extractField = (components, type) => {
  const comp = components.find(c => c.types.includes(type));
  return comp ? comp.long_name : null;
};

Deno.serve(async (req) => {
  try {
    // Støtter både admin-bruker (fra frontend) og scheduled automation (uten bruker)
    const base44 = createClientFromRequest(req);
    const isScheduled = req.headers.get('x-automation-source') === 'scheduled';

    if (!isScheduled) {
      const user = await base44.auth.me();
      if (user?.role !== 'admin') {
        return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
      }
    }

    const body = await req.json().catch(() => ({}));
    // Batchstørrelse: 80 stk × ~120ms = ~10 sek — godt innenfor gateway timeout
    const batchSize = body.batchSize || 80;
    const delayMs = 120; // ~8 req/s, safe for Google Geocoding API

    // Hent alle stasjoner som mangler adressedata men har koordinater (paginert)
    let allStations = [];
    let page = 0;
    while (true) {
      const batch = await base44.asServiceRole.entities.Station.list('-created_date', 500, page * 500);
      if (!batch || batch.length === 0) break;
      allStations = allStations.concat(batch);
      if (batch.length < 500) break;
      page++;
    }

    const toGeocode = allStations.filter(s =>
      s.latitude && s.longitude &&
      (!s.address || !s.city || !s.postalCode || !s.region)
    );

    // Ta kun én batch per kjøring
    const batch = toGeocode.slice(0, batchSize);
    const remaining = toGeocode.length - batch.length;

    const results = { updated: [], failed: [] };

    console.log(`[geocode] Batch: ${batch.length} stk — gjenstår etter denne: ${remaining}`);

    for (const station of batch) {
      try {
        const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${station.latitude},${station.longitude}&language=no&key=${GOOGLE_API_KEY}`;
        const res = await fetch(url);
        const data = await res.json();
        console.log("Google API Response for station:", station.id, JSON.stringify(data));


        if (data.status !== 'OK' || !data.results?.length) {
          results.failed.push({ id: station.id, name: station.name, reason: data.status });
          await new Promise(r => setTimeout(r, delayMs));
          continue;
        }

        // Finn beste result: foretrekk ett med postal_code fremfor results[0] som ofte er POI uten full adresse
        const best = data.results.find(r =>
          r.address_components.some(c => c.types.includes('postal_code'))
        ) || data.results[0];
        const components = best.address_components;
        const updates = {};

        if (!station.address) {
          const streetNumber = extractField(components, 'street_number');
          const route = extractField(components, 'route');
          if (route) updates.address = streetNumber ? `${route} ${streetNumber}` : route;
        }
        if (!station.city) {
          const city =
            extractField(components, 'locality') ||
            extractField(components, 'postal_town') ||
            extractField(components, 'administrative_area_level_2');
          if (city) updates.city = city;
        }
        if (!station.postalCode) {
          const postal = extractField(components, 'postal_code');
          if (postal) updates.postalCode = postal;
        }
        if (!station.region) {
          const region = normalizeRegion(components);
          if (region) updates.region = region;
        }

        if (Object.keys(updates).length > 0) {
          await base44.asServiceRole.entities.Station.update(station.id, updates);
          results.updated.push({ id: station.id, name: station.name, updates });
        }

        await new Promise(r => setTimeout(r, delayMs));
      } catch (err) {
        results.failed.push({ id: station.id, name: station.name, reason: err.message });
        await new Promise(r => setTimeout(r, delayMs));
      }
    }

    console.log(`[geocode] Ferdig batch: oppdatert=${results.updated.length}, feilet=${results.failed.length}, gjenstår=${remaining}`);

    return Response.json({
      success: true,
      summary: {
        totalNeedingGeocode: toGeocode.length,
        batchProcessed: batch.length,
        updated: results.updated.length,
        failed: results.failed.length,
        remaining,
        done: remaining === 0,
      },
      details: {
        updated: results.updated.slice(0, 20),
        failed: results.failed.slice(0, 20),
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});