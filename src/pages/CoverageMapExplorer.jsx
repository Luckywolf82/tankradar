import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, MapPin, Search, RefreshCw, Route } from 'lucide-react';
import { isStationInZone, distanceMeters, parseCorridorPoints, corridorFetchPoints } from '@/utils/zoneGeometry';

// ─── Marker icons ─────────────────────────────────────────────────────────────
const makeIcon = (url, size = [20, 33]) => new L.Icon({
  iconUrl: url, iconSize: size,
  iconAnchor: [size[0] / 2, size[1]], popupAnchor: [0, -size[1]],
});
const ICONS = {
  in_zone_covered:    makeIcon('https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png'),
  in_zone_partial:    makeIcon('https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-yellow.png'),
  in_zone_uncovered:  makeIcon('https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png'),
  in_zone_not_tested: makeIcon('https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png'),
  out_zone:           makeIcon('https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-grey.png', [14, 23]),
};

// ─── Map controller (stable initial view) ────────────────────────────────────
function MapController({ mapRef }) {
  const map = useMap();
  const initialized = useRef(false);
  useEffect(() => {
    if (map && !initialized.current) { mapRef.current = map; map.setView([63.43, 10.39], 11); initialized.current = true; }
  }, [map, mapRef]);
  return null;
}

// ─── Corridor zone map layer ──────────────────────────────────────────────────
function CorridorZoneLayer({ zone, onZoneClick }) {
  const points = parseCorridorPoints(zone);
  if (points.length < 2) return null;

  const positions = points.map(p => [p.lat, p.lng]);
  const activeColor = zone.isActive ? '#10b981' : '#94a3b8';

  return (
    <>
      {/* Buffer width visual — thick semi-transparent stroke */}
      <Polyline
        positions={positions}
        pathOptions={{
          color: activeColor,
          weight: Math.max(4, Math.min(30, (zone.bufferMeters || 2000) / 200)),
          opacity: zone.isActive ? 0.18 : 0.08,
        }}
        eventHandlers={{ click: () => onZoneClick(zone) }}
      />
      {/* Route centerline */}
      <Polyline
        positions={positions}
        pathOptions={{
          color: activeColor,
          weight: zone.isActive ? 2.5 : 1.5,
          opacity: zone.isActive ? 0.85 : 0.35,
          dashArray: zone.isActive ? null : '7,5',
        }}
        eventHandlers={{ click: () => onZoneClick(zone) }}
      >
        <Popup>
          <div className="text-xs min-w-[140px] space-y-1">
            <div className="font-bold">{zone.name}</div>
            <div className={zone.isActive ? 'text-green-700' : 'text-slate-400'}>
              {zone.isActive ? '✓ Active' : '✗ Inactive'} · corridor
            </div>
            <div className="text-slate-500">Buffer: {(zone.bufferMeters || 2000) / 1000} km · Priority: {zone.priority || 'normal'}</div>
            <div className="text-slate-400">{points.length} waypoints</div>
          </div>
        </Popup>
      </Polyline>
    </>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function CoverageMapExplorer() {
  const mapRef = useRef(null);
  const [stations, setStations] = useState([]);
  const [zones, setZones] = useState([]);
  const [gpCoverageMap, setGpCoverageMap] = useState({});
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

  // ─── Load ──────────────────────────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    try {
      const [allStations, allZones, gpPrices] = await Promise.all([
        base44.entities.Station.list(),
        base44.entities.GPFetchZone.list(),
        base44.entities.FuelPrice.filter({ sourceName: 'GooglePlaces' }),
      ]);
      setStations(allStations.filter(s => s.latitude && s.longitude));
      setZones(allZones);
      const coverageMap = {};
      for (const price of gpPrices) {
        if (!price.stationId) continue;
        if (!coverageMap[price.stationId]) coverageMap[price.stationId] = { hasFuelOptions: true, fuelTypes: [], fetchedAt: price.fetchedAt };
        if (price.fuelType && !coverageMap[price.stationId].fuelTypes.includes(price.fuelType))
          coverageMap[price.stationId].fuelTypes.push(price.fuelType);
      }
      setGpCoverageMap(coverageMap);
      setLoading(false);
    } catch (err) { console.error('Load failed:', err); setLoading(false); }
  }, []);
  useEffect(() => { loadAll(); }, [loadAll]);

  // ─── Helpers ──────────────────────────────────────────────────────────────
  const getZoneMembership = useCallback((station) => {
    for (const zone of zones) {
      if (!zone.isActive) continue;
      if (isStationInZone(station, zone)) return zone;
    }
    return null;
  }, [zones]);

  const getGpStatus = (stationId) => {
    const cov = gpCoverageMap[stationId];
    if (!cov) return 'not_tested';
    return cov.hasFuelOptions ? 'covered' : 'partial';
  };

  const getIcon = (station) => {
    const zone = getZoneMembership(station);
    if (!zone) return ICONS.out_zone;
    return ICONS[`in_zone_${getGpStatus(station.id)}`] || ICONS.in_zone_not_tested;
  };

  const stationsInZone = useCallback((zone) => {
    return stations.filter(s => isStationInZone(s, zone));
  }, [stations]);

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

  // ─── Test single station ──────────────────────────────────────────────────
  const testSingleStation = async (station) => {
    setTestingStation(true);
    try {
      await base44.functions.invoke('discoverGooglePlacesCoverageAroundStations', { stationIds: [station.id] });
      const gpPrices = await base44.entities.FuelPrice.filter({ sourceName: 'GooglePlaces', stationId: station.id });
      const entry = gpPrices.length > 0
        ? { hasFuelOptions: true, fuelTypes: gpPrices.map(p => p.fuelType).filter(Boolean), fetchedAt: gpPrices[0].fetchedAt }
        : null;
      setGpCoverageMap(prev => ({ ...prev, [station.id]: entry }));
      alert(`Tested. GP prices: ${entry ? entry.fuelTypes.join(', ') : 'None'}`);
    } catch (err) { alert(`Error: ${err.message}`); }
    finally { setTestingStation(false); }
  };

  // ─── Map click ─────────────────────────────────────────────────────────────
  const handleMapClick = useCallback(async (e) => {
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
      await base44.functions.invoke('discoverGooglePlacesCoverageAroundStations', { stationIds: nearby.map(s => s.id) });
      await loadAll();
      setClickToTestMode(false);
    } catch (err) { alert(`Error: ${err.message}`); }
  }, [corridorDraft, clickToTestMode, testRadius, stations, loadAll]);

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
  const coveredInZone = inActiveZone.filter(s => getGpStatus(s.id) === 'covered');
  const untestedInZone = inActiveZone.filter(s => getGpStatus(s.id) === 'not_tested');

  if (loading) return (
    <div className="w-full h-screen flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-slate-500" />
    </div>
  );

  const isDrawingCorridor = !!corridorDraft;

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
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" /> In zone + covered</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" /> In zone + not tested</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-orange-400 inline-block" /> In zone + uncovered</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-slate-300 inline-block" /> Out of zone</span>
          </div>
          <div className="flex items-center gap-1 ml-auto">
            {!isDrawingCorridor && (
              <>
                <Button size="sm" variant={clickToTestMode ? 'default' : 'outline'} onClick={() => setClickToTestMode(m => !m)} className="text-xs">
                  <MapPin className="w-3 h-3 mr-1" />{clickToTestMode ? 'Click mode ON' : 'Click to test'}
                </Button>
                {clickToTestMode && (
                  <input type="number" value={testRadius} onChange={e => setTestRadius(Math.max(0.1, parseFloat(e.target.value) || 1))}
                    className="w-14 px-2 py-1 border rounded text-xs" placeholder="km" />
                )}
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
          </div>
        </div>
      </div>

      {/* ── Map + Sidebar ── */}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 relative" style={{ minWidth: 0 }}>
          <MapContainer center={[63.43, 10.39]} zoom={11} style={{ height: '100%', width: '100%' }}
            eventHandlers={{ click: handleMapClick }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap" />
            <MapController mapRef={mapRef} />

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

            {/* Corridor draft preview */}
            {isDrawingCorridor && corridorDraft.points.length >= 1 && (
              <>
                {corridorDraft.points.length >= 2 && (
                  <Polyline positions={corridorDraft.points.map(p => [p.lat, p.lng])} pathOptions={{ color: '#2563eb', weight: 3, dashArray: '6,4' }} />
                )}
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
              const gpStatus = getGpStatus(station.id);
              const cov = gpCoverageMap[station.id];
              return (
                <Marker key={station.id} position={[station.latitude, station.longitude]} icon={getIcon(station)}
                  eventHandlers={{ click: () => { setSelectedStation(station); setSidebarMode('station'); } }}>
                  <Popup>
                    <div className="text-xs min-w-[170px] space-y-1">
                      <div className="font-bold">{station.name}</div>
                      <div className="text-slate-500">{station.chain || 'Unknown chain'}</div>
                      <div className="flex gap-1 flex-wrap">
                        <span className={`px-1.5 py-0.5 rounded text-white text-xs ${zone ? 'bg-emerald-500' : 'bg-slate-400'}`}>{zone ? `Zone: ${zone.name}` : 'Out of zone'}</span>
                        <span className={`px-1.5 py-0.5 rounded text-white text-xs ${gpStatus === 'covered' ? 'bg-green-600' : gpStatus === 'partial' ? 'bg-yellow-500' : 'bg-slate-300'}`}>GP: {gpStatus.replace('_', ' ')}</span>
                      </div>
                      {cov?.fuelTypes?.length > 0 && <div className="text-slate-600">{cov.fuelTypes.join(', ')}</div>}
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

          <div className="flex border-b text-xs font-semibold">
            {[{ key: 'zones', label: 'Zones' }, { key: 'station', label: `Station${selectedStation ? ' ●' : ''}` }, { key: 'zone_detail', label: `Zone${selectedZone ? ' ●' : ''}` }].map(({ key, label }) => (
              <button key={key} onClick={() => setSidebarMode(key)}
                className={`flex-1 py-2 px-2 ${sidebarMode === key ? 'border-b-2 border-blue-600 text-blue-700 bg-blue-50' : 'text-slate-500 hover:bg-slate-50'}`}>
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
                const gpStatus = getGpStatus(selectedStation.id);
                const cov = gpCoverageMap[selectedStation.id];
                return (
                  <div className="space-y-3">
                    <div>
                      <h3 className="font-bold">{selectedStation.name}</h3>
                      <div className="text-sm text-slate-500">{selectedStation.chain || 'Unknown chain'}</div>
                      <div className="text-xs text-slate-400">{selectedStation.address || ''}</div>
                    </div>
                    <div className="rounded-lg border p-2.5 space-y-1">
                      <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Zone membership</div>
                      {zone ? (
                        <>
                          <Badge className="bg-emerald-100 text-emerald-800">✓ In zone: {zone.name}</Badge>
                          <div className="text-xs text-slate-500">{zone.isActive ? 'Active' : 'Inactive'} · {zone.zoneType || 'circle'} · {zone.priority || 'normal'}</div>
                        </>
                      ) : <Badge className="bg-slate-100 text-slate-500">✗ Outside all zones</Badge>}
                    </div>
                    <div className="rounded-lg border p-2.5 space-y-1.5">
                      <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide">GP historical coverage</div>
                      <Badge className={gpStatus === 'covered' ? 'bg-green-100 text-green-800' : gpStatus === 'partial' ? 'bg-yellow-100 text-yellow-800' : 'bg-slate-100 text-slate-500'}>
                        {gpStatus === 'covered' ? '✓ Has GP fuel prices' : gpStatus === 'partial' ? '~ GP matched, no price' : '? No GP data yet'}
                      </Badge>
                      {cov?.fuelTypes?.length > 0 && <div className="text-xs text-slate-600">{cov.fuelTypes.join(', ')}</div>}
                      {cov?.fetchedAt && <div className="text-xs text-slate-400">Last seen: {new Date(cov.fetchedAt).toLocaleString()}</div>}
                    </div>
                    <div className="space-y-1.5">
                      <Button size="sm" variant="outline" className="w-full" disabled={testingStation} onClick={() => testSingleStation(selectedStation)}>
                        {testingStation ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />} Test this station
                      </Button>
                      <Button size="sm" variant="outline" className="w-full" onClick={() => { if (mapRef.current) mapRef.current.setView([selectedStation.latitude, selectedStation.longitude], 14); }}>
                        <MapPin className="w-4 h-4 mr-2" /> Center map here
                      </Button>
                    </div>
                  </div>
                );
              })()
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
                          const gp = getGpStatus(s.id);
                          return (
                            <div key={s.id} className="flex items-center justify-between text-xs p-1.5 rounded hover:bg-slate-50 cursor-pointer"
                              onClick={() => { setSelectedStation(s); setSidebarMode('station'); }}>
                              <span className="truncate flex-1 mr-2">{s.name}</span>
                              <span className={`shrink-0 px-1.5 py-0.5 rounded text-white text-xs ${gp === 'covered' ? 'bg-green-500' : gp === 'partial' ? 'bg-yellow-500' : 'bg-slate-300'}`}>{gp}</span>
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