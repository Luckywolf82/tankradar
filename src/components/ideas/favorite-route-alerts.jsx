/*
IDEA: favorite-route-alerts

Billigste varsel på din rute
Alert users when fuel is cheapest on their regular commute route
*/

export const favoriteRouteAlerts = {
  id: "favorite-route-alerts",
  title: "Billigste varsel på din rute",
  category: "alerts",
  status: "candidate",

  summary:
    "Send alerts to users when fuel prices drop below a threshold on their saved commute routes",

  problem:
    "Current price alerts apply to single stations only. Commuters have a regular route; a route-based alert is more practical.",

  userValue: "medium",
  crowdsourcingImpact: "none",
  activationImpact: "medium",

  complexity: "medium",
  dependencies: [
    "saved-routes-system",
    "route-matching-engine",
    "price-alert-engine",
    "push-notifications",
  ],

  recommendedAuditTypes: ["product", "activation", "performance"],

  notes: `
Requires:

1. Saved Routes:
   - Allow users to save favorite routes (e.g., "Home → Office")
   - Store route as waypoints or start/end coordinates
   - Enable sorting by frequency / alias

2. Route Matching:
   - Given a price change, find stations within route bounds
   - Define "on route": stations within 5km of route line
   - Rank by distance and price

3. Alert Logic:
   - Trigger when price ≤ user's target threshold on route
   - Check during commute windows (e.g., 6-9am, 4-6pm)
   - Rate-limit: max 1 alert per route per day

4. Push Notification:
   - Require explicit notification opt-in
   - Include: price, station, distance, estimated savings
   - Include deep link to dashboard (pre-filtered for route)

5. Performance:
   - Route matching can be expensive; batch processing recommended
   - Calculate distances off-peak
   - Cache results (station → routes with in-range flag)

MVP approach:
- Simple distance-based matching (station within 10km of start/end point)
- Defer true route-distance calculation to Phase 2
- Single daily alert max per route
- Push notifications only (no email)
`,

  possibleFeatures: [
    "Save routes with custom names",
    "Set price threshold per route",
    "Choose notification time windows (commute hours)",
    "View route history: stations used, avg prices",
    "Route analytics: typical savings per month",
    "Integration with navigation apps",
    "Repeat alert: if price stays low, remind tomorrow",
  ],

  successMetrics: [
    "% of active users with saved routes",
    "Alerts sent vs. alerts acted on (CTR)",
    "Time from alert to station visit",
    "Repeat engagement: % of users returning to same route",
  ],
};

export default favoriteRouteAlerts;