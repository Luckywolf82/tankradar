import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { Loader2, X } from 'lucide-react';

export default function PriceAlertManager({ stationId, onRefresh }) {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    fuelType: 'diesel',
    alertType: 'below_national_average',
    thresholdValue: '',
  });
  const [error, setError] = useState('');

  useEffect(() => {
    loadAlerts();
  }, []);

  const loadAlerts = async () => {
    setLoading(true);
    try {
      const response = await base44.functions.invoke('getUserPriceAlerts', {});
      setAlerts(response.data.alerts || []);
    } catch (err) {
      console.error('[PriceAlertManager] loadAlerts:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const alertTypesRequiringThreshold = ['below_user_target', 'price_drop'];
  const requiresThreshold = alertTypesRequiringThreshold.includes(formData.alertType);

  const handleCreateAlert = async (e) => {
    e.preventDefault();
    setError('');

    // Validate threshold if required
    if (requiresThreshold && !formData.thresholdValue) {
      setError('Terskelverdi er påkrevd for denne alert-typen');
      return;
    }

    if (isCreating) return;
    setIsCreating(true);

    try {
      const response = await base44.functions.invoke('createUserPriceAlert', {
        stationId: stationId || '',
        fuelType: formData.fuelType,
        alertType: formData.alertType,
        thresholdValue: requiresThreshold ? parseFloat(formData.thresholdValue) : null,
      });

      if (response.data.status === 'created') {
        setShowForm(false);
        setFormData({
          fuelType: 'diesel',
          alertType: 'below_national_average',
          thresholdValue: '',
        });
        loadAlerts();
      } else if (response.data.status === 'already_exists') {
        setError('Du har allerede et slikt varsling');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 flex justify-center">
        <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <Card className="shadow-sm mb-6">
      <CardHeader>
        <CardTitle className="text-sm font-semibold text-slate-900">Stasjonsvarsler</CardTitle>
        <p className="text-xs text-slate-600 mt-1">Følg en bestemt stasjon og få varsler ved prisfall, målpris eller nye prisrekorder.</p>
        <p className="text-xs text-slate-500 mt-1">💡 Bruk <span className="font-medium">Områdevarsler</span> for å søke i hele områder med en enkelt innstilling.</p>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Alert list */}
        {alerts.length > 0 ? (
          <div className="space-y-2">
            {alerts.map((alert) => (
              <div key={alert.id} className="bg-blue-50 rounded p-3 border border-blue-200">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-slate-900">{alert.stationName}</p>
                    <p className="text-xs text-slate-600 mt-1">
                      {alert.alertType === 'below_user_target' &&
                        `Når prisen faller under ${alert.thresholdValue} NOK`}
                      {alert.alertType === 'below_national_average' && 'Når prisen under landsgjenomsnitt'}
                      {alert.alertType === 'price_drop' &&
                        `Når prisen faller under ${alert.thresholdValue} NOK`}
                      {alert.alertType === 'new_low_7d' && 'Når ny 7-dagers rekord nås'}
                      {alert.alertType === 'new_low_30d' && 'Når ny 30-dagers rekord nås'}
                    </p>
                    {alert.lastTriggeredAt && (
                      <p className="text-xs text-slate-500 mt-2">
                        Senest utløst: {new Date(alert.lastTriggeredAt).toLocaleDateString('no-NO')}
                      </p>
                    )}
                  </div>
                  <span
                    className={`text-xs font-semibold px-2 py-1 rounded ${
                      alert.isActive
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {alert.isActive ? 'Aktiv' : 'Inaktiv'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-600">Ingen stasjonsvarsler opprettet ennå</p>
        )}

        {/* Create alert form */}
        {!showForm ? (
          <Button
            onClick={() => setShowForm(true)}
            variant="outline"
            size="sm"
            className="text-blue-600 border-blue-200"
          >
            + Opprett stasjonsvarsling
          </Button>
        ) : (
          <form onSubmit={handleCreateAlert} className="border-t border-slate-200 pt-4 space-y-3">
            {error && <p className="text-xs text-red-600 bg-red-50 p-2 rounded">{error}</p>}

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
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-700">Varslingtype</label>
              <select
                value={formData.alertType}
                onChange={(e) => setFormData({ ...formData, alertType: e.target.value })}
                className="w-full text-xs border border-slate-300 rounded px-2 py-1"
              >
                <option value="below_national_average">Under landsgjenomsnitt</option>
                <option value="below_user_target">Under målpris</option>
                <option value="price_drop">Prisnedgang</option>
                <option value="new_low_7d">Ny 7-dagers rekord</option>
                <option value="new_low_30d">Ny 30-dagers rekord</option>
              </select>
            </div>

            {requiresThreshold && (
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-700">Terskelverdi (NOK)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.thresholdValue}
                  onChange={(e) => setFormData({ ...formData, thresholdValue: e.target.value })}
                  className="w-full text-xs border border-slate-300 rounded px-2 py-1"
                  placeholder="f.eks. 19.50"
                />
              </div>
            )}

            <div className="flex gap-2">
              <Button
                type="submit"
                disabled={isCreating}
                size="sm"
                className="text-xs flex-1 bg-blue-600 hover:bg-blue-700"
              >
                {isCreating ? 'Lagrer...' : 'Opprett varsling'}
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