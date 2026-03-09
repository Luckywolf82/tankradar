/**
 * Station Name Parser Utility
 * 
 * Purpose: Extract components (chain, location, address tokens) from observation names.
 * Design: Confidence returned as internal heuristic metadata only—inferred values remain null,
 * never promoted to source truth.
 */

import { normalizeChainName, KNOWN_CHAINS } from './chainNormalization.js';

/**
 * Parse a station observation name into components.
 * Confidence values are internal heuristic metadata only.
 * Unknown/unparseable values remain null.
 * 
 * @param {string} rawName - Raw station name from observation
 * @returns {{
 *   chain: string | null,
 *   chainConfidence: number,
 *   locationLabel: string | null,
 *   locationLevel: 'city' | 'area' | null,
 *   chainTokens: string[],
 *   locationTokens: string[],
 *   unparsedTokens: string[]
 * }}
 */
export function parseStationName(rawName) {
  if (!rawName || typeof rawName !== 'string') {
    return {
      chain: null,
      chainConfidence: 0,
      locationLabel: null,
      locationLevel: null,
      chainTokens: [],
      locationTokens: [],
      unparsedTokens: [],
    };
  }

  const tokens = rawName.toLowerCase().trim().split(/\s+/);
  const result = {
    chain: null,
    chainConfidence: 0,
    locationLabel: null,
    locationLevel: null,
    chainTokens: [],
    locationTokens: [],
    unparsedTokens: [],
  };

  // Try to identify chain in first token(s)
  for (const [canonical, aliases] of Object.entries(KNOWN_CHAINS)) {
    for (const alias of aliases) {
      const aliasTokens = alias.split(/\s+/);
      const nameStart = tokens.slice(0, aliasTokens.length).join(' ');
      if (nameStart === alias) {
        result.chain = canonical;
        result.chainConfidence = 0.92;
        result.chainTokens = tokens.slice(0, aliasTokens.length);
        tokens.splice(0, aliasTokens.length);
        break;
      }
    }
    if (result.chain) break;
  }

  // Extract location label from remaining tokens
  // Common Norwegian area/neighborhood names
  const areaKeywords = [
    'heimdal',
    'lade',
    'singsås',
    'torgata',
    'nidaros',
    'sentrum',
    'lerkendal',
    'moholt',
    'bakklandet',
    'ranheim',
    'leinstrand',
  ];

  for (const token of tokens) {
    if (areaKeywords.includes(token)) {
      result.locationLabel = token;
      result.locationLevel = 'area';
      result.locationTokens.push(token);
      break;
    }
  }

  // Remaining tokens as unparsed
  result.unparsedTokens = tokens.filter(
    (t) => !result.chainTokens.includes(t) && !result.locationTokens.includes(t)
  );

  return result;
}

/**
 * Extract area/neighborhood label from name.
 * Confidence is internal heuristic only.
 * Returns null if not explicitly parseable.
 * 
 * @param {string} name
 * @returns {{label: string | null, confidence: number, source: 'explicit' | 'pattern' | null}}
 */
export function extractLocationLabel(name) {
  if (!name || typeof name !== 'string') {
    return { label: null, confidence: 0, source: null };
  }

  const areaKeywords = [
    'heimdal',
    'lade',
    'singsås',
    'torgata',
    'nidaros',
    'sentrum',
    'lerkendal',
    'moholt',
    'bakklandet',
    'ranheim',
    'leinstrand',
  ];

  const lowerName = name.toLowerCase();
  for (const area of areaKeywords) {
    if (lowerName.includes(area)) {
      return { label: area, confidence: 0.85, source: 'explicit' };
    }
  }

  return { label: null, confidence: 0, source: null };
}

/**
 * Bigram similarity for station name matching.
 * Used only for signal scoring, not source truth.
 * 
 * @param {string} name1
 * @param {string} name2
 * @returns {number} 0–1
 */
export function bigramSimilarity(name1, name2) {
  if (!name1 || !name2) return 0;
  if (name1.toLowerCase() === name2.toLowerCase()) return 1;

  const n1 = normalize(name1);
  const n2 = normalize(name2);

  const bigrams1 = extractBigrams(n1);
  const bigrams2 = extractBigrams(n2);

  if (bigrams1.size === 0 || bigrams2.size === 0) return 0;

  // Jaccard similarity on bigrams
  const intersection = new Set([...bigrams1].filter((x) => bigrams2.has(x)));
  const union = new Set([...bigrams1, ...bigrams2]);

  return intersection.size / union.size;
}

/**
 * Normalize string for comparison.
 * 
 * @param {string} str
 * @returns {string}
 */
function normalize(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .trim()
    .replace(/[-\s]+/g, ' ')
    .replace(/\s+/g, ' ');
}

/**
 * Extract bigrams from normalized string.
 * 
 * @param {string} str
 * @returns {Set<string>}
 */
function extractBigrams(str) {
  const cleaned = str.replace(/\s+/g, '');
  const bigrams = new Set();
  for (let i = 0; i < cleaned.length - 1; i++) {
    bigrams.add(cleaned.substr(i, 2));
  }
  return bigrams;
}