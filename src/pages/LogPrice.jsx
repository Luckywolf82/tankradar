import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import PhotoCapture from "../components/logprice/PhotoCapture.jsx";
import ConfirmPrice from "../components/logprice/ConfirmPrice.jsx";
import StationPicker from "../components/logprice/StationPicker.jsx";
import { OptimisticSuccess } from "../components/logprice/OptimisticSuccess";
import ProximityConfirmBanner from "../components/logprice/ProximityConfirmBanner";
import { RouteAnimation } from "../components/mobile/RouteAnimation";

const FUEL_TYPES = ["bensin_95", "bensin_98", "diesel", "diesel_premium"];

// Write-time only: strict canonical mapping for FuelPrice.fuelType
// Only these two canonical values are allowed to be written.
const WRITE_TIME_FUEL_MAP = {
  bensin_95: "gasoline_95",
  bensin: "gasoline_95",
  "95": "gasoline_95",
  gasoline_95: "gasoline_95",
  petrol: "gasoline_95",
  diesel: "diesel",
  dsl: "diesel",
};

function normalizeFuelTypeForWrite(input) {
  if (!input) return null;
  return WRITE_TIME_FUEL_MAP[String(input).toLowerCase().trim()] || null;
}

function emptyPrices() {
  return Object.fromEntries(FUEL_TYPES.map(k => [k, { price: "", enabled: false, aiDetected: false }]));
}

function classifyPricePlausibility(priceNok) {
  if (!priceNok) return null;
  if (priceNok < 10) return "suspect_price_low";
  if (priceNok > 30) return "suspect_price_high";
  return "realistic_price";
}

function latLonToRegion(lat, lon) {
  if (lat > 70) return "Finnmark";
  if (lat > 69) return "Troms";
  if (lat > 65) return "Nordland";
  if (lat > 63) return "Trøndelag";
  if (lat > 62) return "Møre og Romsdal";
  if (lat > 60.5) return "Vestland";
  if (lon < 6.5 && lat > 58.5) return "Rogaland";
  if (lat > 58.5) return "Agder";
  if (lat > 59.3 && lon > 10) return "Oslo og Akershus";
  if (lat > 59.3) return "Viken";
  if (lat > 58.8) return "Vestfold og Telemark";
  return "Innlandet";
}

function guessChain(name) {
  if (!name) return "";
  const n = name.toLowerCase();
  if (n.includes("circle k") || n.includes("statoil")) return "Circle K";
  if (n.includes("uno-x") || n.includes("unox")) return "Uno-X";
  if (n.includes("esso")) return "Esso";
  if (n.includes("shell")) return "Shell";
  if (n.includes("yx")) return "YX";
  if (n.includes("best")) return "Best";
  return "";
}

/**
 * DIRECT STATION BIND DECISION
 *
 * Priority 1 — Catalog ID present:
 *   User explicitly selected a Station catalog entry that has a real stationId.
 *   This is authoritative regardless of source or GPS distance.
 *   The station was already deduplicated in StationPicker and is a verified catalog record.
 *
 * Priority 2 — Source-backed Google Places selection:
 *   User selected a GP result. No stationId yet, but source identity is known.
 *   Caller must attempt exact Station lookup by sourceStationId before falling back.
 *   This function returns a sentinel to trigger that lookup path.
 *
 * If neither applies, returns null → full remote matching fallback.
 */
