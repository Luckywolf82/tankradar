import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * PHASE 2 DOMINANCE-GAP AUDIT FUNCTION
 * 
 * Purpose: Execute the full matching pipeline with detailed logging
 * to validate multi-candidate scoring, gap calculation, and decision logic.
 * 
 * Usage: base44.functions.invoke('auditPhase2DominanceGap', {
 *   gps_lat: 63.4251,
 *   gps_lon: 10.4051,
 *   station_name: "Neste Singsås",
 *   station_chain: "neste",
 *   city: "Trondheim"
 * })
 * 
 * Output: Full audit trail including:
 * - Candidate pool from city pre-filter
 * - Individual candidate scoring breakdown
 * - Distance/chain/name/location signals
 * - Top two candidate scores and gap
 * - Final decision with gate evaluation
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
    if (!payload.gps_lat || !payload.gps_lon || !payload.station_name || !payload.city) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const audit = {
      input: payload,
      steps: [],
      candidates: [],
      scoredMatches: [],
      decision: null,
      warnings: [],
    };

    // Step 1: Parse observation
    audit.steps.push({ step: 'parse_observation', timestamp: new Date().toISOString() });
    const parsed = parseStationName(payload.station_name);
    audit.steps.push({
      ...audit.steps[audit.steps.length - 1],
      result: {
        parsedChain: parsed.chain,
        parsedChainConfidence: parsed.chainConfidence,
        parsedLocation: parsed.locationLabel,
        parsedLocationConfidence: parsed.locationConfidence,
      },
    });

    // Determine observation chain (payload priority, then parsed)
    const observationChain = payload.station_chain || parsed.chain;
    const observationChainConfidence = payload.station_chain ? 0.95 : parsed.chainConfidence;

    // Step 2: Query Station entity by city
    audit.steps.push({ step: 'query_stations_by_city', timestamp: new Date().toISOString() });
    let candidatePool = [];
    try {
      candidatePool = await base44.entities.Station.filter({ city: payload.city });
    } catch (error) {
      audit.warnings.push(`Failed to query stations for city ${payload.city}: ${error.message}`);
      candidatePool = [];
    }
    audit.steps.push({
      ...audit.steps[audit.steps.length - 1],
      result: {
        totalStationsInCity: candidatePool.length,
        stationIds: candidatePool.map((s) => s.id),
      },
    });

    // Step 3: Pre-filter (valid coordinates)
    audit.steps.push({ step: 'prefilter_valid_coordinates', timestamp: new Date().toISOString() });
    const validStations = candidatePool.filter(
      (s) => s.latitude !== undefined && s.latitude !== null && s.longitude !== undefined && s.longitude !== null
    );
    audit.steps.push({
      ...audit.steps[audit.steps.length - 1],
      result: {
        validStationsCount: validStations.length,
        filteredOutCount: candidatePool.length - validStations.length,
      },
    });

    // Step 4: Score each candidate
    audit.steps.push({ step: 'score_candidates', timestamp: new Date().toISOString() });
    const scoredMatches = [];

    for (const station of validStations) {
      const distance = haversineDistance(
        payload.gps_lat,
        payload.gps_lon,
        station.latitude,
        station.longitude
      );

      const chainResult = chainMatchLogic(
        observationChain,
        observationChainConfidence,
        station.chain,
        0.92
      );

      if (chainResult.gateFails) {
        scoredMatches.push({
          stationId: station.id,
          stationName: station.name,
          chain: station.chain,
          areaLabel: station.areaLabel,
          distance,
          score: 0,
          gateFails: true,
          signals: { distance: 0, chain: 0, name: 0, location: 0 },
        });
        continue;
      }

      const distanceSignal = calculateDistanceSignal(distance);
      const chainSignal = chainResult.signal;
      const nameSimilarity = bigramSimilarity(payload.station_name, station.name);
      const nameSignal = calculateNameSignal(nameSimilarity);
      const locationSignal = calculateLocationSignal(
        parsed.locationLabel,
        parsed.locationConfidence,
        station.areaLabel
      );

      const score = distanceSignal + chainSignal + nameSignal + locationSignal;

      scoredMatches.push({
        stationId: station.id,
        stationName: station.name,
        chain: station.chain,
        areaLabel: station.areaLabel,
        distance,
        nameSimilarity,
        score: Math.max(0, score),
        gateFails: false,
        signals: {
          distance: distanceSignal,
          chain: chainSignal,
          name: nameSignal,
          location: locationSignal,
        },
      });
    }

    // Sort by score descending
    const sorted = scoredMatches.filter((m) => m.score > 0).sort((a, b) => b.score - a.score);

    audit.steps.push({
      ...audit.steps[audit.steps.length - 1],
      result: {
        totalScored: scoredMatches.length,
        passingScore: sorted.length,
        gateFails: scoredMatches.filter((m) => m.gateFails).length,
      },
    });

    audit.candidates = scoredMatches;
    audit.scoredMatches = sorted;

    // Step 5: Apply decision logic
    audit.steps.push({ step: 'apply_decision_logic', timestamp: new Date().toISOString() });

    const SCORE_MATCHED = 65;
    const SCORE_REVIEW = 35;
    const DOMINANCE_GAP_MIN = 10;

    if (sorted.length === 0) {
      audit.decision = {
        status: 'no_safe_station_match',
        score: 0,
        reason: 'No candidates passed scoring (all score < 1)',
        gateChecks: { candidateCount: 0 },
      };
    } else if (sorted.length === 1) {
      const top = sorted[0];
      audit.decision = {
        status:
          top.score >= SCORE_MATCHED
            ? 'matched_station_id'
            : top.score >= SCORE_REVIEW
              ? 'review_needed_station_match'
              : 'no_safe_station_match',
        stationId: top.stationId,
        score: top.score,
        gateChecks: {
          candidateCount: 1,
          singleCandidateRule: 'score >= 65 → auto-match (no gap required)',
          topScore: top.score,
        },
        reason:
          top.score >= SCORE_MATCHED
            ? `Single candidate with score ${top.score} >= ${SCORE_MATCHED}`
            : `Single candidate with score ${top.score} (review: ${top.score >= SCORE_REVIEW})`,
      };
    } else {
      const top = sorted[0];
      const second = sorted[1];
      const gap = top.score - second.score;

      const gateCheckResult =
        top.score >= SCORE_MATCHED && gap >= DOMINANCE_GAP_MIN
          ? { pass: true, type: 'dual-requirement' }
          : { pass: false, type: 'dual-requirement' };

      let status = 'no_safe_station_match';
      if (top.score >= SCORE_MATCHED && gap >= DOMINANCE_GAP_MIN) {
        status = 'matched_station_id';
      } else if (top.score >= SCORE_MATCHED || top.score >= SCORE_REVIEW) {
        status = 'review_needed_station_match';
      }

      audit.decision = {
        status,
        stationId: top.stationId,
        score: top.score,
        gap,
        candidates: sorted.slice(0, 3).map((m) => m.stationId),
        gateChecks: {
          candidateCount: sorted.length,
          multiCandidateRule: `score >= ${SCORE_MATCHED} AND gap >= ${DOMINANCE_GAP_MIN}`,
          topScore: top.score,
          secondScore: second.score,
          gap,
          dualRequirementPass: gateCheckResult.pass,
          explanation: gateCheckResult.pass
            ? `Auto-match: score ${top.score} >= ${SCORE_MATCHED} AND gap ${gap} >= ${DOMINANCE_GAP_MIN}`
            : `Review required: score ${top.score} ${
                top.score >= SCORE_MATCHED ? `>= ${SCORE_MATCHED}` : `< ${SCORE_MATCHED}`
              } (gap: ${gap} ${gap >= DOMINANCE_GAP_MIN ? `>= ${DOMINANCE_GAP_MIN}` : `< ${DOMINANCE_GAP_MIN}`})`,
        },
        reason: status,
      };
    }

    audit.steps.push({
      ...audit.steps[audit.steps.length - 1],
      result: audit.decision,
    });

    return Response.json({ status: 'audit_complete', audit });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

