import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// Kjente norske byer/kommuner - konservativ liste
const KNOWN_CITIES = [
  'Oslo',
  'Bergen',
  'Trondheim',
  'Stavanger',
  'Kristiansand',
  'Tromsø',
  'Ålesund',
  'Drammen',
  'Fredrikstad',
  'Sarpsborg',
  'Skien',
  'Lilehammer',
  'Sandefjord',
  'Moss',
  'Hamar',
  'Gjøvik',
  'Tonsberg',
  'Horten',
  'Larvik',
  'Porsgrunn',
  'Halden',
  'Arendal',
  'Grenland',
  'Mandal',
  'Kristiansund',
  'Molde',
  'Sognefjord',
  'Bodø',
  'Tromsø',
  'Alta',
  'Vadsø',
  'Kirkenes',
  'Stavanger',
  'Sandnes',
  'Sola',
  'Tananger',
  'Bryne',
  'Hundvåg',
  'Kåsen'
];

// Kjente områdenavn - brukes når city er usikker
const KNOWN_AREAS = {
  // Trondheim areas
  'Moholt': 'Trondheim',
  'Heimdal': 'Trondheim',
  'Tiller': 'Trondheim',
  'Lade': 'Trondheim',
  'Sluppen': 'Trondheim',
  'Saupstad': 'Trondheim',
  'Byåsen': 'Trondheim',
  'Strinda': 'Trondheim',
  'Malvik': 'Trondheim',
  'Melhus': 'Trondheim',
  'Sør-Trøndelag': 'Trondheim',
  
  // Oslo areas
  'Frogner': 'Oslo',
  'Vålerenga': 'Oslo',
  'Grünerløkka': 'Oslo',
  'Bislett': 'Oslo',
  'Tøyen': 'Oslo',
  'Furuset': 'Oslo',
  'Nydalen': 'Oslo',
  
  // Bergen areas
  'Laksevåg': 'Bergen',
  'Fana': 'Bergen',
  'Ytrebygda': 'Bergen',
  
  // General areas
  'Sentrum': null, // Too generic
  'Sentral': null,
  'Nøtterøy': 'Nøtterøy',
  'Åmli': 'Åmli'
};

// Normaliserer navn for sammenlikning
const normalizeName = (name) => {
  if (!name) return '';
  return name.toLowerCase().trim();
};

// Finner city fra navn
const findCityFromName = (stationName) => {
  if (!stationName) return null;

  const normalized = normalizeName(stationName);

  // Sjekk om navn starter med eller inneholder kjent by
  for (const city of KNOWN_CITIES) {
    const normalizedCity = normalizeName(city);

    // Regel 1: Navn starter med by
    if (normalized.startsWith(normalizedCity)) {
      return city;
    }

    // Regel 2: By er første ord og tydelig atskilt
    const firstWord = normalized.split(/[\s\-–—]/)[0];
    if (firstWord === normalizedCity) {
      return city;
    }

    // Regel 3: "By Stasjon" eller "By-navn"
    if (normalized.includes(`${normalizedCity} `) || normalized.includes(`${normalizedCity}-`)) {
      return city;
    }
  }

  return null;
};

// Finner områdenavn fra navn
const findAreaFromName = (stationName) => {
  if (!stationName) return null;

  const normalized = normalizeName(stationName);

  for (const [area, relatedCity] of Object.entries(KNOWN_AREAS)) {
    const normalizedArea = normalizeName(area);

    // Regel 1: Navn starter med område
    if (normalized.startsWith(normalizedArea)) {
      return { area, relatedCity };
    }

    // Regel 2: Område er første ord og tydelig atskilt
    const firstWord = normalized.split(/[\s\-–—]/)[0];
    if (firstWord === normalizedArea) {
      return { area, relatedCity };
    }

    // Regel 3: "Område Stasjon"
    if (normalized.includes(`${normalizedArea} `)) {
      return { area, relatedCity };
    }
  }

  return null;
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Hent alle Station-records
    const stations = await base44.asServiceRole.entities.Station.list();

    const results = {
      cityFilled: [],
      areaDetected: [],
      cityFromArea: [],
      noLocationDetected: [],
      errors: []
    };

    // Prosesser hver station
    for (const station of stations) {
      try {
        const updates = {};
        let shouldUpdate = false;

        // Hvis city mangler - prøv å finne fra navn
        if (!station.city || station.city === 'unknown' || station.city === null) {
          const detectedCity = findCityFromName(station.name);

          if (detectedCity) {
            updates.city = detectedCity;
            shouldUpdate = true;
            results.cityFilled.push({
              id: station.id,
              name: station.name,
              detectedCity
            });
          } else {
            // Prøv område-matching
            const areaMatch = findAreaFromName(station.name);

            if (areaMatch) {
              updates.areaLabel = areaMatch.area;
              shouldUpdate = true;

              if (areaMatch.relatedCity) {
                // Hvis område har relatert city, sett det
                updates.city = areaMatch.relatedCity;
                results.cityFromArea.push({
                  id: station.id,
                  name: station.name,
                  areaLabel: areaMatch.area,
                  detectedCity: areaMatch.relatedCity
                });
              } else {
                results.areaDetected.push({
                  id: station.id,
                  name: station.name,
                  areaLabel: areaMatch.area
                });
              }
            } else {
              results.noLocationDetected.push({
                id: station.id,
                name: station.name
              });
            }
          }
        } else if (!station.areaLabel) {
          // City eksisterer, men prøv å finne område
          const areaMatch = findAreaFromName(station.name);

          if (areaMatch) {
            updates.areaLabel = areaMatch.area;
            shouldUpdate = true;
            results.areaDetected.push({
              id: station.id,
              name: station.name,
              areaLabel: areaMatch.area,
              existingCity: station.city
            });
          }
        }

        // Oppdater hvis nødvendig
        if (shouldUpdate) {
          await base44.asServiceRole.entities.Station.update(station.id, updates);
        }
      } catch (error) {
        results.errors.push({
          stationId: station.id,
          error: error.message
        });
      }
    }

    return Response.json({
      success: true,
      summary: {
        totalProcessed: stations.length,
        cityFilled: results.cityFilled.length,
        areaDetected: results.areaDetected.length,
        cityFromArea: results.cityFromArea.length,
        noLocationDetected: results.noLocationDetected.length,
        errors: results.errors.length,
        knownCitiesUsed: KNOWN_CITIES.length,
        knownAreasUsed: Object.keys(KNOWN_AREAS).length
      },
      details: results
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});