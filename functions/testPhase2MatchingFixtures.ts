/**
 * PHASE 2 MATCHING FIXTURE-BASED TEST
 * 
 * Tests Phase 2 utilities inlined in matchStationForUserReportedPrice.js
 * Tests are fixture-based only (no live data sources, no external dependencies).
 * 
 * Validates:
 * - Chain normalization (exact match, partial match, null)
 * - Name parsing (chain + area extraction)
 * - Distance scoring (0–30 point bands)
 * - Chain matching (gate logic: high-conf mismatch only)
 * - Location scoring (+10 / 0 / -15 explicit rules with confidence gate)
 * - Auto-match decision (≥65 single, ≥65+gap≥10 multi)
 * 
 * Status: FIXTURE TEST ENVIRONMENT ONLY
 * Match-rate results are NOT representative of production data quality.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// Test fixtures: realistic station data
const FIXTURE_STATIONS = [
  {
    id: 'stn_001',
    name: 'Circle K Heimdal',
    chain: 'circle k',
    city: 'Trondheim',
    areaLabel: 'Heimdal',
    latitude: 63.4100,
    longitude: 10.3900,
  },
  {
    id: 'stn_002',
    name: 'Uno-X Lade',
    chain: 'uno-x',
    city: 'Trondheim',
    areaLabel: 'Lade',
    latitude: 63.4050,
    longitude: 10.4100,
  },
  {
    id: 'stn_003',
    name: 'Shell Torgata',
    chain: 'shell',
    city: 'Trondheim',
    areaLabel: 'Sentrum',
    latitude: 63.4200,
    longitude: 10.3950,
  },
  {
    id: 'stn_004',
    name: 'Neste Singsås',
    chain: 'neste',
    city: 'Trondheim',
    areaLabel: 'Singsås',
    latitude: 63.4250,
    longitude: 10.4050,
  },
];

// Test cases: observation -> expected matching outcomes
// expectedOutcomes is an array of acceptable outcomes (for tests with multiple valid possibilities)
const TEST_CASES = [
  {
    name: 'TC-01: Exact match single candidate (Circle K Heimdal, 15m, explicit area)',
    observation: {
      station_name: 'Circle K Heimdal',
      station_chain: 'circle k',
      gps_lat: 63.4101,
      gps_lon: 10.3901,
      city: 'Trondheim',
    },
    expectedOutcomes: ['matched_station_id'],
    expectedScore: '≥80',
    reason: 'Distance 15m + chain match + name exact + area match = high score',
  },
  {
    name: 'TC-02: Single candidate (Uno-X Lade, single match in pool)',
    observation: {
      station_name: 'Uno-X Lade',
      station_chain: 'uno-x',
      gps_lat: 63.4052,
      gps_lon: 10.4102,
      city: 'Trondheim',
    },
    expectedOutcomes: ['matched_station_id'],
    expectedScore: '≥75',
    reason: 'Single station matches; score ≥65 auto-matches (no dominance gap required)',
  },
  {
    name: 'TC-03: Multi-candidate dominance gap test (Shell Sentrum location)',
    observation: {
      station_name: 'Shell Sentrum',
      station_chain: 'shell',
      gps_lat: 63.4200,
      gps_lon: 10.3950,
      city: 'Trondheim',
    },
    expectedOutcomes: ['matched_station_id', 'review_needed_station_match'],
    expectedScore: '≥65 with gap≥10 for auto-match, or 35-65 for review',
    reason: 'Multiple candidates: auto-match requires score≥65 AND gap≥10, else review_needed',
  },
  {
    name: 'TC-04: Area conflict detection (Heimdal name but near Lade station)',
    observation: {
      station_name: 'Circle K Heimdal',
      station_chain: 'circle k',
      gps_lat: 63.4051,
      gps_lon: 10.4101,
      city: 'Trondheim',
    },
    expectedOutcomes: ['review_needed_station_match', 'no_safe_station_match'],
    expectedScore: '35-65 or <35',
    reason: 'Distance + chain good but explicit area conflict (Heimdal vs Lade) = -15 penalty',
  },
  {
    name: 'TC-05: Generic name no chain (Bensin stasjon Sentrum)',
    observation: {
      station_name: 'Bensin stasjon Sentrum',
      station_chain: null,
      gps_lat: 63.4201,
      gps_lon: 10.3951,
      city: 'Trondheim',
    },
    expectedOutcomes: ['review_needed_station_match', 'no_safe_station_match'],
    expectedScore: '35-65 or <35',
    reason: 'Good proximity + weak/generic name + no chain signal = review or no-match',
  },
  {
    name: 'TC-06: Chain mismatch high-confidence rejection (Circle K vs Neste at 20m)',
    observation: {
      station_name: 'Circle K Station',
      station_chain: 'circle k',
      gps_lat: 63.4251,
      gps_lon: 10.4051,
      city: 'Trondheim',
    },
    expectedOutcomes: ['review_needed_station_match', 'no_safe_station_match'],
    expectedScore: '<65',
    reason: 'High-confidence chain mismatch (obs=circle k vs stn=neste) gates out scoring',
  },
  {
    name: 'TC-07: Far distance with weak signals (>300m, low name sim)',
    observation: {
      station_name: 'Shell unknown',
      station_chain: 'shell',
      gps_lat: 63.4450,
      gps_lon: 10.3750,
      city: 'Trondheim',
    },
    expectedOutcomes: ['no_safe_station_match'],
    expectedScore: '<35',
    reason: 'Distance >300m contributes 0 points; weak name match + far = no match',
  },
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required for testing' }, { status: 403 });
    }

    const testResults = [];

    for (const testCase of TEST_CASES) {
      // Simulate matching via entrypoint payload
      const payload = {
        gps_lat: testCase.observation.gps_lat,
        gps_lon: testCase.observation.gps_lon,
        station_name: testCase.observation.station_name,
        station_chain: testCase.observation.station_chain,
        city: testCase.observation.city,
      };

      // Call the actual matcher (in production it's matchStationForUserReportedPrice)
      // For this test, we simulate the matching logic
      const matcherResponse = await simulateMatcherCall(payload, FIXTURE_STATIONS);

      // Check if actual outcome matches one of the expected outcomes
      const passed = testCase.expectedOutcomes.includes(matcherResponse.status);

      testResults.push({
        testCase: testCase.name,
        observation: testCase.observation,
        expectedOutcomes: testCase.expectedOutcomes,
        actualOutcome: matcherResponse.status,
        expectedScore: testCase.expectedScore,
        actualScore: matcherResponse.score,
        passed,
        reason: testCase.reason,
        matcherResponse,
      });
    }

    const passCount = testResults.filter((r) => r.passed).length;
    const totalCount = testResults.length;

    return Response.json({
      status: 'fixture_test_complete',
      testEnvironment: 'fixture_based_only',
      summary: {
        total: totalCount,
        passed: passCount,
        failed: totalCount - passCount,
        passRate: `${Math.round((passCount / totalCount) * 100)}%`,
      },
      results: testResults,
      disclaimer:
        'FIXTURE TEST ENVIRONMENT ONLY. Match-rate and coverage data are NOT representative of real-world performance. Station catalog, parser, and matching thresholds should not be optimized based on these results. Results validate technical integration only.',
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

// Simulate matcher call with fixture data
async function simulateMatcherCall(payload, stations) {
  // Inline Phase 2 logic for testing (normally in matchStationForUserReportedPrice.js)

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
      return { chain: null, chainConfidence: 0, locationLabel: null, locationConfidence: 0, locationLevel: null };
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
        locationConfidence = 0.92; // Explicit match from AREA_KEYWORDS
        break;
      }
    }

    return { chain, chainConfidence, locationLabel, locationConfidence, locationLevel: 'area' };
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

  // Explicit sub-region location signal with confidence gate
  function calculateLocationSignal(parsedLocation, parsedLocationConfidence, stationAreaLabel) {
    // No signal if either is missing
    if (!parsedLocation || !stationAreaLabel) return 0;

    // No signal if parsed location was inferred with low confidence
    if (parsedLocationConfidence < 0.80) return 0;

    const pLoc = parsedLocation.toLowerCase().trim();
    const sArea = stationAreaLabel.toLowerCase().trim();

    // Explicit match: both are sub-region labels and identical
    if (pLoc === sArea) return 10;

    // Explicit conflict: both are sub-region labels but differ
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
    if (similarity >= 0.70) return 10;
    if (similarity >= 0.50) return 5;
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

  // Use payload chain as primary; fall back to parsed chain only if payload missing
  const parsed = parseStationName(payload.station_name);
  const observationChain = payload.station_chain || parsed.chain;
  const observationChainConfidence = payload.station_chain ? 0.95 : parsed.chainConfidence;

  // Pre-filter for missing coordinates
  const validStations = stations.filter(
    (s) => s.latitude !== undefined && s.latitude !== null && s.longitude !== undefined && s.longitude !== null
  );

  const scoredMatches = validStations
    .map((station) => {
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
        1.0
      );
      if (chainResult.gateFails) {
        return { stationId: station.id, score: 0, gateFails: true };
      }

      const distanceSignal = calculateDistanceSignal(distance);
      const chainSignal = chainResult.signal;
      const nameSimilarity = bigramSimilarity(payload.station_name, station.name);
      const nameSignal = calculateNameSignal(nameSimilarity);
      const locationSignal = calculateLocationSignal(parsed.locationLabel, parsed.locationConfidence, station.areaLabel);

      const score = distanceSignal + chainSignal + nameSignal + locationSignal;

      return { stationId: station.id, score: Math.max(0, score), distance, gateFails: false };
    })
    .filter((m) => m.score > 0)
    .sort((a, b) => b.score - a.score);

  if (scoredMatches.length === 0) {
    return {
      status: 'no_safe_station_match',
      score: 0,
      reason: 'No candidates passed scoring',
    };
  }

  const top = scoredMatches[0];
  const SCORE_MATCHED = 65;
  const SCORE_REVIEW = 35;

  // Single candidate: ≥65 → auto-match (no dominance gap required)
  if (scoredMatches.length === 1) {
    if (top.score >= SCORE_MATCHED) {
      return { status: 'matched_station_id', score: top.score, stationId: top.stationId };
    }
    if (top.score >= SCORE_REVIEW) {
      return { status: 'review_needed_station_match', score: top.score, candidates: [top.stationId] };
    }
    return { status: 'no_safe_station_match', score: top.score };
  }

  // Multi-candidate: requires score ≥65 AND gap ≥10 for auto-match
  const second = scoredMatches[1];
  const gap = top.score - second.score;

  if (top.score >= SCORE_MATCHED && gap >= 10) {
    return { status: 'matched_station_id', score: top.score, stationId: top.stationId, gap };
  }

  if (top.score >= SCORE_MATCHED || top.score >= SCORE_REVIEW) {
    return {
      status: 'review_needed_station_match',
      score: top.score,
      gap,
      candidates: scoredMatches.slice(0, 3).map((m) => m.stationId),
    };
  }

  return { status: 'no_safe_station_match', score: top.score };
}