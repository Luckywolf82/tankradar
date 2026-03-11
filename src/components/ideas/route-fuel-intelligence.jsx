/*
IDEA: route-fuel-intelligence

Billigste drivstoff langs ruten
Show users the cheapest fuel stations along their planned driving route
*/

export const routeFuelIntelligence = {
  id: "route-fuel-intelligence",
  title: "Billigste drivstoff langs ruten",
  category: "routing",
  status: "candidate",

  summary:
    "Show users the cheapest fuel stations along their planned driving route, with savings estimates",

  problem:
    "Drivers often discover cheaper fuel stations after they've already filled up elsewhere. A route-aware pricing tool could highlight savings opportunities before the purchase decision.",

  userValue: "high",
  crowdsourcingImpact: "indirect",
  activationImpact: "medium",

  complexity: "high",
  dependencies: [
    "user-authenticated-routes",
    "geolocation-permission",
    "station-level-prices",
    "route-optimization-library",
    "maps-integration",
  ],

  recommendedAuditTypes: [
    "product",
    "activation",
    "data",
    "performance",
    "security",
  ],

  notes: `
Requires real-time station data along route. Privacy consideration: requires location sharing.

MVP could start with manual route entry (from/to address) before live GPS integration.

Data requirements:
- Station catalog with precise coordinates
- Real-time pricing per station
- Route calculation engine

Technical risks:
- Route distance calculation accuracy
- Real-time price freshness
- Mobile performance with map rendering
`,

  possibleFeatures: [
    "Calculate fuel savings compared to nearest station",
    "Show stations ranked by price within route bounds",
    "Estimate refuel timing based on tank level and consumption",
    "Integration with navigation apps (Google Maps, Apple Maps)",
    "Route pre-calculation for saved routes",
  ],

  successMetrics: [
    "% of users who save routes",
    "CTR on cheapest station recommendation",
    "Avg savings per user per month",
  ],
};

export default routeFuelIntelligence;