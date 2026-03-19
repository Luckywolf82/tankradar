/*
 * TANKRADAR — COMMIT-LEVEL FORENSICS REPORT
 * Scope: 12 specific commits from 2026-03-10 (12:49 – 13:41)
 * Question: which commit introduced the regression where
 *   all matches return no_safe_station_match / rawMatchScore=0 / dominanceGap=0 / candidate collapse?
 *
 * Method:
 *   1. Fetched full repo history (1215 commits, origin/main)
 *   2. Located each commit's position in git log (lines 380–391 newest-first)
 *   3. Read full diffs for all 12 commits
 *   4. Traced every file that changed in matching pipeline:
 *      - functions/matchStationForUserReportedPrice.ts (all 23 modifying commits)
 *      - functions/resolveFuelPriceObservation.ts (all 14 modifying commits)
 *      - functions/getNearbyStationCandidates.ts (1 creating commit)
 *      - functions/stationMatchingUtility.ts (2 creating commits)
 *      - functions/chainNormalization.ts (6 commits total)
 *   5. Read the state of all key files at commit 0800da1 (last matching change before the window)
 *   6. Verified test for uno-x normalization bug introduced in 46b2e62
 *
 * Status: COMPLETE — no code changes made
 */

export const COMMIT_FORENSICS_REPORT = {
  title: "Commit-Level Forensics: no_safe_station_match Regression",
  commits_analyzed: 12,
  time_window: "2026-03-10 12:49:15 – 13:41:03 UTC",
  report_date: "2026-03-19",

  // ══════════════════════════════════════════════════════════════════════════
  // COMMIT-BY-COMMIT ANALYSIS (chronological order: oldest → newest)
  // ══════════════════════════════════════════════════════════════════════════
  commits: [

    // ── Commit 1 (oldest in window) ─────────────────────────────────────────
    {
      sha: "4f97251c7737c56649dc1e350d89b49c0c4e5fbc",
      timestamp: "2026-03-10 12:49:15 UTC",
      positionInGitLog: 391,
      filesChanged: [
        "src/components/governance/Phase25ExecutionLog.jsx (+100 lines: Entry 28 documentation)",
        "src/pages/PriceAlerts.jsx (+29 lines: added Phase 6A clarification card)",
      ],
      touchesMatchingLogic: false,
      touchesPreviewLogic: false,
      touchesResolveFuelPriceObservation: false,
      touchesMatchStationForUserReportedPrice: false,
      touchesCandidateRetrieval: false,
      touchesChainNormalization: false,
      touchesStationFiltering: false,
      touchesGooglePlacesPipeline: false,
      behavioralImpact: {
        candidateRetrieval: "no effect",
        filteringOrGating: "no effect",
        scoring: "no effect",
        fieldMapping: "no effect",
      },
      verdict: "SAFE",
      reason: "UI-only and governance documentation. No backend, no matching, no pipeline.",
    },

    // ── Commit 2 ─────────────────────────────────────────────────────────────
    {
      sha: "5baf4fa2eca78e51508ffedd44c3c23ec83e7aa0",
      timestamp: "2026-03-10 13:01:21 UTC",
      positionInGitLog: 390,
      filesChanged: [
        "src/Layout.jsx (+3 lines, -2 lines: added Bell import, added PriceAlerts nav item, expanded mainPages array)",
      ],
      touchesMatchingLogic: false,
      touchesPreviewLogic: false,
      touchesResolveFuelPriceObservation: false,
      touchesMatchStationForUserReportedPrice: false,
      touchesCandidateRetrieval: false,
      touchesChainNormalization: false,
      touchesStationFiltering: false,
      touchesGooglePlacesPipeline: false,
      behavioralImpact: {
        candidateRetrieval: "no effect",
        filteringOrGating: "no effect",
        scoring: "no effect",
        fieldMapping: "no effect",
      },
      verdict: "SAFE",
      reason: "Frontend navigation only. Adds PriceAlerts to nav bar.",
    },

    // ── Commit 3 ─────────────────────────────────────────────────────────────
    {
      sha: "13a47458bf905d33e807ca93158bafba248b6796",
      timestamp: "2026-03-10 13:01:55 UTC",
      positionInGitLog: 389,
      filesChanged: [
        "src/components/governance/Phase25ExecutionLog_Entry29.jsx (+80 lines: new governance log entry)",
      ],
      touchesMatchingLogic: false,
      touchesPreviewLogic: false,
      touchesResolveFuelPriceObservation: false,
      touchesMatchStationForUserReportedPrice: false,
      touchesCandidateRetrieval: false,
      touchesChainNormalization: false,
      touchesStationFiltering: false,
      touchesGooglePlacesPipeline: false,
      behavioralImpact: {
        candidateRetrieval: "no effect",
        filteringOrGating: "no effect",
        scoring: "no effect",
        fieldMapping: "no effect",
      },
      verdict: "SAFE",
      reason: "Governance log entry only. Zero runtime code.",
    },

    // ── Commit 4 ─────────────────────────────────────────────────────────────
    {
      sha: "a2e838b4d3d3e600b11136fb683e4d77a91ecb1f",
      timestamp: "2026-03-10 13:16:14 UTC",
      positionInGitLog: 388,
      filesChanged: [
        "functions/checkPriceAlerts.ts (+11 lines): added archived_duplicate guard",
      ],
      exactChange: [
        "+ let canonicalStationId = price.stationId;  (line 47)",
        "+ if (station.status === 'archived_duplicate') { continue; }  (lines 58-67)",
      ],
      touchesMatchingLogic: false,
      touchesPreviewLogic: false,
      touchesResolveFuelPriceObservation: false,
      touchesMatchStationForUserReportedPrice: false,
      touchesCandidateRetrieval: false,
      touchesChainNormalization: false,
      touchesStationFiltering: false,
      touchesGooglePlacesPipeline: false,
      behavioralImpact: {
        candidateRetrieval: "no effect — checkPriceAlerts.ts is a separate pipeline (price alert triggers, not station matching)",
        filteringOrGating: "no effect on station matching gate",
        scoring: "no effect",
        fieldMapping: "no effect",
      },
      verdict: "SAFE",
      reason:
        "checkPriceAlerts.ts handles geographic price alerts; it is completely separate from the user-reported " +
        "price matching pipeline. The archived_duplicate guard prevents alert events for merged stations — " +
        "a correct behavior for the alert system, but has zero effect on matchStationForUserReportedPrice.",
    },

    // ── Commit 5 ─────────────────────────────────────────────────────────────
    {
      sha: "35015b02623b6812090a486cda8b735a7dc287b2",
      timestamp: "2026-03-10 13:16:49 UTC",
      positionInGitLog: 387,
      filesChanged: [
        "functions/checkPriceAlerts.ts (+2 lines, -1 line): added canonicalStationId to PriceAlertEvent.create()",
      ],
      exactChange: [
        "- // 8. Create PriceAlertEvent",
        "+ // 8. Create PriceAlertEvent (with canonical station integrity guard)",
        "+ canonicalStationId: canonicalStationId,  (added field to entity create call)",
      ],
      touchesMatchingLogic: false,
      touchesPreviewLogic: false,
      touchesResolveFuelPriceObservation: false,
      touchesMatchStationForUserReportedPrice: false,
      touchesCandidateRetrieval: false,
      touchesChainNormalization: false,
      touchesStationFiltering: false,
      touchesGooglePlacesPipeline: false,
      behavioralImpact: {
        candidateRetrieval: "no effect",
        filteringOrGating: "no effect",
        scoring: "no effect",
        fieldMapping: "no effect on FuelPrice or Station matching fields",
      },
      verdict: "SAFE",
      reason:
        "Adds a field to PriceAlertEvent entity creation in checkPriceAlerts.ts. " +
        "Completely separate pipeline from station matching.",
    },

    // ── Commit 6 ─────────────────────────────────────────────────────────────
    {
      sha: "e0c1e794b6d5034904379cbcf7129c1f4a855cbe",
      timestamp: "2026-03-10 13:17:57 UTC",
      positionInGitLog: 386,
      filesChanged: [
        "src/components/governance/Phase25ExecutionLog_Entry30.jsx (+94 lines: governance log entry)",
      ],
      touchesMatchingLogic: false,
      verdict: "SAFE",
      reason: "Governance log entry only. Zero runtime code.",
    },

    // ── Commit 7 ─────────────────────────────────────────────────────────────
    {
      sha: "b72675d48b5725b811a31cc62896a61e02126fbd",
      timestamp: "2026-03-10 13:26:54 UTC",
      positionInGitLog: 385,
      filesChanged: [
        "src/pages/SuperAdmin.jsx (+3 lines): added SystemHealthPanel import and render in admin layout",
      ],
      touchesMatchingLogic: false,
      touchesPreviewLogic: false,
      touchesResolveFuelPriceObservation: false,
      touchesMatchStationForUserReportedPrice: false,
      touchesCandidateRetrieval: false,
      touchesChainNormalization: false,
      touchesStationFiltering: false,
      touchesGooglePlacesPipeline: false,
      behavioralImpact: {
        candidateRetrieval: "no effect",
        filteringOrGating: "no effect",
        scoring: "no effect",
        fieldMapping: "no effect",
      },
      verdict: "SAFE",
      reason: "Frontend admin UI only. SystemHealthPanel is a read-only diagnostic component.",
    },

    // ── Commit 8 ─────────────────────────────────────────────────────────────
    {
      sha: "3990eb82822017db78129280bc0fa57cf26a486d",
      timestamp: "2026-03-10 13:27:32 UTC",
      positionInGitLog: 384,
      filesChanged: [
        "src/components/governance/Phase25ExecutionLog_Entry31.jsx (+91 lines: governance log entry)",
      ],
      touchesMatchingLogic: false,
      verdict: "SAFE",
      reason: "Governance log entry only. Zero runtime code.",
    },

    // ── Commit 9 ─────────────────────────────────────────────────────────────
    // FIRST chainNormalization commit
    {
      sha: "46b2e62d1f3d8a67bcd2f5166f380c82bf1dc1f3",
      timestamp: "2026-03-10 13:38:21 UTC",
      positionInGitLog: 383,
      filesChanged: [
        "functions/chainNormalization.ts (CREATED, +187 lines)",
      ],
      exactChange:
        "Re-creates chainNormalization.ts after it was deleted at 347b258f (Mar 9, 13:53). " +
        "New version uses a DIFFERENT KNOWN_CHAINS map and a DIFFERENT normalization algorithm.",
      chainRegistryChanges: {
        old_version_at_e50dddd: "KNOWN_CHAINS = { 'circle k': ['circle k', 'circlk'], 'uno-x': ['uno-x', 'unox'], 'shell', 'esso', 'statoil', 'bp', 'neste', 'jet' }",
        new_version_at_46b2e62: "KNOWN_CHAINS = { 'circle k': 'Circle K', 'uno-x': 'Uno-X', 'esso': 'Esso', 'shell': 'Shell', 'yx': 'YX', 'best': 'Best', 'st1': 'St1', 'equinor': 'Equinor' }",
        missingAliases: ["'circlk' alias for circle k removed", "'unox' alias for uno-x removed"],
        missingChains: ["statoil", "bp", "neste", "jet"],
        newChains: ["yx", "best", "st1", "equinor"],
        normalizationAlgorithm: "New: step 2 removes ALL hyphens/underscores/dots/apostrophes before matching",
      },
      criticalBug:
        "SEMANTIC BUG: New normalizer strips hyphens (step 2). " +
        "'uno-x' → 'uno x' after hyphen removal. KNOWN_CHAINS key is 'uno-x', not 'uno x'. " +
        "Result: normalizeChainName('uno-x') → { normalizedChain: null, confidence: 0 }. " +
        "Verified by test: 'uno-x', 'UNO-X', 'unox', 'uno x' ALL return NULL in the new version.",
      touchesMatchingLogic: true,
      touchesPreviewLogic: false,
      touchesResolveFuelPriceObservation: false,
      touchesMatchStationForUserReportedPrice: false,
      touchesCandidateRetrieval: false,
      touchesChainNormalization: true,
      touchesStationFiltering: false,
      touchesGooglePlacesPipeline: false,
      behavioralImpact: {
        candidateRetrieval: "no direct effect — no matching function invokes chainNormalization via HTTP",
        filteringOrGating: "no direct effect — matching pipeline uses its OWN inlined normalizeChainName",
        scoring: "no direct effect in current pipeline state",
        fieldMapping: "no effect",
        latentRisk:
          "HIGH: chainNormalization.ts is semantically broken for uno-x. " +
          "If any future function switches to invoking chainNormalization via HTTP instead of using inline logic, " +
          "all Uno-X station matching would fail silently (chain returns null → neutral, not disqualified, " +
          "but also no chain-match bonus → lower scores → may fall below SCORE_MATCHED threshold).",
      },
      verdict: "POSSIBLE_IMPACT",
      reason:
        "Creates a broken chainNormalization.ts with uno-x semantic bug and missing chain coverage. " +
        "NOT the regression commit because matchStationForUserReportedPrice.ts does NOT invoke " +
        "chainNormalization via HTTP at this point in time — it uses its own inlined normalizeChainName. " +
        "However, this is a time-bomb for any future integration.",
    },

    // ── Commit 10 ─────────────────────────────────────────────────────────────
    {
      sha: "e619884bcf03d863000dd029667f4e502876469e",
      timestamp: "2026-03-10 13:39:09 UTC",
      positionInGitLog: 382,
      filesChanged: [
        "functions/chainNormalization.ts (-5 lines): removed CommonJS module.exports block",
      ],
      exactChange:
        "Removed: if (typeof module !== 'undefined' && module.exports) { module.exports = { normalizeChainName }; }",
      touchesChainNormalization: true,
      behavioralImpact: {
        candidateRetrieval: "no effect",
        scoring: "no effect — module.exports block was a no-op in Deno (evaluated as false)",
        fieldMapping: "no effect",
      },
      verdict: "SAFE",
      reason:
        "Removes a CommonJS export guard that was already a no-op in Deno. " +
        "chainNormalization.ts still has the uno-x bug from 46b2e62, but the pipeline still doesn't call it.",
    },

    // ── Commit 11 ─────────────────────────────────────────────────────────────
    {
      sha: "d2c681e77f7798bd1c8e3666b9d67e6528ec569c",
      timestamp: "2026-03-10 13:40:00 UTC",
      positionInGitLog: 381,
      filesChanged: [
        "functions/chainNormalization.ts (+3 lines): added ES module export, updated header comment",
      ],
      exactChange: [
        "+ export { normalizeChainName };",
        "+ comment: 'Pure utility function (no HTTP endpoint).'",
      ],
      touchesChainNormalization: true,
      behavioralImpact: {
        candidateRetrieval: "no direct effect",
        scoring: "no direct effect — matching pipeline doesn't import from sibling files",
        fieldMapping: "no effect",
        note:
          "Adding ES module export makes normalizeChainName importable in theory, " +
          "but Base44 backend functions cannot import from sibling files. No runtime impact.",
      },
      verdict: "SAFE",
      reason:
        "Adds ES module export to chainNormalization.ts. Matching pipeline remains on inline logic. " +
        "File still has uno-x bug but is not called.",
    },

    // ── Commit 12 (newest in window) ─────────────────────────────────────────
    {
      sha: "a864b27d216f0f86a3bd22f459c95a4dea41b1fb",
      timestamp: "2026-03-10 13:41:03 UTC",
      positionInGitLog: 380,
      filesChanged: [
        "functions/chainNormalization.ts (+13 lines, -2 lines): removed ES module export, added Deno.serve() HTTP endpoint",
      ],
      exactChange: [
        "- export { normalizeChainName };",
        "+ Deno.serve(async (req) => {",
        "+   if (req.method !== 'POST') { return Response.json({ error: 'POST only' }, { status: 405 }); }",
        "+   const { chainName } = await req.json();",
        "+   const result = normalizeChainName(chainName);",
        "+   return Response.json(result);",
        "+ });",
      ],
      touchesMatchingLogic: true,
      touchesChainNormalization: true,
      behavioralImpact: {
        candidateRetrieval: "no direct effect — matchStationForUserReportedPrice does not invoke chainNormalization",
        filteringOrGating:
          "no direct effect in current state. " +
          "HOWEVER: chainNormalization is now a deployed HTTP endpoint serving normalizeChainName. " +
          "If any matching function calls base44.functions.invoke('chainNormalization', ...), " +
          "it will get a response — but that response would be WRONG for uno-x inputs (returns null, not 'Uno-X').",
        scoring:
          "no direct effect in current matching pipeline state. " +
          "The inline normalizeChainName in matchStationForUserReportedPrice.ts is UNAFFECTED.",
        fieldMapping: "no effect",
        httpEndpoint:
          "chainNormalization is now callable via POST. Request body: { chainName: string }. " +
          "Response: { normalizedChain: string|null, confidence: number }. " +
          "Bug: uno-x → null (confirmed by test). circle k → 'Circle K' (correct).",
      },
      verdict: "POSSIBLE_IMPACT",
      reason:
        "Promotes chainNormalization.ts to a deployed HTTP function, making it invocable by other functions. " +
        "NOT the regression commit because matchStationForUserReportedPrice.ts still does NOT call it. " +
        "The broken uno-x normalization is now live as a service, creating latent risk for future integrations.",
    },
  ],

  // ══════════════════════════════════════════════════════════════════════════
  // CONTEXT: STATE OF MATCHING FILES DURING THE 12-COMMIT WINDOW
  // ══════════════════════════════════════════════════════════════════════════
  matchingFilesDuringWindow: {
    "matchStationForUserReportedPrice.ts": {
      status: "UNCHANGED during the 12 commits",
      lastModifiedBefore: "0800da1 (2026-03-09 19:39:58 UTC)",
      firstModifiedAfter: "e330b86 (2026-03-10 14:03:10 UTC) — 22 minutes after the last target commit",
      stateAtWindowStart: "0800da1 version: no preview_mode, production path invokes getNearbyStationCandidates",
      stateAtWindowEnd: "Identical to window start — no changes during the 12 commits",
    },
    "resolveFuelPriceObservation.ts": {
      status: "DID NOT EXIST during the 12 commits",
      firstCreated: "286e12f (2026-03-19 16:14:50 UTC) — 9 days after the target commits",
      implication:
        "Fields 'rawMatchScore' and 'dominanceGap' reported in the regression trace are populated by " +
        "resolveFuelPriceObservation.ts. These did NOT exist in the system during the 12 target commits.",
    },
    "getNearbyStationCandidates.ts": {
      status: "UNCHANGED during the 12 commits",
      createdAt: "0800da1 (2026-03-09 19:39:58 UTC)",
      criticalProperty:
        "Admin-gated (line 27: if (!user || user.role !== 'admin') → 403). " +
        "matchStationForUserReportedPrice.ts invokes it via base44.functions.invoke. " +
        "If SDK returns 403 body without throwing, candidates stays empty → no_safe_station_match.",
    },
    "stationMatchingUtility.ts": {
      status: "UNCHANGED during the 12 commits",
      lastModified: "18921595 (2026-03-09 13:28:23 UTC)",
      cityGateBug:
        "Line 189: obsCityConfidence >= 0.85 && obsCity.toLowerCase() !== stnCity.toLowerCase() — " +
        "no null check on stnCity. If stnCity is null, throws TypeError. " +
        "Introduced at file creation on Mar 9.",
    },
    "chainNormalization.ts": {
      status: "MODIFIED by commits 9-12 in the window",
      beforeWindow: "DELETED (not present — was deleted at 347b258f on Mar 9 13:53)",
      afterWindow: "Present as HTTP endpoint with Deno.serve (uno-x bug, missing chain aliases)",
      impactOnMatching: "NONE — matching pipeline uses inline normalizeChainName, not HTTP invoke",
    },
  },

  // ══════════════════════════════════════════════════════════════════════════
  // FINAL TASK ANSWERS
  // ══════════════════════════════════════════════════════════════════════════
  finalAnswers: {

    A_firstCommitThatCouldCauseCollapse: {
      answer: "NONE OF THE 12 TARGET COMMITS",
      evidence: [
        "All 12 commits from 12:49–13:41 on Mar 10 are SAFE for the matching pipeline.",
        "matchStationForUserReportedPrice.ts was NOT touched by any of the 12 commits.",
        "resolveFuelPriceObservation.ts did NOT EXIST during the 12 commits.",
        "The chainNormalization.ts commits touch a standalone utility file that the matching pipeline does NOT invoke.",
        "The true first commit that causes candidate collapse is 0800da1 (Mar 9, 19:39:58), BEFORE the window.",
      ],
      actualCauseCommit: {
        sha: "0800da14f105bd84578b7abee729e0b7735d9389",
        timestamp: "2026-03-09 19:39:58 UTC",
        files: [
          "functions/getNearbyStationCandidates.ts (CREATED, 136 lines, admin-gated)",
          "functions/matchStationForUserReportedPrice.ts (+43 lines: replaced direct Station.filter with getNearbyStationCandidates invoke)",
        ],
        mechanism: [
          "1. getNearbyStationCandidates.ts is created with admin gate (user.role !== 'admin' → 403).",
          "2. matchStationForUserReportedPrice.ts is changed to invoke getNearbyStationCandidates.",
          "3. The fallback path (catch block) properly handles SDK throws.",
          "4. BUT: if the Base44 SDK does NOT throw on 403 (returns response body instead), " +
            "preFilterResult.data.candidates is undefined, preFilterResult.data.fallback_used is undefined, " +
            "candidates stays [], and the function returns no_safe_station_match immediately.",
          "5. This affects ALL non-admin users calling matchStationForUserReportedPrice.",
        ],
      },
    },

    B_singleMostLikelyRegressionCommit: {
      answer: "0800da14f105bd84578b7abee729e0b7735d9389 (2026-03-09 19:39:58 UTC)",
      note: "This is OUTSIDE the 12-commit window. None of the 12 target commits is the regression commit.",
      mechanismSummary:
        "Replaced direct Station.filter({ city }) with admin-gated getNearbyStationCandidates invoke. " +
        "If SDK silently handles 403 (returns body, no throw), candidates stays []. " +
        "No_safe_station_match returned. Affects all non-admin callers.",
      secondaryContributor: {
        sha: "ecb562048ddfdaef5c112acf9306b2998e1213e8",
        timestamp: "2026-03-10 15:04:12 UTC",
        note:
          "ALSO OUTSIDE the 12-commit window (15:04, 23 minutes after a864b27 at 13:41). " +
          "Added assembleObservation() with cityConfidence: 0.95. " +
          "Hardcoded 0.95 cityConfidence + null-safety gap on line 216 causes TypeError crash " +
          "when candidateStation.city is null, eliminating all candidates.",
      },
    },

    C_whichChangeCausesEmptyCandidates: {
      primaryMechanism: "Admin-gate on getNearbyStationCandidates (0800da1, Mar 9)",
      explanation: [
        "matchStationForUserReportedPrice.ts invokes getNearbyStationCandidates via base44.functions.invoke.",
        "getNearbyStationCandidates.ts returns 403 for non-admin users.",
        "If SDK returns 403 body without throwing: preFilterResult.data.candidates = undefined.",
        "Neither if-branch (candidates>0 / fallback_used) fires.",
        "candidates remains [] (empty).",
        "if (!candidates || candidates.length === 0) → return no_safe_station_match.",
      ],
      secondaryMechanism: "cityConfidence 0.95 + null-safety gap (ecb5620, Mar 10 15:04, outside window)",
      explanation2: [
        "observation.city is non-null (city is required parameter).",
        "cityConfidence: 0.95 exceeds gate threshold (0.85).",
        "candidateStation.city is null for some stations.",
        "candidateStation.city.toLowerCase() throws TypeError.",
        "Scoring loop crashes for every candidate with null city.",
        "All candidates score 0, filtered out by .filter(m => m.score > 0).",
        "scoredMatches is empty → no_safe_station_match.",
      ],
    },

  },

  // ══════════════════════════════════════════════════════════════════════════
  // VERDICT SUMMARY TABLE
  // ══════════════════════════════════════════════════════════════════════════
  verdictSummary: [
    { sha: "4f97251", timestamp: "12:49", files: "Phase25ExecutionLog.jsx, PriceAlerts.jsx (UI)", verdict: "SAFE" },
    { sha: "5baf4fa", timestamp: "13:01", files: "Layout.jsx (nav)", verdict: "SAFE" },
    { sha: "13a4745", timestamp: "13:01", files: "Phase25ExecutionLog_Entry29.jsx (governance)", verdict: "SAFE" },
    { sha: "a2e838b", timestamp: "13:16", files: "checkPriceAlerts.ts (archived_duplicate guard)", verdict: "SAFE" },
    { sha: "35015b0", timestamp: "13:16", files: "checkPriceAlerts.ts (canonicalStationId field)", verdict: "SAFE" },
    { sha: "e0c1e79", timestamp: "13:17", files: "Phase25ExecutionLog_Entry30.jsx (governance)", verdict: "SAFE" },
    { sha: "b72675d", timestamp: "13:26", files: "SuperAdmin.jsx (SystemHealthPanel UI)", verdict: "SAFE" },
    { sha: "3990eb8", timestamp: "13:27", files: "Phase25ExecutionLog_Entry31.jsx (governance)", verdict: "SAFE" },
    {
      sha: "46b2e62",
      timestamp: "13:38",
      files: "chainNormalization.ts (CREATED, wrong KNOWN_CHAINS, uno-x bug)",
      verdict: "POSSIBLE_IMPACT",
      reason: "Broken utility file. Not called by matching pipeline at this point. Latent risk only.",
    },
    {
      sha: "e619884",
      timestamp: "13:39",
      files: "chainNormalization.ts (removed module.exports no-op)",
      verdict: "SAFE",
    },
    {
      sha: "d2c681e",
      timestamp: "13:40",
      files: "chainNormalization.ts (added ES module export)",
      verdict: "SAFE",
    },
    {
      sha: "a864b27",
      timestamp: "13:41",
      files: "chainNormalization.ts (removed export, added Deno.serve HTTP endpoint)",
      verdict: "POSSIBLE_IMPACT",
      reason:
        "Promotes broken chainNormalization to deployed endpoint. Still not called by matching pipeline. " +
        "If any future function invokes it, uno-x matching will silently fail.",
    },
  ],

  // ══════════════════════════════════════════════════════════════════════════
  // ACTUAL REGRESSION COMMIT (outside the 12-commit window)
  // ══════════════════════════════════════════════════════════════════════════
  regressionCommitOutsideWindow: {
    sha: "0800da14f105bd84578b7abee729e0b7735d9389",
    timestamp: "2026-03-09 19:39:58 UTC",
    note: "This is commit #486 in git log — 95 positions before the 12-commit window starts at #391.",
    exactCodeChange_matchStationForUserReportedPrice: {
      before: "const candidates = await base44.entities.Station.filter({ city });",
      after:
        "const preFilterResult = await base44.functions.invoke('getNearbyStationCandidates', {...});\n" +
        "if (preFilterResult.data.candidates ...) { candidates = ... } // no throw-path for 403\n" +
        "else if (preFilterResult.data.fallback_used) { candidates = ... } // also silent on 403\n" +
        "// catch block: fallback IF SDK throws, but 403 may not throw",
      whyThisBreaks:
        "The 403 response body { error: 'Admin access required' } has no .candidates and no .fallback_used fields. " +
        "Both branches are false. candidates stays []. Function returns no_safe_station_match.",
    },
    exactCodeCreated_getNearbyStationCandidates: {
      line27: "if (!user || user.role !== 'admin') { return Response.json({ error: 'Admin access required' }, { status: 403 }); }",
      problem: "Admin-gate applies even when called via base44.functions.invoke by matchStationForUserReportedPrice, " +
        "which is itself accessible to non-admin users.",
    },
  },

  // ══════════════════════════════════════════════════════════════════════════
  // CHAINNAMALIZATION.TS BUG VERIFICATION (46b2e62)
  // ══════════════════════════════════════════════════════════════════════════
  chainNormalizationBugVerification: {
    input_to_output_after_46b2e62: [
      { input: "circle k",  normalized_key: "circle k",  matches_key: "circle k",  result: "Circle K" },
      { input: "circle-k",  normalized_key: "circle k",  matches_key: "circle k",  result: "Circle K" },
      { input: "uno-x",     normalized_key: "uno x",     matches_key: "uno-x",     result: "NULL ← BUG" },
      { input: "UNO-X",     normalized_key: "uno x",     matches_key: "uno-x",     result: "NULL ← BUG" },
      { input: "unox",      normalized_key: "unox",      matches_key: "uno-x",     result: "NULL ← BUG" },
      { input: "uno x",     normalized_key: "uno x",     matches_key: "uno-x",     result: "NULL ← BUG" },
      { input: "esso",      normalized_key: "esso",       matches_key: "esso",      result: "Esso" },
      { input: "shell",     normalized_key: "shell",      matches_key: "shell",     result: "Shell" },
    ],
    root_cause: "Step 2 removes hyphens: 'uno-x' → 'uno x'. KNOWN_CHAINS key is 'uno-x' (with hyphen). No match.",
    impact_on_pipeline: "NONE currently — matching pipeline uses its own inline normalizeChainName which is correct.",
    impact_if_integrated: "Uno-X chain signal would return null → chain score = 0 (neutral, not gating fail) → lower overall scores → may fall below SCORE_MATCHED (65) threshold.",
  },
};

export default COMMIT_FORENSICS_REPORT;
