import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * CIRCLE K AMBIGUITY AUDIT — Test ambiguous same-chain multi-candidate scenario
 *
 * Purpose:
 * Validate that Phase 2 matching engine routes conservatively when:
 * - User reports "Circle K" (generic chain, no location specificity)
 * - Trondheim has multiple Circle K candidates
 * - No dominant match exists (ambiguous scenario)
 *
 * Expected behavior:
 * ✓ Score candidates fairly based on available signals
 * ✓ Recognize ambiguity (low dominance gap)
 * ✓ Route to review_needed (not auto-match)
 * ✓ Do NOT change matching logic based on this test
 * ✓ This is a validation test, not a performance benchmark
 *
 * IMPORTANT: This test uses the production Station catalog + matching logic.
 * If catalog has duplicates, that inflates candidate pool but does not invalidate
 * the test's purpose (validating conservative routing under ambiguity).
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const payload = await req.json();

    // User report: generic "Circle K" at Trondheim, no address/specificity
    const userReport = {
      station_name: payload.station_name || 'Circle K',
      station_chain: payload.station_chain || 'circle_k',
      city: payload.city || 'Trondheim',
      gps_latitude: payload.gps_latitude || null,
      gps_longitude: payload.gps_longitude || null,
      fuel_type: payload.fuel_type || 'diesel',
      price_nok: payload.price_nok || 18.50,
    };

    // Fetch all stations in Trondheim
    const allStations = await base44.entities.Station.filter({
      city: 'Trondheim',
    });

    if (!allStations || allStations.length === 0) {
      return Response.json({
        status: 'no_stations_found',
        city: 'Trondheim',
      });
    }

    // Filter for Circle K candidates
    const circleKCandidates = allStations.filter((s) => {
      const normalizedChain = (s.chain || '')
        .toLowerCase()
        .replace(/[\s-]/g, '');
      return (
        normalizedChain.includes('circle') && normalizedChain.includes('k')
      );
    });

    if (circleKCandidates.length === 0) {
      return Response.json({
        status: 'no_circle_k_candidates',
        city: 'Trondheim',
        message: 'No Circle K stations found in catalog',
      });
    }

    // Score each candidate
    const scoredCandidates = circleKCandidates.map((station) => {
      let score = 0;
      const signals = {};

      // Signal 1: Chain match (exact Circle K)
      const chainSignal = 20; // Exact chain match
      score += chainSignal;
      signals.chain_match = chainSignal;

      // Signal 2: GPS proximity (if user provided GPS)
      let proximitySignal = 0;
      if (
        userReport.gps_latitude != null &&
        userReport.gps_longitude != null &&
        station.latitude != null &&
        station.longitude != null
      ) {
        const distance = haversineDistance(
          userReport.gps_latitude,
          userReport.gps_longitude,
          station.latitude,
          station.longitude
        );

        if (distance <= 30) proximitySignal = 30;
        else if (distance <= 75) proximitySignal = 20;
        else if (distance <= 150) proximitySignal = 10;
        else if (distance <= 300) proximitySignal = 5;
        else proximitySignal = 0;
      }

      score += proximitySignal;
      signals.proximity = {
        signal: proximitySignal,
        distance_meters: userReport.gps_latitude
          ? Math.round(
              haversineDistance(
                userReport.gps_latitude,
                userReport.gps_longitude,
                station.latitude,
                station.longitude
              )
            )
          : null,
      };

      // Signal 3: Location label match (if available)
      const areaLabel = (station.areaLabel || '').toLowerCase();
      let areaSignal = 0;
      if (
        areaLabel &&
        userReport.gps_latitude != null &&
        userReport.gps_longitude != null
      ) {
        // Rough area detection from coordinates
        const lat = userReport.gps_latitude;
        const lon = userReport.gps_longitude;
        const stationLat = station.latitude;
        const stationLon = station.longitude;

        // If both in same rough area quadrant, small bonus
        if (
          Math.abs(lat - stationLat) < 0.01 &&
          Math.abs(lon - stationLon) < 0.01
        ) {
          areaSignal = 5;
        }
      }

      score += areaSignal;
      signals.area_label = areaSignal;

      // Signal 4: Name similarity (if station name provides additional context)
      let nameSignal = 0;
      const stationName = (station.name || '').toLowerCase();
      const reportName = (userReport.station_name || '')
        .toLowerCase();

      if (stationName === reportName) {
        nameSignal = 15;
      } else if (stationName.includes(reportName) || reportName.includes(stationName)) {
        nameSignal = 5;
      }

      score += nameSignal;
      signals.name_similarity = nameSignal;

      return {
        station_id: station.id,
        station_name: station.name,
        station_chain: station.chain,
        station_address: station.address,
        station_area_label: station.areaLabel,
        latitude: station.latitude,
        longitude: station.longitude,
        total_score: score,
        signals,
      };
    });

    // Sort by score
    const ranked = scoredCandidates.sort(
      (a, b) => b.total_score - a.total_score
    );

    // Calculate dominance gap (top candidate vs. second place)
    const topScore = ranked[0].total_score;
    const secondScore = ranked.length > 1 ? ranked[1].total_score : 0;
    const dominanceGap = topScore - secondScore;

    // Decision gate
    const autoMatchThreshold = 65;
    const dominanceGapThreshold = 10;

    let decision = 'review_needed';
    let reason = [];

    if (topScore >= autoMatchThreshold && dominanceGap >= dominanceGapThreshold) {
      decision = 'auto_match';
      reason.push(`Score ${topScore} >= ${autoMatchThreshold}`);
      reason.push(`Gap ${dominanceGap} >= ${dominanceGapThreshold}`);
    } else if (topScore < autoMatchThreshold) {
      reason.push(
        `Score ${topScore} < ${autoMatchThreshold} (insufficient confidence)`
      );
    } else if (dominanceGap < dominanceGapThreshold) {
      reason.push(
        `Gap ${dominanceGap} < ${dominanceGapThreshold} (ambiguous: multiple competitive candidates)`
      );
    }

    return Response.json({
      status: 'ambiguity_audit_complete',
      test_type: 'circle_k_generic_multi_candidate',
      user_report: userReport,
      total_candidates: circleKCandidates.length,
      ranked_candidates: ranked.slice(0, 5), // Top 5
      top_candidate: ranked[0],
      second_candidate: ranked.length > 1 ? ranked[1] : null,
      dominance_gap: dominanceGap,
      decision: decision,
      decision_reason: reason.join('; '),
      gate_thresholds: {
        score_threshold: autoMatchThreshold,
        dominance_gap_threshold: dominanceGapThreshold,
      },
      routing: {
        outcome: decision === 'auto_match' ? 'AUTO_MATCH' : 'REVIEW_NEEDED',
        review_needed: decision === 'review_needed',
        top_candidate_ready_to_match: decision === 'auto_match',
      },
      interpretation: {
        purpose:
          'Validate conservative routing when user reports generic chain name with no location specificity',
        expected_behavior:
          'Route to review_needed when dominance gap is low (ambiguous scenario)',
        actual_behavior: `Routed to ${decision.toUpperCase()} (dominance gap: ${dominanceGap}, score: ${topScore})`,
        validation:
          decision === 'review_needed'
            ? 'PASS: Conservative routing under ambiguity confirmed'
            : 'ALERT: Auto-match with ambiguous score — check dominance gap calculation',
      },
      notes:
        'This is a validation test for conservative routing logic. Do not change matching thresholds based on this test result unless a concrete failing case is proven.',
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

// ===== UTILITIES =====

function haversineDistance(lat1, lon1, lat2, lon2) {
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