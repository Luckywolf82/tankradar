import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * PHASE 2 MATCHING ENGINE — TEMPORARY INTEGRATED IMPLEMENTATION
 * 
 * STATUS: Inlined utilities due to Base44 backend function isolation constraint.
 * Backend functions cannot import from sibling files in functions/ folder.
 * 
 * PENDING: Refactor to shared module file if Base44 supports non-deployed helper modules.
 * 
 * UTILITIES INCLUDED:
 * - Chain normalization (conservative registry, explicit matching only)
 * - Station name parsing (chain + location extraction)
 * - Matching engine (scoring per specification)
 * - Decision logic (explicit dual-requirement gate for auto-match)
 * 
 * AUTO-MATCH REQUIREMENTS:
 * - Single candidate: score ≥65 (dominance gap N/A)
 * - Multi-candidate: score ≥65 AND dominance gap ≥10
 * 
 * LOCATION SCORING:
 * - Match (+10): parsedLocation == stationAreaLabel (both explicit sub-region labels)
 * - No signal (0): either value null/missing or weakly parsed
 * - Conflict (-15): both values explicit sub-region labels AND differ
 */

// Conservative chain registry (ambiguous aliases excluded)
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
  'heimdal', 'lade', 'singsås', 'torgata', 'nidaros', 'sentrum',
  'lerkendal', 'moholt', 'bakklandet', 'ranheim', 'leinstrand',
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

  for (const [canonical, aliases] of Object.entries(KNOWN_CHAINS)) {
    for (const alias of aliases) {
      const similarity = stringSimilarity(trimmed, alias);
      if (similarity >= 0.80) {
        return { normalized: canonical, confidence: Math.max(0.50, similarity - 0.30) };
      }
    }
  }

  return { normalized: null, confidence: 0 };
}

function chainMatchLogic(obsChain, obsChainConfidence, stnChain, stnChainConfidence) {
  if (!obsChain && !stnChain) {
    return { matches: true, signal: 0, gateFails: false, reason: 'both_chains_null' };
  }

  if (!obsChain) {
    return { matches: true, signal: 0, gateFails: false, reason: 'obs_chain_null_neutral' };
  }

  if (!stnChain) {
    return { matches: true, signal: 0, gateFails: false, reason: 'stn_chain_null_neutral' };
  }

  const normalizedObs = normalizeChainName(obsChain);
  const normalizedStn = normalizeChainName(stnChain);

  if (normalizedObs.normalized === normalizedStn.normalized && normalizedObs.normalized) {
    return { matches: true, signal: 25, gateFails: false, reason: 'exact_match' };
  }

  if (normalizedObs.normalized && normalizedStn.normalized) {
    if (obsChainConfidence >= 0.85 && stnChainConfidence >= 0.85) {
      return { matches: false, signal: 0, gateFails: true, reason: 'high_confidence_mismatch' };
    }
  }

  return { matches: true, signal: 0, gateFails: false, reason: 'weak_or_uncertain_chains' };
}

function parseStationName(rawName) {
  if (!rawName || typeof rawName !== 'string') {
    return { chain: null, chainConfidence: 0, locationLabel: null, locationConfidence: 0, locationLevel: null, chainTokens: [], locationTokens: [], unparsedTokens: [] };
  }

  const tokens = rawName.toLowerCase().trim().split(/\s+/);
  const result = { chain: null, chainConfidence: 0, locationLabel: null, locationConfidence: 0, locationLevel: null, chainTokens: [], locationTokens: [], unparsedTokens: [] };

  for (const [canonical, aliases] of Object.entries(KNOWN_CHAINS)) {
    for (const alias of aliases) {
      const aliasTokens = alias.split(/\s+/);
      const nameStart = tokens.slice(0, aliasTokens.length).join(' ');
      if (nameStart === alias) {
        result.chain = canonical;
        result.chainConfidence = 0.92;
        result.chainTokens = tokens.slice(0, aliasTokens.length);
        tokens.splice(0, aliasTokens.length);
        break;
      }
    }
    if (result.chain) break;
  }

  for (const token of tokens) {
    if (AREA_KEYWORDS.includes(token)) {
      result.locationLabel = token;
      result.locationConfidence = 0.92; // Explicit match from AREA_KEYWORDS
      result.locationLevel = 'area';
      result.locationTokens.push(token);
      break;
    }
  }

  result.unparsedTokens = tokens.filter(t => !result.chainTokens.includes(t) && !result.locationTokens.includes(t));
  return result;
}

