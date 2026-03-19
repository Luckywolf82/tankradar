/**
 * STATION RESOLUTION PIPELINE (SRP) — SOURCE-AGNOSTIC CALL SURFACE
 * TankRadar Governance v1.3.2
 *
 * resolveFuelPriceObservation
 *
 * PURPOSE:
 * Thin, source-agnostic HTTP call surface for SRP preview resolution.
 * Validates input, delegates to authoritative Phase 2 matching nucleus,
 * shapes canonical preview response.
 *
 * THIS FUNCTION OWNS:
 *   - Source-agnostic input acceptance and validation
 *   - Input warning collection
 *   - Plausibility classification (price-level, not station-level)
 *   - Confidence score derivation from nucleus outcome
 *   - Routing flag derivation (wouldCreateFuelPrice etc.)
 *   - Preview response shaping
 *   - Admin/read-only access gate
 *
 * THIS FUNCTION DOES NOT OWN:
 *   - Scoring logic (delegated to Phase 2 nucleus inlined below)
 *   - Chain registry (nucleus responsibility)
 *   - Match decision logic (nucleus responsibility)
 *   - Candidate retrieval (nucleus responsibility)
 *
 * ────────────────────────────────────────────────────────────
 * BRIDGE ARCHITECTURE — TEMPORARY
 * ────────────────────────────────────────────────────────────
 * Current state:
 *   The Phase 2 nucleus is inlined here because Base44 backend functions
 *   cannot import from sibling files, and function-to-function invoke()
 *   requires an authenticated user token (403 without one).
 *
 * This is still a bridge — the inlined nucleus code is NOT owned by this
 * call surface. It is here only because the platform cannot share modules
 * between functions at runtime.
 *
 * Permanent target:
 *   Adapter → resolveFuelPriceObservation (call surface)
 *           → shared pure nucleus (direct, no HTTP hop, no inline duplication)
 *
 * When Base44 supports shared modules or the nucleus is extracted as a
 * separately callable service without auth requirements, this inline code
 * must be removed and replaced with a direct nucleus invocation.
 *
 * Spec ref: TankRadar Governance v1.3.2 — Wiring Spec Amendment 2026-03-19.
 * ────────────────────────────────────────────────────────────
 *
 * NOTE ON INLINE NUCLEUS CODE:
 * The pure functions below (KNOWN_CHAINS through matchDecision) are copied
 * verbatim from matchStationForUserReportedPrice, which is the declared
 * authoritative source. Any changes to scoring logic, thresholds, or
 * chain registry MUST be made in matchStationForUserReportedPrice first,
 * then propagated here. These functions must never diverge.
 * ────────────────────────────────────────────────────────────
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

const SRP_VERSION   = "srp_preview_v1.0";
const SPEC_VERSION  = "v1.3.2";

// ════════════════════════════════════════════════════════════
// INLINED PHASE 2 NUCLEUS — TEMPORARY BRIDGE COPY
// Authoritative source: matchStationForUserReportedPrice
// Do NOT alter thresholds or outcome semantics here.
// Changes must originate in the authoritative source first.
// ════════════════════════════════════════════════════════════

const SCORE_MATCHED          = 65;
const SCORE_REVIEW_THRESHOLD = 35;
const DOMINANCE_GAP_MIN      = 10;

const KNOWN_CHAINS = {
  'circle k': ['circle k', 'circlk'],
  'uno-x':    ['uno-x', 'unox'],
  'shell':    ['shell'],
  'esso':     ['esso'],
  'statoil':  ['statoil'],
  'bp':       ['bp'],
  'neste':    ['neste'],
  'jet':      ['jet'],
};

const AREA_KEYWORDS = [
  'heimdal', 'lade', 'singsås', 'torgata', 'nidaros', 'sentrum',
  'lerkendal', 'moholt', 'bakklandet', 'ranheim', 'leinstrand',
];

function _normalize(str) {
  if (!str) return '';
  return str.toLowerCase().trim().replace(/[-\s]+/g, ' ').replace(/\s+/g, ' ');
}
function _levenshtein(s1, s2) {
  const dp = Array(s1.length + 1).fill(null).map(() => Array(s2.length + 1).fill(0));
  for (let i = 0; i <= s1.length; i++) dp[i][0] = i;
  for (let j = 0; j <= s2.length; j++) dp[0][j] = j;
  for (let i = 1; i <= s1.length; i++)
    for (let j = 1; j <= s2.length; j++) {
      const c = s1[i-1] === s2[j-1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i-1][j]+1, dp[i][j-1]+1, dp[i-1][j-1]+c);
    }
  return dp[s1.length][s2.length];
}
function _strSim(s1, s2) {
  if (s1 === s2) return 1; if (!s1 || !s2) return 0;
  const l = s1.length > s2.length ? s1 : s2, sh = s1.length > s2.length ? s2 : s1;
  return (l.length - _levenshtein(l, sh)) / l.length;
}
function _bigrams(str) {
  const c = str.replace(/\s+/g,''); const s = new Set();
  for (let i = 0; i < c.length - 1; i++) s.add(c.substr(i,2)); return s;
}
function _bigramSim(a, b) {
  if (!a || !b) return 0; if (a.toLowerCase() === b.toLowerCase()) return 1;
  const b1 = _bigrams(_normalize(a)), b2 = _bigrams(_normalize(b));
  if (!b1.size || !b2.size) return 0;
  return new Set([...b1].filter(x => b2.has(x))).size / new Set([...b1,...b2]).size;
}
function _normalizeChain(raw) {
  if (!raw || typeof raw !== 'string') return { normalized: null, confidence: 0 };
  const t = raw.toLowerCase().trim();
  for (const [c, aliases] of Object.entries(KNOWN_CHAINS))
    for (const a of aliases) if (t === a) return { normalized: c, confidence: 0.92 };
  for (const [c, aliases] of Object.entries(KNOWN_CHAINS))
    for (const a of aliases) { const sim = _strSim(t, a); if (sim >= 0.80) return { normalized: c, confidence: Math.max(0.50, sim - 0.30) }; }
  return { normalized: null, confidence: 0 };
}
function _chainMatch(obsChain, obsConf, stnChain) {
  if (!obsChain && !stnChain) return { signal: 0, gateFails: false, reason: 'both_chains_null' };
  if (!obsChain) return { signal: 0, gateFails: false, reason: 'obs_chain_null_neutral' };
  if (!stnChain) return { signal: 0, gateFails: false, reason: 'stn_chain_null_neutral' };
  const no = _normalizeChain(obsChain), ns = _normalizeChain(stnChain);
  if (no.normalized === ns.normalized && no.normalized) return { signal: 25, gateFails: false, reason: 'exact_match' };
  if (no.normalized && ns.normalized && (obsConf || 0) >= 0.85) return { signal: 0, gateFails: true, reason: 'high_confidence_mismatch' };
  return { signal: 0, gateFails: false, reason: 'weak_or_uncertain_chains' };
}
function _parseStationName(raw) {
  if (!raw || typeof raw !== 'string') return { chain: null, chainConfidence: 0, locationLabel: null, locationLevel: null };
  const tokens = raw.toLowerCase().trim().split(/\s+/);
  const r = { chain: null, chainConfidence: 0, locationLabel: null, locationLevel: null };
  for (const [c, aliases] of Object.entries(KNOWN_CHAINS))
    for (const a of aliases) { const at = a.split(/\s+/); if (tokens.slice(0, at.length).join(' ') === a) { r.chain = c; r.chainConfidence = 0.92; tokens.splice(0, at.length); break; } }
  for (const t of tokens) if (AREA_KEYWORDS.includes(t)) { r.locationLabel = t; r.locationLevel = 'area'; break; }
  return r;
}
function _haversine(lat1, lon1, lat2, lon2) {
  const R = 6371, d2r = Math.PI/180;
  const dLat = (lat2-lat1)*d2r, dLon = (lon2-lon1)*d2r;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*d2r)*Math.cos(lat2*d2r)*Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)) * 1000;
}
function _distSignal(m) { if (m<=30) return 30; if (m<=75) return 20; if (m<=150) return 10; if (m<=300) return 5; return 0; }
function _nameSignal(s) { if (s>=0.95) return 30; if (s>=0.85) return 20; if (s>=0.70) return 10; if (s>=0.50) return 5; return 0; }
function _locSignal(pl, sl) { if (!pl||!sl) return 0; const a=pl.toLowerCase().trim(),b=sl.toLowerCase().trim(); if (a===b) return 10; return -15; }

function _scoreMatch(obs, stn) {
  const signals = { distance: 0, chain: 0, name: 0, location: 0 };
  const gateFailures = [];
  const bd = {};
  if (obs.city && (obs.cityConfidence||0) >= 0.85 && stn.city && obs.city.toLowerCase() !== stn.city.toLowerCase()) {
    gateFailures.push('city_mismatch'); return { score: 0, signals, gateFailures, bd };
  }
  if (obs.latitude != null && stn.latitude != null) {
    const m = _haversine(obs.latitude, obs.longitude, stn.latitude, stn.longitude);
    signals.distance = _distSignal(m); bd.distance = { meters: Math.round(m), signal: signals.distance };
  }
  const cr = _chainMatch(obs.chain, obs.chainConfidence, stn.chain);
  bd.chain = cr; if (cr.gateFails) { gateFailures.push('chain_mismatch'); return { score: 0, signals, gateFailures, bd }; }
  signals.chain = cr.signal;
  const ns = _bigramSim(obs.name, stn.name); signals.name = _nameSignal(ns); bd.name = { similarity: Math.round(ns*100)/100, signal: signals.name };
  signals.location = _locSignal(obs.areaLabel, stn.areaLabel); bd.location = { signal: signals.location };
  return { score: Math.max(0, signals.distance+signals.chain+signals.name+signals.location), signals, gateFailures, bd };
}

function _matchDecision(scores) {
  if (!scores || !scores.length) return { outcome: 'NO_SAFE_STATION_MATCH', selectedStationId: null, candidatesForReview: [], reason: 'no_candidates' };
  const s = [...scores].sort((a,b) => b.score-a.score); const top = s[0];
  if (s.length === 1) {
    if (top.score >= SCORE_MATCHED)          return { outcome: 'MATCHED_STATION_ID',          selectedStationId: top.candidateId, candidatesForReview: [],                                        reason: 'single_candidate_above_threshold' };
    if (top.score >= SCORE_REVIEW_THRESHOLD) return { outcome: 'REVIEW_NEEDED_STATION_MATCH', selectedStationId: null,            candidatesForReview: [top.candidateId],                         reason: 'single_candidate_borderline' };
    return                                         { outcome: 'NO_SAFE_STATION_MATCH',         selectedStationId: null,            candidatesForReview: [],                                        reason: 'single_candidate_below_threshold' };
  }
  const gap = top.score - s[1].score;
  if (top.score >= SCORE_MATCHED && gap >= DOMINANCE_GAP_MIN) return { outcome: 'MATCHED_STATION_ID',          selectedStationId: top.candidateId, candidatesForReview: [],                                        reason: `multi_candidate_high_confidence_gap_${gap}` };
  if (top.score >= SCORE_MATCHED)                              return { outcome: 'REVIEW_NEEDED_STATION_MATCH', selectedStationId: null,            candidatesForReview: s.slice(0,3).map(m=>m.candidateId),        reason: `multi_candidate_insufficient_dominance_gap_${gap}` };
  if (top.score >= SCORE_REVIEW_THRESHOLD)                     return { outcome: 'REVIEW_NEEDED_STATION_MATCH', selectedStationId: null,            candidatesForReview: s.slice(0,3).map(m=>m.candidateId),        reason: 'borderline_match_requires_review' };
  return                                                              { outcome: 'NO_SAFE_STATION_MATCH',         selectedStationId: null,            candidatesForReview: [],                                        reason: 'no_candidates_above_review_threshold' };
}

// ════════════════════════════════════════════════════════════
// PLAUSIBILITY CHECK — call-surface responsibility
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
  const t = PLAUSIBILITY_THRESHOLDS[fuelType] || PLAUSIBILITY_THRESHOLDS.other;
  if (priceNok < t.low)  return 'suspect_price_low';
  if (priceNok > t.high) return 'suspect_price_high';
  return 'realistic_price';
}

// ════════════════════════════════════════════════════════════
// CONFIDENCE SCORE DERIVATION — call-surface responsibility
// ════════════════════════════════════════════════════════════

function deriveConfidenceScore(outcome, rawScore, dominanceGap) {
  if (outcome === 'MATCHED_STATION_ID') {
    if (rawScore >= 80  && (dominanceGap||0) >= 20)             return 0.92;
    if (rawScore >= SCORE_MATCHED && (dominanceGap||0) >= DOMINANCE_GAP_MIN) return 0.82;
    return 0.65;
  }
  if (outcome === 'REVIEW_NEEDED_STATION_MATCH') return rawScore >= 55 ? 0.45 : 0.30;
  return 0.15;
}

// ════════════════════════════════════════════════════════════
// CANDIDATE RETRIEVAL — GPS bounding box (~2 km radius)
// ════════════════════════════════════════════════════════════

const GEO_RADIUS_KM       = 2.0;
const DEG_PER_KM_LAT      = 1 / 111.0;

async function fetchCandidates(lat, lon, base44) {
  const latD = GEO_RADIUS_KM * DEG_PER_KM_LAT;
  const lonD = GEO_RADIUS_KM * DEG_PER_KM_LAT / Math.max(0.01, Math.cos(lat * Math.PI / 180));
  const all  = await base44.asServiceRole.entities.Station.filter({ status: 'active' }, '-created_date', 500);
  return all.filter(s =>
    s.latitude  != null && s.longitude != null &&
    s.latitude  >= lat - latD && s.latitude  <= lat + latD &&
    s.longitude >= lon - lonD && s.longitude <= lon + lonD
  );
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
    const obs  = body.observation || {};

    // ── Input normalisation ─────────────────────────────────
    const sourceName        = obs.sourceName        || null;
    const parserVersion     = obs.parserVersion     || null;
    const fuelType          = obs.fuelType          || null;
    const priceNok          = obs.priceNok != null   ? Number(obs.priceNok)    : null;
    const priceType         = obs.priceType         || 'station_level';
    const fetchedAt         = obs.fetchedAt || obs.observedAt || new Date().toISOString();
    const sourceUpdatedAt   = obs.sourceUpdatedAt   || null;
    const sourceFrequency   = obs.sourceFrequency   || null;
    const rawPayloadSnippet = obs.rawPayloadSnippet || null;
    const station_name      = obs.station_name      || null;
    const station_chain     = obs.station_chain     || null;
    const gps_latitude      = obs.gps_latitude  != null ? Number(obs.gps_latitude)  : null;
    const gps_longitude     = obs.gps_longitude != null ? Number(obs.gps_longitude) : null;
    const locationLabel     = obs.locationLabel     || null;
    const reportedByUserId  = obs.reportedByUserId  || null;

    // ── Input validation (soft) ─────────────────────────────
    const inputWarnings = [];
    if (!sourceName)                               inputWarnings.push('missing_sourceName');
    if (!parserVersion)                            inputWarnings.push('missing_parserVersion');
    if (!fuelType)                                 inputWarnings.push('missing_fuelType');
    if (priceNok == null || isNaN(priceNok))       inputWarnings.push('missing_or_invalid_priceNok');
    if (!sourceFrequency)                          inputWarnings.push('missing_sourceFrequency');
    if (gps_latitude == null || gps_longitude == null)
      inputWarnings.push('missing_gps_coordinates — geo-matching disabled');

    // ── Plausibility — call-surface responsibility ──────────
    const plausibilityStatus = (fuelType && priceNok != null)
      ? classifyPlausibility(fuelType, priceNok)
      : 'suspect_price_low';

    // ════════════════════════════════════════════════════════
    // NUCLEUS DELEGATION (inlined due to platform constraint)
    // See bridge architecture note in file header.
    // ════════════════════════════════════════════════════════

    // Parse observation using nucleus parser
    const parsed      = _parseStationName(station_name);
    const obsChain    = station_chain ? _normalizeChain(station_chain).normalized : parsed.chain;
    const obsChainConf= station_chain ? _normalizeChain(station_chain).confidence : parsed.chainConfidence;

    const scoringObs = {
      name:            station_name,
      chain:           obsChain,
      chainConfidence: obsChainConf,
      areaLabel:       parsed.locationLabel,
      latitude:        gps_latitude,
      longitude:       gps_longitude,
      city:            null,
      cityConfidence:  0,
    };

    // Retrieve candidates via GPS bounding box
    let candidateStations = [];
    let geoSearchPerformed = false;

    if (gps_latitude != null && gps_longitude != null) {
      geoSearchPerformed = true;
      candidateStations = await fetchCandidates(gps_latitude, gps_longitude, base44);
    }

    // Score candidates using nucleus scoring functions
    const scoredCandidates = candidateStations
      .map(stn => {
        const r = _scoreMatch(scoringObs, { name: stn.name, chain: stn.chain, areaLabel: stn.areaLabel, latitude: stn.latitude, longitude: stn.longitude, city: stn.city });
        return {
          candidateId:   stn.id,
          candidateName: stn.name,
          candidateChain:stn.chain || null,
          candidateCity: stn.city  || null,
          score:         r.score,
          breakdown:     r.bd,
          distanceMeters: (gps_latitude != null && stn.latitude != null)
            ? Math.round(_haversine(gps_latitude, gps_longitude, stn.latitude, stn.longitude)) : null,
        };
      })
      .filter(c => c.score > 0)
      .sort((a,b) => b.score - a.score);

    // Apply nucleus decision
    const decision     = _matchDecision(scoredCandidates.map(c => ({ candidateId: c.candidateId, score: c.score })));
    const topCandidate = scoredCandidates[0] || null;
    const secondCand   = scoredCandidates[1] || null;
    const rawMatchScore= topCandidate ? topCandidate.score : 0;
    const dominanceGap = (topCandidate && secondCand) ? topCandidate.score - secondCand.score : topCandidate ? topCandidate.score : 0;

    // ── Confidence derivation — call-surface responsibility ──
    const confidenceScore = deriveConfidenceScore(decision.outcome, rawMatchScore, dominanceGap);

    // ── Canonical outcome mapping ────────────────────────────
    const outcomeMap = {
      'MATCHED_STATION_ID':          'matched_station_id',
      'REVIEW_NEEDED_STATION_MATCH': 'review_needed_station_match',
      'NO_SAFE_STATION_MATCH':       'no_safe_station_match',
    };
    const station_match_status = outcomeMap[decision.outcome] || 'no_safe_station_match';

    let stationId              = null;
    let station_match_notes    = null;
    let confidenceReason       = null;
    let matchedStationSummary  = null;
    const station_match_candidates = decision.candidatesForReview || [];

    if (station_match_status === 'matched_station_id') {
      stationId = decision.selectedStationId;
      matchedStationSummary = topCandidate ? {
        id:            topCandidate.candidateId,
        name:          topCandidate.candidateName,
        chain:         topCandidate.candidateChain,
        city:          topCandidate.candidateCity,
        score:         topCandidate.score,
        distanceMeters:topCandidate.distanceMeters,
      } : null;
      confidenceReason    = `Phase 2 match: score=${rawMatchScore}, dominanceGap=${dominanceGap}, reason=${decision.reason}`;
      station_match_notes = null;

    } else if (station_match_status === 'review_needed_station_match') {
      confidenceReason    = `Phase 2 borderline: score=${rawMatchScore}, reason=${decision.reason}`;
      station_match_notes = `Ambiguous match — score=${rawMatchScore}, dominanceGap=${dominanceGap}, reason=${decision.reason}. Requires curator review.`;

    } else {
      const ctx = geoSearchPerformed
        ? `Searched ${candidateStations.length} stations within ${GEO_RADIUS_KM}km radius`
        : 'No GPS provided — geo-matching disabled';
      confidenceReason    = `Phase 2 no-match: score=${rawMatchScore}, reason=${decision.reason}`;
      station_match_notes = `No safe match found. ${ctx}. Reason: ${decision.reason}. Observation preserved for candidate creation.`;
    }

    // ── Routing flags — call-surface responsibility ──────────
    const wouldCreateFuelPrice        = station_match_status === 'matched_station_id' && plausibilityStatus === 'realistic_price';
    const wouldCreateStationReview    = station_match_status === 'review_needed_station_match';
    const wouldCreateStationCandidate = station_match_status === 'no_safe_station_match';
    const displayableInNearbyPrices   = wouldCreateFuelPrice && stationId != null;

    // ── Top candidate summaries ──────────────────────────────
    const topCandidateSummaries = scoredCandidates.slice(0, 5).map(c => ({
      id:            c.candidateId,
      name:          c.candidateName,
      chain:         c.candidateChain,
      city:          c.candidateCity,
      score:         c.score,
      distanceMeters:c.distanceMeters,
      breakdown:     c.breakdown,
    }));

    return Response.json({
      previewMode:              true,
      srpVersion:               SRP_VERSION,
      contractVersionReference: SPEC_VERSION,
      resolvedAt:               new Date().toISOString(),
      note:                     "SRP preview-only — no records created, updated, or deleted",
      // Bridge marker
      bridgeMode:               true,
      bridgeNote:               "TEMPORARY: Phase 2 nucleus inlined due to Base44 platform module-sharing constraint. Final target: shared pure nucleus without inline duplication.",

      station_match_status,
      stationId,
      confidenceScore,
      confidenceReason,
      station_match_candidates,
      station_match_notes,
      plausibilityStatus,

      locationLabel:  locationLabel || parsed.locationLabel || null,
      station_name,
      station_chain:  station_chain || obsChain || null,
      gps_latitude,
      gps_longitude,

      wouldCreateFuelPrice,
      wouldCreateStationCandidate,
      wouldCreateStationReview,
      displayableInNearbyPrices,

      inputObservation: { sourceName, parserVersion, fuelType, priceNok, priceType, fetchedAt, sourceUpdatedAt, sourceFrequency, rawPayloadSnippet, reportedByUserId },

      matchedStationSummary,
      topCandidateSummaries,
      rawMatchScore,
      dominanceGap,

      geoSearchPerformed,
      candidatesEvaluated: candidateStations.length,
      candidatesScored:    scoredCandidates.length,
      inputWarnings,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});