/*
IDEA: bilokonomi-dashboard

Bilens økonomi-dashboard
A full personal vehicle economics dashboard: fuel costs, consumption, and efficiency over time
*/

export const bilokonomiDashboard = {
  id: "bilokonomi-dashboard",
  title: "Bilens økonomi-dashboard",
  category: "engagement",
  status: "candidate",

  summary:
    "A personal vehicle economics dashboard showing monthly fuel costs, estimated consumption, and efficiency trends — making fuel spending tangible and comparable.",

  problem:
    "Most car owners have no clear picture of what their vehicle actually costs them per month in fuel. TankRadar has the data to show this — but currently doesn't surface it.",

  userValue: "high",
  crowdsourcingImpact: "indirect",
  activationImpact: "medium",

  complexity: "medium",
  dependencies: [
    "fill-historikk",
    "user-vehicle-profile",
    "national-benchmark-data",
    "user-km-input",
  ],

  recommendedAuditTypes: ["product", "activation", "ui"],

  notes: `
Core metrics:
  - Fuel cost per month (NOK)
  - Cost per km (requires km input)
  - Liters per 100km (requires km input)
  - Monthly vs. national average spending
  - Savings vs. if user filled at national avg price

Vehicle profile (optional input):
  - Car model / year (optional)
  - Tank size (default: 50L)
  - Average km/month (default: 1500)
  - Fuel type preference

Display:
  - Monthly bar chart (fuel cost over time)
  - KPI cards: avg price / avg L/100km / monthly cost
  - Comparison band: "You spend X% more/less than avg driver"

Dependencies:
  - fill-historikk must exist first
  - National benchmark for comparison

Cautions:
  - km/month is self-reported — cannot verify
  - Efficiency estimates are approximations
  - Show all estimates with explicit caveats
  `,

  possibleFeatures: [
    "Monthly fuel cost chart",
    "Cost per km calculation",
    "Consumption trend (L/100km over time)",
    "Annual fuel cost projection",
    "Savings vs. average Norwegian driver",
    "Vehicle profile setup wizard",
    "EV vs. ICE cost comparison (future)",
  ],

  successMetrics: [
    "% of users who complete vehicle profile",
    "Session duration on dashboard",
    "Correlation with contribution frequency",
    "User retention uplift",
  ],
};

export default bilokonomiDashboard;