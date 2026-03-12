/*
IDEA: fuel-data-api

Drivstoffdata-API
A commercial or open-access API for Norwegian fuel price data — enabling third-party developers and businesses to consume TankRadar's dataset
*/

export const fuelDataApi = {
  id: "fuel-data-api",
  title: "Drivstoffdata-API for utviklere",
  category: "other",
  status: "candidate",

  summary:
    "A public or commercial API exposing TankRadar's curated Norwegian fuel price data — national averages, regional benchmarks, and station-level prices — to third-party developers and data consumers.",

  problem:
    "There is no public, clean, machine-readable API for Norwegian fuel prices. TankRadar's data pipeline creates value that can be monetized or shared beyond the consumer app.",

  userValue: "low",
  crowdsourcingImpact: "none",
  activationImpact: "low",

  complexity: "medium",
  dependencies: [
    "stable-data-pipeline",
    "api-key-management",
    "rate-limiting",
    "data-quality-maturity",
    "legal-data-terms",
    "commercial-billing",
  ],

  recommendedAuditTypes: ["product", "security", "publishability"],

  notes: `
Target consumers:
  - GPS/navigation apps (Waze, maps)
  - Automotive industry (OEM in-car systems)
  - Price comparison platforms
  - Academic researchers
  - Fleet management software
  - Government/municipality tools

API tiers:
  1. Free tier: national averages only, 100 req/day, attribution required
  2. Standard tier: regional data, 10k req/day, 299 NOK/month
  3. Pro tier: station-level (partial), 100k req/day, 999 NOK/month
  4. Enterprise: full coverage + SLA, custom pricing

Endpoints (draft):
  GET /v1/national/current         → latest national avg prices
  GET /v1/national/history         → 90-day historical national prices
  GET /v1/regional/current         → current prices by county
  GET /v1/stations/{id}/prices     → station-level prices (Pro tier)
  GET /v1/stations/nearby          → stations near coordinates with prices

Prerequisites:
  - Data quality must be high (>95% valid prices, <24h stale)
  - Station catalog must be reasonably complete nationally
  - Legal: terms of use, data attribution requirements
  - Rate limiting and API key management infrastructure

This is a Phase 5 feature. Do not build before consumer product and data pipeline are mature.

Commercial potential:
  - Recurring revenue independent of consumer app
  - Increases data quality incentive (API consumers report errors)
  - Creates defensible data moat
  `,

  possibleFeatures: [
    "REST API with OpenAPI spec",
    "API key management portal",
    "Rate limiting per tier",
    "National average endpoint",
    "Regional breakdown endpoint",
    "Station-level price endpoint (Pro)",
    "Historical data endpoint",
    "Webhook for price change events",
    "Usage dashboard for API consumers",
  ],

  successMetrics: [
    "API keys issued",
    "Monthly API calls",
    "API revenue (NOK/month)",
    "Data quality improvement from API consumer feedback",
  ],
};

export default fuelDataApi;