import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, MapPin, Fuel, AlertCircle, Check, X } from 'lucide-react';

// LEGEND: Marker icons for coverage states
const coveredIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const partialIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-yellow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const uncoveredIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const unscannedIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

function MapController({ onMapReady }) {
  const map = useMap();
  useEffect(() => {
    if (map) {
      map.setView([59.9139, 10.7522], 12);
      onMapReady?.();
    }
  }, [map, onMapReady]);
  return null;
}

export default function GooglePlacesCoverageMap() {
  const [stations, setStations] = useState([]);
  const [priceData, setPriceData] = useState({});
  const [coverageData, setCoverageData] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedStation, setSelectedStation] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [savedAreas, setSavedAreas] = useState([]);

  // Load stations and their existing price data on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const allStations = await base44.entities.Station.list();
        const filtered = allStations.filter(s => s.latitude && s.longitude);
        setStations(filtered);

        // Load FuelPrice data for each station
        const prices = {};
        for (const station of filtered) {
          try {
            const stationPrices = await base44.entities.FuelPrice.filter({ stationId: station.id });
            prices[station.id] = {
              count: stationPrices.length,
              recent: stationPrices.length > 0 ? stationPrices[0] : null,
              hasPrices: stationPrices.length > 0,
              fuelTypes: [...new Set(stationPrices.map(p => p.fuelType))],
              latestFetch: stationPrices.length > 0 ? stationPrices[0].fetchedAt : null,
            };
          } catch (error) {
            prices[station.id] = { count: 0, hasPrices: false, fuelTypes: [] };
          }
        }
        setPriceData(prices);
        setLoading(false);
      } catch (error) {
        console.error('Failed to load data:', error);
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Determine coverage status for a station
  const getCoverageStatus = (stationId) => {
    const data = coverageData[stationId];
    if (!data) return { status: 'not_tested', label: 'Not tested' };
    
    if (!data.gpMatch) return { status: 'uncovered', label: 'No GP match' };
    if (!data.hasFuelOptions) return { status: 'partial', label: 'Matched (no prices)' };
    return { status: 'covered', label: 'Covered (has prices)' };
  };

  // Check if station has existing price data from FuelPrice
  const hasExistingPrices = (stationId) => {
    return priceData[stationId]?.hasPrices || false;
  };

  const getMarkerIcon = (status) => {
    switch (status) {
      case 'covered': return coveredIcon;
      case 'partial': return partialIcon;
      case 'uncovered': return uncoveredIcon;
      default: return unscannedIcon;
    }
  };

  // Test GP coverage for a single station
  const testStationCoverage = async (station) => {
    setScanning(true);
    try {
      const response = await base44.functions.invoke('discoverGooglePlacesCoverageAroundStations', {
        latitude: station.latitude,
        longitude: station.longitude,
        radiusKm: 1,
        stationId: station.id,
      });

      const gpResult = response.data?.results?.[0];
      setCoverageData(prev => ({
        ...prev,
        [station.id]: {
          gpMatch: !!gpResult,
          gpName: gpResult?.name,
          distance: gpResult?.distance,
          hasFuelOptions: !!gpResult?.fuelOptions,
          fuelOptions: gpResult?.fuelOptions || [],
          businessStatus: gpResult?.businessStatus,
          updateTime: gpResult?.updateTime,
          matchConfidence: gpResult?.matchConfidence,
          testedAt: new Date().toISOString(),
        }
      }));
      setSelectedStation(station);
    } catch (error) {
      console.error('Coverage test failed:', error);
    } finally {
      setScanning(false);
    }
  };

  // Scan visible map area for coverage
  const scanVisibleArea = async (mapInstance) => {
    if (!mapInstance) return;

    const bounds = mapInstance.getBounds();
    const stationsInView = stations.filter(s => {
      const stationBounds = L.latLngBounds([[s.latitude, s.longitude]]);
      return bounds.intersects(stationBounds);
    });

    if (stationsInView.length === 0) {
      alert('No stations in visible area');
      return;
    }

    setScanning(true);
    for (const station of stationsInView) {
      try {
        const response = await base44.functions.invoke('discoverGooglePlacesCoverageAroundStations', {
          latitude: station.latitude,
          longitude: station.longitude,
          radiusKm: 1,
          stationId: station.id,
        });

        const gpResult = response.data?.results?.[0];
        setCoverageData(prev => ({
          ...prev,
          [station.id]: {
            gpMatch: !!gpResult,
            gpName: gpResult?.name,
            distance: gpResult?.distance,
            hasFuelOptions: !!gpResult?.fuelOptions,
            fuelOptions: gpResult?.fuelOptions || [],
            businessStatus: gpResult?.businessStatus,
            updateTime: gpResult?.updateTime,
            testedAt: new Date().toISOString(),
          }
        }));
      } catch (error) {
        console.error(`Coverage test failed for station ${station.id}:`, error);
      }
    }
    setScanning(false);
  };

  // Save coverage area
  const saveArea = () => {
    const newArea = {
      id: Date.now(),
      bounds: { north: 0, south: 0, east: 0, west: 0 },
      testedAt: new Date().toISOString(),
      stationsTested: Object.keys(coverageData).length,
      coverageStatus: determineCoverageStatus(),
    };
    setSavedAreas(prev => [...prev, newArea]);
  };

  const determineCoverageStatus = () => {
    const tested = Object.values(coverageData);
    if (tested.length === 0) return 'not_tested';
    
    const withPrices = tested.filter(d => d.hasFuelOptions).length;
    const rate = withPrices / tested.length;
    
    if (rate === 0) return 'tested_no_fuel_data';
    if (rate < 0.5) return 'partial_coverage';
    return 'good_coverage';
  };

  // Calculate stats
  const stats = {
    totalStations: stations.length,
    tested: Object.keys(coverageData).length,
    covered: Object.values(coverageData).filter(d => d.hasFuelOptions).length,
    partial: Object.values(coverageData).filter(d => d.gpMatch && !d.hasFuelOptions).length,
    uncovered: Object.values(coverageData).filter(d => !d.gpMatch).length,
  };

  const coveragePercent = stats.tested > 0 ? Math.round((stats.covered / stats.tested) * 100) : 0;

  if (loading) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-slate-600" />
      </div>
    );
  }

  return (
    <div className="w-full h-screen flex flex-col bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b p-4 shadow-sm">
        <h1 className="text-2xl font-bold mb-4">Google Places Price Coverage Map (ADMIN)</h1>
        <div className="grid grid-cols-6 gap-3 mb-4">
          <Card className="p-3">
            <div className="text-xs text-slate-600 mb-1">Total Stations</div>
            <div className="text-xl font-bold">{stats.totalStations}</div>
          </Card>
          <Card className="p-3">
            <div className="text-xs text-slate-600 mb-1">Tested</div>
            <div className="text-xl font-bold">{stats.tested}</div>
          </Card>
          <Card className="p-3 bg-green-50">
            <div className="text-xs text-green-700 mb-1 font-semibold">Covered</div>
            <div className="text-xl font-bold text-green-700">{stats.covered}</div>
          </Card>
          <Card className="p-3 bg-yellow-50">
            <div className="text-xs text-yellow-700 mb-1 font-semibold">Partial</div>
            <div className="text-xl font-bold text-yellow-700">{stats.partial}</div>
          </Card>
          <Card className="p-3 bg-red-50">
            <div className="text-xs text-red-700 mb-1 font-semibold">Uncovered</div>
            <div className="text-xl font-bold text-red-700">{stats.uncovered}</div>
          </Card>
          <Card className="p-3 bg-blue-50">
            <div className="text-xs text-blue-700 mb-1 font-semibold">Coverage %</div>
            <div className="text-xl font-bold text-blue-700">{coveragePercent}%</div>
          </Card>
        </div>

        {/* Legend */}
        <div className="flex gap-4 text-sm flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-4 h-6 bg-green-500 rounded"></div>
            <span>GP Covered (has prices)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-6 bg-yellow-500 rounded"></div>
            <span>GP Partial (matched, no prices)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-6 bg-red-500 rounded"></div>
            <span>GP Uncovered (no match)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-6 bg-blue-500 rounded"></div>
            <span>Not GP tested yet</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-6 bg-purple-500 rounded"></div>
            <span>★ Has existing prices</span>
          </div>
        </div>
      </div>

      {/* Map + Sidebar */}
      <div className="flex flex-1 gap-4 p-4 overflow-hidden">
        {/* Map */}
        <div className="flex-1 rounded-lg overflow-hidden shadow-md" style={{ minHeight: 0 }}>
          <MapContainer center={[59.9139, 10.7522]} zoom={12} style={{ height: '100%', width: '100%', minHeight: '100%' }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap contributors' />
            <MapController onMapReady={() => setMapReady(true)} />
            
            {/* Stations */}
            {mapReady && stations.map(station => {
              const status = getCoverageStatus(station.id).status;
              const icon = getMarkerIcon(status);
              const hasExisting = hasExistingPrices(station.id);
              return (
                <Marker
                  key={station.id}
                  position={[station.latitude, station.longitude]}
                  icon={icon}
                  onClick={() => setSelectedStation(station)}
                  title={hasExisting ? `${station.name} ★` : station.name}
                >
                  <Popup>
                    <div className="text-sm max-w-xs">
                      <strong>{station.name}</strong>
                      {hasExisting && <span className="ml-1 text-purple-600 font-bold">★</span>}
                      <div className="text-xs text-slate-600 mt-1">{station.chain || 'Unknown'}</div>
                      {hasExisting && (
                        <div className="text-xs bg-purple-50 p-1 rounded mt-1 border border-purple-200">
                          Has {priceData[station.id].count} existing prices
                        </div>
                      )}
                      <Button
                        onClick={() => testStationCoverage(station)}
                        size="sm"
                        className="mt-2 w-full"
                        disabled={scanning}
                      >
                        {scanning ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <MapPin className="w-3 h-3 mr-1" />}
                        Test GP Coverage
                      </Button>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        </div>

        {/* Sidebar */}
        <div className="w-80 bg-white rounded-lg shadow-md flex flex-col overflow-hidden border">
          <div className="bg-slate-100 p-4 border-b">
            <h2 className="font-semibold text-slate-900">Coverage Analysis</h2>
            <div className="mt-2 space-y-2">
              <Button
                onClick={() => {
                  const mapElement = document.querySelector('.leaflet-container');
                  if (mapElement && mapElement.__reactFiber) {
                    const fiberNode = mapElement.__reactFiber;
                    const map = window.map || L.map(mapElement);
                    scanVisibleArea(map);
                  }
                }}
                className="w-full text-xs"
                disabled={scanning}
              >
                {scanning ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Fuel className="w-3 h-3 mr-1" />}
                Scan Visible Area
              </Button>
              <Button
                onClick={saveArea}
                variant="outline"
                className="w-full text-xs"
              >
                Save Area
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {selectedStation && (
              <>
                <Card className={`p-3 border-2 ${hasExistingPrices(selectedStation.id) ? 'bg-purple-50 border-purple-200' : 'bg-blue-50 border-blue-200'}`}>
                  <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                    {selectedStation.name}
                    {hasExistingPrices(selectedStation.id) && <span className="text-purple-600 text-lg">★</span>}
                  </h3>
                  <div className="text-xs text-slate-600 space-y-1">
                    <div>Chain: {selectedStation.chain || 'Unknown'}</div>
                    <div>Type: {selectedStation.stationType}</div>
                    <div>Lat/Lng: {selectedStation.latitude.toFixed(4)}, {selectedStation.longitude.toFixed(4)}</div>
                  </div>

                  {hasExistingPrices(selectedStation.id) && (
                    <div className="mt-3 pt-3 border-t border-purple-200">
                      <div className="font-semibold text-sm text-purple-900 mb-2">✓ Existing Prices</div>
                      <div className="text-xs space-y-1">
                        <div>Count: {priceData[selectedStation.id].count} records</div>
                        <div>Fuel types: {priceData[selectedStation.id].fuelTypes.join(', ') || 'None'}</div>
                        {priceData[selectedStation.id].latestFetch && (
                          <div>Latest: {new Date(priceData[selectedStation.id].latestFetch).toLocaleDateString()}</div>
                        )}
                      </div>
                    </div>
                  )}
                </Card>

                {coverageData[selectedStation.id] ? (
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm flex items-center gap-2">
                      <Fuel className="w-4 h-4" />
                      Google Places Result
                    </h4>
                    
                    <Card className="p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold">GP Match</span>
                        {coverageData[selectedStation.id].gpMatch ? (
                          <Check className="w-4 h-4 text-green-600" />
                        ) : (
                          <X className="w-4 h-4 text-red-600" />
                        )}
                      </div>

                      {coverageData[selectedStation.id].gpMatch && (
                        <>
                          <div className="text-xs border-t pt-2">
                            <div className="font-semibold text-slate-900">{coverageData[selectedStation.id].gpName}</div>
                            <div className="text-slate-600 mt-1">
                              Distance: {coverageData[selectedStation.id].distance?.toFixed(2)} km
                            </div>
                          </div>

                          <div className="flex items-center justify-between border-t pt-2">
                            <span className="text-xs font-semibold">Has fuelOptions</span>
                            {coverageData[selectedStation.id].hasFuelOptions ? (
                              <Badge className="bg-green-100 text-green-800 text-xs">Yes</Badge>
                            ) : (
                              <Badge className="bg-yellow-100 text-yellow-800 text-xs">No</Badge>
                            )}
                          </div>

                          {coverageData[selectedStation.id].hasFuelOptions && (
                            <div className="border-t pt-2">
                              <div className="text-xs font-semibold mb-1">Fuel Types Available:</div>
                              <div className="flex flex-wrap gap-1">
                                {coverageData[selectedStation.id].fuelOptions.map((fuelType, idx) => (
                                  <Badge key={idx} variant="outline" className="text-xs">
                                    {fuelType}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          {coverageData[selectedStation.id].updateTime && (
                            <div className="border-t pt-2 text-xs text-slate-600">
                              Last Update: {new Date(coverageData[selectedStation.id].updateTime).toLocaleDateString()}
                            </div>
                          )}
                        </>
                      )}

                      {!coverageData[selectedStation.id].gpMatch && (
                        <div className="border-t pt-2 text-xs text-slate-600">
                          No nearby Google Places result found within 1km radius.
                        </div>
                      )}
                    </Card>

                    <Button
                      onClick={() => testStationCoverage(selectedStation)}
                      disabled={scanning}
                      className="w-full text-xs"
                    >
                      {scanning ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <MapPin className="w-3 h-3 mr-1" />}
                      Re-Test Coverage
                    </Button>
                  </div>
                ) : (
                  <div className="text-sm text-slate-600 text-center py-6">
                    No coverage data yet. Click "Test Coverage" to scan.
                  </div>
                )}
              </>
            )}

            {!selectedStation && (
              <div className="text-sm text-slate-600 text-center py-8">
                Click a marker on the map or use "Scan Visible Area" to test coverage.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}