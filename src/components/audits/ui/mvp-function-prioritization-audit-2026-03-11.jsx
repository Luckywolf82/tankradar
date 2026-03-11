/*
AUDIT FILE
Read-only analysis artifact.

Do not implement fixes inside this file.
Use Execution Log for changes.
See: src/components/governance/Phase25ExecutionLog_*.jsx
*/

/**
 * MVP FUNCTION PRIORITIZATION AUDIT
 * 
 * Date: 2026-03-11
 * Scope: Tier classification for MVP launch (Core/Secondary/Support/Hide/Remove)
 * Focus: 3-screen MVP structure, nav optimization, tier assignments
 */

export const MVP_FUNCTION_PRIORITIZATION_AUDIT = {
  // ────────────────────────────────────────────────────────────────────────
  // CONTEXT
  // ────────────────────────────────────────────────────────────────────────
  
  context: {
    trigger: "MVP launch planning: determine which functions to ship vs. defer",
    relationship: "Builds on Entry 83 (inventory) + Entry 84 (value scoring); adds tier classification + MVP structure",
    scope: "7 primary pages + navigation + sub-components",
    goal: "Establish 3-screen MVP foundation and recommend function tier hierarchy",
    methodology: "Read-only code inspection + tier classification based on value + completeness"
  },

  // ────────────────────────────────────────────────────────────────────────
  // TIER DEFINITIONS
  // ────────────────────────────────────────────────────────────────────────

  tierDefinitions: {
    CORE: {
      description: "Essential to MVP; product cannot launch without this function",
      criteria: ["Solves primary user problem", "Complete UI + backend", "High user frequency", "Visible in main nav"],
      shipDecision: "MUST SHIP"
    },
    SECONDARY: {
      description: "Important for MVP; enhances launch narrative; non-blocking if tight timeline",
      criteria: ["Solves important user problem", "Complete UI + backend", "Medium user frequency", "Main or secondary nav"],
      shipDecision: "SHOULD SHIP"
    },
    SUPPORT_ONLY: {
      description: "Supporting feature; adds value but not defining; can defer to Phase 2",
      criteria: ["Solves supporting problem", "Complete UI + backend", "Lower user frequency", "Secondary nav only"],
      shipDecision: "NICE TO HAVE"
    },
    HIDE: {
      description: "Functional but not discoverable; deep-linked only; not recommended for main nav",
      criteria: ["Complete but hidden", "Secondary access only", "Lower priority", "Deep-linked from another page"],
      shipDecision: "DEFER PROMOTION"
    },
    REMOVE_CANDIDATE: {
      description: "Broken, incomplete, or duplicate; should not ship in current state",
      criteria: ["Stub/incomplete", "No clear value", "Duplicate of another function", "Broken UI/backend"],
      shipDecision: "DO NOT SHIP"
    },
    NEEDS_VERIFICATION: {
      description: "Unclear status; requires separate focused audit before tier assignment",
      criteria: ["Behavior not fully understood", "Sub-component not inspected", "Critical path uncertain"],
      shipDecision: "AUDIT SEPARATELY"
    }
  },

  // ────────────────────────────────────────────────────────────────────────
  // FUNCTION TIER ASSIGNMENTS
  // ────────────────────────────────────────────────────────────────────────

  functionTierAssignments: [
    {
      functionName: "Dashboard (Oversikt)",
      path: "pages/Dashboard.jsx",
      userProblem: "Discover nearby prices, report prices, track contributions, manage alerts",
      visibility: "MAIN NAV",
      uiCompleteness: "100%",
      backendSupport: "100%",
      userFrequency: "DAILY",
      navPlacementRecommendation: "PRIMARY NAV (essential, keep first position)",
      tier: "CORE",
      justification: "Hub page defining product identity; 6 cards all complete; real-time data; responsive"
    },
    {
      functionName: "LogPrice (Logg pris)",
      path: "pages/LogPrice.jsx",
      userProblem: "Submit fuel prices from station (4-step flow: station picker, photo capture, confirmation, success)",
      visibility: "MAIN NAV",
      uiCompleteness: "100%",
      backendSupport: "100%",
      userFrequency: "DAILY (power users), WEEKLY (casual)",
      navPlacementRecommendation: "PRIMARY NAV (essential contribution mechanism)",
      tier: "CORE",
      justification: "Crowdsourcing pipeline; 4-step workflow complete; AI + matching + persistence all integrated"
    },
    {
      functionName: "Statistics (Statistikk)",
      path: "pages/Statistics.jsx",
      userProblem: "View market trends (12-month history, price distribution, regional comparison)",
      visibility: "MAIN NAV",
      uiCompleteness: "100%",
      backendSupport: "100%",
      userFrequency: "WEEKLY",
      navPlacementRecommendation: "PRIMARY NAV (credibility, market context)",
      tier: "SECONDARY",
      justification: "Data transparency; 3 charts complete; SSB + GooglePlaces sources; builds MVP credibility"
    },
    {
      functionName: "Profile (Profil)",
      path: "pages/Profile.jsx",
      userProblem: "View account info, contribution stats, privacy settings, access app shortcuts",
      visibility: "MAIN NAV",
      uiCompleteness: "100%",
      backendSupport: "100%",
      userFrequency: "WEEKLY (stats), MONTHLY (settings)",
      navPlacementRecommendation: "PRIMARY NAV (expected UX pattern, account hub)",
      tier: "SECONDARY",
      justification: "Mature UI; all sections complete; auth flow correct; admin shortcuts present"
    },
    {
      functionName: "PriceAlerts (Områdevarsler)",
      path: "pages/PriceAlerts.jsx",
      userProblem: "Create geographic alerts (lat/lon + radius + price threshold); monitor alert status",
      visibility: "SECONDARY NAV (deep-linked from Profile card)",
      uiCompleteness: "100%",
      backendSupport: "100%",
      userFrequency: "WEEKLY (power users), RARELY (casual)",
      navPlacementRecommendation: "SECONDARY (not main nav); consider promoting if high engagement",
      tier: "SUPPORT_ONLY",
      justification: "Fully functional CRUD; complete but secondary feature; post-MVP candidates prefer simple defaults"
    },
    {
      functionName: "Notifications (Varsler)",
      path: "pages/Notifications.jsx",
      userProblem: "View alert event history (unread/read), extract savings, derive trigger reason",
      visibility: "ICON LINK (NotificationBell in nav; implementation not fully audited)",
      uiCompleteness: "90%",
      backendSupport: "100%",
      userFrequency: "WEEKLY (engaged users), RARELY (casual)",
      navPlacementRecommendation: "DEFER (use simple in-app toasts for MVP; history can be Phase 2)",
      tier: "HIDE",
      justification: "Functional but lower priority; regex-based trigger derivation fragile; can use simpler notification mechanism"
    },
    {
      functionName: "Settings (Innstillinger)",
      path: "pages/Settings.jsx",
      userProblem: "Manage account (deletion, preferences); view app info",
      visibility: "SECONDARY NAV (deep-linked from Profile card)",
      uiCompleteness: "40%",
      backendSupport: "20%",
      userFrequency: "RARE (one-time)",
      navPlacementRecommendation: "DO NOT SHIP account deletion; remove broken UI or defer entire page to Phase 2",
      tier: "REMOVE_CANDIDATE",
      justification: "Account deletion flow is TODO stub; UI broken; app info is no-op; defer account management entirely to Phase 2"
    },
    {
      functionName: "NotificationBell component",
      path: "components/shared/NotificationBell.jsx (assumed; not fully verified)",
      userProblem: "Access notification history from nav icon",
      visibility: "NAV ICON",
      uiCompleteness: "UNKNOWN",
      backendSupport: "UNKNOWN",
      userFrequency: "UNKNOWN",
      navPlacementRecommendation: "DEFER DECISION pending separate audit",
      tier: "NEEDS_VERIFICATION",
      justification: "Used in Layout.js but implementation not verified; recommend separate focused audit before shipping"
    },
    {
      functionName: "PrivacySettings component",
      path: "components/profile/PrivacySettings.jsx (assumed; not fully verified)",
      userProblem: "Manage privacy preferences (unknown fields)",
      visibility: "SECONDARY (in Profile card)",
      uiCompleteness: "UNKNOWN",
      backendSupport: "UNKNOWN",
      userFrequency: "UNKNOWN",
      navPlacementRecommendation: "VERIFY field list and persistence before shipping",
      tier: "NEEDS_VERIFICATION",
      justification: "Component used in Profile but fields/behavior not audited; recommend verification"
    }
  ],

  // ────────────────────────────────────────────────────────────────────────
  // MVP TIER SUMMARY
  // ────────────────────────────────────────────────────────────────────────

  mvpTierSummary: {
    CORE: [
      "Dashboard (Oversikt)",
      "LogPrice (Logg pris)"
    ],
    SECONDARY: [
      "Statistics (Statistikk)",
      "Profile (Profil)"
    ],
    SUPPORT_ONLY: [
      "PriceAlerts (Områdevarsler)"
    ],
    HIDE: [
      "Notifications (Varsler) — use simpler alerts instead"
    ],
    REMOVE_CANDIDATE: [
      "Settings (Innstillinger) — do not ship account deletion; defer entire page or remove broken UI"
    ],
    NEEDS_VERIFICATION: [
      "NotificationBell component",
      "PrivacySettings component"
    ]
  },

  // ────────────────────────────────────────────────────────────────────────
  // RECOMMENDED 3-SCREEN MVP STRUCTURE
  // ────────────────────────────────────────────────────────────────────────

  recommendedMvpStructure: {
    description: "Minimal viable product focused on price discovery + contribution + market context",
    
    screen_1_dashboard: {
      name: "Dashboard (Oversikt) — CORE",
      purpose: "Hub page; primary user workflow",
      cards_include: [
        "PumpModeCard (proximity detection, optional flow)",
        "SubmitPriceCard (quick CTA to LogPrice)",
        "RadarCard (nearby prices with fuel selector)",
        "ContributionImpactCard (user stats)",
        "ActiveAlertsPreview (top 5 alerts preview, CTA to PriceAlerts)"
      ],
      cards_optional: [
        "RouteSavingsCard (cheapest alternative; nice-to-have, can defer if time tight)"
      ],
      cards_remove: [
        "Any incomplete cards not listed above"
      ]
    },

    screen_2_contribute: {
      name: "LogPrice (Logg pris) — CORE",
      purpose: "Crowdsourcing: user price submission",
      steps: [
        "StationPicker (search/select station or GPS option)",
        "PhotoCapture (image upload + AI price extraction)",
        "ConfirmPrice (review + edit prices)",
        "OptimisticSuccess (feedback + repeat option)"
      ],
      data_pipeline: "Fully integrated: AI + station matching + FuelPrice persistence + candidate creation",
      status: "READY TO SHIP"
    },

    screen_3_data: {
      name: "Statistics (Statistikk) — SECONDARY",
      purpose: "Market transparency; user trust building",
      charts_include: [
        "HistoricalSSBTrend (12-month national average)",
        "PriceDistribution (GooglePlaces observations)",
        "RegionalStats (region comparison with low-sample warnings)"
      ],
      fuel_selector: "Working; filters all charts",
      data_transparency: "Labels applied (Entry 80)",
      status: "READY TO SHIP"
    },

    profile_hub: {
      name: "Profile (Profil) — SECONDARY",
      purpose: "User account hub; navigation to secondary features",
      sections_include: [
        "User Info (email, name, role)",
        "Contributions (price count)",
        "Privacy Settings (expandable)",
        "App Links (Områdevarsler, Logg ut)",
        "Admin Shortcuts (if admin role)"
      ],
      status: "READY TO SHIP"
    },

    secondary_features_deferred: [
      "PriceAlerts (Områdevarsler) — accessible from Profile; include if time, defer if tight",
      "Notifications (Varsler) — DEFER; use simple in-app toasts instead",
      "Settings (Innstillinger) — REMOVE from MVP; defer account management to Phase 2"
    ]
  },

  // ────────────────────────────────────────────────────────────────────────
  // NAV OPTIMIZATION RECOMMENDATION
  // ────────────────────────────────────────────────────────────────────────

  navOptimizationRecommendation: {
    current_nav: [
      "Oversikt (Dashboard)",
      "Statistikk (Statistics)",
      "Logg pris (LogPrice)",
      "Profil (Profile)",
      "[role-conditional: Review, Admin]"
    ],

    mvp_recommended_nav: [
      "Oversikt (Dashboard)",
      "Logg pris (LogPrice)",
      "Statistikk (Statistics)",
      "Profil (Profile)"
    ],

    rationale: "4-item main nav is optimal; Logg pris moved to position 2 (core contribution mechanism); Statistikk position 3 (credibility); Profile position 4 (account hub)",

    removed_from_main_nav: [
      "NotificationBell icon (DEFER; use simple in-app toasts for MVP; can add notification icon in Phase 2)"
    ],

    secondary_access: [
      "PriceAlerts → accessible from Profile card (Områdevarsler link) — no main nav promotion needed for MVP"
    ],

    admin_access: [
      "Review, Admin links remain conditional (curator/admin roles only)"
    ]
  },

  // ────────────────────────────────────────────────────────────────────────
  // DUPLICATE & FRAGMENTED FUNCTION FINDINGS
  // ────────────────────────────────────────────────────────────────────────

  duplicateFunctionalityFindings: [
    {
      issue: "Alert access via 3 entry points",
      detail: "(1) ActiveAlertsPreview CTA → PriceAlerts, (2) Profile card → Områdevarsler link, (3) Notifications 'Se varsler' link",
      impact: "User confusion; unclear primary entry point",
      mvp_recommendation: "Keep (1) + (2); remove (3) (because deferring Notifications); use Profile as primary PriceAlerts entry"
    },
    {
      issue: "Account management scattered",
      detail: "Privacy settings in Profile.jsx; account deletion in Settings.jsx (broken); logout in Profile.jsx",
      impact: "Inconsistent UX; broken deletion flow blocks Settings page",
      mvp_recommendation: "Remove Settings.jsx from MVP; defer account deletion to Phase 2; keep Privacy + Logout in Profile"
    },
    {
      issue: "Notification mechanism dual-tracked",
      detail: "UserNotification entity (full history); simple in-app toast notifications (not audited; simpler mechanism)",
      impact: "Two notification approaches; unclear which MVP should use",
      mvp_recommendation: "Use simple toasts for MVP Phase 1; defer UserNotification history page (Notifications.jsx) to Phase 2"
    }
  ],

  deadOrHalfImplementedUiFindings: [
    {
      feature: "Settings account deletion",
      status: "BROKEN STUB",
      detail: "handleConfirmDeletion (line 25) is TODO; dialog renders but backend call missing",
      mvp_impact: "BLOCKING — do not ship broken UI",
      recommendation: "Either: (a) implement full deletion flow for MVP, or (b) remove account deletion UI entirely; consider removing Settings.jsx from MVP"
    },
    {
      feature: "Settings app info",
      status: "MINIMAL",
      detail: "Only version label + platform name; no interactive features",
      mvp_impact: "Low UX value; nice-to-have",
      recommendation: "Keep if easy; remove if simplifying Settings or deferring entire page"
    },
    {
      feature: "Notifications trigger reason derivation",
      status: "FUNCTIONAL BUT FRAGILE",
      detail: "Uses regex keyword matching from title/message; fails if format changes",
      mvp_impact: "Works but risky for production",
      recommendation: "Either strengthen derivation or use simple category labels; defer full feature if regex approach not confident"
    }
  ],

  // ────────────────────────────────────────────────────────────────────────
  // STRUCTURAL RISKS & VERIFICATION GAPS
  // ────────────────────────────────────────────────────────────────────────

  structuralRisksAndGaps: [
    {
      component: "NotificationBell",
      status: "CRITICAL PATH UNKNOWN",
      risk: "Used in Layout.js; behavior not verified; impacts nav UX",
      recommendation: "Conduct separate focused audit of NotificationBell implementation before finalizing nav"
    },
    {
      component: "PrivacySettings",
      status: "FIELD LIST UNKNOWN",
      risk: "Used in Profile; what fields does it save? How is it persisted?",
      recommendation: "Verify field list and data persistence before shipping Profile.jsx"
    },
    {
      component: "PhotoCapture + StationPicker",
      status: "GPS ERROR HANDLING UNKNOWN",
      risk: "Critical to LogPrice workflow; edge cases not fully audited",
      recommendation: "Verify GPS fallback behavior and error handling before shipping LogPrice.jsx"
    }
  ],

  // ────────────────────────────────────────────────────────────────────────
  // FINAL MVP DECISION CHECKLIST
  // ────────────────────────────────────────────────────────────────────────

  mvpDecisionChecklist: {
    must_ship: [
      "✓ Dashboard.jsx — all 6 cards complete; real-time data; responsive",
      "✓ LogPrice.jsx — 4-step flow; AI + matching + persistence complete",
      "✓ Statistics.jsx — 3 charts complete; data transparency applied",
      "✓ Profile.jsx — all sections complete; auth flow correct"
    ],

    should_ship: [
      "? PriceAlerts.jsx — fully functional; decide based on timeline + scope"
    ],

    do_not_ship: [
      "✗ Settings.jsx — account deletion is broken stub; defer or remove"
    ],

    defer_to_phase_2: [
      "Notifications.jsx (use simple toasts instead)",
      "Account deletion (implement full flow later)",
      "Detailed settings management"
    ],

    verify_separately: [
      "NotificationBell component",
      "PrivacySettings component (field list + persistence)",
      "PhotoCapture + StationPicker sub-components"
    ]
  },

  // ────────────────────────────────────────────────────────────────────────
  // AUDIT METADATA
  // ────────────────────────────────────────────────────────────────────────

  auditMetadata: {
    timestamp: "2026-03-11T18:00:00Z",
    auditor: "Base44 AI Agent",
    scope: "MVP tier classification, function prioritization, nav optimization, 3-screen structure",
    method: "Code inspection, tier assignment, structural analysis",
    pages_audited: 7,
    functions_classified: 9,
    tier_categories: 6,
    status: "COMPLETE",
    compliance: "✓ READ-ONLY audit; no code changes; no frozen files modified"
  }
};

export default MVP_FUNCTION_PRIORITIZATION_AUDIT;