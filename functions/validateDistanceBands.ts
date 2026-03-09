import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * DISTANCE BANDS VALIDATION FUNCTION
 *
 * Purpose: Systematically validate distance scoring tiers without manual
 * payload generation or audit log parsing.
 *
 * Unit test: Tests haversine distance calculation and signal mapping only.
 * Does NOT test multi-candidate matching or dominance gap.
 *
 * Usage:
 * base44.functions.invoke('validateDistanceBands', {
 *   stationId: '69aaded88b9499b3ea1d263d',
 *   stationName: 'Shell Trondheim Sentrum',
 *   stationChain: 'shell',
 *   stationLat: 63.427,
 *   stationLon: 10.3889,
 *   city: 'Trondheim'
 * })
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const payload = await req.json();

    if (!payload.stationId || !payload.stationLat || !payload.stationLon || !payload.city) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Main test suite: single bearing (north)
    const mainTests = [
      { offsetMeters: 15, expectedSignal: 30, bearing: 0 },
      { offsetMeters: 50, expectedSignal: 20, bearing: 0 },
      { offsetMeters: 100, expectedSignal: 10, bearing: 0 },
      { offsetMeters: 200, expectedSignal: 5, bearing: 0 },
      { offsetMeters: 299, expectedSignal: 5, bearing: 0 },
      { offsetMeters: 301, expectedSignal: 0, bearing: 0 },
      { offsetMeters: 400, expectedSignal: 0, bearing: 0 },
    ];

    // Symmetry check: 30m on all 4 bearings
    const symmetryTests = [
      { offsetMeters: 30, bearing: 0, label: 'N' },
      { offsetMeters: 30, bearing: 90, label: 'E' },
      { offsetMeters: 30, bearing: 180, label: 'S' },
      { offsetMeters: 30, bearing: 270, label: 'W' },
    ];

    const testResults = [];
    const symmetryResults = [];

    // Run main tests
    for (const test of mainTests) {
      const gpsPoint = generateGPSPoint(
        payload.stationLat,
        payload.stationLon,
        test.offsetMeters,
        test.bearing
      );

      const actualDistance = haversineDistance(
        gpsPoint.lat,
        gpsPoint.lon,
        payload.stationLat,
        payload.stationLon
      );

      const actualSignal = calculateDistanceSignal(actualDistance);
      const pass = actualSignal === test.expectedSignal;

      testResults.push({
        offsetMeters: test.offsetMeters,
        bearing: `${test.bearing}°`,
        expectedSignal: test.expectedSignal,
        actualDistanceMeters: Math.round(actualDistance),
        actualSignal,
        pass,
      });
    }

    // Run symmetry checks
    for (const test of symmetryTests) {
      const gpsPoint = generateGPSPoint(
        payload.stationLat,
        payload.stationLon,
        test.offsetMeters,
        test.bearing
      );

      const actualDistance = haversineDistance(
        gpsPoint.lat,
        gpsPoint.lon,
        payload.stationLat,
        payload.stationLon
      );

      const actualSignal = calculateDistanceSignal(actualDistance);
      const pass = actualSignal === 30; // All should return 30 at 30m

      symmetryResults.push({
        bearing: test.label,
        expectedSignal: 30,
        actualDistanceMeters: Math.round(actualDistance),
        actualSignal,
        pass,
      });
    }

    const passedCount = testResults.filter((t) => t.pass).length;
    const symmetryPassedCount = symmetryResults.filter((t) => t.pass).length;
    const allPassed = passedCount === testResults.length && symmetryPassedCount === symmetryResults.length;

    return Response.json({
      status: allPassed ? 'distance_bands_validated' : 'distance_bands_validation_failed',
      station: {
        id: payload.stationId,
        name: payload.stationName,
        chain: payload.stationChain,
        latitude: payload.stationLat,
        longitude: payload.stationLon,
        city: payload.city,
      },
      tests: testResults,
      symmetryCheck: symmetryResults,
      summary: {
        mainTests: {
          total: testResults.length,
          passed: passedCount,
          failed: testResults.length - passedCount,
        },
        symmetryTests: {
          total: symmetryResults.length,
          passed: symmetryPassedCount,
          failed: symmetryResults.length - symmetryPassedCount,
        },
        allPassed,
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

// ===== UTILITIES =====

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c * 1000; // Return in meters
}

function generateGPSPoint(
  baseLat: number,
  baseLon: number,
  offsetMeters: number,
  bearingDegrees: number
): { lat: number; lon: number } {
  // Convert bearing to radians
  const bearingRad = (bearingDegrees * Math.PI) / 180;

  // Approximate conversion: 1 degree latitude ≈ 111 km
  const latOffset = (offsetMeters / 1000 / 111) * Math.cos(bearingRad);

  // 1 degree longitude ≈ 111 km * cos(latitude)
  const lonOffset = (offsetMeters / 1000 / (111 * Math.cos((baseLat * Math.PI) / 180))) * Math.sin(bearingRad);

  return {
    lat: baseLat + latOffset,
    lon: baseLon + lonOffset,
  };
}

function calculateDistanceSignal(meters: number): number {
  if (meters <= 30) return 30;
  if (meters <= 75) return 20;
  if (meters <= 150) return 10;
  if (meters <= 300) return 5;
  return 0;
}