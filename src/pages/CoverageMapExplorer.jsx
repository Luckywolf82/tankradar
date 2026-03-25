import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Rectangle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Zap, Grid3x3, MapPin, Plus, Minus, Search, X, ChevronRight } from 'lucide-react';

// ─── Marker icons ────────────────────────────────────────────────────────────
// Fetch scope + GP coverage combined states:
// in_scope + covered   → green
// in_scope + partial   → yellow-green
// in_scope + uncovered → orange
// in_scope + not_tested→ blue
// out_scope            → grey (small)

const makeIcon = (url, size = [20, 33]) => new L.Icon({
  iconUrl: url,
  iconSize: size,
  iconAnchor: [size[0] / 2, size[1]],
  popupAnchor: [0, -size[1]],
});

const ICONS = {
  in_scope_covered:    makeIcon('https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png'),
  in_scope_partial:    makeIcon('https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-yellow.png'),
  in_scope_uncovered:  makeIcon('https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png'),
  in_scope_not_tested: makeIcon('https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png'),
  out_scope:           makeIcon('https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-grey.png', [14, 23]),
};

// ─── Map controller ──────────────────────────────────────────────────────────
function MapController({ mapRef, onMapReady }) {
  const map = useMap();
  const initializedRef = useRef(false);
  useEffect(() => {
    if (map && !initializedRef.current) {
      mapRef.current = map;
      map.setView([59.9139, 10.7522], 12);
      initializedRef.current = true;
      onMapReady?.();
    }
  }, [map, mapRef, onMapReady]);
  return null;
}

