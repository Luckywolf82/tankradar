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
 *   - Scoring logic (delegated)
 *   - Chain registry (delegated)
 *   - Match decision logic (delegated)
 *   - Candidate retrieval (delegated)
 *
 * ────────────────────────────────────────────────────────────
 * BRIDGE ARCHITECTURE — TEMPORARY
 * ────────────────────────────────────────────────────────────
 * Current wiring:
 *   Adapter → resolveFuelPriceObservation
 *           → matchStationForUserReportedPrice (preview_mode: true)   ← BRIDGE
 *           → Phase 2 nucleus (scoreStationMatch, matchDecision, ...)
 *
 * Permanent target:
 *   Adapter → resolveFuelPriceObservation
 *           → shared pure nucleus (directly, no HTTP hop)
 *
 * The dependency on matchStationForUserReportedPrice's public preview
 * interface is a temporary bridge only. It will be replaced when the
 * pure nucleus is extracted into a shared internal layer.
 * Spec ref: TankRadar Governance v1.3.2 — Wiring Spec Amendment 2026-03-19.
 * ────────────────────────────────────────────────────────────
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

const SRP_VERSION   = "srp_preview_v1.0";
const SPEC_VERSION  = "v1.3.2";

// ════════════════════════════════════════════════════════════
// PLAUSIBILITY CHECK — call-surface responsibility
// Applied to price value before delegation.
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
// Derived from nucleus outcome + rawMatchScore + dominanceGap.
// Thresholds mirror governance-locked values in the nucleus.
// ════════════════════════════════════════════════════════════

const SCORE_MATCHED      = 65;   // governance-locked — must match nucleus
const DOMINANCE_GAP_MIN  = 10;   // governance-locked — must match nucleus

function deriveConfidenceScore(outcome, rawScore, dominanceGap) {
  if (outcome === 'MATCHED_STATION_ID') {
    if (rawScore >= 80  && (dominanceGap || 0) >= 20)              return 0.92;
    if (rawScore >= SCORE_MATCHED && (dominanceGap || 0) >= DOMINANCE_GAP_MIN) return 0.82;
    return 0.65;
  }
  if (outcome === 'REVIEW_NEEDED_STATION_MATCH') {
    if (rawScore >= 55) return 0.45;
    return 0.30;
  }
  return 0.15; // NO_SAFE_STATION_MATCH
}

// ════════════════════════════════════════════════════════════
// OUTCOME NORMALISATION
// Converts UPPERCASE nucleus outcome strings to canonical snake_case
// for the SRP external response contract.
// ════════════════════════════════════════════════════════════

