/*
IDEA INDEX

Canonical registry of TankRadar product ideas.
All ideas awaiting audit analysis before implementation.

Workflow: IDEA → AUDIT → BUILD

Status values:
- candidate: hypothesis, awaiting audit
- audited: analysis complete, findings documented
- approved_for_build: audit passed, ready for sprint
- deferred: temporarily postponed
- rejected: decided against, kept for traceability
- implemented: shipped to production
*/

export const IDEA_INDEX = {
  registry: [
    {
      id: "route-fuel-intelligence",
      title: "Billigste drivstoff langs ruten",
      category: "routing",
      status: "candidate",
      summary:
        "Show users the cheapest fuel stations along their planned driving route, with savings estimates",
      problem:
        "Drivers often discover cheaper fuel stations after they've already filled up elsewhere. Route-aware pricing could save money before the purchase decision.",
      userValue: "high",
      crowdsourcingImpact: "indirect",
      activationImpact: "medium",
      complexity: "high",
      dependencies: [
        "user-authenticated-routes",
        "geolocation",
        "station-level-prices",
        "route-optimization-library",
      ],
      recommendedAuditTypes: ["product", "activation", "data", "performance"],
      notes:
        "Requires real-time station data along route. Privacy concern: location sharing. MVP could start with manual route entry.",
    },
    {
      id: "price-drop-predictor",
      title: "Når lønner det seg å fylle?",
      category: "pricing",
      status: "candidate",
      summary:
        "ML-based prediction of upcoming price movements to guide refueling timing",
      problem:
        "Users want to know if prices will drop soon or if they should fill up now. No tool exists for this.",
      userValue: "high",
      crowdsourcingImpact: "none",
      activationImpact: "medium",
      complexity: "high",
      dependencies: [
        "historical-price-data",
        "statistical-modeling",
        "ml-training-pipeline",
        "national-trend-data",
      ],
      recommendedAuditTypes: ["product", "data", "performance"],
      notes:
        "Requires 6+ months of historical data to train. Initial MVP could use simple trend analysis instead.",
    },
    {
      id: "receipt-import",
      title: "Samtykkebasert lesing av drivstoffkjøp",
      category: "crowdsourcing",
      status: "candidate",
      summary:
        "Allow users to optionally import fuel prices from email receipts or photos for automatic price logging",
      problem:
        "Manual price entry is friction. Automated import from receipts reduces effort and increases data quality.",
      userValue: "medium",
      crowdsourcingImpact: "direct",
      activationImpact: "high",
      complexity: "medium",
      dependencies: [
        "ocr-or-receipt-parser",
        "user-email-oauth",
        "receipt-validation",
        "image-upload",
      ],
      recommendedAuditTypes: [
        "product",
        "activation",
        "security",
        "publishability",
      ],
      notes:
        "Privacy-critical: requires explicit consent. Must not store emails or images long-term. OCR accuracy matters.",
    },
    {
      id: "driver-leaderboard",
      title: "Lokal bidragsrangering for drivstoffpriser",
      category: "gamification",
      status: "candidate",
      summary:
        "Show top contributors by region / city with streak counters and badges",
      problem:
        "No social incentive for consistent price contributions. Leaderboards could drive engagement.",
      userValue: "low",
      crowdsourcingImpact: "direct",
      activationImpact: "high",
      complexity: "low",
      dependencies: ["contribution-tracking", "user-profiles", "regional-segmentation"],
      recommendedAuditTypes: ["product", "activation"],
      notes:
        "Requires anonymization or opt-in display. Must not reveal location patterns. Consider privacy implications.",
    },
    {
      id: "fuel-savings-tracker",
      title: "Hvor mye har du spart?",
      category: "engagement",
      status: "candidate",
      summary:
        "Calculate estimated savings from using TankRadar prices vs. national average",
      problem:
        "Users don't see the concrete value of price reporting. Savings tracker makes impact visible.",
      userValue: "high",
      crowdsourcingImpact: "indirect",
      activationImpact: "high",
      complexity: "low",
      dependencies: ["user-price-history", "national-benchmark", "user-location"],
      recommendedAuditTypes: ["product", "activation"],
      notes:
        "Could be gamified with milestones. Estimates based on assumed km/year—should be user-configurable.",
    },
    {
      id: "favorite-route-alerts",
      title: "Billigste varsel på din rute",
      category: "alerts",
      status: "candidate",
      summary:
        "Alert users when fuel is cheapest on their regular commute route",
      problem:
        "Price alerts exist for single stations, but not for routes. Route-based alerts serve commuters better.",
      userValue: "medium",
      crowdsourcingImpact: "none",
      activationImpact: "medium",
      complexity: "medium",
      dependencies: [
        "saved-routes",
        "route-matching",
        "price-alert-engine",
        "push-notifications",
      ],
      recommendedAuditTypes: ["product", "activation", "performance"],
      notes:
        "Requires geofencing or route distance calculation. Push notification opt-in is critical.",
    },
  ],

  summary: {
    total: 6,
    by_status: {
      candidate: 6,
      audited: 0,
      approved_for_build: 0,
      deferred: 0,
      rejected: 0,
      implemented: 0,
    },
    by_category: {
      routing: 1,
      pricing: 1,
      crowdsourcing: 1,
      engagement: 1,
      alerts: 1,
      gamification: 1,
    },
  },

  workflow_guidance: {
    nextSteps: [
      "Each candidate idea awaits audit analysis before build consideration",
      "Recommended audits are linked per idea",
      "As audits complete, status → audited",
      "Audit approval → status → approved_for_build",
      "Build → status → implemented",
      "If audit recommends against: status → rejected, move to /rejected/",
    ],
    audit_system_integration: [
      "Ideas use same audit categories as production code",
      "IDEA_INDEX references AUDIT_INDEX categories",
      "Audits can be found in src/components/audits/",
      "Each idea's recommendedAuditTypes guides which audits to create",
    ],
  },

  related_files: {
    ideaSystemReadme: "src/components/ideas/README.jsx",
    auditRegistry: "src/components/audits/AUDIT_INDEX.jsx",
    rejectedIdeas: "src/components/ideas/rejected/README.jsx",
  },
};

export default IDEA_INDEX;