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
    
    const results = {
      totalRead: sourceList.length,
      inserted: 0,
      skipped: [],
      conflicts: [],
      dryRun,
      timestamp: new Date().toISOString(),
      batches: [],
    };
    
    // Process in batches to avoid CPU timeout
    for (let batchStart = 0; batchStart < sourceList.length; batchStart += batchSize) {
      const batchEnd = Math.min(batchStart + batchSize, sourceList.length);
      const batch = sourceList.slice(batchStart, batchEnd);
      
      // Fetch existing stations for this batch
      const existingStations = await base44.asServiceRole.entities.Station.list();
      
      const batchResults = {
        batchIndex: Math.floor(batchStart / batchSize),
        batchStart,
        batchEnd,
        inserted: 0,
        skipped: 0,
        conflicts: 0,
      };
    
    // Process each source record in batch
    for (const sourceRecord of batch) {
      const { name, address, city, latitude, longitude, sourceName, sourceStationId, seedBatch } = sourceRecord;
      
      // Validate required fields (city and address are optional)
      if (!name || latitude === undefined || longitude === undefined || !sourceName || !sourceStationId) {
        results.skipped.push({
          source: name,
          reason: 'missing_required_fields',
          details: { name, latitude, longitude, sourceName, sourceStationId },
        });
        continue;
      }
    
      // Check for proximity match
      let proximityMatch = null;
      let minDistance = dedupRadius;
      
      for (const existing of existingStations) {
        const distance = haversineDistance(
          latitude, longitude,
          existing.latitude, existing.longitude
        );
        
        if (distance < minDistance) {
          proximityMatch = existing;
          minDistance = distance;
        }
      }
      
      if (proximityMatch && minDistance < dedupRadius) {
        results.skipped.push({
          source: name,
          reason: 'proximity_match_exists',
          existingId: proximityMatch.id,
          existingName: proximityMatch.name,
          distance: Math.round(minDistance),
        });
        continue;
      }
      
      // Check for name+chain conflict (>85% similarity + same chain + <150m)
      let conflictMatch = null;
      for (const existing of existingStations) {
        const distance = haversineDistance(latitude, longitude, existing.latitude, existing.longitude);
        const nameSim = stringSimilarity(name, existing.name);
        
        if (nameSim > 0.85 && distance < 150) {
          conflictMatch = existing;
          break;
        }
      }
      
      if (conflictMatch) {
        results.conflicts.push({
          sourceRecord: { name, address, city, latitude, longitude, sourceStationId, seedBatch },
          existingRecord: {
            id: conflictMatch.id,
            name: conflictMatch.name,
            address: conflictMatch.address,
            city: conflictMatch.city,
          },
          suggestedAction: 'review_for_merge',
        });
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
      batchResults.inserted++;
      batchResults.skipped += results.skipped.length > batchResults.skipped ? 1 : 0;
      batchResults.conflicts += results.conflicts.length > batchResults.conflicts ? 1 : 0;
      }
      
      results.batches.push(batchResults);
    }
    
    // Log to FetchLog
    if (!dryRun) {
      await base44.asServiceRole.entities.FetchLog.create({
        sourceName: 'seed_import',
        startedAt: results.timestamp,
        finishedAt: new Date().toISOString(),
        success: true,
        stationsFound: results.totalRead,
        recordsCreated: results.inserted,
        recordsSkipped: results.skipped.length,
        notes: `Imported ${results.inserted} stations from seed list in ${results.batches.length} batches. ${results.conflicts.length} conflicts flagged for review.`,
      });
    }
    
    return Response.json(results);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});