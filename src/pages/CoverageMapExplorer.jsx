import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents, Circle, Polyline, Polygon } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, MapPin, Search, RefreshCw, Route, FlaskConical, XCircle } from 'lucide-react';
import { isStationInZone, distanceMeters, parseCorridorPoints, corridorFetchPoints } from '@/utils/zoneGeometry';
import ZoneTestResultPanel from '@/components/admin/ZoneTestResultPanel';
import StationTestResultPanel from '@/components/admin/StationTestResultPanel';


// ─── GP Cost Estimator (inlined to avoid external file dependency) ────────────
const COST_PER_REQUEST_USD = 0.049;
const DEFAULT_NOK_RATE = 10.8;

const REALISM_STYLE = {
  REALISTIC:        { label: 'REALISTIC',   bg: 'bg-green-100',  text: 'text-green-800', dot: 'bg-green-500' },
  LOW_REALISM:      { label: 'LOW_REALISM', bg: 'bg-amber-100',  text: 'text-amber-800', dot: 'bg-amber-500' },
  VERY_LOW_REALISM: { label: 'VERY_LOW',    bg: 'bg-red-100',    text: 'text-red-700',   dot: 'bg-red-500'   },
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

// ─── Data-outcome realism classifier ─────────────────────────────────────────
// Realism = "Does this zone actually produce useful data?"
// No geometry signals. Size alone never downgrades a zone.
//
// Inputs:
//   inZoneCount    — stations in zone
//   coveredCount   — stations with DB price rows (covered)
//   untestedCount  — stations with no DB rows and no live test
//   fetchPoints    — number of fetch points for the zone
//   costPerCovered — USD cost per covered station (null if no covered stations)
//   hasFetchHistory — whether lastFetchedAt is set (zone has run at least once)
//
// Thresholds:
//   coverageRate  < 0.20  → significant issue
//   coverageRate  < 0.40  → moderate issue
//   wasteRate     > 0.80  → very high untested share (after fetch history)
//   wasteRate     > 0.60  → high untested share (after fetch history)
//   coveredPerPt  < 1.0   → poor yield per fetch point
//   costPerCovered > 0.5  → expensive per useful station
//
// Classification logic (additive penalty):
//   0 issues   → REALISTIC
//   1 issue    → LOW_REALISM
//   2+ issues  → VERY_LOW_REALISM
//
// If zone has no fetch history and insufficient data, returns REALISTIC
// with "Insufficient data — not yet evaluated" reason.
//
// Returns { level, reasons[] }
function classifyRealism({ zone, fetchPoints, inZoneCount, coveredCount, untestedCount, costPerCovered }) {
  const hasFetchHistory = !!zone.lastFetchedAt;
  const coverageRate = inZoneCount > 0 ? coveredCount / inZoneCount : null;
  const wasteRate = inZoneCount > 0 ? untestedCount / inZoneCount : null;
  const coveredPerPoint = fetchPoints > 0 ? coveredCount / fetchPoints : null;

  // Not enough data to evaluate — zone hasn't run or zone is empty
  if (!hasFetchHistory || inZoneCount === 0) {
    return {
      level: 'REALISTIC',
      reasons: [inZoneCount === 0
        ? 'No stations in zone — cannot evaluate yet.'
        : 'Zone has not been fetched yet — realism will be evaluated after first run.'],
    };
  }

  const issues = [];
  const positives = [];

  // ── Coverage rate ──────────────────────────────────────────────────────────
  if (coverageRate !== null) {
    if (coverageRate < 0.20) {
      issues.push(`Low coverage rate: ${Math.round(coverageRate * 100)}% of in-zone stations are covered.`);
    } else if (coverageRate < 0.40) {
      issues.push(`Moderate coverage rate: ${Math.round(coverageRate * 100)}% covered — less than half of in-zone stations have price data.`);
    } else {
      positives.push(`Coverage rate: ${Math.round(coverageRate * 100)}% of in-zone stations covered.`);
    }
  }

  // ── Untested / waste share ─────────────────────────────────────────────────
  if (wasteRate !== null && inZoneCount >= 3) {
    if (wasteRate > 0.80) {
      issues.push(`High waste rate: ${Math.round(wasteRate * 100)}% of in-zone stations are still untested after fetch run(s).`);
    } else if (wasteRate > 0.60) {
      issues.push(`Elevated untested share: ${Math.round(wasteRate * 100)}% of stations have not been reached.`);
    } else if (wasteRate < 0.30) {
      positives.push(`Low waste rate: only ${Math.round(wasteRate * 100)}% of stations untested.`);
    }
  }

  // ── Covered stations per fetch point ──────────────────────────────────────
  if (coveredPerPoint !== null && inZoneCount >= 3) {
    if (coveredPerPoint < 1.0) {
      issues.push(`Poor fetch yield: ${coveredPerPoint.toFixed(1)} covered stations per fetch point.`);
    } else if (coveredPerPoint >= 3.0) {
      positives.push(`Good fetch yield: ${coveredPerPoint.toFixed(1)} covered stations per fetch point.`);
    }
  }

  // ── Cost per covered station ───────────────────────────────────────────────
  if (costPerCovered != null) {
    if (costPerCovered > 0.5) {
      issues.push(`Expensive per covered station: $${costPerCovered.toFixed(3)}/covered — fetch cost is high relative to useful output.`);
    } else if (costPerCovered < 0.05) {
      positives.push(`Efficient: $${costPerCovered.toFixed(3)} per covered station.`);
    }
  }

  // ── Classify based on issue count ─────────────────────────────────────────
  let level;
  if (issues.length === 0) {
    level = 'REALISTIC';
  } else if (issues.length === 1) {
    level = 'LOW_REALISM';
  } else {
    level = 'VERY_LOW_REALISM';
  }

  // Build reason list: issues first, then positives if realistic
  const reasons = issues.length > 0
    ? issues
    : positives.length > 0
      ? positives
      : [`Coverage rate ${Math.round((coverageRate ?? 0) * 100)}% · waste ${Math.round((wasteRate ?? 0) * 100)}% · ${(coveredPerPoint ?? 0).toFixed(1)} covered/pt — performing well.`];

  return { level, reasons };
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
      const stationsPerPoint = (fetchPoints > 0 && inZone.length > 0) ? inZone.length / fetchPoints : null;
      const coveredPerPoint = (fetchPoints > 0 && covered.length > 0) ? covered.length / fetchPoints : null;

      // Data-outcome realism classification
      const { level: realism, reasons: realismReasons } = classifyRealism({
        zone,
        fetchPoints: fetchPoints || 1,
        inZoneCount: inZone.length,
        coveredCount: covered.length,
        untestedCount: untested.length,
        costPerCovered,
      });

      return {
        zone, zoneType, fetchPoints, requestsPerRun, costPerRun, supported,
        inZone, covered, untested, coverageRate, wasteRate, costPerCovered,
        stationsPerPoint, coveredPerPoint, realism, realismReasons,
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
        <div className="bg-amber-50 border border-amber-300 rounded-lg p-2.5 text-xs text-amber-800 leading-relaxed">
          <div className="font-bold mb-1">⚠ One or more zones show poor data output</div>
          Low cost combined with weak coverage efficiency suggests these zones are not producing useful data per fetch run.
          Review the realism flags per zone for specific reasons.
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
            {sortedBreakdown.map(({ zone, zoneType, fetchPoints, requestsPerRun, costPerRun, supported, inZone, covered, untested, coverageRate, wasteRate, costPerCovered, stationsPerPoint, coveredPerPoint, realism, realismReasons }) => {
              const rs = REALISM_STYLE[realism];
              const isUnrealistic = realism === 'LOW_REALISM' || realism === 'VERY_LOW_REALISM';
              const isVeryLow = realism === 'VERY_LOW_REALISM';
              return (
                <div key={zone.id} className={`rounded border p-2 space-y-1.5 text-xs ${isVeryLow ? 'border-red-200 bg-red-50' : isUnrealistic ? 'border-amber-200 bg-amber-50' : 'border-slate-200 bg-white'}`}>
                  {/* Zone name + type row */}
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1 flex-1 min-w-0">
                      <span className="font-semibold text-slate-800 truncate" title={zone.name}>{zone.name}</span>
                      <span className={`shrink-0 text-xs px-1 rounded ${zoneType === 'corridor' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>{zoneType}</span>
                    </div>
                    <span className={`shrink-0 px-1.5 py-0.5 rounded text-xs font-semibold ${rs.bg} ${rs.text}`}>{rs.label}</span>
                  </div>

                  {/* Realism reason(s) — always shown, styled by level */}
                  <div className={`rounded px-2 py-1 leading-snug space-y-0.5 ${isVeryLow ? 'bg-red-100 text-red-800' : isUnrealistic ? 'bg-amber-100 text-amber-800' : 'bg-green-50 text-green-800'}`}>
                    {realismReasons.map((r, i) => (
                      <div key={i}>{isUnrealistic ? '⚠ ' : '✓ '}{r}</div>
                    ))}
                  </div>

                  {/* Metrics grid: fetch pts / cost / coverage% / untested% */}
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

                  {/* Density row: stations/point, covered/point, cost/covered */}
                  <div className="grid grid-cols-3 gap-1 border-t border-slate-100 pt-1 text-slate-500">
                    <div className="text-center">
                      <div className={`font-semibold ${stationsPerPoint != null && stationsPerPoint > 15 ? 'text-amber-600' : 'text-slate-700'}`}>
                        {stationsPerPoint != null ? stationsPerPoint.toFixed(1) : '—'}
                      </div>
                      <div className="text-slate-400">stn/pt</div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold text-slate-700">{coveredPerPoint != null ? coveredPerPoint.toFixed(1) : '—'}</div>
                      <div className="text-slate-400">cov/pt</div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold text-slate-700">{costPerCovered != null ? fmtUSD(costPerCovered) : '—'}</div>
                      <div className="text-slate-400">$/covered</div>
                    </div>
                  </div>

                  {/* Station count summary */}
                  <div className="text-slate-500 border-t border-slate-100 pt-1">
                    {inZone.length} stations · <span className="text-green-700">{covered.length} covered</span> · <span className="text-amber-600">{untested.length} untested</span>
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
          <div className="font-semibold text-slate-500 uppercase tracking-wide text-xs mb-1">Realism = "Does this zone produce useful data?"</div>
          <div className="flex items-start gap-2"><span className="w-2 h-2 rounded-full bg-green-500 inline-block mt-0.5 shrink-0" /><span className="text-slate-600"><strong>REALISTIC</strong> — good coverage rate, low waste, acceptable cost per covered station</span></div>
          <div className="flex items-start gap-2"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block mt-0.5 shrink-0" /><span className="text-slate-600"><strong>LOW_REALISM</strong> — one data issue: low coverage, high untested share, poor yield, or high cost/covered</span></div>
          <div className="flex items-start gap-2"><span className="w-2 h-2 rounded-full bg-red-500 inline-block mt-0.5 shrink-0" /><span className="text-slate-600"><strong>VERY_LOW_REALISM</strong> — two or more data issues combined</span></div>
          <div className="text-slate-400 italic mt-1">Zone size and geometry are not factors. A large zone that performs well scores as REALISTIC.</div>
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
  // Out of scope — distinct red/violet color
  out_of_scope:       makeIcon('https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png', [14, 23]),
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

  // Zone test state — keyed by zone.id, stores last test result from testZone function
  const [zoneTestMap, setZoneTestMap] = useState({});
  const [testingZoneId, setTestingZoneId] = useState(null);

  // New corridor creation state
  const [corridorDraft, setCorridorDraft] = useState(null); // { points: [{lat,lng},...], name: '', buffer: 2000 }
  // New circle creation state
  const [circleDraft, setCircleDraft] = useState(null); // { center: {lat,lng}, name: '', radiusMeters: 5000 }

  // ─── Load ──────────────────────────────────────────────────────────────────
  // Loads DB state only. Does NOT touch liveTestMap.
  // Strategy: load zones first, then stations visible in viewport, then remaining stations in background.
  const loadAll = useCallback(async () => {
    try {
      // Step 1: Zones + first batch of stations (most recent = most likely relevant)
      const [batch1, allZones] = await Promise.all([
        base44.entities.Station.filter({ status: 'active' }, '-updated_date', 300, 0),
        base44.entities.GPFetchZone.list('-created_date', 200),
      ]);
      const validBatch1 = batch1.filter(s => s.latitude && s.longitude);
      setStations(validBatch1);
      setZones(allZones);
      setLoading(false);

      // Step 2: Load remaining stations in background — do not block UI
      const [batch2, batch3, batch4] = await Promise.all([
        base44.entities.Station.filter({ status: 'active' }, '-updated_date', 300, 300),
        base44.entities.Station.filter({ status: 'active' }, '-updated_date', 300, 600),
        base44.entities.Station.filter({ status: 'active' }, '-updated_date', 300, 900),
      ]);
      const allValid = [
        ...validBatch1,
        ...batch2.filter(s => s.latitude && s.longitude),
        ...batch3.filter(s => s.latitude && s.longitude),
        ...batch4.filter(s => s.latitude && s.longitude),
      ];
      // Deduplicate by id (batch1 overlap possible)
      const seen = new Set();
      const deduped = allValid.filter(s => { if (seen.has(s.id)) return false; seen.add(s.id); return true; });
      setStations(deduped);

      // Step 2: Load GP prices separately — non-blocking, single batch capped at 500
      try {
        const allGpPrices = await base44.entities.FuelPrice.filter(
          { sourceName: 'GooglePlaces' },
          '-fetchedAt',
          500
        );

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
    if (station.fetchScopeStatus === 'out_of_scope') return ICONS.out_of_scope;
    const zone = getZoneMembership(station);
    if (!zone) return ICONS.out_zone;
    const quality = getQuality(station.id);
    // If station is in a zone that has been tested (lastFetchedAt set) but has no DB data → orange (no data after testing)
    if (quality === 'not_tested' && zone.lastFetchedAt) return ICONS.in_zone_no_data;
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

  // ─── Set out of scope ─────────────────────────────────────────────────────
  const setOutOfScope = async (station) => {
    await base44.entities.Station.update(station.id, { fetchScopeStatus: 'out_of_scope' });
    setStations(prev => prev.map(s => s.id === station.id ? { ...s, fetchScopeStatus: 'out_of_scope' } : s));
    if (selectedStation?.id === station.id) setSelectedStation(s => ({ ...s, fetchScopeStatus: 'out_of_scope' }));
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

  // ─── Test zone ────────────────────────────────────────────────────────────
  // Calls testZone backend function. Writes to zoneTestMap (ephemeral UI state).
  // Also refreshes zone record from DB (to pick up lastZoneTestAt / zoneTestCount).
  // Does NOT auto-disable. Operator must confirm.
  const testZone = async (zone) => {
    setTestingZoneId(zone.id);
    try {
      const res = await base44.functions.invoke('testZone', { zoneId: zone.id });
      const result = res?.data;
      if (result?.success) {
        setZoneTestMap(prev => ({ ...prev, [zone.id]: result }));
        // Refresh zone record to get updated zoneTestCount + lastZoneTestAt
        const freshZones = await base44.entities.GPFetchZone.list('-created_date', 200);
        setZones(freshZones);
        const refreshed = freshZones.find(z => z.id === zone.id);
        if (refreshed && selectedZone?.id === zone.id) setSelectedZone(refreshed);
      }
    } catch (err) { alert(`Zone test failed: ${err.message}`); }
    finally { setTestingZoneId(null); }
  };

  // ─── Disable zone ──────────────────────────────────────────────────────────
  const disableZone = async (zone, reason) => {
    setSavingZone(true);
    try {
      await base44.entities.GPFetchZone.update(zone.id, { isActive: false });
      setZones(prev => prev.map(z => z.id === zone.id ? { ...z, isActive: false } : z));
      if (selectedZone?.id === zone.id) setSelectedZone(z => ({ ...z, isActive: false }));
    } catch (err) { alert(`Failed to disable zone: ${err.message}`); }
    finally { setSavingZone(false); }
  };

  // ─── Test single station ──────────────────────────────────────────────────
  // Writes ONLY to liveTestMap. Does NOT modify dbCoverageMap.
  // After test, re-reads DB rows for this station and updates dbCoverageMap for that station only.
  const testSingleStation = async (station) => {
    setTestingStation(true);
    try {
      // Call production-aligned station test (returns 3-part breakdown)
      const res = await base44.functions.invoke('discoverGooglePlacesCoverageAroundStations', {
        latitude: station.latitude,
        longitude: station.longitude,
        radiusKm: 0.5,
        stationId: station.id,
      });

      const { live, stored, persistence } = res?.data || {};

      // Update dbCoverageMap from stored DB state (before this test)
      if (stored?.storedGpPrices) {
        setDbCoverageMap(prev => ({
          ...prev,
          [station.id]: {
            storedFuelTypes: stored.storedFuelTypes || [],
            fetchedAt: stored.lastStoredFetchedAt,
            sourceUpdatedAt: stored.lastStoredSourceUpdatedAt || null,
            rowCount: stored.storedFuelTypes?.length || 0,
          },
        }));
      } else {
        setDbCoverageMap(prev => {
          const next = { ...prev };
          delete next[station.id];
          return next;
        });
      }

      // Store live test result (from this session only)
      setLiveTestMap(prev => ({
        ...prev,
        [station.id]: {
          gpReachableNow: live?.gpReachableNow,
          gpMatchedNow: live?.gpMatchedNow,
          liveFuelDataFoundNow: live?.liveFuelDataFoundNow,
          liveFuelTypes: live?.liveFuelTypes || [],
          liveSourceUpdatedAt: live?.liveSourceUpdatedAt,
          resultsCount: live?.resultsCount || 0,
          storedGpPrices: stored?.storedGpPrices,
          storedFuelTypes: stored?.storedFuelTypes || [],
          lastStoredFetchedAt: stored?.lastStoredFetchedAt,
          lastStoredSourceUpdatedAt: stored?.lastStoredSourceUpdatedAt,
          newFuelPriceRowsCreated: persistence?.newFuelPriceRowsCreated,
          rowsCreatedCount: persistence?.rowsCreatedCount || 0,
          reasonIfNoRowsCreated: persistence?.reasonIfNoRowsCreated,
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
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-orange-400 inline-block" /> No GP data (tested)</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" /> Not yet in tested zone</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-slate-300 inline-block" /> Out of zone</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" /> Out of scope</span>
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

            {/* Station markers — all loaded stations rendered */}
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
                      {station.fetchScopeStatus !== 'out_of_scope' && !db && zone?.lastFetchedAt && (
                        <button
                          className="mt-1 w-full text-xs bg-red-100 hover:bg-red-200 text-red-700 rounded px-2 py-1 font-semibold"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm(`Set "${station.name}" as out of scope?\n\nStation has been in zone but produced no GP data.`)) {
                              setOutOfScope(station);
                            }
                          }}
                        >
                          → Set out of scope
                        </button>
                      )}
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
                      <Row label="fetchScopeStatus" value={selectedStation.fetchScopeStatus || 'keep'} valueClass={selectedStation.fetchScopeStatus === 'out_of_scope' ? 'text-red-600 font-semibold' : selectedStation.fetchScopeStatus === 'monitor' ? 'text-amber-600' : 'text-green-700'} />
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

                    {/* B, C. Live + persistence result — 3-part breakdown */}
                     {!live ? (
                       <div className="rounded-lg border p-2.5 bg-slate-50">
                         <div className="text-xs text-slate-400 italic py-1">Not tested yet — click "Test this station"</div>
                       </div>
                     ) : (
                       <StationTestResultPanel live={live} />
                     )}

                    {/* Actions */}
                    <div className="space-y-1.5 pt-1 border-t">
                       <div className="text-xs text-slate-400 font-semibold uppercase tracking-wide pt-1">Actions</div>

                       <Button size="sm" className="w-full" disabled={testingStation} onClick={() => testSingleStation(selectedStation)}>
                         {testingStation ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
                         {testingStation ? 'Testing Google Places...' : 'Test this station'}
                       </Button>

                       {/* Live test result: decision + reason */}
                       {live && (
                         <div className={`rounded border p-2.5 text-xs space-y-1 ${
                           live.gpReachable && live.gpMatchFound && live.newRowsCreated > 0
                             ? 'bg-green-50 border-green-200'
                             : live.gpReachable && live.gpMatchFound
                             ? 'bg-amber-50 border-amber-200'
                             : 'bg-red-50 border-red-200'
                         }`}>
                           <div className="font-semibold text-slate-600 uppercase tracking-wide text-xs mb-1">Google Places test result</div>
                           <div className={`${
                             live.gpReachable && live.gpMatchFound && live.newRowsCreated > 0
                               ? 'text-green-800'
                               : live.gpReachable && live.gpMatchFound
                               ? 'text-amber-800'
                               : 'text-red-800'
                           } leading-relaxed`}>
                             {live.gpReachable && live.gpMatchFound && live.newRowsCreated > 0
                               ? `✓ Match found with ${live.newRowsCreated} price${live.newRowsCreated !== 1 ? 's' : ''} persisted. SAFE to keep in scope.`
                               : live.gpReachable && live.gpMatchFound
                               ? `◐ Match found but no price data. Monitor or test zone-wide.`
                               : !live.gpReachable
                               ? `⚠ Google Places not reachable. Retry or check connectivity.`
                               : `✗ No match found (${live.resultsCount} results scanned). Consider removing from scope.`
                             }
                           </div>
                         </div>
                       )}

                      {selectedStation.fetchScopeStatus !== 'out_of_scope' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full border-red-300 text-red-700 hover:bg-red-50"
                          onClick={() => {
                            if (window.confirm(`Set "${selectedStation.name}" as out of scope?\n\nThis sets fetchScopeStatus → out_of_scope. Station stays active but excluded from GP fetch runs.`)) {
                              setOutOfScope(selectedStation);
                            }
                          }}
                        >
                          <XCircle className="w-4 h-4 mr-2" /> Set out of scope
                        </Button>
                      )}
                      {selectedStation.fetchScopeStatus === 'out_of_scope' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full border-green-300 text-green-700 hover:bg-green-50"
                          onClick={async () => {
                            await base44.entities.Station.update(selectedStation.id, { fetchScopeStatus: 'keep' });
                            setStations(prev => prev.map(s => s.id === selectedStation.id ? { ...s, fetchScopeStatus: 'keep' } : s));
                            setSelectedStation(s => ({ ...s, fetchScopeStatus: 'keep' }));
                          }}
                        >
                          ↩ Restore to scope (set keep)
                        </Button>
                      )}
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
                const isTestingThis = testingZoneId === selectedZone.id;

                // Parse stored test stats from DB (persisted across sessions)
                const storedTestStats = (() => {
                  if (!selectedZone.lastZoneTestStats) return null;
                  try { return JSON.parse(selectedZone.lastZoneTestStats); } catch { return null; }
                })();

                // Live test result from this session (takes priority over stored)
                const liveTestResult = zoneTestMap[selectedZone.id];
                // Use live result if available, else fall back to stored stats for decision display
                const testResult = liveTestResult || null;
                const displayStats = testResult
                  ? testResult.decision
                  : storedTestStats
                    ? { decision: storedTestStats.decision, reasons: storedTestStats.decisionReasons }
                    : null;

                const DECISION_STYLE = {
                  keep:              { bg: 'bg-green-50',  border: 'border-green-200',  text: 'text-green-800',  label: 'KEEP',              dot: 'bg-green-500'  },
                  monitor:           { bg: 'bg-amber-50',  border: 'border-amber-200',  text: 'text-amber-800',  label: 'MONITOR',           dot: 'bg-amber-500'  },
                  disable_candidate: { bg: 'bg-red-50',    border: 'border-red-200',    text: 'text-red-800',    label: 'DISABLE CANDIDATE', dot: 'bg-red-500'    },
                };

                const fmtPct = v => v != null ? `${Math.round(v * 100)}%` : '—';
                const fmtN = (v, d = 2) => v != null ? v.toFixed(d) : '—';

                return (
                  <div className="space-y-3">
                    {/* Header row */}
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-bold text-sm">{selectedZone.name}</h3>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {zoneType === 'corridor' && <Route className="w-3 h-3 text-blue-500" />}
                          <span className="text-xs text-slate-400 capitalize">{zoneType}</span>
                          {selectedZone.zoneTestCount > 0 && (
                            <span className="text-xs text-slate-400">· {selectedZone.zoneTestCount} test{selectedZone.zoneTestCount !== 1 ? 's' : ''}</span>
                          )}
                        </div>
                      </div>
                      <button disabled={savingZone} onClick={() => toggleZoneActive(selectedZone)}
                        className={`text-xs px-3 py-1 rounded font-semibold ${selectedZone.isActive ? 'bg-emerald-500 text-white hover:bg-emerald-600' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`}>
                        {selectedZone.isActive ? 'ON' : 'OFF'}
                      </button>
                    </div>

                    {/* DB coverage snapshot (from loaded FuelPrice rows) */}
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
                        <div className="text-slate-600">Buffer: {(selectedZone.bufferMeters || 2000) / 1000} km · Fetch R: {(selectedZone.radiusMeters || 3000) / 1000} km/pt</div>
                      </div>
                    )}

                    {/* ── Bulk out-of-scope (no-data stations in tested zone) ── */}
                    {selectedZone.lastFetchedAt && (() => {
                      const noDataInZone = inZone.filter(s =>
                        !dbCoverageMap[s.id] &&
                        s.fetchScopeStatus !== 'out_of_scope'
                      );
                      if (noDataInZone.length === 0) return null;
                      return (
                        <div className="border-t pt-2 space-y-2">
                          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Bulk scope cleanup</div>
                          <div className="bg-orange-50 border border-orange-200 rounded p-2 text-xs text-orange-800 space-y-1.5">
                            <div className="font-semibold">⚠ {noDataInZone.length} station{noDataInZone.length !== 1 ? 's' : ''} in zone with no GP data</div>
                            <div className="text-orange-700 leading-relaxed">
                              Zone has been fetched but these stations have no DB price rows.
                              Set all as <code>out_of_scope</code> to exclude from future runs.
                            </div>
                            <Button
                              size="sm"
                              className="w-full bg-orange-600 hover:bg-orange-700 text-white"
                              onClick={async () => {
                                const names = noDataInZone.slice(0, 10).map(s => `• ${s.name}`).join('\n');
                                const more = noDataInZone.length > 10 ? `\n… and ${noDataInZone.length - 10} more` : '';
                                if (!window.confirm(`Set ${noDataInZone.length} station${noDataInZone.length !== 1 ? 's' : ''} as out_of_scope?\n\n${names}${more}\n\nThese are in the zone but have produced no GP price data. Reversible from Station editor.`)) return;
                                const stationIds = noDataInZone.map(s => s.id);
                                await base44.functions.invoke('applyFetchScopeDecision', {
                                  mode: 'bulk_remove_candidates',
                                  stationIds,
                                });
                                setStations(prev => prev.map(st => stationIds.includes(st.id) ? { ...st, fetchScopeStatus: 'out_of_scope' } : st));
                              }}
                            >
                              <XCircle className="w-3.5 h-3.5 mr-1.5" /> Set all {noDataInZone.length} as out of scope
                            </Button>
                          </div>
                        </div>
                      );
                    })()}

                    {/* ── Zone Test Section ── */}
                    <div className="border-t pt-2 space-y-2">
                      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Zone test</div>

                      <Button size="sm" className="w-full" disabled={isTestingThis} onClick={() => testZone(selectedZone)}>
                        {isTestingThis
                          ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Testing zone…</>
                          : <><FlaskConical className="w-4 h-4 mr-2" /> Test this zone</>}
                      </Button>

                      {/* Last test timestamp */}
                      {selectedZone.lastZoneTestAt && (
                        <div className="text-xs text-slate-400">
                          Last tested: {new Date(selectedZone.lastZoneTestAt).toLocaleString('nb-NO')}
                          {selectedZone.zoneTestCount > 1 && ` (${selectedZone.zoneTestCount} tests total)`}
                        </div>
                      )}

                      {/* ── 3-PART ZONE TEST RESULT ── */}
                      <ZoneTestResultPanel testResult={testResult} />

                      {/* Zone decision (from live test result this session, or stored) */}
                      {displayStats && (() => {
                        const ds = DECISION_STYLE[displayStats.decision] || DECISION_STYLE.monitor;
                        const isDisableCandidate = displayStats.decision === 'disable_candidate';
                        return (
                          <div className={`rounded border p-2.5 space-y-1.5 ${ds.bg} ${ds.border}`}>
                            <div className="flex items-center gap-1.5">
                              <span className={`w-2 h-2 rounded-full shrink-0 ${ds.dot}`} />
                              <span className={`text-xs font-bold uppercase tracking-wide ${ds.text}`}>{ds.label}</span>
                              {liveTestResult && <span className="text-xs text-slate-400 ml-auto">live</span>}
                              {!liveTestResult && storedTestStats && <span className="text-xs text-slate-400 ml-auto">stored</span>}
                            </div>
                            <div className="space-y-0.5">
                              {displayStats.reasons.map((r, i) => (
                                <div key={i} className={`text-xs leading-snug ${isDisableCandidate ? 'text-red-700' : ds.text}`}>
                                  {isDisableCandidate ? '⚠ ' : displayStats.decision === 'keep' ? '✓ ' : '→ '}{r}
                                </div>
                              ))}
                            </div>
                            {displayStats.requiresMultipleTests && (
                              <div className="text-xs text-slate-500 italic">Run at least 2 tests before disabling.</div>
                            )}
                          </div>
                        );
                      })()}

                      {/* Live test metrics */}
                      {testResult && (
                        <div className="space-y-2">
                          {/* Coverage metrics */}
                          <div className="grid grid-cols-2 gap-1 text-xs">
                            <div className="border rounded p-1.5 text-center bg-white">
                              <div className={`font-bold ${testResult.coverage.coverageRate != null && testResult.coverage.coverageRate < 0.35 ? 'text-amber-600' : 'text-green-700'}`}>
                                {fmtPct(testResult.coverage.coverageRate)}
                              </div>
                              <div className="text-slate-400">coverage</div>
                            </div>
                            <div className="border rounded p-1.5 text-center bg-white">
                              <div className={`font-bold ${testResult.coverage.wasteRate != null && testResult.coverage.wasteRate > 0.6 ? 'text-red-600' : 'text-slate-700'}`}>
                                {fmtPct(testResult.coverage.wasteRate)}
                              </div>
                              <div className="text-slate-400">waste</div>
                            </div>
                            <div className="border rounded p-1.5 text-center bg-white">
                              <div className="font-bold text-slate-700">{fmtN(testResult.coverage.coveredPerPoint, 1)}</div>
                              <div className="text-slate-400">cov/pt</div>
                            </div>
                            <div className="border rounded p-1.5 text-center bg-white">
                              <div className="font-bold text-slate-700">
                                {testResult.coverage.costPerCovered != null ? `$${testResult.coverage.costPerCovered.toFixed(3)}` : '—'}
                              </div>
                              <div className="text-slate-400">$/covered</div>
                            </div>
                          </div>

                          {/* Saturation */}
                          <div className={`rounded border p-2 text-xs space-y-1 ${testResult.saturation.saturationRate > 0.4 ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200'}`}>
                            <div className="font-semibold text-slate-600">Result saturation</div>
                            <div className="flex justify-between">
                              <span className="text-slate-500">Saturated fetch points</span>
                              <span className={`font-semibold ${testResult.saturation.saturationRate > 0.4 ? 'text-amber-700' : 'text-slate-700'}`}>
                                {testResult.saturation.saturatedFetchPoints} / {testResult.saturation.totalFetchPoints}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500">Saturation rate</span>
                              <span className={`font-semibold ${testResult.saturation.saturationRate > 0.4 ? 'text-amber-700' : 'text-slate-700'}`}>
                                {fmtPct(testResult.saturation.saturationRate)}
                              </span>
                            </div>
                            <div className="text-slate-400 italic">
                              Saturated = ≥{testResult.saturation.threshold} results returned (Nearby Search cap ~20)
                            </div>
                          </div>

                          {/* Station counts */}
                          <div className="text-xs text-slate-500 border rounded p-2 bg-white space-y-0.5">
                            <div className="font-semibold text-slate-600 mb-1">Station breakdown (DB state)</div>
                            <div className="flex justify-between"><span>Total in zone</span><span className="font-semibold">{testResult.coverage.totalStations}</span></div>
                            <div className="flex justify-between"><span className="text-green-700">Covered (GP prices)</span><span className="font-semibold text-green-700">{testResult.coverage.coveredCount}</span></div>
                            <div className="flex justify-between"><span className="text-yellow-600">Weak (no fuel types)</span><span className="font-semibold text-yellow-600">{testResult.coverage.weakCount}</span></div>
                            <div className="flex justify-between"><span className="text-slate-500">Untested</span><span className="font-semibold">{testResult.coverage.untestedCount}</span></div>
                            <div className="flex justify-between border-t pt-1 mt-1"><span>GP API places found</span><span className="font-semibold">{testResult.apiResults.totalPlaces}</span></div>
                            {testResult.apiResults.apiErrors > 0 && (
                              <div className="flex justify-between text-red-600"><span>API errors</span><span className="font-semibold">{testResult.apiResults.apiErrors}</span></div>
                            )}
                          </div>
                        </div>
                      )}



                      {/* Disable zone action */}
                      {displayStats?.decision === 'disable_candidate' && selectedZone.isActive && (
                        <div className="bg-red-50 border border-red-200 rounded p-2 space-y-1.5 text-xs">
                          <div className="font-semibold text-red-800">Disable candidate</div>
                          <div className="text-red-700 italic">
                            Based on {selectedZone.zoneTestCount || 1} test run{(selectedZone.zoneTestCount || 1) !== 1 ? 's' : ''}.
                            This zone has shown consistently poor data output. Disabling sets isActive = false.
                          </div>
                          <Button
                            size="sm"
                            className="w-full bg-red-600 hover:bg-red-700 text-white"
                            disabled={savingZone}
                            onClick={() => {
                              if (window.confirm(`Disable zone "${selectedZone.name}"?\n\nThis sets isActive = false.\nThe zone will not be fetched in future runs.\nYou can re-enable it at any time.`)) {
                                disableZone(selectedZone);
                              }
                            }}
                          >
                            <XCircle className="w-3.5 h-3.5 mr-1.5" /> Disable this zone
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* ── Configuration ── */}
                    <div className="border-t pt-2 space-y-2">
                      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Configuration</div>

                      <div className="space-y-1.5">
                        <div className="text-xs text-slate-500">Priority</div>
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
                        <div className="space-y-1">
                          <div className="text-xs text-slate-500">Radius (m)</div>
                          <input type="number" defaultValue={selectedZone.radiusMeters || 5000} className="w-full px-2 py-1 border rounded text-xs"
                            onBlur={e => updateZoneField(selectedZone, 'radiusMeters', parseInt(e.target.value))} />
                        </div>
                      )}

                      {zoneType === 'corridor' && (
                        <div className="grid grid-cols-2 gap-1.5">
                          <div className="space-y-1">
                            <div className="text-xs text-slate-500">Buffer (m)</div>
                            <input type="number" defaultValue={selectedZone.bufferMeters || 2000} className="w-full px-2 py-1 border rounded text-xs"
                              onBlur={e => updateZoneField(selectedZone, 'bufferMeters', parseInt(e.target.value))} />
                          </div>
                          <div className="space-y-1">
                            <div className="text-xs text-slate-500">Fetch R (m)</div>
                            <input type="number" defaultValue={selectedZone.radiusMeters || 3000} className="w-full px-2 py-1 border rounded text-xs"
                              onBlur={e => updateZoneField(selectedZone, 'radiusMeters', parseInt(e.target.value))} />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* ── Metadata ── */}
                    {(selectedZone.notes || selectedZone.lastFetchedAt) && (
                      <div className="border-t pt-2 space-y-1 text-xs text-slate-400">
                        {selectedZone.notes && <div className="bg-slate-50 rounded p-1.5 text-slate-500">{selectedZone.notes}</div>}
                        {selectedZone.lastFetchedAt && (
                          <div>Last production fetch: {new Date(selectedZone.lastFetchedAt).toLocaleString('nb-NO')}</div>
                        )}
                      </div>
                    )}

                    <Button size="sm" variant="outline" className="w-full" onClick={() => { if (!mapRef.current) return; mapRef.current.setView([selectedZone.latitude, selectedZone.longitude], 11); }}>
                      <MapPin className="w-4 h-4 mr-2" /> Go to zone
                    </Button>

                    {/* Station list — enriched with per-station GP test results if available */}
                    {(() => {
                      // Build per-station lookup from live test result
                      const stationResultMap = {};
                      if (testResult?.stationResults) {
                        for (const r of testResult.stationResults) stationResultMap[r.stationId] = r;
                      }
                      const hasStationResults = Object.keys(stationResultMap).length > 0;

                      const SCOPE_ROW_STYLE = {
                        keep:             { bg: 'bg-green-50',  text: 'text-green-700',  label: 'GP OK' },
                        monitor:          { bg: 'bg-amber-50',  text: 'text-amber-700',  label: 'Monitor' },
                        remove_candidate: { bg: 'bg-red-50',    text: 'text-red-700',    label: 'No data' },
                      };

                      const removeCandidates = hasStationResults
                        ? inZone.filter(s => stationResultMap[s.id]?.scopeRecommendation === 'remove_candidate')
                        : [];

                      return (
                        <div className="border-t pt-2 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                              Stations in zone ({inZone.length})
                            </div>
                            {hasStationResults && removeCandidates.length > 0 && (
                              <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded font-semibold">
                                {removeCandidates.length} no-data
                              </span>
                            )}
                          </div>

                          {hasStationResults && removeCandidates.length > 0 && (
                            <div className="bg-red-50 border border-red-200 rounded p-2 text-xs text-red-700 space-y-1.5">
                              <div className="font-semibold">⚠ {removeCandidates.length} station{removeCandidates.length !== 1 ? 's' : ''} not reached by GP</div>
                              <div className="text-red-600 leading-relaxed">
                                No GP match within 500 m and no DB prices. Sets <code>fetchScopeStatus → out_of_scope</code> — station stays active but excluded from future GP fetch runs.
                              </div>
                              <Button
                                size="sm"
                                className="w-full bg-red-600 hover:bg-red-700 text-white"
                                onClick={async () => {
                                  const names = removeCandidates.map(s => `• ${s.name}`).join('\n');
                                  if (!window.confirm(`Remove ${removeCandidates.length} station${removeCandidates.length !== 1 ? 's' : ''} from GP fetch scope?\n\n${names}\n\nThis sets fetchScopeStatus → out_of_scope. Reversible from Station editor.`)) return;
                                  const stationIds = removeCandidates.map(s => s.id);
                                  await base44.functions.invoke('applyFetchScopeDecision', {
                                    mode: 'bulk_remove_candidates',
                                    stationIds,
                                  });
                                  setStations(prev => prev.map(st => stationIds.includes(st.id) ? { ...st, fetchScopeStatus: 'out_of_scope' } : st));
                                }}
                              >
                                <XCircle className="w-3.5 h-3.5 mr-1.5" /> Remove all {removeCandidates.length} from fetch scope
                              </Button>
                            </div>
                          )}

                          <div className="space-y-0.5 max-h-56 overflow-y-auto">
                            {inZone.map(s => {
                              const q = getQuality(s.id);
                              const qs = QUALITY_STYLE[q] || QUALITY_STYLE.not_tested;
                              const sr = stationResultMap[s.id];
                              const scopeStyle = sr ? (SCOPE_ROW_STYLE[sr.scopeRecommendation] || SCOPE_ROW_STYLE.monitor) : null;

                              return (
                                <div key={s.id}
                                  className={`rounded p-1.5 cursor-pointer transition-colors border text-xs ${sr?.scopeRecommendation === 'remove_candidate' ? 'border-red-200 bg-red-50 hover:bg-red-100' : 'border-transparent hover:bg-slate-50'}`}
                                  onClick={() => { setSelectedStation(s); setSidebarMode('station'); }}>
                                  <div className="flex items-center justify-between gap-1">
                                    <span className="truncate flex-1 font-medium">{s.name}</span>
                                    <div className="flex gap-1 shrink-0">
                                      {/* DB quality badge (always shown) */}
                                      <span className={`px-1.5 py-0.5 rounded font-medium ${qs.bg} ${qs.text}`}>{qs.label}</span>
                                      {/* Live scope badge (only if test ran) */}
                                      {scopeStyle && (
                                        <span className={`px-1.5 py-0.5 rounded font-medium ${scopeStyle.bg} ${scopeStyle.text}`}>{scopeStyle.label}</span>
                                      )}
                                    </div>
                                  </div>
                                  {/* GP match detail — shown only for remove candidates or partial matches */}
                                  {sr && sr.scopeRecommendation !== 'keep' && (
                                    <div className={`mt-0.5 leading-snug ${sr.scopeRecommendation === 'remove_candidate' ? 'text-red-600' : 'text-amber-600'}`}>
                                      {sr.gpReached
                                        ? `GP reached (${sr.closestGpDistanceMeters} m) — no prices`
                                        : sr.closestGpDistanceMeters != null
                                          ? `Closest GP: ${sr.closestGpDistanceMeters} m — out of range`
                                          : 'Not found in GP results'}
                                    </div>
                                  )}
                                  {sr && sr.scopeRecommendation === 'keep' && sr.hasPrices && !sr.inDbCovered && (
                                    <div className="mt-0.5 text-green-600">Live GP: {sr.fuelPriceCount} fuel price{sr.fuelPriceCount !== 1 ? 's' : ''}</div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}
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