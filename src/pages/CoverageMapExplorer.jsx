import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Loader2, Zap, Grid3x3, MapPin, Plus, Minus, Search,
  X, ChevronRight, Circle as CircleIcon, RefreshCw
} from 'lucide-react';

// ─── Marker icons ─────────────────────────────────────────────────────────────
// Encoding: zone_active status × GP coverage status
// in_zone + covered    → green
// in_zone + partial    → yellow
// in_zone + uncovered  → orange
// in_zone + not_tested → blue
// out_zone             → grey (small)

const makeIcon = (url, size = [20, 33]) => new L.Icon({
  iconUrl: url,
  iconSize: size,
  iconAnchor: [size[0] / 2, size[1]],
  popupAnchor: [0, -size[1]],
});

const ICONS = {
  in_zone_covered:    makeIcon('https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png'),
  in_zone_partial:    makeIcon('https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-yellow.png'),
  in_zone_uncovered:  makeIcon('https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png'),
  in_zone_not_tested: makeIcon('https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png'),
  out_zone:           makeIcon('https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-grey.png', [14, 23]),
};

// ─── Map controller ───────────────────────────────────────────────────────────
function MapController({ mapRef }) {
  const map = useMap();
  const initialized = useRef(false);
  useEffect(() => {
    if (map && !initialized.current) {
      mapRef.current = map;
      map.setView([63.43, 10.39], 11); // Default to Trondheim (launch city)
      initialized.current = true;
    }
  }, [map, mapRef]);
  return null;
}

