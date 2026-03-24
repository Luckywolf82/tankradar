import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, MapPin, Search, AlertCircle } from 'lucide-react';

// Marker icons
const stationIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const matchedIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const unmatchedIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

function MapController() {
  const map = useMap();
  useEffect(() => {
    // Center on Oslo by default
    map.setView([59.9139, 10.7522], 12);
  }, [map]);
  return null;
}

export default function CoverageMapExplorer() {
  const [stations, setStations] = useState([]);
  const [searchResults, setSearchResults] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedStation, setSelectedStation] = useState(null);
  const [searchRadius, setSearchRadius] = useState(2);
  const [mapBounds, setMapBounds] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(null);

  // Load stations
  useEffect(() => {
    const loadStations = async () => {
      try {
        const allStations = await base44.entities.Station.list();
        setStations(allStations);
        setLoading(false);
      } catch (error) {
        console.error('Failed to load stations:', error);
        setLoading(false);
      }
    };
    loadStations();
  }, []);

  // Search around a single station
  const searchAroundStation = async (station) => {
    setScanning(true);
    try {
      const response = await base44.functions.invoke('discoverGooglePlacesCoverageAroundStations', {
        latitude: station.latitude,
        longitude: station.longitude,
        radiusKm: searchRadius,
        stationId: station.id,
      });

      setSearchResults(prev => ({
        ...prev,
        [station.id]: response.data,
      }));
      setSelectedStation(station);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setScanning(false);
    }
  };

  // Scan visible area
  const scanVisibleArea = async (mapInstance) => {
    if (!mapInstance) return;

    const bounds = mapInstance.getBounds();
    const center = bounds.getCenter();
    const stationsInView = stations.filter(s => {
      const stationBounds = L.latLngBounds([[s.latitude, s.longitude]]);
      return bounds.intersects(stationBounds);
    });

    if (stationsInView.length === 0) {
      alert('Ingen stasjoner i synlig område');
      return;
    }

    setScanning(true);
    setScanProgress(0);

    for (let i = 0; i < stationsInView.length; i++) {
      const station = stationsInView[i];
      try {
        const response = await base44.functions.invoke('discoverGooglePlacesCoverageAroundStations', {
          latitude: station.latitude,
          longitude: station.longitude,
          radiusKm: searchRadius,
          stationId: station.id,
        });

        setSearchResults(prev => ({
          ...prev,
          [station.id]: response.data,
        }));

        setScanProgress(Math.round(((i + 1) / stationsInView.length) * 100));
      } catch (error) {
        console.error(`Search failed for station ${station.id}:`, error);
      }
    }

    setScanning(false);
    setScanProgress(null);
  };

  const stats = {
    total: stations.length,
    withCoverage: Object.keys(searchResults).filter(id => {
      const result = searchResults[id];
      return result.results && result.results.some(r => r.matchedStationId);
    }).length,
    withGaps: Object.keys(searchResults).filter(id => {
      const result = searchResults[id];
      return result.results && result.results.some(r => !r.matchedStationId);
    }).length,
  };

  if (loading) {
    return (
      <div className="w-full h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full h-screen flex flex-col bg-slate-50">
      <div className="bg-white border-b p-4 shadow-sm">
        <h1 className="text-2xl font-bold mb-4">Google Places Coverage Explorer</h1>
        <div className="grid grid-cols-4 gap-4 mb-4">
          <Card className="p-4">
            <div className="text-sm text-slate-600">Total Stations</div>
            <div className="text-2xl font-bold">{stats.total}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-slate-600">With GP Match</div>
            <div className="text-2xl font-bold text-green-600">{stats.withCoverage}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-slate-600">Coverage Gaps Found</div>
            <div className="text-2xl font-bold text-orange-600">{stats.withGaps}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-slate-600">Search Radius</div>
            <Input
              type="number"
              value={searchRadius}
              onChange={(e) => setSearchRadius(parseFloat(e.target.value) || 2)}
              step="0.5"
              min="0.5"
              max="5"
              className="mt-1"
            />
          </Card>
        </div>
      </div>

      <div className="flex flex-1 gap-4 p-4 overflow-hidden">
        {/* Map */}
        <div className="flex-1 rounded-lg overflow-hidden shadow-md">
          <MapContainer center={[59.9139, 10.7522]} zoom={12} style={{ height: '100%', width: '100%' }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <MapController />
            
            {/* Render all stations */}
            {stations.map(station => {
              const stationResults = searchResults[station.id];
              const hasMatch = stationResults?.results?.some(r => r.matchedStationId);
              const hasGaps = stationResults?.results?.some(r => !r.matchedStationId);
              
              let icon = stationIcon;
              if (stationResults) {
                icon = hasMatch && !hasGaps ? matchedIcon : unmatchedIcon;
              }

              return (
                <Marker
                  key={station.id}
                  position={[station.latitude, station.longitude]}
                  icon={icon}
                  onClick={() => setSelectedStation(station)}
                >
                  <Popup>
                    <div className="text-sm">
                      <strong>{station.name}</strong>
                      <div className="text-xs text-slate-600 mt-1">{station.chain || 'Unknown chain'}</div>
                      <Button
                        onClick={() => searchAroundStation(station)}
                        size="sm"
                        className="mt-2 w-full"
                        disabled={scanning}
                      >
                        {scanning ? <Loader2 className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}
                        Search GP
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
            {scanning && scanProgress !== null && (
              <div className="mt-2 text-sm text-slate-600">
                Scanning... {scanProgress}%
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {selectedStation && (
              <>
                <Card className="p-3 bg-blue-50 border-blue-200">
                  <h3 className="font-semibold text-sm mb-2">{selectedStation.name}</h3>
                  <div className="text-xs text-slate-600 space-y-1">
                    <div>Chain: {selectedStation.chain || 'Unknown'}</div>
                    <div>Coords: {selectedStation.latitude.toFixed(4)}, {selectedStation.longitude.toFixed(4)}</div>
                  </div>
                </Card>

                {searchResults[selectedStation.id] && (
                  <div>
                    <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      GP Findings ({searchResults[selectedStation.id].results.length})
                    </h4>
                    
                    <div className="space-y-2">
                      {searchResults[selectedStation.id].results.map((result, idx) => (
                        <Card key={idx} className="p-2 text-xs bg-slate-50">
                          <div className="font-semibold text-slate-900">{result.name}</div>
                          <div className="text-slate-600 text-[11px] mt-1">{result.address}</div>
                          
                          <div className="mt-2 flex items-center gap-2">
                            {result.matchedStationId ? (
                              <Badge className="bg-green-100 text-green-800">Matched</Badge>
                            ) : (
                              <Badge className="bg-orange-100 text-orange-800">Uncovered</Badge>
                            )}
                            <span className="text-slate-600">{result.distance}km</span>
                          </div>

                          {result.matchedStationId && (
                            <div className="mt-2 text-slate-600 text-[10px]">
                              Match: {result.matchedStationName} ({result.matchConfidence})
                            </div>
                          )}
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                <Button
                  onClick={() => searchAroundStation(selectedStation)}
                  disabled={scanning}
                  className="w-full"
                >
                  {scanning ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Search className="w-4 h-4 mr-2" />}
                  Search GP Around This Station
                </Button>
              </>
            )}

            {!selectedStation && (
              <div className="text-sm text-slate-600 text-center py-8">
                Click a marker on the map to analyze coverage
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}