// ─── Main page ───────────────────────────────────────────────────────────────
export default function CoverageMapExplorer() {
  const mapRef = useRef(null);

  const [stations, setStations] = useState([]);
  const [fetchScope, setFetchScope] = useState(new Set()); // stationIds in GP fetch scope
  const [gpCoverageMap, setGpCoverageMap] = useState({}); // stationId → { matched, hasFuelOptions, fuelTypes, updateTime }
  const [testedAreas, setTestedAreas] = useState([]);

  const [selectedStation, setSelectedStation] = useState(null);
  const [selectedArea, setSelectedArea] = useState(null);
  const [sidebarMode, setSidebarMode] = useState('legend'); // 'legend' | 'station' | 'area'

  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [testingStation, setTestingStation] = useState(false);
  const [clickToTestMode, setClickToTestMode] = useState(false);
  const [testRadius, setTestRadius] = useState(1);

  const [showLayers, setShowLayers] = useState({
    inScope: true,
    outScope: true,
    testedAreas: true,
  });

  // ─── Load data ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const [allStations, gpPrices] = await Promise.all([
          base44.entities.Station.list(),
          base44.entities.FuelPrice.filter({ sourceName: 'GooglePlaces' }),
        ]);

        const withCoords = allStations.filter(s => s.latitude && s.longitude);
        setStations(withCoords);

        // Build GP coverage map from existing FuelPrice records
        const coverageMap = {};
        for (const price of gpPrices) {
          if (!price.stationId) continue;
          if (!coverageMap[price.stationId]) {
            coverageMap[price.stationId] = { matched: true, hasFuelOptions: true, fuelTypes: [], updateTime: price.fetchedAt };
          }
          if (price.fuelType && !coverageMap[price.stationId].fuelTypes.includes(price.fuelType)) {
            coverageMap[price.stationId].fuelTypes.push(price.fuelType);
          }
        }
        setGpCoverageMap(coverageMap);

        // Restore fetch scope from localStorage
        const savedScope = localStorage.getItem('gp-fetch-scope');
        if (savedScope) setFetchScope(new Set(JSON.parse(savedScope)));

        // Restore tested areas
        const savedAreas = localStorage.getItem('gp-tested-areas-v2');
        if (savedAreas) setTestedAreas(JSON.parse(savedAreas));

        setLoading(false);
      } catch (err) {
        console.error('Load failed:', err);
        setLoading(false);
      }
    };
    load();
  }, []);

  // ─── Persist fetch scope + areas ───────────────────────────────────────────
  useEffect(() => {
    localStorage.setItem('gp-fetch-scope', JSON.stringify([...fetchScope]));
  }, [fetchScope]);

  useEffect(() => {
    localStorage.setItem('gp-tested-areas-v2', JSON.stringify(testedAreas));
  }, [testedAreas]);

  // ─── Derived state helpers ──────────────────────────────────────────────────
  const getGpStatus = (stationId) => {
    const cov = gpCoverageMap[stationId];
    if (!cov) return 'not_tested';
    if (cov.hasFuelOptions) return 'covered';
    if (cov.matched) return 'partial';
    return 'uncovered';
  };

  const getIcon = (station) => {
    const inScope = fetchScope.has(station.id);
    if (!inScope) return ICONS.out_scope;
    const gpStatus = getGpStatus(station.id);
    return ICONS[`in_scope_${gpStatus}`] || ICONS.in_scope_not_tested;
  };

  const getAreaColor = (area) => {
    if (!area.totalStations) return '#94a3b8';
    const rate = area.gpFuelOptionsCount / area.totalStations;
    if (rate >= 0.5) return '#22c55e';
    if (rate > 0) return '#eab308';
    return '#ef4444';
  };

  // ─── Fetch scope management ─────────────────────────────────────────────────
  const addToScope = (stationId) => setFetchScope(prev => new Set([...prev, stationId]));
  const removeFromScope = (stationId) => setFetchScope(prev => { const s = new Set(prev); s.delete(stationId); return s; });

  const addVisibleToScope = () => {
    if (!mapRef.current) return;
    const bounds = mapRef.current.getBounds();
    const visibleIds = stations.filter(s => bounds.contains([s.latitude, s.longitude])).map(s => s.id);
    setFetchScope(prev => new Set([...prev, ...visibleIds]));
    alert(`Added ${visibleIds.length} visible stations to fetch scope.`);
  };

  const removeVisibleFromScope = () => {
    if (!mapRef.current) return;
    const bounds = mapRef.current.getBounds();
    const visibleIds = new Set(stations.filter(s => bounds.contains([s.latitude, s.longitude])).map(s => s.id));
    setFetchScope(prev => new Set([...prev].filter(id => !visibleIds.has(id))));
    alert(`Removed ${visibleIds.size} stations from fetch scope.`);
  };

  // ─── Test area ──────────────────────────────────────────────────────────────
  const runAreaTest = async (stationsToTest, bounds, center) => {
    if (stationsToTest.length === 0) { alert('No stations in area.'); return; }
    setScanning(true);
    try {
      // Fetch GP candidates for these stations by calling the discovery function
      const response = await base44.functions.invoke('discoverGooglePlacesCoverageAroundStations', {
        stationIds: stationsToTest.map(s => s.id),
      });

      // Reload GP prices to update coverage map
      const gpPrices = await base44.entities.FuelPrice.filter({ sourceName: 'GooglePlaces' });
      const newCoverageMap = { ...gpCoverageMap };
      for (const price of gpPrices) {
        if (!price.stationId) continue;
        if (!newCoverageMap[price.stationId]) {
          newCoverageMap[price.stationId] = { matched: true, hasFuelOptions: true, fuelTypes: [], updateTime: price.fetchedAt };
        }
        if (price.fuelType && !newCoverageMap[price.stationId].fuelTypes.includes(price.fuelType)) {
          newCoverageMap[price.stationId].fuelTypes.push(price.fuelType);
        }
      }
      setGpCoverageMap(newCoverageMap);

      const stationResults = stationsToTest.map(s => ({
        stationId: s.id,
        stationName: s.name,
        gpStatus: newCoverageMap[s.id] ? (newCoverageMap[s.id].hasFuelOptions ? 'covered' : 'partial') : 'uncovered',
        fuelTypes: newCoverageMap[s.id]?.fuelTypes || [],
        updateTime: newCoverageMap[s.id]?.updateTime || null,
      }));

      const covered = stationResults.filter(r => r.gpStatus === 'covered').length;
      const partial = stationResults.filter(r => r.gpStatus === 'partial').length;

      const area = {
        id: Date.now().toString(),
        center,
        bounds,
        testedAt: new Date().toISOString(),
        totalStations: stationsToTest.length,
        gpFuelOptionsCount: covered,
        gpPartialCount: partial,
        coveragePercent: Math.round((covered / stationsToTest.length) * 100),
        stationResults,
      };

      setTestedAreas(prev => [...prev, area]);
      setSelectedArea(area);
      setSidebarMode('area');
      alert(`Done! ${covered}/${stationsToTest.length} stations have GP fuel prices.`);
    } catch (err) {
      alert(`Test failed: ${err.message}`);
    } finally {
      setScanning(false);
    }
  };

  const testVisibleArea = async () => {
    if (!mapRef.current) { alert('Map not ready.'); return; }
    const bounds = mapRef.current.getBounds();
    const center = bounds.getCenter();
    const visible = stations.filter(s => bounds.contains([s.latitude, s.longitude]));
    await runAreaTest(visible, {
      north: bounds.getNorth(), south: bounds.getSouth(),
      east: bounds.getEast(), west: bounds.getWest(),
    }, { lat: center.lat, lng: center.lng });
  };

  const testClickedPoint = async (e) => {
    if (!clickToTestMode) return;
    const { lat, lng } = e.latlng;
    const nearby = stations.filter(s =>
      L.latLng(lat, lng).distanceTo([s.latitude, s.longitude]) / 1000 <= testRadius
    );
    await runAreaTest(nearby, {
      north: lat + testRadius / 111, south: lat - testRadius / 111,
      east: lng + testRadius / 111, west: lng - testRadius / 111,
    }, { lat, lng });
  };

  const gridScanVisible = async () => {
    if (!mapRef.current) return;
    setScanning(true);
    try {
      const bounds = mapRef.current.getBounds();
      const allVisible = stations.filter(s => bounds.contains([s.latitude, s.longitude]));
      // Just run as one area test over entire visible set
      await runAreaTest(allVisible, {
        north: bounds.getNorth(), south: bounds.getSouth(),
        east: bounds.getEast(), west: bounds.getWest(),
      }, { lat: bounds.getCenter().lat, lng: bounds.getCenter().lng });
    } finally {
      setScanning(false);
    }
  };

  // ─── Test single station ────────────────────────────────────────────────────
  const testSingleStation = async (station) => {
    setTestingStation(true);
    try {
      await base44.functions.invoke('discoverGooglePlacesCoverageAroundStations', {
        stationIds: [station.id],
      });
      const gpPrices = await base44.entities.FuelPrice.filter({ sourceName: 'GooglePlaces', stationId: station.id });
      const newEntry = gpPrices.length > 0
        ? { matched: true, hasFuelOptions: true, fuelTypes: gpPrices.map(p => p.fuelType).filter(Boolean), updateTime: gpPrices[0].fetchedAt }
        : { matched: false, hasFuelOptions: false, fuelTypes: [], updateTime: null };
      setGpCoverageMap(prev => ({ ...prev, [station.id]: newEntry }));
      alert(`Station tested.\nGP match: ${newEntry.matched ? 'Yes' : 'No'}\nFuel prices: ${newEntry.hasFuelOptions ? newEntry.fuelTypes.join(', ') : 'None'}`);
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setTestingStation(false);
    }
  };

  const expandSearchAroundStation = async (station) => {
    if (!mapRef.current) return;
    mapRef.current.setView([station.latitude, station.longitude], 14);
    const nearby = stations.filter(s =>
      L.latLng(station.latitude, station.longitude).distanceTo([s.latitude, s.longitude]) / 1000 <= 2
    );
    await runAreaTest(nearby, {
      north: station.latitude + 2 / 111, south: station.latitude - 2 / 111,
      east: station.longitude + 2 / 111, west: station.longitude - 2 / 111,
    }, { lat: station.latitude, lng: station.longitude });
  };

  // ─── Stats ──────────────────────────────────────────────────────────────────
  const inScopeCount = fetchScope.size;
  const coveredCount = [...fetchScope].filter(id => getGpStatus(id) === 'covered').length;
  const notTestedInScope = [...fetchScope].filter(id => getGpStatus(id) === 'not_tested').length;

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
      <div className="bg-white border-b px-4 py-3 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-bold">GP Fetch Scope &amp; Coverage Control</h1>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-blue-500 inline-block" /> In scope</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-green-500 inline-block" /> Covered</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-yellow-400 inline-block" /> Partial</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-orange-400 inline-block" /> Uncovered</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-slate-300 inline-block" /> Out of scope</span>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Stats */}
          <Card className="px-3 py-2 flex gap-4 items-center">
            <div className="text-center"><div className="text-lg font-bold">{stations.length}</div><div className="text-xs text-slate-500">Total</div></div>
            <div className="text-center"><div className="text-lg font-bold text-blue-600">{inScopeCount}</div><div className="text-xs text-slate-500">In Scope</div></div>
            <div className="text-center"><div className="text-lg font-bold text-green-600">{coveredCount}</div><div className="text-xs text-slate-500">Covered</div></div>
            <div className="text-center"><div className="text-lg font-bold text-amber-500">{notTestedInScope}</div><div className="text-xs text-slate-500">Untested</div></div>
          </Card>

          {/* Scope actions */}
          <div className="flex gap-1">
            <Button size="sm" variant="outline" onClick={addVisibleToScope} className="text-xs">
              <Plus className="w-3 h-3 mr-1" /> Add visible to scope
            </Button>
            <Button size="sm" variant="outline" onClick={removeVisibleFromScope} className="text-xs">
              <Minus className="w-3 h-3 mr-1" /> Remove visible from scope
            </Button>
          </div>

          {/* Test actions */}
          <div className="flex gap-1 items-center">
            <Button size="sm" onClick={testVisibleArea} disabled={scanning} className="text-xs">
              <Zap className="w-3 h-3 mr-1" /> Test visible
            </Button>
            <Button size="sm" variant="outline" onClick={gridScanVisible} disabled={scanning} className="text-xs">
              <Grid3x3 className="w-3 h-3 mr-1" /> Grid scan
            </Button>
            <Button
              size="sm"
              variant={clickToTestMode ? 'default' : 'outline'}
              onClick={() => setClickToTestMode(m => !m)}
              className="text-xs"
            >
              <MapPin className="w-3 h-3 mr-1" /> {clickToTestMode ? 'Click mode ON' : 'Click to test'}
            </Button>
            {clickToTestMode && (
              <input
                type="number"
                value={testRadius}
                onChange={e => setTestRadius(Math.max(0.1, parseFloat(e.target.value) || 1))}
                className="w-16 px-2 py-1 border rounded text-xs"
                placeholder="km"
              />
            )}
            {scanning && <Loader2 className="w-4 h-4 animate-spin text-slate-500" />}
          </div>
        </div>
      </div>

      {/* ── Map + Sidebar ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Map */}
        <div className="flex-1 relative" style={{ minWidth: 0 }}>
          <MapContainer
            center={[59.9139, 10.7522]}
            zoom={12}
            style={{ height: '100%', width: '100%' }}
            onClick={testClickedPoint}
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap" />
            <MapController mapRef={mapRef} onMapReady={() => {}} />

            {/* Tested area rectangles */}
            {showLayers.testedAreas && testedAreas.map(area => (
              <Rectangle
                key={area.id}
                bounds={[[area.bounds.south, area.bounds.west], [area.bounds.north, area.bounds.east]]}
                pathOptions={{ color: getAreaColor(area), weight: 2, opacity: 0.6, fillOpacity: 0.08 }}
                eventHandlers={{ click: () => { setSelectedArea(area); setSidebarMode('area'); } }}
              />
            ))}

            {/* All station markers */}
            {stations.map(station => {
              const inScope = fetchScope.has(station.id);
              if (!showLayers.inScope && inScope) return null;
              if (!showLayers.outScope && !inScope) return null;

              const gpStatus = getGpStatus(station.id);
              const cov = gpCoverageMap[station.id];

              return (
                <Marker
                  key={station.id}
                  position={[station.latitude, station.longitude]}
                  icon={getIcon(station)}
                  eventHandlers={{
                    click: () => {
                      setSelectedStation(station);
                      setSidebarMode('station');
                    },
                  }}
                >
                  <Popup>
                    <div className="text-xs min-w-[160px]">
                      <div className="font-bold mb-1">{station.name}</div>
                      <div className="text-slate-500 mb-1">{station.chain || 'Unknown chain'}</div>
                      <div className="flex items-center gap-1 mb-1">
                        <span className={`px-1.5 py-0.5 rounded text-white text-xs font-semibold ${inScope ? 'bg-blue-500' : 'bg-slate-400'}`}>
                          {inScope ? 'In scope' : 'Out of scope'}
                        </span>
                        <span className={`px-1.5 py-0.5 rounded text-white text-xs font-semibold ${
                          gpStatus === 'covered' ? 'bg-green-600' :
                          gpStatus === 'partial' ? 'bg-yellow-500' :
                          gpStatus === 'uncovered' ? 'bg-orange-500' : 'bg-slate-300'
                        }`}>
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
              Click anywhere on the map to test stations within {testRadius} km
            </div>
          )}
        </div>

        {/* ── Sidebar ── */}
        <div className="w-80 bg-white border-l flex flex-col overflow-hidden shadow-sm">
          {/* Sidebar tabs */}
          <div className="flex border-b text-xs font-semibold">
            <button
              onClick={() => setSidebarMode('legend')}
              className={`flex-1 py-2 px-3 ${sidebarMode === 'legend' ? 'border-b-2 border-blue-600 text-blue-700' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              Layers
            </button>
            <button
              onClick={() => setSidebarMode('station')}
              className={`flex-1 py-2 px-3 ${sidebarMode === 'station' ? 'border-b-2 border-blue-600 text-blue-700' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              Station {selectedStation ? '●' : ''}
            </button>
            <button
              onClick={() => setSidebarMode('area')}
              className={`flex-1 py-2 px-3 ${sidebarMode === 'area' ? 'border-b-2 border-blue-600 text-blue-700' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              Area {selectedArea ? '●' : ''}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">

            {/* ── Layers panel ── */}
            {sidebarMode === 'legend' && (
              <>
                <div>
                  <h3 className="font-semibold text-sm mb-3">Layer visibility</h3>
                  <div className="space-y-2">
                    {[
                      { key: 'inScope', label: 'In-scope stations' },
                      { key: 'outScope', label: 'Out-of-scope stations' },
                      { key: 'testedAreas', label: 'Tested area overlays' },
                    ].map(({ key, label }) => (
                      <label key={key} className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          checked={showLayers[key]}
                          onCheckedChange={checked => setShowLayers(prev => ({ ...prev, [key]: !!checked }))}
                        />
                        <span className="text-sm">{label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-sm mb-2">Legend</h3>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-green-500" /><span>In scope + GP covered (has prices)</span></div>
                    <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-yellow-400" /><span>In scope + GP partial (matched, no price)</span></div>
                    <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-orange-400" /><span>In scope + GP uncovered (no match)</span></div>
                    <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-blue-500" /><span>In scope + not tested yet</span></div>
                    <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-slate-300" /><span>Out of fetch scope</span></div>
                  </div>
                </div>

                {testedAreas.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-sm mb-2">Tested areas ({testedAreas.length})</h3>
                    <div className="space-y-1">
                      {testedAreas.map(area => (
                        <div
                          key={area.id}
                          className="flex items-center justify-between p-2 rounded border cursor-pointer hover:bg-slate-50 text-xs"
                          onClick={() => { setSelectedArea(area); setSidebarMode('area'); }}
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded" style={{ backgroundColor: getAreaColor(area) }} />
                            <span>{area.coveragePercent}% covered</span>
                          </div>
                          <div className="text-slate-400">{area.gpFuelOptionsCount}/{area.totalStations}</div>
                          <button
                            className="text-slate-300 hover:text-red-400"
                            onClick={e => { e.stopPropagation(); setTestedAreas(prev => prev.filter(a => a.id !== area.id)); }}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* ── Station panel ── */}
            {sidebarMode === 'station' && (
              <>
                {!selectedStation ? (
                  <div className="text-sm text-slate-400 text-center pt-8">Click a station on the map</div>
                ) : (() => {
                  const inScope = fetchScope.has(selectedStation.id);
                  const gpStatus = getGpStatus(selectedStation.id);
                  const cov = gpCoverageMap[selectedStation.id];
                  return (
                    <div className="space-y-4">
                      <div>
                        <h3 className="font-bold text-base">{selectedStation.name}</h3>
                        <div className="text-sm text-slate-500">{selectedStation.chain || 'Unknown chain'}</div>
                        <div className="text-xs text-slate-400">{selectedStation.address || ''}</div>
                      </div>

                      {/* Fetch scope status */}
                      <div className="rounded-lg border p-3 space-y-1">
                        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Fetch Scope</div>
                        <Badge className={inScope ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-600'}>
                          {inScope ? '✓ In GP fetch scope' : '✗ Not in fetch scope'}
                        </Badge>
                      </div>

                      {/* GP coverage status */}
                      <div className="rounded-lg border p-3 space-y-2">
                        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">GP Coverage</div>
                        <Badge className={
                          gpStatus === 'covered' ? 'bg-green-100 text-green-800' :
                          gpStatus === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                          gpStatus === 'uncovered' ? 'bg-orange-100 text-orange-800' :
                          'bg-slate-100 text-slate-500'
                        }>
                          {gpStatus === 'covered' ? '✓ Has fuel prices' :
                           gpStatus === 'partial' ? '~ GP matched, no price data' :
                           gpStatus === 'uncovered' ? '✗ No GP match' :
                           '? Not tested'}
                        </Badge>
                        {cov?.fuelTypes?.length > 0 && (
                          <div className="text-xs text-slate-600">Fuel types: {cov.fuelTypes.join(', ')}</div>
                        )}
                        {cov?.updateTime && (
                          <div className="text-xs text-slate-400">Last seen: {new Date(cov.updateTime).toLocaleString()}</div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="space-y-2">
                        {!inScope ? (
                          <Button size="sm" className="w-full" onClick={() => addToScope(selectedStation.id)}>
                            <Plus className="w-4 h-4 mr-2" /> Add to GP fetch scope
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline" className="w-full" onClick={() => removeFromScope(selectedStation.id)}>
                            <Minus className="w-4 h-4 mr-2" /> Remove from fetch scope
                          </Button>
                        )}
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
                          onClick={() => expandSearchAroundStation(selectedStation)}
                        >
                          <ChevronRight className="w-4 h-4 mr-2" /> Expand search (2 km)
                        </Button>
                      </div>
                    </div>
                  );
                })()}
              </>
            )}

            {/* ── Area panel ── */}
            {sidebarMode === 'area' && (
              <>
                {!selectedArea ? (
                  <div className="text-sm text-slate-400 text-center pt-8">No area selected. Run a test first.</div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-bold text-sm">Area Test Result</h3>
                      <div className="text-xs text-slate-400">{new Date(selectedArea.testedAt).toLocaleString()}</div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <Card className="p-2 text-center">
                        <div className="text-lg font-bold">{selectedArea.totalStations}</div>
                        <div className="text-slate-500">Total</div>
                      </Card>
                      <Card className="p-2 text-center bg-green-50">
                        <div className="text-lg font-bold text-green-700">{selectedArea.gpFuelOptionsCount}</div>
                        <div className="text-slate-500">Covered</div>
                      </Card>
                      <Card className="p-2 text-center bg-yellow-50">
                        <div className="text-lg font-bold text-yellow-600">{selectedArea.gpPartialCount || 0}</div>
                        <div className="text-slate-500">Partial</div>
                      </Card>
                      <Card className="p-2 text-center bg-blue-50">
                        <div className="text-lg font-bold text-blue-600">{selectedArea.coveragePercent}%</div>
                        <div className="text-slate-500">Coverage</div>
                      </Card>
                    </div>

                    <div>
                      <Button
                        size="sm"
                        className="w-full mb-2"
                        onClick={() => {
                          const ids = selectedArea.stationResults.map(r => r.stationId);
                          setFetchScope(prev => new Set([...prev, ...ids]));
                          alert(`Added ${ids.length} stations to fetch scope.`);
                        }}
                      >
                        <Plus className="w-4 h-4 mr-2" /> Add all to fetch scope
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full"
                        onClick={() => setTestedAreas(prev => prev.filter(a => a.id !== selectedArea.id)) || setSelectedArea(null)}
                      >
                        <X className="w-4 h-4 mr-2" /> Remove area
                      </Button>
                    </div>

                    <div>
                      <h4 className="text-xs font-semibold text-slate-500 mb-2">Station results</h4>
                      <div className="space-y-1 max-h-48 overflow-y-auto">
                        {selectedArea.stationResults?.map(r => (
                          <div key={r.stationId} className="flex items-center justify-between text-xs p-1.5 rounded hover:bg-slate-50">
                            <span className="truncate flex-1 mr-2">{r.stationName}</span>
                            <span className={`shrink-0 px-1.5 py-0.5 rounded text-white text-xs ${
                              r.gpStatus === 'covered' ? 'bg-green-500' :
                              r.gpStatus === 'partial' ? 'bg-yellow-500' : 'bg-slate-400'
                            }`}>{r.gpStatus}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}