function tryDirectBind(stationInfo) {
  // PRIORITY 1: Known catalog station — direct bind, no GPS gate needed
  // The user explicitly selected this from the deduplicated station picker.
  // The catalog ID is the authoritative signal.
  if (stationInfo.station_id && stationInfo.selectedSource === 'station_catalog') {
    return {
      status: 'matched_station_id',
      stationId: stationInfo.station_id,
      candidates: [stationInfo.station_id],
      reason: 'explicit_catalog_selection_direct_bind',
      _bindPath: 'catalog_id',
    };
  }

  // PRIORITY 1b: Known catalog station from any source with a confirmed station_id
  // (covers edge case where selectedSource is null/unknown but station_id is set)
  if (stationInfo.station_id) {
    return {
      status: 'matched_station_id',
      stationId: stationInfo.station_id,
      candidates: [stationInfo.station_id],
      reason: 'explicit_selection_station_id_present',
      _bindPath: 'catalog_id_any_source',
    };
  }

  // PRIORITY 2: Google Places selection with source identity — signal for caller to attempt lookup
  if (
    stationInfo.selectedSource === 'google_places' &&
    stationInfo.selectedGooglePlaceId
  ) {
    return {
      status: '_needs_source_lookup',
      googlePlaceId: stationInfo.selectedGooglePlaceId,
      _bindPath: 'google_place_id_lookup',
    };
  }

  // No direct bind possible — fall through to remote matching
  return null;
}

