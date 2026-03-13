/*
CROWDSOURCING ENGINE AUDIT — TankRadar
Date: 2026-03-13
Category: product
Status: proposed

Purpose:
Evaluate the architecture and scalability of TankRadar’s crowdsourcing model
for collecting high-frequency station-level fuel price data.

This audit examines how drivers become distributed sensors for fuel market data.

Observed repository files:
- src/components/ideas/IDEA_INDEX.jsx
- src/components/roadmap/ROADMAP.jsx
- src/components/governance/AI_PROJECT_INSTRUCTIONS.jsx
- src/components/audits/AUDIT_INDEX.jsx

Context:
TankRadar’s long-term value depends on building a large, reliable dataset
of station-level fuel prices.

Traditional fuel apps rely heavily on manual user submissions.
This audit evaluates whether TankRadar should evolve toward a hybrid
passive-crowdsourcing model where drivers generate data through normal usage.

Observed Behavior:

Current roadmap indicates:

- user-reported price logging exists
- community verification is planned
- savings tracking and route alerts exist

However the system does not yet appear to define a canonical
crowdsourcing engine architecture.

Key Strategic Question:

How can TankRadar maximize the number of usable price datapoints
per active driver with minimal friction?

Candidate Crowdsourcing Models:

Model A — Manual reporting
Driver manually logs price.

Pros:
- simple
- easy to implement

Cons:
- extremely low reporting rate
- high friction
- weak scalability


Model B — Receipt verification
Driver scans receipt after fueling.

Pros:
- strong proof of purchase
- good price accuracy

Cons:
- delayed reporting
- limited station coverage
- privacy concerns


Model C — GPS assisted reporting
App detects station stop and asks user to confirm price.

Pros:
- contextual
- moderate friction

Cons:
- still requires explicit confirmation
- false positives possible


Model D — Passive radar model
App detects likely refuel events and prompts user to capture price sign via camera.

Pros:
- high quality station data
- near real-time updates
- lower friction than manual reporting

Cons:
- requires OCR reliability
- camera access required
- prompt timing must be tuned carefully


Model E — Hybrid crowdsourcing model (recommended)

System layers:

1. Passive detection
   GPS identifies station stop events.

2. Refuel probability engine
   AI estimates likelihood user is refueling.

3. Contextual prompt
   OCR capture requested only when probability threshold is high.

4. Optional receipt verification
   Secondary validation path.

5. Community validation
   Multiple reports strengthen confidence score.

6. Confidence engine
   Data freshness and reliability calculated.

Structural Risks:

1. Over-prompting users may cause churn.

2. OCR quality varies depending on lighting, angle, and weather.

3. GPS stop detection must avoid triggering at shops or parking.

4. Without confidence scoring the dataset will contain noisy or conflicting data.

Confirmed Strategic Insight:

TankRadar’s long-term advantage will likely come from maximizing
data points per active user.

Drivers should effectively function as mobile fuel price sensors.

Recommended System Components:

- radar-mode
- likely-refuel-detection
- OCR price capture
- station pass tracking
- confidence scoring
- community verification
- receipt validation fallback

Potential Gamification Layer:

- radar agents
- contributor levels
- leaderboards
- contribution badges

These mechanisms may increase reporting frequency and engagement.

Recommended Next Safe Steps:

1. Add crowdsourcing architecture concepts to IDEA_INDEX.

2. Define canonical acquisition pipeline:

   GPS detection
   → probability model
   → capture prompt
   → OCR
   → validation
   → confidence score

3. Perform technical feasibility evaluation for OCR capture.

4. Ensure privacy controls and explicit consent mechanisms.

Conclusion:

Manual reporting alone is unlikely to scale sufficiently
for a high-quality national fuel price dataset.

A hybrid crowdsourcing engine combining passive detection,
contextual prompts, and community validation offers the
best balance between scale, data quality, and user friction.

*/

export const CROWDSOURCING_ENGINE_AUDIT_2026_03_13 = {
  auditId: "crowdsourcing-engine-audit-2026-03-13",
  category: "product",
  status: "proposed",
  canonicalFor: "TankRadar crowdsourcing architecture"
};

export default CROWDSOURCING_ENGINE_AUDIT_2026_03_13;