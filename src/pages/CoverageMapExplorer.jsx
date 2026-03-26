import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents, Circle, Polyline, Polygon } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, MapPin, Search, RefreshCw, Route } from 'lucide-react';
import { isStationInZone, distanceMeters, parseCorridorPoints, corridorFetchPoints } from '@/utils/zoneGeometry';


// ─── GP Cost Estimator (inlined to avoid external file dependency) ────────────
const COST_PER_REQUEST_USD = 0.049;
const DEFAULT_NOK_RATE = 10.8;

// Realism thresholds for circle zones (in meters)
const CIRCLE_REALISTIC_MAX = 10_000;   // <= 10 km → REALISTIC
const CIRCLE_LOW_MAX = 50_000;         // <= 50 km → LOW_REALISM
// > 50 km → VERY_LOW_REALISM

const REALISM_STYLE = {
  REALISTIC:      { label: 'REALISTIC',      bg: 'bg-green-100',  text: 'text-green-800',  dot: 'bg-green-500' },
  LOW_REALISM:    { label: 'LOW_REALISM',    bg: 'bg-amber-100',  text: 'text-amber-800',  dot: 'bg-amber-500' },
  VERY_LOW_REALISM: { label: 'VERY_LOW',     bg: 'bg-red-100',    text: 'text-red-700',    dot: 'bg-red-500'   },
};

const SORT_OPTIONS = [
  { key: 'name',          label: 'Name' },
  { key: 'cost',          label: 'Cost' },
  { key: 'coverage_rate', label: 'Coverage %' },
  { key: 'waste_rate',    label: 'Waste %' },
  { key: 'realism',       label: 'Realism' },
];

const REALISM_ORDER = { REALISTIC: 0, LOW_REALISM: 1, VERY_LOW_REALISM: 2 };

function getFetchPointCount(zone) {
  const zoneType = zone.zoneType || 'circle';
  if (zoneType === 'circle') return 1;
  if (zoneType === 'corridor') {
    try { return corridorFetchPoints(zone).length; } catch { return null; }
  }
  return null;
}

function classifyRealism(zone, stationsInZoneCount) {
  const zoneType = zone.zoneType || 'circle';
  if (zoneType === 'corridor') return 'REALISTIC'; // corridors have point-based fetch — always realistic
  // Circle realism
  const r = zone.radiusMeters || 5000;
  let realism = r <= CIRCLE_REALISTIC_MAX ? 'REALISTIC' : r <= CIRCLE_LOW_MAX ? 'LOW_REALISM' : 'VERY_LOW_REALISM';
  // Downgrade if large station count with only 1 fetch point
  if (realism === 'REALISTIC' && stationsInZoneCount > 20) realism = 'LOW_REALISM';
  return realism;
}

