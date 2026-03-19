import React from "react";
import { Button } from "@/components/ui/button";
import { Download, Printer } from "lucide-react";

const REPORT_DATE = "2026-03-19";

function Section({ title, children }) {
  return (
    <div className="mb-8">
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

export default function CanonicalContractAuditReport() {
  const handlePrint = () => window.print();

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Toolbar — hidden on print */}
      <div className="print:hidden sticky top-0 z-10 bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shadow-sm">
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold">TankRadar Governance</p>
          <p className="text-sm font-bold text-slate-800">Canonical FuelPrice Contract Pipeline — Spec-Only Architecture Audit</p>
        </div>
        <Button onClick={handlePrint} className="gap-2 bg-slate-800 hover:bg-slate-700">
          <Printer size={15} />
          Lagre / Skriv ut PDF
        </Button>
      </div>

      {/* Report body */}
      <div className="max-w-4xl mx-auto px-8 py-10 bg-white min-h-screen print:px-4 print:py-6 print:shadow-none" id="report-body">

        {/* Cover */}
        <div className="mb-10 border-b border-slate-300 pb-6">
          <p className="text-xs text-slate-400 uppercase tracking-widest mb-1">TankRadar · Governance Document</p>
          <h1 className="text-2xl font-bold text-slate-900 mb-1">Canonical FuelPrice Contract Pipeline</h1>
          <h2 className="text-lg font-normal text-slate-600 mb-3">Spec-Only Architecture + Contract Audit</h2>
          <div className="flex gap-6 text-xs text-slate-500">
            <span>Dato: {REPORT_DATE}</span>
            <span>Status: Read-only · No code or data modified</span>
            <span>Fase: Pre-implementation specification</span>
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

        {/* D */}
        <Section title="D. Canonical FuelPrice Contract Matrix">
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
              ["plausibilityStatus", "A", "Enum: realistic_price, suspect_price_low, suspect_price_high", "Set by SRP after price extraction"],
              ["confidenceScore", "A", "Float 0–1", "Set by SRP from matching signals; 0.0 if no match"],
              ["station_match_status", "A", "Enum: matched_station_id, review_needed_station_match, no_safe_station_match", "Must be set by SRP for ALL records"],
              ["sourceFrequency", "A", "Enum value or 'unknown'", "Set by adapter; 'unknown' if not known"],
              ["sourceUpdatedAt", "A", "ISO datetime or null", "null is valid; must be explicitly set, not omitted"],
              ["locationLabel", "A", "City/area string or null", "SRP sets from matched Station.city or user-provided city"],
              ["stationId", "B", "Non-null Station.id", "Set by SRP on confirmed match only"],
              ["confidenceReason", "B", "Human-readable string", "Must describe signal basis — set by SRP on all confirmed matches"],
              ["station_match_candidates", "C", "Array of Station.id strings", "Set by SRP from top-scored ambiguous candidates"],
              ["station_match_notes", "C, D", "Descriptive string", "Required on review_needed and no_safe_match — set by SRP"],
              ["station_name", "D", "String from source observation", "Preserved for discovery — SRP writes from adapter's raw name input"],
              ["station_chain", "D", "String from source observation", "Preserved for discovery — SRP writes from adapter's raw chain input"],
              ["gps_latitude", "D", "Float or null", "Source GPS — for unresolved discovery"],
              ["gps_longitude", "D", "Float or null", "Source GPS — for unresolved discovery"],
              ["rawPayloadSnippet", "E", "String, max ~200 chars", "Adapter-specific debug trace; recommended but not required"],
              ["sourceUrl", "E", "URL string or null", "Source link if available"],
              ["reportedByUserId", "E", "User ID string or null", "user_reported only; never applicable to automated sources"],
            ]}
          />
        </Section>

        {/* E */}
        <Section title="E. Canonical Match Outcomes Matrix">

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
                ["station_match_candidates", "Must be written — array of top candidate Station.ids"],
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

        {/* F */}
        <Section title="F. Current Divergence: user_reported vs GooglePlaces">

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
            <P>1. Unmatched GooglePlaces places are silently dropped. When matchStationToPriceSource() returns null, the function increments stats.observationsUnmatched++ and continues. No FuelPrice record is created, no StationCandidate is created, no StationReview is created. The canonical model requires no_safe_station_match to generate a FuelPrice record (for auditability) and a StationCandidate (for discovery).</P>
            <P>2. The inline isReviewNeeded classification is computed but not persisted. runGooglePlacesFetchAutomation computes isReviewNeeded = matchResult.distanceMeters &gt; 200 || matchResult.confidence &lt; 0.70 and increments a counter — but this outcome is never written to the FuelPrice record's station_match_status. The matching governance outcome exists at runtime but is thrown away.</P>
            <P>3. classifyGooglePlacesConfidence relies on a 3-entry hardcoded dictionary. Any stationId not in that dictionary is classified as unmatched_not_found. Since the production system has hundreds of stationIds, this function cannot classify the vast majority of existing GooglePlaces records and is effectively non-functional as a governance tool.</P>
          </SubSection>

          <SubSection title="Does GooglePlaces act as an adapter or as an unauthorized parallel matching pipeline?">
            <div className="bg-amber-50 border border-amber-300 rounded px-4 py-3 mb-3">
              <p className="text-sm font-semibold text-amber-800">GooglePlaces currently acts as an unauthorized parallel matching pipeline.</p>
            </div>
            <P>It does not behave as a source adapter that passes its observations to a shared SRP. It implements its own complete matching logic — chain normalization, haversine distance, confidence scoring — entirely inline within the automation function, producing a stationId without going through any shared governance layer, and writes directly to FuelPrice with no station_match_status field to mark the record as having passed any resolution process.</P>
            <P>The result is that GooglePlaces FuelPrice records are structurally indistinguishable — by their field values — from partially-written records that failed mid-way through the user_reported path. The only differentiator is sourceName.</P>
          </SubSection>
        </Section>

        {/* G */}
        <Section title="G. Target Architecture Summary">
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
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│  STATION RESOLUTION PIPELINE (SRP) — Shared core               │
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
│     → station_match_status (always)                            │
│     → station_match_candidates (if review_needed)              │
│     → station_match_notes (if review_needed or no_safe_match)  │
│     → confidenceScore (always)                                 │
│     → confidenceReason (always)                                │
│     → locationLabel (always — from matched station or input)   │
│     → plausibilityStatus (always)                              │
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
│                    │  │  → processStationCandidates (daily)  │
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

          <P>The key structural principle is that no source adapter may call FuelPrice.create directly. Every price observation — regardless of origin — must pass through the SRP and receive a declared resolution outcome before persistence. The SRP is the single point where all governance rules about station identity, match confidence, and review routing are enforced.</P>
        </Section>

        {/* H */}
        <Section title="H. Exactly One Safe Transition Principle">
          <div className="bg-slate-900 text-white rounded px-5 py-4 text-sm leading-relaxed">
            <p className="font-bold text-green-400 mb-2">Safe Transition Principle</p>
            <p>"Lock the canonical FuelPrice contract as a written entity-level specification before modifying any source adapter write path."</p>
          </div>
          <div className="mt-4">
            <P>This means: before changing runGooglePlacesFetchAutomation, LogPrice.jsx, or any other function that calls FuelPrice.create, the 23-field canonical contract defined in section D of this document must be treated as a fixed governance artifact — agreed upon, versioned, and referenced by all future implementation work. No source adapter should be modified to comply with the SRP until the SRP's own contract output is fully specified and stable. Changing adapters first (without a locked shared core spec) risks migrating to a new pattern that is itself inconsistently defined.</P>
          </div>
        </Section>

        {/* Footer */}
        <div className="border-t border-slate-200 pt-6 mt-8 text-xs text-slate-400 flex justify-between">
          <span>TankRadar · Governance Document · {REPORT_DATE}</span>
          <span>Read-only audit · No code or data modified</span>
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