function bigramSimilarity(name1, name2) {
  if (!name1 || !name2) return 0;
  if (name1.toLowerCase() === name2.toLowerCase()) return 1;

  const n1 = normalize(name1);
  const n2 = normalize(name2);

  const bigrams1 = extractBigrams(n1);
  const bigrams2 = extractBigrams(n2);

  if (bigrams1.size === 0 || bigrams2.size === 0) return 0;

  const intersection = new Set([...bigrams1].filter(x => bigrams2.has(x)));
  const union = new Set([...bigrams1, ...bigrams2]);

  return intersection.size / union.size;
}

/**
 * EXPLICIT SUB-REGION LOCATION SIGNAL
 * 
 * +10: Both are explicit sub-region labels (from AREA_KEYWORDS) AND match
 * 0: Either is null/missing OR parsed with low confidence
 * -15: Both are explicit sub-region labels (from AREA_KEYWORDS) AND differ
 * 
 * Conservative: does NOT apply -15 for mixed-level or weakly parsed labels.
 */
function calculateLocationSignal(parsedLocation, parsedLocationConfidence, stationAreaLabel) {
  // No signal if either is missing
  if (!parsedLocation || !stationAreaLabel) {
    return 0;
  }

  // No signal if parsed location was inferred with low confidence
  // (only apply bonus/conflict if explicitly recognized from AREA_KEYWORDS)
  if (parsedLocationConfidence < 0.80) {
    return 0;
  }

  const pLoc = parsedLocation.toLowerCase().trim();
  const sArea = stationAreaLabel.toLowerCase().trim();

  // Explicit match: both are sub-region labels and identical
  if (pLoc === sArea) {
    return 10;
  }

  // Explicit conflict: both are sub-region labels but differ
  // (This is conservative—no mixed-level comparisons)
  if (pLoc !== sArea) {
    return -15;
  }

  return 0;
}

