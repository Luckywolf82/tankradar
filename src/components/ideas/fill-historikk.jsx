/*
IDEA: fill-historikk

Min tankhistorikk
Personal refueling log — every fill-up, price paid, and station used
*/

export const fillHistorikk = {
  id: "fill-historikk",
  title: "Min tankhistorikk",
  category: "engagement",
  status: "candidate",

  summary:
    "Give users a personal refueling log showing every fill-up they've recorded via TankRadar — price paid, station, fuel type, date, and estimated liters.",

  problem:
    "Users have no record of their own fueling behavior over time. A personal log creates habit-forming value and enables savings calculations.",

  userValue: "high",
  crowdsourcingImpact: "indirect",
  activationImpact: "high",

  complexity: "low",
  dependencies: [
    "user-price-history",
    "user-reported-fuelprice-entity",
    "station-reference",
  ],

  recommendedAuditTypes: ["product", "activation", "ui"],

  notes: `
Data source:
  - FuelPrice records where priceType = 'user_reported' AND created_by = current user
  - Already exists in the database — this is purely a UI feature

Display fields per entry:
  - Date
  - Station name (from stationId lookup or station_name snapshot)
  - Fuel type
  - Price per liter
  - Estimated liters (user-input or from tank size config)
  - Estimated total cost
  - Delta from national average at that date

MVP approach:
  - List view sorted by date desc
  - Summary stats at top: total fills, avg price, best price ever
  - Zero infrastructure required — existing user_reported data

Gamification hook:
  - Streak: "X fill-ups logged in a row"
  - Milestones: "50th fill-up logged"
  - Best price badge: "Lowest price you ever found"
  `,

  possibleFeatures: [
    "Chronological fill-up log",
    "Price trend per station (personal history)",
    "Monthly spending summary",
    "Best price record (personal low)",
    "Fill-up frequency (avg days between fills)",
    "Station loyalty: most visited stations",
    "Export: CSV or PDF of personal history",
  ],

  successMetrics: [
    "% of contributors who open fill history page",
    "Return visits to fill history page",
    "Contribution frequency uplift for users with history visible",
  ],
};

export default fillHistorikk;