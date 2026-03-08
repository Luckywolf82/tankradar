import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// Generiske prefixer å gruppere på
const GENERIC_PREFIXES = [
  'Tanken', 'Tank', 'Bensin', 'Stasjonen', 'Pumpen', 'Pumpe',
  'Drivstoff', 'Automat', 'Matkroken', 'Joker', 'Nærbutikken',
  'Servicestasjon', 'Bensinstasjon', 'Bensinkiosk', 'Kiosken',
  'Shell', 'Esso', 'St1', 'Yx', 'Uno-x', 'Circle k',
];

// Haversine-avstand i km
const haversine = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

// Trekk ut prefix (første "ord" eller kjent nøkkelord)
const extractPrefix = (name) => {
  if (!name) return null;
  const lower = name.toLowerCase().trim();
  for (const prefix of GENERIC_PREFIXES) {
    if (lower.startsWith(prefix.toLowerCase())) {
      return prefix.toLowerCase();
    }
  }
  return null;
};

// Cluster stasjoner med samme prefix geografisk (innen radiusKm)
const clusterByProximity = (stations, radiusKm = 1.0) => {
  const clusters = [];
  const assigned = new Set();

  for (let i = 0; i < stations.length; i++) {
    if (assigned.has(i)) continue;
    const cluster = [stations[i]];
    assigned.add(i);

    for (let j = i + 1; j < stations.length; j++) {
      if (assigned.has(j)) continue;
      const s1 = stations[i];
      const s2 = stations[j];
      if (!s1.latitude || !s2.latitude) continue;
      const dist = haversine(s1.latitude, s1.longitude, s2.latitude, s2.longitude);
      if (dist <= radiusKm) {
        cluster.push(stations[j]);
        assigned.add(j);
      }
    }

    clusters.push(cluster);
  }

  return clusters;
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const radiusKm = body.radiusKm ?? 1.0; // duplikat-terskel i km
    const filterPrefix = body.prefix ? body.prefix.toLowerCase() : null; // valgfritt: filtrer på ett prefix

    // Hent alle stasjoner
    let stations = [];
    let page = 0;
    const pageSize = 500;
    while (true) {
      const batch = await base44.asServiceRole.entities.Station.list('-created_date', pageSize, page * pageSize);
      if (!batch || batch.length === 0) break;
      stations = stations.concat(batch);
      if (batch.length < pageSize) break;
      page++;
    }

    // Grupper stasjoner etter prefix
    const byPrefix = {};
    for (const station of stations) {
      const prefix = extractPrefix(station.name);
      if (!prefix) continue;
      if (filterPrefix && prefix !== filterPrefix) continue;
      if (!byPrefix[prefix]) byPrefix[prefix] = [];
      byPrefix[prefix].push(station);
    }

    // For hvert prefix: cluster geografisk
    const result = [];
    for (const [prefix, prefixStations] of Object.entries(byPrefix)) {
      const clusters = clusterByProximity(prefixStations, radiusKm);

      const clusterData = clusters.map(cluster => {
        const names = [...new Set(cluster.map(s => s.name))];
        const cities = [...new Set(cluster.map(s => s.city).filter(Boolean))];
        const chains = [...new Set(cluster.map(s => s.chain).filter(Boolean))];

        return {
          count: cluster.length,
          names,
          cities,
          chains,
          likelyDuplicate: cluster.length > 1 && names.length === 1,
          possibleDuplicate: cluster.length > 1 && names.length > 1,
          stations: cluster.map(s => ({
            id: s.id,
            name: s.name,
            chain: s.chain || null,
            city: s.city || null,
            areaLabel: s.areaLabel || null,
            address: s.address || null,
            latitude: s.latitude,
            longitude: s.longitude,
            stationType: s.stationType,
          })),
        };
      });

      result.push({
        prefix,
        totalStations: prefixStations.length,
        totalClusters: clusters.length,
        likelyDuplicateClusters: clusterData.filter(c => c.likelyDuplicate).length,
        possibleDuplicateClusters: clusterData.filter(c => c.possibleDuplicate).length,
        uniqueClusters: clusterData.filter(c => c.count === 1).length,
        clusters: clusterData,
      });
    }

    // Sorter: mest stasjoner øverst
    result.sort((a, b) => b.totalStations - a.totalStations);

    const totalGeneric = result.reduce((sum, g) => sum + g.totalStations, 0);
    const totalLikelyDuplicates = result.reduce((sum, g) => sum + g.likelyDuplicateClusters, 0);

    console.log(`[groupGenericNameStations] Totalt generiske: ${totalGeneric} | Prefix-grupper: ${result.length} | Sannsynlige duplikater: ${totalLikelyDuplicates}`);

    return Response.json({
      success: true,
      radiusKm,
      summary: {
        totalGenericStations: totalGeneric,
        totalPrefixGroups: result.length,
        totalLikelyDuplicateClusters: totalLikelyDuplicates,
      },
      groups: result,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});