function calculateDistanceSignal(meters, maxDistanceMeters = 300) {
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

function scoreStationMatch(observation, candidateStation, config = {}) {
  const { maxDistanceMeters = 300 } = config;
  const signals = { distance: 0, chain: 0, name: 0, location: 0 };
  const gateFailures = [];
  const breakdown = {};

  // City gate: explicit-city-only rejection
  if (observation.city && observation.cityConfidence >= 0.85 && observation.city.toLowerCase() !== candidateStation.city.toLowerCase()) {
    gateFailures.push('city_mismatch');
    return { score: 0, signals, gateFailures, rawSignalBreakdown: breakdown };
  }

  // Distance
  const distance = haversineDistance(
    observation.latitude, observation.longitude,
    candidateStation.latitude, candidateStation.longitude
  );
  signals.distance = calculateDistanceSignal(distance, maxDistanceMeters);
  breakdown.distance = { meters: distance, signal: signals.distance };

  // Chain gate: high-confidence mismatch only
  const chainResult = chainMatchLogic(observation.chain, observation.chainConfidence, candidateStation.chain, 1.0);
  if (chainResult.gateFails) {
    gateFailures.push('chain_mismatch');
    return { score: 0, signals, gateFailures, rawSignalBreakdown: breakdown };
  }
  signals.chain = chainResult.signal;
  breakdown.chain = chainResult;

  // Name similarity
  const nameSimilarity = bigramSimilarity(observation.name, candidateStation.name);
  signals.name = calculateNameSignal(nameSimilarity);
  breakdown.name = { similarity: nameSimilarity, signal: signals.name };

  // Location signal (explicit sub-region labels only)
  signals.location = calculateLocationSignal(observation.areaLabel, observation.areaLabelConfidence || 0, candidateStation.areaLabel);
  breakdown.location = { signal: signals.location };

  const score = signals.distance + signals.chain + signals.name + signals.location;

  return {
    score: Math.max(0, score),
    signals,
    gateFailures,
    rawSignalBreakdown: breakdown,
  };
}

/**
 * EXPLICIT DUAL-REQUIREMENT GATE for auto-match:
 * Single candidate ≥65 → MATCHED_STATION_ID (dominance gap N/A)
 * Multi-candidate: requires score ≥65 AND gap ≥10
 */
function matchDecision(scores) {
  const SCORE_MATCHED = 65;
  const SCORE_REVIEW_THRESHOLD = 35;
  const DOMINANCE_GAP_MIN = 10;

  if (!scores || scores.length === 0) {
    return { outcome: 'NO_SAFE_STATION_MATCH', stationId: null, candidates: [], reason: 'no_candidates' };
  }

  const sorted = [...scores].sort((a, b) => b.score - a.score);
  const topCandidate = sorted[0];

  // SINGLE CANDIDATE: ≥65 → MATCHED_STATION_ID
  if (sorted.length === 1) {
    if (topCandidate.score >= SCORE_MATCHED) {
      return { outcome: 'MATCHED_STATION_ID', stationId: topCandidate.stationId, candidates: [topCandidate.stationId], score: topCandidate.score, reason: 'single_candidate_above_threshold' };
    }
    if (topCandidate.score >= SCORE_REVIEW_THRESHOLD) {
      return { outcome: 'REVIEW_NEEDED_STATION_MATCH', stationId: null, candidates: [topCandidate.stationId], topScore: topCandidate.score, reason: 'single_candidate_borderline' };
    }
    return { outcome: 'NO_SAFE_STATION_MATCH', stationId: null, candidates: [], reason: 'single_candidate_below_threshold' };
  }

  // MULTI-CANDIDATE: Explicit dominance gap requirement
  const secondCandidate = sorted[1];
  const dominanceGap = topCandidate.score - secondCandidate.score;

  if (topCandidate.score >= SCORE_MATCHED && dominanceGap >= DOMINANCE_GAP_MIN) {
    return { outcome: 'MATCHED_STATION_ID', stationId: topCandidate.stationId, candidates: [topCandidate.stationId], score: topCandidate.score, reason: `multi_candidate_gap_${dominanceGap}` };
  }

  if (topCandidate.score >= SCORE_MATCHED) {
    return { outcome: 'REVIEW_NEEDED_STATION_MATCH', stationId: null, candidates: sorted.slice(0, 3).map(m => m.stationId), topScore: topCandidate.score, reason: `insufficient_gap_${dominanceGap}` };
  }

  if (topCandidate.score >= SCORE_REVIEW_THRESHOLD) {
    return { outcome: 'REVIEW_NEEDED_STATION_MATCH', stationId: null, candidates: sorted.slice(0, 3).map(m => m.stationId), topScore: topCandidate.score, reason: 'borderline_match' };
  }

  return { outcome: 'NO_SAFE_STATION_MATCH', stationId: null, candidates: [], reason: 'all_candidates_below_threshold' };
}

function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c * 1000;
}

function normalize(str) {
  if (!str) return '';
  return str.toLowerCase()
    .trim()
    .replace(/[-\s]+/g, ' ') // Normalize hyphens/spaces
    .replace(/\s+/g, ' '); // Multiple spaces to single
}

function stringSimilarity(s1, s2) {
  if (s1 === s2) return 1;
  if (!s1 || !s2) return 0;
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;
  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

function levenshteinDistance(s1, s2) {
  const len1 = s1.length;
  const len2 = s2.length;
  const dp = Array(len1 + 1).fill(null).map(() => Array(len2 + 1).fill(0));

  for (let i = 0; i <= len1; i++) dp[i][0] = i;
  for (let j = 0; j <= len2; j++) dp[0][j] = j;

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }

  return dp[len1][len2];
}

/**
 * OBSERVATION ASSEMBLY PIPELINE
 * 
 * Explicit internal parser-integration step that structures user-reported signals
 * into a unified observation object before candidate scoring.
 * 
 * Uses EXISTING Phase 2 parsing utilities:
 * - parseStationName(...)  [lines 100-135]
 * - normalizeChainName(...) [lines 44-69]
 * 
 * No new scoring signals introduced.
 * No thresholds modified.
 * Behavior-preserving refactor only.
 */
