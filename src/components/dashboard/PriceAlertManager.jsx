import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { Loader2, MapPin } from 'lucide-react';

// ─── PriceAlertManager ─────────────────────────────────────────────────
// DEPRECATED COMPONENT — Use pages/PriceAlerts.jsx instead
// 
// This component was part of earlier UI structure (MyFuelDashboard).
// All alert management is now consolidated in the dedicated PriceAlerts page.
// 
// Alert Model: PriceAlert = geographic region alerts (ACTIVE)
// ────────────────────────────────────────────────────────────────────────

export default function PriceAlertManager() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    fuelType: 'diesel',
    maxPrice: 18.0,
    radiusKm: 10,
    latitude: 63.4305,
    longitude: 10.3951,
  });
  const [error, setError] = useState('');

  useEffect(() => {
    loadAlerts();
  }, []);

  const loadAlerts = async () => {
    setLoading(true);
    try {
      const alertsList = await base44.entities.PriceAlert.list('-created_date');
      setAlerts(alertsList || []);
    } catch (err) {
      console.error('[PriceAlertManager] loadAlerts:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAlert = async (e) => {
    e.preventDefault();
    setError('');

    if (isCreating) return;
    setIsCreating(true);

    try {
      await base44.entities.PriceAlert.create({
        fuelType: formData.fuelType,
        maxPrice: parseFloat(formData.maxPrice),
        radiusKm: parseFloat(formData.radiusKm),
        latitude: parseFloat(formData.latitude),
        longitude: parseFloat(formData.longitude),
        enabled: true,
      });

      setShowForm(false);
      setFormData({
        fuelType: 'diesel',
        maxPrice: 18.0,
        radiusKm: 10,
        latitude: 63.4305,
        longitude: 10.3951,
      });
      loadAlerts();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggleAlert = async (alertId, currentEnabled) => {
    try {
      await base44.entities.PriceAlert.update(alertId, { enabled: !currentEnabled });
      loadAlerts();
    } catch (err) {
      console.error('[PriceAlertManager] toggle:', err.message);
    }
  };

  const handleDeleteAlert = async (alertId) => {
    if (!confirm('Er du sikker på at du vil slette dette varslet?')) return;
    try {
      await base44.entities.PriceAlert.delete(alertId);
      loadAlerts();
    } catch (err) {
      console.error('[PriceAlertManager] delete:', err.message);
    }
  };

  if (loading) {
    return (
      <div className="p-4 flex justify-center">
        <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
      </div>
    );
  }

  const fuelTypeLabels = {
    gasoline_95: 'Bensin 95',
    gasoline_98: 'Bensin 98',
    diesel: 'Diesel',
    diesel_premium: 'Diesel Premium',
  };

  return (
    <Card className="shadow-sm mb-6">
      <CardHeader>
        <CardTitle className="text-sm font-semibold text-slate-900">Områdevarsler</CardTitle>
        <p className="text-xs text-slate-600 mt-1">Få varsler når drivstoff under valgt makspris oppdages innenfor valgt radius.</p>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Alert list */}
        {alerts.length > 0 ? (
          <div className="space-y-2">
            {alerts.map((alert) => (
              <div key={alert.id} className="flex items-start justify-between gap-3 p-3 border border-slate-200 rounded bg-slate-50">
                <div className="flex-1 text-xs space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-800">
                      {fuelTypeLabels[alert.fuelType] || alert.fuelType}
                    </span>
                    <span className="text-slate-500">≤ {alert.maxPrice} NOK</span>
                    <span className={alert.enabled ? 'text-green-600' : 'text-slate-400'}>
                      {alert.enabled ? 'Aktivt' : 'Inaktivt'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-slate-600">
                    <MapPin size={12} />
                    {alert.radiusKm} km fra ({alert.latitude.toFixed(2)}, {alert.longitude.toFixed(2)})
                  </div>
                  {alert.lastTriggeredAt && (
                    <div className="text-slate-500">
                      Sist utløst: {new Date(alert.lastTriggeredAt).toLocaleString('no-NO')} @ {alert.lastTriggeredPrice} NOK
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleToggleAlert(alert.id, alert.enabled)}
                    className="p-1 hover:bg-slate-200 rounded text-xs"
                    title={alert.enabled ? 'Deaktiver' : 'Aktiver'}
                  >
                    {alert.enabled ? '✓' : '○'}
                  </button>
                  <button
                    onClick={() => handleDeleteAlert(alert.id)}
                    className="p-1 hover:bg-red-100 rounded text-xs text-red-600"
                    title="Slett"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-600">Ingen områdevarsler opprettet ennå</p>
        )}

        {/* Create alert form */}
        {!showForm ? (
          <Button
            onClick={() => setShowForm(true)}
            variant="outline"
            size="sm"
            className="text-blue-600 border-blue-200"
          >
            + Opprett områdevarsel
          </Button>
        ) : (
          <form onSubmit={handleCreateAlert} className="border-t border-slate-200 pt-4 space-y-3">
            {error && <p className="text-xs text-red-600 bg-red-50 p-2 rounded">{error}</p>}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-700">Drivstofftype</label>
                <select
                  value={formData.fuelType}
                  onChange={(e) => setFormData({ ...formData, fuelType: e.target.value })}
                  className="w-full text-xs border border-slate-300 rounded px-2 py-1"
                >
                  <option value="gasoline_95">Bensin 95</option>
                  <option value="gasoline_98">Bensin 98</option>
                  <option value="diesel">Diesel</option>
                  <option value="diesel_premium">Diesel Premium</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-700">Makspris (NOK)</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.maxPrice}
                  onChange={(e) => setFormData({ ...formData, maxPrice: parseFloat(e.target.value) })}
                  className="w-full text-xs border border-slate-300 rounded px-2 py-1"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-700">Breddegrad</label>
                <input
                  type="number"
                  step="0.0001"
                  value={formData.latitude}
                  onChange={(e) => setFormData({ ...formData, latitude: parseFloat(e.target.value) })}
                  className="w-full text-xs border border-slate-300 rounded px-2 py-1"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-700">Lengdegrad</label>
                <input
                  type="number"
                  step="0.0001"
                  value={formData.longitude}
                  onChange={(e) => setFormData({ ...formData, longitude: parseFloat(e.target.value) })}
                  className="w-full text-xs border border-slate-300 rounded px-2 py-1"
                />
              </div>

              <div className="col-span-2 space-y-2">
                <label className="text-xs font-medium text-slate-700">Søkeradius (km)</label>
                <input
                  type="number"
                  step="0.5"
                  value={formData.radiusKm}
                  onChange={(e) => setFormData({ ...formData, radiusKm: parseFloat(e.target.value) })}
                  className="w-full text-xs border border-slate-300 rounded px-2 py-1"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                type="submit"
                disabled={isCreating}
                size="sm"
                className="text-xs flex-1 bg-blue-600 hover:bg-blue-700"
              >
                {isCreating ? 'Lagrer...' : 'Opprett varsel'}
              </Button>
              <Button
                type="button"
                onClick={() => setShowForm(false)}
                variant="outline"
                size="sm"
                className="text-xs"
              >
                Avbryt
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}