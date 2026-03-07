import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// Haversine distance (meters)
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Chain normalization
function normalizeChain(name, addressStr) {
  const chains = {
    'Circle K': ['circle', 'cirkel'],
    'Uno-X': ['uno', 'unox'],
    'Esso': ['esso'],
    'Shell': ['shell'],
    'Statoil': ['statoil', 'stasjon', 'st.'],
    'OKQ8': ['okq8'],
  };
  
  const searchStr = `${name} ${addressStr}`.toLowerCase();
  for (const [chain, patterns] of Object.entries(chains)) {
    if (patterns.some(p => searchStr.includes(p))) {
      return chain;
    }
  }
  return null;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }
    
    const body = await req.json();
    const { 
      batchRows, 
      batchIndex, 
      dedupRadius = 150, 
      chainNormalization = true, 
      dryRun = false 
    } = body;
    
    if (!Array.isArray(batchRows) || batchRows.length === 0) {
      return Response.json({ error: 'batchRows must be a non-empty array' }, { status: 400 });
    }
    
    // Fetch all existing stations for dedup
    const existingStations = await base44.asServiceRole.entities.Station.list();
    
    // Build geospatial index
    const stationsByProximity = {};
    for (const station of existingStations) {
      const key = `${Math.round(station.latitude)}_${Math.round(station.longitude)}`;
      if (!stationsByProximity[key]) stationsByProximity[key] = [];
      stationsByProximity[key].push(station);
    }
    
    const results = {
      batchIndex,
      batchRows: batchRows.length,
      inserted: 0,
      skipped: 0,
      conflicts: 0,
      dryRun,
      timestamp: new Date().toISOString(),
      details: []
    };
    
    // Process each row in batch
    const toInsert = [];
    for (const sourceRecord of batchRows) {
      const { name, address, city, latitude, longitude, sourceName, sourceStationId } = sourceRecord;
      
      // Validate required fields
      if (!name || latitude === undefined || longitude === undefined || !sourceName || !sourceStationId) {
        results.skipped++;
        results.details.push({ sourceStationId: sourceStationId || 'unknown', reason: 'invalid_fields' });
        continue;
      }
      
      // Check for proximity match using geospatial index
      let isProximityDuplicate = false;
      for (let dlat = -1; dlat <= 1; dlat++) {
        for (let dlon = -1; dlon <= 1; dlon++) {
          const checkKey = `${Math.round(latitude) + dlat}_${Math.round(longitude) + dlon}`;
          const candidates = stationsByProximity[checkKey] || [];
          
          for (const existing of candidates) {
            const distance = haversineDistance(latitude, longitude, existing.latitude, existing.longitude);
            if (distance < dedupRadius) {
              isProximityDuplicate = true;
              break;
            }
          }
          if (isProximityDuplicate) break;
        }
        if (isProximityDuplicate) break;
      }
      
      if (isProximityDuplicate) {
        results.skipped++;
        results.conflicts++;
        results.details.push({ sourceStationId, reason: 'proximity_duplicate' });
        continue;
      }
      
      // Prepare station record
      const stationData = {
        name,
        address: address || null,
        city: city || null,
        latitude,
        longitude,
        sourceName,
        sourceStationId,
        normalizedName: name.toLowerCase().trim(),
      };
      
      // Apply chain normalization
      if (chainNormalization) {
        const detectedChain = normalizeChain(name, address || '');
        if (detectedChain) {
          stationData.chain = detectedChain;
        }
      }
      
      toInsert.push(stationData);
    }
    
    // Insert if not dryRun
    if (!dryRun) {
      for (const stationData of toInsert) {
        try {
          await base44.asServiceRole.entities.Station.create(stationData);
          results.inserted++;
        } catch (err) {
          results.skipped++;
          results.details.push({ sourceStationId: stationData.sourceStationId, reason: 'insert_error' });
        }
      }
    } else {
      // DryRun: just count what would be inserted
      results.inserted = toInsert.length;
    }
    
    return Response.json(results);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});