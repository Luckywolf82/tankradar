import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Mail, ShieldCheck } from "lucide-react";
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

  if (!user) return null;

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
    </div>
  );
}