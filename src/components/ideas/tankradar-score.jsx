/*
IDEA: tankradar-score

TankRadar-score
A personal driver score summarizing smart fueling behavior: savings rate, contribution quality, streak, and community rank
*/

export const tankRadarScore = {
  id: "tankradar-score",
  title: "TankRadar-score",
  category: "gamification",
  status: "candidate",

  summary:
    "A composite personal score that rewards smart fueling behavior: how well you find cheap fuel, how consistently you contribute prices, and how helpful your data is to the community.",

  problem:
    "Current gamification (streak, contribution count) is one-dimensional. A composite score gives users a single motivating number that reflects multiple valuable behaviors.",

  userValue: "medium",
  crowdsourcingImpact: "direct",
  activationImpact: "high",

  complexity: "low",
  dependencies: [
    "contribution-tracking",
    "fuel-savings-tracker",
    "streak-counter",
    "national-benchmark-data",
  ],

  recommendedAuditTypes: ["product", "activation", "ui"],

  notes: `
Score formula (draft):
  score = (savings_score × 0.4) + (contribution_score × 0.4) + (quality_score × 0.2)

  savings_score:
    - Based on avg price paid vs. national avg
    - Normalized 0–100

  contribution_score:
    - Reports submitted in last 30 days
    - Streak multiplier
    - Normalized 0–100

  quality_score:
    - Confidence score of user's submissions
    - Freshness of data contributed
    - Normalized 0–100

Display:
  - Single "TankRadar-score" number (0–1000 or A–S tier)
  - Breakdown: savings / contribution / quality sub-scores
  - Weekly change indicator (+15 this week)
  - Tier system: Bronse / Sølv / Gull / Platinum

Risk:
  - Score gaming: fake submissions to inflate contribution_score
  - Must include quality filter on contribution component
  - Must not reveal score of other users without consent

MVP:
  - Simple version: contribution count + streak only
  - Add savings component once fill-historikk ships
  `,

  possibleFeatures: [
    "Composite TankRadar-score display",
    "Score breakdown (savings / contribution / quality)",
    "Tier system with badges",
    "Weekly score delta",
    "Historical score chart",
    "Score milestone notifications",
    "Anonymous score comparison ('Top 15% in your region')",
  ],

  successMetrics: [
    "% of users engaging with score view",
    "Contribution frequency uplift for scored users",
    "Tier advancement rate",
    "Score correlation with app retention",
  ],
};

export default tankRadarScore;