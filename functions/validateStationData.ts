import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c * 1000;
}

function nameSimilarity(name1, name2) {
  const n1 = (name1 || '').toLowerCase().trim();
  const n2 = (name2 || '').toLowerCase().trim();
  if (n1 === n2) return 1.0;
  
  const parts1 = n1.split(/[\s-]/);
  const parts2 = n2.split(/[\s-]/);
  let matches = 0;
  parts1.forEach(p => {
    if (p.length > 2 && parts2.some(p2 => p2.includes(p) || p.includes(p2))) {
      matches++;
    }
  });
  return matches > 0 ? Math.min(matches / Math.max(parts1.length, parts2.length), 1.0) : 0;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const stations = await base44.entities.Station.list();

    // Validation checks
    const missingFields = [];
    const possibleDuplicates = [];
    const almostLike = [];

    // Check 1: Missing fields
    stations.forEach(station => {
      const missing = [];
      if (!station.name) missing.push('name');
      if (!station.chain) missing.push('chain');
      if (!station.address) missing.push('address');
      if (!station.city) missing.push('city');
      if (station.latitude === null || station.latitude === undefined) missing.push('latitude');
      if (station.longitude === null || station.longitude === undefined) missing.push('longitude');
      
      if (missing.length > 0) {
        missingFields.push({
          id: station.id,
          name: station.name || '(unnamed)',
          missing,
        });
      }
    });

    // Check 2: Exact duplicates and near-duplicates (50m within same chain)
    for (let i = 0; i < stations.length; i++) {
      for (let j = i + 1; j < stations.length; j++) {
        const s1 = stations[i];
        const s2 = stations[j];

        // Skip if either missing coordinates
        if (!s1.latitude || !s1.longitude || !s2.latitude || !s2.longitude) continue;

        const distM = calculateDistance(s1.latitude, s1.longitude, s2.latitude, s2.longitude);
        const nameSim = nameSimilarity(s1.name, s2.name);
        const sameChain = s1.chain && s2.chain && s1.chain.toLowerCase() === s2.chain.toLowerCase();

        // Exact duplicate: same name + same location (<50m)
        if (nameSim === 1.0 && distM < 50) {
          possibleDuplicates.push({
            type: 'exact_duplicate',
            station1: { id: s1.id, name: s1.name, chain: s1.chain },
            station2: { id: s2.id, name: s2.name, chain: s2.chain },
            distanceM: Math.round(distM),
          });
        }

        // Very similar name + same chain + very close (<50m)
        if (nameSim > 0.85 && sameChain && distM < 50) {
          almostLike.push({
            type: 'similar_name_same_chain',
            station1: { id: s1.id, name: s1.name, chain: s1.chain },
            station2: { id: s2.id, name: s2.name, chain: s2.chain },
            distanceM: Math.round(distM),
            nameSimilarity: Math.round(nameSim * 100),
          });
        }
      }
    }

    // Check 3: Seed vs non-seed distribution
    const seedStations = stations.filter(s => s.sourceName === 'seed_trondheim');
    const otherStations = stations.filter(s => s.sourceName !== 'seed_trondheim');

    // Check 4: Stations in seed area (Trondheim) that might be related
    const trondheimSeeds = seedStations.filter(s => s.city === 'Trondheim' || s.city === 'Klæbu' || s.city === 'Tiller' || s.city === 'Vikhammer' || s.city === 'Heimdal');
    const trondheimOthers = otherStations.filter(s => 
      (s.city && (s.city.includes('Trondheim') || s.city.includes('Klæbu') || s.city.includes('Tiller') || s.city.includes('Heimdal') || s.city.includes('Vikhammer')))
    );

    return Response.json({
      totalStations: stations.length,
      seedStations: seedStations.length,
      otherStations: otherStations.length,
      stats: {
        stationsWithMissingFields: missingFields.length,
        possibleExactDuplicates: possibleDuplicates.length,
        almostLikeStations: almostLike.length,
      },
      missingFields: missingFields.slice(0, 20),
      possibleDuplicates: possibleDuplicates.slice(0, 10),
      almostLike: almostLike.slice(0, 10),
      trondheimCoverage: {
        seedStationsInArea: trondheimSeeds.length,
        otherStationsInArea: trondheimOthers.length,
      },
      message: 'Station data validation complete',
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});