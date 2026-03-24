import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Rectangle, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Zap, Grid3x3, MapPin, Save, Trash2, Eye, EyeOff } from 'lucide-react';

// Icons
const coveredIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  iconSize: [22, 36],
  iconAnchor: [11, 36],
});

const partialIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-yellow.png',
  iconSize: [22, 36],
  iconAnchor: [11, 36],
});

const uncoveredIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  iconSize: [22, 36],
  iconAnchor: [11, 36],
});

const unscannedIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  iconSize: [22, 36],
  iconAnchor: [11, 36],
});

function MapController({ mapRef, onMapReady }) {
  const map = useMap();
  useEffect(() => {
    if (map) {
      mapRef.current = map;
      map.setView([59.9139, 10.7522], 12);
      onMapReady?.();
    }
  }, [map, mapRef, onMapReady]);
  return null;
}

export default function CoverageMapExplorer() {
  const mapRef = useRef(null);
  const [stations, setStations] = useState([]);
  const [testedAreas, setTestedAreas] = useState([]);
  const [savedAreas, setSavedAreas] = useState([]);
  const [selectedArea, setSelectedArea] = useState(null);
  const [selectedStation, setSelectedStation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [testRadius, setTestRadius] = useState(1);
  const [fetchingPrices, setFetchingPrices] = useState(false);
  const [disabledAreas, setDisabledAreas] = useState({});
  
  // Layer visibility toggles
  const [showLayers, setShowLayers] = useState({
    stations: true,
    coveredStations: true,
    partialStations: true,
    uncoveredStations: true,
    testedAreas: true,
    savedAreas: true,
  });

  // Load stations + restore saved areas from localStorage
  useEffect(() => {
    const loadStations = async () => {
      try {
        const allStations = await base44.entities.Station.list();
        const filtered = allStations.filter(s => s.latitude && s.longitude);
        setStations(filtered);
        
        // Restore areas from localStorage
        const savedTestedAreas = localStorage.getItem('gp-tested-areas');
        const savedSavedAreas = localStorage.getItem('gp-saved-areas');
        if (savedTestedAreas) setTestedAreas(JSON.parse(savedTestedAreas));
        if (savedSavedAreas) setSavedAreas(JSON.parse(savedSavedAreas));
        
        setLoading(false);
      } catch (error) {
        console.error('Failed to load stations:', error);
        setLoading(false);
      }
    };
    loadStations();
  }, []);

  // Persist areas to localStorage
  useEffect(() => {
    localStorage.setItem('gp-tested-areas', JSON.stringify(testedAreas));
  }, [testedAreas]);

  useEffect(() => {
    localStorage.setItem('gp-saved-areas', JSON.stringify(savedAreas));
  }, [savedAreas]);

  // Get coverage status for a station
  const getStationCoverage = (stationId) => {
    for (const area of testedAreas) {
      const station = area.stationResults?.find(s => s.stationId === stationId);
      if (station) {
        if (station.hasFuelOptions) return 'covered';
        if (station.gpMatched) return 'partial';
        return 'uncovered';
      }
    }
    return 'not_tested';
  };

  // Get marker icon for station
  const getStationIcon = (status) => {
    switch (status) {
      case 'covered': return coveredIcon;
      case 'partial': return partialIcon;
      case 'uncovered': return uncoveredIcon;
      default: return unscannedIcon;
    }
  };

  // Determine area coverage status
  const getAreaStatus = (area) => {
    if (area.totalStations === 0) return 'not_tested';
    const rate = area.gpFuelOptionsCount / area.totalStations;
    if (rate === 0) return 'tested_no_fuel_data';
    if (rate < 0.5) return 'partial_coverage';
    return 'good_coverage';
  };

  // Get area color based on coverage
  const getAreaColor = (area) => {
    const status = getAreaStatus(area);
    switch (status) {
      case 'good_coverage': return '#22c55e';
      case 'partial_coverage': return '#eab308';
      case 'tested_no_fuel_data': return '#ef4444';
      default: return '#94a3b8';
    }
  };

  // Test visible area
  const testVisibleArea = async () => {
    if (!mapRef.current) return;
    
    setScanning(true);
    const bounds = mapRef.current.getBounds();
    const center = bounds.getCenter();
    
    const visibleStations = stations.filter(s => 
      bounds.contains([s.latitude, s.longitude])
    );

    if (visibleStations.length === 0) {
      setScanning(false);
      return;
    }

    try {
      // Batch test GP coverage
      await base44.functions.invoke('batchTestGooglePlacesCoverage', {
        limit: visibleStations.length,
        offset: 0,
      });

      // Load GP candidates to map results back to stations
      const gpCandidates = await base44.entities.StationCandidate.filter({ 
        sourceName: 'GooglePlaces'
      });

      const stationResults = visibleStations.map(station => {
        const match = gpCandidates.find(c => 
          c.matchCandidates?.includes(station.id)
        );
        return {
          stationId: station.id,
          stationName: station.name,
          gpMatched: !!match,
          hasFuelOptions: match?.proposedChain ? true : false,
          fuelTypes: match?.proposedChain ? ['unknown'] : [],
          updateTime: null,
          distance: 0,
        };
      });

      const newArea = {
        id: Date.now().toString(),
        center: { lat: center.lat, lng: center.lng },
        bounds: {
          north: bounds.getNorth(),
          south: bounds.getSouth(),
          east: bounds.getEast(),
          west: bounds.getWest(),
        },
        testedAt: new Date().toISOString(),
        totalStations: visibleStations.length,
        gpMatchedCount: stationResults.filter(r => r.gpMatched).length,
        gpFuelOptionsCount: stationResults.filter(r => r.hasFuelOptions).length,
        coveragePercent: Math.round((stationResults.filter(r => r.hasFuelOptions).length / visibleStations.length) * 100),
        fuelTypesObserved: [...new Set(stationResults.flatMap(r => r.fuelTypes))],
        latestUpdateTime: null,
        stationResults,
        status: 'tested',
      };

      setTestedAreas(prev => [...prev, newArea]);
      setSelectedArea(newArea);
    } catch (error) {
      console.error('Test failed:', error);
    } finally {
      setScanning(false);
    }
  };

  // Test clicked area with radius
  const testClickedArea = async (e) => {
    const { lat, lng } = e.latlng;
    setScanning(true);

    try {
      const radiusStations = stations.filter(s => {
        const distance = L.latLng(lat, lng).distanceTo([s.latitude, s.longitude]) / 1000;
        return distance <= testRadius;
      });

      if (radiusStations.length === 0) {
        setScanning(false);
        return;
      }

      // Batch test
      await base44.functions.invoke('batchTestGooglePlacesCoverage', {
        limit: radiusStations.length,
        offset: 0,
      });

      const gpCandidates = await base44.entities.StationCandidate.filter({ 
        sourceName: 'GooglePlaces'
      });

      const stationResults = radiusStations.map(station => {
        const match = gpCandidates.find(c => 
          c.matchCandidates?.includes(station.id)
        );
        return {
          stationId: station.id,
          stationName: station.name,
          gpMatched: !!match,
          hasFuelOptions: match?.proposedChain ? true : false,
          fuelTypes: [],
          updateTime: null,
          distance: L.latLng(lat, lng).distanceTo([station.latitude, station.longitude]) / 1000,
        };
      });

      const newArea = {
        id: Date.now().toString(),
        center: { lat, lng },
        bounds: {
          north: lat + (testRadius / 111),
          south: lat - (testRadius / 111),
          east: lng + (testRadius / 111),
          west: lng - (testRadius / 111),
        },
        testedAt: new Date().toISOString(),
        totalStations: radiusStations.length,
        gpMatchedCount: stationResults.filter(r => r.gpMatched).length,
        gpFuelOptionsCount: stationResults.filter(r => r.hasFuelOptions).length,
        coveragePercent: Math.round((stationResults.filter(r => r.hasFuelOptions).length / radiusStations.length) * 100),
        fuelTypesObserved: [],
        latestUpdateTime: null,
        radiusKm: testRadius,
        stationResults,
        status: 'tested',
      };

      setTestedAreas(prev => [...prev, newArea]);
      setSelectedArea(newArea);
    } catch (error) {
      console.error('Radius test failed:', error);
    } finally {
      setScanning(false);
    }
  };

  // Grid scan visible area
  const gridScanVisibleArea = async () => {
    if (!mapRef.current) return;
    setScanning(true);

    try {
      const bounds = mapRef.current.getBounds();
      const gridSize = 0.1; // degrees
      
      for (let lat = bounds.getSouth(); lat <= bounds.getNorth(); lat += gridSize) {
        for (let lng = bounds.getWest(); lng <= bounds.getEast(); lng += gridSize) {
          const gridStations = stations.filter(s => {
            const distance = L.latLng(lat, lng).distanceTo([s.latitude, s.longitude]) / 1000;
            return distance <= 0.5;
          });

          if (gridStations.length > 0) {
            await base44.functions.invoke('batchTestGooglePlacesCoverage', {
              limit: gridStations.length,
              offset: 0,
            });
          }
        }
      }

      // Reload areas
      testVisibleArea();
    } catch (error) {
      console.error('Grid scan failed:', error);
    } finally {
      setScanning(false);
    }
  };

  // Toggle area disabled status
  const toggleAreaDisabled = (areaId) => {
    setDisabledAreas(prev => ({
      ...prev,
      [areaId]: !prev[areaId]
    }));
  };

  // Save area for launch (only active areas)
  const saveArea = (area) => {
    if (disabledAreas[area.id]) {
      alert('Cannot save disabled area. Enable it first.');
      return;
    }
    const saved = {
      ...area,
      savedAt: new Date().toISOString(),
      status: 'saved_for_launch',
    };
    setSavedAreas(prev => [...prev, saved]);
    setTestedAreas(prev => prev.filter(a => a.id !== area.id));
    setSelectedArea(null);
  };

  // Delete tested area
  const deleteArea = (areaId) => {
    setTestedAreas(prev => prev.filter(a => a.id !== areaId));
    setDisabledAreas(prev => {
      const newDisabled = { ...prev };
      delete newDisabled[areaId];
      return newDisabled;
    });
    if (selectedArea?.id === areaId) setSelectedArea(null);
  };

  // Delete saved area
  const deleteSavedArea = (areaId) => {
    setSavedAreas(prev => prev.filter(a => a.id !== areaId));
    if (selectedArea?.id === areaId) setSelectedArea(null);
  };

  // Fetch live GP prices for area
  const fetchLiveGPPrices = async () => {
    if (!selectedArea?.stationResults) return;
    
    setFetchingPrices(true);
    try {
      const stationIds = selectedArea.stationResults.map(s => s.stationId);
      const response = await base44.functions.invoke('fetchLiveGPPricesForArea', {
        stationIds,
      });
      
      // Show result
      alert(`Fetched GP prices:\n✓ ${response.data.summary.fetched} stations\n✗ ${response.data.summary.failed} failed\nCreated: ${response.data.summary.pricesCreated} price records`);
    } catch (error) {
      console.error('Failed to fetch prices:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setFetchingPrices(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-slate-600" />
      </div>
    );
  }

  const allAreas = [...testedAreas, ...savedAreas];
  const stats = {
    totalStations: stations.length,
    areasTestedOrSaved: allAreas.length,
    goodCoverage: allAreas.filter(a => getAreaStatus(a) === 'good_coverage').length,
    savedAreas: savedAreas.length,
  };

  return (
    <div className="w-full h-screen flex flex-col bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b p-4 shadow-sm">
        <h1 className="text-2xl font-bold mb-3">Google Places Price Coverage Mapper</h1>
        
        <div className="grid grid-cols-5 gap-3 mb-4">
          <Card className="p-3">
            <div className="text-xs text-slate-600">Total Stations</div>
            <div className="text-lg font-bold">{stats.totalStations}</div>
          </Card>
          <Card className="p-3">
            <div className="text-xs text-slate-600">Areas Tested</div>
            <div className="text-lg font-bold">{stats.areasTestedOrSaved}</div>
          </Card>
          <Card className="p-3 bg-green-50">
            <div className="text-xs text-green-700 font-semibold">Good Coverage</div>
            <div className="text-lg font-bold text-green-700">{stats.goodCoverage}</div>
          </Card>
          <Card className="p-3 bg-blue-50">
            <div className="text-xs text-blue-700 font-semibold">Ready for Launch</div>
            <div className="text-lg font-bold text-blue-700">{stats.savedAreas}</div>
          </Card>
          <Card className="p-3">
            <div className="text-xs text-slate-600 mb-1">Test Radius</div>
            <input
              type="number"
              value={testRadius}
              onChange={(e) => setTestRadius(Math.max(0.1, parseFloat(e.target.value) || 1))}
              min="0.1"
              max="5"
              step="0.1"
              className="w-full px-2 py-1 border rounded text-sm"
            />
          </Card>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 flex-wrap">
          <Button onClick={testVisibleArea} disabled={scanning} size="sm">
            <Zap className="w-4 h-4 mr-2" />
            Test Visible Area
          </Button>
          <Button onClick={gridScanVisibleArea} disabled={scanning} size="sm" variant="outline">
            <Grid3x3 className="w-4 h-4 mr-2" />
            Grid Scan Area
          </Button>
          <Button onClick={() => mapRef.current?.on('click', testClickedArea)} disabled={scanning} size="sm" variant="outline">
            <MapPin className="w-4 h-4 mr-2" />
            Click to Test
          </Button>
          {scanning && <span className="text-xs text-slate-600 flex items-center"><Loader2 className="w-4 h-4 animate-spin mr-2" />Testing...</span>}
        </div>
      </div>

      {/* Map + Sidebar */}
      <div className="flex flex-1 gap-4 p-4 overflow-hidden">
        {/* Map */}
        <div className="flex-1 rounded-lg overflow-hidden shadow-md" style={{ minHeight: 0 }}>
          <MapContainer center={[59.9139, 10.7522]} zoom={12} style={{ height: '100%', width: '100%' }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
            <MapController mapRef={mapRef} onMapReady={() => setMapReady(true)} />

            {/* Tested areas */}
            {mapReady && showLayers.testedAreas && testedAreas.map(area => (
              <Rectangle
                key={`tested-${area.id}`}
                bounds={[
                  [area.bounds.south, area.bounds.west],
                  [area.bounds.north, area.bounds.east],
                ]}
                color={getAreaColor(area)}
                weight={2}
                opacity={0.5}
                fillOpacity={0.1}
                onClick={() => setSelectedArea(area)}
              />
            ))}

            {/* Saved areas */}
            {mapReady && showLayers.savedAreas && savedAreas.map(area => (
              <Rectangle
                key={`saved-${area.id}`}
                bounds={[
                  [area.bounds.south, area.bounds.west],
                  [area.bounds.north, area.bounds.east],
                ]}
                color="#2563eb"
                weight={3}
                opacity={0.7}
                fillOpacity={0.15}
                onClick={() => setSelectedArea(area)}
              />
            ))}

            {/* Stations */}
            {mapReady && showLayers.stations && stations.map(station => {
              const coverage = getStationCoverage(station.id);
              const show = (
                (coverage === 'covered' && showLayers.coveredStations) ||
                (coverage === 'partial' && showLayers.partialStations) ||
                (coverage === 'uncovered' && showLayers.uncoveredStations)
              );

              if (!show) return null;

              return (
                <Marker
                  key={station.id}
                  position={[station.latitude, station.longitude]}
                  icon={getStationIcon(coverage)}
                  onClick={() => setSelectedStation(station)}
                >
                  <Popup>
                    <div className="text-xs">
                      <strong>{station.name}</strong>
                      <div className="text-slate-600">{station.chain || 'Unknown'}</div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        </div>

        {/* Sidebar */}
        <div className="w-72 bg-white rounded-lg shadow-md flex flex-col border overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b">
            <button
              onClick={() => setSelectedArea(null)}
              className={`flex-1 py-2 text-xs font-semibold ${!selectedArea ? 'bg-slate-100 border-b-2 border-blue-600' : ''}`}
            >
              Layer Controls
            </button>
            {selectedArea && (
              <button
                onClick={() => {}}
                className="flex-1 py-2 text-xs font-semibold bg-slate-100 border-b-2 border-blue-600"
              >
                Area / Station
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {!selectedArea ? (
              <>
                {/* Layer toggles */}
                <div>
                  <h3 className="font-semibold text-sm mb-2">Layers</h3>
                  <div className="space-y-2">
                    {Object.entries(showLayers).map(([key, value]) => (
                      <div key={key} className="flex items-center gap-2">
                        <Checkbox
                          checked={value}
                          onChange={(e) => setShowLayers(prev => ({ ...prev, [key]: e.target.checked }))}
                        />
                        <label className="text-xs text-slate-700 cursor-pointer flex-1">
                          {key.replace(/([A-Z])/g, ' $1').trim()}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tested areas list */}
                {testedAreas.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-sm mb-2">Tested Areas ({testedAreas.length})</h3>
                    <div className="space-y-2">
                      {testedAreas.map(area => (
                        <Card
                          key={area.id}
                          className="p-2 cursor-pointer hover:bg-slate-50"
                          onClick={() => setSelectedArea(area)}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <div
                              className="w-3 h-3 rounded"
                              style={{ backgroundColor: getAreaColor(area) }}
                            />
                            <span className="text-xs font-semibold">
                              {area.coveragePercent}% coverage
                            </span>
                          </div>
                          <div className="text-xs text-slate-600">
                            {area.gpFuelOptionsCount}/{area.totalStations} with prices
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {/* Saved areas list */}
                {savedAreas.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-sm mb-2">Saved for Launch ({savedAreas.length})</h3>
                    <div className="space-y-2">
                      {savedAreas.map(area => (
                        <Card
                          key={area.id}
                          className="p-2 bg-blue-50 cursor-pointer hover:bg-blue-100"
                          onClick={() => setSelectedArea(area)}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-semibold text-blue-900">
                              {area.coveragePercent}% coverage
                            </span>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteSavedArea(area.id);
                              }}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                {/* Area details */}
                <div>
                  <h3 className="font-semibold text-sm mb-2">
                    {selectedArea.status === 'saved_for_launch' ? 'Saved Area' : 'Tested Area'}
                  </h3>
                  <div className="space-y-2 text-xs text-slate-700">
                    <div>Total stations: <span className="font-semibold">{selectedArea.totalStations}</span></div>
                    <div>GP matched: <span className="font-semibold">{selectedArea.gpMatchedCount}</span></div>
                    <div>With fuel prices: <span className="font-semibold text-green-700">{selectedArea.gpFuelOptionsCount}</span></div>
                    <div>Coverage: <span className="font-semibold">{selectedArea.coveragePercent}%</span></div>
                    <div>Tested: <span className="font-semibold">{new Date(selectedArea.testedAt).toLocaleDateString()}</span></div>
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-2">
                  <Button
                    onClick={fetchLiveGPPrices}
                    disabled={fetchingPrices}
                    size="sm"
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    {fetchingPrices ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Fetching...
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4 mr-2" />
                        Fetch Live GP Prices
                      </>
                    )}
                  </Button>

                  {selectedArea.status !== 'saved_for_launch' && (
                    <>
                      <Button
                        onClick={() => saveArea(selectedArea)}
                        size="sm"
                        className="w-full"
                      >
                        <Save className="w-4 h-4 mr-2" />
                        Save for Launch
                      </Button>
                      <Button
                        onClick={() => deleteArea(selectedArea.id)}
                        size="sm"
                        variant="outline"
                        className="w-full"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </Button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}