/*
IDEA: price-drop-predictor

Når lønner det seg å fylle?
ML-based prediction of upcoming price movements to guide refueling timing
*/

export const priceDropPredictor = {
  id: "price-drop-predictor",
  title: "Når lønner det seg å fylle?",
  category: "pricing",
  status: "candidate",

  summary:
    "ML-based prediction of upcoming price movements to help users decide when to refuel",

  problem:
    "Users want to know if prices will drop soon or if they should fill up now. No existing tool predicts fuel price movements in Norway.",

  userValue: "high",
  crowdsourcingImpact: "none",
  activationImpact: "medium",

  complexity: "high",
  dependencies: [
    "6-months-historical-price-data",
    "statistical-modeling",
    "ml-training-pipeline",
    "national-trend-data",
  ],

  recommendedAuditTypes: ["product", "data", "performance"],

  notes: `
Requires substantial historical data to train effectively. Initial MVP could use simple trend analysis:
- 7-day moving average
- Week-over-week % change
- Alert if price is in bottom 25% of 30-day range

Full ML solution (6-12 month timeline):
- Time-series forecasting (ARIMA, Prophet, or LSTM)
- Seasonal decomposition
- External factors (oil prices, exchange rates, supply)

Data requirements:
- Clean historical pricing from multiple sources
- Regional and national aggregates
- Fuel type normalization

Caution:
- Predictions are uncertain; must show confidence intervals
- Market manipulation risk: if too many users follow same advice
- UI must not oversell accuracy
`,

  possibleFeatures: [
    "Simple 7-day price trend indicator",
    "Prediction confidence level (low/medium/high)",
    "Regional price comparison",
    "Price change alerts (e.g., top 10% increase)",
    "Historical comparison view",
  ],

  successMetrics: [
    "Prediction accuracy vs. actual prices (MAPE)",
    "User engagement with prediction view",
    "Whether users report savings from using predictions",
  ],
};

export default priceDropPredictor;