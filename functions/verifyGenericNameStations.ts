import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// Generiske prefixer som typisk etterfølges av stedsnavn
const GENERIC_PREFIXES = [
  'Tanken ', 'Tank ', 'Bensin ', 'Stasjonen ', 'Pumpen ',
  'Drivstoff ', 'Automat ', 'Pumpe ',
];

// Trekker ut stedsdelen fra et stasjonsnavn
// f.eks. "Tanken Hjartdal" → "Hjartdal"
const extractPlaceFromName = (name) => {
  const n = (name || '').trim();
  for (const prefix of GENERIC_PREFIXES) {
    if (n.toLowerCase().startsWith(prefix.toLowerCase())) {
      const rest = n.slice(prefix.length).trim();
      if (rest.length > 1) return rest;
    }
  }
  return null;
};

// Normaliserer til sammenligning
const norm = (s) => (s || '').toLowerCase()
  .replace(/[æ]/g, 'ae').replace(/[ø]/g, 'o').replace(/[å]/g, 'a')
  .replace(/[-_]/g, ' ').trim();

// Sjekker om stedsnavn fra navn stemmer med by/areaLabel fra geocoding
const checkNameMatchesLocation = (station) => {
  const placeFromName = extractPlaceFromName(station.name);
  if (!placeFromName) return { hasPlace: false };

  const city = station.city || '';
  const areaLabel = station.areaLabel || '';
  const address = station.address || '';

  const nPlace = norm(placeFromName);
  const nCity = norm(city);
  const nArea = norm(areaLabel);
  const nAddress = norm(address);

  const matchesCity = nCity && (nCity.includes(nPlace) || nPlace.includes(nCity));
  const matchesArea = nArea && (nArea.includes(nPlace) || nPlace.includes(nArea));
  const matchesAddress = nAddress && nAddress.includes(nPlace);

  const verified = matchesCity || matchesArea || matchesAddress;

  return {
    hasPlace: true,
    placeFromName,
    city,
    areaLabel,
    verified,
    matchedOn: verified
      ? (matchesCity ? 'city' : matchesArea ? 'areaLabel' : 'address')
      : null,
  };
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const dryRun = body.dryRun !== false; // default: dryRun=true (ingen skriving)

    // Hent alle stasjoner med paginering
    let stations = [];
    let page = 0;
    const pageSize = 500;
    while (true) {
      const batch = await base44.asServiceRole.entities.Station.list('-created_date', pageSize, page * pageSize);
      if (!batch || batch.length === 0) break;
      stations = stations.concat(batch);
      if (batch.length < pageSize) break;
      page++;
    }

    // Filtrer ut kun stasjoner med generiske prefixer
    const genericStations = stations.filter(s => extractPlaceFromName(s.name) !== null);

    const results = {
      verified: [],       // stedsnavn stemmer med geocodet by/areaLabel
      mismatch: [],       // stedsnavn stemmer IKKE — mulig feil eller manglende geocoding
      noGeocode: [],      // mangler city/postalCode — geocoding ikke kjørt ennå
      alreadyHasAreaLabel: [], // areaLabel allerede satt korrekt
    };

    const updates = []; // samle oppdateringer hvis !dryRun

    for (const station of genericStations) {
      const check = checkNameMatchesLocation(station);
      const placeFromName = check.placeFromName;

      if (!station.city && !station.postalCode) {
        results.noGeocode.push({
          id: station.id,
          name: station.name,
          placeFromName,
          note: 'Mangler geocoding — kjør geocodeStationsFromCoordinates først',
        });
        continue;
      }

      if (station.areaLabel && norm(station.areaLabel) === norm(placeFromName)) {
        results.alreadyHasAreaLabel.push({
          id: station.id,
          name: station.name,
          areaLabel: station.areaLabel,
          city: station.city,
        });
        continue;
      }

      if (check.verified) {
        results.verified.push({
          id: station.id,
          name: station.name,
          placeFromName,
          matchedOn: check.matchedOn,
          city: check.city,
          areaLabel: check.areaLabel,
        });

        // Sett areaLabel fra navn hvis ikke allerede satt
        if (!station.areaLabel && !dryRun) {
          updates.push({ id: station.id, update: { areaLabel: placeFromName } });
        }
      } else {
        results.mismatch.push({
          id: station.id,
          name: station.name,
          placeFromName,
          geocodedCity: check.city,
          geocodedAreaLabel: check.areaLabel,
          note: check.city
            ? `Stedsnavn i navn ("${placeFromName}") matcher ikke geocodet by ("${check.city}")`
            : 'Ingen match funnet',
        });
      }
    }

    // Utfør oppdateringer (hvis ikke dryRun)
    let updatedCount = 0;
    if (!dryRun) {
      for (const { id, update } of updates) {
        await base44.asServiceRole.entities.Station.update(id, update);
        updatedCount++;
        await new Promise(r => setTimeout(r, 30));
      }
    }

    console.log(`[verifyGenericNames] Totalt: ${genericStations.length} | Verifisert: ${results.verified.length} | Mismatch: ${results.mismatch.length} | Mangler geocode: ${results.noGeocode.length} | dryRun: ${dryRun}`);

    return Response.json({
      success: true,
      dryRun,
      summary: {
        totalGenericStations: genericStations.length,
        verified: results.verified.length,
        mismatch: results.mismatch.length,
        noGeocode: results.noGeocode.length,
        alreadyHasAreaLabel: results.alreadyHasAreaLabel.length,
        areaLabelUpdated: updatedCount,
      },
      details: {
        verified: results.verified,
        mismatch: results.mismatch,
        noGeocode: results.noGeocode.slice(0, 20),
        alreadyHasAreaLabel: results.alreadyHasAreaLabel.slice(0, 20),
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});