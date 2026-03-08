import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const norm = (s) => (s || '').toLowerCase().replace(/[^\w\s]/g, '').trim();

// Marine / fuel adjacent patterns
const MARINE_PATTERNS = [
  { pattern: /\bmarina\b/, keyword: 'marina' },
  { pattern: /\bhavn\b/, keyword: 'havn' },
  { pattern: /\bbåt\b/, keyword: 'båt' },
  { pattern: /\bbrygge\b/, keyword: 'brygge' },
  { pattern: /\bmarine\b/, keyword: 'marine' },
  { pattern: /\bsjø\b/, keyword: 'sjø' },
  { pattern: /\bbukta\b/, keyword: 'bukta' },
  { pattern: /\bkyst\b/, keyword: 'kyst' },
  { pattern: /\bhamn\b/, keyword: 'hamn' },
];

const FUEL_ADJACENT_PATTERNS = [
  { pattern: /\boljeservice\b/, keyword: 'oljeservice' },
  { pattern: /\bservicesenter\b/, keyword: 'servicesenter' },
  { pattern: /\btransportsenter\b/, keyword: 'transportsenter' },
  { pattern: /\bfyringsolje\b/, keyword: 'fyringsolje' },
  { pattern: /\bparafin\b/, keyword: 'parafin' },
];

// Service / trade patterns
const SERVICE_PATTERNS = [
  { pattern: /\bvarmeservice\b/, keyword: 'varmeservice' },
  { pattern: /\bservicehandel\b/, keyword: 'servicehandel' },
  { pattern: /\bverksted\b/, keyword: 'verksted' },
  { pattern: /\bbilservice\b/, keyword: 'bilservice' },
  { pattern: /\bautoservice\b/, keyword: 'autoservice' },
  { pattern: /\bgummiservice\b/, keyword: 'gummiservice' },
  { pattern: /\bhandel\b/, keyword: 'handel' },
  { pattern: /\bbil og motor\b/, keyword: 'bil og motor' },
];

const detectKeywords = (text, patterns) => {
  const normalized = norm(text);
  const detected = [];
  for (const { pattern, keyword } of patterns) {
    if (pattern.test(normalized)) {
      detected.push(keyword);
    }
  }
  return detected;
};

