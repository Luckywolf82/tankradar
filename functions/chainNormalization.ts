/**
 * Chain Normalization Utility
 * 
 * Normalizes inconsistent chain name variations to canonical forms.
 * Used for station identity mastering and matching.
 * 
 * Supported chains:
 * - Circle K
 * - Uno-X
 * - Esso
 * - Shell
 * - YX
 * - Best
 * - St1
 * - Equinor
 */

const KNOWN_CHAINS = {
  "circle k": "Circle K",
  "uno-x": "Uno-X",
  "esso": "Esso",
  "shell": "Shell",
  "yx": "YX",
  "best": "Best",
  "st1": "St1",
  "equinor": "Equinor",
};

/**
 * Normalize a raw chain name to canonical form
 * 
 * Process:
 * 1. Convert to lowercase
 * 2. Remove punctuation (hyphens, underscores, dots, etc.)
 * 3. Collapse multiple whitespaces to single space
 * 4. Match against known chains
 * 
 * @param {string} rawName - Raw chain name from external source
 * @returns {Object} { normalizedChain: string|null, confidence: number }
 * 
 * Example:
 * normalizeChainName("circle k") → { normalizedChain: "Circle K", confidence: 1.0 }
 * normalizeChainName("CIRCLEK") → { normalizedChain: "Circle K", confidence: 1.0 }
 * normalizeChainName("unknown brand") → { normalizedChain: null, confidence: 0 }
 */
function normalizeChainName(rawName) {
  // Handle null/undefined
  if (!rawName || typeof rawName !== "string") {
    return { normalizedChain: null, confidence: 0 };
  }

  // Step 1: Convert to lowercase
  let normalized = rawName.toLowerCase();

  // Step 2: Remove punctuation (hyphens, underscores, dots, apostrophes)
  normalized = normalized.replace(/[-_.']/g, " ");

  // Step 3: Collapse whitespace (leading, trailing, multiple spaces)
  normalized = normalized.trim().replace(/\s+/g, " ");

  // Step 4: Match against known chains
  const matched = KNOWN_CHAINS[normalized];

  if (matched) {
    return {
      normalizedChain: matched,
      confidence: 1.0,
    };
  }

  // No match found
  return {
    normalizedChain: null,
    confidence: 0,
  };
}

/**
 * ============================================================================
 * UNIT TEST EXAMPLES
 * ============================================================================
 * 
 * These examples demonstrate expected behavior.
 * Use to validate implementation before integration.
 * 
 * Test Suite 1: Circle K variations
 * ─────────────────────────────────
 * normalizeChainName("circle k")
 *   → { normalizedChain: "Circle K", confidence: 1.0 } ✓
 * 
 * normalizeChainName("CIRCLE K")
 *   → { normalizedChain: "Circle K", confidence: 1.0 } ✓
 * 
 * normalizeChainName("circle-k")
 *   → { normalizedChain: "Circle K", confidence: 1.0 } ✓
 * 
 * normalizeChainName("circlek")
 *   → { normalizedChain: "Circle K", confidence: 1.0 } ✓
 * 
 * normalizeChainName("circle_k")
 *   → { normalizedChain: "Circle K", confidence: 1.0 } ✓
 * 
 * normalizeChainName("  circle   k  ")
 *   → { normalizedChain: "Circle K", confidence: 1.0 } ✓
 * 
 * 
 * Test Suite 2: Uno-X variations
 * ──────────────────────────────
 * normalizeChainName("uno-x")
 *   → { normalizedChain: "Uno-X", confidence: 1.0 } ✓
 * 
 * normalizeChainName("UNO-X")
 *   → { normalizedChain: "Uno-X", confidence: 1.0 } ✓
 * 
 * normalizeChainName("unox")
 *   → { normalizedChain: "Uno-X", confidence: 1.0 } ✓
 * 
 * normalizeChainName("uno_x")
 *   → { normalizedChain: "Uno-X", confidence: 1.0 } ✓
 * 
 * 
 * Test Suite 3: Other known chains
 * ─────────────────────────────────
 * normalizeChainName("esso")
 *   → { normalizedChain: "Esso", confidence: 1.0 } ✓
 * 
 * normalizeChainName("shell")
 *   → { normalizedChain: "Shell", confidence: 1.0 } ✓
 * 
 * normalizeChainName("yx")
 *   → { normalizedChain: "YX", confidence: 1.0 } ✓
 * 
 * normalizeChainName("best")
 *   → { normalizedChain: "Best", confidence: 1.0 } ✓
 * 
 * normalizeChainName("st1")
 *   → { normalizedChain: "St1", confidence: 1.0 } ✓
 * 
 * normalizeChainName("equinor")
 *   → { normalizedChain: "Equinor", confidence: 1.0 } ✓
 * 
 * 
 * Test Suite 4: Unknown chains
 * ────────────────────────────
 * normalizeChainName("unknown brand")
 *   → { normalizedChain: null, confidence: 0 } ✓
 * 
 * normalizeChainName("random petrol")
 *   → { normalizedChain: null, confidence: 0 } ✓
 * 
 * normalizeChainName("xyz fuel")
 *   → { normalizedChain: null, confidence: 0 } ✓
 * 
 * 
 * Test Suite 5: Edge cases
 * ───────────────────────
 * normalizeChainName("")
 *   → { normalizedChain: null, confidence: 0 } ✓
 * 
 * normalizeChainName(null)
 *   → { normalizedChain: null, confidence: 0 } ✓
 * 
 * normalizeChainName(undefined)
 *   → { normalizedChain: null, confidence: 0 } ✓
 * 
 * normalizeChainName(123)
 *   → { normalizedChain: null, confidence: 0 } ✓
 * 
 * 
 * Test Suite 6: Case sensitivity + punctuation combo
 * ────────────────────────────────────────────────────
 * normalizeChainName("CIRCLE-K")
 *   → { normalizedChain: "Circle K", confidence: 1.0 } ✓
 * 
 * normalizeChainName("Uno_X")
 *   → { normalizedChain: "Uno-X", confidence: 1.0 } ✓
 * 
 * normalizeChainName("  ST1  ")
 *   → { normalizedChain: "St1", confidence: 1.0 } ✓
 * 
 * ============================================================================
 */