function normalizeOutcome(decision) {
  if (decision === 'MATCHED_STATION_ID')          return 'matched_station_id';
  if (decision === 'REVIEW_NEEDED_STATION_MATCH') return 'review_needed_station_match';
  return 'no_safe_station_match';
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
    // Tolerates incomplete / noisy input — never throws on missing optional fields.
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

    // ── Input validation (soft — accumulate warnings, never abort) ──
    const inputWarnings = [];
    if (!sourceName)                               inputWarnings.push('missing_sourceName');
    if (!parserVersion)                            inputWarnings.push('missing_parserVersion');
    if (!fuelType)                                 inputWarnings.push('missing_fuelType');
    if (priceNok == null || isNaN(priceNok))       inputWarnings.push('missing_or_invalid_priceNok');
    if (!sourceFrequency)                          inputWarnings.push('missing_sourceFrequency');
    if (gps_latitude == null || gps_longitude == null)
      inputWarnings.push('missing_gps_coordinates — geo-matching disabled');

    // ── Plausibility — call-surface responsibility ──────────
    // Applied to price before delegation. Independent of station matching.
    const plausibilityStatus = (fuelType && priceNok != null)
      ? classifyPlausibility(fuelType, priceNok)
      : 'suspect_price_low';

    // ════════════════════════════════════════════════════════
    // BRIDGE DELEGATION  ← TEMPORARY ARCHITECTURE
    //
    // Delegates preview matching to matchStationForUserReportedPrice.
    // This routes through the user_reported adapter's public preview interface.
    // This is NOT the permanent target architecture.
    //
    // Input mapping (source-agnostic → user_reported preview shape):
    //   station_name  → station_name  (pass through as-is)
    //   station_chain → station_chain (raw; nucleus normalises internally)
    //   gps_latitude  → latitude      (field rename at boundary)
    //   gps_longitude → longitude     (field rename at boundary)
    //   city          → null          (not available from source-agnostic interface)
    //   sourceName    → not passed    (nucleus is source-agnostic; no sourceName in scoring)
    //   priceNok      → not passed    (price is call-surface concern, not nucleus concern)
    // ════════════════════════════════════════════════════════

    // Bridge call — SDK invoke() propagates calling user's auth token automatically.
    // matchStationForUserReportedPrice requires an authenticated user (any role).
    // Using asServiceRole.functions ensures the call succeeds regardless of whether
    // the token is propagated correctly across function-to-function calls.
    // This is safe because preview_mode: true has no write side-effects.
    const delegateResponse = await base44.functions.invoke(
      'matchStationForUserReportedPrice',
      {
        preview_mode:  true,
        station_name:  station_name,
        station_chain: station_chain,
        latitude:      gps_latitude,
        longitude:     gps_longitude,
        city:          null,  // not available in source-agnostic interface
      }
    );

    if (!delegateResponse.data) {
      return Response.json({ error: 'Bridge delegation returned empty response' }, { status: 502 });
    }

    const bridge = delegateResponse.data;

    // ── Extract nucleus outcome from bridge response ─────────
    const bridgeDecision         = bridge.final_decision         || 'NO_SAFE_STATION_MATCH';
    const rawMatchScore          = bridge.top_candidates?.[0]?.final_score ?? 0;
    const dominanceGap           = bridge.dominance_gap          ?? null;
    const bridgeCandidates       = bridge.top_candidates         || [];
    const bridgeMatchedId        = bridge.matched_station_id     || null;
    const station_match_candidates = bridge.station_match_candidates || [];
    const candidatesCount        = bridge.candidates_count       ?? 0;

    // ── Confidence derivation — call-surface responsibility ──
    const confidenceScore = deriveConfidenceScore(bridgeDecision, rawMatchScore, dominanceGap);

    // ── Canonical outcome mapping ────────────────────────────
    const station_match_status = normalizeOutcome(bridgeDecision);

    let stationId             = null;
    let station_match_notes   = null;
    let confidenceReason      = null;
    let matchedStationSummary = null;

    if (station_match_status === 'matched_station_id') {
      stationId = bridgeMatchedId;
      matchedStationSummary = bridgeCandidates.length > 0 ? {
        id:            bridgeMatchedId,
        name:          bridgeCandidates[0].name,
        chain:         bridgeCandidates[0].chain  || null,
        city:          bridgeCandidates[0].city   || null,
        score:         bridgeCandidates[0].final_score,
        distanceMeters: bridgeCandidates[0].distance_km != null
          ? Math.round(bridgeCandidates[0].distance_km * 1000) : null,
      } : null;
      confidenceReason    = `Phase 2 match (bridge): score=${rawMatchScore}, dominanceGap=${dominanceGap}`;
      station_match_notes = null;

    } else if (station_match_status === 'review_needed_station_match') {
      confidenceReason    = `Phase 2 borderline (bridge): score=${rawMatchScore}, reason=${bridge.review_needed_reason || 'borderline'}`;
      station_match_notes = `Ambiguous match — score=${rawMatchScore}, dominanceGap=${dominanceGap}. Requires curator review.`;

    } else {
      confidenceReason    = `Phase 2 no-match (bridge): score=${rawMatchScore}`;
      station_match_notes = `No safe match found. Searched ${candidatesCount} stations within radius. Reason: ${bridge.debug_notes ? 'no_candidates' : 'below_threshold'}. Observation preserved for candidate creation.`;
    }

    // ── Routing flags — call-surface responsibility ──────────
    // Derived from nucleus outcome + plausibilityStatus. Call surface does not invent new decisions.
    const wouldCreateFuelPrice        = station_match_status === 'matched_station_id' && plausibilityStatus === 'realistic_price';
    const wouldCreateStationReview    = station_match_status === 'review_needed_station_match';
    const wouldCreateStationCandidate = station_match_status === 'no_safe_station_match';
    const displayableInNearbyPrices   = wouldCreateFuelPrice && stationId != null;

    // ── Top candidate summaries — shaped for UI ──────────────
    const topCandidateSummaries = bridgeCandidates.map(c => ({
      id:            c.id            || null,
      name:          c.name,
      chain:         c.chain         || null,
      city:          c.city          || null,
      score:         c.final_score,
      distanceMeters: c.distance_km != null ? Math.round(c.distance_km * 1000) : null,
      breakdown:     c.score_breakdown || null,
    }));

    // ── Preview result ───────────────────────────────────────
    return Response.json({
      // Meta
      previewMode:              true,
      srpVersion:               SRP_VERSION,
      contractVersionReference: SPEC_VERSION,
      resolvedAt:               new Date().toISOString(),
      note:                     "SRP preview-only — no records created, updated, or deleted",
      // Bridge marker — remove when permanent nucleus extraction is complete
      bridgeMode:               true,
      bridgeNote:               "TEMPORARY: matching delegated to matchStationForUserReportedPrice preview interface. Final target: direct shared pure nucleus.",

      // Canonical SRP outcome — produced by nucleus, normalised at call surface
      station_match_status,
      stationId,
      confidenceScore,
      confidenceReason,
      station_match_candidates,
      station_match_notes,
      plausibilityStatus,

      // Preserved observation context
      locationLabel:  locationLabel || bridge.parsed_location || null,
      station_name,
      station_chain:  station_chain || bridge.parsed_chain || null,
      gps_latitude,
      gps_longitude,

      // Routing flags (preview-only — no mutation)
      wouldCreateFuelPrice,
      wouldCreateStationCandidate,
      wouldCreateStationReview,
      displayableInNearbyPrices,

      // Input echo for side-by-side comparison
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
      geoSearchPerformed:  gps_latitude != null && gps_longitude != null,
      candidatesEvaluated: candidatesCount,
      candidatesScored:    bridgeCandidates.length,
      inputWarnings,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});