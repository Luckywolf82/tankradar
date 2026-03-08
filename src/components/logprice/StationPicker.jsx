import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, MapPin, Navigation } from "lucide-react";

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function StationPicker({ onSelectStation, onSkip }) {
  const [loading, setLoading] = useState(true);
  const [errorType, setErrorType] = useState(null); // 'permission_denied', 'timeout_or_unavailable', 'no_stations_found'
  const [stations, setStations] = useState([]);
  const [userLocation, setUserLocation] = useState(null);

  const loadNearbyStations = async () => {
    try {
      setLoading(true);
      setErrorType(null);

      // Get user location with detailed error handling
      const pos = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve,
          (error) => reject(error),
          { timeout: 8000 }
        );
      });

      const { latitude, longitude } = pos.coords;
      setUserLocation({ latitude, longitude });
      console.log(`[StationPicker] Location obtained: lat=${latitude.toFixed(4)}, lon=${longitude.toFixed(4)}`);

      // Fetch all Station catalog entries
      const allStations = await base44.entities.Station.list();
      console.log(`[StationPicker] Total stations in catalog: ${allStations.length}`);

      // Fetch Google Places results (read-only discovery for picker display only)
      let googlePlacesResults = [];
      try {
        const gpRes = await base44.functions.invoke('discoverGooglePlacesCandidatesForPicker', {
          latitude,
          longitude,
          radiusMeters: 10000
        });
        if (gpRes.data?.results) {
          googlePlacesResults = gpRes.data.results.map(gp => ({
            ...gp,
            _source: 'google_places',
            _stationType: gp.business_type || 'gas_station'
          }));
          console.log(`[StationPicker] Google Places candidates found: ${googlePlacesResults.length}`);
        }
      } catch (gpErr) {
        console.warn(`[StationPicker] Google Places fetch failed (non-critical): ${gpErr.message}`);
        // Continue with Station-only results
      }

      // Merge and tag results: Station catalog entries get id, GP results get place_id
      const catalogWithTag = allStations.map(s => ({
        ...s,
        _source: 'station_catalog',
        _stationType: s.stationType || 'standard'
      }));
      
      const allCandidates = [...catalogWithTag, ...googlePlacesResults];

      // Calculate distance and filter to nearby (10km radius)
      const nearbyWithDistance = allCandidates
        .map(s => ({
          ...s,
          distance: calculateDistance(latitude, longitude, s.latitude || 0, s.longitude || 0)
        }))
        .filter(s => s.distance <= 10)
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 15);

      console.log(`[StationPicker] Combined results within 10km radius: ${nearbyWithDistance.length}`);
      setStations(nearbyWithDistance);

      if (nearbyWithDistance.length === 0) {
        console.log(`[StationPicker] No stations found within radius - showing no_stations_found state`);
        setErrorType("no_stations_found");
      }
    } catch (err) {
      // Classify geolocation error
      let classifiedError = "location_error_unknown";
      
      if (err.code === 1) {
        classifiedError = "permission_denied";
        console.error(`[StationPicker] Geolocation error: PERMISSION_DENIED - User denied location access`);
      } else if (err.code === 2) {
        classifiedError = "timeout_or_unavailable";
        console.error(`[StationPicker] Geolocation error: POSITION_UNAVAILABLE - GPS signal or network issue`);
      } else if (err.code === 3) {
        classifiedError = "timeout_or_unavailable";
        console.error(`[StationPicker] Geolocation error: TIMEOUT - Took longer than 8 seconds`);
      } else {
        console.error(`[StationPicker] Geolocation error: UNKNOWN - ${err.message}`, err);
      }

      setErrorType(classifiedError);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNearbyStations();
  }, []);

  const handleSelectStation = (station) => {
    // Store GPS for later matching
    window.__gpsLat = userLocation.latitude;
    window.__gpsLon = userLocation.longitude;

    // If station came from Google Places, include place_id; otherwise null
    const isFromGooglePlaces = station._source === 'google_places';
    const googlePlaceId = isFromGooglePlaces ? (station.place_id || null) : null;

    onSelectStation({
      station_id: station.id || null, // null if from Google Places (no Station.id yet)
      station_name: station.name || "",
      station_chain: station.chain || station.business_type || "",
      city: station.city || (station.formatted_address ? station.formatted_address.split(',')[0] : ""),
      region: station.region || null,
      latitude: station.latitude || userLocation.latitude,
      longitude: station.longitude || userLocation.longitude,
      google_place_id: googlePlaceId, // Populated only for unknown Google Places selections
    });
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <MapPin className="text-blue-600" size={24} />
          Velg stasjon
        </CardTitle>
        <p className="text-slate-500 text-sm">Velg stasjon før du tar prisbilde.</p>
      </CardHeader>
      <CardContent>
        {loading && (
          <div className="flex flex-col items-center gap-3 py-8">
            <Loader2 className="animate-spin text-blue-600" size={32} />
            <p className="text-sm text-slate-500">Finner stasjoner i nærheten...</p>
          </div>
        )}

        {errorType === "permission_denied" && (
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm font-semibold text-red-800 mb-1">Posisjonstilgang nektet</p>
              <p className="text-xs text-red-700">Appen trenger tilgang til posisjonen din. Sjekk nettleserinnsillinger eller tillat tilgang når spurt.</p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={loadNearbyStations}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                Prøv igjen
              </Button>
              <Button
                onClick={onSkip}
                variant="outline"
                className="flex-1"
              >
                Skriv inn manuelt
              </Button>
            </div>
          </div>
        )}

        {errorType === "timeout_or_unavailable" && (
          <div className="space-y-4">
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <p className="text-sm font-semibold text-orange-800 mb-1">Posisjonen kunne ikke fastslås</p>
              <p className="text-xs text-orange-700">GPS-signal svakt eller tidavbrutt. Prøv på nytt, eller skriv inn stedet manuelt.</p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={loadNearbyStations}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                Prøv igjen
              </Button>
              <Button
                onClick={onSkip}
                variant="outline"
                className="flex-1"
              >
                Skriv inn manuelt
              </Button>
            </div>
          </div>
        )}

        {errorType === "location_error_unknown" && (
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm font-semibold text-red-800 mb-1">Posisjonfeil</p>
              <p className="text-xs text-red-700">En uventet feil oppstod. Prøv igjen eller skriv inn stedet manuelt.</p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={loadNearbyStations}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                Prøv igjen
              </Button>
              <Button
                onClick={onSkip}
                variant="outline"
                className="flex-1"
              >
                Skriv inn manuelt
              </Button>
            </div>
          </div>
        )}

        {errorType === "no_stations_found" && (
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-sm font-semibold text-amber-800 mb-1">Ingen stasjoner funnet</p>
              <p className="text-xs text-amber-700">Vi fant ingen stasjoner innen 10 km. Prøv igjen eller skriv inn manuelt.</p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={loadNearbyStations}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                Prøv igjen
              </Button>
              <Button
                onClick={onSkip}
                variant="outline"
                className="flex-1"
              >
                Skriv inn manuelt
              </Button>
            </div>
          </div>
        )}

        {!loading && !errorType && stations.length > 0 && (
          <div className="space-y-2 mb-4">
            {stations.map(station => (
              <button
                key={station.id || station.place_id}
                onClick={() => handleSelectStation(station)}
                className="w-full text-left bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 rounded-lg p-3 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 truncate">{station.name}</p>
                    {station.chain && (
                      <p className="text-xs text-slate-500">{station.chain}</p>
                    )}
                    {station.city && (
                      <p className="text-xs text-slate-500">{station.city}</p>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-semibold text-blue-600">
                      {station.distance.toFixed(1)} km
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {!loading && !errorType && stations.length === 0 && (
          <Button
            onClick={onSkip}
            variant="outline"
            className="w-full"
          >
            Skriv inn pris manuelt
          </Button>
        )}
      </CardContent>
    </Card>
  );
}