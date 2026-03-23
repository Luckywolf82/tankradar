import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// ─── CLASSIFICATION RULES (mirrors classifyStationsRuleEngine, kept independent) ───

const FOREIGN_PATTERNS = [
  /\bpreem\b/i, /\bokq8\b/i, /\benonteki/i, /\bk-market\b/i, /\bk market\b/i,
  /\bq8\b/i, /\bteboil\b/i, /\bmacken\b/i, /\btännäs\b/i, /\bsälen\b/i,
  /\båre\b/i, /\bljungdalen\b/i, /\bklimpfjäll\b/i, /\bjokkmokk\b/i,
  /\bkilpisjärvi\b/i, /\brajamarket\b/i, /\bsuomen\b/i, /\bfinnland\b/i,
  /\bsverige\b/i,
];

const SECURE_CHAINS = [
  { chain: 'Circle K',   patterns: ['circle k', 'circlek'] },
  { chain: 'Uno-X',      patterns: ['uno-x', 'unox', 'uno x'] },
  { chain: 'Esso',       patterns: ['esso'] },
  { chain: 'St1',        patterns: ['st1', 'st 1'] },
  { chain: 'YX',         patterns: [/^yx\b/i, /\byx \b/i] },
  { chain: 'Best',       patterns: [/^best\b/i] },
  { chain: 'Shell',      patterns: ['shell'] },
  { chain: 'Equinor',    patterns: ['equinor'] },
  { chain: 'Statoil',    patterns: ['statoil'] },
  { chain: 'Automat1',   patterns: ['automat1', 'automat 1'] },
  { chain: 'MH24',       patterns: ['mh24'] },
  { chain: 'Max Bensin', patterns: ['max bensin'] },
  { chain: 'Prio',       patterns: [/^prio\b/i] },
  { chain: 'Texaco',     patterns: ['texaco'] },
  { chain: 'BP',         patterns: [/^bp\b/i] },
];

const LOCAL_CHAINS = [
  { chain: 'Driv',              patterns: [/^driv\b/i] },
  { chain: 'Jæren Olje',        patterns: ['jæren olje', 'jæren oil', 'jaeren olje'] },
  { chain: 'Agder Olje',        patterns: ['agder olje', 'agder oil'] },
  { chain: 'Trønder Oil',       patterns: ['trønder oil', 'tronder oil'] },
  { chain: 'Haugaland Olje',    patterns: ['haugaland olje'] },
  { chain: 'Gasum',             patterns: [/^gasum\b/i] },
  { chain: 'SEO',               patterns: [/^seo\b/i] },
  { chain: 'Minol',             patterns: ['minol'] },
];

const SPECIAL_TYPES = [
  { stationType: 'lpg',          patterns: [/\blpg\b/i, /\bauto-gass\b/i, /\bautogass\b/i] },
  { stationType: 'cng',          patterns: [/\bcng\b/i, 'hynion', 'hydrogen'] },
  { stationType: 'truck_diesel', patterns: ['truck diesel', 'truckdiesel', 'truck-diesel'] },
  { stationType: 'biogas',       patterns: ['biogass', 'biogas'] },
];

const NON_FUEL_PATTERNS = [
  /\bcamping\b/i, /\bkaf[eé]\b/i, /\brestaurant\b/i, /\bmiljøpark\b/i,
  /\bavfall\b/i, /\brenovasjon\b/i, /\bgjenvinning\b/i,
];

const STRONG_FUEL_COMPOUNDS = [
  /\bbensin(pumpe|stasjon|salg)?\b/i, /\bdrivstoff(salg|stasjon)?\b/i,
  /\bfuel\b/i, /\bpetrol\b/i, /\bbensinautomat\b/i,
];

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

const matchesAny = (name, patterns) => {
  const nOrig = norm(name);
  const n = normMatch(name);
  return patterns.some(p => {
    if (typeof p === 'string') return nOrig.includes(p.toLowerCase()) || n.includes(normMatch(p));
    if (p instanceof RegExp) return p.test(nOrig) || p.test(n);
    return false;
  });
};

const hasStrongFuelCompound = (name) => {
  const n = norm(name);
  return STRONG_FUEL_COMPOUNDS.some(p => p.test(n));
};