export default function LogPrice() {
  const [step, setStep] = useState("station");
  const [imageUrl, setImageUrl] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [detectedPrices, setDetectedPrices] = useState(emptyPrices());
  const [stationInfo, setStationInfo] = useState({
    station_id: null,
    station_chain: "",
    station_name: "",
    city: "",
    region: "",
    latitude: null,
    longitude: null,
    google_place_id: null,
    date_observed: format(new Date(), "yyyy-MM-dd"),
    // Clarification metadata — captured at selection, passed through to FuelPrice
    selectedGooglePlaceId: null,
    selectedSource: null,
    selectedCandidateDistanceM: null,
    secondCandidateDistanceM: null,
    distanceGapM: null,
    userConfirmedSuggestedStation: null,
    userCorrectedChain: null,
    userClarificationReason: null,
  });

  const handleSelectStation = (selectedStation) => {
    setStationInfo(prev => ({
      ...prev,
      ...selectedStation,
    }));
    setStep("photo");
  };

  const handlePhoto = async (file) => {
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    setStep("confirm");
    setLocationLoading(true);

    // AI: read all prices from image
    const aiResult = await Promise.allSettled([
      (async () => {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        return base44.integrations.Core.InvokeLLM({
          prompt: `Look at this image of a Norwegian gas station price sign. Extract ALL fuel prices visible. Return a JSON object with these optional fields: bensin_95 (number), bensin_98 (number), diesel (number), diesel_premium (number). Only include prices clearly visible. Norwegian fuel prices are between 15 and 25 kr per liter. If a price is not visible, omit that field.`,
          file_urls: [file_url],
          response_json_schema: {
            type: "object",
            properties: {
              bensin_95: { type: "number" },
              bensin_98: { type: "number" },
              diesel: { type: "number" },
              diesel_premium: { type: "number" },
            }
          }
        });
      })()
    ]);

    // Apply AI results
    if (aiResult[0].status === "fulfilled") {
      const ai = aiResult[0].value;
      setDetectedPrices(prev => {
        const next = { ...prev };
        for (const key of FUEL_TYPES) {
          if (ai[key] && ai[key] > 10 && ai[key] < 30) {
            next[key] = { price: ai[key].toFixed(2), enabled: true, aiDetected: true };
          }
        }
        // If nothing detected, enable bensin_95 for manual entry
        if (!Object.values(next).some(v => v.enabled)) {
          next.bensin_95 = { price: "", enabled: true, aiDetected: false };
        }
        return next;
      });
    } else {
      // Enable bensin_95 for manual entry if AI failed
      setDetectedPrices(prev => ({ ...prev, bensin_95: { price: "", enabled: true, aiDetected: false } }));
    }

    setLocationLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);
    setShowSuccess(true); // Show optimistic success immediately
    
    const now = new Date().toISOString();
    
    try {
      // ── STATION BINDING ────────────────────────────────────────────────────
      // Step 1: Try direct bind from explicit user selection (catalog ID or GP source)
      // Step 2: If GP source identity — attempt exact Station lookup by sourceStationId
      // Step 3: Fallback to remote matching only if no direct bind was possible
      // ──────────────────────────────────────────────────────────────────────

      const directBindAttempt = tryDirectBind(stationInfo);

      console.log('[LogPrice][match] selected station_id:', stationInfo.station_id);
      console.log('[LogPrice][match] selected source:', stationInfo.selectedSource);
      console.log('[LogPrice][match] selected google_place_id:', stationInfo.selectedGooglePlaceId);
      console.log('[LogPrice][match] directBindAttempt:', JSON.stringify(directBindAttempt));

      let matchResult = null;
      let _usedBindPath = null;

      if (directBindAttempt && directBindAttempt.status === 'matched_station_id') {
        // DIRECT BIND — catalog stationId is authoritative, skip remote matching
        matchResult = directBindAttempt;
        _usedBindPath = directBindAttempt._bindPath;
        console.log('[LogPrice][match] PATH: direct_bind →', directBindAttempt._bindPath);
        console.log('[LogPrice][match] final stationId:', matchResult.stationId);
        console.log('[LogPrice][match] final station_match_status: matched_station_id');

      } else if (directBindAttempt && directBindAttempt.status === '_needs_source_lookup') {
        // SOURCE LOOKUP — try to find Station by google_place_id / sourceStationId
        console.log('[LogPrice][match] PATH: source_identity_lookup → google_place_id:', directBindAttempt.googlePlaceId);
        let foundBySource = null;
        try {
          const sourceMatches = await base44.entities.Station.filter({
            sourceStationId: directBindAttempt.googlePlaceId,
          });
          foundBySource = sourceMatches?.find(s => s.status !== 'archived_duplicate') || null;
        } catch (_) {}

        if (foundBySource) {
          matchResult = {
            status: 'matched_station_id',
            stationId: foundBySource.id,
            candidates: [foundBySource.id],
            reason: 'source_identity_lookup_exact_match',
            _bindPath: 'google_place_id_to_station',
          };
          _usedBindPath = 'google_place_id_to_station';
          console.log('[LogPrice][match] source lookup succeeded → stationId:', foundBySource.id);
        } else {
          console.log('[LogPrice][match] source lookup: no exact match found, falling back to remote matching');
          _usedBindPath = 'fallback_remote_match';
        }
      } else {
        _usedBindPath = 'fallback_remote_match';
      }

      // FALLBACK: remote matching (only when no direct bind was possible)
      if (!matchResult) {
        console.log('[LogPrice][match] PATH: fallback_remote_match');
        try {
          const matchRes = await base44.functions.invoke('matchStationForUserReportedPrice', {
            gps_lat: window.__gpsLat,
            gps_lon: window.__gpsLon,
            latitude: stationInfo.latitude,
            longitude: stationInfo.longitude,
            station_name: stationInfo.station_name,
            station_chain: stationInfo.station_chain,
            city: stationInfo.city
          });
          matchResult = matchRes.data;
          console.log('[LogPrice][match] remote match result:', matchResult?.status, '/ stationId:', matchResult?.stationId);
        } catch (err) {
          console.warn('[LogPrice][match] remote match failed:', err.message);
          matchResult = { status: 'no_safe_station_match', stationId: null };
        }
      }

      console.log('[LogPrice][match] FINAL → bindPath:', _usedBindPath, '| status:', matchResult?.status, '| stationId:', matchResult?.stationId);
      
      const entries = FUEL_TYPES
        .filter(k => detectedPrices[k].enabled && detectedPrices[k].price)
        .map(k => {
          // Write-time canonical enforcement: reject non-canonical fuelType values
          const canonicalFuelType = normalizeFuelTypeForWrite(k);
          if (!canonicalFuelType) {
            console.error("Invalid fuelType in logPrice:", k);
            return null;
          }

          const priceNok = parseFloat(detectedPrices[k].price);
          
          // Determine confidence score and reason based on match status
          let confidenceScore = 0.30;
          let confidenceReason = "no_station_match + gps_signal_only";
          
          if (matchResult?.status === 'matched_station_id') {
            confidenceScore = 0.85;
            // Reflect actual bind path in reason
            if (_usedBindPath === 'catalog_id' || _usedBindPath === 'catalog_id_any_source') {
              confidenceReason = "explicit_user_selection_catalog_id_direct_bind";
            } else if (_usedBindPath === 'google_place_id_to_station') {
              confidenceReason = "explicit_user_selection_source_identity_lookup";
            } else {
              confidenceReason = "chain_match + name_similarity + distance_close";
            }
          } else if (matchResult?.status === 'review_needed_station_match') {
            confidenceScore = 0.50;
            confidenceReason = "ambiguous_station + uncertain_distance";
          }
          
          const entry = {
            fuelType: canonicalFuelType,
            priceNok: priceNok,
            priceType: "user_reported",
            sourceName: "user_reported",
            sourceUrl: null,
            sourceUpdatedAt: null,
            fetchedAt: now,
            sourceFrequency: "unknown",
            confidenceScore: confidenceScore,
            confidenceReason: confidenceReason,
            parserVersion: "user_reported_v1",
            plausibilityStatus: classifyPricePlausibility(priceNok),
            locationLabel: stationInfo.city || null,
            rawPayloadSnippet: `User reported: ${k} = ${priceNok} NOK/L`,
            station_match_status: matchResult?.status || 'no_safe_station_match',
            gps_latitude: window.__gpsLat || null,
            gps_longitude: window.__gpsLon || null
          };
          
          // Add stationId if matched
          if (matchResult?.status === 'matched_station_id' && matchResult?.stationId) {
            entry.stationId = matchResult.stationId;
          }

          // Preserve user-selected station snapshot fields for audit/traceability
          // on all match statuses, not only no_safe_station_match
          if (stationInfo.station_name) {
            entry.station_name = stationInfo.station_name;
          }
          if (stationInfo.station_chain) {
            entry.station_chain = stationInfo.station_chain;
          }

          // Add candidates if review needed
          if (matchResult?.status === 'review_needed_station_match') {
            entry.station_match_candidates = matchResult?.candidates || null;
            entry.station_match_notes = matchResult?.candidates 
              ? `Review needed: ${matchResult.candidates.length} candidate(s) require manual verification`
              : `Review needed: matching ambiguous but candidates data missing`;
          }
          
          // Add discovery metadata if no safe match
          if (matchResult?.status === 'no_safe_station_match') {
            entry.station_name = stationInfo.station_name || null;
            entry.station_chain = stationInfo.station_chain || null;
            entry.station_match_notes = `No safe match found. GPS [${window.__gpsLat}, ${window.__gpsLon}], name "${stationInfo.station_name}", chain "${stationInfo.station_chain}"`;
          }

          // Attach clarification metadata if available (read-only signal, never used for matching)
          entry.rawPayloadSnippet = [
            entry.rawPayloadSnippet,
            stationInfo.selectedSource ? `source=${stationInfo.selectedSource}` : null,
            stationInfo.selectedCandidateDistanceM != null ? `distM=${stationInfo.selectedCandidateDistanceM}` : null,
            stationInfo.secondCandidateDistanceM != null ? `2ndDistM=${stationInfo.secondCandidateDistanceM}` : null,
            stationInfo.distanceGapM != null ? `gapM=${stationInfo.distanceGapM}` : null,
            stationInfo.userConfirmedSuggestedStation != null ? `confirmed=${stationInfo.userConfirmedSuggestedStation}` : null,
            stationInfo.userCorrectedChain ? `correctedChain=${stationInfo.userCorrectedChain}` : null,
            stationInfo.userClarificationReason ? `clarification=${stationInfo.userClarificationReason}` : null,
            matchResult?.reason ? `matchReason=${matchResult.reason}` : null,
          ].filter(Boolean).join(' | ');

          return entry;
        })
        .filter(Boolean); // Remove null entries from rejected non-canonical fuelTypes
      
      // Attach reportedByUserId if user is logged in
      let reporterUserId = null;
      try {
        const me = await base44.auth.me();
        if (me?.id) reporterUserId = me.id;
      } catch (_) {}
      if (reporterUserId) {
        entries.forEach(e => { e.reportedByUserId = reporterUserId; });
      }

      await base44.entities.FuelPrice.bulkCreate(entries);
      
      // If no safe match exists, capture as StationCandidate for review pipeline
      if (matchResult?.status === 'no_safe_station_match') {
        try {
          const candidateRes = await base44.functions.invoke('createStationCandidateFromUserReportedPrice', {
            station_name: stationInfo.station_name,
            station_chain: stationInfo.station_chain,
            city: stationInfo.city,
            gps_lat: stationInfo.latitude || window.__gpsLat,
            gps_lon: stationInfo.longitude || window.__gpsLon,
            google_place_id: stationInfo.google_place_id
          });
          console.log('[LogPrice] Candidate creation result:', candidateRes.data);
        } catch (candidateErr) {
          console.error('[LogPrice] Candidate creation failed (non-critical):', candidateErr.message);
          // Non-critical: price was saved, candidate creation optional
        }
      }
      
      setSubmitting(false);
    } catch (error) {
      // API failed: show error, keep optimistic UI visible
      setSubmitError(error.message || "Kunne ikke lagre prisene. Prøv igjen.");
      setSubmitting(false);
    }
  };

  const reset = () => {
    setStep("station");
    setImageUrl(null);
    setDetectedPrices(emptyPrices());
    setStationInfo(s => ({ ...s, station_id: null, station_chain: "", station_name: "", city: "", region: "", latitude: null, longitude: null, google_place_id: null, selectedGooglePlaceId: null, selectedSource: null, selectedCandidateDistanceM: null, secondCandidateDistanceM: null, distanceGapM: null, userConfirmedSuggestedStation: null, userCorrectedChain: null, userClarificationReason: null }));
    setShowSuccess(false);
    setSubmitError(null);
  };

  const resetForRepeat = () => {
    setStep("photo");
    setImageUrl(null);
    setDetectedPrices(emptyPrices());
    setShowSuccess(false);
    setSubmitError(null);
  };

  return (
    <RouteAnimation pageName="LogPrice">
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 md:p-8">
        <div className="max-w-xl mx-auto">
        <Link to={createPageUrl("Dashboard")} className="inline-flex items-center gap-1 text-slate-500 hover:text-blue-600 mb-6 text-sm">
          <ArrowLeft size={16} /> Tilbake til oversikt
        </Link>

        {step === "station" && (
          <StationPicker 
            onSelectStation={handleSelectStation}
            onSkip={() => setStep("photo")}
          />
        )}

        {step === "photo" && (
          <Card className="shadow-lg">
            <CardContent className="p-6">
              <PhotoCapture onPhoto={handlePhoto} onSkip={() => setStep("confirm")} />
            </CardContent>
          </Card>
        )}

        {step === "confirm" && (
          <>
            <ProximityConfirmBanner
              stationInfo={stationInfo}
              setStationInfo={setStationInfo}
              onChangeStation={() => setStep("station")}
            />
            <ConfirmPrice
              detectedPrices={detectedPrices}
              setDetectedPrices={setDetectedPrices}
              stationInfo={stationInfo}
              setStationInfo={setStationInfo}
              imageUrl={imageUrl}
              onSubmit={handleSubmit}
              loading={submitting}
              locationLoading={locationLoading}
              onChangeStation={() => setStep("station")}
            />
          </>
        )}
        
        <OptimisticSuccess 
          show={showSuccess} 
          isLoading={submitting}
          error={submitError}
          stationName={stationInfo.station_name}
          onReset={reset}
          onRepeatSameStation={resetForRepeat}
          onDismiss={() => setShowSuccess(false)}
        />
      </div>
    </div>
    </RouteAnimation>
  );
}