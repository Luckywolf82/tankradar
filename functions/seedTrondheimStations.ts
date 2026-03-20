import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const TRONDHEIM_STATIONS = [
  { name: 'Circle K Tunga', chain: 'Circle K', address: 'Tungasletta', city: 'Trondheim', latitude: 63.4239, longitude: 10.4662 },
  { name: 'Circle K Strindheim', chain: 'Circle K', address: 'Innherredsveien', city: 'Trondheim', latitude: 63.4306, longitude: 10.4480 },
  { name: 'Circle K Øya', chain: 'Circle K', address: 'Elgeseter gate', city: 'Trondheim', latitude: 63.4208, longitude: 10.3935 },
  { name: 'Circle K Nidarvoll', chain: 'Circle K', address: 'Baard Iversens veg', city: 'Trondheim', latitude: 63.4010, longitude: 10.4035 },
  { name: 'Circle K Heimdal', chain: 'Circle K', address: 'Heimdalsvegen', city: 'Trondheim', latitude: 63.3505, longitude: 10.3563 },
  { name: 'Circle K Sandmoen', chain: 'Circle K', address: 'Sandmoen', city: 'Trondheim', latitude: 63.3178, longitude: 10.3606 },
  { name: 'Circle K Klett', chain: 'Circle K', address: 'E6 Klett', city: 'Trondheim', latitude: 63.3250, longitude: 10.3054 },
  { name: 'Circle K Stavset', chain: 'Circle K', address: 'Byåsen', city: 'Trondheim', latitude: 63.4032, longitude: 10.3261 },
  { name: 'Uno-X Moholt', chain: 'Uno-X', address: 'Vegamot', city: 'Trondheim', latitude: 63.4090, longitude: 10.4465 },
  { name: 'Uno-X Munkvoll', chain: 'Uno-X', address: 'Munkvollvegen', city: 'Trondheim', latitude: 63.4021, longitude: 10.3573 },
  { name: 'Uno-X Østre Rosten', chain: 'Uno-X', address: 'Østre Rosten', city: 'Trondheim', latitude: 63.3667, longitude: 10.3804 },
  { name: 'Uno-X Heimdal', chain: 'Uno-X', address: 'Heimdalsvegen', city: 'Trondheim', latitude: 63.3501, longitude: 10.3552 },
  { name: 'Uno-X Sluppen', chain: 'Uno-X', address: 'Bratsbergvegen', city: 'Trondheim', latitude: 63.3992, longitude: 10.4041 },
  { name: 'Uno-X Sandmoen', chain: 'Uno-X', address: 'Sandmoen', city: 'Trondheim', latitude: 63.3179, longitude: 10.3615 },
  { name: 'Uno-X Vikhammer', chain: 'Uno-X', address: 'Vikhammer', city: 'Vikhammer', latitude: 63.4403, longitude: 10.6386 },
  { name: 'Esso Moholt', chain: 'Esso', address: 'Moholt', city: 'Trondheim', latitude: 63.4087, longitude: 10.4460 },
  { name: 'Esso Strindheim', chain: 'Esso', address: 'Strindheim', city: 'Trondheim', latitude: 63.4300, longitude: 10.4475 },
  { name: 'Esso Sandmoen', chain: 'Esso', address: 'Heimdal', city: 'Trondheim', latitude: 63.3325, longitude: 10.3567 },
  { name: 'Esso Tiller', chain: 'Esso', address: 'Tiller', city: 'Trondheim', latitude: 63.3665, longitude: 10.3785 },
  { name: 'St1 Tiller', chain: 'St1', address: 'Østre Rosten', city: 'Trondheim', latitude: 63.3650, longitude: 10.3805 },
  { name: 'St1 Moholt', chain: 'St1', address: 'Vegamot', city: 'Trondheim', latitude: 63.4089, longitude: 10.4462 },
  { name: 'St1 Lade', chain: 'St1', address: 'Haakon VII gate', city: 'Trondheim', latitude: 63.4438, longitude: 10.4479 },
  { name: 'St1 Byåsen', chain: 'St1', address: 'Byåsen', city: 'Trondheim', latitude: 63.3998, longitude: 10.3337 },
  { name: 'YX Kjøpmannsgata', chain: 'YX', address: 'Kjøpmannsgata', city: 'Trondheim', latitude: 63.4317, longitude: 10.4032 },
  { name: 'YX Klæbu', chain: 'YX', address: 'Rydlandvegen', city: 'Klæbu', latitude: 63.3016, longitude: 10.4856 },
  { name: 'Best Klæbu', chain: 'Best', address: 'Bjørgen', city: 'Klæbu', latitude: 63.2979, longitude: 10.4810 },
  { name: 'Trønder Oil Tiller', chain: 'Trønder Oil', address: 'Torgardstrøa', city: 'Tiller', latitude: 63.3303, longitude: 10.3715 },
  { name: 'Trønder Oil Heggstadmoen', chain: 'Trønder Oil', address: 'Heggstadmoen', city: 'Heimdal', latitude: 63.3384, longitude: 10.3542 },
  { name: 'Bilhuset Ola Brun', chain: 'Bilhuset', address: 'Kjøpmannsgata', city: 'Trondheim', latitude: 63.4316, longitude: 10.4033 },
  { name: 'Klæbu Car & Gas', chain: 'Klæbu Car & Gas', address: 'Klæbu', city: 'Klæbu', latitude: 63.3016, longitude: 10.4858 },
  { name: 'Coop drivstoff Lade', chain: 'Coop', address: 'Haakon VII gate', city: 'Trondheim', latitude: 63.4435, longitude: 10.4476 },
  { name: 'Gasum biogass Tiller', chain: 'Gasum', address: 'Tiller', city: 'Trondheim', latitude: 63.3648, longitude: 10.3754 },
  { name: 'Truckstasjon Sandmoen', chain: 'Truckstasjon', address: 'Sandmoen', city: 'Trondheim', latitude: 63.3183, longitude: 10.3612 },
  { name: 'Truckstasjon Klett', chain: 'Truckstasjon', address: 'Klett', city: 'Trondheim', latitude: 63.3247, longitude: 10.3059 },
];