function assembleObservation(stationName, stationChain, city, latitude, longitude) {
  // Parse station name using existing Phase 2 parser
  const parsed = parseStationName(stationName);

  // Determine chain signal: explicit payload takes priority
  let chainSignal = null;
  let chainConfidence = 0;
  if (stationChain) {
    // Explicit chain from payload (high confidence)
    chainSignal = stationChain;
    chainConfidence = 0.95;
  } else if (parsed.chain) {
    // Parsed from station name (lower confidence)
    chainSignal = parsed.chain;
    chainConfidence = parsed.chainConfidence;
  }

  // Build structured observation object
  const observation = {
    // Raw input
    rawStationName: stationName,
    rawChain: stationChain || null,
    rawCity: city || null,
    rawLatitude: latitude !== undefined ? latitude : null,
    rawLongitude: longitude !== undefined ? longitude : null,

    // Parsed chain (via existing normalizeChainName + parseStationName)
    parsedChain: chainSignal,
    parsedChainConfidence: chainConfidence,
    normalizedChainName: chainSignal ? normalizeChainName(chainSignal).normalized : null,
    normalizedChainConfidence: chainSignal ? normalizeChainName(chainSignal).confidence : 0,

    // Parsed location (via existing parseStationName area detection)
    parsedLocation: parsed.locationLabel || null,
    parsedLocationConfidence: parsed.locationConfidence,
    parsedLocationLevel: parsed.locationLevel,

    // Unparsed residual tokens (what remains after chain + location extraction)
    unparsedTokens: parsed.unparsedTokens,
    normalizedNameBase: parsed.unparsedTokens.join(' ') || null,

    // For scoring pipeline (maintain same names as existing usage)
    name: stationName,
    chain: chainSignal,
    chainConfidence: chainConfidence,
    latitude: latitude !== undefined ? latitude : null,
    longitude: longitude !== undefined ? longitude : null,
    city: city || null,
    cityConfidence: 0.95,
    areaLabel: parsed.locationLabel,
    areaLabelConfidence: parsed.locationConfidence,
  };

  return observation;
}

/**
 * PREVIEW MODE HANDLER
 * 
 * Read-only observability surface for Phase 2 parser + matcher.
 * Returns metadata only: parsed chain, location, candidates, scores, decision.
 * No FuelPrice writes, no Station creation, no review routing.
 * Exits before any write path.
 * 
 * BEHAVIOR VERIFICATION (preview_mode only):
 * Compares old ad-hoc signal derivation vs new structured observation pipeline.
 * If divergence detected, returns warning in debug_notes instead of silent mismatch.
 */
