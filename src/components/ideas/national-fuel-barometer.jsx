/*
IDEA: national-fuel-barometer

Nasjonal drivstoffbarometer
A single-glance national fuel price status indicator — are prices high, normal, or low right now?
*/

export const nationalFuelBarometer = {
  id: "national-fuel-barometer",
  title: "Nasjonal drivstoffbarometer",
  category: "pricing",
  status: "candidate",

  summary:
    "A prominent barometer widget showing whether today's national fuel prices are historically high, normal, or low — giving users instant context before deciding whether to fill up now or wait.",

  problem:
    "Users see a price (e.g., 21.50 NOK/L) but have no immediate context: is this expensive? Normal? A good deal? The barometer answers this at a glance.",

  userValue: "high",
  crowdsourcingImpact: "none",
  activationImpact: "high",

  complexity: "low",
  dependencies: [
    "national-benchmark-data",
    "ssb-historical-data",
    "national-fuel-benchmark-entity",
  ],

  recommendedAuditTypes: ["product", "activation", "ui", "data"],

  notes: `
Barometer logic:
  - Compare today's national avg price to rolling 30-day and 90-day historical range
  - Classify: LOW (bottom 25%), NORMAL (25–75%), HIGH (top 25%)
  - Visual: gauge or traffic light indicator

Data source:
  - NationalFuelBenchmark entity (already exists)
  - SSBData entity (monthly historical, already exists)

Display options:
  1. Gauge meter (speedometer style): Low → Normal → High
  2. Traffic light: red/yellow/green
  3. Text label: "Priser er høye nå — vent om mulig" / "Gode priser nå — fyll gjerne"
  4. Delta label: "+0.45 NOK/L over 30-day avg"

MVP:
  - Simple 3-band classification (low/normal/high) based on 30-day rolling average
  - Show on Dashboard as top-of-page widget or in NearbyPrices header
  - Fuel type: gasoline_95 + diesel

No new data sources required — uses existing benchmark data.

This is the single highest-impact low-effort feature not yet shipped.
  `,

  possibleFeatures: [
    "National price status widget (low/normal/high)",
    "30-day rolling average comparison",
    "Fuel type toggle (95 / diesel)",
    "Historical context tooltip ('In the last year, prices were lower only 20% of the time')",
    "Weekly trend line",
    "Regional barometer (per county)",
    "Price forecast integration (future, links to price-drop-predictor)",
  ],

  successMetrics: [
    "Dashboard engagement uplift after widget added",
    "Barometer CTR (do users tap for more detail)",
    "Session start rate (does barometer drive app opens?)",
    "Retention impact in high/low price periods",
  ],
};

export default nationalFuelBarometer;