import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User, Mail, ShieldCheck, ExternalLink, Bell, Settings, LogOut, LogIn } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import PrivacySettings from "../components/profile/PrivacySettings";

export default function Profile() {
  const [user, setUser] = useState(null);
  const [contributions, setContributions] = useState(0);

  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
      if (u) {
        base44.entities.FuelPrice.filter({ priceType: "user_reported", created_by: u.email })
          .then(prices => setContributions(prices.length))
          .catch(() => {});
      }
    }).catch(() => {});
  }, []);

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto p-4 md:p-6">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-slate-900">Profil</h1>
        </div>
        <Card>
          <CardContent className="py-8 flex flex-col items-center gap-4 text-center">
            <User size={40} className="text-slate-300" />
            <p className="text-slate-600 text-sm">Logg inn for å se profil, favoritter og innstillinger</p>
            <Button onClick={() => base44.auth.redirectToLogin(window.location.pathname)} className="bg-green-600 hover:bg-green-700 gap-2">
              <LogIn size={16} /> Logg inn
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const roleLabels = {
    guest: "Gjest",
    user: "Bruker",
    curator: "Kurator",
    admin: "Administrator",
  };

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Min profil</h1>
        <p className="text-slate-600">Kontoinformasjon og bidrag</p>
      </div>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User size={18} /> Kontoinformasjon
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-center gap-3">
            <Mail size={16} className="text-slate-400" />
            <span className="text-slate-700">{user.email}</span>
          </div>
          <div className="flex items-center gap-3">
            <User size={16} className="text-slate-400" />
            <span className="text-slate-700">{user.full_name || "–"}</span>
          </div>
          <div className="flex items-center gap-3">
            <ShieldCheck size={16} className="text-slate-400" />
            <span className="text-slate-700">{roleLabels[user.role] || user.role || "Bruker"}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Mine bidrag</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <p className="text-4xl font-bold text-green-600">{contributions}</p>
            <p className="text-slate-500 mt-1 text-sm">innrapporterte priser</p>
          </div>
        </CardContent>
      </Card>

      <div className="mt-4">
        <PrivacySettings user={user} onSaved={() => base44.auth.me().then(setUser)} />
      </div>

      {user.role === "admin" && (
        <Card className="mt-4 border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-800">
              <ShieldCheck size={18} /> Admin-snarveier
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2 text-sm">
            {[
              { label: "SuperAdmin", page: "SuperAdmin" },
              { label: "Review-kø", page: "ReviewQueue" },
              { label: "Systemstatus", page: "SystemStatus" },
              { label: "Stasjonsimport", page: "StationImport" },
            ].map(({ label, page }) => (
              <Link
                key={page}
                to={createPageUrl(page)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-amber-200 text-amber-800 hover:bg-amber-100 transition-colors font-medium"
              >
                <ExternalLink size={13} />
                {label}
              </Link>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}