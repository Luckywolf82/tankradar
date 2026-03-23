import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

const SPEC_VERSION = "v1.3.2";

const VIOLATION_CODES = {
  MISSING_STATION_MATCH_STATUS: "missing_station_match_status",
  MISSING_CONFIDENCE_SCORE: "missing_confidence_score",
  MISSING_PLAUSIBILITY_STATUS: "missing_plausibility_status",
  MISSING_FUEL_TYPE: "missing_fuel_type",
  MISSING_PRICE_NOK: "missing_price_nok",
  MISSING_SOURCE_NAME: "missing_source_name",
  MISSING_PARSER_VERSION: "missing_parser_version",
  MISSING_FETCHED_AT: "missing_fetched_at",
  MISSING_SOURCE_FREQUENCY: "missing_source_frequency",
  MATCHED_WITHOUT_STATION_ID: "matched_without_station_id",
  MATCHED_WITHOUT_CONFIDENCE_REASON: "matched_without_confidence_reason",
  MATCHED_WITH_UNEXPECTED_CANDIDATES: "matched_with_unexpected_candidates",
  STATIONID_SET_WITHOUT_DECLARED_OUTCOME: "stationid_set_without_declared_outcome",
  REVIEW_NEEDED_WITH_STATION_ID: "review_needed_with_station_id",
  REVIEW_NEEDED_WITHOUT_CANDIDATES: "review_needed_without_candidates",
  REVIEW_NEEDED_WITHOUT_NOTES: "review_needed_without_notes",
  REVIEW_NEEDED_WITHOUT_CONFIDENCE_REASON: "review_needed_without_confidence_reason",
  NO_SAFE_MATCH_WITH_STATION_ID: "no_safe_match_with_station_id",
  NO_SAFE_MATCH_WITHOUT_NOTES: "no_safe_match_without_notes",
  NO_SAFE_MATCH_WITHOUT_NAME_OR_LABEL: "no_safe_match_without_name_or_label",
  NO_SAFE_MATCH_WITHOUT_CONFIDENCE_REASON: "no_safe_match_without_confidence_reason",
};

