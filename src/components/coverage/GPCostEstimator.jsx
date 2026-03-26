import React, { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { corridorFetchPoints } from '@/utils/zoneGeometry';

/**
 * GPCostEstimator
 *
 * PRODUCTION MODEL:
 *   runGooglePlacesFetchAutomation is the sole production fetch motor.
 *   Cost is zone/fetch-point based — NOT per station.
 *
 * FETCH POINT RULES (mirrors runGooglePlacesFetchAutomation exactly):
 *   circle zone   = 1 fetch point (zone center)
 *   corridor zone = corridorFetchPoints(zone) — ceil(length_m / 4000) + 1 points
 *     (stepMeters=4000 is the hardcoded default in production)
 *
 * PRICING DEFAULTS:
 *   Google Places API New – searchNearby with fuelOptions (Advanced Data field)
 *   = $0.032 (Nearby Search Basic) + $0.017 (fuelOptions Advanced) = $0.049 per request
 *
 * LEGACY / MANUAL FUNCTIONS — NOT production cost drivers:
 *   - fetchLiveGPPricesForArea:    UNSAFE — writes FuelPrice with priceNok=null. Incomplete parser.
 *   - batchTestGooglePlacesCoverage: MANUAL ANALYSIS ONLY — 1 call/station, uses Legacy API v1.
 *   - fetchGooglePlacesPrices:     LEGACY — hardcoded 4 cities. Not zone-driven. Not production.
 *   - discoverGooglePlacesCoverageAroundStations: MANUAL ANALYSIS — no price writes, Legacy API.
 *   - testGooglePlacesApi / captureRawGooglePlacesResponse: DEBUG only.
 */

const COST_PER_REQUEST_USD = 0.049;
const DEFAULT_NOK_RATE = 10.8;

function getFetchPointCount(zone) {
  const zoneType = zone.zoneType || 'circle';
  if (zoneType === 'circle') return 1;
  if (zoneType === 'corridor') {
    try {
      const pts = corridorFetchPoints(zone);
      return pts.length;
    } catch {
      return null; // parse error
    }
  }
  return null; // unknown/unsupported zone type
}

export default function GPCostEstimator({ zones, stations, dbCoverageMap, liveTestMap, getZoneMembership }) {
  const [costPerRequest, setCostPerRequest] = useState(COST_PER_REQUEST_USD);
  const [runsPerDay, setRunsPerDay] = useState(1);
  const [nokRate, setNokRate] = useState(DEFAULT_NOK_RATE);

  const activeZones = zones.filter(z => z.isActive);

  const zoneBreakdown = useMemo(() => {
    return activeZones.map(zone => {
      const zoneType = zone.zoneType || 'circle';
      const fetchPoints = getFetchPointCount(zone);
      const supported = fetchPoints !== null;
      const requestsPerRun = supported ? fetchPoints : null;
      const costPerRun = supported ? requestsPerRun * costPerRequest : null;
      return { zone, zoneType, fetchPoints, requestsPerRun, costPerRun, supported };
    });
  }, [activeZones, costPerRequest]);

  const totals = useMemo(() => {
    const supportedRows = zoneBreakdown.filter(r => r.supported);
    const totalRequests = supportedRows.reduce((s, r) => s + r.requestsPerRun, 0);
    const costPerRun = totalRequests * costPerRequest;
    return {
      totalRequests,
      costPerRun,
      costPerDay: costPerRun * runsPerDay,
      costPerWeek: costPerRun * runsPerDay * 7,
      costPerMonth: costPerRun * runsPerDay * 30,
    };
  }, [zoneBreakdown, costPerRequest, runsPerDay]);

  // Station coverage metrics relative to active zones
  const inActiveZoneStations = stations.filter(s => getZoneMembership(s) != null);
  const coveredInZone = inActiveZoneStations.filter(s => dbCoverageMap[s.id] != null);
  const untestedInZone = inActiveZoneStations.filter(s => !dbCoverageMap[s.id] && !liveTestMap[s.id]);

  const fmtUSD = (v) => v != null ? `$${v.toFixed(3)}` : '—';
  const fmtNOK = (v) => v != null ? `${(v * nokRate).toFixed(2)} kr` : '—';

  return (
    <div className="space-y-4">

      {/* NOTE: cost model explanation */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-2.5 text-xs text-blue-800 leading-relaxed">
        <div className="font-semibold mb-1">Production fetch model</div>
        Cost is based on <strong>active GPFetchZone records</strong> and the fetch-point logic in{' '}
        <code className="bg-blue-100 px-1 rounded">runGooglePlacesFetchAutomation</code>.
        It is <strong>not per-station</strong>.
        <div className="mt-1 text-blue-600">No scheduled automation is currently active — this is estimation only.</div>
      </div>

      {/* Config inputs */}
      <div className="space-y-2">
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Configuration</div>
        <div className="grid grid-cols-3 gap-1.5">
          <div>
            <label className="text-xs text-slate-500 block mb-0.5">$/request</label>
            <input
              type="number"
              step="0.001"
              value={costPerRequest}
              onChange={e => setCostPerRequest(parseFloat(e.target.value) || COST_PER_REQUEST_USD)}
              className="w-full px-2 py-1 border rounded text-xs"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-0.5">Runs/day</label>
            <input
              type="number"
              min="1"
              value={runsPerDay}
              onChange={e => setRunsPerDay(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full px-2 py-1 border rounded text-xs"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-0.5">NOK/USD</label>
            <input
              type="number"
              step="0.1"
              value={nokRate}
              onChange={e => setNokRate(parseFloat(e.target.value) || DEFAULT_NOK_RATE)}
              className="w-full px-2 py-1 border rounded text-xs"
            />
          </div>
        </div>
        <div className="text-xs text-slate-400 leading-tight">
          Default: <code>$0.049</code> = Nearby Search ($0.032) + fuelOptions Advanced Data ($0.017).
          Only applies to <code>runGooglePlacesFetchAutomation</code> (Places API New).
        </div>
      </div>

      {/* Zone breakdown */}
      <div>
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
          Active zones ({activeZones.length})
        </div>
        {activeZones.length === 0 ? (
          <div className="text-xs text-slate-400 italic py-2">No active zones. Activate a zone to see cost estimate.</div>
        ) : (
          <div className="space-y-1">
            <div className="grid grid-cols-12 gap-1 text-xs text-slate-400 font-semibold pb-1 border-b">
              <div className="col-span-4">Zone</div>
              <div className="col-span-2 text-center">Type</div>
              <div className="col-span-2 text-center">Pts</div>
              <div className="col-span-2 text-right">Req/run</div>
              <div className="col-span-2 text-right">Cost/run</div>
            </div>
            {zoneBreakdown.map(({ zone, zoneType, fetchPoints, requestsPerRun, costPerRun, supported }) => (
              <div key={zone.id} className="grid grid-cols-12 gap-1 text-xs py-1 border-b border-slate-100">
                <div className="col-span-4 truncate font-medium text-slate-700" title={zone.name}>{zone.name}</div>
                <div className="col-span-2 text-center">
                  <span className={`px-1 rounded text-xs ${zoneType === 'corridor' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
                    {zoneType}
                  </span>
                </div>
                <div className="col-span-2 text-center text-slate-600">
                  {supported ? fetchPoints : <span className="text-amber-600">?</span>}
                </div>
                <div className="col-span-2 text-right text-slate-600">
                  {supported ? requestsPerRun : <span className="text-amber-600 text-xs">unsupported</span>}
                </div>
                <div className="col-span-2 text-right font-medium text-slate-700">
                  {supported ? fmtUSD(costPerRun) : '—'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Formula reference */}
      <div className="bg-slate-50 border rounded p-2 text-xs text-slate-500 space-y-0.5">
        <div className="font-semibold text-slate-600 mb-1">Fetch point formula (production)</div>
        <div><span className="font-mono bg-white border rounded px-1">circle</span> → 1 fetch point</div>
        <div><span className="font-mono bg-white border rounded px-1">corridor</span> → <code>ceil(length_m / 4000) + 1</code> fetch points</div>
        <div className="text-slate-400 mt-1">stepMeters=4000 is hardcoded in runGooglePlacesFetchAutomation</div>
      </div>

      {/* Totals */}
      <div className="space-y-2">
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Estimated totals</div>
        <Card className="p-3 space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-slate-500">Total requests / run</span>
            <span className="font-bold text-slate-800">{totals.totalRequests}</span>
          </div>
          <div className="flex justify-between text-xs border-t pt-2">
            <span className="text-slate-500">Cost / run</span>
            <span className="font-semibold">{fmtUSD(totals.costPerRun)} <span className="text-slate-400 font-normal">({fmtNOK(totals.costPerRun)})</span></span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-slate-500">Cost / day ({runsPerDay}× run)</span>
            <span className="font-semibold">{fmtUSD(totals.costPerDay)} <span className="text-slate-400 font-normal">({fmtNOK(totals.costPerDay)})</span></span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-slate-500">Cost / week</span>
            <span className="font-semibold">{fmtUSD(totals.costPerWeek)} <span className="text-slate-400 font-normal">({fmtNOK(totals.costPerWeek)})</span></span>
          </div>
          <div className="flex justify-between text-xs border-t pt-2">
            <span className="text-slate-500 font-semibold">Cost / month (30 days)</span>
            <span className="font-bold text-blue-700">{fmtUSD(totals.costPerMonth)} <span className="text-blue-400 font-normal">({fmtNOK(totals.costPerMonth)})</span></span>
          </div>
        </Card>
        <div className="text-xs text-slate-400 italic">All figures are estimates. Actual cost depends on Google billing and request deduplication.</div>
      </div>

      {/* Station coverage in active zones */}
      <div className="space-y-1.5">
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
          Station coverage (active zones)
        </div>
        <div className="text-xs text-slate-400 leading-tight mb-1.5">
          These counts show station overlap with active zones. They do <strong>not</strong> drive cost — cost is zone/fetch-point based.
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          <Card className="p-2 text-center">
            <div className="text-base font-bold text-slate-800">{inActiveZoneStations.length}</div>
            <div className="text-xs text-slate-500">In-zone stations</div>
          </Card>
          <Card className="p-2 text-center bg-green-50">
            <div className="text-base font-bold text-green-700">{coveredInZone.length}</div>
            <div className="text-xs text-slate-500">DB covered</div>
          </Card>
          <Card className="p-2 text-center bg-amber-50">
            <div className="text-base font-bold text-amber-600">{untestedInZone.length}</div>
            <div className="text-xs text-slate-500">Untested</div>
          </Card>
        </div>
      </div>

      {/* Legacy function warnings */}
      <div className="space-y-1.5">
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Legacy / manual GP functions</div>
        <div className="space-y-1 text-xs">
          <div className="bg-red-50 border border-red-200 rounded p-2 text-red-700">
            <div className="font-semibold">⚠ fetchLiveGPPricesForArea — UNSAFE / INCOMPLETE</div>
            <div className="text-red-600 mt-0.5">Writes FuelPrice records with <code>priceNok=null</code>. Prisparser er ikke implementert. Skal ikke brukes i produksjon.</div>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded p-2 text-amber-700">
            <div className="font-semibold">⚑ batchTestGooglePlacesCoverage — MANUAL ANALYSIS ONLY</div>
            <div className="text-amber-600 mt-0.5">1 API call per station (Legacy Nearby Search). Writes StationCandidate, not FuelPrice. Not a production cost driver, but expensive at scale (50 stations = 50 calls = ~$1.60).</div>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded p-2 text-slate-600">
            <div className="font-semibold">ℹ fetchGooglePlacesPrices — LEGACY</div>
            <div className="text-slate-500 mt-0.5">Hardcoded 4 cities. Not zone-driven. Superseded by runGooglePlacesFetchAutomation.</div>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded p-2 text-slate-600">
            <div className="font-semibold">ℹ discoverGooglePlacesCoverageAroundStations — MANUAL ANALYSIS</div>
            <div className="text-slate-500 mt-0.5">Used by "Test this station" in this UI. Legacy API (nearbysearch v1). No FuelPrice writes.</div>
          </div>
        </div>
      </div>

    </div>
  );
}