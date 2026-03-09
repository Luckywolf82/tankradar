import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { X, Loader2 } from 'lucide-react';

export default function AddFavoriteForm({ onClose, onSuccess }) {
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState({
    stationId: '',
    fuelType: 'diesel',
  });
  const [error, setError] = useState('');

  const filteredStations = stations.filter((station) => {
    const query = searchQuery.toLowerCase();
    return (
      station.name.toLowerCase().includes(query) ||
      (station.chain && station.chain.toLowerCase().includes(query)) ||
      (station.city && station.city.toLowerCase().includes(query)) ||
      (station.address && station.address.toLowerCase().includes(query))
    );
  });

  useEffect(() => {
    loadStations();
  }, []);

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const loadStations = async () => {
    setLoading(true);
    try {
      // Try to get user location with timeout
      let location = null;
      try {
        location = await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('Geolocation timeout')), 5000);
          navigator.geolocation.getCurrentPosition(
            (position) => {
              clearTimeout(timeout);
              resolve({
                lat: position.coords.latitude,
                lon: position.coords.longitude,
              });
            },
            (error) => {
              clearTimeout(timeout);
              reject(error);
            }
          );
        });
        setUserLocation(location);
      } catch (locErr) {
        console.log('[AddFavoriteForm] Geolocation not available:', locErr.message);
      }

      const stationList = await base44.entities.Station.list('-name', 2000);
      let sorted = stationList || [];

      // Sort by distance if location available
      if (location && sorted.length > 0) {
        sorted = sorted
          .map((station) => ({
            ...station,
            distance:
              station.latitude && station.longitude
                ? calculateDistance(
                    location.lat,
                    location.lon,
                    station.latitude,
                    station.longitude
                  )
                : Infinity,
          }))
          .sort((a, b) => a.distance - b.distance);
      }

      setStations(sorted);
    } catch (err) {
      console.error('[AddFavoriteForm] loadStations:', err.message);
      setError('Kunne ikke laste stasjoner');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.stationId) {
      setError('Velg en stasjon');
      return;
    }

    if (selecting) return;
    setSelecting(true);

    try {
      const response = await base44.functions.invoke('addUserFavoriteStation', {
        stationId: formData.stationId,
        fuelType: formData.fuelType,
      });

      if (response.data.status === 'created') {
        onSuccess();
      } else if (response.data.status === 'already_exists') {
        setError('Du har allerede denne stasjonen som favoritt');
      } else if (response.data.status === 'limit_reached') {
        setError('Du har nådd maksimalt antall favoritter');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSelecting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end md:items-center justify-center z-50 pb-20 md:pb-0">
      <div className="bg-white rounded-t-xl md:rounded-xl w-full md:w-96 p-6 max-h-96 overflow-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-slate-900">Legg til favoritt</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded p-3 mb-4">
            <p className="text-xs text-red-600">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Search and station selector */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-700">Søk og velg stasjon</label>
            {loading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
              </div>
            ) : (
              <>
                <input
                  type="text"
                  placeholder="Søk etter stasjonsnavn eller kjede..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full text-sm border border-slate-300 rounded px-3 py-2"
                />
                <select
                  value={formData.stationId}
                  onChange={(e) => setFormData({ ...formData, stationId: e.target.value })}
                  className="w-full text-sm border border-slate-300 rounded px-3 py-2 bg-white"
                >
                  <option value="">-- Velg stasjon --</option>
                  {filteredStations.length > 0 ? (
                    filteredStations.map((station) => (
                      <option key={station.id} value={station.id}>
                        {station.name}
                        {station.chain ? ` (${station.chain})` : ''}
                        {station.distance && station.distance !== Infinity
                          ? ` - ${Math.round(station.distance)} km`
                          : ''}
                      </option>
                    ))
                  ) : (
                    <option disabled>Ingen stasjoner funnet</option>
                  )}
                </select>
                {filteredStations.length > 0 && (
                  <p className="text-xs text-slate-500">
                    Viser {filteredStations.length} stasjoner ({stations.length} totalt)
                  </p>
                )}
              </>
            )}
          </div>

          {/* Fuel type selector */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-700">Drivstofftype</label>
            <select
              value={formData.fuelType}
              onChange={(e) => setFormData({ ...formData, fuelType: e.target.value })}
              className="w-full text-sm border border-slate-300 rounded px-3 py-2 bg-white"
            >
              <option value="gasoline_95">Bensin 95</option>
              <option value="gasoline_98">Bensin 98</option>
              <option value="diesel">Diesel</option>
            </select>
          </div>

          {/* Buttons */}
          <div className="flex gap-2 pt-4">
            <Button
              type="submit"
              disabled={selecting || loading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm"
            >
              {selecting ? 'Lagrer...' : 'Legg til favoritt'}
            </Button>
            <Button
              type="button"
              onClick={onClose}
              variant="outline"
              className="flex-1 text-sm"
            >
              Avbryt
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}