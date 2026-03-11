/*
AUDIT FILE
Read-only analysis artifact.

Do not implement fixes inside this file.
Use Execution Log for changes.
See: src/components/governance/Phase25ExecutionLog_*.jsx
*/

/**
 * PRODUCT UTILITY & CROWDSOURCING AUDIT
 * 
 * Date: 2026-03-11
 * Scope: User value, usability, crowdsourcing impact, engagement, development effort
 * Focus: Feature utility scoring, crowdsourcing strategy, CTA optimization
 */

export const PRODUCT_UTILITY_AUDIT = {
  // ────────────────────────────────────────────────────────────────────────
  // CONTEXT
  // ────────────────────────────────────────────────────────────────────────
  
  context: {
    trigger: "Product planning: maximize usability, crowdsourcing participation, and user engagement",
    relationship: "Complements Entries 83–85 (inventory/value/tier); Entry 86 adds product utility + crowdsourcing lens",
    methodology: "Dimension-based scoring (0–3 scale) on 5 axes; classification into BUILD/IMPROVE/DEFER/REMOVE",
    goal: "Identify which features to prioritize for MVP + Phase 2; establish crowdsourcing strategy"
  },

  // ────────────────────────────────────────────────────────────────────────
  // SCORING DIMENSIONS & SCALE
  // ────────────────────────────────────────────────────────────────────────

  scoringDimensions: {
    USER_VALUE: {
      description: "Does this function solve a real, important user problem?",
      0: "No clear value; feels like bloat",
      1: "Niche value; solves a problem for few users",
      2: "Real value; solves important problem for many users",
      3: "Critical value; core to user journey"
    },
    EASE_OF_USE: {
      description: "How simple is the interaction for average user?",
      0: "Confusing; requires explanation; high friction",
      1: "Somewhat intuitive; requires learning curve",
      2: "Intuitive; most users can figure it out",
      3: "Frictionless; obvious what to do"
    },
    CROWDSOURCING_IMPACT: {
      description: "Does this function increase price submissions or confirmations?",
      0: "No crowdsourcing value; passive consumption only",
      1: "Indirect crowdsourcing value; enables but doesn't incentivize",
      2: "Clear crowdsourcing value; incentivizes participation",
      3: "Multiplicative crowdsourcing value; core to participation strategy"
    },
    ENGAGEMENT: {
      description: "Does this function increase daily active users or return visits?",
      0: "One-time use; no reason to return",
      1: "Low engagement; occasional return visits",
      2: "Good engagement; reason to check weekly",
      3: "High engagement; reason to check daily"
    },
    DEVELOPMENT_EFFORT: {
      description: "Estimated complexity (lower = easier)",
      0: "Minimal effort; polish only",
      1: "Low effort; one component, straightforward logic",
      2: "Medium effort; multiple components, moderate complexity",
      3: "High effort; complex logic, many dependencies"
    }
  },

  // ────────────────────────────────────────────────────────────────────────
  // FUNCTION UTILITY INVENTORY & SCORING
  // ────────────────────────────────────────────────────────────────────────

  functionUtilityInventory: [
    {
      functionName: "Dashboard Hub Page",
      location: "pages/Dashboard.jsx + 6 sub-cards",
      purpose: "Central entry point; price discovery, quick reporting, nearby prices, alert preview",
      currentCompleteness: "100%",
      scores: {
        USER_VALUE: 3,
        EASE_OF_USE: 3,
        CROWDSOURCING_IMPACT: 3,
        ENGAGEMENT: 3,
        DEVELOPMENT_EFFORT: 0
      },
      totalScore: 12,
      classification: "BUILD_NOW (maintain + enhance CTAs)",
      rationale: "Hub page defining product identity; all cards complete; highest utility across all dimensions; crowdsourcing driver via SubmitPriceCard CTA"
    },

    {
      functionName: "LogPrice 4-Step Contribution Flow",
      location: "pages/LogPrice.jsx (StationPicker → PhotoCapture → ConfirmPrice → OptimisticSuccess)",
      purpose: "Primary crowdsourcing mechanism; user price submission with AI + station matching",
      currentCompleteness: "100%",
      scores: {
        USER_VALUE: 3,
        EASE_OF_USE: 2,
        CROWDSOURCING_IMPACT: 3,
        ENGAGEMENT: 2,
        DEVELOPMENT_EFFORT: 0
      },
      totalScore: 10,
      classification: "BUILD_NOW (optimize for ease of use; reduce friction)",
      rationale: "Core crowdsourcing pipeline; 4-step flow could be simplified (3 steps?); needs CTA optimization; PhotoCapture + AI extraction great UX"
    },

    {
      functionName: "PumpModeCard (Proximity Detection)",
      location: "Dashboard card",
      purpose: "Trigger nearby station discovery when user is within 150m of a gas station",
      currentCompleteness: "100%",
      scores: {
        USER_VALUE: 2,
        EASE_OF_USE: 3,
        CROWDSOURCING_IMPACT: 2,
        ENGAGEMENT: 2,
        DEVELOPMENT_EFFORT: 0
      },
      totalScore: 9,
      classification: "BUILD_NOW (promote in nav; add onboarding)",
      rationale: "Contextual discovery; good UX; drives users to LogPrice when near station; could be better promoted with onboarding"
    },

    {
      functionName: "SubmitPriceCard CTA",
      location: "Dashboard card (conditional on !pumpModeActive)",
      purpose: "Quick link to LogPrice; primary crowdsourcing entry point",
      currentCompleteness: "100%",
      scores: {
        USER_VALUE: 3,
        EASE_OF_USE: 3,
        CROWDSOURCING_IMPACT: 3,
        ENGAGEMENT: 1,
        DEVELOPMENT_EFFORT: 0
      },
      totalScore: 10,
      classification: "BUILD_NOW (optimize visual prominence; test CTA variants)",
      rationale: "Direct entry to crowdsourcing; strongest CTA on Dashboard; needs A/B testing for button text/color/position"
    },

    {
      functionName: "ContributionImpactCard",
      location: "Dashboard card",
      purpose: "Gamification: show user stats (drivers helped, fuel savings estimated)",
      currentCompleteness: "100%",
      scores: {
        USER_VALUE: 2,
        EASE_OF_USE: 3,
        CROWDSOURCING_IMPACT: 2,
        ENGAGEMENT: 2,
        DEVELOPMENT_EFFORT: 0
      },
      totalScore: 9,
      classification: "IMPROVE_EXISTING (strengthen gamification; add leaderboard teaser)",
      rationale: "Motivates repeat submissions; could be enhanced with weekly/monthly goals, streak tracking, or leaderboard preview"
    },

    {
      functionName: "RouteSavingsCard",
      location: "Dashboard card (conditional on !pumpModeActive)",
      purpose: "Show cheapest alternative within 15km; estimate fuel savings",
      currentCompleteness: "100%",
      scores: {
        USER_VALUE: 2,
        EASE_OF_USE: 3,
        CROWDSOURCING_IMPACT: 0,
        ENGAGEMENT: 1,
        DEVELOPMENT_EFFORT: 0
      },
      totalScore: 6,
      classification: "DEFER (secondary feature; no crowdsourcing value)",
      rationale: "Useful for comparison shopping; but passive consumption only; no contribution incentive; defer to Phase 2 if space tight"
    },

    {
      functionName: "RadarCard (Nearby Prices)",
      location: "Dashboard card",
      purpose: "Display nearby fuel prices with fuel type selector",
      currentCompleteness: "100%",
      scores: {
        USER_VALUE: 3,
        EASE_OF_USE: 3,
        CROWDSOURCING_IMPACT: 1,
        ENGAGEMENT: 2,
        DEVELOPMENT_EFFORT: 0
      },
      totalScore: 9,
      classification: "BUILD_NOW (add crowdsourcing prompt; link to price confirmation)",
      rationale: "Core discovery feature; high value; could drive crowdsourcing if 'Confirm this price' button linked to LogPrice"
    },

    {
      functionName: "ActiveAlertsPreview",
      location: "Dashboard card",
      purpose: "Show top 5 geographic price alerts with CTA to PriceAlerts page",
      currentCompleteness: "100%",
      scores: {
        USER_VALUE: 2,
        EASE_OF_USE: 3,
        CROWDSOURCING_IMPACT: 0,
        ENGAGEMENT: 1,
        DEVELOPMENT_EFFORT: 0
      },
      totalScore: 6,
      classification: "IMPROVE_EXISTING (convert to engagement driver; add alert-triggered price confirmation flow)",
      rationale: "Preview works; but low engagement; could be enhanced by linking 'Price found!' alerts to quick confirmation flow"
    },

    {
      functionName: "Statistics Dashboard (3 Charts)",
      location: "pages/Statistics.jsx",
      purpose: "Show market trends (12-month history, price distribution, regional comparison)",
      currentCompleteness: "100%",
      scores: {
        USER_VALUE: 2,
        EASE_OF_USE: 3,
        CROWDSOURCING_IMPACT: 0,
        ENGAGEMENT: 1,
        DEVELOPMENT_EFFORT: 0
      },
      totalScore: 6,
      classification: "DEFER (credibility feature, not crowdsourcing driver)",
      rationale: "Good for transparency; no direct engagement or crowdsourcing value; defer to Phase 2 if space tight"
    },

    {
      functionName: "PriceAlerts (Geographic Alerts)",
      location: "pages/PriceAlerts.jsx",
      purpose: "Create geographic price alerts (lat/lon + radius + threshold)",
      currentCompleteness: "100%",
      scores: {
        USER_VALUE: 2,
        EASE_OF_USE: 2,
        CROWDSOURCING_IMPACT: 1,
        ENGAGEMENT: 1,
        DEVELOPMENT_EFFORT: 0
      },
      totalScore: 6,
      classification: "DEFER (secondary feature; could be simplified for MVP)",
      rationale: "Full-featured CRUD; but low priority for MVP; geo-based setup is friction point; defer or simplify to pre-set radius options"
    },

    {
      functionName: "Notifications (Alert History)",
      location: "pages/Notifications.jsx",
      purpose: "View triggered alert events with savings extraction",
      currentCompleteness: "90%",
      scores: {
        USER_VALUE: 1,
        EASE_OF_USE: 3,
        CROWDSOURCING_IMPACT: 0,
        ENGAGEMENT: 0,
        DEVELOPMENT_EFFORT: 0
      },
      totalScore: 4,
      classification: "REMOVE (low utility; replace with simple in-app toasts)",
      rationale: "Alert history is nice-to-have; does not drive engagement or crowdsourcing; user prefers real-time toast notification"
    },

    {
      functionName: "Profile Account Hub",
      location: "pages/Profile.jsx",
      purpose: "View account info, contribution stats, privacy settings, app shortcuts",
      currentCompleteness: "100%",
      scores: {
        USER_VALUE: 2,
        EASE_OF_USE: 3,
        CROWDSOURCING_IMPACT: 0,
        ENGAGEMENT: 1,
        DEVELOPMENT_EFFORT: 0
      },
      totalScore: 6,
      classification: "BUILD_NOW (maintain; add engagement hooks like weekly/monthly stats)",
      rationale: "Expected UX pattern; could be enhanced with temporal stats (weekly/monthly) to drive repeat visits"
    },

    {
      functionName: "Settings (Account Management)",
      location: "pages/Settings.jsx",
      purpose: "Account deletion (stubbed), app info",
      currentCompleteness: "40%",
      scores: {
        USER_VALUE: 0,
        EASE_OF_USE: 1,
        CROWDSOURCING_IMPACT: 0,
        ENGAGEMENT: 0,
        DEVELOPMENT_EFFORT: 2
      },
      totalScore: 3,
      classification: "REMOVE (from MVP; defer account deletion entirely)",
      rationale: "Broken UI (deletion TODO); no crowdsourcing value; defer account management to Phase 2"
    }
  ],

  // ────────────────────────────────────────────────────────────────────────
  // CLASSIFICATION SUMMARY
  // ────────────────────────────────────────────────────────────────────────

  classificationSummary: {
    BUILD_NOW: [
      "Dashboard Hub Page (maintain + enhance CTAs)",
      "LogPrice 4-Step Flow (optimize ease of use; reduce friction)",
      "PumpModeCard (promote in nav; add onboarding)",
      "SubmitPriceCard CTA (optimize visual prominence; test variants)",
      "RadarCard (add crowdsourcing prompt; link to confirmation flow)",
      "Profile (maintain; add temporal stats)"
    ],

    IMPROVE_EXISTING: [
      "ContributionImpactCard (strengthen gamification; add leaderboard preview)",
      "ActiveAlertsPreview (convert to engagement driver; link to confirmation flow)"
    ],

    DEFER: [
      "RouteSavingsCard (secondary feature; no crowdsourcing value)",
      "Statistics Dashboard (credibility feature; no engagement value)",
      "PriceAlerts (secondary feature; simplify geo setup or defer)"
    ],

    REMOVE: [
      "Notifications (replace with simple in-app toasts)",
      "Settings (remove from MVP; defer account deletion)"
    ]
  },

  // ────────────────────────────────────────────────────────────────────────
  // TOP 5 FEATURES FOR CROWDSOURCING + ENGAGEMENT + USEFULNESS
  // ────────────────────────────────────────────────────────────────────────

  top5FeaturesForCrowdsourcing: [
    {
      rank: 1,
      feature: "LogPrice 4-Step Flow",
      crowdsourcing_value: "Direct price submission + AI extraction + station matching",
      engagement_value: "Daily/weekly usage for contributors",
      usefulness_value: "Core to data quality; enables crowdsourcing",
      recommendation: "OPTIMIZE: Reduce steps (3 instead of 4?); strengthen AI extraction reliability; add weekly contribution goals"
    },
    {
      rank: 2,
      feature: "SubmitPriceCard CTA",
      crowdsourcing_value: "Primary entry point to contribution flow",
      engagement_value: "Daily visibility on Dashboard; strongest prompt",
      usefulness_value: "Direct link to crowdsourcing; critical CTA",
      recommendation: "A/B TEST: Button text ('Rapporter pris' vs 'Jeg vet prisen'), color (green vs blue), position (top vs bottom)"
    },
    {
      rank: 3,
      feature: "ContributionImpactCard Gamification",
      crowdsourcing_value: "Motivates repeat submissions via impact feedback",
      engagement_value: "Weekly/monthly leaderboards, streaks, badges",
      usefulness_value: "Drives long-term user retention",
      recommendation: "ENHANCE: Add weekly streak counter; add achievement badges; preview leaderboard; send weekly summary email"
    },
    {
      rank: 4,
      feature: "PumpModeCard (Proximity Detection)",
      crowdsourcing_value: "Contextual trigger to LogPrice when near station",
      engagement_value: "Location-aware; prompts submission at right moment",
      usefulness_value: "Natural UX; reduces friction for in-app submissions",
      recommendation: "PROMOTE: Add onboarding tour; surface in nav; enable push notification when near alert location"
    },
    {
      rank: 5,
      feature: "RadarCard + Price Confirmation Flow",
      crowdsourcing_value: "Link from viewing nearby prices to confirming/correcting prices",
      engagement_value: "Low-friction confirmation (not full submission)",
      usefulness_value: "Enables crowdsourced verification of existing data",
      recommendation: "NEW: Add 'Confirm' button to each price row; link to 1-step confirmation flow (confirm existing price or suggest correction)"
    }
  ],

  top5FeaturesForDailyUsage: [
    "Dashboard (hub; multiple entry points)",
    "PumpModeCard (contextual trigger when near station)",
    "RadarCard (discovery; fuel type filter)",
    "ContributionImpactCard (weekly/monthly goals drive return visits)",
    "Notifications (if upgraded from current; use push to drive daily opens)"
  ],

  top5FeaturesForPerceivedUsefulness: [
    "LogPrice (enable users to contribute directly)",
    "RadarCard (show nearby alternatives; help users save money)",
    "Statistics Dashboard (build trust via transparency)",
    "PriceAlerts (monitoring for price drops)",
    "ContributionImpactCard (gamification; show user impact)"
  ],

  // ────────────────────────────────────────────────────────────────────────
  // DASHBOARD CTA STRATEGY
  // ────────────────────────────────────────────────────────────────────────

  dashboardCtaStrategy: {
    context: "Dashboard is the hub; every user starts here; CTA effectiveness directly drives crowdsourcing participation",

    primary_cta_hierarchy: {
      position_1_strongest: {
        name: "SubmitPriceCard",
        cta_text: "[Test variants: 'Rapporter pris' vs 'Jeg vet prisen' vs 'Logg pris']",
        visual_prominence: "Above-the-fold, high contrast button (green vs current color)",
        psychology: "Ownership language ('Jeg vet') vs action language ('Rapporter') — A/B test",
        placement_recommendation: "Keep at top of Dashboard below header"
      },

      position_2_context_dependent: {
        name: "PumpModeCard (proximity detection) OR RouteSavingsCard",
        context: "Show PumpModeCard when user is within 150m of station (via GPS); show RouteSavingsCard otherwise",
        rationale: "Context-aware UX; PumpModeCard is timely when relevant; RouteSavingsCard is passive alternative"
      },

      position_3_discovery: {
        name: "RadarCard",
        cta_expansion: "Add 'Confirm' button per price row; link to 1-step confirmation flow",
        rationale: "Low-friction crowdsourcing; users can confirm/correct existing prices without full submission"
      },

      position_4_motivation: {
        name: "ContributionImpactCard",
        visual_placement: "Sticky or above-the-fold during first 10 app opens; then move lower",
        rationale: "Motivate early; gamification drives repeat submissions"
      }
    },

    cta_optimization_recommendations: [
      {
        tactic: "A/B TEST BUTTON TEXT",
        variants: [
          "'Rapporter pris' (neutral, action-oriented)",
          "'Jeg vet prisen' (ownership, empowering)",
          "'Del prisinfo' (sharing, communal)"
        ],
        metric: "Tap-through rate to LogPrice"
      },
      {
        tactic: "A/B TEST BUTTON COLOR",
        variants: [
          "Green (current primary color; suggests 'go' action)",
          "Blue (secondary color; different visual weight)",
          "Gradient (visual emphasis; higher contrast)"
        ],
        metric: "Tap-through rate + scroll engagement"
      },
      {
        tactic: "A/B TEST BUTTON POSITION",
        variants: [
          "Top of Dashboard (current)",
          "Below PumpModeCard (contextual)",
          "Floating button (sticky; always visible)"
        ],
        metric: "Tap-through rate + session length"
      },
      {
        tactic: "ADD MOMENTUM MESSAGING",
        copy: "Sample: 'X nye priser denne uken | Du kan hjelpe' (social proof + personal agency)",
        placement: "Above SubmitPriceCard CTA",
        metric: "CTA effectiveness; conversion lift"
      },
      {
        tactic: "IMPLEMENT SEGMENTATION",
        segments: [
          "New users (0–7 days): Show onboarding flow; guide to LogPrice with tutorial",
          "Engaged users (8–30 days): Show streaks, weekly goals, leaderboard preview",
          "Power users (30+ days): Show weekly summary, badges, invite-friend CTA"
        ],
        metric: "Retention; repeat submission rate"
      }
    ],

    cta_flow_optimization: {
      current_flow: "Dashboard SubmitPriceCard CTA → LogPrice.jsx (4-step flow) → Success screen",
      optimization_1: "Reduce LogPrice steps from 4 to 3: eliminate redundant confirmation screen; merge into single flow",
      optimization_2: "Add 1-step confirmation flow: 'Confirm' button on RadarCard prices → quick (yes/no/correct) → OptimisticSuccess",
      optimization_3: "Context-aware CTA: Show PumpModeCard CTA when near station (≤150m); otherwise show SubmitPriceCard CTA"
    },

    success_metrics: {
      engagement: "Daily active users opening Dashboard; avg session length",
      crowdsourcing: "Daily/weekly new price submissions; confirmation rate",
      retention: "7-day, 30-day return rate; repeat contributor rate",
      cta_effectiveness: "SubmitPriceCard CTA tap-through rate; LogPrice completion rate"
    }
  },

  // ────────────────────────────────────────────────────────────────────────
  // PRODUCT RECOMMENDATIONS FOR MVP + PHASE 2
  // ────────────────────────────────────────────────────────────────────────

  productRecommendations: {
    mvp_focus: [
      "FOCUS on Dashboard + LogPrice as primary CTA drivers",
      "A/B TEST SubmitPriceCard CTA text, color, position",
      "IMPLEMENT PumpModeCard onboarding; surface in early-use phase",
      "ADD 'Confirm price' flow to RadarCard (1-step confirmation without full LogPrice)",
      "ENHANCE ContributionImpactCard with weekly/monthly goals + streak tracking",
      "REMOVE Notifications page; use simple in-app toasts instead",
      "DEFER PriceAlerts if time tight (secondary feature)"
    ],

    phase_2_roadmap: [
      "LEADERBOARD: Weekly/monthly contributor rankings with badges",
      "PUSH NOTIFICATIONS: Alert on price drop at favorite stations; prompt LogPrice submission when near station",
      "GAMIFICATION: Achievement badges (First submission, 10x contributor, etc.); weekly streaks",
      "EMAIL SUMMARY: Weekly contribution summary (prices reported, drivers helped, fuel saved)",
      "SOCIAL: Invite friends; share contribution stats",
      "ADVANCED STATISTICS: Personal contribution history; coverage map (heatmap of reported prices)",
      "ACCOUNT MANAGEMENT: Full deletion flow (defer to Phase 2)"
    ]
  },

  // ────────────────────────────────────────────────────────────────────────
  // AUDIT METADATA
  // ────────────────────────────────────────────────────────────────────────

  auditMetadata: {
    timestamp: "2026-03-11T18:15:00Z",
    auditor: "Base44 AI Agent",
    scope: "Product utility, usability, crowdsourcing impact, engagement, development effort",
    method: "5-dimension scoring matrix; feature classification; CTA analysis",
    functions_scored: 12,
    scoring_dimensions: 5,
    status: "COMPLETE",
    compliance: "✓ READ-ONLY audit; no code changes; no frozen files modified"
  }
};

export default PRODUCT_UTILITY_AUDIT;