// Returns: { classification, chain, stationType }
const classifyCandidate = (name) => {
  const n = norm(name);
  const nm = normMatch(name);

  if (FOREIGN_PATTERNS.some(p => p.test(n) || p.test(nm)))
    return { classification: 'possible_foreign', chain: null, stationType: 'unknown' };

  for (const { chain, patterns } of SECURE_CHAINS)
    if (matchesAny(name, patterns))
      return { classification: 'secure_chain', chain, stationType: 'standard' };

  for (const { stationType, patterns } of SPECIAL_TYPES)
    if (matchesAny(name, patterns))
      return { classification: 'specialty_fuel_site', chain: null, stationType };

  if (!hasStrongFuelCompound(name) && NON_FUEL_PATTERNS.some(p => p.test(n)))
    return { classification: 'non_fuel_poi', chain: null, stationType: null };

  for (const { chain, patterns } of LOCAL_CHAINS)
    if (matchesAny(name, patterns))
      return { classification: 'local_chain', chain, stationType: 'standard' };

  return { classification: 'unclassified', chain: null, stationType: null };
};

// ─── HANDLER ──────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const isScheduled = req.headers.get('x-automation-source') === 'scheduled';

    if (!isScheduled) {
      const user = await base44.auth.me();
      if (user?.role !== 'admin')
        return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Fetch all pending candidates
    const pending = await base44.asServiceRole.entities.StationCandidate.filter({ status: 'pending' });

    if (!pending || pending.length === 0) {
      return Response.json({ success: true, message: 'No pending candidates', processed: 0 });
    }

    const results = {
      auto_confirmed: [],
      sent_to_review: [],
      rejected: [],
      errors: [],
    };

    const BATCH = 20;
    const candidateUpdates = [];
    const stationCreations = [];

    for (const candidate of pending) {
      const result = classifyCandidate(candidate.proposedName);

      if (result.classification === 'secure_chain' || result.classification === 'local_chain') {
        // Auto-confirm: high confidence, known chain
        candidateUpdates.push({
          id: candidate.id,
          update: {
            // DISABLED: status kept as "pending" while Station.create() is disabled.
            // Prevents misleading hidden state where candidate appears processed but no Station exists.
            // Change back to "auto_confirmed" when Station.create() is re-enabled and dedup guard validated.
            status: 'pending',
            classification: result.classification,
            proposedChain: result.chain || candidate.proposedChain || null,
            notes: `${candidate.notes || ''}\n[classified] Regelmotor: ${result.classification}, chain="${result.chain}" — venter på Station.create() (deaktivert)`.trim(),
          }
        });
        stationCreations.push({
          name: candidate.proposedName,
          chain: result.chain || candidate.proposedChain || null,
          stationType: result.stationType || 'standard',
          latitude: candidate.latitude,
          longitude: candidate.longitude,
          address: candidate.address || null,
          city: candidate.region || null,
          region: candidate.region || null,
          sourceName: candidate.sourceName === 'GooglePlaces' ? 'GooglePlaces' : 'user_reported',
          sourceStationId: candidate.sourceStationId || null,
          normalizedName: candidate.proposedName.toLowerCase().trim(),
        });
        results.auto_confirmed.push({ id: candidate.id, name: candidate.proposedName, chain: result.chain });

      } else if (result.classification === 'possible_foreign' || result.classification === 'non_fuel_poi') {
        // Auto-reject: not a Norwegian fuel station
        candidateUpdates.push({
          id: candidate.id,
          update: {
            status: 'rejected',
            classification: result.classification,
            notes: `${candidate.notes || ''}\n[auto_rejected] Regelmotor: ${result.classification}`.trim(),
          }
        });
        results.rejected.push({ id: candidate.id, name: candidate.proposedName, reason: result.classification });

      } else {
        // Ambiguous (unclassified, specialty_fuel_site) — stay pending, store classification for admin review
        candidateUpdates.push({
          id: candidate.id,
          update: {
            classification: result.classification,
            notes: `${candidate.notes || ''}\n[evaluated] Regelmotor: ${result.classification} — venter på admin review`.trim(),
          }
        });
        results.sent_to_review.push({ id: candidate.id, name: candidate.proposedName, classification: result.classification });
      }
    }

    // Apply candidate updates in batches
    for (let i = 0; i < candidateUpdates.length; i += BATCH) {
      await Promise.all(
        candidateUpdates.slice(i, i + BATCH).map(({ id, update }) =>
          base44.asServiceRole.entities.StationCandidate.update(id, update).catch(e => {
            results.errors.push({ id, error: e.message });
          })
        )
      );
      if (i + BATCH < candidateUpdates.length) await new Promise(r => setTimeout(r, 60));
    }

    // ─── DEDUP GUARD (runs before any future Station.create call) ────────────
    // For each auto_confirmed candidate, check:
    //   1. sourceStationId match against existing Station records
    //   2. coordinate proximity (< 100m) + normalized name similarity (> 0.85)
    // Only candidates that pass both checks would be safe to create.
    // Station.create() is currently DISABLED — this guard is here for when it is re-enabled.

    const haversineM = (lat1, lon1, lat2, lon2) => {
      const R = 6371000;
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLon/2)**2;
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    };

    const nameSimilarity = (a, b) => {
      const na = a.toLowerCase().trim();
      const nb = b.toLowerCase().trim();
      if (na === nb) return 1;
      const longer = na.length > nb.length ? na : nb;
      const shorter = na.length > nb.length ? nb : na;
      if (longer.length === 0) return 1;
      let matches = 0;
      for (let ci = 0; ci < shorter.length; ci++) if (longer.includes(shorter[ci])) matches++;
      return matches / longer.length;
    };

    // Fetch existing stations once for dedup check
    const existingStations = await base44.asServiceRole.entities.Station.list();

    const dedupResults = { would_create: 0, dedup_blocked: 0 };

    for (const stationData of stationCreations) {
      // Check 1: sourceStationId collision
      if (stationData.sourceStationId) {
        const idMatch = existingStations.find(s => s.sourceStationId === stationData.sourceStationId);
        if (idMatch) {
          dedupResults.dedup_blocked++;
          results.errors.push({ name: stationData.name, error: `DEDUP_BLOCKED: sourceStationId=${stationData.sourceStationId} already exists as Station ${idMatch.id}` });
          continue;
        }
      }
      // Check 2: proximity + name similarity
      const geoMatch = existingStations.find(s => {
        if (!s.latitude || !s.longitude || !stationData.latitude || !stationData.longitude) return false;
        const dist = haversineM(stationData.latitude, stationData.longitude, s.latitude, s.longitude);
        const sim = nameSimilarity(stationData.name, s.name || '');
        return dist < 100 && sim > 0.85;
      });
      if (geoMatch) {
        dedupResults.dedup_blocked++;
        results.errors.push({ name: stationData.name, error: `DEDUP_BLOCKED: geo+name match with existing Station ${geoMatch.id} ("${geoMatch.name}")` });
        continue;
      }
      dedupResults.would_create++;
      // DISABLED: Station.create() is disabled until dedup guard has been validated in production.
      // To re-enable, remove this comment block and uncomment the line below:
      // await base44.asServiceRole.entities.Station.create(stationData);
    }

    // ─── PERSIST RUN SUMMARY TO FetchLog ─────────────────────────────────────
    const finishedAt = new Date().toISOString();
    await base44.asServiceRole.entities.FetchLog.create({
      sourceName: 'processStationCandidates',
      startedAt: new Date().toISOString(),
      finishedAt,
      success: results.errors.length === 0,
      stationsFound: pending.length,
      recordsCreated: 0, // Station.create() disabled
      recordsSkipped: results.rejected.length + dedupResults.dedup_blocked,
      notes: JSON.stringify({
        auto_confirmed: results.auto_confirmed.length,
        sent_to_review: results.sent_to_review.length,
        auto_rejected: results.rejected.length,
        dedup_blocked: dedupResults.dedup_blocked,
        would_have_created: dedupResults.would_create,
        station_create_disabled: true,
        errors: results.errors.length,
      }),
    }).catch(e => console.error('[processStationCandidates] FetchLog write failed:', e.message));

    console.log(`[processStationCandidates] SUMMARY: processed=${pending.length} auto_confirmed=${results.auto_confirmed.length} review=${results.sent_to_review.length} rejected=${results.rejected.length} dedup_blocked=${dedupResults.dedup_blocked} errors=${results.errors.length}`);

    return Response.json({
      success: true,
      station_create_disabled: true,
      summary: {
        total_processed: pending.length,
        auto_confirmed: results.auto_confirmed.length,
        sent_to_review: results.sent_to_review.length,
        auto_rejected: results.rejected.length,
        dedup_blocked: dedupResults.dedup_blocked,
        would_have_created: dedupResults.would_create,
        errors: results.errors.length,
      },
      details: {
        auto_confirmed: results.auto_confirmed,
        sent_to_review: results.sent_to_review,
        rejected: results.rejected,
        errors: results.errors,
      }
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});