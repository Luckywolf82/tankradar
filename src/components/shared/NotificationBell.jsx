import React, { useState, useEffect, useRef } from 'react';
import { Bell, TrendingDown } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { formatDistanceToNow } from 'date-fns';
import { nb } from 'date-fns/locale';

const fuelTypeLabel = {
  gasoline_95: 'Bensin 95',
  gasoline_98: 'Bensin 98',
  diesel: 'Diesel',
  bensin_95: 'Bensin 95',
  bensin_98: 'Bensin 98',
  diesel_premium: 'Diesel+',
  other: 'Annet',
};

export default function NotificationBell() {
  const [isAuth, setIsAuth] = useState(false);
  const [unreadAlerts, setUnreadAlerts] = useState([]);
  const [stationNames, setStationNames] = useState({});
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);

  useEffect(() => {
    base44.auth.isAuthenticated().then(auth => {
      setIsAuth(auth);
      if (auth) loadUnread();
    });
  }, []);

  // Poll hvert minutt
  useEffect(() => {
    if (!isAuth) return;
    const interval = setInterval(loadUnread, 60000);
    return () => clearInterval(interval);
  }, [isAuth]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const loadUnread = async () => {
    const all = await base44.entities.UserPriceAlert.filter({ isActive: true });
    const unread = all.filter(a => a.isUnread && a.lastTriggeredAt);
    setUnreadAlerts(unread);

    const ids = [...new Set(unread.map(a => a.station).filter(Boolean))];
    const names = {};
    await Promise.all(
      ids.map(async id => {
        const stations = await base44.entities.Station.filter({ id });
        if (stations[0]) names[id] = stations[0].name;
      })
    );
    setStationNames(names);
  };

  const handleOpen = async () => {
    const wasOpen = open;
    setOpen(!wasOpen);
    if (!wasOpen && unreadAlerts.length > 0) {
      // Merk alle som lest
      await Promise.all(
        unreadAlerts.map(a =>
          base44.entities.UserPriceAlert.update(a.id, { isUnread: false })
        )
      );
      setUnreadAlerts([]);
    }
  };

  if (!isAuth) return null;

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={handleOpen}
        className="relative p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
        aria-label="Prisvarsler"
      >
        <Bell size={18} />
        {unreadAlerts.length > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5">
            {unreadAlerts.length > 9 ? '9+' : unreadAlerts.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100">
            <p className="text-sm font-semibold text-slate-800">Prisvarsler</p>
          </div>

          {unreadAlerts.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <Bell size={24} className="mx-auto text-slate-300 mb-2" />
              <p className="text-sm text-slate-400">Ingen nye prisvarsler</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
              {unreadAlerts.map(alert => {
                const drop =
                  alert.previousPriceNok != null && alert.triggeredPriceNok != null
                    ? (alert.previousPriceNok - alert.triggeredPriceNok).toFixed(2)
                    : null;
                const timeAgo = alert.lastTriggeredAt
                  ? formatDistanceToNow(new Date(alert.lastTriggeredAt), { addSuffix: true, locale: nb })
                  : null;

                return (
                  <div key={alert.id} className="px-4 py-3 bg-green-50">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">
                          {stationNames[alert.station] || 'Stasjon'}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {fuelTypeLabel[alert.fuelType] || alert.fuelType}
                        </p>
                        {timeAgo && (
                          <p className="text-xs text-slate-400 mt-0.5">{timeAgo}</p>
                        )}
                      </div>
                      {alert.triggeredPriceNok != null && (
                        <div className="text-right shrink-0">
                          <p className="text-base font-bold text-green-600">
                            {alert.triggeredPriceNok.toFixed(2)} kr/l
                          </p>
                          {drop && (
                            <p className="text-xs text-green-600 flex items-center justify-end gap-0.5 mt-0.5">
                              <TrendingDown size={11} />
                              ↓ {drop} kr
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}