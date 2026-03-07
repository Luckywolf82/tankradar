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

// String similarity (simple)
function stringSimilarity(a, b) {
  const aLower = (a || '').toLowerCase().trim();
  const bLower = (b || '').toLowerCase().trim();
  if (aLower === bLower) return 1;
  if (!aLower || !bLower) return 0;
  const longer = aLower.length > bLower.length ? aLower : bLower;
  const shorter = aLower.length > bLower.length ? bLower : aLower;
  if (longer.includes(shorter)) return 0.85;
  return 0;
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
    const { sourceList, dedupRadius = 150, chainNormalization = true, dryRun = false, batchSize = 250, seedBatch } = body;
    
    if (!Array.isArray(sourceList) || sourceList.length === 0) {
      return Response.json({ error: 'sourceList must be a non-empty array' }, { status: 400 });
    }
    
    // Fetch all existing stations once
    const existingStations = await base44.asServiceRole.entities.Station.list();
    
    // Build geospatial index for faster lookup
    const stationsByProximity = {};
    for (const station of existingStations) {
      const key = `${Math.round(station.latitude)}_${Math.round(station.longitude)}`;
      if (!stationsByProximity[key]) stationsByProximity[key] = [];
      stationsByProximity[key].push(station);
    }
    
    const results = {
      totalRead: sourceList.length,
      inserted: 0,
      skipped: 0,
      conflicts: 0,
      dryRun,
      timestamp: new Date().toISOString(),
    };
    
    // Process in batches to avoid CPU timeout
    for (let batchStart = 0; batchStart < sourceList.length; batchStart += batchSize) {
      const batchEnd = Math.min(batchStart + batchSize, sourceList.length);
      const batch = sourceList.slice(batchStart, batchEnd);
      
      // Process each source record in batch
      for (const sourceRecord of batch) {
        const { name, address, city, latitude, longitude, sourceName, sourceStationId } = sourceRecord;
        
        // Validate required fields
        if (!name || latitude === undefined || longitude === undefined || !sourceName || !sourceStationId) {
          results.skipped++;
          continue;
        }
      
        // Quick proximity check: only scan grid cells nearby
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
        
        // Insert or track for insertion
        if (!dryRun) {
          await base44.asServiceRole.entities.Station.create(stationData);
        }
        
        results.inserted++;
      }
    }
    
    // Log to FetchLog
    if (!dryRun) {
      const { seedBatch: seedBatchId } = sourceList[0] || {};
      const sourceName = seedBatchId ? 'seed_osm_norway_v1' : 'seed_import';
      await base44.asServiceRole.entities.FetchLog.create({
        sourceName,
        startedAt: results.timestamp,
        finishedAt: new Date().toISOString(),
        success: true,
        stationsFound: results.totalRead,
        recordsCreated: results.inserted,
        recordsSkipped: results.skipped,
        notes: seedBatchId 
          ? `National OSM seed import (batch: ${seedBatchId}). Imported ${results.inserted}/${results.totalRead} stations. ${results.conflicts} conflicts flagged.`
          : `Imported ${results.inserted}/${results.totalRead} stations. ${results.conflicts} conflicts flagged.`,
      });
    }
    
    return Response.json(results);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});