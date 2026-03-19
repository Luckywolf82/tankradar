/**
 * STATION RESOLUTION PIPELINE (SRP) — PREVIEW ENGINE
 * TankRadar Governance v1.3.2
 *
 * resolveFuelPriceObservation
 *
 * PURPOSE:
 * Accepts a normalized fuel price observation and returns the canonical SRP
 * resolution result — without writing anything to any entity (except MatchingShadowLog).
 *
 * ══════════════════════════════════════════════════════════════════
 * BRIDGE ARCHITECTURE — TEMPORARY — Phase 1 (Sections X/Y/Z/AA)
 * ══════════════════════════════════════════════════════════════════
 *
 * CURRENT STATE (Phase 1 bridge):
 *   resolveFuelPriceObservation
 *     → delegates to matchStationForUserReportedPrice (preview_mode: true)   ← AUTHORITATIVE
 *     → runs inlined matcher as TEMPORARY SHADOW COMPARATOR only             ← NON-AUTHORITATIVE
 *     → logs comparison outcome to MatchingShadowLog
 *
 * TARGET STATE (Stage 2 — after Phase 1.7 deletion gate is satisfied):
 *   resolveFuelPriceObservation → shared pure nucleus
 *   matchStationForUserReportedPrice → same shared pure nucleus
 *
 * RULES:
 * - Delegated Phase 2 preview result is the SOLE authoritative output
 * - Inlined matcher must NEVER affect the final decision output
 * - Inlined matcher must NEVER be used as fallback if delegated call fails
 * - If delegated call fails, return explicit error — do NOT fall back to shadow
 * - _shadowVerification in response is NON-CONTRACTUAL and temporary
 *
 * RESPONSIBILITIES RETAINED BY THIS FUNCTION (source-agnostic):
 * - Input normalization and validation
 * - inputWarnings collection
 * - Plausibility classification
 * - Canonical output shaping
 * - Routing flag derivation
 * - Admin / read-only access control
 * - Shadow comparison and logging
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

const SRP_VERSION = "srp_preview_v1.1_bridge";
const SPEC_VERSION = "v1.3.2";

// ════════════════════════════════════════════════════════════
// PLAUSIBILITY CHECK
// Norwegian fuel price norms (NOK/L).
// Thresholds are governance-defined — do not alter without spec change.
// ════════════════════════════════════════════════════════════

const PLAUSIBILITY_THRESHOLDS = {
  gasoline_95:    { low: 14.0, high: 26.5 },
  gasoline_98:    { low: 14.5, high: 27.5 },
  bensin_95:      { low: 14.0, high: 26.5 },
  bensin_98:      { low: 14.5, high: 27.5 },
  diesel:         { low: 13.0, high: 25.5 },
  diesel_premium: { low: 13.5, high: 26.0 },
  other:          { low: 5.0,  high: 40.0 },
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

const DOMINANCE_GAP_MIN = 10;

function deriveConfidenceScore(outcome, rawScore, dominanceGap) {
  if (outcome === 'matched_station_id') {
    if (rawScore >= 80 && (dominanceGap || 0) >= 20) return 0.92;
    if (rawScore >= 65 && (dominanceGap || 0) >= DOMINANCE_GAP_MIN) return 0.82;
    return 0.65;
  }
  if (outcome === 'review_needed_station_match') {
    if (rawScore >= 55) return 0.45;
    return 0.30;
  }
  return 0.15;
}

// ════════════════════════════════════════════════════════════
// TEMPORARY SHADOW COMPARATOR — INLINED PHASE 2 MATCHING ENGINE
//
// ⚠ TEMPORARY SHADOW COMPARATOR ⚠
// Scheduled for deletion after Phase 1.5 / 1.6 / 1.7 deletion gate is satisfied.
// Must NOT be used as decision path or fallback.
// Must NOT affect the authoritative result returned to callers.
// The only valid use is shadow comparison and MatchingShadowLog creation.
//
// Do NOT alter thresholds, scoring weights, or outcome semantics.
// ════════════════════════════════════════════════════════════

const SCORE_MATCHED = 65;
const SCORE_REVIEW_THRESHOLD = 35;

const KNOWN_CHAINS_SHADOW = {
  'circle k': ['circle k', 'circlk'],
  'uno-x': ['uno-x', 'unox'],
  'shell': ['shell'],
  'esso': ['esso'],
  'statoil': ['statoil'],
  'bp': ['bp'],
  'neste': ['neste'],
  'jet': ['jet'],
};

const AREA_KEYWORDS_SHADOW = [
  'heimdal', 'lade', 'singsås', 'torgata', 'nidaros', 'sentrum',
  'lerkendal', 'moholt', 'bakklandet', 'ranheim', 'leinstrand',
];

function shadow_normalizeStr(str) {
  if (!str) return '';
  return str.toLowerCase().trim().replace(/[-\s]+/g, ' ').replace(/\s+/g, ' ');
}

function shadow_extractBigrams(str) {
  const cleaned = str.replace(/\s+/g, '');
  const bigrams = new Set();
  for (let i = 0; i < cleaned.length - 1; i++) bigrams.add(cleaned.substr(i, 2));
  return bigrams;
}

function shadow_bigramSimilarity(name1, name2) {
  if (!name1 || !name2) return 0;
  if (name1.toLowerCase() === name2.toLowerCase()) return 1;
  const n1 = shadow_normalizeStr(name1), n2 = shadow_normalizeStr(name2);
  const b1 = shadow_extractBigrams(n1), b2 = shadow_extractBigrams(n2);
  if (b1.size === 0 || b2.size === 0) return 0;
  const intersection = new Set([...b1].filter(x => b2.has(x)));
  const union = new Set([...b1, ...b2]);
  return intersection.size / union.size;
}

function shadow_levenshteinDistance(s1, s2) {
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

function shadow_stringSimilarity(s1, s2) {
  if (s1 === s2) return 1;
  if (!s1 || !s2) return 0;
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;
  return (longer.length - shadow_levenshteinDistance(longer, shorter)) / longer.length;
}

function shadow_normalizeChainName(rawChain) {
  if (!rawChain || typeof rawChain !== 'string') return { normalized: null, confidence: 0 };
  const trimmed = rawChain.toLowerCase().trim();
  for (const [canonical, aliases] of Object.entries(KNOWN_CHAINS_SHADOW)) {
    for (const alias of aliases) {
      if (trimmed === alias) return { normalized: canonical, confidence: 0.92 };
    }
  }
  for (const [canonical, aliases] of Object.entries(KNOWN_CHAINS_SHADOW)) {
    for (const alias of aliases) {
      const similarity = shadow_stringSimilarity(trimmed, alias);
      if (similarity >= 0.80) return { normalized: canonical, confidence: Math.max(0.50, similarity - 0.30) };
    }
  }
  return { normalized: null, confidence: 0 };
}

function shadow_parseStationName(rawName) {
  if (!rawName || typeof rawName !== 'string') {
    return { chain: null, chainConfidence: 0, locationLabel: null, locationLevel: null };
  }
  const tokens = rawName.toLowerCase().trim().split(/\s+/);
  const result = { chain: null, chainConfidence: 0, locationLabel: null, locationLevel: null };
  for (const [canonical, aliases] of Object.entries(KNOWN_CHAINS_SHADOW)) {
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
    if (AREA_KEYWORDS_SHADOW.includes(token)) {
      result.locationLabel = token;
      result.locationLevel = 'area';
      break;
    }
  }
  return result;
}

function shadow_haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 1000;
}

function shadow_calculateDistanceSignal(meters) {
  if (meters <= 30) return 30;
  if (meters <= 75) return 20;
  if (meters <= 150) return 10;
  if (meters <= 300) return 5;
  return 0;
}

function shadow_calculateNameSignal(similarity) {
  if (similarity >= 0.95) return 30;
  if (similarity >= 0.85) return 20;
  if (similarity >= 0.70) return 10;
  if (similarity >= 0.50) return 5;
  return 0;
}

function shadow_chainMatch(obsChain, obsChainConfidence, stnChain) {
  if (!obsChain && !stnChain) return { signal: 0, gateFails: false };
  if (!obsChain) return { signal: 0, gateFails: false };
  if (!stnChain) return { signal: 0, gateFails: false };
  const normalizedObs = shadow_normalizeChainName(obsChain);
  const normalizedStn = shadow_normalizeChainName(stnChain);
  if (normalizedObs.normalized === normalizedStn.normalized && normalizedObs.normalized) {
    return { signal: 25, gateFails: false };
  }
  if (normalizedObs.normalized && normalizedStn.normalized) {
    if ((obsChainConfidence || 0) >= 0.85) {
      return { signal: 0, gateFails: true };
    }
  }
  return { signal: 0, gateFails: false };
}

function shadow_scoreStation(obs, stn) {
  // City gate
  if (obs.city && (obs.cityConfidence || 0) >= 0.85) {
    if (stn.city && obs.city.toLowerCase() !== stn.city.toLowerCase()) {
      return { score: 0, gateFailure: 'city_mismatch' };
    }
  }
  let score = 0;
  // Distance signal
  if (obs.latitude != null && obs.longitude != null && stn.latitude != null && stn.longitude != null) {
    const dist = shadow_haversineDistance(obs.latitude, obs.longitude, stn.latitude, stn.longitude);
    score += shadow_calculateDistanceSignal(dist);
  }
  // Chain gate + signal
  const chainResult = shadow_chainMatch(obs.chain, obs.chainConfidence, stn.chain);
  if (chainResult.gateFails) return { score: 0, gateFailure: 'chain_mismatch' };
  score += chainResult.signal;
  // Name signal
  const nameSim = shadow_bigramSimilarity(obs.name, stn.name);
  score += shadow_calculateNameSignal(nameSim);
  // Location signal (no confidence gate in shadow — known divergence from delegated path)
  if (obs.areaLabel && stn.areaLabel) {
    const pLoc = obs.areaLabel.toLowerCase().trim();
    const sArea = stn.areaLabel.toLowerCase().trim();
    if (pLoc === sArea) score += 10;
    else score -= 15;
  }
  return { score: Math.max(0, score), gateFailure: null };
}

function shadow_matchDecision(scoredCandidates) {
  if (!scoredCandidates || scoredCandidates.length === 0) {
    return { outcome: 'no_safe_station_match', selectedStationId: null, candidates: [], rawMatchScore: 0, dominanceGap: 0 };
  }
  const sorted = [...scoredCandidates].sort((a, b) => b.score - a.score);
  const top = sorted[0];
  const rawMatchScore = top.score;
  const second = sorted[1] || null;
  const dominanceGap = second ? top.score - second.score : top.score;

  if (sorted.length === 1) {
    if (top.score >= SCORE_MATCHED)
      return { outcome: 'matched_station_id', selectedStationId: top.candidateId, candidates: [top.candidateId], rawMatchScore, dominanceGap };
    if (top.score >= SCORE_REVIEW_THRESHOLD)
      return { outcome: 'review_needed_station_match', selectedStationId: null, candidates: [top.candidateId], rawMatchScore, dominanceGap };
    return { outcome: 'no_safe_station_match', selectedStationId: null, candidates: [], rawMatchScore, dominanceGap };
  }

  if (top.score >= SCORE_MATCHED && dominanceGap >= DOMINANCE_GAP_MIN)
    return { outcome: 'matched_station_id', selectedStationId: top.candidateId, candidates: [top.candidateId], rawMatchScore, dominanceGap };
  if (top.score >= SCORE_MATCHED)
    return { outcome: 'review_needed_station_match', selectedStationId: null, candidates: sorted.slice(0, 3).map(c => c.candidateId), rawMatchScore, dominanceGap };
  if (top.score >= SCORE_REVIEW_THRESHOLD)
    return { outcome: 'review_needed_station_match', selectedStationId: null, candidates: sorted.slice(0, 3).map(c => c.candidateId), rawMatchScore, dominanceGap };
  return { outcome: 'no_safe_station_match', selectedStationId: null, candidates: [], rawMatchScore, dominanceGap };
}

// ════════════════════════════════════════════════════════════
// SHADOW COMPARISON HELPER
// Classifies mismatch into one of the five Phase 1.6 categories.
// Simple and deterministic — no scoring logic, only field comparison.
// ════════════════════════════════════════════════════════════

function classifyShadowComparison(delegated, shadow) {
  // 1. Outcome mismatch — highest priority
  if (delegated.station_match_status !== shadow.station_match_status) {
    return { status: 'mismatch', category: 'OUTCOME_MISMATCH' };
  }

  // 2. Station selection mismatch (both matched but selected different station)
  if (
    delegated.station_match_status === 'matched_station_id' &&
    shadow.station_match_status === 'matched_station_id' &&
    delegated.stationId !== shadow.stationId
  ) {
    return { status: 'mismatch', category: 'STATION_SELECTION_MISMATCH' };
  }

  // 3. Candidate set mismatch (same outcome, different review candidate lists)
  const dCandidates = (delegated.station_match_candidates || []).slice().sort().join(',');
  const sCandidates = (shadow.station_match_candidates || []).slice().sort().join(',');
  if (dCandidates !== sCandidates) {
    return { status: 'mismatch', category: 'CANDIDATE_SET_MISMATCH' };
  }

  // 4. Score mismatch (same outcome and candidates, different raw scores)
  if (delegated.rawMatchScore !== shadow.rawMatchScore || delegated.dominanceGap !== shadow.dominanceGap) {
    return { status: 'mismatch', category: 'SCORE_MISMATCH' };
  }

  // 5. Explainability mismatch — same outcome + scores but different top candidate identity
  if (delegated.topCandidateId !== shadow.topCandidateId) {
    return { status: 'mismatch', category: 'EXPLAINABILITY_MISMATCH' };
  }

  return { status: 'match', category: null };
}

// ════════════════════════════════════════════════════════════
// OBSERVATION FINGERPRINT
// Lightweight, non-cryptographic fingerprint for log deduplication.
// ════════════════════════════════════════════════════════════

function observationFingerprint(station_name, station_chain, gps_latitude, gps_longitude) {
  const raw = [
    (station_name || '').toLowerCase().trim(),
    (station_chain || '').toLowerCase().trim(),
    gps_latitude != null ? Math.round(gps_latitude * 1000) : 'null',
    gps_longitude != null ? Math.round(gps_longitude * 1000) : 'null',
  ].join('|');
  // Simple hash: sum of char codes with position weighting
  let h = 0;
  for (let i = 0; i < raw.length; i++) h = (h * 31 + raw.charCodeAt(i)) >>> 0;
  return h.toString(16).padStart(8, '0');
}

// ════════════════════════════════════════════════════════════
// CANDIDATE PROXIMITY FILTER
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
    const sourceName        = obs.sourceName || null;
    const parserVersion     = obs.parserVersion || null;
    const fuelType          = obs.fuelType || null;
    const priceNok          = obs.priceNok != null ? Number(obs.priceNok) : null;
    const priceType         = obs.priceType || 'station_level';
    const fetchedAt         = obs.fetchedAt || obs.observedAt || new Date().toISOString();
    const sourceUpdatedAt   = obs.sourceUpdatedAt || null;
    const sourceFrequency   = obs.sourceFrequency || null;
    const rawPayloadSnippet = obs.rawPayloadSnippet || null;

    // Station / location context
    const station_name  = obs.station_name || null;
    const station_chain = obs.station_chain || null;
    const gps_latitude  = obs.gps_latitude  != null ? Number(obs.gps_latitude)  : null;
    const gps_longitude = obs.gps_longitude != null ? Number(obs.gps_longitude) : null;
    const locationLabel = obs.locationLabel || null;
    const reportedByUserId = obs.reportedByUserId || null;

    // ── Input validation ────────────────────────────────────
    const inputWarnings = [];
    if (!sourceName)    inputWarnings.push('missing_sourceName');
    if (!parserVersion) inputWarnings.push('missing_parserVersion');
    if (!fuelType)      inputWarnings.push('missing_fuelType');
    if (priceNok == null || isNaN(priceNok)) inputWarnings.push('missing_or_invalid_priceNok');
    if (!sourceFrequency) inputWarnings.push('missing_sourceFrequency');
    if (gps_latitude == null || gps_longitude == null) inputWarnings.push('missing_gps_coordinates — geo-matching disabled');

    // ── Plausibility ────────────────────────────────────────
    const plausibilityStatus = (fuelType && priceNok != null)
      ? classifyPlausibility(fuelType, priceNok)
      : 'suspect_price_low';

    // ══════════════════════════════════════════════════════
    // STEP 1 — BRIDGE: Delegate to matchStationForUserReportedPrice (preview_mode: true)
    // This is the AUTHORITATIVE path. Its result is the sole source of truth.
    // If this call fails, return an explicit error — DO NOT fall back to shadow.
    // ══════════════════════════════════════════════════════

    // Map source-agnostic observation input → matchStationForUserReportedPrice payload
    const delegatePayload = {
      station_name:  station_name,
      station_chain: station_chain,
      gps_lat:       gps_latitude,
      gps_lon:       gps_longitude,
      preview_mode:  true,
    };
    // Map locationLabel / city if present
    if (locationLabel) delegatePayload.city = locationLabel;

    let delegatedRaw;
    try {
      // Forward the authenticated request context (user is already admin-validated above).
      // Using user-scoped invoke so matchStationForUserReportedPrice receives valid auth headers.
      const delegatedResponse = await base44.functions.invoke(
        'matchStationForUserReportedPrice',
        delegatePayload
      );
      delegatedRaw = delegatedResponse;
    } catch (delegateError) {
      // EXPLICIT ERROR — no fallback to shadow comparator (governance rule: Section X.5 / AA.9)
      return Response.json({
        error: 'Delegated Phase 2 preview call failed — no fallback permitted',
        detail: delegateError.message,
        _bridgeNote: 'Phase 1 bridge architecture: delegated path failure returns error, not shadow result'
      }, { status: 502 });
    }

    // Normalize delegated output into canonical SRP fields
    // matchStationForUserReportedPrice preview mode returns:
    //   final_decision, top_candidates[0].name, dominance_gap
    // Map to canonical SRP field names:
    const delegatedDecision = delegatedRaw?.final_decision || 'NO_SAFE_STATION_MATCH';

    let station_match_status;
    if (delegatedDecision === 'MATCHED_STATION_ID') {
      station_match_status = 'matched_station_id';
    } else if (delegatedDecision === 'REVIEW_NEEDED_STATION_MATCH') {
      station_match_status = 'review_needed_station_match';
    } else {
      station_match_status = 'no_safe_station_match';
    }

    // delegated preview mode does not return a stationId directly (returns name only)
    // stationId is null in preview mode per matchStationForUserReportedPrice contract
    const stationId = null;
    const delegatedTopCandidates = delegatedRaw?.top_candidates || [];
    const delegatedTopCandidateName = delegatedTopCandidates[0]?.name || null;
    const delegatedRawMatchScore = delegatedTopCandidates[0]?.final_score || 0;
    const delegatedDominanceGap = delegatedRaw?.dominance_gap || 0;
    const delegatedCandidateNames = delegatedTopCandidates.map(c => c.name);

    // Outcome-specific fields
    let station_match_candidates = [];
    let station_match_notes = null;
    let matchedStationSummary = null;

    if (station_match_status === 'matched_station_id') {
      matchedStationSummary = delegatedTopCandidates[0] ? {
        name: delegatedTopCandidates[0].name,
        chain: delegatedTopCandidates[0].chain,
        city: delegatedTopCandidates[0].city,
        score: delegatedTopCandidates[0].final_score,
        distanceKm: delegatedTopCandidates[0].distance_km,
      } : null;
    } else if (station_match_status === 'review_needed_station_match') {
      station_match_candidates = delegatedCandidateNames.slice(0, 3);
      station_match_notes = `Delegated Phase 2 preview: ambiguous match. Top score=${delegatedRawMatchScore}, dominanceGap=${delegatedDominanceGap}`;
    } else {
      station_match_notes = `Delegated Phase 2 preview: no safe match. Reason: ${delegatedDecision}`;
    }

    const confidenceScore = deriveConfidenceScore(station_match_status, delegatedRawMatchScore, delegatedDominanceGap);
    const confidenceReason = `Delegated Phase 2 preview: score=${delegatedRawMatchScore}, gap=${delegatedDominanceGap}, outcome=${station_match_status}`;

    // ── Routing flags (preview only — no mutation) ──────────
    const wouldCreateFuelPrice       = station_match_status === 'matched_station_id' && plausibilityStatus === 'realistic_price';
    const wouldCreateStationReview   = station_match_status === 'review_needed_station_match';
    const wouldCreateStationCandidate = station_match_status === 'no_safe_station_match';
    const displayableInNearbyPrices  = wouldCreateFuelPrice && stationId != null;

    // ══════════════════════════════════════════════════════
    // STEP 2 — SHADOW COMPARATOR (inlined matcher, secondary only)
    //
    // ⚠ TEMPORARY SHADOW COMPARATOR ⚠
    // Runs AFTER authoritative result is determined.
    // Result is used ONLY for comparison logging.
    // Must NEVER influence the response returned to callers.
    // ══════════════════════════════════════════════════════

    let shadowResult = null;
    try {
      // Fetch station candidates for shadow scoring (same bounding-box approach)
      let shadowCandidateStations = [];
      if (gps_latitude != null && gps_longitude != null) {
        const bbox = roughBoundingBox(gps_latitude, gps_longitude, GEO_SEARCH_RADIUS_KM);
        const allStations = await base44.asServiceRole.entities.Station.filter({ status: 'active' }, '-created_date', 500);
        shadowCandidateStations = allStations.filter(s =>
          s.latitude != null && s.longitude != null &&
          s.latitude >= bbox.minLat && s.latitude <= bbox.maxLat &&
          s.longitude >= bbox.minLon && s.longitude <= bbox.maxLon
        );
      }

      // Parse observation for shadow scoring
      const parsedName = shadow_parseStationName(station_name);
      const shadowObsChain = station_chain
        ? shadow_normalizeChainName(station_chain).normalized
        : parsedName.chain;
      const shadowObsChainConfidence = station_chain
        ? shadow_normalizeChainName(station_chain).confidence
        : parsedName.chainConfidence;

      const shadowObs = {
        name: station_name,
        chain: shadowObsChain,
        chainConfidence: shadowObsChainConfidence,
        areaLabel: parsedName.locationLabel,
        latitude: gps_latitude,
        longitude: gps_longitude,
        city: null,         // known divergence: shadow unconditionally sets city: null
        cityConfidence: 0,
      };

      const shadowScored = shadowCandidateStations
        .map(stn => {
          const result = shadow_scoreStation(shadowObs, {
            name: stn.name,
            chain: stn.chain,
            areaLabel: stn.areaLabel,
            latitude: stn.latitude,
            longitude: stn.longitude,
            city: stn.city,
          });
          return { candidateId: stn.id, candidateName: stn.name, score: result.score };
        })
        .filter(c => c.score > 0)
        .sort((a, b) => b.score - a.score);

      const shadowDecision = shadow_matchDecision(shadowScored);
      shadowResult = {
        station_match_status: shadowDecision.outcome,
        stationId: shadowDecision.selectedStationId,
        rawMatchScore: shadowDecision.rawMatchScore,
        dominanceGap: shadowDecision.dominanceGap,
        station_match_candidates: shadowDecision.candidates || [],
        topCandidateId: shadowScored[0]?.candidateId || null,
        topCandidateName: shadowScored[0]?.candidateName || null,
      };
    } catch (_shadowErr) {
      // Shadow failure is logged as a note but must NOT affect authoritative output
      shadowResult = { error: 'shadow_comparator_failed', detail: _shadowErr.message };
    }

    // ── Comparison ──────────────────────────────────────────
    const delegatedForComparison = {
      station_match_status,
      stationId,
      rawMatchScore: delegatedRawMatchScore,
      dominanceGap: delegatedDominanceGap,
      station_match_candidates: delegatedCandidateNames.slice(0, 3),
      topCandidateId: null, // preview mode returns names not IDs
    };

    const comparisonResult = shadowResult && !shadowResult.error
      ? classifyShadowComparison(delegatedForComparison, {
          station_match_status: shadowResult.station_match_status,
          stationId: shadowResult.stationId,
          rawMatchScore: shadowResult.rawMatchScore,
          dominanceGap: shadowResult.dominanceGap,
          station_match_candidates: shadowResult.station_match_candidates,
          topCandidateId: shadowResult.topCandidateId,
        })
      : { status: 'mismatch', category: 'OUTCOME_MISMATCH' }; // shadow failure = cannot confirm match

    // ══════════════════════════════════════════════════════
    // STEP 3 — LOG to MatchingShadowLog
    // Minimal fields only — no full payloads, no raw source data.
    // ══════════════════════════════════════════════════════

    try {
      await base44.asServiceRole.entities.MatchingShadowLog.create({
        timestamp: new Date().toISOString(),
        sourceName: sourceName || 'unknown',
        parserVersion: parserVersion || 'unknown',
        comparisonStatus: comparisonResult.status,
        mismatchCategory: comparisonResult.category || null,
        delegated_station_match_status: station_match_status,
        shadow_station_match_status: shadowResult?.station_match_status || null,
        delegated_stationId: null, // preview mode limitation
        shadow_stationId: shadowResult?.stationId || null,
        delegated_rawMatchScore: delegatedRawMatchScore,
        shadow_rawMatchScore: shadowResult?.rawMatchScore || null,
        delegated_dominanceGap: delegatedDominanceGap,
        shadow_dominanceGap: shadowResult?.dominanceGap || null,
        topCandidateId_delegated: delegatedTopCandidateName, // name used, ID unavailable from preview
        topCandidateId_shadow: shadowResult?.topCandidateName || null,
        observationFingerprint: observationFingerprint(station_name, station_chain, gps_latitude, gps_longitude),
      });
    } catch (_logErr) {
      // Log failure must not affect the authoritative response
      inputWarnings.push('shadow_log_write_failed: ' + _logErr.message);
    }

    // ── Build authoritative preview result ──────────────────
    // ONLY the delegated Phase 2 result is returned as authoritative.
    const previewResult = {
      // Meta
      previewMode: true,
      srpVersion: SRP_VERSION,
      contractVersionReference: SPEC_VERSION,
      resolvedAt: new Date().toISOString(),
      note: "SRP preview-only — no records created, updated, or deleted. Bridge architecture: delegated to matchStationForUserReportedPrice.",

      // Canonical SRP outcome (from delegated path only)
      station_match_status,
      stationId,
      confidenceScore,
      confidenceReason,
      station_match_candidates,
      station_match_notes,
      plausibilityStatus,

      // Observation context
      locationLabel: locationLabel || null,
      station_name,
      station_chain,
      gps_latitude,
      gps_longitude,

      // Routing flags (preview only)
      wouldCreateFuelPrice,
      wouldCreateStationCandidate,
      wouldCreateStationReview,
      displayableInNearbyPrices,

      // Input echo
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

      // Match details (from delegated path)
      matchedStationSummary,
      topCandidateSummaries: delegatedTopCandidates.slice(0, 5),
      rawMatchScore: delegatedRawMatchScore,
      dominanceGap: delegatedDominanceGap,

      // Diagnostics
      inputWarnings,

      // ── NON-CONTRACTUAL SHADOW VERIFICATION FIELD ──────
      // TEMPORARY — Phase 1 bridge architecture only.
      // Scheduled for removal upon Phase 1.7 deletion gate satisfaction.
      // Callers MUST NOT depend on this field for any core behavior.
      _shadowVerification: {
        _contractStatus: "non-contractual — temporary shadow verification field. Scheduled for removal upon deletion gate satisfaction. Callers must not depend on this field.",
        status: comparisonResult.status,
        mismatchCategory: comparisonResult.category || null,
        delegatedResult: {
          station_match_status,
          stationId,
          rawMatchScore: delegatedRawMatchScore,
          dominanceGap: delegatedDominanceGap,
          station_match_candidates: delegatedCandidateNames.slice(0, 3),
        },
        shadowResult: shadowResult && !shadowResult.error ? {
          station_match_status: shadowResult.station_match_status,
          stationId: shadowResult.stationId,
          rawMatchScore: shadowResult.rawMatchScore,
          dominanceGap: shadowResult.dominanceGap,
          station_match_candidates: shadowResult.station_match_candidates,
        } : { error: shadowResult?.error || 'unavailable', detail: shadowResult?.detail || null },
      },
    };

    return Response.json(previewResult);

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});