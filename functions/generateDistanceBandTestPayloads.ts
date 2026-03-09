import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * Distance Band Test Payload Generator
 * 
 * Creates precise test payloads at specific distance offsets from a station.
 * 
 * Usage: base44.functions.invoke('generateDistanceBandTestPayloads', {
 *   stationId: "69aaded88b9499b3ea1d263d",
 *   stationName: "Shell Sentrum",
 *   stationChain: "shell",
 *   stationLat: 63.4251,
 *   stationLon: 10.4051,
 *   offsetMeters: 15  // or 50, 100, 200, 400
 * })
 * 
 * Expected distance signals:
 * - 0–30m: signal = 30
 * - 31–75m: signal = 20
 * - 76–150m: signal = 10
 * - 151–300m: signal = 5
 * - >300m: signal = 0
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const payload = await req.json();

    // Validate required fields
    if (!payload.stationLat || !payload.stationLon || !payload.offsetMeters || !payload.stationName || !payload.stationChain) {
      return Response.json({ error: 'Missing required fields: stationLat, stationLon, offsetMeters, stationName, stationChain' }, { status: 400 });
    }

    const offsetMeters = payload.offsetMeters;
    
    // Convert meters to approximate lat/lon offset (rough approximation)
    // At ~63°N: 1 degree lat ≈ 111 km, 1 degree lon ≈ 60 km
    const latOffset = (offsetMeters / 111000);
    const lonOffset = (offsetMeters / 60000);

    // Generate test payloads at different bearings to avoid clustering
    const bearings = [0, 90, 180, 270]; // N, E, S, W
    const testPayloads = bearings.map((bearing, idx) => {
      const radians = (bearing * Math.PI) / 180;
      const testLat = payload.stationLat + latOffset * Math.cos(radians);
      const testLon = payload.stationLon + lonOffset * Math.sin(radians);

      return {
        bearing: `${bearing}°`,
        payload: {
          gps_lat: parseFloat(testLat.toFixed(6)),
          gps_lon: parseFloat(testLon.toFixed(6)),
          station_name: payload.stationName,
          station_chain: payload.stationChain,
          city: payload.city || 'Trondheim', // Default to Trondheim
        },
      };
    });

    // Calculate expected signal based on offsetMeters
    let expectedSignal = 0;
    let expectedBand = '';
    if (offsetMeters <= 30) {
      expectedSignal = 30;
      expectedBand = '0–30m';
    } else if (offsetMeters <= 75) {
      expectedSignal = 20;
      expectedBand = '31–75m';
    } else if (offsetMeters <= 150) {
      expectedSignal = 10;
      expectedBand = '76–150m';
    } else if (offsetMeters <= 300) {
      expectedSignal = 5;
      expectedBand = '151–300m';
    } else {
      expectedSignal = 0;
      expectedBand = '>300m';
    }

    return Response.json({
      mode: 'distance_band_test_generator',
      stationReference: {
        stationId: payload.stationId || 'unknown',
        stationName: payload.stationName,
        stationChain: payload.stationChain,
        latitude: payload.stationLat,
        longitude: payload.stationLon,
      },
      testConfiguration: {
        offsetMeters,
        expectedBand,
        expectedDistanceSignal: expectedSignal,
        description: `Distance band: ${expectedBand} → expected distanceSignal = ${expectedSignal}`,
      },
      testPayloads: testPayloads.map(tp => ({
        ...tp,
        instructions: `Call: base44.functions.invoke('auditPhase2DominanceGap', ${JSON.stringify(tp.payload)})`,
      })),
      validationCriteria: {
        mustHave: `distanceSignal = ${expectedSignal}`,
        distance_reported: `approximately ${offsetMeters}m`,
        note: 'Signal activation confirms distance scoring tier is working correctly',
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});