function classifyRecord(record) {
  const violations = [];
  const missingFields = [];

  // --- GLOBAL REQUIRED FIELDS ---
  if (!record.fuelType) { violations.push(VIOLATION_CODES.MISSING_FUEL_TYPE); missingFields.push("fuelType"); }
  if (record.priceNok == null) { violations.push(VIOLATION_CODES.MISSING_PRICE_NOK); missingFields.push("priceNok"); }
  if (!record.sourceName) { violations.push(VIOLATION_CODES.MISSING_SOURCE_NAME); missingFields.push("sourceName"); }
  if (!record.parserVersion) { violations.push(VIOLATION_CODES.MISSING_PARSER_VERSION); missingFields.push("parserVersion"); }
  if (!record.fetchedAt) { violations.push(VIOLATION_CODES.MISSING_FETCHED_AT); missingFields.push("fetchedAt"); }
  if (!record.sourceFrequency) { violations.push(VIOLATION_CODES.MISSING_SOURCE_FREQUENCY); missingFields.push("sourceFrequency"); }
  if (record.confidenceScore == null) { violations.push(VIOLATION_CODES.MISSING_CONFIDENCE_SCORE); missingFields.push("confidenceScore"); }
  if (!record.plausibilityStatus) { violations.push(VIOLATION_CODES.MISSING_PLAUSIBILITY_STATUS); missingFields.push("plausibilityStatus"); }

  // station_match_status null = write-gate violation (hard)
  if (!record.station_match_status) {
    violations.push(VIOLATION_CODES.MISSING_STATION_MATCH_STATUS);
    missingFields.push("station_match_status");

    // Detect bypass pattern: stationId set but no declared outcome
    if (record.stationId) {
      violations.push(VIOLATION_CODES.STATIONID_SET_WITHOUT_DECLARED_OUTCOME);
    }
  } else {
    // --- OUTCOME-SPECIFIC RULES ---
    if (record.station_match_status === "matched_station_id") {
      if (!record.stationId) { violations.push(VIOLATION_CODES.MATCHED_WITHOUT_STATION_ID); missingFields.push("stationId"); }
      if (!record.confidenceReason) { violations.push(VIOLATION_CODES.MATCHED_WITHOUT_CONFIDENCE_REASON); missingFields.push("confidenceReason"); }
      if (record.station_match_candidates && record.station_match_candidates.length > 0) {
        violations.push(VIOLATION_CODES.MATCHED_WITH_UNEXPECTED_CANDIDATES);
      }
    } else if (record.station_match_status === "review_needed_station_match") {
      if (record.stationId) { violations.push(VIOLATION_CODES.REVIEW_NEEDED_WITH_STATION_ID); }
      if (!record.station_match_candidates || record.station_match_candidates.length === 0) {
        violations.push(VIOLATION_CODES.REVIEW_NEEDED_WITHOUT_CANDIDATES); missingFields.push("station_match_candidates");
      }
      if (!record.station_match_notes) { violations.push(VIOLATION_CODES.REVIEW_NEEDED_WITHOUT_NOTES); missingFields.push("station_match_notes"); }
      if (!record.confidenceReason) { violations.push(VIOLATION_CODES.REVIEW_NEEDED_WITHOUT_CONFIDENCE_REASON); missingFields.push("confidenceReason"); }
    } else if (record.station_match_status === "no_safe_station_match") {
      if (record.stationId) { violations.push(VIOLATION_CODES.NO_SAFE_MATCH_WITH_STATION_ID); }
      if (!record.station_match_notes) { violations.push(VIOLATION_CODES.NO_SAFE_MATCH_WITHOUT_NOTES); missingFields.push("station_match_notes"); }
      if (!record.station_name && !record.locationLabel) {
        violations.push(VIOLATION_CODES.NO_SAFE_MATCH_WITHOUT_NAME_OR_LABEL); missingFields.push("station_name|locationLabel");
      }
      if (!record.confidenceReason) { violations.push(VIOLATION_CODES.NO_SAFE_MATCH_WITHOUT_CONFIDENCE_REASON); missingFields.push("confidenceReason"); }
    }
  }

  // --- TOP-LEVEL STATE CLASSIFICATION ---
  let state;
  const hasWriteGateViolation =
    violations.includes(VIOLATION_CODES.MISSING_STATION_MATCH_STATUS) ||
    violations.includes(VIOLATION_CODES.STATIONID_SET_WITHOUT_DECLARED_OUTCOME) ||
    violations.includes(VIOLATION_CODES.MATCHED_WITHOUT_STATION_ID) ||
    violations.includes(VIOLATION_CODES.REVIEW_NEEDED_WITH_STATION_ID) ||
    violations.includes(VIOLATION_CODES.NO_SAFE_MATCH_WITH_STATION_ID) ||
    violations.includes(VIOLATION_CODES.MISSING_CONFIDENCE_SCORE) ||
    violations.includes(VIOLATION_CODES.MISSING_PLAUSIBILITY_STATUS);

  if (violations.length === 0) {
    state = "VALID_CONTRACT_COMPLETE";
  } else if (hasWriteGateViolation) {
    state = "INVALID_WRITE_GATE_VIOLATION";
  } else if (violations.length > 0) {
    // Outcome-conditional violations that aren't strictly bypass evidence
    const outcomeOnlyViolations = [
      VIOLATION_CODES.MATCHED_WITHOUT_CONFIDENCE_REASON,
      VIOLATION_CODES.REVIEW_NEEDED_WITHOUT_CANDIDATES,
      VIOLATION_CODES.REVIEW_NEEDED_WITHOUT_NOTES,
      VIOLATION_CODES.REVIEW_NEEDED_WITHOUT_CONFIDENCE_REASON,
      VIOLATION_CODES.NO_SAFE_MATCH_WITHOUT_NOTES,
      VIOLATION_CODES.NO_SAFE_MATCH_WITHOUT_NAME_OR_LABEL,
      VIOLATION_CODES.NO_SAFE_MATCH_WITHOUT_CONFIDENCE_REASON,
      VIOLATION_CODES.MISSING_SOURCE_FREQUENCY,
      VIOLATION_CODES.MISSING_PARSER_VERSION,
    ];
    const allOutcomeOnly = violations.every(v => outcomeOnlyViolations.includes(v));
    state = allOutcomeOnly ? "PARTIAL_CONTRACT_STATE" : "INVALID_WRITE_GATE_VIOLATION";
  } else {
    state = "VALID_CONTRACT_COMPLETE";
  }

  return { state, violations, missingFields };
}

