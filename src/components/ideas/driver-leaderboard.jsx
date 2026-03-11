/*
IDEA: driver-leaderboard

Lokal bidragsrangering for drivstoffpriser
Show top contributors by region / city with streak counters and badges
*/

export const driverLeaderboard = {
  id: "driver-leaderboard",
  title: "Lokal bidragsrangering for drivstoffpriser",
  category: "gamification",
  status: "candidate",

  summary:
    "Display top price contributors by region/city with contribution streaks and achievement badges to drive engagement",

  problem:
    "No social incentive currently exists for consistent price contributions. Leaderboards can drive engagement and normalize participation.",

  userValue: "low",
  crowdsourcingImpact: "direct",
  activationImpact: "high",

  complexity: "low",
  dependencies: [
    "contribution-tracking",
    "user-profiles",
    "regional-segmentation",
    "streak-calculation",
  ],

  recommendedAuditTypes: ["product", "activation", "ui"],

  notes: `
⚠️ PRIVACY & FAIRNESS CONSIDERATIONS:

1. Anonymization:
   - Display usernames or initials only
   - Do not reveal full names
   - Do not expose location patterns
   - Allow users to opt out of leaderboard display

2. Fairness:
   - Contribution quality matters, not just quantity
   - Prevent gaming: same station multiple times
   - Weight by data freshness (recent > old)
   - Regional segmentation: local drivers vs. travelers

3. Streak mechanics:
   - Define contribution window (daily, weekly)
   - Break streak only if no contributions in window
   - Show broken streak count (psychology: restart motivation)
   - Public streak only if user opts in

Recommendations for MVP:
- Start with regional (county-level) leaderboards
- Show only top 10-20 contributors
- Opt-in display (default: hidden)
- Contribution count: weight by data freshness
- Streaks: rolling 7-day contribution window

Risk: 
- Potential for location de-anonymization (rare contributor in small area)
- May discourage low-engagement users ("leaderboard fatigue")
- Requires clear privacy statement
`,

  possibleFeatures: [
    "Regional leaderboards (by county, city, area)",
    "7-day streak tracking with restart incentive",
    "Achievement badges: 10 contributions, 30-day streak, etc.",
    "Monthly prize pool (discount codes, app features)",
    "Opt-in display: users control visibility",
    "Peer comparison: 'You've contributed more than 80% of users'",
  ],

  successMetrics: [
    "% of active contributors on leaderboard",
    "Repeat contribution rate (week-over-week)",
    "Engagement with leaderboard view (CTR, session time)",
    "Badge achievement rates",
  ],
};

export default driverLeaderboard;