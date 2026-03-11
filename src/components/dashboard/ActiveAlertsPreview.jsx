import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { Bell, Loader2 } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { Link } from 'react-router-dom';

// ActiveAlertsPreview — quick overview of active price alerts
export default function ActiveAlertsPreview() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAlerts();
  }, []);

  const loadAlerts = async () => {
    setLoading(true);
    try {
      const alertsList = await base44.entities.PriceAlert.list('-created_date', 3);
      setAlerts(alertsList || []);
    } catch (err) {
      console.error('[ActiveAlertsPreview] loadAlerts:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const fuelTypeLabels = {
    gasoline_95: 'Bensin 95',
    gasoline_98: 'Bensin 98',
    diesel: 'Diesel',
    diesel_premium: 'Diesel Premium',
  };

  if (loading) {
    return (
      <div className="p-4 flex justify-center">
        <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
      </div>
    );
  }

  const activeCount = alerts.filter(a => a.enabled).length;

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
          <Bell size={16} className="text-blue-600" />
          Områdevarsler
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-3">
        {alerts.length === 0 ? (
          <p className="text-xs text-slate-600">Ingen varsler opprettet ennå</p>
        ) : (
          <>
            <div className="space-y-2">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className="text-xs p-2 bg-slate-50 rounded border border-slate-200 flex justify-between items-center"
                >
                  <div>
                    <p className="font-medium text-slate-800">
                      {fuelTypeLabels[alert.fuelType] || alert.fuelType}
                    </p>
                    <p className="text-slate-600">≤ {alert.maxPrice} NOK · {alert.radiusKm}km</p>
                  </div>
                  <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded ${
                      alert.enabled
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {alert.enabled ? 'Aktiv' : 'Av'}
                  </span>
                </div>
              ))}
            </div>

            <Link to={createPageUrl('PriceAlerts')}>
              <Button variant="outline" size="sm" className="w-full text-xs text-blue-600 border-blue-200">
                Se alle ({activeCount} aktive)
              </Button>
            </Link>
          </>
        )}
      </CardContent>
    </Card>
  );
}