// Haversine distance
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c * 1000; // meters
}

// Simple name similarity (0-1)
function nameSimilarity(name1, name2) {
  const n1 = name1.toLowerCase().trim();
  const n2 = name2.toLowerCase().trim();
  if (n1 === n2) return 1.0;
  
  // Check if one contains significant parts of the other
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

    // Fetch existing stations
    const existingStations = await base44.entities.Station.list();
    
    let inserted = 0;
    let skipped = 0;
    const results = [];

    // Process each seed station
    for (const seedStation of TRONDHEIM_STATIONS) {
      let shouldInsert = true;
      let skipReason = null;

      // Check for existing stations within 150m
      for (const existing of existingStations) {
        const distanceM = calculateDistance(
          seedStation.latitude,
          seedStation.longitude,
          existing.latitude || 0,
          existing.longitude || 0
        );

        // Within 150m
        if (distanceM < 150) {
          // Check name similarity
          const nameSim = nameSimilarity(seedStation.name, existing.name || '');
          
          // Same chain + very close
          const sameChain = seedStation.chain && existing.chain && seedStation.chain.toLowerCase() === existing.chain.toLowerCase();
          
          if (nameSim > 0.7 || (sameChain && distanceM < 100)) {
            shouldInsert = false;
            skipReason = `existing_nearby: ${existing.name} (${Math.round(distanceM)}m)`;
            break;
          }
        }
      }

      if (shouldInsert) {
        try {
          await base44.entities.Station.create({
            name: seedStation.name,
            chain: seedStation.chain,
            address: seedStation.address,
            city: seedStation.city,
            latitude: seedStation.latitude,
            longitude: seedStation.longitude,
            sourceName: 'seed_trondheim',
            region: 'Trøndelag',
            status: 'active',
          });
          inserted++;
          results.push({ name: seedStation.name, status: 'inserted' });
        } catch (error) {
          skipped++;
          results.push({ name: seedStation.name, status: 'insert_failed', error: error.message });
        }
      } else {
        skipped++;
        results.push({ name: seedStation.name, status: 'skipped', reason: skipReason });
      }
    }

    const finalStationCount = await base44.entities.Station.list();

    return Response.json({
      success: true,
      seedListTotal: TRONDHEIM_STATIONS.length,
      inserted,
      skipped,
      totalStationCountAfter: finalStationCount.length,
      sampleResults: results.slice(0, 10),
      message: `Seed import complete: ${inserted} inserted, ${skipped} skipped.`,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});