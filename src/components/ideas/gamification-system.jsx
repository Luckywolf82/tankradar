/*
IDEA: gamification-system

Gamification 2.0 — Badges, milestones, progress countdown, and achievement system
Full gamification layer beyond the existing streak counter
*/

export const gamificationSystem = {
  id: "gamification-system",
  title: "Gamification 2.0 — Badges og milepæler",
  category: "gamification",
  status: "candidate",

  summary:
    "A full gamification layer adding persistent badges, milestone progress countdowns, achievement history, and unlock mechanics to reward consistent price contributors.",

  problem:
    "Entry 94 added streak + percentile ranking but stopped short of full gamification. No persistent badges, no progress countdown to next milestone, no achievement history. These are the highest-engagement gamification mechanics.",

  userValue: "medium",
  crowdsourcingImpact: "direct",
  activationImpact: "high",

  complexity: "low",
  dependencies: [
    "contribution-tracking",
    "streak-counter",
    "user-price-history",
  ],

  recommendedAuditTypes: ["product", "activation", "ui"],

  notes: `
Directly addresses Entry 95 remaining engagement gaps:
  - Leaderboard (see driver-leaderboard idea)
  - Reminders / push notifications (separate idea)
  - Badges (THIS IDEA)
  - Countdown to next milestone (THIS IDEA)
  - Milestone persistence (THIS IDEA)

Badge categories:
  1. Contribution badges:
     - "Første rapport" (1st submission)
     - "10 bidrag" / "50 bidrag" / "100 bidrag"
     - "7-dagers streak" / "30-dagers streak"

  2. Quality badges:
     - "Nøyaktig bidragsyter" (high confidence scores)
     - "Lokalkjent" (reports from 5+ different stations)

  3. Savings badges:
     - "Smart bilist" (saved > 100 NOK)
     - "Drivstoff-mester" (saved > 1000 NOK)

  4. Special badges:
     - "Tidlig ute" (reported within 1h of price change)
     - "Flerkjede" (reported at 3+ different chains)

Progress countdown:
  - "Du er 3 bidrag unna neste badge"
  - Persistent widget on profile page

Achievement history:
  - Timeline of earned badges with date
  - Total badges earned counter

MVP:
  - 5 core badges only
  - Progress bar to next badge
  - Badge earned notification (in-app)
  `,

  possibleFeatures: [
    "Badge system with 15+ achievement types",
    "Progress countdown to next milestone",
    "Achievement history timeline",
    "Badge showcase on profile",
    "Badge earned in-app notification",
    "Badge sharing (social)",
    "Streak freeze mechanic (1 per week)",
  ],

  successMetrics: [
    "Badge earn rate per active user",
    "Contribution frequency uplift for badged users",
    "% of users who view achievement history",
    "Progress bar CTR (does countdown drive action?)",
  ],
};

export default gamificationSystem;