// ===== INLINED UTILITIES (Phase 2) =====

const KNOWN_CHAINS = {
  'circle k': ['circle k', 'circlk'],
  'uno-x': ['uno-x', 'unox'],
  'shell': ['shell'],
  'esso': ['esso'],
  'statoil': ['statoil'],
  'bp': ['bp'],
  'neste': ['neste'],
  'jet': ['jet'],
};

const AREA_KEYWORDS = [
  'heimdal',
  'lade',
  'singsås',
  'torgata',
  'nidaros',
  'sentrum',
  'lerkendal',
  'moholt',
  'bakklandet',
  'ranheim',
  'leinstrand',
];

function normalizeChainName(rawChain) {
  if (!rawChain || typeof rawChain !== 'string') {
    return { normalized: null, confidence: 0 };
  }
  const trimmed = rawChain.toLowerCase().trim();
  for (const [canonical, aliases] of Object.entries(KNOWN_CHAINS)) {
    for (const alias of aliases) {
      if (trimmed === alias) {
        return { normalized: canonical, confidence: 0.92 };
      }
    }
  }
  return { normalized: null, confidence: 0 };
}

function parseStationName(rawName) {
  if (!rawName || typeof rawName !== 'string') {
    return { chain: null, chainConfidence: 0, locationLabel: null, locationConfidence: 0 };
  }
  const tokens = rawName.toLowerCase().trim().split(/\s+/);
  let chain = null;
  let chainConfidence = 0;
  let locationLabel = null;
  let locationConfidence = 0;

  for (const [canonical, aliases] of Object.entries(KNOWN_CHAINS)) {
    for (const alias of aliases) {
      const aliasTokens = alias.split(/\s+/);
      const nameStart = tokens.slice(0, aliasTokens.length).join(' ');
      if (nameStart === alias) {
        chain = canonical;
        chainConfidence = 0.92;
        tokens.splice(0, aliasTokens.length);
        break;
      }
    }
    if (chain) break;
  }

  for (const token of tokens) {
    if (AREA_KEYWORDS.includes(token)) {
      locationLabel = token;
      locationConfidence = 0.92;
      break;
    }
  }

  return { chain, chainConfidence, locationLabel, locationConfidence };
}

