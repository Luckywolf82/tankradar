import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const norm = (s) => {
  if (!s) return '';
  return s.toLowerCase()
    .replace(/^["']+|["']+$/g, '')
    .replace(/\s*\(.*?\)\s*/g, ' ')
    .replace(/[-–—]+/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
};

const normMatch = (s) => norm(s).replace(/æ/g, 'ae').replace(/ø/g, 'oe').replace(/å/g, 'aa');

const SAFE_SPECIALTY_FUEL_SIGNALS = [
  { pattern: /^lpg\b/i, label: 'lpg_prefix' },
  { pattern: /^cng\b/i, label: 'cng_prefix' },
  { pattern: /\bhynion\b/i, label: 'hynion' },
  { pattern: /\bhydrogen\b/i, label: 'hydrogen' },
  { pattern: /\bh2\b/i, label: 'h2' },
  { pattern: /\bbiogass\b/i, label: 'biogas' },
  { pattern: /\bbiogas\b/i, label: 'biogas' },
  { pattern: /\btruck\s*diesel\b/i, label: 'truck_diesel' },
  { pattern: /\btruckdisel\b/i, label: 'truck_diesel' },
  { pattern: /\btruckdiesel\b/i, label: 'truck_diesel' },
  { pattern: /\bparafin\b/i, label: 'parafin' },
  { pattern: /\bfyringsolje\b/i, label: 'fyringsolje' },
];

const CONFLICT_SIGNALS = [
  { pattern: /\bcamping\b/i, label: 'camping' },
  { pattern: /\bkaf[eé]\b/i, label: 'kafe' },
  { pattern: /\bcafe\b/i, label: 'cafe' },
  { pattern: /\bhotell\b/i, label: 'hotell' },
  { pattern: /\bhotel\b/i, label: 'hotel' },
  { pattern: /\bmuseum\b/i, label: 'museum' },
  { pattern: /\bmiljøpark\b/i, label: 'miljopark' },
  { pattern: /\bmiljopark\b/i, label: 'miljopark' },
  { pattern: /\bavfall\b/i, label: 'avfall' },
  { pattern: /\bkommune\b/i, label: 'kommune' },
  { pattern: /\bpark\b/i, label: 'park' },
  { pattern: /\brestaurant\b/i, label: 'restaurant' },
];

const SERVICE_SIGNALS = [
  { pattern: /\bverksted\b/i, label: 'verksted' },
  { pattern: /\bværksted\b/i, label: 'verksted' },
  { pattern: /\blandbruksverksted\b/i, label: 'landbruksverksted' },
  { pattern: /\bbil\b/i, label: 'bil' },
  { pattern: /\bmotor\b/i, label: 'motor' },
  { pattern: /\btraktor\b/i, label: 'traktor' },
  { pattern: /\bservice\b/i, label: 'service' },
  { pattern: /\bvarmeservice\b/i, label: 'varmeservice' },
  { pattern: /\bsanitær\b/i, label: 'sanitær' },
  { pattern: /\bsanitar\b/i, label: 'sanitær' },
  { pattern: /\bbobilsenter\b/i, label: 'bobilsenter' },
];

const detectSignals = (name, signalList) => {
  const n = norm(name);
  const nm = normMatch(name);
  return signalList
    .filter(sig => sig.pattern.test(n) || sig.pattern.test(nm))
    .map(sig => sig.label);
};

const determineSafety = (name, stationType, specialtyFuelSignals, conflictSignals, serviceSignals) => {
  const hasSpecialtyFuelSignal = specialtyFuelSignals.length > 0;
  const hasConflictSignal = conflictSignals.length > 0;
  const hasServiceSignal = serviceSignals.length > 0;

  if (!hasSpecialtyFuelSignal) {
    return { safeToAutoConfirm: false, reason: 'no_specialty_fuel_signal' };
  }

  if (hasConflictSignal) {
    return { safeToAutoConfirm: false, reason: `conflict_signals: ${conflictSignals.join(', ')}` };
  }

  if (hasServiceSignal) {
    return { safeToAutoConfirm: false, reason: `service_signals_manual_hold: ${serviceSignals.join(', ')}` };
  }

  return { safeToAutoConfirm: true, reason: `safe_specialty_fuel: ${specialtyFuelSignals.join(', ')}` };
};

const mapStationTypeToSuggested = (stationType, signals) => {
  if (signals.includes('lpg_prefix') || signals.includes('lpg')) return 'lpg';
  if (signals.includes('cng_prefix') || signals.includes('cng')) return 'cng';
  if (signals.includes('truck_diesel')) return 'truck_diesel';
  if (signals.includes('biogas')) return 'biogas';
  if (signals.includes('hydrogen') || signals.includes('h2') || signals.includes('hynion')) return 'lpg';
  if (signals.includes('parafin') || signals.includes('fyringsolje')) return 'lpg';
  return stationType || 'unknown';
};

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();

  if (!user || user.role !== 'admin') {
    return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }

  console.log(`[applyAutoConfirmSpecialtyFuel] Starting apply...`);

  // Fetch all stations
  let allStations = [];
  let page = 0;
  while (true) {
    const batch = await base44.asServiceRole.entities.Station.list('-created_date', 500, page * 500);
    if (!batch || batch.length === 0) break;
    allStations = allStations.concat(batch);
    if (batch.length < 500) break;
    page++;
  }
  const stationMap = {};
  for (const s of allStations) stationMap[s.id] = s;

  // Fetch pending specialty_fuel_review records
  let reviews = [];
  page = 0;
  while (true) {
    const batch = await base44.asServiceRole.entities.StationReview.filter(
      { review_type: 'specialty_fuel_review', status: 'pending' },
      '-created_date',
      500,
      page * 500
    );
    if (!batch || batch.length === 0) break;
    reviews = reviews.concat(batch);
    if (batch.length < 500) break;
    page++;
  }

  console.log(`[applyAutoConfirmSpecialtyFuel] Found ${reviews.length} pending specialty_fuel_reviews`);

  // Identify safe candidates
  const safeCandidates = [];
  const skipped = [];

  for (const review of reviews) {
    const station = stationMap[review.stationId];
    if (!station) {
      skipped.push({ stationId: review.stationId, reason: 'station_not_found' });
      continue;
    }

    const specialtyFuelSignals = detectSignals(station.name, SAFE_SPECIALTY_FUEL_SIGNALS);
    const conflictSignals = detectSignals(station.name, CONFLICT_SIGNALS);
    const serviceSignals = detectSignals(station.name, SERVICE_SIGNALS);

    const safety = determineSafety(station.name, station.stationType, specialtyFuelSignals, conflictSignals, serviceSignals);

    if (!safety.safeToAutoConfirm) {
      skipped.push({ stationId: review.stationId, stationName: station.name, reason: safety.reason });
      continue;
    }

    const suggestedStationType = mapStationTypeToSuggested(station.stationType, specialtyFuelSignals);

    safeCandidates.push({
      review,
      station,
      specialtyFuelSignals,
      suggestedStationType,
    });
  }

  console.log(`[applyAutoConfirmSpecialtyFuel] Identified ${safeCandidates.length} safe candidates to apply`);

  // Apply phase
  const applied = [];
  const BATCH = 15;

  for (let i = 0; i < safeCandidates.length; i += BATCH) {
    const slice = safeCandidates.slice(i, i + BATCH);

    await Promise.all(slice.map(async (candidate) => {
      try {
        const { review, station, suggestedStationType } = candidate;

        // Update Station stationType if needed
        if (station.stationType !== suggestedStationType) {
          await base44.asServiceRole.entities.Station.update(station.id, {
            stationType: suggestedStationType,
          });
        }

        // Auto-resolve the review
        await base44.asServiceRole.entities.StationReview.update(review.id, {
          status: 'auto_resolved',
          notes: `Auto-confirmed by applyAutoConfirmSpecialtyFuel. Set stationType to ${suggestedStationType}`,
        });

        applied.push({
          stationId: station.id,
          stationName: station.name,
          oldStationType: station.stationType,
          newStationType: suggestedStationType,
          signals: candidate.specialtyFuelSignals,
        });

        console.log(`[applyAutoConfirmSpecialtyFuel] ✓ ${station.name} → ${suggestedStationType}`);
      } catch (e) {
        skipped.push({ stationId: candidate.station.id, stationName: candidate.station.name, reason: `error: ${e.message}` });
        console.error(`[applyAutoConfirmSpecialtyFuel] Error applying ${candidate.station.name}:`, e.message);
      }
    }));

    if (i + BATCH < safeCandidates.length) await new Promise(r => setTimeout(r, 60));
  }

  // Build summary
  const byStationType = {};
  for (const a of applied) {
    if (!byStationType[a.newStationType]) byStationType[a.newStationType] = 0;
    byStationType[a.newStationType]++;
  }

  const summary = {
    totalPendingSpecialtyFuelReviews: reviews.length,
    totalSafeCandidates: safeCandidates.length,
    totalApplied: applied.length,
    totalSkipped: skipped.length,
    appliedByStationType: byStationType,
    appliedExamples: applied.slice(0, 20),
    skippedExamples: skipped.slice(0, 10),
  };

  // Console logging
  console.log('[applyAutoConfirmSpecialtyFuel] ── SUMMARY ──');
  console.log(`  Total pending specialty_fuel_reviews: ${summary.totalPendingSpecialtyFuelReviews}`);
  console.log(`  Total safe candidates: ${summary.totalSafeCandidates}`);
  console.log(`  Total applied: ${summary.totalApplied}`);
  console.log(`  Total skipped: ${summary.totalSkipped}`);
  console.log(`  Applied by stationType:`);
  for (const [type, count] of Object.entries(summary.appliedByStationType)) {
    console.log(`    - ${type}: ${count}`);
  }
  if (applied.length > 0) {
    console.log(`  Applied stations:`);
    for (const a of applied.slice(0, 25)) {
      console.log(`    • ${a.stationName} → ${a.newStationType}`);
    }
  }

  return Response.json({ success: true, summary });
});