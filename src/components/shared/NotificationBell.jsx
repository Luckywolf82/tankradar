import React, { useState, useEffect, useRef } from 'react';
import { Bell, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { formatDistanceToNow } from 'date-fns';
import { nb } from 'date-fns/locale';
import { fetchUnreadNotifications } from '@/components/services/notificationServiceClient';

export default function NotificationBell() {
  const [isAuth, setIsAuth] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);

  useEffect(() => {
    base44.auth.isAuthenticated().then(auth => {
      setIsAuth(auth);
      if (auth) loadUnread();
    }).catch(() => {});
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
    try {
      const u = await base44.auth.me();
      if (!u) return;
      // Try canonical service first, fallback to UserNotification
      let all;
      try {
        all = await fetchUnreadNotifications(u.email, { limit: 50 });
      } catch (e) {
        all = await base44.entities.UserNotification.filter({ userId: u.email, read: false });
      }
      setUnreadNotifications(all || []);
    } catch (e) {
      // stille feil — varsler er ikke kritisk
    }
  };

  const extractSavings = (message) => {
    // Reuse savings extraction from Notifications page
    const savingsMatch = message.match(/sparer[^0-9]*([0-9.,]+)\s*kr/i);
    return savingsMatch ? savingsMatch[1] : null;
  };

  const handleOpen = () => {
    setOpen(!open);
  };

  if (!isAuth) return null;

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={handleOpen}
        className="relative p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
        aria-label="Varsler"
      >
        <Bell size={18} />
        {unreadNotifications.length > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5">
            {unreadNotifications.length > 9 ? '9+' : unreadNotifications.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100">
            <p className="text-sm font-semibold text-slate-800">Varsler</p>
          </div>

          {unreadNotifications.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <Bell size={24} className="mx-auto text-slate-300 mb-2" />
              <p className="text-sm text-slate-400">Ingen nye varsler</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
              {unreadNotifications.slice(0, 5).map(notif => {
                const timeAgo = formatDistanceToNow(new Date(notif.created_date), { 
                  addSuffix: true, 
                  locale: nb 
                });

                const savings = extractSavings(notif.message);
                return (
                  <div key={notif.id} className="px-4 py-3 bg-blue-50">
                    <p className="text-sm font-semibold text-slate-800 truncate">
                      {notif.title}
                    </p>
                    <p className="text-xs text-slate-600 mt-0.5 line-clamp-2">
                      {notif.message}
                    </p>
                    {savings && (
                      <p className="text-xs font-medium text-green-600 mt-1">
                        💰 Sparer ~{savings} kr/liter
                      </p>
                    )}
                    <p className="text-xs text-slate-400 mt-1">{timeAgo}</p>
                  </div>
                );
              })}
            </div>
          )}

          <div className="px-4 py-3 border-t border-slate-100 bg-slate-50">
            <Link
              to={createPageUrl('Notifications')}
              className="flex items-center justify-between text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              <span>Åpne alle varsler</span>
              <ChevronRight size={14} />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}