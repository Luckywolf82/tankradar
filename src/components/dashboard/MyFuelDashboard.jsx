import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2 } from 'lucide-react';
import FavoriteStationCard from './FavoriteStationCard';
import FreemiumBanner from './FreemiumBanner';
import AddFavoriteForm from './AddFavoriteForm';

export default function MyFuelDashboard() {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [showAddFavorite, setShowAddFavorite] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const isAuth = await base44.auth.isAuthenticated();
      if (!isAuth) {
        setUser(null);
        setLoading(false);
        return;
      }

      const authUser = await base44.auth.me();
      setUser(authUser);

      if (authUser) {
        const response = await base44.functions.invoke('getFuelDashboardData', {});
        setDashboardData(response.data);
      }
    } catch (err) {
      console.error('[MyFuelDashboard] loadData:', err.message);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="mb-8 p-8 flex justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (!dashboardData) {
    return null;
  }

  const { favorites, limits, priceHistory, nationalBenchmark, regionalBenchmark } = dashboardData;
  const { maxFavorites, canAccessRegionalBenchmark, canCreateAlerts } = limits;

  return (
    <div className="mb-8">
      <div className="mb-4">
        <h2 className="text-lg font-bold text-slate-800">Mine stasjoner</h2>
      </div>

      {/* Favorite stations grid */}
      {favorites.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {favorites.map((favorite) => (
            <FavoriteStationCard
              key={favorite.stationId}
              favorite={favorite}
              priceHistory={priceHistory[favorite.stationId] || []}
              nationalBenchmark={nationalBenchmark[favorite.fuelType]}
              regionalBenchmark={canAccessRegionalBenchmark ? regionalBenchmark : null}
              onRefresh={loadData}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-slate-200 p-6 mb-6 text-center">
          <p className="text-slate-600 text-sm">Ingen favoritt stasjon lagt til ennå</p>
        </div>
      )}

      {/* Add favorite button (if space available) */}
      {favorites.length < maxFavorites && (
        <button
          onClick={() => setShowAddFavorite(true)}
          className="mb-6 px-4 py-2 text-sm font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
        >
          + Legg til favoritt
        </button>
      )}

      {/* DEPRECATED: PriceAlertManager moved to pages/PriceAlerts */}
       {/* All alert management now consolidated in dedicated page */}

      {/* Single consolidated premium upsell — only if both limits reached and alerts locked */}
      {!canCreateAlerts && favorites.length >= maxFavorites && (
        <FreemiumBanner type="premium_only" message="Oppgrader til premium for ubegrenset favoritter og prisvarslinger" />
      )}

      {/* Limit reached only (can still get alerts or vice versa) */}
      {!canCreateAlerts && favorites.length < maxFavorites && (
        <FreemiumBanner type="premium_only" message="Prisvarslinger er kun for premium-brukere" />
      )}

      {/* Add favorite modal */}
      {showAddFavorite && (
        <AddFavoriteForm
          onClose={() => setShowAddFavorite(false)}
          onSuccess={() => {
            setShowAddFavorite(false);
            loadData();
          }}
        />
      )}
    </div>
  );
}