// ─── Haversine distance (meters) ─────────────────────────────────────────────
function distanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function CoverageMapExplorer() {
  const mapRef = useRef(null);

  const [stations, setStations] = useState([]);
  const [zones, setZones] = useState([]); // GPFetchZone records
  const [gpCoverageMap, setGpCoverageMap] = useState({}); // stationId → { hasFuelOptions, fuelTypes, fetchedAt }

  const [selectedStation, setSelectedStation] = useState(null);
  const [selectedZone, setSelectedZone] = useState(null);
  const [sidebarMode, setSidebarMode] = useState('zones'); // 'zones' | 'station' | 'zone_detail'

  const [loading, setLoading] = useState(true);
  const [savingZone, setSavingZone] = useState(false);
  const [testingStation, setTestingStation] = useState(false);
  const [clickToTestMode, setClickToTestMode] = useState(false);
  const [testRadius, setTestRadius] = useState(1);

  const [showLayers, setShowLayers] = useState({
    inZone: true,
    outZone: true,
    zoneCircles: true,
  });

  // ─── Load ─────────────────────────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    try {
      const [allStations, allZones, gpPrices] = await Promise.all([
        base44.entities.Station.list(),
        base44.entities.GPFetchZone.list(),
        base44.entities.FuelPrice.filter({ sourceName: 'GooglePlaces' }),
      ]);

      setStations(allStations.filter(s => s.latitude && s.longitude));
      setZones(allZones);

      // Build GP coverage map from historical FuelPrice records
      const coverageMap = {};
      for (const price of gpPrices) {
        if (!price.stationId) continue;
        if (!coverageMap[price.stationId]) {
          coverageMap[price.stationId] = { hasFuelOptions: true, fuelTypes: [], fetchedAt: price.fetchedAt };
        }
        if (price.fuelType && !coverageMap[price.stationId].fuelTypes.includes(price.fuelType)) {
          coverageMap[price.stationId].fuelTypes.push(price.fuelType);
        }
      }
      setGpCoverageMap(coverageMap);
      setLoading(false);
    } catch (err) {
      console.error('Load failed:', err);
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // ─── Derived helpers ──────────────────────────────────────────────────────
  // Is station within any ACTIVE zone's radius?
  const getZoneMembership = useCallback((station) => {
    for (const zone of zones) {
      if (!zone.isActive) continue;
      const d = distanceMeters(station.latitude, station.longitude, zone.latitude, zone.longitude);
      if (d <= (zone.radiusMeters || 5000)) return zone;
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
    const gpStatus = getGpStatus(station.id);
    return ICONS[`in_zone_${gpStatus}`] || ICONS.in_zone_not_tested;
  };

  // ─── Zone toggle active ───────────────────────────────────────────────────
  const toggleZoneActive = async (zone) => {
    setSavingZone(true);
    try {
      await base44.entities.GPFetchZone.update(zone.id, { isActive: !zone.isActive });
      setZones(prev => prev.map(z => z.id === zone.id ? { ...z, isActive: !z.isActive } : z));
    } catch (err) {
      alert(`Failed to update zone: ${err.message}`);
    } finally {
      setSavingZone(false);
    }
  };

  const updateZoneField = async (zone, field, value) => {
    try {
      await base44.entities.GPFetchZone.update(zone.id, { [field]: value });
      setZones(prev => prev.map(z => z.id === zone.id ? { ...z, [field]: value } : z));
    } catch (err) {
      alert(`Failed to update zone: ${err.message}`);
    }
  };

  // ─── Test single station ──────────────────────────────────────────────────
  const testSingleStation = async (station) => {
    setTestingStation(true);
    try {
      await base44.functions.invoke('discoverGooglePlacesCoverageAroundStations', {
        stationIds: [station.id],
      });
      const gpPrices = await base44.entities.FuelPrice.filter({ sourceName: 'GooglePlaces', stationId: station.id });
      const newEntry = gpPrices.length > 0
        ? { hasFuelOptions: true, fuelTypes: gpPrices.map(p => p.fuelType).filter(Boolean), fetchedAt: gpPrices[0].fetchedAt }
        : null;
      setGpCoverageMap(prev => ({ ...prev, [station.id]: newEntry }));
      alert(`Tested.\nGP prices found: ${newEntry ? newEntry.fuelTypes.join(', ') : 'None'}`);
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setTestingStation(false);
    }
  };

  // ─── Map click handler to test area ──────────────────────────────────────
  const handleMapClick = useCallback(async (e) => {
    if (!clickToTestMode) return;
    const { lat, lng } = e.latlng;
    const nearby = stations.filter(s =>
      L.latLng(lat, lng).distanceTo([s.latitude, s.longitude]) / 1000 <= testRadius
    );
    if (nearby.length === 0) { alert('No stations within radius.'); return; }
    alert(`Testing ${nearby.length} stations near clicked point...`);
    try {
      await base44.functions.invoke('discoverGooglePlacesCoverageAroundStations', {
        stationIds: nearby.map(s => s.id),
      });
      await loadAll();
      setClickToTestMode(false);
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  }, [clickToTestMode, testRadius, stations, loadAll]);

  // ─── Stats ────────────────────────────────────────────────────────────────
  const activeZones = zones.filter(z => z.isActive);
  const inActiveZone = stations.filter(s => getZoneMembership(s));
  const coveredInZone = inActiveZone.filter(s => getGpStatus(s.id) === 'covered');
  const untestedInZone = inActiveZone.filter(s => getGpStatus(s.id) === 'not_tested');

  if (loading) {
    return (
      <div className="w-full h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-slate-500" />
      </div>
    );
  }

  return (
    <div className="w-full h-screen flex flex-col bg-slate-100">

      {/* ── Header ── */}
      <div className="bg-white border-b px-4 py-2 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-lg font-bold">GP Fetch Scope &amp; Coverage Control</h1>
          <Button size="sm" variant="outline" onClick={loadAll}>
            <RefreshCw className="w-3 h-3 mr-1" /> Refresh
          </Button>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Stats */}
          <Card className="px-3 py-1.5 flex gap-4 items-center text-xs">
            <div className="text-center"><div className="text-base font-bold">{stations.length}</div><div className="text-slate-500">Total stations</div></div>
            <div className="text-center"><div className="text-base font-bold text-emerald-600">{activeZones.length}</div><div className="text-slate-500">Active zones</div></div>
            <div className="text-center"><div className="text-base font-bold text-blue-600">{inActiveZone.length}</div><div className="text-slate-500">In-zone</div></div>
            <div className="text-center"><div className="text-base font-bold text-green-600">{coveredInZone.length}</div><div className="text-slate-500">GP covered</div></div>
            <div className="text-center"><div className="text-base font-bold text-amber-500">{untestedInZone.length}</div><div className="text-slate-500">Untested</div></div>
          </Card>

          {/* Legend */}
          <div className="flex items-center gap-2 text-xs text-slate-500 flex-wrap">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" /> In zone + covered</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-yellow-400 inline-block" /> In zone + partial</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-orange-400 inline-block" /> In zone + uncovered</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" /> In zone + not tested</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-slate-300 inline-block" /> Out of all zones</span>
          </div>

          {/* Click-to-test toggle */}
          <div className="flex items-center gap-1 ml-auto">
            <Button
              size="sm"
              variant={clickToTestMode ? 'default' : 'outline'}
              onClick={() => setClickToTestMode(m => !m)}
              className="text-xs"
            >
              <MapPin className="w-3 h-3 mr-1" />
              {clickToTestMode ? 'Click mode ON' : 'Click to test'}
            </Button>
            {clickToTestMode && (
              <input
                type="number"
                value={testRadius}
                onChange={e => setTestRadius(Math.max(0.1, parseFloat(e.target.value) || 1))}
                className="w-14 px-2 py-1 border rounded text-xs"
                placeholder="km"
              />
            )}
          </div>
        </div>
      </div>

      {/* ── Map + Sidebar ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Map */}
        <div className="flex-1 relative" style={{ minWidth: 0 }}>
          <MapContainer
            center={[63.43, 10.39]}
            zoom={11}
            style={{ height: '100%', width: '100%' }}
            eventHandlers={{ click: handleMapClick }}
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap" />
            <MapController mapRef={mapRef} />

            {/* Zone circles */}
            {showLayers.zoneCircles && zones.map(zone => (
              <Circle
                key={zone.id}
                center={[zone.latitude, zone.longitude]}
                radius={zone.radiusMeters || 5000}
                pathOptions={{
                  color: zone.isActive ? '#10b981' : '#94a3b8',
                  weight: zone.isActive ? 2 : 1,
                  opacity: zone.isActive ? 0.7 : 0.3,
                  fillOpacity: zone.isActive ? 0.06 : 0.02,
                  dashArray: zone.isActive ? null : '6,4',
                }}
                eventHandlers={{ click: () => { setSelectedZone(zone); setSidebarMode('zone_detail'); } }}
              >
                <Popup>
                  <div className="text-xs font-semibold">{zone.name}</div>
                  <div className={`text-xs ${zone.isActive ? 'text-green-700' : 'text-slate-400'}`}>
                    {zone.isActive ? '✓ Active' : '✗ Inactive'}
                  </div>
                  <div className="text-xs text-slate-500">Priority: {zone.priority || 'normal'}</div>
                </Popup>
              </Circle>
            ))}

            {/* Station markers */}
            {stations.map(station => {
              const zone = getZoneMembership(station);
              if (!showLayers.inZone && zone) return null;
              if (!showLayers.outZone && !zone) return null;

              const gpStatus = getGpStatus(station.id);
              const cov = gpCoverageMap[station.id];

              return (
                <Marker
                  key={station.id}
                  position={[station.latitude, station.longitude]}
                  icon={getIcon(station)}
                  eventHandlers={{ click: () => { setSelectedStation(station); setSidebarMode('station'); } }}
                >
                  <Popup>
                    <div className="text-xs min-w-[170px] space-y-1">
                      <div className="font-bold">{station.name}</div>
                      <div className="text-slate-500">{station.chain || 'Unknown chain'}</div>
                      <div className="flex gap-1 flex-wrap">
                        <span className={`px-1.5 py-0.5 rounded text-white text-xs ${zone ? 'bg-emerald-500' : 'bg-slate-400'}`}>
                          {zone ? `Zone: ${zone.name}` : 'Out of zone'}
                        </span>
                        <span className={`px-1.5 py-0.5 rounded text-white text-xs ${
                          gpStatus === 'covered' ? 'bg-green-600' :
                          gpStatus === 'partial' ? 'bg-yellow-500' : 'bg-slate-300'}`}>
                          GP: {gpStatus.replace('_', ' ')}
                        </span>
                      </div>
                      {cov?.fuelTypes?.length > 0 && <div className="text-slate-600">{cov.fuelTypes.join(', ')}</div>}
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>

          {clickToTestMode && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[500] bg-blue-600 text-white text-xs px-3 py-1.5 rounded-full shadow-lg pointer-events-none">
              Click map to test stations within {testRadius} km
            </div>
          )}
        </div>

        {/* ── Sidebar ── */}
        <div className="w-80 bg-white border-l flex flex-col overflow-hidden shadow-sm">
          <div className="flex border-b text-xs font-semibold">
            {[
              { key: 'zones', label: 'Zones' },
              { key: 'station', label: `Station${selectedStation ? ' ●' : ''}` },
              { key: 'zone_detail', label: `Zone${selectedZone ? ' ●' : ''}` },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setSidebarMode(key)}
                className={`flex-1 py-2 px-2 ${sidebarMode === key ? 'border-b-2 border-blue-600 text-blue-700 bg-blue-50' : 'text-slate-500 hover:bg-slate-50'}`}
              >
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
                    {[
                      { key: 'inZone', label: 'In-zone stations' },
                      { key: 'outZone', label: 'Out-of-zone stations' },
                      { key: 'zoneCircles', label: 'Zone circles' },
                    ].map(({ key, label }) => (
                      <label key={key} className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          checked={showLayers[key]}
                          onCheckedChange={v => setShowLayers(prev => ({ ...prev, [key]: !!v }))}
                        />
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
                      // Count stations in this zone
                      const stationsInZone = stations.filter(s =>
                        distanceMeters(s.latitude, s.longitude, zone.latitude, zone.longitude) <= (zone.radiusMeters || 5000)
                      );
                      const coveredInThisZone = stationsInZone.filter(s => getGpStatus(s.id) === 'covered').length;

                      return (
                        <div
                          key={zone.id}
                          className={`rounded border p-2 cursor-pointer transition-colors ${
                            zone.isActive ? 'border-emerald-200 bg-emerald-50 hover:bg-emerald-100' : 'border-slate-200 bg-white hover:bg-slate-50'
                          }`}
                          onClick={() => { setSelectedZone(zone); setSidebarMode('zone_detail'); }}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-semibold truncate flex-1 mr-2">{zone.name}</span>
                            <button
                              disabled={savingZone}
                              onClick={e => { e.stopPropagation(); toggleZoneActive(zone); }}
                              className={`shrink-0 text-xs px-2 py-0.5 rounded font-semibold ${
                                zone.isActive
                                  ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                                  : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                              }`}
                            >
                              {zone.isActive ? 'ON' : 'OFF'}
                            </button>
                          </div>
                          <div className="text-xs text-slate-500 flex gap-2">
                            <span>{stationsInZone.length} stations</span>
                            <span className="text-green-700">{coveredInThisZone} covered</span>
                            <span className="capitalize text-slate-400">{zone.priority || 'normal'}</span>
                          </div>
                          {zone.lastFetchedAt && (
                            <div className="text-xs text-slate-400 mt-0.5">
                              Last fetch: {new Date(zone.lastFetchedAt).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            {/* ── Station detail ── */}
            {sidebarMode === 'station' && (
              <>
                {!selectedStation ? (
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

                      {/* Zone membership */}
                      <div className="rounded-lg border p-2.5 space-y-1">
                        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Zone membership</div>
                        {zone ? (
                          <>
                            <Badge className="bg-emerald-100 text-emerald-800">✓ In zone: {zone.name}</Badge>
                            <div className="text-xs text-slate-500">Status: {zone.isActive ? 'Active' : 'Inactive'} · {zone.priority || 'normal'} priority</div>
                          </>
                        ) : (
                          <Badge className="bg-slate-100 text-slate-500">✗ Outside all zones</Badge>
                        )}
                      </div>

                      {/* GP coverage */}
                      <div className="rounded-lg border p-2.5 space-y-1.5">
                        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide">GP historical coverage</div>
                        <Badge className={
                          gpStatus === 'covered' ? 'bg-green-100 text-green-800' :
                          gpStatus === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-slate-100 text-slate-500'
                        }>
                          {gpStatus === 'covered' ? '✓ Has GP fuel prices' :
                           gpStatus === 'partial' ? '~ GP matched, no price' :
                           '? No GP data yet'}
                        </Badge>
                        {cov?.fuelTypes?.length > 0 && (
                          <div className="text-xs text-slate-600">{cov.fuelTypes.join(', ')}</div>
                        )}
                        {cov?.fetchedAt && (
                          <div className="text-xs text-slate-400">Last seen: {new Date(cov.fetchedAt).toLocaleString()}</div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="space-y-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full"
                          disabled={testingStation}
                          onClick={() => testSingleStation(selectedStation)}
                        >
                          {testingStation ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
                          Test this station now
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full"
                          onClick={() => {
                            if (!mapRef.current) return;
                            mapRef.current.setView([selectedStation.latitude, selectedStation.longitude], 14);
                          }}
                        >
                          <MapPin className="w-4 h-4 mr-2" /> Center map here
                        </Button>
                      </div>
                    </div>
                  );
                })()}
              </>
            )}

            {/* ── Zone detail ── */}
            {sidebarMode === 'zone_detail' && (
              <>
                {!selectedZone ? (
                  <div className="text-sm text-slate-400 text-center pt-8">Click a zone circle on the map or select from list</div>
                ) : (() => {
                  const stationsInZone = stations.filter(s =>
                    distanceMeters(s.latitude, s.longitude, selectedZone.latitude, selectedZone.longitude) <= (selectedZone.radiusMeters || 5000)
                  );
                  const covered = stationsInZone.filter(s => getGpStatus(s.id) === 'covered');
                  const partial = stationsInZone.filter(s => getGpStatus(s.id) === 'partial');
                  const notTested = stationsInZone.filter(s => getGpStatus(s.id) === 'not_tested');

                  return (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-sm">{selectedZone.name}</h3>
                        <button
                          disabled={savingZone}
                          onClick={() => toggleZoneActive(selectedZone)}
                          className={`text-xs px-3 py-1 rounded font-semibold ${
                            selectedZone.isActive
                              ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                              : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                          }`}
                        >
                          {selectedZone.isActive ? 'ON — click to disable' : 'OFF — click to enable'}
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-1.5 text-xs">
                        <Card className="p-2 text-center"><div className="font-bold text-base">{stationsInZone.length}</div><div className="text-slate-500">Stations</div></Card>
                        <Card className="p-2 text-center bg-green-50"><div className="font-bold text-base text-green-700">{covered.length}</div><div className="text-slate-500">GP covered</div></Card>
                        <Card className="p-2 text-center bg-yellow-50"><div className="font-bold text-base text-yellow-600">{partial.length}</div><div className="text-slate-500">Partial</div></Card>
                        <Card className="p-2 text-center bg-slate-50"><div className="font-bold text-base text-slate-500">{notTested.length}</div><div className="text-slate-500">Not tested</div></Card>
                      </div>

                      <div className="space-y-1.5">
                        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Priority</div>
                        <div className="flex gap-1">
                          {['high', 'normal', 'low'].map(p => (
                            <button
                              key={p}
                              onClick={() => updateZoneField(selectedZone, 'priority', p)}
                              className={`flex-1 py-1 text-xs rounded border capitalize ${selectedZone.priority === p ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
                            >
                              {p}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Radius</div>
                        <div className="flex gap-1 items-center">
                          <input
                            type="number"
                            defaultValue={selectedZone.radiusMeters || 5000}
                            className="flex-1 px-2 py-1 border rounded text-xs"
                            onBlur={e => updateZoneField(selectedZone, 'radiusMeters', parseInt(e.target.value))}
                          />
                          <span className="text-xs text-slate-400">m</span>
                        </div>
                      </div>

                      {selectedZone.notes && (
                        <div className="text-xs text-slate-500 bg-slate-50 rounded p-2">{selectedZone.notes}</div>
                      )}

                      {selectedZone.lastFetchedAt && (
                        <div className="text-xs text-slate-400">
                          Last fetch: {new Date(selectedZone.lastFetchedAt).toLocaleString()}
                          {selectedZone.lastFetchStats && (
                            <div className="mt-0.5">{selectedZone.lastFetchStats}</div>
                          )}
                        </div>
                      )}

                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full"
                        onClick={() => {
                          if (!mapRef.current) return;
                          mapRef.current.setView([selectedZone.latitude, selectedZone.longitude], 12);
                        }}
                      >
                        <MapPin className="w-4 h-4 mr-2" /> Go to zone on map
                      </Button>

                      <div>
                        <div className="text-xs font-semibold text-slate-500 mb-1.5">Stations in zone</div>
                        <div className="space-y-0.5 max-h-44 overflow-y-auto">
                          {stationsInZone.map(s => {
                            const gp = getGpStatus(s.id);
                            return (
                              <div
                                key={s.id}
                                className="flex items-center justify-between text-xs p-1.5 rounded hover:bg-slate-50 cursor-pointer"
                                onClick={() => { setSelectedStation(s); setSidebarMode('station'); }}
                              >
                                <span className="truncate flex-1 mr-2">{s.name}</span>
                                <span className={`shrink-0 px-1.5 py-0.5 rounded text-white text-xs ${
                                  gp === 'covered' ? 'bg-green-500' :
                                  gp === 'partial' ? 'bg-yellow-500' : 'bg-slate-300'
                                }`}>{gp}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}