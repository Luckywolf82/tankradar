/*
IDEA: fuel-savings-tracker

Hvor mye har du spart?
Calculate estimated savings from using TankRadar prices vs. national average
*/

export const fuelSavingsTracker = {
  id: "fuel-savings-tracker",
  title: "Hvor mye har du spart?",
  category: "engagement",
  status: "candidate",

  summary:
    "Show users estimated fuel cost savings from using TankRadar prices instead of national averages",

  problem:
    "Users don't see the concrete ROI of price reporting. Making savings visible increases perceived value and app stickiness.",

  userValue: "high",
  crowdsourcingImpact: "indirect",
  activationImpact: "high",

  complexity: "low",
  dependencies: [
    "user-price-history",
    "national-benchmark-data",
    "user-refuel-tracking",
  ],

  recommendedAuditTypes: ["product", "activation", "ui"],

  notes: `
Simple MVP approach:

1. Estimated savings calculation:
   savings = (national_avg - actual_price) × fuel_purchased_liters

2. Baseline data:
   - User's reported prices
   - National average (from GlobalPetrolPrices or SSB)
   - Total liters reported

3. Display:
   - Total savings (all-time)
   - Monthly savings trend
   - Per-tank savings estimate
   - Savings per month (annualized)

4. Gamification:
   - Milestone unlocks (10 €, 100 €, 1000 €)
   - Savings streaks: consecutive days/weeks of "good deals"
   - Comparison: "You save more than X% of TankRadar users"

Assumptions to make explicit:
- Assume 50L tank (user-configurable)
- Assume usage pattern (km/month → fuel/month)
- Assume user always fills at cheapest available station

Cautions:
- Don't overstate savings: include caveats
- Acknowledge national average may not be user's baseline
- Explain methodology transparently
- Allow user to input actual km/consumption
`,

  possibleFeatures: [
    "Total lifetime savings display",
    "Monthly/weekly savings breakdown",
    "Savings per tank estimate",
    "Annualized savings projection",
    "Milestone badges (€10, €100, €1000 saved)",
    "Comparison to average user savings",
    "Shareable savings summary (social)",
    "Detailed calculation breakdown (show assumptions)",
  ],

  successMetrics: [
    "% of users viewing savings tracker",
    "User engagement with savings view (repeat views)",
    "Impact on app retention (correlation with savings visibility)",
    "Social share rate of savings milestones",
  ],
};

export default fuelSavingsTracker;