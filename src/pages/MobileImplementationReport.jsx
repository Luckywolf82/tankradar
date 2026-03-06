import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle, Info } from "lucide-react";

export default function MobileImplementationReport() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Mobil/WebView-implementering</h1>
          <p className="text-slate-600">Implementeringsrapport for APK/AAB/Google Play-testing</p>
        </div>

        {/* Overview */}
        <Card>
          <CardHeader>
            <CardTitle>Implementeringsstatus</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3 p-3 bg-green-50 rounded border border-green-200">
                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-semibold text-green-900">Bottom Navigation</p>
                  <p className="text-green-800">Mobil-responsive navigasjon implementert</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-green-50 rounded border border-green-200">
                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-semibold text-green-900">Global CSS</p>
                  <p className="text-green-800">WebView-optimisering og SafeArea lagt inn</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-green-50 rounded border border-green-200">
                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-semibold text-green-900">ThemeProvider</p>
                  <p className="text-green-800">System-tema-support implementert</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-green-50 rounded border border-green-200">
                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-semibold text-green-900">Settings-side</p>
                  <p className="text-green-800">Grunnleggende innstillingsside opprettet</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Files Modified */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Badge>Endret/Opprettet</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="p-3 bg-slate-50 rounded border border-slate-200">
                <p className="font-mono text-sm text-slate-900">Layout.js</p>
                <p className="text-xs text-slate-600 mt-1">Responsiv navigasjon: desktop top nav, mobil bottom nav med Settings</p>
              </div>
              <div className="p-3 bg-slate-50 rounded border border-slate-200">
                <p className="font-mono text-sm text-slate-900">globals.css</p>
                <p className="text-xs text-slate-600 mt-1">WebView CSS (overscroll, user-select), SafeArea-utilities, tema-variables</p>
              </div>
              <div className="p-3 bg-slate-50 rounded border border-slate-200">
                <p className="font-mono text-sm text-slate-900">pages/Settings.js</p>
                <p className="text-xs text-slate-600 mt-1">Innstillingsside med Account Deletion UI (placeholder/support-flow)</p>
              </div>
              <div className="p-3 bg-slate-50 rounded border border-slate-200">
                <p className="font-mono text-sm text-slate-900">components/ThemeProvider.js</p>
                <p className="text-xs text-slate-600 mt-1">System-tema-provider (dark/light mode, localStorage-persistering)</p>
              </div>
              <div className="p-3 bg-slate-50 rounded border border-slate-200">
                <p className="font-mono text-sm text-slate-900">components/ui/mobile-select.js</p>
                <p className="text-xs text-slate-600 mt-1">Responsiv Select (Drawer på mobil, Popover på desktop)</p>
              </div>
              <div className="p-3 bg-slate-50 rounded border border-slate-200">
                <p className="font-mono text-sm text-slate-900">pages/App.jsx</p>
                <p className="text-xs text-slate-600 mt-1">Root app-komponent med ThemeProvider wrapping</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Components Modified */}
        <Card>
          <CardHeader>
            <CardTitle>Komponenttilpasning</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="p-4 bg-blue-50 rounded border border-blue-200">
                <p className="font-semibold text-blue-900 mb-2">Bottom Navigation (mobil)</p>
                <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                  <li>Vises kun på skjermer &lt;768px (md breakpoint)</li>
                  <li>4 tabs: Oversikt, Statistikk, Logg pris, Innstillinger</li>
                  <li>Active-tab får blå bakgrunn og farget tekst</li>
                  <li>Fixed position med pb-safe for bottom inset</li>
                </ul>
              </div>

              <div className="p-4 bg-blue-50 rounded border border-blue-200">
                <p className="font-semibold text-blue-900 mb-2">Top Navigation (desktop)</p>
                <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                  <li>Vises kun på &gt;=768px (md breakpoint)</li>
                  <li>Inkluderer logo, eksisterende nav-lenker + Settings</li>
                  <li>Sticky positioning, pt-safe for top inset</li>
                  <li>Bevarende av eksisterende styling</li>
                </ul>
              </div>

              <div className="p-4 bg-blue-50 rounded border border-blue-200">
                <p className="font-semibold text-blue-900 mb-2">Main Content Area</p>
                <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                  <li>pb-20 (md:pb-0) for spacing på mobil (unngår overlapping med bottom nav)</li>
                  <li>flex-1 for fylling av tilgjengelig plass</li>
                  <li>Alle eksisterende sider har full funksjonalitet</li>
                </ul>
              </div>

              <div className="p-4 bg-blue-50 rounded border border-blue-200">
                <p className="font-semibold text-blue-900 mb-2">MobileSelect komponent</p>
                <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                  <li>Responsiv Select-wrapper (drop-in replacement)</li>
                  <li>Desktop: Standard Popover Select</li>
                  <li>Mobil: Bottom Sheet Drawer med scroll support</li>
                  <li>Kan brukes i LogPrice, Settings, etc.</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Desktop Preservation */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Desktop-opplevelse bevart
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="p-3 bg-green-50 rounded">
              <p className="text-green-900"><strong>✓</strong> Dashboard fungerer fullt ut</p>
            </div>
            <div className="p-3 bg-green-50 rounded">
              <p className="text-green-900"><strong>✓</strong> Statistics-siden intakt</p>
            </div>
            <div className="p-3 bg-green-50 rounded">
              <p className="text-green-900"><strong>✓</strong> LogPrice scan/OCR-flyt uendret</p>
            </div>
            <div className="p-3 bg-green-50 rounded">
              <p className="text-green-900"><strong>✓</strong> User_reported matching-logikk intakt</p>
            </div>
            <div className="p-3 bg-green-50 rounded">
              <p className="text-green-900"><strong>✓</strong> GooglePlaces-data visning uendret</p>
            </div>
            <div className="p-3 bg-green-50 rounded">
              <p className="text-green-900"><strong>✓</strong> Eksisterende routing fungerer</p>
            </div>
          </CardContent>
        </Card>

        {/* Account Deletion */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5 text-blue-600" />
              Account Deletion implementasjon
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-blue-50 rounded border border-blue-200">
              <p className="font-semibold text-blue-900 mb-2">Status: UI-placeholder</p>
              <p className="text-sm text-blue-800 mb-3">
                Account Deletion-knappen er implementert som UI-komponent, men viser en placeholder-flyt:
              </p>
              <div className="bg-white p-3 rounded border border-blue-100 font-mono text-xs text-slate-700">
                <p>Alert: "Kontoen slettingsprosessen er under utvikling."</p>
                <p className="mt-2">Kontakt: support@drivstoffpris.no</p>
              </div>
            </div>
            <div className="p-4 bg-amber-50 rounded border border-amber-200">
              <p className="text-sm text-amber-900">
                <strong>Når full sletting skal implementeres:</strong> Bytt alert-flyt med faktisk backend-sletting 
                (krever auth-verifisering og destruktiv operation).
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Testing Checklist */}
        <Card>
          <CardHeader>
            <CardTitle>Testing-sjekkliste for APK/AAB</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <label className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded cursor-pointer">
                <input type="checkbox" className="w-4 h-4" />
                <span className="text-sm text-slate-700">Bottom nav vises på mobil (&lt;768px)</span>
              </label>
              <label className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded cursor-pointer">
                <input type="checkbox" className="w-4 h-4" />
                <span className="text-sm text-slate-700">Bottom nav skjules på desktop (&gt;=768px)</span>
              </label>
              <label className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded cursor-pointer">
                <input type="checkbox" className="w-4 h-4" />
                <span className="text-sm text-slate-700">SafeArea padding respekteres (notch/gesture nav)</span>
              </label>
              <label className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded cursor-pointer">
                <input type="checkbox" className="w-4 h-4" />
                <span className="text-sm text-slate-700">Dark mode fungerer (system-preferanse)</span>
              </label>
              <label className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded cursor-pointer">
                <input type="checkbox" className="w-4 h-4" />
                <span className="text-sm text-slate-700">Tekstmarkering redusert (WebView-friksjon)</span>
              </label>
              <label className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded cursor-pointer">
                <input type="checkbox" className="w-4 h-4" />
                <span className="text-sm text-slate-700">LogPrice-knappen er lett tilgjengelig</span>
              </label>
              <label className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded cursor-pointer">
                <input type="checkbox" className="w-4 h-4" />
                <span className="text-sm text-slate-700">Settings-side åpner fra bottom nav</span>
              </label>
              <label className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded cursor-pointer">
                <input type="checkbox" className="w-4 h-4" />
                <span className="text-sm text-slate-700">Scan-flyt fungerer som før</span>
              </label>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}