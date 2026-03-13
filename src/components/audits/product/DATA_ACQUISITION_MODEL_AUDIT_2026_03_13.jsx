/*
DATA ACQUISITION MODEL AUDIT — TankRadar
Date: 2026-03-13
Category: product
Status: proposed

Purpose:
Evaluate the best early-stage crowdsourcing model for scalable station-level fuel price acquisition.

Observed repository files:
- src/components/ideas/IDEA_INDEX.jsx
- src/components/roadmap/ROADMAP.jsx
- src/components/governance/AI_PROJECT_INSTRUCTIONS.jsx (conceptually aligned governance)
- src/components/audits/AUDIT_INDEX.jsx

Context:
Recent strategy discussion identified automatic or near-automatic data capture as a likely core differentiator for TankRadar.
Primary concept under review:
GPS passing detection + likely refuel prediction + OCR price sign capture.

Candidate Acquisition Models:
A. Manual user-reported price flow
B. Receipt import
C. GPS + confirm
D. GPS + OCR prompt
E. Hybrid acquisition model

Observed Behavior:
- Current roadmap already includes user-reported prices as a completed core feature.
- Idea registry includes receipt import.
- Community verification exists on roadmap as scoping-required.
- No canonical audit yet appears to define the full acquisition model.

Strategic Question:
What acquisition model produces the most station-level datapoints per active user with acceptable friction, privacy, and confidence?

Assessment:

Model A — Manual reporting
Pros:
- simple
- already partially aligned with current product
Cons:
- low reporting frequency
- high user effort
- weak scaling

Model B — Receipt import
Pros:
- accurate purchase evidence
- lower manual effort
Cons:
- post-purchase only
- no live station board data
- privacy sensitivity

Model C — GPS + confirm
Pros:
- fast
- contextual
Cons:
- still user interruption
- many false positives unless tuned carefully

Model D — GPS + OCR prompt
Pros:
- strongest near-real-time station pricing potential
- low-friction with good UX
- supports station-level dataset growth
Cons:
- requires robust prompt timing
- OCR quality variance
- camera dependency

Model E — Hybrid model
Recommended:
1. GPS detects likely station stop
2. Refuel probability engine determines prompt eligibility
3. OCR capture requested only when likelihood is high
4. Receipt import remains optional secondary validation path
5. Confidence engine merges observed + inferred freshness

Structural Risks:
1. Over-prompting users will kill retention.
2. OCR-only flows may fail in poor weather/light conditions.
3. GPS stop detection without good filtering creates noisy events.
4. No confidence model = weak data trust.

Recommended Canonical Model:
Hybrid acquisition:
- primary: GPS + likely-refuel detection + OCR prompt
- secondary: receipt import
- tertiary: community verification

Required Design Components Before Build:
- likely-refuel event definition
- station stop heuristics
- OCR capture flow
- confidence scoring model
- privacy/consent rules
- fallback UX when OCR fails

Recommended New Roadmap Concepts:
- radar-mode
- refuel-probability-engine
- OCR-capture-flow
- confidence-freshness-engine
- acquisition-privacy-model

Recommended Next Safe Steps:
1. Add acquisition ideas to IDEA_INDEX.
2. Perform scoping pass for confidence scoring and OCR flow.
3. Keep implementation behind audit gate.
4. Revisit roadmap scoring after acquisition architecture is documented.

Conclusion:
The strongest long-term acquisition strategy is not purely manual reporting.
TankRadar should likely evolve toward a hybrid passive acquisition model centered on high-confidence prompts instead of constant user effort.
*/

export const DATA_ACQUISITION_MODEL_AUDIT_2026_03_13 = {
  auditId: "data-acquisition-model-audit-2026-03-13",
  category: "product",
  status: "proposed",
  canonicalFor: "Fuel price acquisition strategy",
};

export default DATA_ACQUISITION_MODEL_AUDIT_2026_03_13;