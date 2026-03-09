/**
 * Chain Normalization Utility
 * 
 * Purpose: Normalize chain names to canonical form and provide conservative chain matching logic.
 * Conservative design: Ambiguous short aliases are explicitly excluded to prevent false positives.
 * 
 * Observation-side confidence is internal heuristic metadata only—used for signal weighting,
 * never promoted to source truth.
 */

// Conservative registry: explicit chain matches only
// Ambiguous/short forms (e.g., 'ck', 'x') intentionally excluded
export const KNOWN_CHAINS = {
  'circle k': ['circle k', 'circlk'],
  'uno-x': ['uno-x', 'unox'],
  'shell': ['shell'],
  'esso': ['esso'],
  'statoil': ['statoil'],
  'bp': ['bp'],
  'neste': ['neste'],
  'jet': ['jet'],
};

/**
 * Normalize a chain name string to canonical form.
 * 
 * @param {string | null} rawChain - Raw chain name from observation
 * @returns {{normalized: string | null, confidence: number}}
 *   - normalized: canonical form (lowercase) or null if not recognized
 *   - confidence: heuristic internal score (0–1), never promoted as source truth
 */
export function normalizeChainName(rawChain) {
  if (!rawChain || typeof rawChain !== 'string') {
    return { normalized: null, confidence: 0 };
  }

  const trimmed = rawChain.toLowerCase().trim();

  // Check against known chains
  for (const [canonical, aliases] of Object.entries(KNOWN_CHAINS)) {
    for (const alias of aliases) {
      if (trimmed === alias) {
        return { normalized: canonical, confidence: 0.92 };
      }
    }
  }

  // Partial match (fuzzy): high edit distance penalty
  for (const [canonical, aliases] of Object.entries(KNOWN_CHAINS)) {
    for (const alias of aliases) {
      const similarity = stringSimilarity(trimmed, alias);
      if (similarity >= 0.80) {
        return { normalized: canonical, confidence: Math.max(0.50, similarity - 0.30) };
      }
    }
  }

  // Unrecognized: return null (not inferred)
  return { normalized: null, confidence: 0 };
}

/**
 * Check if two chains match.
 * 
 * Observation chain carries heuristic confidence (internal use only).
 * Station chain is master data (explicit, authoritative when present).
 * 
 * Gate fails (instant disqualification) ONLY if both chains are high-confidence (≥0.85)
 * and they differ after normalization.
 * 
 * @param {string | null} obsChain - Observation chain (may be parsed/heuristic)
 * @param {number} obsChainConfidence - Heuristic confidence (0–1, internal only)
 * @param {string | null} stnChain - Station chain from master data
 * @param {number} stnChainConfidence - Station chain confidence (0–1)
 * @returns {{matches: boolean, signal: number, gateFails: boolean, reason: string}}
 *   - matches: true if chains compatible
 *   - signal: 25 (exact match) or 0 (neutral/no signal)
 *   - gateFails: true if high-conf mismatch (terminal disqualifier)
 *   - reason: explanation for gate failure or neutral signal
 */
export function chainMatch(obsChain, obsChainConfidence, stnChain, stnChainConfidence) {
  // Both null: neutral signal (no chain data to compare)
  if (!obsChain && !stnChain) {
    return {
      matches: true,
      signal: 0,
      gateFails: false,
      reason: 'both_chains_null',
    };
  }

  // Observation chain null: neutral (weak/missing observation signal)
  if (!obsChain) {
    return {
      matches: true,
      signal: 0,
      gateFails: false,
      reason: 'obs_chain_null_neutral',
    };
  }

  // Station chain null: neutral (station data incomplete, not a rejection)
  if (!stnChain) {
    return {
      matches: true,
      signal: 0,
      gateFails: false,
      reason: 'stn_chain_null_neutral',
    };
  }

  // Both chains present: normalize and compare
  const normalizedObs = normalizeChainName(obsChain);
  const normalizedStn = normalizeChainName(stnChain);

  // Check for exact match
  if (normalizedObs.normalized === normalizedStn.normalized && normalizedObs.normalized) {
    return {
      matches: true,
      signal: 25,
      gateFails: false,
      reason: 'exact_match',
    };
  }

  // Both chains normalized but different
  if (normalizedObs.normalized && normalizedStn.normalized) {
    // High-confidence mismatch on both sides: instant disqualification
    if (obsChainConfidence >= 0.85 && stnChainConfidence >= 0.85) {
      return {
        matches: false,
        signal: 0,
        gateFails: true,
        reason: 'high_confidence_mismatch',
      };
    }
  }

  // Weak/uncertain chains: neutral signal (do not reject)
  return {
    matches: true,
    signal: 0,
    gateFails: false,
    reason: 'weak_or_uncertain_chains',
  };
}

/**
 * Simple character-based similarity (0–1).
 * Used for heuristic confidence scoring only.
 * 
 * @param {string} s1
 * @param {string} s2
 * @returns {number} 0–1
 */
function stringSimilarity(s1, s2) {
  if (s1 === s2) return 1;
  if (!s1 || !s2) return 0;

  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;

  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

/**
 * Levenshtein distance (edit distance).
 * 
 * @param {string} s1
 * @param {string} s2
 * @returns {number}
 */
function levenshteinDistance(s1, s2) {
  const len1 = s1.length;
  const len2 = s2.length;
  const dp = Array(len1 + 1)
    .fill(null)
    .map(() => Array(len2 + 1).fill(0));

  for (let i = 0; i <= len1; i++) dp[i][0] = i;
  for (let j = 0; j <= len2; j++) dp[0][j] = j;

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }

  return dp[len1][len2];
}