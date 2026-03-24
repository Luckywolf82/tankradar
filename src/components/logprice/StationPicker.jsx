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

      // Fetch all stations and exclude only explicit archived_duplicate.
      // Stations seeded before status field was introduced may have status=null and must still be visible.
      const allStationsRaw = await base44.entities.Station.list('-created_date', 2000);
      const allStations = allStationsRaw.filter(s => s.status !== 'archived_duplicate');
      console.log(`[StationPicker] Active stations in catalog: ${allStations.length}`);

      // Fetch Google Places results (read-only discovery for picker display only)
      let googlePlacesResults = [];
      try {
        const gpRes = await base44.functions.invoke('discoverGooglePlacesCandidatesForPicker', {
          latitude,
          longitude,
          radiusMeters: 15000
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
        .filter(s => s.distance <= 1.0)
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 20);

      console.log(`[StationPicker] Raw combined results within 1km radius: ${nearbyWithDistance.length}`);

      // ── CANONICAL DEDUPE PASS ──────────────────────────────────────────────
      // Removes duplicate picker options representing the same physical station.
      //
      // Priority order for keeping: station_catalog > google_places.
      // Within same source: earlier in sorted list (closer) wins.
      //
      // Three-tier matching (no single-field-name match):
      //   1. Exact source identity: same sourceName + sourceStationId (both non-empty)
      //   2. Catalog ID dedupe: same station entity id
      //   3. Proximity + name: coordinates within 100m AND same normalised name
      //
      // Coordinate proximity threshold: 100 m ≈ 0.001 degrees at Norwegian latitudes.
      // This prevents collapsing truly different stations that happen to be close.

      function normaliseStationName(name) {
        if (!name) return '';
        return name
          .toLowerCase()
          .replace(/\s+/g, ' ')
          .replace(/[.,\-]/g, '')
          .trim();
      }

      function coordsWithinMeters(s1, s2, thresholdM) {
        if (!s1.latitude || !s1.longitude || !s2.latitude || !s2.longitude) return false;
        const distKm = calculateDistance(s1.latitude, s1.longitude, s2.latitude, s2.longitude);
        return distKm * 1000 <= thresholdM;
      }

      // Returns whether two candidates represent the same physical station
      function isSameStation(a, b) {
        // Tier 1: exact source identity (sourceName + sourceStationId both match)
        if (
          a.sourceName && b.sourceName &&
          a.sourceStationId && b.sourceStationId &&
          a.sourceName === b.sourceName &&
          a.sourceStationId === b.sourceStationId
        ) return true;

        // Tier 2: same Station catalog id (covers catalog vs catalog dupes)
        if (a.id && b.id && a.id === b.id) return true;

        // Tier 3: proximity (<= 100m) + normalised name match
        const nameA = normaliseStationName(a.name);
        const nameB = normaliseStationName(b.name);
        if (nameA && nameB && nameA === nameB && coordsWithinMeters(a, b, 100)) return true;

        return false;
      }

      // Rank candidates: lower = better to keep
      // station_catalog with id beats google_places
      function candidateRank(s) {
        if (s._source === 'station_catalog' && s.id) return 0;
        if (s._source === 'station_catalog') return 1;
        return 2; // google_places
      }

      const dedupedStations = [];
      const collapsedLog = []; // debug log

      for (const candidate of nearbyWithDistance) {
        const existingIdx = dedupedStations.findIndex(kept => isSameStation(kept, candidate));
        if (existingIdx === -1) {
          // No duplicate found — add as new entry
          dedupedStations.push(candidate);
        } else {
          const existing = dedupedStations[existingIdx];
          // Keep the better-ranked one; if tied keep the closer one (already sorted)
          if (candidateRank(candidate) < candidateRank(existing)) {
            collapsedLog.push({
              kept: candidate.id || candidate.place_id,
              keptName: candidate.name,
              collapsed: existing.id || existing.place_id,
              collapsedName: existing.name,
              reason: 'higher_priority_source',
            });
            dedupedStations[existingIdx] = candidate;
          } else {
            collapsedLog.push({
              kept: existing.id || existing.place_id,
              keptName: existing.name,
              collapsed: candidate.id || candidate.place_id,
              collapsedName: candidate.name,
              reason: candidateRank(candidate) === candidateRank(existing) ? 'closer_distance' : 'lower_priority_source',
            });
          }
        }
      }

      console.log(`[StationPicker][dedupe] Raw: ${nearbyWithDistance.length} → Deduped: ${dedupedStations.length} (collapsed ${collapsedLog.length})`);
      if (collapsedLog.length > 0) {
        console.log('[StationPicker][dedupe] Collapsed entries:', JSON.stringify(collapsedLog, null, 2));
      }
      // ── END DEDUPE PASS ───────────────────────────────────────────────────

      setStations(dedupedStations);

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

    // Proximity metadata: distance to selected and next-best candidate (in meters)
    const selectedDistanceM = station.distance != null ? Math.round(station.distance * 1000) : null;
    const otherCandidates = stations.filter(s => (s.id || s.place_id) !== (station.id || station.place_id));
    const secondCandidate = otherCandidates.length > 0 ? otherCandidates[0] : null;
    const secondDistanceM = secondCandidate?.distance != null ? Math.round(secondCandidate.distance * 1000) : null;
    const distanceGapM = (selectedDistanceM != null && secondDistanceM != null) ? (secondDistanceM - selectedDistanceM) : null;

    onSelectStation({
      station_id: station.id || null, // null if from Google Places (no Station.id yet)
      station_name: station.name || "",
      station_chain: station.chain || station.business_type || "",
      city: station.city || (station.formatted_address ? station.formatted_address.split(',')[0] : ""),
      region: station.region || null,
      latitude: station.latitude || userLocation.latitude,
      longitude: station.longitude || userLocation.longitude,
      google_place_id: googlePlaceId, // Populated only for unknown Google Places selections
      // Clarification metadata fields
      selectedGooglePlaceId: googlePlaceId,
      selectedSource: station._source || null,
      selectedCandidateDistanceM: selectedDistanceM,
      secondCandidateDistanceM: secondDistanceM,
      distanceGapM: distanceGapM,
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
              <p className="text-xs text-amber-700">Vi fant ingen stasjoner innen 1 km. Prøv igjen eller skriv inn manuelt.</p>
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