function detectBypassPattern(sourceRecords, sourceName) {
  const total = sourceRecords.length;
  if (total === 0) return { probableBypass: false, probableBypassReason: null };

  const missingStatus = sourceRecords.filter(r => !r.station_match_status).length;
  const missingConfidenceReason = sourceRecords.filter(r => !r.confidenceReason).length;
  const hasStationIdNoStatus = sourceRecords.filter(r => r.stationId && !r.station_match_status).length;

  const missingStatusRate = missingStatus / total;
  const missingReasonRate = missingConfidenceReason / total;

  if (missingStatusRate >= 0.9) {
    return {
      probableBypass: true,
      probableBypassReason: `${Math.round(missingStatusRate * 100)}% of records from ${sourceName} have null station_match_status — systematic write-gate bypass pattern detected`,
    };
  }
  if (hasStationIdNoStatus > 0 && missingStatusRate > 0.5) {
    return {
      probableBypass: true,
      probableBypassReason: `${hasStationIdNoStatus} records have stationId set but no station_match_status — indicates direct write to FuelPrice bypassing SRP outcome declaration`,
    };
  }
  if (missingReasonRate >= 0.95 && missingStatusRate >= 0.5) {
    return {
      probableBypass: true,
      probableBypassReason: `${Math.round(missingReasonRate * 100)}% missing confidenceReason combined with ${Math.round(missingStatusRate * 100)}% missing station_match_status — adapter appears to bypass canonical field population entirely`,
    };
  }
  return { probableBypass: false, probableBypassReason: null };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const startedAt = new Date().toISOString();

    // Fetch all FuelPrice records (read-only)
    const allRecords = await base44.asServiceRole.entities.FuelPrice.list('-fetchedAt', 2000);

    // --- Classify every record ---
    const classified = allRecords.map(record => ({
      id: record.id,
      sourceName: record.sourceName || "unknown",
      parserVersion: record.parserVersion || "unknown",
      priceType: record.priceType || "unknown",
      stationId: record.stationId || null,
      station_match_status: record.station_match_status || null,
      ...classifyRecord(record),
    }));

    // --- Global summary ---
    const totalRecords = classified.length;
    const validCount = classified.filter(r => r.state === "VALID_CONTRACT_COMPLETE").length;
    const invalidCount = classified.filter(r => r.state === "INVALID_WRITE_GATE_VIOLATION").length;
    const partialCount = classified.filter(r => r.state === "PARTIAL_CONTRACT_STATE").length;
    const sourceVarianceCount = classified.filter(r => r.state === "SOURCE_SPECIFIC_VARIANCE").length;

    // --- By source ---
    const sourceNames = [...new Set(classified.map(r => r.sourceName))];
    const bySource = {};

    for (const sourceName of sourceNames) {
      const sourceRecords = classified.filter(r => r.sourceName === sourceName);
      const rawForSource = allRecords.filter(r => (r.sourceName || "unknown") === sourceName);
      const { probableBypass, probableBypassReason } = detectBypassPattern(rawForSource, sourceName);

      const violations = sourceRecords.flatMap(r => r.violations);
      const violationFreq = {};
      for (const v of violations) { violationFreq[v] = (violationFreq[v] || 0) + 1; }
      const topViolationReasons = Object.entries(violationFreq)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([code, count]) => ({ code, count }));

      const invalidRecords = sourceRecords.filter(r => r.state === "INVALID_WRITE_GATE_VIOLATION");
      const sampleInvalidRecordIds = invalidRecords.slice(0, 5).map(r => r.id);

      bySource[sourceName] = {
        total: sourceRecords.length,
        valid: sourceRecords.filter(r => r.state === "VALID_CONTRACT_COMPLETE").length,
        invalid_write_gate_violations: invalidRecords.length,
        partial: sourceRecords.filter(r => r.state === "PARTIAL_CONTRACT_STATE").length,
        percentageInvalid: sourceRecords.length > 0
          ? Math.round((invalidRecords.length / sourceRecords.length) * 100)
          : 0,
        parserVersions: [...new Set(sourceRecords.map(r => r.parserVersion))],
        topViolationReasons,
        sampleInvalidRecordIds,
        probableBypass,
        probableBypassReason,
      };
    }

    // --- By parser version ---
    const parserVersions = [...new Set(classified.map(r => r.parserVersion))];
    const byParserVersion = {};
    for (const pv of parserVersions) {
      const pvRecords = classified.filter(r => r.parserVersion === pv);
      const pvInvalid = pvRecords.filter(r => r.state === "INVALID_WRITE_GATE_VIOLATION").length;
      byParserVersion[pv] = {
        total: pvRecords.length,
        valid: pvRecords.filter(r => r.state === "VALID_CONTRACT_COMPLETE").length,
        invalid_write_gate_violations: pvInvalid,
        partial: pvRecords.filter(r => r.state === "PARTIAL_CONTRACT_STATE").length,
        percentageInvalid: pvRecords.length > 0 ? Math.round((pvInvalid / pvRecords.length) * 100) : 0,
        sources: [...new Set(pvRecords.map(r => r.sourceName))],
      };
    }

    // --- Violation catalog (aggregated across all) ---
    const allViolations = classified.flatMap(r => r.violations);
    const violationCatalog = {};
    for (const v of allViolations) { violationCatalog[v] = (violationCatalog[v] || 0) + 1; }

    // --- Evidence samples (top 10 invalid records) ---
    const evidenceSamples = classified
      .filter(r => r.state === "INVALID_WRITE_GATE_VIOLATION")
      .slice(0, 10)
      .map(r => ({
        id: r.id,
        sourceName: r.sourceName,
        parserVersion: r.parserVersion,
        stationId: r.stationId,
        station_match_status: r.station_match_status,
        missingFields: r.missingFields,
        violationCodes: r.violations,
      }));

    return Response.json({
      auditMeta: {
        timestamp: startedAt,
        recordsScanned: totalRecords,
        contractVersionReference: SPEC_VERSION,
        note: "Read-only audit — no records created, updated, or deleted",
      },
      globalSummary: {
        totalRecords,
        validCount,
        invalidCount,
        partialCount,
        sourceVarianceCount,
        percentageValid: totalRecords > 0 ? Math.round((validCount / totalRecords) * 100) : 0,
        percentageInvalid: totalRecords > 0 ? Math.round((invalidCount / totalRecords) * 100) : 0,
      },
      bySource,
      byParserVersion,
      violationCatalog,
      evidenceSamples,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});