const classifyAndPrioritize = (station) => {
  const marineKeywords = detectKeywords(station.name, MARINE_PATTERNS);
  const fuelAdjacentKeywords = detectKeywords(station.name, FUEL_ADJACENT_PATTERNS);
  const serviceKeywords = detectKeywords(station.name, SERVICE_PATTERNS);

  if (station.stationType === 'marine_fuel') {
    return {
      semanticCategory: 'likely_marine_or_fuel_adjacent',
      semanticSignals: ['stationType=marine_fuel', ...marineKeywords, ...fuelAdjacentKeywords],
      priorityLevel: 'HIGH',
      priorityReason: 'stationType explicitly set to marine_fuel',
      recommendedManualAction: 'inspect_as_possible_marine_fuel',
      semanticConfidence: 0.95,
    };
  }

  if ((marineKeywords.length > 0 && fuelAdjacentKeywords.length > 0) ||
      (marineKeywords.length > 1)) {
    return {
      semanticCategory: 'likely_marine_or_fuel_adjacent',
      semanticSignals: [...marineKeywords, ...fuelAdjacentKeywords],
      priorityLevel: 'HIGH',
      priorityReason: 'marine/harbor signals + fuel-adjacent keywords detected',
      recommendedManualAction: 'inspect_as_possible_marine_fuel',
      semanticConfidence: 0.85,
    };
  }

  if (fuelAdjacentKeywords.length > 0) {
    return {
      semanticCategory: 'likely_marine_or_fuel_adjacent',
      semanticSignals: fuelAdjacentKeywords,
      priorityLevel: 'HIGH',
      priorityReason: 'fuel-adjacent keywords (oljeservice, servicesenter) detected',
      recommendedManualAction: 'inspect_as_possible_local_fuel_site',
      semanticConfidence: 0.8,
    };
  }

  if (serviceKeywords.length > 0) {
    return {
      semanticCategory: 'likely_service_or_trade_site',
      semanticSignals: serviceKeywords,
      priorityLevel: 'MEDIUM',
      priorityReason: 'service/trade/retail keywords detected',
      recommendedManualAction: 'inspect_as_service_or_trade',
      semanticConfidence: 0.7,
    };
  }

  if (marineKeywords.length > 0) {
    return {
      semanticCategory: 'likely_marine_or_fuel_adjacent',
      semanticSignals: marineKeywords,
      priorityLevel: 'MEDIUM',
      priorityReason: 'marine/harbor keywords present',
      recommendedManualAction: 'inspect_as_possible_marine_fuel',
      semanticConfidence: 0.65,
    };
  }

  return {
    semanticCategory: 'unclear_named_local_business',
    semanticSignals: [],
    priorityLevel: 'LOW',
    priorityReason: 'no strong semantic signals detected',
    recommendedManualAction: 'leave_for_manual_name_lookup',
    semanticConfidence: 0,
  };
};

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();

  if (!user || user.role !== 'admin') {
    return Response.json(
      { error: 'Forbidden: Admin access required' },
      { status: 403 }
    );
  }

  // Fetch all stations
  let allStations = [];
  let page = 0;
  while (true) {
    const batch = await base44.asServiceRole.entities.Station.list(
      '-created_date',
      500,
      page * 500
    );
    if (!batch || batch.length === 0) break;
    allStations = allStations.concat(batch);
    if (batch.length < 500) break;
    page++;
  }
  const stationMap = {};
  for (const s of allStations) stationMap[s.id] = s;

  // Fetch only pending chain_unconfirmed reviews
  let pendingReviews = [];
  page = 0;
  while (true) {
    const batch = await base44.asServiceRole.entities.StationReview.filter(
      { review_type: 'chain_unconfirmed', status: 'pending' },
      '-created_date',
      500,
      page * 500
    );
    if (!batch || batch.length === 0) break;
    pendingReviews = pendingReviews.concat(batch);
    if (batch.length < 500) break;
    page++;
  }

  if (pendingReviews.length === 0) {
    return Response.json({
      success: true,
      message: 'No pending chain_unconfirmed reviews',
      candidate: null,
    });
  }

  const candidates = [];

  for (const review of pendingReviews) {
    const station = stationMap[review.stationId];
    if (!station) continue;

    const classification = classifyAndPrioritize(station);

    candidates.push({
      reviewId: review.id,
      stationId: station.id,
      stationName: station.name,
      city: station.city || null,
      operator: station.operator || null,
      stationType: station.stationType || null,
      chain: station.chain || null,
      latitude: station.latitude || null,
      longitude: station.longitude || null,
      semanticSignals: classification.semanticSignals,
      semanticCategory: classification.semanticCategory,
      priorityLevel: classification.priorityLevel,
      priorityReason: classification.priorityReason,
      recommendedManualAction: classification.recommendedManualAction,
      semanticConfidence: classification.semanticConfidence,
    });
  }

  // Sort: HIGH → MEDIUM → LOW, then confidence desc, then name asc
  candidates.sort((a, b) => {
    const priorityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
    if (priorityOrder[a.priorityLevel] !== priorityOrder[b.priorityLevel]) {
      return priorityOrder[a.priorityLevel] - priorityOrder[b.priorityLevel];
    }
    if (a.semanticConfidence !== b.semanticConfidence) {
      return b.semanticConfidence - a.semanticConfidence;
    }
    return a.stationName.localeCompare(b.stationName);
  });

  // Return first candidate
  const nextCandidate = candidates[0];

  return Response.json({
    success: true,
    candidate: nextCandidate,
    totalPending: pendingReviews.length,
  });
});