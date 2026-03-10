import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, Trash2, Eye, EyeOff, Plus, Loader2, MapPin } from "lucide-react";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";

export default function PriceAlertsPage() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    fuelType: "diesel",
    maxPrice: 18.0,
    radiusKm: 10,
    latitude: 63.4305,
    longitude: 10.3951, // Trondheim coords as default
  });

  useEffect(() => {
    loadAlertsAndEvents();
  }, []);

  const loadAlertsAndEvents = async () => {
    try {
      setLoading(true);
      const alertsList = await base44.entities.PriceAlert.list("-created_date");
      setAlerts(alertsList || []);
    } catch (err) {
      console.error("Failed to load alerts:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAlert = async (e) => {
    e.preventDefault();
    try {
      await base44.entities.PriceAlert.create({
        ...formData,
        maxPrice: parseFloat(formData.maxPrice),
        radiusKm: parseFloat(formData.radiusKm),
        latitude: parseFloat(formData.latitude),
        longitude: parseFloat(formData.longitude),
        enabled: true,
      });
      setFormData({
        fuelType: "diesel",
        maxPrice: 18.0,
        radiusKm: 10,
        latitude: 63.4305,
        longitude: 10.3951,
      });
      setShowCreateForm(false);
      loadAlertsAndEvents();
    } catch (err) {
      console.error("Failed to create alert:", err);
    }
  };

  const handleToggleAlert = async (alertId, currentEnabled) => {
    try {
      await base44.entities.PriceAlert.update(alertId, { enabled: !currentEnabled });
      loadAlertsAndEvents();
    } catch (err) {
      console.error("Failed to toggle alert:", err);
    }
  };

  const handleDeleteAlert = async (alertId) => {
    if (!confirm("Are you sure you want to delete this alert?")) return;
    try {
      await base44.entities.PriceAlert.delete(alertId);
      loadAlertsAndEvents();
    } catch (err) {
      console.error("Failed to delete alert:", err);
    }
  };



  const fuelTypeLabels = {
    gasoline_95: "Bensin 95",
    gasoline_98: "Bensin 98",
    diesel: "Diesel",
    bensin_95: "Bensin 95",
    bensin_98: "Bensin 98",
    diesel_premium: "Diesel Premium",
    other: "Annet",
  };

  if (loading) {
    return (
      <div className="p-6 text-center">
        <Loader2 className="animate-spin mx-auto mb-2" size={24} />
        <p className="text-xs text-slate-500">Loading alerts…</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-4">
      {/* ── Phase 6A Alert System Clarification ────────────────────────────── */}
      <Card className="bg-blue-50 border-l-4 border-blue-600">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-blue-900">
            Phase 6A: Geographic Price Alerts (Active)
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs space-y-1 text-blue-900">
          <p>
            <span className="font-medium">Model:</span> Location-based alerts matched by geolocation (latitude/longitude + radius).
          </p>
          <p>
            <span className="font-medium">Station Matching:</span> Geographic radius-based, not tied to pre-existing stations.
          </p>
          <p>
            <span className="font-medium">Notifications:</span> Triggered alerts stored as events only — no push notifications sent yet.
          </p>
          <p>
            <span className="font-medium">Premium Gating:</span> Not currently enforced. All users can create alerts.
          </p>
          <p>
            <span className="font-medium">Triggers:</span> When a FuelPrice matching your fuel type is detected with price ≤ maxPrice, within search radius.
          </p>
          <p className="text-blue-800 italic">
            Note: A separate UserPriceAlert system (station-specific, premium-only) exists but is not active in this UI.
          </p>
        </CardContent>
      </Card>

      {/* My Alerts Section */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <CardTitle className="text-base flex items-center gap-2">
              <Bell size={18} className="text-blue-600" />
              My Alerts
            </CardTitle>
            <Button
              size="sm"
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus size={14} className="mr-1" />
              New Alert
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {alerts.length === 0 ? (
            <p className="text-xs text-slate-500">No alerts created yet.</p>
          ) : (
            <div className="space-y-2">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-start justify-between gap-3 p-3 border border-slate-200 rounded bg-slate-50"
                >
                  <div className="flex-1 text-xs space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-800">
                        {fuelTypeLabels[alert.fuelType] || alert.fuelType}
                      </span>
                      <span className="text-slate-500">&le; {alert.maxPrice} NOK</span>
                      <span className={alert.enabled ? "text-green-600" : "text-slate-400"}>
                        {alert.enabled ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-slate-600">
                      <MapPin size={12} />
                      {alert.radiusKm} km from ({alert.latitude.toFixed(2)}, {alert.longitude.toFixed(2)})
                    </div>
                    {alert.lastTriggeredAt && (
                      <div className="text-slate-500">
                        Last triggered: {new Date(alert.lastTriggeredAt).toLocaleString("no-NO")} @ {alert.lastTriggeredPrice} NOK
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleToggleAlert(alert.id, alert.enabled)}
                      className="p-1 hover:bg-slate-200 rounded"
                      title={alert.enabled ? "Disable" : "Enable"}
                    >
                      {alert.enabled ? (
                        <Eye size={14} className="text-slate-600" />
                      ) : (
                        <EyeOff size={14} className="text-slate-400" />
                      )}
                    </button>
                    <button
                      onClick={() => handleDeleteAlert(alert.id)}
                      className="p-1 hover:bg-red-100 rounded"
                      title="Delete"
                    >
                      <Trash2 size={14} className="text-red-600" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Alert Form */}
      {showCreateForm && (
        <Card className="bg-blue-50 border border-blue-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Create New Alert</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateAlert} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-700 block mb-1">
                    Fuel Type
                  </label>
                  <select
                    value={formData.fuelType}
                    onChange={(e) => setFormData({ ...formData, fuelType: e.target.value })}
                    className="w-full text-xs border border-slate-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400"
                  >
                    <option value="gasoline_95">Bensin 95</option>
                    <option value="gasoline_98">Bensin 98</option>
                    <option value="diesel">Diesel</option>
                    <option value="diesel_premium">Diesel Premium</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700 block mb-1">
                    Max Price (NOK)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.maxPrice}
                    onChange={(e) => setFormData({ ...formData, maxPrice: parseFloat(e.target.value) })}
                    className="w-full text-xs border border-slate-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700 block mb-1">
                    Latitude
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    value={formData.latitude}
                    onChange={(e) => setFormData({ ...formData, latitude: parseFloat(e.target.value) })}
                    className="w-full text-xs border border-slate-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700 block mb-1">
                    Longitude
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    value={formData.longitude}
                    onChange={(e) => setFormData({ ...formData, longitude: parseFloat(e.target.value) })}
                    className="w-full text-xs border border-slate-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-medium text-slate-700 block mb-1">
                    Search Radius (km)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={formData.radiusKm}
                    onChange={(e) => setFormData({ ...formData, radiusKm: parseFloat(e.target.value) })}
                    className="w-full text-xs border border-slate-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400"
                  />
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCreateForm(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs"
                >
                  Create Alert
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Triggered Alerts — Consolidated to Notifications */}
      <Card className="bg-slate-50 border border-slate-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Bell size={18} className="text-slate-600" />
            Triggered Alerts
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-700">
          <p className="mb-3">Triggered price alerts now appear in your notifications inbox.</p>
          <a
            href={createPageUrl("Notifications")}
            className="inline-block px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded transition-colors"
          >
            View Notifications (Varsler)
          </a>
        </CardContent>
      </Card>
    </div>
  );
}