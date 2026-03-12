/*
IDEA: fuel-price-heatmap

Drivstoffpris-kart
Interactive heatmap showing fuel prices across Norway by region and station
*/

export const fuelPriceHeatmap = {
  id: "fuel-price-heatmap",
  title: "Drivstoffpris-kart",
  category: "maps",
  status: "candidate",

  summary:
    "An interactive map of Norway showing fuel prices by region, with color-coded heat zones and individual station pins for users planning longer trips.",

  problem:
    "Dashboard and statistics pages show prices as lists and charts, but not spatially. Users planning long drives have no visual tool to find cheapest regions to fill up.",

  userValue: "medium",
  crowdsourcingImpact: "indirect",
  activationImpact: "medium",

  complexity: "medium",
  dependencies: [
    "station-coordinates",
    "station-level-prices",
    "regional-fuel-benchmarks",
    "react-leaflet",
  ],

  recommendedAuditTypes: ["product", "ui", "performance"],

  notes: `
Two map modes:

1. Regional heatmap:
   - Color counties by avg price (green = cheap, red = expensive)
   - Data: RegionalFuelBenchmark entity
   - No station-level data required
   - Can be built today with existing data

2. Station-level pins:
   - Individual stations as map markers
   - Color-coded by price vs. regional avg
   - Popup: station name, price, last updated
   - Requires station-level price coverage (partial today)

Technical notes:
   - react-leaflet already installed
   - OpenStreetMap tiles are free
   - Heatmap layer: leaflet.heat plugin
   - Station coordinates: Station entity has lat/lng

MVP:
   - Regional heatmap only (county-level color coding)
   - Uses RegionalFuelBenchmark data
   - Single fuel type selector (gasoline_95 default)
   - No route overlay yet

Phase 2:
   - Add station-level pins when coverage improves
   - Route overlay (show cheapest stations on path)
   - Time slider (price changes over week)
  `,

  possibleFeatures: [
    "Regional heatmap (county-level color coding)",
    "Station-level price pins",
    "Fuel type selector",
    "Time slider (price trend over 7 days)",
    "Route overlay integration",
    "Price delta from national avg overlay",
    "Zoom to user location",
  ],

  successMetrics: [
    "% of users who open map view",
    "Session time on map page",
    "Map → Station detail navigation rate",
    "Map use frequency for long-distance planners",
  ],
};

export default fuelPriceHeatmap;