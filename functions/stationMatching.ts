/**
 * Station Matching Utility
 * 
 * Core scoring engine per matching specification.
 * Implements conservative signal weighting and explicit dual-requirement gate for auto-match.
 * 
 * EXPLICIT CONSTRAINT: City prefiltering by explicit city is an existing constraint
 * of the entrypoint (functions/matchStationForUserReportedPrice.js), not guaranteed by matcher.
 */

import { chainMatch } from './chainNormalization.js';
import { parseStationName, bigramSimilarity } from './stationNameParser.js';

/**
 * Calculate haversine distance between two coordinates (meters).
 * 
 * @param {number} lat1
 * @param {number} lon1
 * @param {number} lat2
 * @param {number} lon2
 * @returns {number} Distance in meters
 */
export function haversineDistance(lat1, lon1, lat2, lon2) {
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

/**
 * City gate: Check if cities match.
 * Gate REJECTS (instant disqualification) ONLY if both cities are explicit
 * and high-confidence (heuristic ≥0.85) and they differ.
 * 
 * CONSTRAINT: City prefiltering is done by entrypoint before calling matcher.
 * This gate documents the explicit-city-only rejection rule.
 * 
 * @param {string | null} obsCity - Observation city (explicit or null)
 * @param {number} obsCityConfidence - Heuristic confidence (internal only)
 * @param {string} stnCity - Station city (master data, explicit)
 * @returns {{passes: boolean, reason: string}}
 */
export function cityGate(obsCity, obsCityConfidence, stnCity) {
  // Null observation city: neutral, pass
  if (!obsCity) {
    return { passes: true, reason: 'obs_city_null_neutral' };
  }

  // Both explicit and high-confidence
  if (obsCityConfidence >= 0.85 && obsCity.toLowerCase() !== stnCity.toLowerCase()) {
    return { passes: false, reason: 'explicit_city_mismatch' };
  }

  return { passes: true, reason: 'city_compatible' };
}

/**
 * Location conflict detection: area-level conflicts only.
 * Returns -15 (conflict), 0 (neutral), or +10 (match bonus).
 * 
 * CONFLICT triggered ONLY if:
 *   - observation has parsed location sub-region (e.g., "Heimdal")
 *   - station has explicit areaLabel (same geographic level)
 *   - parsedLocation ≠ areaLabel (normalized comparison)
 * 
 * @param {string | null} parsedLocation - Parsed area from observation name
 * @param {string | null} stationAreaLabel - Station's area label (master data)
 * @returns {-15 | 0 | 10}
 */
export function calculateLocationSignal(parsedLocation, stationAreaLabel) {
  // No signal: either or both null/missing
  if (!parsedLocation || !stationAreaLabel) {
    return 0;
  }

  const pLoc = parsedLocation.toLowerCase().trim();
  const sArea = stationAreaLabel.toLowerCase().trim();

  // Explicit area match: bonus
  if (pLoc === sArea) {
    return 10;
  }

  // Explicit area conflict: penalty
  if (pLoc !== sArea) {
    return -15;
  }

  return 0;
}

/**
 * Distance signal: 0–30 points based on distance bands.
 * 
 * @param {number} meters - Distance in meters
 * @param {number} maxDistanceMeters - Max distance threshold (default 300m)
 * @returns {0 | 5 | 10 | 20 | 30}
 */
export function calculateDistanceSignal(meters, maxDistanceMeters = 300) {
  if (meters <= 30) return 30;
  if (meters <= 75) return 20;
  if (meters <= 150) return 10;
  if (meters <= 300) return 5;
  return 0; // Beyond 300m: 0 points, matching continues if other signals strong
}

/**
 * Name similarity signal: 0–30 points based on bigram similarity.
 * 
 * @param {number} similarity - Bigram similarity (0–1)
 * @returns {0 | 5 | 10 | 20 | 30}
 */
export function calculateNameSignal(similarity) {
  if (similarity >= 0.95) return 30;
  if (similarity >= 0.85) return 20;
  if (similarity >= 0.70) return 10;
  if (similarity >= 0.50) return 5;
  return 0;
}

/**
 * Score a single observation against one candidate station.
 * 
 * @param {Object} observation
 *   - name: string (raw observation name)
 *   - chain: string | null (parsed chain from name)
 *   - chainConfidence: number (heuristic, internal use only)
 *   - latitude: number
 *   - longitude: number
 *   - city: string | null (explicit city)
 *   - cityConfidence: number (heuristic, internal use only)
 *   - areaLabel: string | null (parsed area from name)
 * 
 * @param {Object} candidateStation
 *   - id: string
 *   - name: string
 *   - chain: string | null (master data, explicit when present)
 *   - city: string (master data, explicit)
 *   - latitude: number
 *   - longitude: number
 *   - areaLabel: string | null (master data)
 * 
 * @param {Object} config
 *   - maxDistanceMeters: number (default 300)
 * 
 * @returns {Object}
 *   - score: number (0–95)
 *   - signals: {distance, chain, name, location}
 *   - gateFailures: string[] (reason for any gate failures)
 *   - rawSignalBreakdown: Object (for debugging)
 */
export function scoreStationMatch(observation, candidateStation, config = {}) {
  const { maxDistanceMeters = 300 } = config;

  const signals = {
    distance: 0,
    chain: 0,
    name: 0,
    location: 0,
  };

  const gateFailures = [];
  const breakdown = {};

  // GATE 1: City gate (explicit-city-only rejection)
  const cityGateResult = cityGate(observation.city, observation.cityConfidence, candidateStation.city);
  breakdown.cityGate = cityGateResult;
  if (!cityGateResult.passes) {
    gateFailures.push('city_mismatch');
    return {
      score: 0,
      signals,
      gateFailures,
      rawSignalBreakdown: breakdown,
    };
  }

  // GATE 2: Distance (not a hard disqualifier, but contributes 0 points beyond threshold)
  const distance = haversineDistance(
    observation.latitude,
    observation.longitude,
    candidateStation.latitude,
    candidateStation.longitude
  );
  breakdown.distance = { meters: distance, signal: calculateDistanceSignal(distance, maxDistanceMeters) };
  signals.distance = calculateDistanceSignal(distance, maxDistanceMeters);

  // GATE 3: Chain gate (high-confidence mismatch only)
  const chainResult = chainMatch(
    observation.chain,
    observation.chainConfidence,
    candidateStation.chain,
    1.0 // Station chain is master data (explicit, high confidence when present)
  );
  breakdown.chain = chainResult;
  if (chainResult.gateFails) {
    gateFailures.push('chain_mismatch');
    return {
      score: 0,
      signals,
      gateFailures,
      rawSignalBreakdown: breakdown,
    };
  }
  signals.chain = chainResult.signal;

  // SCORING: Name similarity
  const nameSimilarity = bigramSimilarity(observation.name, candidateStation.name);
  signals.name = calculateNameSignal(nameSimilarity);
  breakdown.name = { similarity: nameSimilarity, signal: signals.name };

  // SCORING: Location signal (area conflict detection)
  signals.location = calculateLocationSignal(observation.areaLabel, candidateStation.areaLabel);
  breakdown.location = { signal: signals.location, reason: describeLocationSignal(signals.location) };

  // Total score
  const score = signals.distance + signals.chain + signals.name + signals.location;

  return {
    score: Math.max(0, score),
    signals,
    gateFailures,
    rawSignalBreakdown: breakdown,
  };
}

/**
 * Match decision logic: applies EXPLICIT dual-requirement gate for auto-match.
 * 
 * DUAL REQUIREMENT for MATCHED_STATION_ID:
 *   (1) Top candidate score ≥ 65
 *   (2) EXPLICIT dominance gap check:
 *       - Single candidate in pool: gap = N/A, requirement satisfied by default
 *       - Two or more candidates: gap = top_score − second_best_score ≥ 10
 * 
 * @param {Array<{candidateId: string, score: number, signals: Object}>} scores
 * @returns {{
 *   outcome: 'MATCHED_STATION_ID' | 'REVIEW_NEEDED_STATION_MATCH' | 'NO_SAFE_STATION_MATCH',
 *   selectedStationId: string | null,
 *   candidatesForReview: string[],
 *   reason: string
 * }}
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

  // EXPLICIT SINGLE-CANDIDATE CASE: ≥65 → MATCHED_STATION_ID (dominance gap N/A)
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

  // MULTI-CANDIDATE CASE: Explicit dominance gap requirement
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

  // If top candidate ≥65 but gap <10: review needed
  if (topCandidate.score >= SCORE_MATCHED) {
    return {
      outcome: 'REVIEW_NEEDED_STATION_MATCH',
      selectedStationId: null,
      candidatesForReview: sorted.slice(0, 3).map((m) => m.candidateId),
      reason: `multi_candidate_insufficient_dominance_gap_${dominanceGap}`,
    };
  }

  // Top candidate 35–64: review needed
  if (topCandidate.score >= SCORE_REVIEW_THRESHOLD) {
    return {
      outcome: 'REVIEW_NEEDED_STATION_MATCH',
      selectedStationId: null,
      candidatesForReview: sorted.slice(0, 3).map((m) => m.candidateId),
      reason: 'borderline_match_requires_review',
    };
  }

  // All candidates <35: no safe match
  return {
    outcome: 'NO_SAFE_STATION_MATCH',
    selectedStationId: null,
    candidatesForReview: [],
    reason: 'no_candidates_above_review_threshold',
  };
}

/**
 * Helper: Describe location signal for debugging.
 * 
 * @param {number} signal
 * @returns {string}
 */
function describeLocationSignal(signal) {
  if (signal === 10) return 'area_match_bonus';
  if (signal === -15) return 'area_conflict_penalty';
  return 'no_location_signal';
}