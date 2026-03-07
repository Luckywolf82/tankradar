import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function normalizeName(name) {
  if (!name) return '';
  return name.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
}

function normalizeAddress(addr) {
  if (!addr) return '';
  return addr.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
}

function stringSimilarity(a, b) {
  const normA = normalizeName(a);
  const normB = normalizeName(b);
  if (!normA || !normB) return 0;
  if (normA === normB) return 1;
  const longer = normA.length > normB.length ? normA : normB;
  const shorter = normA.length > normB.length ? normB : normA;
  if (longer.length === 0) return 1;
  const editDistance = levenshtein(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

function levenshtein(s1, s2) {
  const costs = [];
  for (let i = 0; i <= s1.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= s2.length; j++) {
      if (i === 0) costs[j] = j;
      else if (j > 0) {
        let newValue = costs[j - 1];
        if (s1.charAt(i - 1) !== s2.charAt(j - 1)) newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
        costs[j - 1] = lastValue;
        lastValue = newValue;
      }
    }
    if (i > 0) costs[s2.length] = lastValue;
  }
  return costs[s2.length];
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch pending candidates only
    const candidates = await base44.entities.StationCandidate.filter({
      status: 'pending',
    });

    if (candidates.length === 0) {
      return Response.json({
        groups: [],
        ungrouped: [],
        totalCandidates: 0,
      });
    }

    // Group candidates by same physical location
    const groups = [];
    const processed = new Set();

    for (let i = 0; i < candidates.length; i++) {
      if (processed.has(candidates[i].id)) continue;

      const group = {
        groupId: candidates[i].id, // Use first candidate ID as group anchor
        candidates: [candidates[i]],
        groupType: 'single', // 'single', 'duplicate', 'same_location'
        reason: [],
      };

      processed.add(candidates[i].id);

      // Find related candidates
      for (let j = i + 1; j < candidates.length; j++) {
        if (processed.has(candidates[j].id)) continue;

        const c1 = candidates[i];
        const c2 = candidates[j];

        // Check distance
        const dist = calculateDistance(c1.latitude, c1.longitude, c2.latitude, c2.longitude);

        // Rule 1: Very close (< 50m) = almost certainly same location
        if (dist < 0.05) {
          group.candidates.push(c2);
          group.groupType = group.candidates.length > 2 ? 'duplicate' : 'same_location';
          group.reason.push('very_close_coordinates');
          processed.add(c2.id);
          continue;
        }

        // Rule 2: Close (50-200m) + same/similar address
        if (dist < 0.2 && c1.address && c2.address) {
          const addrSim = stringSimilarity(c1.address, c2.address);
          if (addrSim > 0.8) {
            group.candidates.push(c2);
            group.groupType = 'same_location';
            group.reason.push('close_distance_similar_address');
            processed.add(c2.id);
            continue;
          }
        }

        // Rule 3: Very similar names + close distance (< 500m)
        const nameSim = stringSimilarity(c1.proposedName, c2.proposedName);
        if (nameSim > 0.9 && dist < 0.5) {
          group.candidates.push(c2);
          group.groupType = group.candidates.length > 2 ? 'duplicate' : 'same_location';
          group.reason.push('very_similar_name_close_distance');
          processed.add(c2.id);
          continue;
        }

        // Rule 4: Same chain + similar name + moderate distance (< 300m)
        if (c1.proposedChain && c2.proposedChain && c1.proposedChain === c2.proposedChain) {
          const nameSim2 = stringSimilarity(c1.proposedName, c2.proposedName);
          if (nameSim2 > 0.85 && dist < 0.3) {
            group.candidates.push(c2);
            group.groupType = 'same_location';
            group.reason.push('same_chain_similar_name');
            processed.add(c2.id);
            continue;
          }
        }
      }

      if (group.candidates.length > 1) {
        groups.push(group);
      }
    }

    // Collect ungrouped candidates
    const ungrouped = candidates.filter(c => !processed.has(c.id));

    return Response.json({
      groups,
      ungrouped,
      totalCandidates: candidates.length,
      groupedCount: processed.size - ungrouped.length,
      ungroupedCount: ungrouped.length,
      summary: {
        duplicateGroups: groups.filter(g => g.groupType === 'duplicate').length,
        sameLocationGroups: groups.filter(g => g.groupType === 'same_location').length,
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});