function GPCostEstimator({ zones, stations, dbCoverageMap, liveTestMap, getZoneMembership, zoneStationsMap }) {
  const [costPerRequest, setCostPerRequest] = React.useState(COST_PER_REQUEST_USD);
  const [runsPerDay, setRunsPerDay] = React.useState(1);
  const [nokRate, setNokRate] = React.useState(DEFAULT_NOK_RATE);
  const [sortKey, setSortKey] = React.useState('name');

  const activeZones = zones.filter(z => z.isActive);

  const zoneBreakdown = React.useMemo(() => {
    return activeZones.map(zone => {
      const zoneType = zone.zoneType || 'circle';
      const fetchPoints = getFetchPointCount(zone);
      const supported = fetchPoints !== null;
      const requestsPerRun = supported ? fetchPoints : null;
      const costPerRun = supported ? requestsPerRun * costPerRequest : null;

      // Station coverage for this zone
      const inZone = zoneStationsMap[zone.id] || [];
      const covered = inZone.filter(s => dbCoverageMap[s.id] != null);
      const untested = inZone.filter(s => !dbCoverageMap[s.id] && !liveTestMap[s.id]);
      const coverageRate = inZone.length > 0 ? covered.length / inZone.length : null;
      const wasteRate = inZone.length > 0 ? untested.length / inZone.length : null;
      const costPerCovered = (costPerRun != null && covered.length > 0) ? costPerRun / covered.length : null;

      // Realism
      const realism = classifyRealism(zone, inZone.length);

      return {
        zone, zoneType, fetchPoints, requestsPerRun, costPerRun, supported,
        inZone, covered, untested, coverageRate, wasteRate, costPerCovered, realism,
      };
    });
  }, [activeZones, costPerRequest, zoneStationsMap, dbCoverageMap, liveTestMap]);

  const sortedBreakdown = React.useMemo(() => {
    return [...zoneBreakdown].sort((a, b) => {
      if (sortKey === 'cost') return (b.costPerRun ?? -Infinity) - (a.costPerRun ?? -Infinity);
      if (sortKey === 'coverage_rate') return (b.coverageRate ?? -1) - (a.coverageRate ?? -1);
      if (sortKey === 'waste_rate') return (b.wasteRate ?? -1) - (a.wasteRate ?? -1);
      if (sortKey === 'realism') return REALISM_ORDER[a.realism] - REALISM_ORDER[b.realism];
      return a.zone.name.localeCompare(b.zone.name);
    });
  }, [zoneBreakdown, sortKey]);

  const totals = React.useMemo(() => {
    const rows = zoneBreakdown.filter(r => r.supported);
    const totalRequests = rows.reduce((s, r) => s + r.requestsPerRun, 0);
    const costPerRun = totalRequests * costPerRequest;
    return {
      totalRequests, costPerRun,
      costPerDay: costPerRun * runsPerDay,
      costPerWeek: costPerRun * runsPerDay * 7,
      costPerMonth: costPerRun * runsPerDay * 30,
    };
  }, [zoneBreakdown, costPerRequest, runsPerDay]);

  // Global realism warning: low cost but large/unrealistic zones
  const lowRealismZones = zoneBreakdown.filter(r => r.realism === 'LOW_REALISM' || r.realism === 'VERY_LOW_REALISM');
  const hasGlobalRealismWarning = lowRealismZones.length > 0 && totals.costPerMonth < 5;

  const inZoneStations = stations.filter(s => getZoneMembership(s) != null);
  const coveredInZone = inZoneStations.filter(s => dbCoverageMap[s.id] != null);
  const untestedInZone = inZoneStations.filter(s => !dbCoverageMap[s.id] && !liveTestMap[s.id]);
  const fmtUSD = v => v != null ? `$${v.toFixed(3)}` : '—';
  const fmtNOK = v => v != null ? `${(v * nokRate).toFixed(2)} kr` : '—';
  const fmtPct = v => v != null ? `${Math.round(v * 100)}%` : '—';

  return (
    <div className="space-y-4">
      {/* Model note */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-2.5 text-xs text-blue-800 leading-relaxed">
        <div className="font-semibold mb-1">Production fetch model</div>
        Cost is based on <strong>active GPFetchZone records</strong> — <strong>not per-station</strong>.
        circle = 1 request · corridor = ceil(length/4000)+1 requests.
        <div className="mt-1 text-blue-600">No scheduled automation is currently active — estimation only.</div>
      </div>

      {/* Global realism warning */}
      {hasGlobalRealismWarning && (
        <div className="bg-red-50 border border-red-300 rounded-lg p-2.5 text-xs text-red-800 leading-relaxed">
          <div className="font-bold mb-1">⚠ Estimated cost is artificially low</div>
          Large circle zones appear cheap because Nearby Search uses 1 request per zone regardless of size.
          In practice, <strong>a single request covers very limited geographic area</strong> and returns ≤20 results.
          Coverage will likely be poor.
        </div>
      )}

      {/* Configuration */}
      <div className="space-y-2">
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Configuration</div>
        <div className="grid grid-cols-3 gap-1.5">
          <div><label className="text-xs text-slate-500 block mb-0.5">$/request</label>
            <input type="number" step="0.001" value={costPerRequest} onChange={e => setCostPerRequest(parseFloat(e.target.value) || COST_PER_REQUEST_USD)} className="w-full px-2 py-1 border rounded text-xs" /></div>
          <div><label className="text-xs text-slate-500 block mb-0.5">Runs/day</label>
            <input type="number" min="1" value={runsPerDay} onChange={e => setRunsPerDay(Math.max(1, parseInt(e.target.value) || 1))} className="w-full px-2 py-1 border rounded text-xs" /></div>
          <div><label className="text-xs text-slate-500 block mb-0.5">NOK/USD</label>
            <input type="number" step="0.1" value={nokRate} onChange={e => setNokRate(parseFloat(e.target.value) || DEFAULT_NOK_RATE)} className="w-full px-2 py-1 border rounded text-xs" /></div>
        </div>
        <div className="text-xs text-slate-400">Default: <code>$0.049</code> = Nearby Search ($0.032) + fuelOptions ($0.017).</div>
      </div>

      {/* Zone table */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Active zones ({activeZones.length})</div>
          <select value={sortKey} onChange={e => setSortKey(e.target.value)} className="text-xs border rounded px-1.5 py-0.5 text-slate-600">
            {SORT_OPTIONS.map(o => <option key={o.key} value={o.key}>Sort: {o.label}</option>)}
          </select>
        </div>
        {activeZones.length === 0 ? <div className="text-xs text-slate-400 italic py-2">No active zones.</div> : (
          <div className="space-y-2">
            {sortedBreakdown.map(({ zone, zoneType, fetchPoints, requestsPerRun, costPerRun, supported, inZone, covered, untested, coverageRate, wasteRate, costPerCovered, realism }) => {
              const rs = REALISM_STYLE[realism];
              const isUnrealistic = realism === 'LOW_REALISM' || realism === 'VERY_LOW_REALISM';
              return (
                <div key={zone.id} className={`rounded border p-2 space-y-1.5 text-xs ${isUnrealistic ? 'border-amber-200 bg-amber-50' : 'border-slate-200 bg-white'}`}>
                  {/* Zone name + type + realism */}
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-semibold text-slate-800 truncate flex-1" title={zone.name}>{zone.name}</span>
                    <span className={`shrink-0 px-1.5 py-0.5 rounded text-xs font-semibold ${rs.bg} ${rs.text}`}>{rs.label}</span>
                  </div>

                  {/* Realism warning */}
                  {isUnrealistic && (
                    <div className="text-amber-700 leading-snug bg-amber-100 rounded px-2 py-1">
                      {realism === 'VERY_LOW_REALISM'
                        ? '⚠ Extremely large zone. Nearby Search cannot provide reliable coverage — 1 request returns ≤20 results regardless of radius.'
                        : '⚠ Large circle zone. Nearby Search is location-based and result-limited — actual coverage will be partial.'}
                    </div>
                  )}

                  {/* Cost + fetch info */}
                  <div className="grid grid-cols-4 gap-1 text-slate-600">
                    <div className="text-center">
                      <div className="font-bold text-slate-700">{supported ? fetchPoints : '?'}</div>
                      <div className="text-slate-400">fetch pts</div>
                    </div>
                    <div className="text-center">
                      <div className="font-bold text-slate-700">{supported ? fmtUSD(costPerRun) : '—'}</div>
                      <div className="text-slate-400">per run</div>
                    </div>
                    <div className="text-center">
                      <div className={`font-bold ${coverageRate != null ? (coverageRate > 0.5 ? 'text-green-700' : 'text-amber-600') : 'text-slate-400'}`}>{fmtPct(coverageRate)}</div>
                      <div className="text-slate-400">covered</div>
                    </div>
                    <div className="text-center">
                      <div className={`font-bold ${wasteRate != null && wasteRate > 0.5 ? 'text-red-600' : 'text-slate-600'}`}>{fmtPct(wasteRate)}</div>
                      <div className="text-slate-400">untested</div>
                    </div>
                  </div>

                  {/* Station + efficiency */}
                  <div className="flex items-center justify-between text-slate-500 border-t border-slate-100 pt-1">
                    <span>{inZone.length} stations · <span className="text-green-700">{covered.length} covered</span> · <span className="text-amber-600">{untested.length} untested</span></span>
                    {costPerCovered != null && (
                      <span className="text-slate-400">
                        {fmtUSD(costPerCovered)}/covered
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Totals */}
      <div className="space-y-2">
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Estimated totals</div>
        <div className="border rounded p-3 space-y-2 bg-white">
          <div className="flex justify-between text-xs"><span className="text-slate-500">Total requests / run</span><span className="font-bold text-slate-800">{totals.totalRequests}</span></div>
          <div className="flex justify-between text-xs border-t pt-2"><span className="text-slate-500">Cost / run</span><span className="font-semibold">{fmtUSD(totals.costPerRun)} <span className="text-slate-400 font-normal">({fmtNOK(totals.costPerRun)})</span></span></div>
          <div className="flex justify-between text-xs"><span className="text-slate-500">Cost / day ({runsPerDay}×)</span><span className="font-semibold">{fmtUSD(totals.costPerDay)} <span className="text-slate-400 font-normal">({fmtNOK(totals.costPerDay)})</span></span></div>
          <div className="flex justify-between text-xs"><span className="text-slate-500">Cost / week</span><span className="font-semibold">{fmtUSD(totals.costPerWeek)} <span className="text-slate-400 font-normal">({fmtNOK(totals.costPerWeek)})</span></span></div>
          <div className="flex justify-between text-xs border-t pt-2"><span className="text-slate-500 font-semibold">Cost / month (30d)</span><span className="font-bold text-blue-700">{fmtUSD(totals.costPerMonth)} <span className="text-blue-400 font-normal">({fmtNOK(totals.costPerMonth)})</span></span></div>
        </div>
        <div className="text-xs text-slate-400 italic">Estimates only. No automation active.</div>
      </div>

      {/* Global coverage summary */}
      <div className="space-y-1.5">
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Station coverage (all active zones)</div>
        <div className="grid grid-cols-3 gap-1.5">
          <div className="border rounded p-2 text-center"><div className="text-base font-bold text-slate-800">{inZoneStations.length}</div><div className="text-xs text-slate-500">In-zone</div></div>
          <div className="border rounded p-2 text-center bg-green-50"><div className="text-base font-bold text-green-700">{coveredInZone.length}</div><div className="text-xs text-slate-500">DB covered</div></div>
          <div className="border rounded p-2 text-center bg-amber-50"><div className="text-base font-bold text-amber-600">{untestedInZone.length}</div><div className="text-xs text-slate-500">Untested</div></div>
        </div>

        {/* Realism legend */}
        <div className="rounded border p-2 space-y-1 text-xs bg-slate-50">
          <div className="font-semibold text-slate-500 uppercase tracking-wide text-xs mb-1">Realism classification (circle zones)</div>
          <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" /><span className="text-slate-600"><strong>REALISTIC</strong> — radius ≤ 10 km</span></div>
          <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block" /><span className="text-slate-600"><strong>LOW_REALISM</strong> — radius 10–50 km</span></div>
          <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" /><span className="text-slate-600"><strong>VERY_LOW_REALISM</strong> — radius &gt; 50 km</span></div>
          <div className="text-slate-400 italic mt-1">Corridor zones are always REALISTIC (point-based fetch).</div>
        </div>
      </div>
    </div>
  );
}

// ─── Marker icons ─────────────────────────────────────────────────────────────
const makeIcon = (url, size = [20, 33]) => new L.Icon({
  iconUrl: url, iconSize: size,
  iconAnchor: [size[0] / 2, size[1]], popupAnchor: [0, -size[1]],
});
const ICONS = {
  // In-zone quality levels
  in_zone_full:       makeIcon('https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png'),
  in_zone_partial:    makeIcon('https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-yellow.png'),
  in_zone_weak:       makeIcon('https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png'),
  in_zone_no_data:    makeIcon('https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png'),
  in_zone_not_tested: makeIcon('https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png'),
  // Legacy aliases
  in_zone_covered:    makeIcon('https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png'),
  in_zone_uncovered:  makeIcon('https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png'),
  out_zone:           makeIcon('https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-grey.png', [14, 23]),
};

// ─── Quality classification ───────────────────────────────────────────────────
// dbEntry = entry from dbCoverageMap (historical DB rows only)
// liveEntry = entry from liveTestMap (live test result only)
function classifyGPQuality(dbEntry, liveEntry) {
  // If we have stored prices in DB: FULL (best evidence)
  if (dbEntry && dbEntry.storedFuelTypes?.length > 0) return 'full';
  if (dbEntry) return 'partial'; // DB rows exist but no fuel types resolved

  // No DB data — fall back to live test result if available
  if (!liveEntry) return 'not_tested';
  if (!liveEntry.gpReachable) return 'no_data';
  if (liveEntry.gpMatchFound && liveEntry.liveFuelTypes?.length > 0) return 'partial';
  if (liveEntry.gpMatchFound) return 'weak';
  return 'no_data';
}

// ─── GP Scope Decision ───────────────────────────────────────────────────────
// Computed from available signals. NOT stored in DB — ephemeral UI recommendation.
// "Remove from scope" is the only action that persists (via Station.reviewStatus = flagged).
//
// Logic:
//   keep_in_scope       — DB has useful prices (storedFuelTypes > 0) OR live test confirmed match + prices
//   monitor             — Some signal exists (DB rows without fuel types, or live match without prices)
//   remove_from_scope_candidate — Tested but GP returned nothing useful (no match, no prices)
//   insufficient_data   — Not enough signals to decide (not tested, no DB rows)
//
// GOVERNANCE NOTE: This does NOT require a test count — one strong negative signal is surfaced
// as a CANDIDATE only. The user must explicitly confirm removal. The UI shows the reason.
function computeScopeDecision(dbEntry, liveEntry) {
  const hasUsefulDB = dbEntry && dbEntry.storedFuelTypes?.length > 0;
  const hasDBRows = !!dbEntry;

  if (!liveEntry && !hasDBRows) {
    return { decision: 'insufficient_data', reason: 'No DB records and never tested for this station.' };
  }

  if (hasUsefulDB) {
    return { decision: 'keep_in_scope', reason: `${dbEntry.storedFuelTypes.join(', ')} found in database (${dbEntry.rowCount} rows).` };
  }

  if (liveEntry) {
    const liveUseful = liveEntry.gpMatchFound && (liveEntry.newRowsCreated > 0 || liveEntry.liveFuelTypes?.length > 0);
    if (liveUseful) {
      return { decision: 'keep_in_scope', reason: 'Live test returned a GP match with useful data.' };
    }
    const livePartial = liveEntry.gpMatchFound && liveEntry.gpReachable;
    if (livePartial) {
      return { decision: 'monitor', reason: 'GP match found but no price data returned. May improve.' };
    }
    if (!liveEntry.gpReachable) {
      return { decision: 'monitor', reason: 'GP not reachable during test — could be transient.' };
    }
    if (!liveEntry.gpMatchFound) {
      return { decision: 'remove_from_scope_candidate', reason: `GP reachable but no match found (${liveEntry.resultsCount} results). ${liveEntry.noDataReason || ''}` };
    }
  }

  if (hasDBRows && !hasUsefulDB) {
    return { decision: 'monitor', reason: 'DB rows exist but no fuel types resolved. Partial data.' };
  }

  return { decision: 'insufficient_data', reason: 'Signals present but ambiguous.' };
}

const SCOPE_DECISION_STYLE = {
  keep_in_scope:              { bg: 'bg-green-50',  border: 'border-green-200',  text: 'text-green-800',  label: 'Keep in scope',          dot: 'bg-green-500' },
  monitor:                    { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-800', label: 'Monitor',                dot: 'bg-yellow-500' },
  remove_from_scope_candidate:{ bg: 'bg-red-50',    border: 'border-red-200',    text: 'text-red-800',    label: 'Remove from scope candidate', dot: 'bg-red-500' },
  insufficient_data:          { bg: 'bg-slate-50',  border: 'border-slate-200',  text: 'text-slate-500',  label: 'Insufficient data',      dot: 'bg-slate-300' },
};

const QUALITY_STYLE = {
  full:       { bg: 'bg-green-100',  text: 'text-green-800',  label: 'FULL',     dot: 'bg-green-500' },
  partial:    { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'PARTIAL',  dot: 'bg-yellow-500' },
  weak:       { bg: 'bg-orange-100', text: 'text-orange-800', label: 'WEAK',     dot: 'bg-orange-400' },
  no_data:    { bg: 'bg-red-100',    text: 'text-red-700',    label: 'NO DATA',  dot: 'bg-red-400' },
  not_tested: { bg: 'bg-slate-100',  text: 'text-slate-500',  label: 'NOT TESTED', dot: 'bg-slate-300' },
};

// ─── Map controller + click handler ──────────────────────────────────────────
function MapController({ mapRef, onMapClick }) {
  const map = useMapEvents({ click: onMapClick });
  const initialized = useRef(false);
  useEffect(() => {
    if (map && !initialized.current) { mapRef.current = map; map.setView([63.43, 10.39], 11); initialized.current = true; }
  }, [map, mapRef]);
  return null;
}

// ─── Build a buffered polygon around a polyline (flat-earth approximation) ────
function buildCorridorPolygon(points, bufferMeters) {
  if (points.length < 2) return [];
  const DEG_PER_METER_LAT = 1 / 111320;
  const avgLat = points.reduce((s, p) => s + p.lat, 0) / points.length;
  const DEG_PER_METER_LNG = 1 / (111320 * Math.cos(avgLat * Math.PI / 180));

  const leftSide = [];
  const rightSide = [];

  for (let i = 0; i < points.length; i++) {
    // Compute average direction at this point
    const prev = i > 0 ? points[i - 1] : null;
    const next = i < points.length - 1 ? points[i + 1] : null;
    const ref = next || prev;
    const base = prev || next;

    const dlat = (ref.lat - base.lat);
    const dlng = (ref.lng - base.lng);
    const len = Math.sqrt(dlat * dlat + dlng * dlng) || 1;
    // Perpendicular (rotated 90°)
    const perpLat = -dlng / len;
    const perpLng = dlat / len;

    const offsetLat = perpLat * bufferMeters * DEG_PER_METER_LAT;
    const offsetLng = perpLng * bufferMeters * DEG_PER_METER_LNG;

    leftSide.push([points[i].lat + offsetLat, points[i].lng + offsetLng]);
    rightSide.push([points[i].lat - offsetLat, points[i].lng - offsetLng]);
  }

  return [...leftSide, ...[...rightSide].reverse()];
}

// ─── Corridor zone map layer ──────────────────────────────────────────────────
function CorridorZoneLayer({ zone, onZoneClick }) {
  const points = parseCorridorPoints(zone);
  if (points.length < 2) return null;

  const positions = points.map(p => [p.lat, p.lng]);
  const bufferMeters = zone.bufferMeters || 2000;
  const activeColor = zone.isActive ? '#10b981' : '#94a3b8';
  const polygonPositions = buildCorridorPolygon(points, bufferMeters);

  const popupContent = (
    <div className="text-xs min-w-[140px] space-y-1">
      <div className="font-bold">{zone.name}</div>
      <div className={zone.isActive ? 'text-green-700' : 'text-slate-400'}>
        {zone.isActive ? '✓ Active' : '✗ Inactive'} · corridor
      </div>
      <div className="text-slate-500">Buffer: {bufferMeters / 1000} km · Priority: {zone.priority || 'normal'}</div>
      <div className="text-slate-400">{points.length} waypoints</div>
    </div>
  );

  return (
    <>
      {/* Buffer polygon fill */}
      <Polygon
        positions={polygonPositions}
        pathOptions={{
          color: activeColor,
          weight: 1,
          opacity: zone.isActive ? 0.5 : 0.2,
          fillColor: activeColor,
          fillOpacity: zone.isActive ? 0.12 : 0.04,
          dashArray: zone.isActive ? null : '6,4',
        }}
        eventHandlers={{ click: () => onZoneClick(zone) }}
      >
        <Popup>{popupContent}</Popup>
      </Polygon>
      {/* Route centerline */}
      <Polyline
        positions={positions}
        pathOptions={{
          color: activeColor,
          weight: zone.isActive ? 2.5 : 1.5,
          opacity: zone.isActive ? 0.9 : 0.4,
          dashArray: zone.isActive ? null : '7,5',
        }}
        eventHandlers={{ click: () => onZoneClick(zone) }}
      >
        <Popup>{popupContent}</Popup>
      </Polyline>
    </>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function CoverageMapExplorer() {
  const mapRef = useRef(null);
  const [stations, setStations] = useState([]);
  const [zones, setZones] = useState([]);
  // dbCoverageMap: stationId → { storedFuelTypes, fetchedAt, sourceUpdatedAt, rowCount }
  // Populated ONLY from FuelPrice DB rows (sourceName=GooglePlaces). Never from test actions.
  const [dbCoverageMap, setDbCoverageMap] = useState({});
  // liveTestMap: stationId → { gpReachable, gpMatchFound, liveFuelTypes, matchDistance, matchConfidence, matchedName, resultsCount, newRowsCreated, testedAt }
  // Populated ONLY when "Test this station" is run. Never from DB load.
  const [liveTestMap, setLiveTestMap] = useState({});
  const [selectedStation, setSelectedStation] = useState(null);
  const [selectedZone, setSelectedZone] = useState(null);
  const [sidebarMode, setSidebarMode] = useState('zones');
  const [loading, setLoading] = useState(true);
  const [savingZone, setSavingZone] = useState(false);
  const [testingStation, setTestingStation] = useState(false);
  const [clickToTestMode, setClickToTestMode] = useState(false);
  const [testRadius, setTestRadius] = useState(1);
  const [showLayers, setShowLayers] = useState({ inZone: true, outZone: true, zoneShapes: true });

  // New corridor creation state
  const [corridorDraft, setCorridorDraft] = useState(null); // { points: [{lat,lng},...], name: '', buffer: 2000 }
  // New circle creation state
  const [circleDraft, setCircleDraft] = useState(null); // { center: {lat,lng}, name: '', radiusMeters: 5000 }

  // ─── Load ──────────────────────────────────────────────────────────────────
  // Loads DB state only. Does NOT touch liveTestMap.
  // Stations + zones load first (critical). GP prices load separately (non-blocking).
  const loadAll = useCallback(async () => {
    try {
      // Step 1: Load stations + zones — always required
      // Use filter with high limit to bypass default 50-row cap
      const [allStations, allZones] = await Promise.all([
        base44.entities.Station.filter({ status: 'active' }, '-created_date', 2000),
        base44.entities.GPFetchZone.list('-created_date', 200),
      ]);
      // Filter to valid coordinates (status filter already applied in query)
      setStations(allStations.filter(s => s.latitude && s.longitude));
      setZones(allZones);
      setLoading(false);

      // Step 2: Load GP prices separately — non-blocking, paginated to avoid rate limit
      try {
        // Fetch in batches of 200, max 5 batches (1000 rows) to avoid hanging
        let allGpPrices = [];
        let skip = 0;
        const batchSize = 200;
        const maxBatches = 5;
        for (let i = 0; i < maxBatches; i++) {
          const batch = await base44.entities.FuelPrice.filter(
            { sourceName: 'GooglePlaces' },
            '-fetchedAt',
            batchSize,
            skip
          );
          allGpPrices = allGpPrices.concat(batch);
          if (batch.length < batchSize) break;
          skip += batchSize;
        }

        // Build dbCoverageMap ONLY from actual FuelPrice rows with stationId
        const dbMap = {};
        for (const price of allGpPrices) {
          if (!price.stationId) continue;
          if (!dbMap[price.stationId]) {
            dbMap[price.stationId] = {
              storedFuelTypes: [],
              fetchedAt: price.fetchedAt,
              sourceUpdatedAt: price.sourceUpdatedAt || null,
              rowCount: 0,
            };
          }
          dbMap[price.stationId].rowCount += 1;
          if (price.fetchedAt > dbMap[price.stationId].fetchedAt)
            dbMap[price.stationId].fetchedAt = price.fetchedAt;
          if (price.fuelType && !dbMap[price.stationId].storedFuelTypes.includes(price.fuelType))
            dbMap[price.stationId].storedFuelTypes.push(price.fuelType);
        }
        setDbCoverageMap(dbMap);
      } catch (gpErr) {
        console.warn('GP prices load failed (non-critical):', gpErr.message);
        // Stations + zones still shown; coverage map will be empty
      }
    } catch (err) {
      console.error('Load failed:', err);
      setLoading(false);
    }
  }, []);
  useEffect(() => { loadAll(); }, [loadAll]);

  // ─── Helpers ──────────────────────────────────────────────────────────────
  // Pre-compute zone membership for all stations to avoid O(n*m*k) per render.
  const stationZoneMap = useMemo(() => {
    const map = {};
    const active = zones.filter(z => z.isActive);
    for (const station of stations) {
      for (const zone of active) {
        if (isStationInZone(station, zone)) {
          map[station.id] = zone;
          break;
        }
      }
    }
    return map;
  }, [stations, zones]);

  const getZoneMembership = useCallback((station) => {
    return stationZoneMap[station.id] || null;
  }, [stationZoneMap]);

  const getGpStatus = (stationId) => {
    const db = dbCoverageMap[stationId];
    if (!db) return 'not_tested';
    return db.storedFuelTypes?.length > 0 ? 'covered' : 'partial';
  };

  const getQuality = (stationId) => classifyGPQuality(dbCoverageMap[stationId], liveTestMap[stationId]);

  const getIcon = (station) => {
    const zone = getZoneMembership(station);
    if (!zone) return ICONS.out_zone;
    const quality = getQuality(station.id);
    return ICONS[`in_zone_${quality}`] || ICONS.in_zone_not_tested;
  };

  // Pre-compute per-zone station lists from stationZoneMap (O(n) — no geometry re-check)
  const zoneStationsMap = useMemo(() => {
    const map = {};
    for (const [stationId, zone] of Object.entries(stationZoneMap)) {
      if (!map[zone.id]) map[zone.id] = [];
      const station = stations.find(s => s.id === stationId);
      if (station) map[zone.id].push(station);
    }
    return map;
  }, [stationZoneMap, stations]);

  const stationsInZone = useCallback((zone) => {
    return zoneStationsMap[zone.id] || [];
  }, [zoneStationsMap]);

  // ─── Zone toggle ──────────────────────────────────────────────────────────
  const toggleZoneActive = async (zone) => {
    setSavingZone(true);
    try {
      await base44.entities.GPFetchZone.update(zone.id, { isActive: !zone.isActive });
      setZones(prev => prev.map(z => z.id === zone.id ? { ...z, isActive: !z.isActive } : z));
      if (selectedZone?.id === zone.id) setSelectedZone(z => ({ ...z, isActive: !z.isActive }));
    } catch (err) { alert(`Failed: ${err.message}`); }
    finally { setSavingZone(false); }
  };

  const updateZoneField = async (zone, field, value) => {
    await base44.entities.GPFetchZone.update(zone.id, { [field]: value });
    setZones(prev => prev.map(z => z.id === zone.id ? { ...z, [field]: value } : z));
    if (selectedZone?.id === zone.id) setSelectedZone(z => ({ ...z, [field]: value }));
  };

  // ─── Station status actions ───────────────────────────────────────────────
  // Safe actions using only verified existing Station.status and reviewStatus values.
  // Station.status enum: ['active', 'archived_duplicate']
  // Station.reviewStatus enum: ['pending', 'reviewed', 'flagged']
  const flagStation = async (station) => {
    await base44.entities.Station.update(station.id, { reviewStatus: 'flagged' });
    // Update local state — station stays on map but is flagged
    setStations(prev => prev.map(s => s.id === station.id ? { ...s, reviewStatus: 'flagged' } : s));
    setSelectedStation(s => s ? { ...s, reviewStatus: 'flagged' } : s);
  };

  const archiveStation = async (station) => {
    await base44.entities.Station.update(station.id, { status: 'archived_duplicate' });
    // Remove from active map immediately — archived stations are excluded by the active filter
    setStations(prev => prev.filter(s => s.id !== station.id));
    setSelectedStation(null);
    setSidebarMode('zones');
  };

  // ─── Test single station ──────────────────────────────────────────────────
  // Writes ONLY to liveTestMap. Does NOT modify dbCoverageMap.
  // After test, re-reads DB rows for this station and updates dbCoverageMap for that station only.
  const testSingleStation = async (station) => {
    setTestingStation(true);
    try {
      // 1. Run real live GP test
      const res = await base44.functions.invoke('discoverGooglePlacesCoverageAroundStations', {
        latitude: station.latitude,
        longitude: station.longitude,
        radiusKm: 0.5,
        stationId: station.id,
      });
      const gpResults = res?.data?.results || [];
      const gpReachable = res?.data != null && !res?.data?.error;
      const bestMatch = gpResults.find(r => r.matchedStationId === station.id) || gpResults[0] || null;
      // Extract any live fuel type hints from GP response (place types / fuel options if exposed)
      const liveFuelTypes = bestMatch?.fuelTypes || [];

      // 2. Re-read DB rows for THIS station (to detect newly persisted rows from this test)
      const gpPricesAfter = await base44.entities.FuelPrice.filter({ sourceName: 'GooglePlaces', stationId: station.id });
      const dbBefore = dbCoverageMap[station.id];
      const rowsBefore = dbBefore?.rowCount || 0;
      const newRowsCreated = Math.max(0, gpPricesAfter.length - rowsBefore);

      // Update dbCoverageMap for this station based on fresh DB read
      if (gpPricesAfter.length > 0) {
        const storedFuelTypes = [...new Set(gpPricesAfter.map(p => p.fuelType).filter(Boolean))];
        const latest = gpPricesAfter.sort((a, b) => new Date(b.fetchedAt) - new Date(a.fetchedAt))[0];
        setDbCoverageMap(prev => ({
          ...prev,
          [station.id]: {
            storedFuelTypes,
            fetchedAt: latest.fetchedAt,
            sourceUpdatedAt: latest.sourceUpdatedAt || null,
            rowCount: gpPricesAfter.length,
          },
        }));
      } else {
        // Explicitly remove from dbCoverageMap if no DB rows exist (was previously assumed)
        setDbCoverageMap(prev => {
          const next = { ...prev };
          delete next[station.id];
          return next;
        });
      }

      // 3. Store live test result separately — this is NOT historical data
      setLiveTestMap(prev => ({
        ...prev,
        [station.id]: {
          gpReachable,
          gpMatchFound: !!bestMatch,
          liveFuelTypes,
          matchDistance: bestMatch?.distance ?? null,
          matchConfidence: bestMatch?.matchConfidence ?? null,
          matchedName: bestMatch?.name ?? null,
          resultsCount: gpResults.length,
          newRowsCreated,
          noDataReason: !gpReachable
            ? 'GP not reachable'
            : gpResults.length === 0
            ? 'No GP results returned for this location'
            : !bestMatch
            ? 'No match found in GP results'
            : newRowsCreated === 0 && gpPricesAfter.length === 0
            ? 'GP matched but returned no price data'
            : null,
          testedAt: new Date().toISOString(),
        },
      }));
    } catch (err) { alert(`Error: ${err.message}`); }
    finally { setTestingStation(false); }
  };

  // ─── Save circle zone ─────────────────────────────────────────────────────
  const saveCircleZone = async () => {
    if (!circleDraft?.center) { alert('Klikk på kartet for å plassere senterpunktet.'); return; }
    if (!circleDraft.name.trim()) { alert('Skriv inn et sonenavn.'); return; }
    try {
      const newZone = await base44.entities.GPFetchZone.create({
        name: circleDraft.name.trim(),
        zoneType: 'circle',
        isActive: false,
        priority: 'normal',
        latitude: circleDraft.center.lat,
        longitude: circleDraft.center.lng,
        radiusMeters: circleDraft.radiusMeters || 5000,
        notes: `Circle zone created manually`,
      });
      setZones(prev => [...prev, newZone]);
      setCircleDraft(null);
      setSelectedZone(newZone);
      setSidebarMode('zone_detail');
    } catch (err) { alert(`Klarte ikke lagre sone: ${err.message}`); }
  };

  // ─── Map click ─────────────────────────────────────────────────────────────
  const handleMapClick = useCallback(async (e) => {
    // Circle draft mode: set center
    if (circleDraft && !circleDraft.center) {
      setCircleDraft(d => ({ ...d, center: { lat: e.latlng.lat, lng: e.latlng.lng } }));
      return;
    }
    // Corridor draft mode: add waypoints
    if (corridorDraft) {
      setCorridorDraft(d => ({ ...d, points: [...d.points, { lat: e.latlng.lat, lng: e.latlng.lng }] }));
      return;
    }
    if (!clickToTestMode) return;
    const { lat, lng } = e.latlng;
    const nearby = stations.filter(s => L.latLng(lat, lng).distanceTo([s.latitude, s.longitude]) / 1000 <= testRadius);
    if (nearby.length === 0) { alert('No stations within radius.'); return; }
    alert(`Testing ${nearby.length} stations near clicked point...`);
    try {
      await base44.functions.invoke('discoverGooglePlacesCoverageAroundStations', { latitude: lat, longitude: lng, radiusKm: testRadius });
      await loadAll();
      setClickToTestMode(false);
    } catch (err) { alert(`Error: ${err.message}`); }
  }, [circleDraft, corridorDraft, clickToTestMode, testRadius, stations, loadAll]);

  // ─── Save corridor zone ───────────────────────────────────────────────────
  const saveCorridorZone = async () => {
    if (!corridorDraft || corridorDraft.points.length < 2) { alert('Add at least 2 waypoints.'); return; }
    if (!corridorDraft.name.trim()) { alert('Enter a zone name.'); return; }
    const first = corridorDraft.points[0];
    try {
      const newZone = await base44.entities.GPFetchZone.create({
        name: corridorDraft.name.trim(),
        zoneType: 'corridor',
        isActive: false,
        priority: 'normal',
        latitude: first.lat,
        longitude: first.lng,
        radiusMeters: corridorDraft.fetchRadius || 3000,
        bufferMeters: corridorDraft.buffer || 2000,
        corridorPoints: JSON.stringify(corridorDraft.points),
        notes: `Corridor: ${corridorDraft.points.length} waypoints`,
      });
      setZones(prev => [...prev, newZone]);
      setCorridorDraft(null);
      setSelectedZone(newZone);
      setSidebarMode('zone_detail');
    } catch (err) { alert(`Failed to save zone: ${err.message}`); }
  };

  // ─── Stats ─────────────────────────────────────────────────────────────────
  const activeZones = zones.filter(z => z.isActive);
  const inActiveZone = stations.filter(s => getZoneMembership(s));
  // "covered" = has stored FuelPrice rows in DB (historical truth only)
  const coveredInZone = inActiveZone.filter(s => dbCoverageMap[s.id] != null);
  const untestedInZone = inActiveZone.filter(s => !dbCoverageMap[s.id] && !liveTestMap[s.id]);

  if (loading) return (
    <div className="w-full h-screen flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-slate-500" />
    </div>
  );

  const isDrawingCorridor = !!corridorDraft;
  const isDrawingCircle = !!circleDraft;

  return (
    <div className="w-full h-screen flex flex-col bg-slate-100">

      {/* ── Header ── */}
      <div className="bg-white border-b px-4 py-2 shadow-sm">
        <div className="flex items-center justify-between mb-1.5">
          <h1 className="text-lg font-bold">GP Fetch Scope &amp; Coverage Control</h1>
          <Button size="sm" variant="outline" onClick={loadAll}><RefreshCw className="w-3 h-3 mr-1" /> Refresh</Button>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Card className="px-3 py-1.5 flex gap-4 items-center text-xs">
            <div className="text-center"><div className="text-base font-bold">{stations.length}</div><div className="text-slate-500">Stations</div></div>
            <div className="text-center"><div className="text-base font-bold text-emerald-600">{activeZones.length}</div><div className="text-slate-500">Active zones</div></div>
            <div className="text-center"><div className="text-base font-bold text-blue-600">{inActiveZone.length}</div><div className="text-slate-500">In-zone</div></div>
            <div className="text-center"><div className="text-base font-bold text-green-600">{coveredInZone.length}</div><div className="text-slate-500">Covered</div></div>
            <div className="text-center"><div className="text-base font-bold text-amber-500">{untestedInZone.length}</div><div className="text-slate-500">Untested</div></div>
          </Card>
          <div className="flex items-center gap-2 text-xs text-slate-500 flex-wrap">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" /> Full</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-yellow-400 inline-block" /> Partial</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-orange-400 inline-block" /> Weak / no data</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" /> Not tested</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-slate-300 inline-block" /> Out of zone</span>
          </div>
          <div className="flex items-center gap-1 ml-auto">
            {!isDrawingCorridor && !isDrawingCircle && (
              <>
                <Button size="sm" variant={clickToTestMode ? 'default' : 'outline'} onClick={() => setClickToTestMode(m => !m)} className="text-xs">
                  <MapPin className="w-3 h-3 mr-1" />{clickToTestMode ? 'Click mode ON' : 'Click to test'}
                </Button>
                {clickToTestMode && (
                  <input type="number" value={testRadius} onChange={e => setTestRadius(Math.max(0.1, parseFloat(e.target.value) || 1))}
                    className="w-14 px-2 py-1 border rounded text-xs" placeholder="km" />
                )}
                <Button size="sm" variant="outline" onClick={() => { setCircleDraft({ center: null, name: '', radiusMeters: 5000 }); setClickToTestMode(false); }} className="text-xs">
                  <MapPin className="w-3 h-3 mr-1" /> New circle
                </Button>
                <Button size="sm" variant="outline" onClick={() => { setCorridorDraft({ points: [], name: '', buffer: 2000, fetchRadius: 3000 }); setClickToTestMode(false); }} className="text-xs">
                  <Route className="w-3 h-3 mr-1" /> New corridor
                </Button>
              </>
            )}
            {isDrawingCorridor && (
              <span className="text-xs text-blue-700 font-semibold bg-blue-50 border border-blue-200 rounded px-2 py-1">
                ✏ Click map to add waypoints ({corridorDraft.points.length} added)
              </span>
            )}
            {isDrawingCircle && (
              <span className="text-xs text-green-700 font-semibold bg-green-50 border border-green-200 rounded px-2 py-1">
                ✏ {circleDraft.center ? `Senter satt — juster i sidepanel` : 'Klikk kartet for å sette senterpunkt'}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Map + Sidebar ── */}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 relative" style={{ minWidth: 0 }}>
          <MapContainer center={[63.43, 10.39]} zoom={11} style={{ height: '100%', width: '100%' }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap" />
            <MapController mapRef={mapRef} onMapClick={handleMapClick} />

            {/* Zone shapes */}
            {showLayers.zoneShapes && zones.map(zone => {
              const zoneType = zone.zoneType || 'circle';
              if (zoneType === 'circle') {
                return (
                  <Circle key={zone.id} center={[zone.latitude, zone.longitude]} radius={zone.radiusMeters || 5000}
                    pathOptions={{ color: zone.isActive ? '#10b981' : '#94a3b8', weight: zone.isActive ? 2 : 1, opacity: zone.isActive ? 0.7 : 0.3, fillOpacity: zone.isActive ? 0.06 : 0.02, dashArray: zone.isActive ? null : '6,4' }}
                    eventHandlers={{ click: () => { setSelectedZone(zone); setSidebarMode('zone_detail'); } }}>
                    <Popup>
                      <div className="text-xs space-y-0.5">
                        <div className="font-bold">{zone.name}</div>
                        <div className={zone.isActive ? 'text-green-700' : 'text-slate-400'}>{zone.isActive ? '✓ Active' : '✗ Inactive'} · circle</div>
                        <div className="text-slate-500">R: {(zone.radiusMeters || 5000) / 1000} km · {zone.priority || 'normal'}</div>
                      </div>
                    </Popup>
                  </Circle>
                );
              }
              if (zoneType === 'corridor') {
                return <CorridorZoneLayer key={zone.id} zone={zone} onZoneClick={z => { setSelectedZone(z); setSidebarMode('zone_detail'); }} />;
              }
              return null;
            })}

            {/* Circle draft preview */}
            {isDrawingCircle && circleDraft.center && (
              <>
                <Circle
                  center={[circleDraft.center.lat, circleDraft.center.lng]}
                  radius={circleDraft.radiusMeters || 5000}
                  pathOptions={{ color: '#16a34a', weight: 2, opacity: 0.8, fillColor: '#16a34a', fillOpacity: 0.1, dashArray: '6,4' }}
                />
                <Marker position={[circleDraft.center.lat, circleDraft.center.lng]}
                  icon={makeIcon('https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png', [16, 26])}>
                  <Popup><div className="text-xs">Sirkelsenter (utkast)</div></Popup>
                </Marker>
              </>
            )}

            {/* Corridor draft preview */}
            {isDrawingCorridor && corridorDraft.points.length >= 1 && (
              <>
                {corridorDraft.points.length >= 2 && (() => {
                  const draftPositions = corridorDraft.points.map(p => [p.lat, p.lng]);
                  const draftPolygon = buildCorridorPolygon(corridorDraft.points, corridorDraft.buffer || 2000);
                  return (
                    <>
                      <Polygon positions={draftPolygon} pathOptions={{ color: '#2563eb', weight: 1, opacity: 0.5, fillColor: '#2563eb', fillOpacity: 0.1 }} />
                      <Polyline positions={draftPositions} pathOptions={{ color: '#2563eb', weight: 2.5, dashArray: '6,4' }} />
                    </>
                  );
                })()}
                {corridorDraft.points.map((p, i) => (
                  <Marker key={i} position={[p.lat, p.lng]} icon={makeIcon('https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png', [16, 26])}>
                    <Popup><div className="text-xs">Waypoint {i + 1}<br />{p.lat.toFixed(5)}, {p.lng.toFixed(5)}</div></Popup>
                  </Marker>
                ))}
              </>
            )}

            {/* Station markers */}
            {stations.map(station => {
              const zone = getZoneMembership(station);
              if (!showLayers.inZone && zone) return null;
              if (!showLayers.outZone && !zone) return null;
              const db = dbCoverageMap[station.id];
              const live = liveTestMap[station.id];
              const quality = getQuality(station.id);
              const qs = QUALITY_STYLE[quality] || QUALITY_STYLE.not_tested;
              const { decision } = computeScopeDecision(db, live);
              const ds = SCOPE_DECISION_STYLE[decision] || SCOPE_DECISION_STYLE.insufficient_data;
              return (
                <Marker key={station.id} position={[station.latitude, station.longitude]} icon={getIcon(station)}
                  eventHandlers={{ click: () => { setSelectedStation(station); setSidebarMode('station'); } }}>
                  <Popup>
                    <div className="text-xs min-w-[180px] space-y-1">
                      <div className="font-bold">{station.name}</div>
                      <div className="text-slate-500">{station.chain || 'Unknown chain'}</div>
                      <div className="flex gap-1 flex-wrap">
                        <span className={`px-1.5 py-0.5 rounded text-white text-xs ${zone ? 'bg-emerald-500' : 'bg-slate-400'}`}>{zone ? zone.name : 'Out of zone'}</span>
                        <span className={`px-1.5 py-0.5 rounded text-xs ${qs.bg} ${qs.text}`}>{qs.label}</span>
                      </div>
                      <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-xs ${ds.bg} ${ds.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${ds.dot}`} />
                        {ds.label}
                      </div>
                      {db && <div className="text-green-700">DB: {db.storedFuelTypes?.join(', ') || 'no fuel types'} ({db.rowCount} rows)</div>}
                      {!db && live && <div className="text-slate-500">Tested · {live.gpMatchFound ? 'match found' : 'no match'}</div>}
                      {station.reviewStatus === 'flagged' && <div className="text-amber-600 font-semibold">⚑ Flagged for review</div>}
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>

          {clickToTestMode && !isDrawingCorridor && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[500] bg-blue-600 text-white text-xs px-3 py-1.5 rounded-full shadow-lg pointer-events-none">
              Click map to test stations within {testRadius} km
            </div>
          )}
        </div>

        {/* ── Sidebar ── */}
        <div className="w-80 bg-white border-l flex flex-col overflow-hidden shadow-sm">

          {/* Corridor draft panel */}
          {isDrawingCorridor && (
            <div className="border-b bg-blue-50 p-3 space-y-2">
              <div className="text-xs font-bold text-blue-800">New corridor zone</div>
              <input
                className="w-full px-2 py-1 border rounded text-xs"
                placeholder="Zone name (e.g. E6 Trondheim → Berkåk)"
                value={corridorDraft.name}
                onChange={e => setCorridorDraft(d => ({ ...d, name: e.target.value }))}
              />
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-xs text-slate-500">Buffer (m)</label>
                  <input type="number" className="w-full px-2 py-1 border rounded text-xs" value={corridorDraft.buffer}
                    onChange={e => setCorridorDraft(d => ({ ...d, buffer: parseInt(e.target.value) || 2000 }))} />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-slate-500">Fetch radius (m)</label>
                  <input type="number" className="w-full px-2 py-1 border rounded text-xs" value={corridorDraft.fetchRadius}
                    onChange={e => setCorridorDraft(d => ({ ...d, fetchRadius: parseInt(e.target.value) || 3000 }))} />
                </div>
              </div>
              <div className="text-xs text-blue-700">{corridorDraft.points.length} waypoint{corridorDraft.points.length !== 1 ? 's' : ''} added</div>
              {corridorDraft.points.length > 0 && (
                <button className="text-xs text-red-500 underline" onClick={() => setCorridorDraft(d => ({ ...d, points: d.points.slice(0, -1) }))}>
                  ← Remove last waypoint
                </button>
              )}
              <div className="flex gap-1">
                <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={() => setCorridorDraft(null)}>Cancel</Button>
                <Button size="sm" className="flex-1 text-xs" onClick={saveCorridorZone} disabled={corridorDraft.points.length < 2 || !corridorDraft.name.trim()}>
                  Save zone
                </Button>
              </div>
            </div>
          )}

          {/* Circle draft panel */}
          {isDrawingCircle && (
            <div className="border-b bg-green-50 p-3 space-y-2">
              <div className="text-xs font-bold text-green-800">Ny sirkelsone</div>
              <input
                className="w-full px-2 py-1 border rounded text-xs"
                placeholder="Sonenavn (f.eks. Trondheim sentrum)"
                value={circleDraft.name}
                onChange={e => setCircleDraft(d => ({ ...d, name: e.target.value }))}
              />
              <div>
                <label className="text-xs text-slate-500">Radius (m)</label>
                <input type="number" className="w-full px-2 py-1 border rounded text-xs" value={circleDraft.radiusMeters}
                  onChange={e => setCircleDraft(d => ({ ...d, radiusMeters: parseInt(e.target.value) || 5000 }))} />
              </div>
              {circleDraft.center ? (
                <div className="text-xs text-green-700">
                  Senter: {circleDraft.center.lat.toFixed(5)}, {circleDraft.center.lng.toFixed(5)}
                  <button className="ml-2 text-red-500 underline" onClick={() => setCircleDraft(d => ({ ...d, center: null }))}>Tilbakestill</button>
                </div>
              ) : (
                <div className="text-xs text-green-600 italic">Klikk på kartet for å sette senterpunkt</div>
              )}
              <div className="flex gap-1">
                <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={() => setCircleDraft(null)}>Avbryt</Button>
                <Button size="sm" className="flex-1 text-xs" onClick={saveCircleZone} disabled={!circleDraft.center || !circleDraft.name.trim()}>
                  Lagre sone
                </Button>
              </div>
            </div>
          )}

          <div className="flex border-b text-xs font-semibold">
            {[
              { key: 'zones', label: 'Zones' },
              { key: 'station', label: `Station${selectedStation ? ' ●' : ''}` },
              { key: 'zone_detail', label: `Zone${selectedZone ? ' ●' : ''}` },
              { key: 'cost', label: 'Cost' },
            ].map(({ key, label }) => (
              <button key={key} onClick={() => setSidebarMode(key)}
                className={`flex-1 py-2 px-1 ${sidebarMode === key ? 'border-b-2 border-blue-600 text-blue-700 bg-blue-50' : 'text-slate-500 hover:bg-slate-50'}`}>
                {label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3">

            {/* ── Zones list ── */}
            {sidebarMode === 'zones' && (
              <>
                <div>
                  <h3 className="font-semibold text-xs text-slate-500 uppercase tracking-wide mb-2">Layer visibility</h3>
                  <div className="space-y-1.5">
                    {[{ key: 'inZone', label: 'In-zone stations' }, { key: 'outZone', label: 'Out-of-zone stations' }, { key: 'zoneShapes', label: 'Zone shapes' }].map(({ key, label }) => (
                      <label key={key} className="flex items-center gap-2 cursor-pointer">
                        <Checkbox checked={showLayers[key]} onCheckedChange={v => setShowLayers(prev => ({ ...prev, [key]: !!v }))} />
                        <span className="text-sm">{label}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-xs text-slate-500 uppercase tracking-wide mb-2">
                    Fetch zones ({activeZones.length} active / {zones.length} total)
                  </h3>
                  <div className="space-y-1.5">
                    {zones.map(zone => {
                      const inZone = stationsInZone(zone);
                      const coveredCount = inZone.filter(s => getGpStatus(s.id) === 'covered').length;
                      return (
                        <div key={zone.id}
                          className={`rounded border p-2 cursor-pointer transition-colors ${zone.isActive ? 'border-emerald-200 bg-emerald-50 hover:bg-emerald-100' : 'border-slate-200 bg-white hover:bg-slate-50'}`}
                          onClick={() => { setSelectedZone(zone); setSidebarMode('zone_detail'); }}>
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-1 flex-1 mr-2 min-w-0">
                              {(zone.zoneType || 'circle') === 'corridor' && <Route className="w-3 h-3 text-blue-500 shrink-0" />}
                              <span className="text-xs font-semibold truncate">{zone.name}</span>
                            </div>
                            <button disabled={savingZone} onClick={e => { e.stopPropagation(); toggleZoneActive(zone); }}
                              className={`shrink-0 text-xs px-2 py-0.5 rounded font-semibold ${zone.isActive ? 'bg-emerald-500 text-white hover:bg-emerald-600' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'}`}>
                              {zone.isActive ? 'ON' : 'OFF'}
                            </button>
                          </div>
                          <div className="text-xs text-slate-500 flex gap-2">
                            <span>{inZone.length} stations</span>
                            <span className="text-green-700">{coveredCount} covered</span>
                            <span className="capitalize text-slate-400">{zone.priority || 'normal'}</span>
                          </div>
                          {zone.lastFetchedAt && <div className="text-xs text-slate-400 mt-0.5">Last fetch: {new Date(zone.lastFetchedAt).toLocaleDateString()}</div>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            {/* ── Station detail ── */}
            {sidebarMode === 'station' && (
              !selectedStation ? (
                <div className="text-sm text-slate-400 text-center pt-8">Click a station on the map</div>
              ) : (() => {
                const zone = getZoneMembership(selectedStation);
                const db = dbCoverageMap[selectedStation.id] || null;
                const live = liveTestMap[selectedStation.id] || null;
                const quality = getQuality(selectedStation.id);
                const qs = QUALITY_STYLE[quality] || QUALITY_STYLE.not_tested;
                const { decision, reason } = computeScopeDecision(db, live);
                const ds = SCOPE_DECISION_STYLE[decision] || SCOPE_DECISION_STYLE.insufficient_data;

                const Row = ({ label, value, valueClass }) => (
                  <div className="flex items-start justify-between gap-2 py-1 border-b border-slate-100 last:border-0">
                    <span className="text-xs text-slate-500 shrink-0 w-36">{label}</span>
                    <span className={`text-xs font-medium text-right ${valueClass || 'text-slate-700'}`}>{value}</span>
                  </div>
                );

                return (
                  <div className="space-y-3">
                    {/* Station header */}
                    <div>
                      <h3 className="font-bold text-sm leading-tight">{selectedStation.name}</h3>
                      <div className="text-xs text-slate-500">{selectedStation.chain || 'Unknown chain'}</div>
                      {selectedStation.address && <div className="text-xs text-slate-400">{selectedStation.address}</div>}
                    </div>

                    {/* GP Scope Decision — computed from db + live signals */}
                    <div className={`rounded-lg border p-2.5 ${ds.bg} ${ds.border}`}>
                      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">GP Scope Assessment</div>
                      <div className={`text-sm font-bold ${ds.text} flex items-center gap-1.5 mb-1`}>
                        <span className={`w-2 h-2 rounded-full shrink-0 ${ds.dot}`} />
                        {ds.label}
                      </div>
                      <div className="text-xs text-slate-600 leading-relaxed">{reason}</div>
                      {decision === 'insufficient_data' && (
                        <div className="text-xs text-slate-400 mt-1 italic">Run "Test this station" to generate a signal.</div>
                      )}
                    </div>

                    {/* Fetch scope */}
                    <div className="rounded-lg border p-2.5 space-y-0.5">
                      <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Fetch scope</div>
                      <Row label="Zone" value={zone ? zone.name : 'None'} valueClass={zone ? 'text-emerald-700' : 'text-slate-400'} />
                      <Row label="In active scope" value={zone ? 'Yes' : 'No'} valueClass={zone ? 'text-emerald-700 font-bold' : 'text-slate-400'} />
                      {zone && <Row label="Zone type" value={`${zone.zoneType || 'circle'} · ${zone.priority || 'normal'}`} />}
                      <Row label="Station status" value={selectedStation.status || 'active'} valueClass={selectedStation.status === 'active' ? 'text-green-700' : 'text-red-600'} />
                      <Row
                        label="Review status"
                        value={selectedStation.reviewStatus || 'pending'}
                        valueClass={
                          selectedStation.reviewStatus === 'reviewed' ? 'text-green-700' :
                          selectedStation.reviewStatus === 'flagged' ? 'text-amber-600 font-semibold' :
                          'text-slate-500'
                        }
                      />
                    </div>

                    {/* Quality badge */}
                    <div className={`rounded-lg px-3 py-2 flex items-center justify-between ${qs.bg}`}>
                      <span className={`text-xs font-bold uppercase tracking-wide ${qs.text}`}>GP quality: {qs.label}</span>
                      {live?.testedAt && <span className="text-xs text-slate-400">tested {new Date(live.testedAt).toLocaleTimeString()}</span>}
                    </div>

                    {/* A. Historical data — from DB only */}
                    <div className="rounded-lg border p-2.5 space-y-0.5">
                      <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">A · Stored data (database)</div>
                      <Row
                        label="Has stored GP prices"
                        value={db ? `Yes (${db.rowCount} rows)` : 'No'}
                        valueClass={db ? 'text-green-700 font-semibold' : 'text-slate-400'}
                      />
                      <Row
                        label="Stored fuel types"
                        value={db?.storedFuelTypes?.length > 0 ? db.storedFuelTypes.join(', ') : db ? 'None resolved' : '—'}
                        valueClass={db?.storedFuelTypes?.length > 0 ? 'text-blue-700' : 'text-slate-400'}
                      />
                      <Row
                        label="Last fetchedAt"
                        value={db?.fetchedAt ? new Date(db.fetchedAt).toLocaleString('nb-NO') : '—'}
                        valueClass="text-slate-600"
                      />
                      <Row
                        label="Source updatedAt"
                        value={db?.sourceUpdatedAt ? new Date(db.sourceUpdatedAt).toLocaleString('nb-NO') : 'Unknown'}
                        valueClass="text-slate-600"
                      />
                    </div>

                    {/* B. Live test result */}
                    <div className="rounded-lg border p-2.5 space-y-0.5">
                      <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">B · Live test result</div>
                      {!live ? (
                        <div className="text-xs text-slate-400 italic py-1">Not tested yet — click "Test this station"</div>
                      ) : (
                        <>
                          <Row label="GP reachable" value={live.gpReachable ? 'Yes' : 'No'} valueClass={live.gpReachable ? 'text-green-700' : 'text-red-600'} />
                          <Row
                            label="GP match found"
                            value={live.gpMatchFound ? `Yes (${live.resultsCount} results)` : `No (${live.resultsCount} results)`}
                            valueClass={live.gpMatchFound ? 'text-green-700' : 'text-slate-400'}
                          />
                          {live.gpMatchFound && (
                            <>
                              <Row label="Match distance" value={live.matchDistance != null ? `${live.matchDistance} km` : 'Unknown'} />
                              <Row label="Match confidence" value={live.matchConfidence || 'Unknown'} />
                              {live.matchedName && live.matchedName !== selectedStation.name && (
                                <Row label="GP name" value={live.matchedName} valueClass="text-slate-500 italic" />
                              )}
                              {live.liveFuelTypes?.length > 0 && (
                                <Row label="Live fuel types" value={live.liveFuelTypes.join(', ')} valueClass="text-blue-700" />
                              )}
                            </>
                          )}
                          {live.noDataReason && (
                            <div className="text-xs text-amber-700 bg-amber-50 rounded px-2 py-1 mt-1">{live.noDataReason}</div>
                          )}
                        </>
                      )}
                    </div>

                    {/* C. Persistence result */}
                    {live && (
                      <div className="rounded-lg border p-2.5 space-y-0.5">
                        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">C · Persistence result (this test)</div>
                        <Row
                          label="New rows created"
                          value={live.newRowsCreated > 0 ? `Yes (${live.newRowsCreated})` : 'No'}
                          valueClass={live.newRowsCreated > 0 ? 'text-green-700 font-semibold' : 'text-slate-400'}
                        />
                        {live.newRowsCreated === 0 && (
                          <div className="text-xs text-slate-500 italic">
                            {live.gpMatchFound
                              ? 'GP matched but no price data was persisted.'
                              : 'No match — nothing to persist.'}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="space-y-1.5 pt-1 border-t">
                      <div className="text-xs text-slate-400 font-semibold uppercase tracking-wide pt-1">Actions</div>

                      <Button size="sm" className="w-full" disabled={testingStation} onClick={() => testSingleStation(selectedStation)}>
                        {testingStation ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
                        Test this station
                      </Button>
                      <Button size="sm" variant="outline" className="w-full" onClick={() => { if (mapRef.current) mapRef.current.setView([selectedStation.latitude, selectedStation.longitude], 15); }}>
                        <MapPin className="w-4 h-4 mr-2" /> Center map here
                      </Button>

                      {/* Remove from GP fetch scope
                          GOVERNANCE: Uses Station.reviewStatus = 'flagged' (verified existing enum).
                          There is no 'excluded_from_gp' enum value in the Station model.
                          Flagging is the smallest safe existing mechanism to mark a station for operational review.
                          The operator must confirm with a documented reason before the action is applied.
                          This does NOT archive the station — it remains active but flagged.
                      */}
                      <div className="space-y-1.5 pt-1">
                        <div className="text-xs text-slate-400 italic leading-relaxed">
                          "Remove from scope" flags the station for operational review
                          (<code>reviewStatus → flagged</code>). No new enum values are introduced.
                          This is a soft signal — the station stays active. Only archive if it is a confirmed duplicate.
                        </div>

                        {decision === 'remove_from_scope_candidate' && selectedStation.reviewStatus !== 'flagged' && (
                          <div className="bg-red-50 border border-red-200 rounded p-2 text-xs text-red-700 space-y-1.5">
                            <div className="font-semibold">⚠ Scope removal candidate</div>
                            <div>{reason}</div>
                            <div className="text-red-500 italic">Based on 1 test. Confirm only if this reflects a persistent pattern.</div>
                            <Button
                              size="sm"
                              className="w-full bg-red-600 hover:bg-red-700 text-white"
                              onClick={() => {
                                if (window.confirm(`Remove "${selectedStation.name}" from active GP fetch scope?\n\nThis sets reviewStatus → flagged.\nReason: ${reason}\n\nThe station stays active but is marked for review. You can reverse this in the Station editor.`)) {
                                  flagStation(selectedStation);
                                }
                              }}
                            >
                              Remove from active fetch scope
                            </Button>
                          </div>
                        )}

                        {selectedStation.reviewStatus === 'flagged' && (
                          <div className="text-xs bg-amber-50 border border-amber-200 text-amber-700 rounded px-2 py-1.5 font-semibold">
                            ✓ Already flagged — excluded from automatic GP fetch scope assessment
                          </div>
                        )}

                        {decision !== 'remove_from_scope_candidate' && selectedStation.reviewStatus !== 'flagged' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full border-amber-300 text-amber-700 hover:bg-amber-50"
                            onClick={() => {
                              if (window.confirm(`Flag "${selectedStation.name}" for scope review?\n\nThis sets reviewStatus → flagged. Use this if you have reason to question this station's GP value beyond current test signals.`)) {
                                flagStation(selectedStation);
                              }
                            }}
                          >
                            Flag for scope review
                          </Button>
                        )}

                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full border-red-300 text-red-700 hover:bg-red-50 text-xs"
                          onClick={() => {
                            if (window.confirm(`PERMANENTLY archive "${selectedStation.name}"?\n\nThis sets status → archived_duplicate.\nUse ONLY if this is a confirmed duplicate station.\n\nThis cannot be easily undone from this UI.`)) {
                              archiveStation(selectedStation);
                            }
                          }}
                        >
                          Archive as duplicate (permanent)
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })()
            )}

            {/* ── Cost estimator ── */}
            {sidebarMode === 'cost' && (
              <GPCostEstimator
                zones={zones}
                stations={stations}
                dbCoverageMap={dbCoverageMap}
                liveTestMap={liveTestMap}
                getZoneMembership={getZoneMembership}
                zoneStationsMap={zoneStationsMap}
              />
            )}

            {/* ── Zone detail ── */}
            {sidebarMode === 'zone_detail' && (
              !selectedZone ? (
                <div className="text-sm text-slate-400 text-center pt-8">Click a zone on the map or select from list</div>
              ) : (() => {
                const inZone = stationsInZone(selectedZone);
                const covered = inZone.filter(s => getGpStatus(s.id) === 'covered');
                const partial = inZone.filter(s => getGpStatus(s.id) === 'partial');
                const notTested = inZone.filter(s => getGpStatus(s.id) === 'not_tested');
                const zoneType = selectedZone.zoneType || 'circle';
                const pts = zoneType === 'corridor' ? parseCorridorPoints(selectedZone) : [];
                const fetchPts = zoneType === 'corridor' ? corridorFetchPoints(selectedZone) : [{ latitude: selectedZone.latitude, longitude: selectedZone.longitude }];

                return (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-bold text-sm">{selectedZone.name}</h3>
                        <div className="flex items-center gap-1 mt-0.5">
                          {zoneType === 'corridor' && <Route className="w-3 h-3 text-blue-500" />}
                          <span className="text-xs text-slate-400 capitalize">{zoneType}</span>
                        </div>
                      </div>
                      <button disabled={savingZone} onClick={() => toggleZoneActive(selectedZone)}
                        className={`text-xs px-3 py-1 rounded font-semibold ${selectedZone.isActive ? 'bg-emerald-500 text-white hover:bg-emerald-600' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`}>
                        {selectedZone.isActive ? 'ON' : 'OFF'}
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5 text-xs">
                      <Card className="p-2 text-center"><div className="font-bold text-base">{inZone.length}</div><div className="text-slate-500">Stations</div></Card>
                      <Card className="p-2 text-center bg-green-50"><div className="font-bold text-base text-green-700">{covered.length}</div><div className="text-slate-500">GP covered</div></Card>
                      <Card className="p-2 text-center bg-yellow-50"><div className="font-bold text-base text-yellow-600">{partial.length}</div><div className="text-slate-500">Partial</div></Card>
                      <Card className="p-2 text-center bg-slate-50"><div className="font-bold text-base text-slate-500">{notTested.length}</div><div className="text-slate-500">Not tested</div></Card>
                    </div>

                    {/* Zone type specific info */}
                    {zoneType === 'corridor' && (
                      <div className="rounded border p-2 space-y-1 text-xs bg-blue-50 border-blue-100">
                        <div className="font-semibold text-blue-800">Corridor details</div>
                        <div className="text-slate-600">{pts.length} waypoints · {fetchPts.length} fetch points</div>
                        <div className="text-slate-600">Buffer: {(selectedZone.bufferMeters || 2000) / 1000} km each side</div>
                        <div className="text-slate-600">Fetch radius per point: {(selectedZone.radiusMeters || 3000) / 1000} km</div>
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Priority</div>
                      <div className="flex gap-1">
                        {['high', 'normal', 'low'].map(p => (
                          <button key={p} onClick={() => updateZoneField(selectedZone, 'priority', p)}
                            className={`flex-1 py-1 text-xs rounded border capitalize ${selectedZone.priority === p ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>
                            {p}
                          </button>
                        ))}
                      </div>
                    </div>

                    {zoneType === 'circle' && (
                      <div className="space-y-1.5">
                        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Radius</div>
                        <div className="flex gap-1 items-center">
                          <input type="number" defaultValue={selectedZone.radiusMeters || 5000} className="flex-1 px-2 py-1 border rounded text-xs"
                            onBlur={e => updateZoneField(selectedZone, 'radiusMeters', parseInt(e.target.value))} />
                          <span className="text-xs text-slate-400">m</span>
                        </div>
                      </div>
                    )}

                    {zoneType === 'corridor' && (
                      <div className="grid grid-cols-2 gap-1.5">
                        <div className="space-y-1">
                          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Buffer (m)</div>
                          <input type="number" defaultValue={selectedZone.bufferMeters || 2000} className="w-full px-2 py-1 border rounded text-xs"
                            onBlur={e => updateZoneField(selectedZone, 'bufferMeters', parseInt(e.target.value))} />
                        </div>
                        <div className="space-y-1">
                          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Fetch R (m)</div>
                          <input type="number" defaultValue={selectedZone.radiusMeters || 3000} className="w-full px-2 py-1 border rounded text-xs"
                            onBlur={e => updateZoneField(selectedZone, 'radiusMeters', parseInt(e.target.value))} />
                        </div>
                      </div>
                    )}

                    {selectedZone.notes && <div className="text-xs text-slate-500 bg-slate-50 rounded p-2">{selectedZone.notes}</div>}
                    {selectedZone.lastFetchedAt && (
                      <div className="text-xs text-slate-400">
                        Last fetch: {new Date(selectedZone.lastFetchedAt).toLocaleString()}
                        {selectedZone.lastFetchStats && <div className="mt-0.5">{selectedZone.lastFetchStats}</div>}
                      </div>
                    )}

                    <Button size="sm" variant="outline" className="w-full" onClick={() => { if (!mapRef.current) return; mapRef.current.setView([selectedZone.latitude, selectedZone.longitude], 11); }}>
                      <MapPin className="w-4 h-4 mr-2" /> Go to zone
                    </Button>

                    <div>
                      <div className="text-xs font-semibold text-slate-500 mb-1.5">Stations in zone</div>
                      <div className="space-y-0.5 max-h-44 overflow-y-auto">
                        {inZone.map(s => {
                          const q = getQuality(s.id);
                          const qs = QUALITY_STYLE[q] || QUALITY_STYLE.not_tested;
                          return (
                            <div key={s.id} className="flex items-center justify-between text-xs p-1.5 rounded hover:bg-slate-50 cursor-pointer"
                              onClick={() => { setSelectedStation(s); setSidebarMode('station'); }}>
                              <span className="truncate flex-1 mr-2">{s.name}</span>
                              <span className={`shrink-0 px-1.5 py-0.5 rounded text-xs font-medium ${qs.bg} ${qs.text}`}>{qs.label}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })()
            )}
          </div>
        </div>
      </div>
    </div>
  );
}