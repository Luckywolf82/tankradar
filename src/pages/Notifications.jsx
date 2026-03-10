import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, Loader2, CheckCircle2 } from "lucide-react";
import { createPageUrl } from "@/utils";
import { useNavigate } from "react-router-dom";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const loadData = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);

        if (currentUser) {
          const userNotifs = await base44.entities.UserNotification.filter({
            userId: currentUser.email,
          });
          setNotifications(userNotifs.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)));
        }
      } catch (err) {
        console.error("Failed to load notifications:", err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const markAsRead = async (notifId) => {
    try {
      await base44.entities.UserNotification.update(notifId, { read: true });
      setNotifications((prev) =>
        prev.map((n) => (n.id === notifId ? { ...n, read: true } : n))
      );
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    }
  };

  const formatTime = (date) => {
    const now = new Date();
    const diff = now - new Date(date);
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Akkurat nå";
    if (minutes < 60) return `${minutes}m siden`;
    if (hours < 24) return `${hours}h siden`;
    if (days < 7) return `${days}d siden`;
    return new Date(date).toLocaleDateString("no-NO");
  };

  const unreadNotifs = notifications.filter((n) => !n.read);
  const readNotifs = notifications.filter((n) => n.read);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 size={24} className="animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Bell size={24} className="text-slate-600" />
          <h1 className="text-3xl font-bold text-slate-900">Varsler</h1>
        </div>
        <p className="text-slate-600">In-app notification center for price alerts</p>
      </div>

      {unreadNotifs.length === 0 && readNotifs.length === 0 ? (
        <Card>
          <CardContent className="pt-12 pb-12 text-center">
            <Bell size={48} className="mx-auto text-slate-300 mb-4" />
            <p className="text-slate-600">Ingen varsler ennå</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Unread Notifications */}
          {unreadNotifs.length > 0 && (
            <div className="mb-8">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-3">
                Uleste ({unreadNotifs.length})
              </h2>
              <div className="space-y-3">
                {unreadNotifs.map((notif) => (
                  <Card
                    key={notif.id}
                    className="bg-blue-50 border-blue-200 hover:shadow-md transition-shadow"
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-2 h-2 rounded-full bg-blue-600 mt-1.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-slate-900">{notif.title}</p>
                          <p className="text-sm text-slate-700 mt-1">{notif.message}</p>
                          <div className="flex items-center justify-between mt-3">
                            <span className="text-xs text-slate-500">
                              {formatTime(notif.created_date)}
                            </span>
                            <button
                              onClick={() => markAsRead(notif.id)}
                              className="text-xs font-medium text-blue-600 hover:text-blue-700"
                            >
                              Merk som lest
                            </button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Read Notifications */}
          {readNotifs.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-3">
                Leste ({readNotifs.length})
              </h2>
              <div className="space-y-3">
                {readNotifs.map((notif) => (
                  <Card key={notif.id} className="bg-white border-slate-200 opacity-75">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <CheckCircle2 size={20} className="text-slate-400 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-slate-700">{notif.title}</p>
                          <p className="text-sm text-slate-600 mt-1">{notif.message}</p>
                          <span className="text-xs text-slate-500 mt-2 block">
                            {formatTime(notif.created_date)}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}