function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c * 1000;
}

function calculateLocationSignal(parsedLocation, parsedLocationConfidence, stationAreaLabel) {
  if (!parsedLocation || !stationAreaLabel) return 0;
  if (parsedLocationConfidence < 0.8) return 0;
  const pLoc = parsedLocation.toLowerCase().trim();
  const sArea = stationAreaLabel.toLowerCase().trim();
  if (pLoc === sArea) return 10;
  if (pLoc !== sArea) return -15;
  return 0;
}

function calculateDistanceSignal(meters) {
  if (meters <= 30) return 30;
  if (meters <= 75) return 20;
  if (meters <= 150) return 10;
  if (meters <= 300) return 5;
  return 0;
}

function calculateNameSignal(similarity) {
  if (similarity >= 0.95) return 30;
  if (similarity >= 0.85) return 20;
  if (similarity >= 0.7) return 10;
  if (similarity >= 0.5) return 5;
  return 0;
}

function bigramSimilarity(name1, name2) {
  if (!name1 || !name2) return 0;
  if (name1.toLowerCase() === name2.toLowerCase()) return 1;
  const n1 = name1.toLowerCase();
  const n2 = name2.toLowerCase();
  const bigrams1 = new Set();
  const bigrams2 = new Set();
  for (let i = 0; i < n1.length - 1; i++) bigrams1.add(n1.substr(i, 2));
  for (let i = 0; i < n2.length - 1; i++) bigrams2.add(n2.substr(i, 2));
  if (bigrams1.size === 0 || bigrams2.size === 0) return 0;
  const intersection = new Set([...bigrams1].filter((x) => bigrams2.has(x)));
  const union = new Set([...bigrams1, ...bigrams2]);
  return intersection.size / union.size;
}

function chainMatchLogic(obsChain, obsChainConfidence, stnChain, stnChainConfidence) {
  if (!obsChain && !stnChain) return { signal: 0, gateFails: false };
  if (!obsChain) return { signal: 0, gateFails: false };
  if (!stnChain) return { signal: 0, gateFails: false };

  const normalizedObs = normalizeChainName(obsChain);
  const normalizedStn = normalizeChainName(stnChain);

  if (normalizedObs.normalized === normalizedStn.normalized && normalizedObs.normalized) {
    return { signal: 25, gateFails: false };
  }

  if (normalizedObs.normalized && normalizedStn.normalized) {
    if (obsChainConfidence >= 0.85 && stnChainConfidence >= 0.85) {
      return { signal: 0, gateFails: true };
    }
  }

  return { signal: 0, gateFails: false };
}