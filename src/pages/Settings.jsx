import React from "react";
import { APP_VERSION_LABEL } from "../components/version";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Settings() {

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Innstillinger</h1>
        <p className="text-slate-600">Administrer din konto og appinnstillinger</p>
      </div>

{/* App Info */}
<Card>
  <CardHeader>
    <CardTitle>App-informasjon</CardTitle>
  </CardHeader>
  <CardContent className="space-y-3 text-sm text-slate-600">
    <div>
      <p className="font-semibold text-slate-900">Versjon</p>
      <p className="font-mono text-sm">{APP_VERSION_LABEL}</p>
    </div>
    <div>
      <p className="font-semibold text-slate-900">Plattform</p>
      <p>TankRadar</p>
    </div>
    <div className="pt-3 border-t border-slate-200">
      <p className="font-semibold text-slate-900 mb-2">Kundestøtte</p>
      <p className="text-sm text-slate-600">support@tankradar.app</p>
    </div>
    <div className="pt-3 border-t border-slate-200">
      <p className="font-semibold text-slate-900 mb-2">Juridisk</p>
      <a href="https://tankradar.app/privacy" target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">
        Personvernpolicy
      </a>
    </div>
  </CardContent>
</Card>
    </div>
  );
}