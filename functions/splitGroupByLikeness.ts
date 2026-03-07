import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

function normalizeName(name) {
  if (!name) return '';
  return name.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
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

    const { groupId, groupCandidates } = await req.json();

    if (!groupId || !groupCandidates || groupCandidates.length < 2) {
      return Response.json({ error: 'Invalid input' }, { status: 400 });
    }

    // Cluster candidates by name/address similarity
    const clusters = [];
    const assigned = new Set();

    for (const candidate of groupCandidates) {
      if (assigned.has(candidate.id)) continue;

      const cluster = [candidate];
      assigned.add(candidate.id);

      // Find similar candidates
      for (const other of groupCandidates) {
        if (assigned.has(other.id)) continue;

        const nameSim = stringSimilarity(candidate.proposedName, other.proposedName);
        const addressSim = stringSimilarity(candidate.address || '', other.address || '');

        // 0.8+ threshold for grouping
        if ((nameSim > 0.8 || addressSim > 0.8) && nameSim + addressSim > 1.3) {
          cluster.push(other);
          assigned.add(other.id);
        }
      }

      if (cluster.length > 0) {
        clusters.push(cluster);
      }
    }

    return Response.json({
      originalGroupId: groupId,
      clusters: clusters.map((cluster, idx) => ({
        newGroupId: `${groupId}_split_${idx}`,
        candidates: cluster,
        count: cluster.length,
      })),
      totalClusters: clusters.length,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});