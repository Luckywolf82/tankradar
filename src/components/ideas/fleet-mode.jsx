/*
IDEA: fleet-mode

Flåtemodus
Multi-vehicle management for small business owners and fleet managers
*/

export const fleetMode = {
  id: "fleet-mode",
  title: "Flåtemodus for bedrifter",
  category: "other",
  status: "candidate",

  summary:
    "A fleet management mode allowing business owners and SMEs to track fuel costs across multiple vehicles, generate expense reports, and optimize fueling routes for their fleet.",

  problem:
    "Small businesses (tradespeople, couriers, delivery services) have multiple vehicles and no simple tool to track and optimize fleet fuel costs. TankRadar's data is directly applicable.",

  userValue: "high",
  crowdsourcingImpact: "indirect",
  activationImpact: "low",

  complexity: "high",
  dependencies: [
    "multi-vehicle-profiles",
    "organization-account-model",
    "expense-reporting",
    "invoice-export",
    "role-based-access",
    "premium-tier",
  ],

  recommendedAuditTypes: ["product", "security", "publishability"],

  notes: `
Target users:
  - SME owners with 2–20 vehicles
  - Courier/delivery companies
  - Tradespeople (plumbers, electricians, builders)
  - Construction companies

Core features:
  - Add multiple vehicles to one account
  - Track fuel costs per vehicle
  - Monthly expense report (PDF/CSV)
  - Per-vehicle savings analysis
  - Fleet-level dashboard

Business model:
  - Premium feature (paid tier)
  - Price point: 49–99 NOK/month per fleet
  - Trial: 30 days free

Technical complexity:
  - Requires org/team account model (major schema change)
  - Role-based access: owner, driver, manager
  - Data isolation per org
  - Invoice-ready reporting

Dependencies:
  - Must ship fill-historikk and bilokonomi-dashboard first
  - Needs premium/payment tier infrastructure

This is a Phase 4–5 feature. Do not build before consumer product is mature.
  `,

  possibleFeatures: [
    "Multi-vehicle account dashboard",
    "Per-vehicle cost tracking",
    "Fleet expense report (PDF/CSV)",
    "Driver assignment per vehicle",
    "Role-based access (owner / manager / driver)",
    "Monthly billing summary",
    "Per-vehicle savings vs. national avg",
    "Fleet fuel optimization recommendations",
  ],

  successMetrics: [
    "Fleet accounts created",
    "Vehicles per fleet account",
    "Monthly report generation rate",
    "Fleet → premium conversion rate",
  ],
};

export default fleetMode;