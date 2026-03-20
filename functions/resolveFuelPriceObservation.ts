/**
 * STATION RESOLUTION PIPELINE (SRP) — PREVIEW ENGINE
 * TankRadar Governance v1.3.2
 *
 * resolveFuelPriceObservation
 *
 * PURPOSE:
 * Accepts a normalized fuel price observation and returns the canonical SRP
 * resolution result — without writing anything to any entity.
 *
 * This is the first real runtime artifact of the SRP shared decision engine.
 * It is preview-only. No mutation paths exist in this function.
 *
 * MATCHING LOGIC:
 * All Phase 2 matching logic is inlined here (no local imports allowed in Deno
 * backend functions). The thresholds, scoring weights, dominance-gap behavior,
 * and outcome semantics are IDENTICAL to stationMatchingUtility.
 * Nothing has been changed — only wrapped additively.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

const SRP_VERSION = "srp_preview_v1.0";
const SPEC_VERSION = "v1.3.2";

// ════════════════════════════════════════════════════════════
// INLINED PHASE 2 MATCHING ENGINE
// Preserved verbatim from stationMatchingUtility governance spec.
// Do NOT alter thresholds or outcome semantics.
// ════════════════════════════════════════════════════════════

const SCORE_MATCHED = 65;
const SCORE_REVIEW_THRESHOLD = 35;
const DOMINANCE_GAP_MIN = 10;
const CITY_CONFIDENCE_EXPLICIT = 0.85;

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

function stringSimilarity(s1, s2) {
  if (s1 === s2) return 1;
  if (!s1 || !s2) return 0;
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;
  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

function levenshteinDistance(s1, s2) {
  const len1 = s1.length, len2 = s2.length;
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

function normalizeStr(str) {
  if (!str) return '';
  return str.toLowerCase().trim().replace(/[-\s]+/g, ' ').replace(/\s+/g, ' ');
}

function extractBigrams(str) {
  const cleaned = str.replace(/\s+/g, '');
  const bigrams = new Set();
  for (let i = 0; i < cleaned.length - 1; i++) bigrams.add(cleaned.substr(i, 2));
  return bigrams;
}

function bigramSimilarity(name1, name2) {
  if (!name1 || !name2) return 0;
  if (name1.toLowerCase() === name2.toLowerCase()) return 1;
  const n1 = normalizeStr(name1), n2 = normalizeStr(name2);
  const b1 = extractBigrams(n1), b2 = extractBigrams(n2);
  if (b1.size === 0 || b2.size === 0) return 0;
  const intersection = new Set([...b1].filter(x => b2.has(x)));
  const union = new Set([...b1, ...b2]);
  return intersection.size / union.size;
}

function normalizeChainName(rawChain) {
  if (!rawChain || typeof rawChain !== 'string') return { normalized: null, confidence: 0 };
  const trimmed = rawChain.toLowerCase().trim();
  for (const [canonical, aliases] of Object.entries(KNOWN_CHAINS)) {
    for (const alias of aliases) {
      if (trimmed === alias) return { normalized: canonical, confidence: 0.92 };
    }
  }
  for (const [canonical, aliases] of Object.entries(KNOWN_CHAINS)) {
    for (const alias of aliases) {
      const similarity = stringSimilarity(trimmed, alias);
      if (similarity >= 0.80) return { normalized: canonical, confidence: Math.max(0.50, similarity - 0.30) };
    }
  }
  return { normalized: null, confidence: 0 };
}

function chainMatch(obsChain, obsChainConfidence, stnChain) {
  if (!obsChain && !stnChain) return { matches: true, signal: 0, gateFails: false, reason: 'both_chains_null' };
  if (!obsChain) return { matches: true, signal: 0, gateFails: false, reason: 'obs_chain_null_neutral' };
  if (!stnChain) return { matches: true, signal: 0, gateFails: false, reason: 'stn_chain_null_neutral' };
  const normalizedObs = normalizeChainName(obsChain);
  const normalizedStn = normalizeChainName(stnChain);
  if (normalizedObs.normalized === normalizedStn.normalized && normalizedObs.normalized) {
    return { matches: true, signal: 25, gateFails: false, reason: 'exact_match' };
  }
  if (normalizedObs.normalized && normalizedStn.normalized) {
    if ((obsChainConfidence || 0) >= 0.85) {
      return { matches: false, signal: 0, gateFails: true, reason: 'high_confidence_mismatch' };
    }
  }
  return { matches: true, signal: 0, gateFails: false, reason: 'weak_or_uncertain_chains' };
}

function parseStationName(rawName) {
  if (!rawName || typeof rawName !== 'string') {
    return { chain: null, chainConfidence: 0, locationLabel: null, locationLevel: null };
  }
  const tokens = rawName.toLowerCase().trim().split(/\s+/);
  const result = { chain: null, chainConfidence: 0, locationLabel: null, locationLevel: null };
  for (const [canonical, aliases] of Object.entries(KNOWN_CHAINS)) {
    for (const alias of aliases) {
      const aliasTokens = alias.split(/\s+/);
      const nameStart = tokens.slice(0, aliasTokens.length).join(' ');
      if (nameStart === alias) {
        result.chain = canonical;
        result.chainConfidence = 0.92;
        tokens.splice(0, aliasTokens.length);
        break;
      }
    }
    if (result.chain) break;
  }
  for (const token of tokens) {
    if (AREA_KEYWORDS.includes(token)) {
      result.locationLabel = token;
      result.locationLevel = 'area';
      break;
    }
  }
  return result;
}

function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 1000;
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

function calculateLocationSignal(parsedLocation, stationAreaLabel) {
  if (!parsedLocation || !stationAreaLabel) return 0;
  const pLoc = parsedLocation.toLowerCase().trim();
  const sArea = stationAreaLabel.toLowerCase().trim();
  if (pLoc === sArea) return 10;
  if (pLoc !== sArea) return -15;
  return 0;
}

function scoreStationMatch(observation, candidateStation) {
  const signals = { distance: 0, chain: 0, name: 0, location: 0 };
  const gateFailures = [];
  const breakdown = {};

  // City gate
  if (observation.city && (observation.cityConfidence || 0) >= 0.85) {
    if (candidateStation.city && observation.city.toLowerCase() !== candidateStation.city.toLowerCase()) {
      gateFailures.push('city_mismatch');
      breakdown.cityGate = { passes: false, reason: 'explicit_city_mismatch' };
      return { score: 0, signals, gateFailures, breakdown };
    }
  }
  breakdown.cityGate = { passes: true, reason: 'city_compatible' };

  // Distance signal
  if (observation.latitude != null && observation.longitude != null &&
      candidateStation.latitude != null && candidateStation.longitude != null) {
    const distance = haversineDistance(
      observation.latitude, observation.longitude,
      candidateStation.latitude, candidateStation.longitude
    );
    signals.distance = calculateDistanceSignal(distance);
    breakdown.distance = { meters: Math.round(distance), signal: signals.distance };
  }

  // Chain signal
  const chainResult = chainMatch(observation.chain, observation.chainConfidence, candidateStation.chain);
  breakdown.chain = chainResult;
  if (chainResult.gateFails) {
    gateFailures.push('chain_mismatch');
    return { score: 0, signals, gateFailures, breakdown };
  }
  signals.chain = chainResult.signal;

  // Name signal
  const nameSimilarity = bigramSimilarity(observation.name, candidateStation.name);
  signals.name = calculateNameSignal(nameSimilarity);
  breakdown.name = { similarity: Math.round(nameSimilarity * 100) / 100, signal: signals.name };

  // Location/area signal
  signals.location = calculateLocationSignal(observation.areaLabel, candidateStation.areaLabel);
  breakdown.location = { signal: signals.location };

  const score = Math.max(0, signals.distance + signals.chain + signals.name + signals.location);
  return { score, signals, gateFailures, breakdown };
}

function matchDecision(scores) {
  if (!scores || scores.length === 0) {
    return { outcome: 'NO_SAFE_STATION_MATCH', selectedStationId: null, candidatesForReview: [], reason: 'no_candidates' };
  }
  const sorted = [...scores].sort((a, b) => b.score - a.score);
  const top = sorted[0];

  if (sorted.length === 1) {
    if (top.score >= SCORE_MATCHED) {
      return { outcome: 'MATCHED_STATION_ID', selectedStationId: top.candidateId, candidatesForReview: [], reason: 'single_candidate_above_threshold' };
    }
    if (top.score >= SCORE_REVIEW_THRESHOLD) {
      return { outcome: 'REVIEW_NEEDED_STATION_MATCH', selectedStationId: null, candidatesForReview: [top.candidateId], reason: 'single_candidate_borderline' };
    }
    return { outcome: 'NO_SAFE_STATION_MATCH', selectedStationId: null, candidatesForReview: [], reason: 'single_candidate_below_threshold' };
  }

  const second = sorted[1];
  const dominanceGap = top.score - second.score;

  if (top.score >= SCORE_MATCHED && dominanceGap >= DOMINANCE_GAP_MIN) {
    return { outcome: 'MATCHED_STATION_ID', selectedStationId: top.candidateId, candidatesForReview: [], reason: `multi_candidate_high_confidence_gap_${dominanceGap}` };
  }
  if (top.score >= SCORE_MATCHED) {
    return { outcome: 'REVIEW_NEEDED_STATION_MATCH', selectedStationId: null, candidatesForReview: sorted.slice(0, 3).map(m => m.candidateId), reason: `multi_candidate_insufficient_dominance_gap_${dominanceGap}` };
  }
  if (top.score >= SCORE_REVIEW_THRESHOLD) {
    return { outcome: 'REVIEW_NEEDED_STATION_MATCH', selectedStationId: null, candidatesForReview: sorted.slice(0, 3).map(m => m.candidateId), reason: 'borderline_match_requires_review' };
  }
  return { outcome: 'NO_SAFE_STATION_MATCH', selectedStationId: null, candidatesForReview: [], reason: 'no_candidates_above_review_threshold' };
}

// ════════════════════════════════════════════════════════════
// PLAUSIBILITY CHECK
// Norwegian fuel price norms (NOK/L).
// Thresholds are governance-defined — do not alter without spec change.
// ════════════════════════════════════════════════════════════

const PLAUSIBILITY_THRESHOLDS = {
  gasoline_95:   { low: 14.0, high: 26.5 },
  gasoline_98:   { low: 14.5, high: 27.5 },
  bensin_95:     { low: 14.0, high: 26.5 },
  bensin_98:     { low: 14.5, high: 27.5 },
  diesel:        { low: 13.0, high: 25.5 },
  diesel_premium:{ low: 13.5, high: 26.0 },
  other:         { low: 5.0,  high: 40.0 },
};

function classifyPlausibility(fuelType, priceNok) {
  if (priceNok == null || isNaN(priceNok)) return 'suspect_price_low';
  const thresholds = PLAUSIBILITY_THRESHOLDS[fuelType] || PLAUSIBILITY_THRESHOLDS.other;
  if (priceNok < thresholds.low) return 'suspect_price_low';
  if (priceNok > thresholds.high) return 'suspect_price_high';
  return 'realistic_price';
}

// ════════════════════════════════════════════════════════════
// CONFIDENCE SCORE MAPPING
// Maps raw match score → normalised confidence [0..1]
// ════════════════════════════════════════════════════════════

function deriveConfidenceScore(outcome, rawScore, dominanceGap) {
  if (outcome === 'MATCHED_STATION_ID') {
    if (rawScore >= 80 && (dominanceGap || 0) >= 20) return 0.92;
    if (rawScore >= 65 && (dominanceGap || 0) >= DOMINANCE_GAP_MIN) return 0.82;
    return 0.65; // matched but narrow dominance
  }
  if (outcome === 'REVIEW_NEEDED_STATION_MATCH') {
    if (rawScore >= 55) return 0.45;
    return 0.30;
  }
  // NO_SAFE_STATION_MATCH
  return 0.15;
}

// ════════════════════════════════════════════════════════════
// CANDIDATE PROXIMITY FILTER
// Fetch active stations and filter by bounding box (~2 km) before scoring.
// ════════════════════════════════════════════════════════════

const GEO_SEARCH_RADIUS_KM = 2.0;
const DEGREE_PER_KM_LAT = 1 / 111.0;

function roughBoundingBox(lat, lon, radiusKm) {
  const latDelta = radiusKm * DEGREE_PER_KM_LAT;
  const lonDelta = radiusKm * DEGREE_PER_KM_LAT / Math.max(0.01, Math.cos((lat * Math.PI) / 180));
  return {
    minLat: lat - latDelta, maxLat: lat + latDelta,
    minLon: lon - lonDelta, maxLon: lon + lonDelta,
  };
}

// ════════════════════════════════════════════════════════════
// MAIN HANDLER
// ════════════════════════════════════════════════════════════

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const obs = body.observation || {};

    // ── Input normalization ─────────────────────────────────
    // Tolerate incomplete / noisy input — never throw on missing optional fields.

    const sourceName      = obs.sourceName || null;
    const parserVersion   = obs.parserVersion || null;
    const fuelType        = obs.fuelType || null;
    const priceNok        = obs.priceNok != null ? Number(obs.priceNok) : null;
    const priceType       = obs.priceType || 'station_level';
    const fetchedAt       = obs.fetchedAt || obs.observedAt || new Date().toISOString();
    const sourceUpdatedAt = obs.sourceUpdatedAt || null;
    const sourceFrequency = obs.sourceFrequency || null;
    const rawPayloadSnippet = obs.rawPayloadSnippet || null;

    // Station / location context (nullable)
    const station_name  = obs.station_name || null;
    const station_chain = obs.station_chain || null;
    const gps_latitude  = obs.gps_latitude != null ? Number(obs.gps_latitude) : null;
    const gps_longitude = obs.gps_longitude != null ? Number(obs.gps_longitude) : null;
    const locationLabel = obs.locationLabel || null;
    const city          = obs.city || null;
    const reportedByUserId = obs.reportedByUserId || null;

    // ── Input validation (soft — produce diagnostics, do not abort) ──
    const inputWarnings = [];
    if (!sourceName) inputWarnings.push('missing_sourceName');
    if (!parserVersion) inputWarnings.push('missing_parserVersion');
    if (!fuelType) inputWarnings.push('missing_fuelType');
    if (priceNok == null || isNaN(priceNok)) inputWarnings.push('missing_or_invalid_priceNok');
    if (!sourceFrequency) inputWarnings.push('missing_sourceFrequency');
    if (gps_latitude == null || gps_longitude == null) inputWarnings.push('missing_gps_coordinates — geo-matching disabled');

    // ── Plausibility ────────────────────────────────────────
    const plausibilityStatus = (fuelType && priceNok != null)
      ? classifyPlausibility(fuelType, priceNok)
      : 'suspect_price_low';

    // ── Parse station name for chain/area signals ───────────
    const parsedName = parseStationName(station_name);
    const obsChain = station_chain
      ? normalizeChainName(station_chain).normalized
      : parsedName.chain;
    const obsChainConfidence = station_chain
      ? normalizeChainName(station_chain).confidence
      : parsedName.chainConfidence;
    const obsAreaLabel = parsedName.locationLabel;

    // ── Build observation object for scoring ────────────────
    const scoringObs = {
      name: station_name,
      chain: obsChain,
      chainConfidence: obsChainConfidence,
      areaLabel: obsAreaLabel,
      latitude: gps_latitude,
      longitude: gps_longitude,
      city: city,
      cityConfidence: city ? CITY_CONFIDENCE_EXPLICIT : 0,
    };

    // ── Candidate retrieval (read-only) ──────────────────────
    let candidateStations = [];
    let geoSearchPerformed = false;

    if (gps_latitude != null && gps_longitude != null) {
      geoSearchPerformed = true;
      const bbox = roughBoundingBox(gps_latitude, gps_longitude, GEO_SEARCH_RADIUS_KM);

      // Fetch active stations — read only, no mutation
      const allStations = await base44.asServiceRole.entities.Station.filter({ status: 'active' }, '-created_date', 500);

      candidateStations = allStations.filter(s =>
        s.latitude != null && s.longitude != null &&
        s.latitude >= bbox.minLat && s.latitude <= bbox.maxLat &&
        s.longitude >= bbox.minLon && s.longitude <= bbox.maxLon
      );
    } else if (station_name) {
      // No GPS — fall back to city-scoped search if city provided, otherwise name-only (limited)
      inputWarnings.push('name_only_match_fallback — lower confidence expected');
      if (city) {
        const cityStations = await base44.asServiceRole.entities.Station.filter({ status: 'active', city: city }, '-created_date', 100);
        candidateStations = cityStations.slice(0, 50);
      } else {
        const allStations = await base44.asServiceRole.entities.Station.filter({ status: 'active' }, '-created_date', 200);
        // Include all as candidates; scoring will penalise distance=0 (no signal)
        candidateStations = allStations.slice(0, 50);
      }
    }

    // ── Score candidates ────────────────────────────────────
    const scoredCandidates = candidateStations
      .map(stn => {
        const result = scoreStationMatch(scoringObs, {
          name: stn.name,
          chain: stn.chain,
          areaLabel: stn.areaLabel,
          latitude: stn.latitude,
          longitude: stn.longitude,
          city: stn.city,
        });
        return {
          candidateId: stn.id,
          candidateName: stn.name,
          candidateChain: stn.chain || null,
          candidateCity: stn.city || null,
          score: result.score,
          breakdown: result.breakdown,
          gateFailures: result.gateFailures,
          distanceMeters: (gps_latitude != null && stn.latitude != null)
            ? Math.round(haversineDistance(gps_latitude, gps_longitude, stn.latitude, stn.longitude))
            : null,
        };
      })
      .filter(c => c.score > 0)
      .sort((a, b) => b.score - a.score);

    // ── Match decision ───────────────────────────────────────
    // Reuses locked Phase 2 matchDecision semantics verbatim.
    const decisionInput = scoredCandidates.map(c => ({ candidateId: c.candidateId, score: c.score }));
    const decision = matchDecision(decisionInput);

    const topCandidate = scoredCandidates[0] || null;
    const secondCandidate = scoredCandidates[1] || null;
    const dominanceGap = (topCandidate && secondCandidate)
      ? topCandidate.score - secondCandidate.score
      : topCandidate ? topCandidate.score : 0;

    const rawMatchScore = topCandidate ? topCandidate.score : 0;
    const confidenceScore = deriveConfidenceScore(decision.outcome, rawMatchScore, dominanceGap);

    // ── Outcome-specific field population ───────────────────
    let stationId = null;
    let station_match_status = null;
    let station_match_candidates = [];
    let station_match_notes = null;
    let confidenceReason = null;
    let matchedStationSummary = null;

    if (decision.outcome === 'MATCHED_STATION_ID') {
      station_match_status = 'matched_station_id';
      stationId = decision.selectedStationId;
      matchedStationSummary = topCandidate ? {
        id: topCandidate.candidateId,
        name: topCandidate.candidateName,
        chain: topCandidate.candidateChain,
        city: topCandidate.candidateCity,
        score: topCandidate.score,
        distanceMeters: topCandidate.distanceMeters,
      } : null;
      confidenceReason = `Phase 2 match: score=${rawMatchScore}, dominanceGap=${dominanceGap}, reason=${decision.reason}`;
      station_match_notes = null;

    } else if (decision.outcome === 'REVIEW_NEEDED_STATION_MATCH') {
      station_match_status = 'review_needed_station_match';
      stationId = null;
      station_match_candidates = decision.candidatesForReview;
      station_match_notes = `Ambiguous match — ${decision.reason}. Top score=${rawMatchScore}, dominanceGap=${dominanceGap}. Requires curator review.`;
      confidenceReason = `Phase 2 borderline: score=${rawMatchScore}, reason=${decision.reason}`;

    } else {
      // NO_SAFE_STATION_MATCH
      station_match_status = 'no_safe_station_match';
      stationId = null;
      station_match_candidates = [];
      const searchContext = geoSearchPerformed
        ? `Searched ${candidateStations.length} stations within ${GEO_SEARCH_RADIUS_KM}km radius`
        : 'No GPS provided — name-only search with limited candidates';
      station_match_notes = `No safe match found. ${searchContext}. Reason: ${decision.reason}. Observation preserved for candidate creation.`;
      confidenceReason = `Phase 2 no-match: score=${rawMatchScore}, reason=${decision.reason}`;
    }

    // ── Routing flags (preview only — no actual mutation) ────
    const wouldCreateFuelPrice =
      station_match_status === 'matched_station_id' && plausibilityStatus === 'realistic_price';
    const wouldCreateStationReview =
      station_match_status === 'review_needed_station_match';
    const wouldCreateStationCandidate =
      station_match_status === 'no_safe_station_match';
    const displayableInNearbyPrices =
      wouldCreateFuelPrice && stationId != null;

    // ── Top candidate summaries for UI ──────────────────────
    const topCandidateSummaries = scoredCandidates.slice(0, 5).map(c => ({
      id: c.candidateId,
      name: c.candidateName,
      chain: c.candidateChain,
      city: c.candidateCity,
      score: c.score,
      distanceMeters: c.distanceMeters,
      breakdown: c.breakdown,
    }));

    // ── Preview result object ────────────────────────────────
    const previewResult = {
      // Meta
      previewMode: true,
      srpVersion: SRP_VERSION,
      contractVersionReference: SPEC_VERSION,
      resolvedAt: new Date().toISOString(),
      note: "SRP preview-only — no records created, updated, or deleted",

      // Canonical SRP outcome
      station_match_status,
      stationId,
      confidenceScore,
      confidenceReason,
      station_match_candidates,
      station_match_notes,
      plausibilityStatus,

      // Preserved observation context
      locationLabel: locationLabel || obsAreaLabel || null,
      station_name,
      station_chain: station_chain || obsChain || null,
      city,
      gps_latitude,
      gps_longitude,

      // Routing flags (preview only)
      wouldCreateFuelPrice,
      wouldCreateStationCandidate,
      wouldCreateStationReview,
      displayableInNearbyPrices,

      // Input echo (for side-by-side comparison)
      inputObservation: {
        sourceName,
        parserVersion,
        fuelType,
        priceNok,
        priceType,
        fetchedAt,
        sourceUpdatedAt,
        sourceFrequency,
        rawPayloadSnippet,
        reportedByUserId,
      },

      // Match details
      matchedStationSummary,
      topCandidateSummaries,
      rawMatchScore,
      dominanceGap,

      // Diagnostics
      geoSearchPerformed,
      candidatesEvaluated: candidateStations.length,
      candidatesScored: scoredCandidates.length,
      inputWarnings,
    };

    return Response.json(previewResult);

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});