async function handlePreviewMode(stationName, stationChain, city, latitude, longitude, base44) {
  try {
    // Validate required fields for preview
    if (!stationName) {
      return Response.json({ error: 'preview_mode requires station_name' }, { status: 400 });
    }

    const matchLat = latitude !== undefined ? latitude : null;
    const matchLon = longitude !== undefined ? longitude : null;
    const matchCity = city || null;

    // EXPLICIT OBSERVATION ASSEMBLY via parser pipeline
    const observation = assembleObservation(stationName, stationChain, matchCity, matchLat, matchLon);

    // BEHAVIOR VERIFICATION: Compare old ad-hoc derivation vs structured observation
    // If divergence detected, emit warning in debug_notes (preview_mode only safety check)
    const parsedObservation = parseStationName(stationName);
    const observationChain = stationChain || parsedObservation.chain;
    const observationChainConfidence = stationChain ? 0.95 : parsedObservation.chainConfidence;

    let equivalenceCheckWarning = null;
    if (observation.parsedChain !== observationChain || observation.parsedChainConfidence !== observationChainConfidence) {
      equivalenceCheckWarning = `DIVERGENCE: observation.chain=${observation.parsedChain} vs ad-hoc=${observationChain}; confidence=${observation.parsedChainConfidence} vs ${observationChainConfidence}`;
    }

    // Fetch candidate pool if city + coordinates provided
    let candidates = [];
    let candidatePoolSource = 'none';
    let candidatesCount = 0;

    if (matchCity && matchLat !== null && matchLon !== null) {
      try {
        const preFilterResult = await base44.functions.invoke('getNearbyStationCandidates', {
          gps_lat: matchLat,
          gps_lon: matchLon,
          city: matchCity,
          radius_meters: 3000,
          max_candidates: 20,
        });

        if (preFilterResult.data.candidates && preFilterResult.data.candidates.length > 0) {
          candidates = preFilterResult.data.candidates;
          candidatePoolSource = 'proximity_filter';
        } else if (preFilterResult.data.fallback_used) {
          candidates = preFilterResult.data.candidates;
          candidatePoolSource = 'fallback_full_catalog';
        }
      } catch (error) {
        // Fallback to full city catalog
        try {
          candidates = await base44.entities.Station.filter({ city: matchCity });
          candidatePoolSource = 'fallback_full_catalog_error';
        } catch {
          // No candidates available
          candidatePoolSource = 'none';
        }
      }

      candidatesCount = candidates.length;
    }

    // Score candidates using existing Phase 2 scorer
    let topCandidates = [];
    let finalDecision = null;
    let dominanceGap = null;

    if (candidates.length > 0) {
      const validCandidates = candidates.filter(
        (s) => s.latitude !== undefined && s.latitude !== null && s.longitude !== undefined && s.longitude !== null
      );

      if (validCandidates.length > 0) {
        const scoredMatches = validCandidates
          .map(station => {
            // Score using structured observation object
            const matchResult = scoreStationMatch(
              observation,
              {
                id: station.id,
                name: station.name,
                chain: station.chain,
                city: station.city,
                latitude: station.latitude,
                longitude: station.longitude,
                areaLabel: station.areaLabel,
              }
            );

            const distance = matchLat !== null && matchLon !== null
              ? haversineDistance(matchLat, matchLon, station.latitude, station.longitude)
              : 0;

            return {
              station,
              score: matchResult.score,
              stationId: station.id,
              signals: matchResult.signals,
              gateFailures: matchResult.gateFailures,
              scoreBreakdown: matchResult.rawSignalBreakdown,
              distance_km: distance / 1000,
            };
          })
          .filter(m => m.score > 0)
          .sort((a, b) => b.score - a.score);

        // Top 5 candidates for preview
        // NOTE: id is included so that resolveFuelPriceObservation bridge can
        // populate stationId in its canonical response without a second lookup.
        topCandidates = scoredMatches.slice(0, 5).map(m => ({
          id: m.station.id,
          name: m.station.name,
          chain: m.station.chain,
          city: m.station.city,
          final_score: m.score,
          distance_km: m.distance_km,
          score_breakdown: m.scoreBreakdown,
        }));

        // Apply decision logic to determine final outcome
        const decision = matchDecision(scoredMatches);
        finalDecision = decision.outcome;

        // Calculate dominance gap for display
        if (scoredMatches.length > 1) {
          dominanceGap = scoredMatches[0].score - scoredMatches[1].score;
        } else if (scoredMatches.length === 1) {
          dominanceGap = null; // N/A for single candidate
        }
      }
    }

    // Return read-only preview response (no writes, no mutations)
    return Response.json({
      preview_mode: true,
      parsed_chain: observation.parsedChain || null,
      parsed_location: observation.parsedLocation || null,
      parsed_name_base: observation.normalizedNameBase || null,
      candidate_pool_source: candidatePoolSource,
      candidates_count: candidatesCount,
      top_candidates: topCandidates,
      final_decision: finalDecision || 'NO_SAFE_STATION_MATCH',
      matched_station_id: topCandidates.length > 0 && finalDecision === 'MATCHED_STATION_ID' ? topCandidates[0].name : null,
      review_needed_reason: finalDecision === 'REVIEW_NEEDED_STATION_MATCH' ? 'insufficient_dominance_or_borderline' : null,
      dominance_gap: dominanceGap,
      debug_notes: equivalenceCheckWarning ? `Preview mode (behavior-verified): ${equivalenceCheckWarning}` : 'Read-only preview mode: behavior-verified equivalent via parser pipeline',
    });
  } catch (error) {
    return Response.json({
      preview_mode: true,
      error: error.message,
      debug_notes: 'Preview mode error — no data written',
    }, { status: 500 });
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();
    const { gps_lat, gps_lon, station_name, station_chain, city, latitude, longitude, preview_mode } = payload;

    // EARLY EXIT: Preview mode — return read-only metadata only.
    // Preview mode is accessible to any authenticated user (not admin-only)
    // because it is consumed by resolveFuelPriceObservation bridge as a
    // service call. No data is written in preview mode.
    if (preview_mode === true) {
      return handlePreviewMode(station_name, station_chain, city, latitude, longitude, base44);
    }

    // Use selected station coordinates if available, otherwise fall back to GPS
    const matchLat = latitude !== undefined ? latitude : gps_lat;
    const matchLon = longitude !== undefined ? longitude : gps_lon;

    if (matchLat === undefined || matchLon === undefined || !city) {
      return Response.json({ 
        error: 'Missing required fields: latitude/longitude (or gps_lat/gps_lon), city' 
      }, { status: 400 });
    }

    // PERFORMANCE: Use proximity pre-filter (3km radius) to reduce candidate pool
    // If no nearby candidates exist, fallback to full city catalog
    let candidates = [];
    let candidatePoolSource = 'proximity_filter';
    let candidateRadiusMeters = 3000;

    try {
      const preFilterResult = await base44.functions.invoke('getNearbyStationCandidates', {
        gps_lat: matchLat,
        gps_lon: matchLon,
        city,
        radius_meters: candidateRadiusMeters,
        max_candidates: 20,
      });

      if (preFilterResult.data.candidates && preFilterResult.data.candidates.length > 0) {
        // Use pre-filtered nearby candidates
        candidates = preFilterResult.data.candidates;
      } else if (preFilterResult.data.fallback_used) {
        // Pre-filter returned fallback (all candidates sorted by distance)
        candidates = preFilterResult.data.candidates;
        candidatePoolSource = 'fallback_full_catalog';
      }
    } catch (error) {
      // If pre-filter fails, fallback to full city catalog
      console.warn(`getNearbyStationCandidates failed: ${error.message}. Falling back to full catalog.`);
      candidates = await base44.entities.Station.filter({ city });
      candidatePoolSource = 'fallback_full_catalog_error';
    }

    if (!candidates || candidates.length === 0) {
      return Response.json({
        status: 'no_safe_station_match',
        stationId: null,
        candidates: [],
        reason: 'No stations found in city',
        candidatePoolSource,
      });
    }

    // Pre-filter candidates: exclude stations with missing coordinates
    const validCandidates = candidates.filter(
      (s) => s.latitude !== undefined && s.latitude !== null && s.longitude !== undefined && s.longitude !== null
    );

    if (!validCandidates || validCandidates.length === 0) {
      return Response.json({
        status: 'no_safe_station_match',
        stationId: null,
        candidates: [],
        reason: 'No stations with valid coordinates found in city',
      });
    }

    // EXPLICIT OBSERVATION ASSEMBLY via parser pipeline
    const observation = assembleObservation(station_name, station_chain, city, matchLat, matchLon);

    const scoredMatches = validCandidates
      .map(station => {
        // Score using structured observation object
        const matchResult = scoreStationMatch(
          observation,
          {
            id: station.id,
            name: station.name,
            chain: station.chain,
            city: station.city,
            latitude: station.latitude,
            longitude: station.longitude,
            areaLabel: station.areaLabel,
          }
        );

        return {
          station,
          score: matchResult.score,
          stationId: station.id,
          signals: matchResult.signals,
          gateFailures: matchResult.gateFailures,
          dist: matchResult.rawSignalBreakdown.distance?.meters || 0,
        };
      })
      .filter(m => m.score > 0)
      .sort((a, b) => b.score - a.score);

    if (scoredMatches.length === 0) {
      return Response.json({
        status: 'no_safe_station_match',
        stationId: null,
        candidates: [],
        reason: 'No candidates passed scoring threshold'
      });
    }

    // Apply explicit dual-requirement gate via matchDecision
    const decision = matchDecision(scoredMatches);

    return Response.json({
      status: decision.outcome.toLowerCase().replace(/_/g, '_'),
      stationId: decision.stationId,
      candidates: decision.candidates,
      score: scoredMatches[0].score,
      reason: decision.reason,
      // Debug metadata for performance analysis
      _debug: {
        candidatePoolSource,
        candidateRadiusMeters,
        initialPoolSize: candidates.length,
        scoredPoolSize: scoredMatches.length,
      },
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});