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

  // Must have specialty fuel signal
  if (!hasSpecialtyFuelSignal) {
    return {
      safeToAutoConfirm: false,
      reason: 'no_specialty_fuel_signal',
      classification: 'unclear_manual_review',
    };
  }

  // Conflict signals block auto-confirm
  if (hasConflictSignal) {
    return {
      safeToAutoConfirm: false,
      reason: `conflict_signals: ${conflictSignals.join(', ')}`,
      classification: 'likely_non_fuel_poi',
    };
  }

  // Service signals → manual hold (conservative)
  if (hasServiceSignal) {
    return {
      safeToAutoConfirm: false,
      reason: `service_signals_manual_hold: ${serviceSignals.join(', ')}`,
      classification: 'manual_hold',
    };
  }

  // Strong specialty fuel signal + no conflicts + no service → safe
  return {
    safeToAutoConfirm: true,
    reason: `safe_specialty_fuel: ${specialtyFuelSignals.join(', ')}`,
    classification: 'likely_specialty_fuel',
  };
};

const mapStationTypeToSuggested = (stationType, signals) => {
  if (signals.includes('lpg_prefix') || signals.includes('lpg_contained')) return 'lpg';
  if (signals.includes('cng_prefix') || signals.includes('cng_contained')) return 'cng';
  if (signals.includes('truck_diesel')) return 'truck_diesel';
  if (signals.includes('biogas')) return 'biogas';
  if (signals.includes('hydrogen') || signals.includes('h2') || signals.includes('hynion')) return 'cng';
  if (signals.includes('parafin') || signals.includes('fyringsolje')) return 'unknown';
  return stationType || 'unknown';
};

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();

  if (!user || user.role !== 'admin') {
    return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }

  console.log(`[previewAutoConfirmSpecialtyFuel] Starting preview analysis...`);

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

  console.log(`[previewAutoConfirmSpecialtyFuel] Found ${reviews.length} pending specialty_fuel_reviews`);

  // Analyze each review
  const analyzed = [];
  const byReasonMap = {};
  const safeCount = { total: 0, byReason: {} };
  const manualHoldCount = { total: 0, byReason: {} };

  for (const review of reviews) {
    const station = stationMap[review.stationId];
    if (!station) continue;

    const specialtyFuelSignals = detectSignals(station.name, SAFE_SPECIALTY_FUEL_SIGNALS);
    const conflictSignals = detectSignals(station.name, CONFLICT_SIGNALS);
    const serviceSignals = detectSignals(station.name, SERVICE_SIGNALS);

    const allSignals = [
      ...specialtyFuelSignals.map(s => `fuel:${s}`),
      ...conflictSignals.map(s => `conflict:${s}`),
      ...serviceSignals.map(s => `service:${s}`),
    ];

    const safety = determineSafety(
      station.name,
      station.stationType,
      specialtyFuelSignals,
      conflictSignals,
      serviceSignals
    );

    const suggestedStationType = mapStationTypeToSuggested(station.stationType, specialtyFuelSignals);

    const record = {
      stationId: station.id,
      stationName: station.name,
      currentChain: station.chain || null,
      currentOperator: station.operator || null,
      currentStationType: station.stationType || null,
      signalsDetected: allSignals,
      safeToAutoConfirm: safety.safeToAutoConfirm,
      reason: safety.reason,
      suggestedStationType,
      suggestedAction: safety.safeToAutoConfirm ? `Auto-resolve and set stationType to ${suggestedStationType}` : `Manual review required: ${safety.reason}`,
    };

    analyzed.push(record);

    // Track stats
    if (safety.safeToAutoConfirm) {
      safeCount.total++;
      if (!safeCount.byReason[safety.reason]) safeCount.byReason[safety.reason] = 0;
      safeCount.byReason[safety.reason]++;
    } else if (safety.classification === 'manual_hold') {
      manualHoldCount.total++;
      if (!manualHoldCount.byReason[safety.reason]) manualHoldCount.byReason[safety.reason] = 0;
      manualHoldCount.byReason[safety.reason]++;
    }

    if (!byReasonMap[safety.reason]) byReasonMap[safety.reason] = 0;
    byReasonMap[safety.reason]++;
  }

  // Extract examples
  const examplesSafeToAutoConfirm = analyzed.filter(a => a.safeToAutoConfirm).slice(0, 15);
  const examplesManualHold = analyzed.filter(a => !a.safeToAutoConfirm && a.suggestedAction.includes('Manual review')).slice(0, 15);

  // Build summary
  const summary = {
    totalPendingSpecialtyFuelReviews: reviews.length,
    totalSafeToAutoConfirm: safeCount.total,
    totalManualHold: manualHoldCount.total,
    totalUnclear: reviews.length - safeCount.total - manualHoldCount.total,
    byReason: byReasonMap,
    safeToAutoConfirmByReason: safeCount.byReason,
    manualHoldByReason: manualHoldCount.byReason,
  };

  // Console logging
  console.log('[previewAutoConfirmSpecialtyFuel] ── SUMMARY ──');
  console.log(`  Total pending specialty_fuel_reviews: ${summary.totalPendingSpecialtyFuelReviews}`);
  console.log(`  Safe to auto-confirm: ${summary.totalSafeToAutoConfirm}`);
  console.log(`  Manual hold (service signals): ${summary.totalManualHold}`);
  console.log(`  Unclear/conflict signals: ${summary.totalUnclear}`);
  console.log(`  Breakdown by reason:`);
  for (const [reason, count] of Object.entries(summary.byReason)) {
    console.log(`    - ${reason}: ${count}`);
  }

  if (examplesSafeToAutoConfirm.length > 0) {
    console.log(`  Examples safe to auto-confirm (${examplesSafeToAutoConfirm.length}):`);
    for (const ex of examplesSafeToAutoConfirm.slice(0, 5)) {
      console.log(`    • ${ex.stationName} → ${ex.suggestedStationType}`);
    }
  }

  if (examplesManualHold.length > 0) {
    console.log(`  Examples manual hold (${examplesManualHold.length}):`);
    for (const ex of examplesManualHold.slice(0, 5)) {
      console.log(`    • ${ex.stationName} (${ex.reason})`);
    }
  }

  return Response.json({
    success: true,
    summary,
    examplesSafeToAutoConfirm,
    examplesManualHold,
    fullResultRows: analyzed,
  });
});