import React from "react";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

const REPORT_DATE = "2026-03-19";
const SPEC_VERSION = "v1.3.2";

function Section({ title, children, highlight }) {
  return (
    <div className={`mb-8 ${highlight ? "border-l-4 border-red-500 pl-4" : ""}`}>
      <h2 className="text-lg font-bold text-slate-800 border-b border-slate-200 pb-2 mb-4">{title}</h2>
      {children}
    </div>
  );
}

function SubSection({ title, children }) {
  return (
    <div className="mb-5">
      <h3 className="text-base font-semibold text-slate-700 mb-2">{title}</h3>
      {children}
    </div>
  );
}

function Table({ headers, rows }) {
  return (
    <div className="overflow-x-auto mb-4">
      <table className="w-full text-xs border-collapse border border-slate-300">
        <thead>
          <tr className="bg-slate-100">
            {headers.map((h, i) => (
              <th key={i} className="border border-slate-300 px-2 py-1.5 text-left font-semibold text-slate-700">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
              {row.map((cell, j) => (
                <td key={j} className="border border-slate-300 px-2 py-1.5 text-slate-700 align-top">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Code({ children }) {
  return (
    <pre className="bg-slate-900 text-slate-100 rounded p-3 text-xs overflow-x-auto mb-3 whitespace-pre-wrap leading-relaxed">
      {children}
    </pre>
  );
}

function P({ children }) {
  return <p className="text-sm text-slate-700 mb-2 leading-relaxed">{children}</p>;
}

function Ul({ items }) {
  return (
    <ul className="list-disc list-inside mb-3 space-y-1">
      {items.map((item, i) => <li key={i} className="text-sm text-slate-700">{item}</li>)}
    </ul>
  );
}

function Constraint({ children }) {
  return (
    <div className="bg-red-50 border border-red-300 rounded px-4 py-3 mb-3">
      <p className="text-sm font-semibold text-red-800">{children}</p>
    </div>
  );
}

function Rule({ label, children }) {
  return (
    <div className="bg-slate-900 text-white rounded px-4 py-3 mb-3">
      {label && <p className="text-xs font-bold text-green-400 mb-1">{label}</p>}
      <p className="text-sm leading-relaxed">{children}</p>
    </div>
  );
}

function Warn({ children }) {
  return (
    <div className="bg-amber-50 border border-amber-300 rounded px-4 py-3 mb-3">
      <p className="text-sm font-semibold text-amber-800">{children}</p>
    </div>
  );
}

export default function CanonicalContractAuditReport() {
  const handlePrint = () => {
    const newWin = window.open(window.location.href, '_blank');
    if (newWin) {
      newWin.addEventListener('load', () => newWin.print());
    } else {
      window.print();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="print:hidden sticky top-0 z-10 bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shadow-sm">
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold">TankRadar Governance · {SPEC_VERSION}</p>
          <p className="text-sm font-bold text-slate-800">Canonical FuelPrice Contract — Spec + Enforcement Definition</p>
        </div>
        <Button onClick={handlePrint} className="gap-2 bg-slate-800 hover:bg-slate-700">
          <Printer size={15} />
          Lagre / Skriv ut PDF
        </Button>
      </div>

      <div className="max-w-4xl mx-auto px-8 py-10 bg-white min-h-screen print:px-4 print:py-6 print:shadow-none" id="report-body">

        {/* Cover */}
        <div className="mb-10 border-b border-slate-300 pb-6">
          <p className="text-xs text-slate-400 uppercase tracking-widest mb-1">TankRadar · Governance Document · {SPEC_VERSION}</p>
          <h1 className="text-2xl font-bold text-slate-900 mb-1">Canonical FuelPrice Contract Pipeline</h1>
          <h2 className="text-lg font-normal text-slate-600 mb-3">Enforceable System Specification + Architecture Audit</h2>
          <div className="flex flex-wrap gap-6 text-xs text-slate-500 mb-4">
            <span>Dato: {REPORT_DATE}</span>
            <span>Status: Read-only · No code or data modified</span>
            <span>Fase: Pre-implementation specification</span>
          </div>
          <div className="bg-slate-100 rounded px-4 py-3 text-xs text-slate-700 leading-relaxed">
            <strong>Scope:</strong> This document defines the canonical FuelPrice data contract, the Station Resolution Pipeline (SRP) architecture, hard enforcement constraints, and the governance rules that govern all current and future source adapters. It is a system specification — not an execution plan. No implementation steps, migrations, or code changes are described herein.
          </div>
        </div>

        {/* A */}
        <Section title="A. Files / Functions / Governance Docs Inspected">
          <Table
            headers={["Artifact", "Type", "Role in this audit"]}
            rows={[
              ["pages/LogPrice", "Frontend", "user_reported entry point — field assembly"],
              ["functions/matchStationForUserReportedPrice", "Backend", "Phase 2 matching engine — de facto shared core"],
              ["functions/createStationCandidateFromUserReportedPrice", "Backend", "Post-no-match candidate routing"],
              ["functions/runGooglePlacesFetchAutomation", "Backend", "Active GP adapter + inline matching (scheduled 4×/day)"],
              ["functions/fetchGooglePlacesPrices", "Backend", "Duplicate GP write path"],
              ["functions/fetchGooglePlacesRealMatching", "Backend", "Third GP write path"],
              ["functions/classifyGooglePlacesConfidence (frozen)", "Backend", "Diagnostic-only — no pipeline role"],
              ["FuelPrice entity schema", "Entity", "Canonical field contract source of truth"],
              ["StationCandidate entity schema", "Entity", "Review artifact target"],
              ["StationReview entity schema", "Entity", "Governance review artifact"],
              ["components/governance/StationMatchingSpecification", "Governance", "Matching outcome definitions"],
              ["components/governance/Phase25ExecutionLog_007", "Governance", "Active execution state"],
              ["Automations registry (7 automations)", "Platform", "Post-create trigger inventory"],
              ["Prior session read-only audits (×2)", "Session", "Field population matrix, filter stage analysis"],
            ]}
          />
        </Section>

        {/* B */}
        <Section title="B. Best Concept Name for the Shared Core">
          <div className="bg-slate-900 text-white rounded px-5 py-3 mb-4 inline-block">
            <span className="text-lg font-bold">Station Resolution Pipeline (SRP)</span>
          </div>
          <P>Four candidates were evaluated:</P>
          <Table
            headers={["Candidate", "Assessment"]}
            rows={[
              ["Canonical FuelPrice Contract Pipeline", "Conflates the data contract (spec) with the execution pipeline (process) — two distinct things"],
              ["Canonical Station Matching Pipeline", "Accurate but narrow — implies scope is only matching, not full enrichment and routing that follows"],
              ["Station Resolution Pipeline ✅", "Precisely scopes the responsibility: takes an unresolved price observation from any source and produces a resolved, routed, contract-complete FuelPrice record. 'Resolution' covers matching + outcome classification + artifact routing + field canonicalization as a unified concept"],
              ["FuelPrice Canonicalization Pipeline", "Accurate but passive — sounds like a batch cleanup process rather than the live write path gate"],
            ]}
          />
          <P>The Station Resolution Pipeline (SRP) is the shared execution layer that must sit between every source adapter and every FuelPrice.create call. Its output is always a canonically complete FuelPrice record with a declared station resolution outcome.</P>
        </Section>

        {/* C */}
        <Section title="C. Source Adapter vs Shared Core Responsibility Split">
          <SubSection title="Source Adapters — responsibilities that MUST remain per-source">
            <Table
              headers={["Responsibility", "user_reported adapter", "GooglePlaces adapter"]}
              rows={[
                ["Raw payload parsing", "OCR / LLM image extraction", "Google Places API fuelOptions JSON"],
                ["Fuel type normalization", "User UI enum selection", "SP95/DIESEL string mapping"],
                ["Price value extraction", "User numeric input", "units + nanos/1e9 Money protobuf"],
                ["Source timestamp extraction", "Not applicable (observation = now)", "fuelPrice.updateTime → sourceUpdatedAt"],
                ["Source confidence inputs", "GPS signal, UI clarification metadata", "Google name confidence, distance from search center"],
                ["sourceName", '"user_reported"', '"GooglePlaces"'],
                ["parserVersion", '"user_reported_v1"', '"gp_v1"'],
                ["sourceFrequency", '"unknown"', '"near_realtime"'],
                ["priceType", '"user_reported"', '"station_level"'],
                ["reportedByUserId", "Set if user logged in", "Never applicable"],
                ["rawPayloadSnippet", "User context + clarification metadata", '"SP95 | 23.74 NOK/L"'],
                ["Deduplication logic", "Not applicable (each submission unique)", "Same stationId + fuelType + sourceUpdatedAt check"],
              ]}
            />
          </SubSection>

          <SubSection title="Station Resolution Pipeline (SRP) — responsibilities that MUST be shared">
            <Table
              headers={["Responsibility", "Current owner", "Should be owned by"]}
              rows={[
                ["Station candidate pool retrieval", "matchStationForUserReportedPrice only", "SRP"],
                ["Proximity pre-filter (3km radius)", "matchStationForUserReportedPrice only", "SRP"],
                ["Scoring: distance + chain + name + location signals", "matchStationForUserReportedPrice only", "SRP"],
                ["Dominance gap gate (≥10 for multi-candidate)", "matchStationForUserReportedPrice only", "SRP"],
                ["station_match_status outcome declaration", "matchStationForUserReportedPrice → LogPrice", "SRP"],
                ["stationId assignment on confirmed match", "LogPrice inline", "SRP"],
                ["station_match_candidates write on review_needed", "LogPrice inline", "SRP"],
                ["station_match_notes write on all outcomes", "LogPrice inline", "SRP"],
                ["confidenceReason write", "LogPrice inline", "SRP"],
                ["locationLabel population", "LogPrice inline (stationInfo.city)", "SRP"],
                ["StationCandidate creation on no_safe_match", "createStationCandidateFromUserReportedPrice", "SRP (routed post-resolution)"],
                ["StationReview routing on review_needed", "Not currently implemented for any source", "SRP"],
                ["plausibilityStatus classification", "Both adapters inline (duplicated 4×)", "SRP"],
                ["Canonical output validation before FuelPrice.create", "Not implemented", "SRP"],
              ]}
            />
          </SubSection>
        </Section>

        {/* NEW: Write Gate */}
        <Section title="D. FuelPrice Write Gate — Hard Constraint" highlight>
          <Constraint>
            FuelPrice.create MUST NOT be called by any source adapter directly. This is a hard architectural constraint — not a recommendation.
          </Constraint>
          <P>The write gate is the enforcement boundary between source-specific logic and the shared governance layer. It exists to ensure that no FuelPrice record ever enters the database without having passed through the Station Resolution Pipeline and received a declared, canonical resolution outcome.</P>

          <SubSection title="Write Gate Rules">
            <Table
              headers={["Rule", "Specification"]}
              rows={[
                ["Write path ownership", "SRP is the ONLY authorized path to FuelPrice.create"],
                ["Adapter write prohibition", "No source adapter may call FuelPrice.create directly, under any condition"],
                ["Bypass prohibition", "No source adapter may produce a FuelPrice record without a declared station_match_status"],
                ["Pre-SRP records", "Any FuelPrice record with a null station_match_status is an invalid record — it indicates a write-gate bypass"],
                ["Automation scope", "Automations that call source-specific fetch functions are subject to this constraint — they may not call FuelPrice.create from within the adapter function body"],
              ]}
            />
          </SubSection>

          <SubSection title="Violation Definition">
            <Constraint>
              Any function that calls FuelPrice.create without having passed through SRP = governance violation = invalid system state.
            </Constraint>
            <P>A governance violation is defined as any of the following:</P>
            <Ul items={[
              "A FuelPrice record persisted with station_match_status = null",
              "A source adapter function that contains FuelPrice.create in its own execution path",
              "A matching decision made inside a source adapter that produces a stationId without SRP classification",
              "A FuelPrice record with stationId set but confidenceReason absent",
              "A source adapter that silently drops unmatched observations without creating a StationCandidate",
            ]} />
            <P>Governance violations do not require immediate remediation but must be documented and tracked. The existence of a violation does not permit further violations to be added.</P>
          </SubSection>
        </Section>

        {/* NEW: SRP as Enforced Layer */}
        <Section title="E. Station Resolution Pipeline (SRP) — Enforced Execution Layer" highlight>
          <Rule label="Enforcement Status">
            SRP is a REQUIRED execution layer. It is not optional. It is not source-specific. It must be shared across ALL sources without exception.
          </Rule>

          <SubSection title="SRP Ownership Boundaries">
            <P>The SRP owns the following decisions exclusively. No source adapter may own, duplicate, or override these:</P>
            <Table
              headers={["Decision", "SRP ownership"]}
              rows={[
                ["Station identity resolution", "SRP determines the final station identity — not the adapter"],
                ["Match outcome classification", "SRP declares matched_station_id, review_needed_station_match, or no_safe_station_match"],
                ["Canonical field population", "SRP writes all match-derived fields: stationId, station_match_status, station_match_candidates, station_match_notes, confidenceScore, confidenceReason, locationLabel, plausibilityStatus"],
                ["Review routing", "SRP routes to StationCandidate and/or StationReview based on outcome — not the adapter"],
                ["Failure classification", "SRP determines no_safe_station_match — the adapter may not suppress unmatched observations"],
              ]}
            />
          </SubSection>

          <SubSection title="What SRP Must NOT Depend On">
            <Ul items={[
              "SRP must not assume correct chain identity from the adapter — chain input is a hint, not a fact",
              "SRP must not assume high-quality metadata — all input fields may be null, noisy, or partial",
              "SRP must not assume the adapter has pre-filtered candidates — SRP retrieves its own candidate pool",
              "SRP must not assume a match will be found — no_safe_station_match is always a valid output",
            ]} />
          </SubSection>
        </Section>

        {/* NEW: SRP Input Contract */}
        <Section title="F. SRP Input Contract">
          <P>This section defines what a source adapter MUST provide when invoking the SRP. The SRP will not function correctly without these fields. All other fields are optional enrichment inputs.</P>

          <SubSection title="Required Input Fields">
            <Table
              headers={["Field", "Requirement", "Notes"]}
              rows={[
                ["raw location", "REQUIRED", "Either gps_latitude + gps_longitude OR a structured locationLabel — at least one must be present for proximity matching to proceed"],
                ["sourceName", "REQUIRED", "Non-null string identifying the adapter — e.g. 'user_reported', 'GooglePlaces'"],
                ["fuelType", "REQUIRED", "Must be normalized to canonical enum before SRP entry — adapter's responsibility"],
                ["priceNok", "REQUIRED", "Numeric, non-null — must be extracted and converted by adapter before SRP entry"],
                ["rawPayloadSnippet", "REQUIRED", "Short debug trace from the source payload — enables post-hoc audit of any SRP decision"],
              ]}
            />
          </SubSection>

          <SubSection title="Optional Enrichment Fields">
            <Table
              headers={["Field", "Value when present"]}
              rows={[
                ["station_name", "Name string from source observation — used as matching signal; improves name-similarity scoring"],
                ["station_chain", "Chain string from source observation — used as chain matching signal; treated as hint, not fact"],
                ["sourceUpdatedAt", "ISO datetime from source — null is valid and expected when source does not provide update timestamps"],
                ["gps_latitude / gps_longitude", "Source GPS coordinates — used for proximity scoring; required for no_safe_match discovery records"],
              ]}
            />
          </SubSection>

          <SubSection title="SRP Robustness Requirements">
            <P>The SRP must be designed to operate correctly across the full range of input quality. Specifically:</P>
            <Ul items={[
              "SRP must handle null station_name without failure — proximity and chain signals are sufficient for matching",
              "SRP must handle null station_chain without failure — name and distance signals remain active",
              "SRP must handle absent GPS coordinates — matching may proceed on locationLabel-based candidate retrieval",
              "SRP must not reject input due to missing optional fields — it must degrade gracefully to no_safe_station_match",
              "SRP must not trust adapter-provided chain as ground truth — chain input increases scoring weight but does not bypass matching",
            ]} />
          </SubSection>
        </Section>

        {/* Canonical Contract Matrix */}
        <Section title="G. Canonical FuelPrice Contract Matrix">
          <P>Classification tiers: A = Required all sources · B = Required when matched · C = Required when review-needed · D = Required when no-safe-match · E = Optional / source-specific</P>
          <Table
            headers={["Field", "Tier", "Value constraint", "Notes"]}
            rows={[
              ["fuelType", "A", "Enum: gasoline_95, diesel, gasoline_98…", "Must be normalized before SRP entry"],
              ["priceNok", "A", "Number, non-null", "Must be extracted by adapter"],
              ["priceType", "A", "Enum: station_level, user_reported, national_average, regional_average", "Set by adapter before SRP"],
              ["sourceName", "A", "Non-null string", "Set by adapter"],
              ["parserVersion", "A", "Non-null string", "Set by adapter"],
              ["fetchedAt", "A", "ISO datetime, non-null", "Set at write time"],
              ["plausibilityStatus", "A", "Enum: realistic_price, suspect_price_low, suspect_price_high", "Set by SRP after price extraction — NEVER null"],
              ["confidenceScore", "A", "Float 0–1", "Set by SRP from matching signals; 0.0 if no match — NEVER null"],
              ["station_match_status", "A", "Enum: matched_station_id, review_needed_station_match, no_safe_station_match", "Must be set by SRP for ALL records — null is invalid state"],
              ["sourceFrequency", "A", "Enum value or 'unknown'", "Set by adapter; 'unknown' if not known"],
              ["sourceUpdatedAt", "A", "ISO datetime or null", "null is valid; must be explicitly set, not omitted"],
              ["locationLabel", "A", "City/area string or null", "SRP sets from matched Station.city or user-provided city"],
              ["stationId", "B", "Non-null Station.id", "Set by SRP on confirmed match only — MUST NOT be set otherwise"],
              ["confidenceReason", "B", "Human-readable string", "Must describe signal basis — set by SRP on all confirmed matches"],
              ["station_match_candidates", "C", "Array of Station.id strings — non-empty", "Set by SRP from top-scored ambiguous candidates — MUST be non-empty on review_needed"],
              ["station_match_notes", "C, D", "Descriptive string", "Required on review_needed and no_safe_match — set by SRP"],
              ["station_name", "D", "String from source observation", "Preserved for discovery — SRP writes from adapter's raw name input — MUST be present on no_safe_match"],
              ["station_chain", "D", "String from source observation", "Preserved for discovery — SRP writes from adapter's raw chain input"],
              ["gps_latitude", "D", "Float or null", "Source GPS — for unresolved discovery"],
              ["gps_longitude", "D", "Float or null", "Source GPS — for unresolved discovery"],
              ["rawPayloadSnippet", "E", "String, max ~200 chars", "Adapter-specific debug trace; recommended but not required"],
              ["sourceUrl", "E", "URL string or null", "Source link if available"],
              ["reportedByUserId", "E", "User ID string or null", "user_reported only; never applicable to automated sources"],
            ]}
          />

          <SubSection title="Non-Negotiable Output Constraints">
            <Constraint>
              Every FuelPrice record MUST include: station_match_status (never null), confidenceScore (never null), plausibilityStatus (never null). These three fields are the minimum governance envelope for any FuelPrice record.
            </Constraint>
            <Table
              headers={["Outcome", "Conditional constraint"]}
              rows={[
                ["matched_station_id", "stationId MUST be set. confidenceReason MUST describe the signal basis. station_match_candidates MUST NOT be set."],
                ["review_needed_station_match", "stationId MUST NOT be set. station_match_candidates MUST be non-empty. station_match_notes MUST be present."],
                ["no_safe_station_match", "stationId MUST NOT be set. station_name OR locationLabel MUST be present for discovery traceability. StationCandidate MUST be created."],
                ["Any record", "Null station_match_status is invalid system state. Any record with null station_match_status represents a write-gate bypass."],
              ]}
            />
          </SubSection>
        </Section>

        {/* Match Outcomes */}
        <Section title="H. Canonical Match Outcomes Matrix">

          <SubSection title="Outcome 1: matched_station_id">
            <Table
              headers={["Aspect", "Specification"]}
              rows={[
                ["Meaning", "SRP identified a single Station record with sufficient confidence and no dominant ambiguity"],
                ["station_match_status", '"matched_station_id" — must be written'],
                ["stationId", "Must be set to the matched Station.id"],
                ["confidenceScore", "Must be written — reflects signal strength"],
                ["confidenceReason", 'Must be written — e.g. "chain_match + distance_30m + name_similarity_0.92"'],
                ["locationLabel", "Should be set from matched Station.city"],
                ["station_match_candidates", "Not required"],
                ["station_match_notes", "Not required"],
                ["station_name / station_chain", "Not required"],
                ["gps_latitude / gps_longitude", "Not required"],
                ["StationCandidate artifact", "Must NOT be created — station already resolved"],
                ["FuelPrice.create", "Permitted"],
                ["UI / downstream may assume", "Price is linked to a known Station; safe for NearbyPrices; safe for alert evaluation"],
              ]}
            />
          </SubSection>

          <SubSection title="Outcome 2: review_needed_station_match">
            <Table
              headers={["Aspect", "Specification"]}
              rows={[
                ["Meaning", "Candidates found above minimum threshold but below auto-match threshold, or insufficient dominance gap"],
                ["station_match_status", '"review_needed_station_match" — must be written'],
                ["stationId", "Must NOT be set — match is unconfirmed"],
                ["confidenceScore", "Must be written — reflects top candidate signal"],
                ["confidenceReason", 'Must be written — e.g. "ambiguous_multi_candidate + gap_5"'],
                ["station_match_candidates", "Must be written — array of top candidate Station.ids — non-empty"],
                ["station_match_notes", "Must be written — human-readable ambiguity description"],
                ["locationLabel", "Should be set from user city input or search area"],
                ["station_name / station_chain", "Should be preserved from source observation"],
                ["gps_latitude / gps_longitude", "Should be preserved if available"],
                ["StationCandidate artifact", "May be created if the unresolved station is not yet in the catalog"],
                ["StationReview artifact", "Should be created to route for manual resolution"],
                ["FuelPrice.create", "Permitted — record written with unresolved stationId"],
                ["UI / downstream may assume", "Price should NOT be shown as station-linked without human review; may appear in aggregate/discovery views only"],
              ]}
            />
          </SubSection>

          <SubSection title="Outcome 3: no_safe_station_match">
            <Table
              headers={["Aspect", "Specification"]}
              rows={[
                ["Meaning", "No candidates above minimum scoring threshold, or no recognized chain, or zero nearby stations"],
                ["station_match_status", '"no_safe_station_match" — must be written'],
                ["stationId", "Must NOT be set"],
                ["confidenceScore", "Should be written as 0.0 or low value"],
                ["confidenceReason", 'Must be written — e.g. "no_candidates_above_threshold" or "unrecognized_chain"'],
                ["station_match_candidates", "Empty array or null"],
                ["station_match_notes", "Must be written — include raw name, chain, and coordinates for discovery"],
                ["station_name", "Must be written from source observation"],
                ["station_chain", "Must be written from source observation if available"],
                ["gps_latitude / gps_longitude", "Must be written if available — required for discovery routing"],
                ["locationLabel", "Should be written from search area or user city"],
                ["StationCandidate artifact", "Must be created — unknown station must enter curation pipeline"],
                ["FuelPrice.create", "Permitted — but must not be displayed as geographically located"],
                ["UI / downstream may assume", "Price must not appear in NearbyPrices or station-linked views; feeds discovery dashboard only"],
              ]}
            />
          </SubSection>
        </Section>

        {/* NEW: Non-Bypass Constraint */}
        <Section title="I. Non-Bypass Constraint" highlight>
          <Constraint>
            No source adapter may implement its own station matching logic that replaces or duplicates SRP. Source adapters are permitted to perform pre-processing only. The final matching decision MUST occur inside SRP.
          </Constraint>

          <SubSection title="What constitutes a bypass">
            <Table
              headers={["Pattern", "Classification", "Permitted?"]}
              rows={[
                ["Adapter normalizes fuel type before invoking SRP", "Pre-processing", "✅ Permitted"],
                ["Adapter extracts GPS coordinates and passes them to SRP", "Pre-processing", "✅ Permitted"],
                ["Adapter performs its own chain normalization before SRP", "Pre-processing", "✅ Permitted"],
                ["Adapter calls a haversine distance function to find a matching station", "Parallel matching", "❌ Violation"],
                ["Adapter resolves a stationId and writes it directly to a FuelPrice record", "Write-gate bypass", "❌ Critical violation"],
                ["Adapter scores candidates and selects the top match without SRP", "Parallel pipeline", "❌ Violation"],
                ["Adapter computes a confidenceScore and includes it in a direct FuelPrice.create", "Bypass of canonical field ownership", "❌ Violation"],
                ["Adapter silently drops unmatched observations", "Silent data loss", "❌ Critical violation"],
              ]}
            />
          </SubSection>

          <SubSection title="Classification of Current GooglePlaces Behavior">
            <Warn>
              The current GooglePlaces automation functions implement a parallel matching pipeline. This is an architectural violation of the non-bypass constraint.
            </Warn>
            <P>Specifically: the GooglePlaces automation functions perform chain keyword normalization, haversine proximity calculation, confidence scoring, and stationId assignment entirely inline — without passing through SRP. They then call FuelPrice.create directly with a resolved stationId but no station_match_status. This constitutes a complete bypass of the write gate.</P>
            <P>This classification does not require immediate remediation. It documents the current divergence so that future adapter updates are constrained to move toward SRP compliance — not away from it.</P>
          </SubSection>
        </Section>

        {/* NEW: SRP Failure Handling */}
        <Section title="J. SRP Failure Handling Model">
          <Rule label="Core principle">
            No silent data drop is permitted. If SRP cannot safely match an observation, it must still produce a FuelPrice record marked as no_safe_station_match, and it must create a StationCandidate for curation routing.
          </Rule>

          <SubSection title="Failure Handling Rules">
            <Table
              headers={["Failure scenario", "Required behavior"]}
              rows={[
                ["No candidates found within proximity radius", "Classify as no_safe_station_match. Write FuelPrice. Create StationCandidate."],
                ["Multiple candidates found, insufficient dominance gap", "Classify as review_needed_station_match. Write FuelPrice with candidates array. Route to StationReview."],
                ["Chain unrecognized or absent", "Proceed with distance + name signals only. Outcome may be any tier depending on remaining signal quality."],
                ["GPS coordinates absent, locationLabel present", "Retrieve candidates by city/region index. Proceed with reduced precision — note in confidenceReason."],
                ["Both GPS and locationLabel absent", "SRP cannot resolve. Classify as no_safe_station_match. Write FuelPrice with station_name if available."],
                ["priceNok outside plausibility range", "Classify plausibilityStatus as suspect. Write FuelPrice. Do NOT suppress the record — downstream may filter by plausibilityStatus."],
                ["SRP internal error", "Log error. Do NOT write FuelPrice. Do NOT silently continue. Caller (adapter) must surface the failure."],
              ]}
            />
          </SubSection>

          <SubSection title="Explicitly Prohibited Behaviors">
            <Ul items={[
              "Skipping a price record because no station match was found — this produces silent data loss",
              "Dropping unmatched observations without creating a StationCandidate — this removes the observation from all discovery paths",
              "Writing a FuelPrice record with station_match_status = null — this is a write-gate bypass",
              "Suppressing suspect-price records without persistence — plausibilityStatus exists to classify them, not to discard them",
              "Treating a low-confidence match as a confirmed match to avoid routing to review queue",
            ]} />
          </SubSection>
        </Section>

        {/* Current Divergence */}
        <Section title="K. Current Divergence: user_reported vs GooglePlaces">

          <SubSection title="What user_reported already does that aligns with the canonical model">
            <Table
              headers={["Canonical requirement", "user_reported behavior"]}
              rows={[
                ["station_match_status always written", "✅ Written unconditionally in all 3 outcome branches"],
                ["confidenceScore graduated by outcome", "✅ 0.30 / 0.50 / 0.85 by match tier"],
                ["confidenceReason written", "✅ Always written as descriptive string"],
                ["station_match_candidates on review_needed", "✅ Written with candidate array"],
                ["station_match_notes on review_needed and no_safe_match", "✅ Written with context"],
                ["station_name / station_chain on no_safe_match", "✅ Preserved for discovery"],
                ["gps_latitude / gps_longitude from user GPS", "✅ Written from window.__gpsLat/Lon"],
                ["StationCandidate created on no_safe_match", "✅ createStationCandidateFromUserReportedPrice called"],
                ["locationLabel set", "✅ From stationInfo.city"],
                ["plausibilityStatus set", "✅ Inline before write"],
                ["Phase 2 scoring: distance + chain + name + location", "✅ Full 4-signal scoring with dominance gap"],
              ]}
            />
            <P>Assessment: user_reported already implements approximately 90% of the canonical SRP contract. Its main gap is that the shared core logic is embedded in the frontend (LogPrice.jsx) and in a user-specific function name (matchStationForUserReportedPrice), making it architecturally invisible as a shared resource.</P>
          </SubSection>

          <SubSection title="What GooglePlaces currently bypasses or omits">
            <Table
              headers={["Canonical requirement", "GooglePlaces behavior", "Severity"]}
              rows={[
                ["station_match_status always written", "❌ Never written — always null", "Critical"],
                ["confidenceReason written", "❌ Never written", "Critical"],
                ["locationLabel set", "❌ Never written — always null", "High"],
                ["station_match_candidates on ambiguous match", "❌ Ambiguous matches are silently skipped", "High"],
                ["station_match_notes on all match outcomes", "❌ Never written", "High"],
                ["StationCandidate creation on unmatched places", "❌ Unmatched places silently dropped — no artifact created", "High"],
                ["Phase 2 scoring: distance + chain + name + location", "❌ Replaced by simpler inline function (chain keyword + haversine ≤500m only)", "High"],
                ["Dominance gap gate for multi-candidate matches", "❌ Not implemented — first matching station within 500m is used", "High"],
                ["station_name / station_chain on no_safe_match", "❌ Not applicable — unmatched not persisted", "Medium"],
                ["gps_latitude / gps_longitude", "❌ Never written (Google place coords available but not stored)", "Medium"],
              ]}
            />
          </SubSection>

          <SubSection title="Where silent skip behavior violates the shared-core model">
            <P>1. Unmatched GooglePlaces places are silently dropped. When the inline matching returns null, the function increments a stats counter and continues. No FuelPrice record is created, no StationCandidate is created, no StationReview is created. This violates both the write-gate constraint and the failure handling model defined in section J.</P>
            <P>2. The inline isReviewNeeded classification is computed but not persisted. The automation computes an ambiguity flag from distance and confidence thresholds — but this outcome is never written to station_match_status. The matching governance outcome exists at runtime but is thrown away. This is a form of silent governance suppression.</P>
            <P>3. classifyGooglePlacesConfidence relies on a 3-entry hardcoded dictionary. Any stationId not in that dictionary is classified as unmatched_not_found. Since the production system has hundreds of stationIds, this function cannot classify the vast majority of existing GooglePlaces records and is effectively non-functional as a governance tool.</P>
          </SubSection>
        </Section>

        {/* Adapter Role Clarification */}
        <Section title="L. Source Adapter Role — Clarification">
          <P>This section formally defines the scope boundary for source adapters in relation to the SRP.</P>

          <SubSection title="Adapters ARE responsible for">
            <Ul items={[
              "Data ingestion — fetching raw data from the external source",
              "Payload parsing — extracting structured fields from the raw response",
              "Fuel type normalization — converting source-specific strings to canonical enum values",
              "Price value extraction — converting source price formats (Money protobuf, string, unit/nanos) to priceNok",
              "Source metadata assembly — sourceName, parserVersion, sourceFrequency, priceType, fetchedAt, rawPayloadSnippet",
              "Source deduplication — preventing redundant API writes for the same observation within the adapter's own execution cycle",
              "Constructing the SRP input object and invoking SRP",
            ]} />
          </SubSection>

          <SubSection title="Adapters are NOT responsible for">
            <Ul items={[
              "Final station identity — the adapter may provide station_name and station_chain as hints, but not as resolved facts",
              "Match classification — the adapter must not declare matched_station_id, review_needed_station_match, or no_safe_station_match",
              "Review routing — the adapter must not create StationReview or route to the curation queue",
              "Canonical contract completion — all SRP-owned fields must be populated by SRP, not the adapter",
              "Writing directly to FuelPrice — this is exclusively SRP's responsibility",
            ]} />
          </SubSection>
        </Section>

        {/* Target Architecture */}
        <Section title="M. Target Architecture Summary">
          <Code>{`┌─────────────────────────────────────────────────────────────────┐
│  SOURCE ADAPTERS                                                │
│                                                                 │
│  user_reported adapter          GooglePlaces adapter           │
│  ─────────────────              ─────────────────────          │
│  • OCR / LLM price extract      • Google Places API fetch      │
│  • User fuel type selection     • fuelOptions JSON parsing     │
│  • GPS signal from browser      • SP95/DIESEL normalization    │
│  • Clarification UI metadata    • Money protobuf extraction    │
│  • reportedByUserId             • updateTime → sourceUpdatedAt │
│  • priceType = user_reported    • priceType = station_level    │
│  • parserVersion = ur_v1        • parserVersion = gp_v1        │
│                                                                 │
│  OUTPUT: Normalized observation object (name, chain, coords,   │
│  priceNok, fuelType, sourceMetadata)                           │
└─────────────────────────┬───────────────────────────────────────┘
                          │ Observation object passed to SRP
                          │ ◄── WRITE GATE: no FuelPrice.create before this
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│  STATION RESOLUTION PIPELINE (SRP) — Shared core · Required    │
│                                                                 │
│  1. Proximity pre-filter: retrieve candidate pool (3km radius)  │
│  2. 4-signal scoring: distance + chain + name + location       │
│  3. Dominance gap gate for multi-candidate outcomes            │
│  4. Outcome declaration:                                        │
│     → matched_station_id                                       │
│     → review_needed_station_match                              │
│     → no_safe_station_match                                    │
│  5. Canonical field population:                                │
│     → stationId (if matched)                                   │
│     → station_match_status (ALWAYS — never null)               │
│     → station_match_candidates (if review_needed)              │
│     → station_match_notes (if review_needed or no_safe_match)  │
│     → confidenceScore (ALWAYS — never null)                    │
│     → confidenceReason (always)                                │
│     → locationLabel (always — from matched station or input)   │
│     → plausibilityStatus (ALWAYS — never null)                 │
│     → station_name / station_chain / gps (if no_safe_match)   │
│                                                                 │
│  OUTPUT: Contract-complete FuelPrice record                    │
└─────────────────┬────────────────┬──────────────────────────────┘
                  │                │
                  ▼                ▼
┌────────────────────┐  ┌──────────────────────────────────────┐
│ FuelPrice.create   │  │ REVIEW / CANDIDATE ROUTING           │
│                    │  │                                      │
│ All outcomes write │  │ no_safe_station_match:               │
│ a FuelPrice record │  │  → StationCandidate.create           │
│ No silent drops    │  │  → processStationCandidates (daily)  │
│                    │  │                                      │
│                    │  │ review_needed_station_match:         │
│                    │  │  → StationReview.create (future)     │
│                    │  │  → StationCandidateReview queue      │
└─────────┬──────────┘  └──────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────┐
│  DOWNSTREAM CONSUMERS                                           │
│                                                                 │
│  NearbyPrices        — reads stationId + plausibilityStatus    │
│  GooglePlacesStats   — reads locationLabel + sourceName        │
│  StationPricesSection — reads priceType + region              │
│  checkPriceDropAlerts — reads stationId + priceNok            │
│  StationCandidateReview — reads station_match_status          │
│  SuperAdmin dashboard — reads all fields for reporting        │
│                                                                 │
│  All consumers may assume: station_match_status is always set, │
│  stationId is present only when resolution is confirmed,       │
│  and no_safe_station_match records are not geographically      │
│  displayable                                                    │
└─────────────────────────────────────────────────────────────────┘`}</Code>
        </Section>

        {/* NEW: Enforcement Rule (replaces H) */}
        <Section title="N. FuelPrice Write Enforcement Rule — Transition Constraint" highlight>
          <Rule label="Write Enforcement Rule">
            Before ANY source adapter is modified: the canonical FuelPrice contract MUST be locked. The SRP write gate MUST be defined and enforced. No adapter may write directly to FuelPrice. Only after these conditions are met may adapters be updated one by one.
          </Rule>

          <SubSection title="Ordering constraint">
            <P>The following ordering is non-negotiable. No step may be skipped or performed out of sequence:</P>
            <Table
              headers={["Step", "Requirement", "Gate condition"]}
              rows={[
                ["1", "Lock the canonical FuelPrice contract as a written governance artifact", "This document, versioned and referenced — complete"],
                ["2", "Define and specify the SRP write gate", "Sections D–F of this document — complete"],
                ["3", "Implement SRP as a shared backend function", "Not yet implemented — required before any adapter change"],
                ["4", "Update the first adapter to route through SRP (user_reported — already 90% aligned)", "Blocked on step 3"],
                ["5", "Validate SRP output produces compliant FuelPrice records", "Blocked on step 4"],
                ["6", "Update remaining adapters (GooglePlaces) to route through SRP", "Blocked on step 5"],
                ["7", "Decommission inline matching logic from adapter functions", "Blocked on step 6"],
              ]}
            />
          </SubSection>

          <SubSection title="What this document authorizes">
            <Ul items={[
              "Implementation of SRP as a standalone shared backend function",
              "Refactoring of matchStationForUserReportedPrice to become the SRP implementation",
              "Updating user_reported adapter to route through the SRP function explicitly",
              "Updating GooglePlaces adapter to route through SRP instead of inline matching",
            ]} />
          </SubSection>

          <SubSection title="What this document explicitly prohibits">
            <Ul items={[
              "Modifying any adapter write path before SRP is implemented and validated",
              "Adding new FuelPrice.create calls outside of the SRP path",
              "Introducing a new source adapter that implements its own matching logic",
              "Optimizing or adjusting matching thresholds based on fixture-only test results",
              "Merging confidence scores across sources before the base contract is compliant across all existing sources",
            ]} />
          </SubSection>
        </Section>

        {/* Footer */}
        <div className="border-t border-slate-200 pt-6 mt-8 text-xs text-slate-400 flex justify-between">
          <span>TankRadar · Governance Document · {SPEC_VERSION} · {REPORT_DATE}</span>
          <span>Read-only specification · No code or data modified</span>
        </div>
      </div>

      <style>{`
        @media print {
          body { background: white; }
          .print\\:hidden { display: none !important; }
          #report-body { max-width: 100%; padding: 0; }
          pre { font-size: 10px; }
          table { font-size: 10px; }
        }
      `}</style>
    </div>
  );
}