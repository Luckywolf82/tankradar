/**
 * PHASE 2 STATION MATCHING UTILITY
 * 
 * Consolidated utility for user_reported price matching.
 * Implements the complete matching specification with conservative signal weighting.
 * 
 * Observation-side confidence is internal heuristic metadata only.
 * Station master-data fields are explicit/authoritative when present.
 * City prefiltering is an existing entrypoint constraint, not guaranteed by matcher.
 */

// ============================================================================
// CHAIN NORMALIZATION
// ============================================================================

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

/**
 * Normalize a chain name to canonical form.
 * Returns {normalized, confidence} where confidence is heuristic only.
 */
export function normalizeChainName(rawChain) {
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

/**
 * Check if two chains match (observation vs station).
 * Returns {matches, signal, gateFails, reason}.
 * Gate fails ONLY if both chains are high-confidence (≥0.85) and differ.
 */
export function chainMatch(obsChain, obsChainConfidence, stnChain, stnChainConfidence) {
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

// ============================================================================
// STATION NAME PARSER
// ============================================================================

/**
 * Parse station observation name into components.
 * Returns {chain, chainConfidence, locationLabel, locationLevel, ...tokens}.
 * Confidence is heuristic only; unknown values remain null.
 */
export function parseStationName(rawName) {
  if (!rawName || typeof rawName !== 'string') {
    return {
      chain: null,
      chainConfidence: 0,
      locationLabel: null,
      locationLevel: null,
      chainTokens: [],
      locationTokens: [],
      unparsedTokens: [],
    };
  }

  const tokens = rawName.toLowerCase().trim().split(/\s+/);
  const result = {
    chain: null,
    chainConfidence: 0,
    locationLabel: null,
    locationLevel: null,
    chainTokens: [],
    locationTokens: [],
    unparsedTokens: [],
  };

  // Identify chain in first token(s)
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

  // Extract location label from remaining tokens
  const areaKeywords = [
    'heimdal', 'lade', 'singsås', 'torgata', 'nidaros', 'sentrum',
    'lerkendal', 'moholt', 'bakklandet', 'ranheim', 'leinstrand',
  ];

  for (const token of tokens) {
    if (areaKeywords.includes(token)) {
      result.locationLabel = token;
      result.locationLevel = 'area';
      result.locationTokens.push(token);
      break;
    }
  }

  result.unparsedTokens = tokens.filter(
    (t) => !result.chainTokens.includes(t) && !result.locationTokens.includes(t)
  );

  return result;
}

/**
 * Extract area/neighborhood label from name.
 * Returns {label, confidence, source} with confidence as heuristic only.
 */
export function extractLocationLabel(name) {
  if (!name || typeof name !== 'string') {
    return { label: null, confidence: 0, source: null };
  }

  const areaKeywords = [
    'heimdal', 'lade', 'singsås', 'torgata', 'nidaros', 'sentrum',
    'lerkendal', 'moholt', 'bakklandet', 'ranheim', 'leinstrand',
  ];

  const lowerName = name.toLowerCase();
  for (const area of areaKeywords) {
    if (lowerName.includes(area)) {
      return { label: area, confidence: 0.85, source: 'explicit' };
    }
  }

  return { label: null, confidence: 0, source: null };
}

/**
 * Bigram similarity: 0–1 scale for name matching.
 */
export function bigramSimilarity(name1, name2) {
  if (!name1 || !name2) return 0;
  if (name1.toLowerCase() === name2.toLowerCase()) return 1;

  const n1 = normalize(name1);
  const n2 = normalize(name2);

  const bigrams1 = extractBigrams(n1);
  const bigrams2 = extractBigrams(n2);

  if (bigrams1.size === 0 || bigrams2.size === 0) return 0;

  const intersection = new Set([...bigrams1].filter((x) => bigrams2.has(x)));
  const union = new Set([...bigrams1, ...bigrams2]);

  return intersection.size / union.size;
}

// ============================================================================
// STATION MATCHING
// ============================================================================

/**
 * Haversine distance in meters.
 */
export function haversineDistance(lat1, lon1, lat2, lon2) {
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

/**
 * City gate: explicit-city-only rejection.
 */
export function cityGate(obsCity, obsCityConfidence, stnCity) {
  if (!obsCity) {
    return { passes: true, reason: 'obs_city_null_neutral' };
  }

  if (obsCityConfidence >= 0.85 && obsCity.toLowerCase() !== stnCity.toLowerCase()) {
    return { passes: false, reason: 'explicit_city_mismatch' };
  }

  return { passes: true, reason: 'city_compatible' };
}

/**
 * Location signal: +10, 0, or -15 (exact per specification).
 */
export function calculateLocationSignal(parsedLocation, stationAreaLabel) {
  if (!parsedLocation || !stationAreaLabel) {
    return 0;
  }

  const pLoc = parsedLocation.toLowerCase().trim();
  const sArea = stationAreaLabel.toLowerCase().trim();

  if (pLoc === sArea) {
    return 10;
  }

  if (pLoc !== sArea) {
    return -15;
  }

  return 0;
}

/**
 * Distance signal: 0–30 points based on distance bands.
 */
export function calculateDistanceSignal(meters, maxDistanceMeters = 300) {
  if (meters <= 30) return 30;
  if (meters <= 75) return 20;
  if (meters <= 150) return 10;
  if (meters <= 300) return 5;
  return 0;
}

/**
 * Name signal: 0–30 points based on bigram similarity.
 */
export function calculateNameSignal(similarity) {
  if (similarity >= 0.95) return 30;
  if (similarity >= 0.85) return 20;
  if (similarity >= 0.70) return 10;
  if (similarity >= 0.50) return 5;
  return 0;
}

/**
 * Score observation against candidate station.
 * Returns {score, signals, gateFailures, rawSignalBreakdown}.
 */
export function scoreStationMatch(observation, candidateStation, config = {}) {
  const { maxDistanceMeters = 300 } = config;

  const signals = { distance: 0, chain: 0, name: 0, location: 0 };
  const gateFailures = [];
  const breakdown = {};

  // GATE 1: City
  const cityGateResult = cityGate(observation.city, observation.cityConfidence, candidateStation.city);
  breakdown.cityGate = cityGateResult;
  if (!cityGateResult.passes) {
    gateFailures.push('city_mismatch');
    return { score: 0, signals, gateFailures, rawSignalBreakdown: breakdown };
  }

  // GATE 2: Distance (not hard-disqualifier)
  const distance = haversineDistance(
    observation.latitude,
    observation.longitude,
    candidateStation.latitude,
    candidateStation.longitude
  );
  breakdown.distance = { meters: distance, signal: calculateDistanceSignal(distance, maxDistanceMeters) };
  signals.distance = calculateDistanceSignal(distance, maxDistanceMeters);

  // GATE 3: Chain (high-conf mismatch only)
  const chainResult = chainMatch(
    observation.chain,
    observation.chainConfidence,
    candidateStation.chain,
    1.0 // Station chain is master data
  );
  breakdown.chain = chainResult;
  if (chainResult.gateFails) {
    gateFailures.push('chain_mismatch');
    return { score: 0, signals, gateFailures, rawSignalBreakdown: breakdown };
  }
  signals.chain = chainResult.signal;

  // SCORING: Name
  const nameSimilarity = bigramSimilarity(observation.name, candidateStation.name);
  signals.name = calculateNameSignal(nameSimilarity);
  breakdown.name = { similarity: nameSimilarity, signal: signals.name };

  // SCORING: Location
  signals.location = calculateLocationSignal(observation.areaLabel, candidateStation.areaLabel);
  breakdown.location = { signal: signals.location, reason: describeLocationSignal(signals.location) };

  const score = signals.distance + signals.chain + signals.name + signals.location;

  return {
    score: Math.max(0, score),
    signals,
    gateFailures,
    rawSignalBreakdown: breakdown,
  };
}

/**
 * Match decision: applies EXPLICIT dual-requirement gate.
 * Single candidate ≥65 → MATCHED_STATION_ID (gap N/A).
 * Multi-candidate: requires score ≥65 AND gap ≥10.
 */
export function matchDecision(scores) {
  const SCORE_MATCHED = 65;
  const SCORE_REVIEW_THRESHOLD = 35;
  const DOMINANCE_GAP_MIN = 10;

  if (!scores || scores.length === 0) {
    return {
      outcome: 'NO_SAFE_STATION_MATCH',
      selectedStationId: null,
      candidatesForReview: [],
      reason: 'no_candidates',
    };
  }

  const sorted = [...scores].sort((a, b) => b.score - a.score);
  const topCandidate = sorted[0];

  // SINGLE CANDIDATE: ≥65 → MATCHED_STATION_ID
  if (sorted.length === 1) {
    if (topCandidate.score >= SCORE_MATCHED) {
      return {
        outcome: 'MATCHED_STATION_ID',
        selectedStationId: topCandidate.candidateId,
        candidatesForReview: [],
        reason: 'single_candidate_above_threshold',
      };
    }

    if (topCandidate.score >= SCORE_REVIEW_THRESHOLD) {
      return {
        outcome: 'REVIEW_NEEDED_STATION_MATCH',
        selectedStationId: null,
        candidatesForReview: [topCandidate.candidateId],
        reason: 'single_candidate_borderline',
      };
    }

    return {
      outcome: 'NO_SAFE_STATION_MATCH',
      selectedStationId: null,
      candidatesForReview: [],
      reason: 'single_candidate_below_threshold',
    };
  }

  // MULTI-CANDIDATE: Explicit dominance gap requirement
  const secondCandidate = sorted[1];
  const dominanceGap = topCandidate.score - secondCandidate.score;

  if (topCandidate.score >= SCORE_MATCHED && dominanceGap >= DOMINANCE_GAP_MIN) {
    return {
      outcome: 'MATCHED_STATION_ID',
      selectedStationId: topCandidate.candidateId,
      candidatesForReview: [],
      reason: `multi_candidate_high_confidence_gap_${dominanceGap}`,
    };
  }

  if (topCandidate.score >= SCORE_MATCHED) {
    return {
      outcome: 'REVIEW_NEEDED_STATION_MATCH',
      selectedStationId: null,
      candidatesForReview: sorted.slice(0, 3).map((m) => m.candidateId),
      reason: `multi_candidate_insufficient_dominance_gap_${dominanceGap}`,
    };
  }

  if (topCandidate.score >= SCORE_REVIEW_THRESHOLD) {
    return {
      outcome: 'REVIEW_NEEDED_STATION_MATCH',
      selectedStationId: null,
      candidatesForReview: sorted.slice(0, 3).map((m) => m.candidateId),
      reason: 'borderline_match_requires_review',
    };
  }

  return {
    outcome: 'NO_SAFE_STATION_MATCH',
    selectedStationId: null,
    candidatesForReview: [],
    reason: 'no_candidates_above_review_threshold',
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

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
  const dp = Array(len1 + 1)
    .fill(null)
    .map(() => Array(len2 + 1).fill(0));

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

function normalize(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .trim()
    .replace(/[-\s]+/g, ' ')
    .replace(/\s+/g, ' ');
}

function extractBigrams(str) {
  const cleaned = str.replace(/\s+/g, '');
  const bigrams = new Set();
  for (let i = 0; i < cleaned.length - 1; i++) {
    bigrams.add(cleaned.substr(i, 2));
  }
  return bigrams;
}

function describeLocationSignal(signal) {
  if (signal === 10) return 'area_match_bonus';
  if (signal === -15) return 'area_conflict_penalty';
  return 'no_location_signal';
}