/*
IDEA: price-war-alerts

Bensinkrig varsler
Alert users when competing stations trigger a local price war (cascading price drops)
*/

export const priceWarAlerts = {
  id: "price-war-alerts",
  title: "Bensinkrig varsler",
  category: "alerts",
  status: "candidate",

  summary:
    "Detect and alert users when local stations enter a 'price war' — cascading competitive drops — so users can capitalize on the lowest prices before the window closes.",

  problem:
    "Price wars between competing stations create short-lived windows of unusually cheap fuel. Users rarely know when these happen or where. Missing these events is a missed savings opportunity.",

  userValue: "high",
  crowdsourcingImpact: "indirect",
  activationImpact: "high",

  complexity: "medium",
  dependencies: [
    "station-level-prices",
    "price-change-detection-engine",
    "regional-station-grouping",
    "push-notifications",
    "price-alert-engine",
  ],

  recommendedAuditTypes: ["product", "activation", "data", "performance"],

  notes: `
Price war detection logic:

1. Define price war trigger:
   - 2+ stations in same area drop price > X% within Y hours
   - Price drops below 30-day regional low

2. Alert content:
   - "Bensinkrig i [city/area] — priser faller nå"
   - Show participating stations + current prices
   - Estimated savings vs. user's baseline

3. Alert decay:
   - Price wars are time-limited; alert expires after 24h
   - Re-alert if new drop detected

4. Data dependency:
   - Requires real-time or near-realtime station-level pricing
   - Requires sufficient station density per area (min 3 stations within 5km)

MVP:
   - Detect via simple price-drop threshold (>5% drop in <6h)
   - Region-scoped (city or postal code cluster)
   - Push notification opt-in required

Risk:
   - False positives if single source updates price incorrectly
   - Requires plausibility filter before alerting
  `,

  possibleFeatures: [
    "Real-time price war detection per region",
    "Push alert with station list + prices",
    "Historical price war log ('last bensinkrig in your area')",
    "User-configurable threshold (alert only if > X% drop)",
    "Region subscription (follow specific cities)",
    "Price war map view (heatmap of active wars)",
  ],

  successMetrics: [
    "Alert CTR (price war vs. standard alerts)",
    "Station visit rate after alert",
    "User retention uplift in price-war regions",
    "False positive rate",
  ],
};

export default priceWarAlerts;