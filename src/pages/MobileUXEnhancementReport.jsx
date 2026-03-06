import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle, Code } from "lucide-react";

export default function MobileUXEnhancementReport() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Mobile UX Forbedringer</h1>
          <p className="text-slate-600">Rapport for route animasjoner, tab-state, pull-to-refresh, og optimistisk feedback</p>
        </div>

        {/* 1. Route Transitions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Badge>1. Route Transitions</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-blue-50 rounded border border-blue-200">
              <p className="font-semibold text-blue-900 mb-2">Implementering: RouteAnimation komponent</p>
              <div className="bg-white p-3 rounded font-mono text-xs text-slate-700 space-y-1">
                <p>📁 components/mobile/RouteAnimation.js</p>
                <p className="text-slate-500">- Mobil-kun animasjoner (desktop: ingen)</p>
                <p className="text-slate-500">- Slide-in fra høyre (30px offset)</p>
                <p className="text-slate-500">- 0.2s ease-out transition</p>
                <p className="text-slate-500">- Brukt i: Dashboard, Statistics, LogPrice</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3 bg-green-50 rounded border border-green-200">
                <p className="text-sm font-semibold text-green-900">Omfang</p>
                <p className="text-xs text-green-800 mt-1">Hovedshell-ruter kun (ikke admin/debug)</p>
              </div>
              <div className="p-3 bg-green-50 rounded border border-green-200">
                <p className="text-sm font-semibold text-green-900">Performance</p>
                <p className="text-xs text-green-800 mt-1">Framer Motion brukt (lett og smooth)</p>
              </div>
              <div className="p-3 bg-green-50 rounded border border-green-200">
                <p className="text-sm font-semibold text-green-900">Scan/OCR påvirkning</p>
                <p className="text-xs text-green-800 mt-1">Ingen påvirkning (LogPrice bruker modal-flow)</p>
              </div>
              <div className="p-3 bg-green-50 rounded border border-green-200">
                <p className="text-sm font-semibold text-green-900">Layout omfang</p>
                <p className="text-xs text-green-800 mt-1">Layout.js wraper RouteAnimation rundt children</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 2. Bottom Tab State */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Badge>2. Bottom Tab State Preservation</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-blue-50 rounded border border-blue-200">
              <p className="font-semibold text-blue-900 mb-2">Implementering: TabStateProvider + useTabState hook</p>
              <div className="bg-white p-3 rounded font-mono text-xs text-slate-700 space-y-1">
                <p>📁 components/mobile/TabStateProvider.js</p>
                <p className="text-slate-500">- React Context for scroll position storage</p>
                <p className="text-slate-500">- Per-tab state management (Dashboard, Statistics, LogPrice)</p>
                <p className="text-slate-500">- Auto-save on unmount, restore on mount</p>
                <p className="text-slate-500">- Zero-lag scroll restoration</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3 bg-green-50 rounded border border-green-200">
                <p className="text-sm font-semibold text-green-900">Brukslokasjoner</p>
                <p className="text-xs text-green-800 mt-1">pages/Dashboard, pages/Statistics</p>
              </div>
              <div className="p-3 bg-green-50 rounded border border-green-200">
                <p className="text-sm font-semibold text-green-900">State som bevares</p>
                <p className="text-xs text-green-800 mt-1">Scroll position per tab</p>
              </div>
              <div className="p-3 bg-green-50 rounded border border-green-200">
                <p className="text-sm font-semibold text-green-900">App-feel</p>
                <p className="text-xs text-green-800 mt-1">Tabs føles som native app-tabs, ikke full reset</p>
              </div>
              <div className="p-3 bg-green-50 rounded border border-green-200">
                <p className="text-sm font-semibold text-green-900">Kompleksitet</p>
                <p className="text-xs text-green-800 mt-1">Minimal Context setup, ingen Redux/Zustand</p>
              </div>
            </div>

            <div className="p-3 bg-amber-50 rounded border border-amber-200">
              <p className="text-xs text-amber-900">
                <strong>Merk:</strong> Tap state bruker window.scrollY som fallback hvis kontainer ref ikke er tilgjengelig. Dette sikrer at scroll position gjenopprettes selv ved edge cases.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 3. Pull-to-Refresh */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Badge>3. Pull-to-Refresh</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-blue-50 rounded border border-blue-200">
              <p className="font-semibold text-blue-900 mb-2">Implementering: PullToRefresh komponent</p>
              <div className="bg-white p-3 rounded font-mono text-xs text-slate-700 space-y-1">
                <p>📁 components/mobile/PullToRefresh.js</p>
                <p className="text-slate-500">- Touch-basert pull detection (iOS/Android-stil)</p>
                <p className="text-slate-500">- Pull > 60px = refresh trigger</p>
                <p className="text-slate-500">- Roterende RefreshCw-ikon under lasting</p>
                <p className="text-slate-500">- Kaller onRefresh() prop (eksist. loadData)</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3 bg-green-50 rounded border border-green-200">
                <p className="text-sm font-semibold text-green-900">Brukslokasjoner</p>
                <p className="text-xs text-green-800 mt-1">Dashboard, Statistics (data pages)</p>
              </div>
              <div className="p-3 bg-green-50 rounded border border-green-200">
                <p className="text-sm font-semibold text-green-900">Integrasjon</p>
                <p className="text-xs text-green-800 mt-1">Wraps innhold, trigger eksist. loadData()</p>
              </div>
              <div className="p-3 bg-green-50 rounded border border-green-200">
                <p className="text-sm font-semibold text-green-900">overscroll konflikt</p>
                <p className="text-xs text-green-800 mt-1">Ingen konflikt (styrer egen touch)</p>
              </div>
              <div className="p-3 bg-green-50 rounded border border-green-200">
                <p className="text-sm font-semibold text-green-900">Visuell feedback</p>
                <p className="text-xs text-green-800 mt-1">Ikonen roterer under lasting</p>
              </div>
              <div className="p-3 bg-green-50 rounded border border-green-200">
                <p className="text-sm font-semibold text-green-900">Form-sikkerhet</p>
                <p className="text-xs text-green-800 mt-1">Virker ikke på LogPrice (ikke wrapped)</p>
              </div>
            </div>

            <div className="p-3 bg-amber-50 rounded border border-amber-200">
              <p className="text-xs text-amber-900">
                <strong>Merk:</strong> Pull-to-refresh deaktiveres automatisk hvis scrollTop > 0. Sikrer at det ikke trigges under scroll down.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 4. Unified Mobile Header */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Badge>4. Unified Mobile Header</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-blue-50 rounded border border-blue-200">
              <p className="font-semibold text-blue-900 mb-2">Implementering: MobileHeader komponent</p>
              <div className="bg-white p-3 rounded font-mono text-xs text-slate-700 space-y-1">
                <p>📁 components/mobile/MobileHeader.js</p>
                <p className="text-slate-500">- Synlig kun på mobil (&lt;768px)</p>
                <p className="text-slate-500">- Root pages: viser logo + tittel</p>
                <p className="text-slate-500">- Child pages: viser back-knapp</p>
                <p className="text-slate-500">- Sticky positioning med pt-safe</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3 bg-green-50 rounded border border-green-200">
                <p className="text-sm font-semibold text-green-900">Root pages (logo)</p>
                <p className="text-xs text-green-800 mt-1">Dashboard, Statistics, LogPrice</p>
              </div>
              <div className="p-3 bg-green-50 rounded border border-green-200">
                <p className="text-sm font-semibold text-green-900">Child pages (back)</p>
                <p className="text-xs text-green-800 mt-1">Alle ikke-root sider</p>
              </div>
              <div className="p-3 bg-green-50 rounded border border-green-200">
                <p className="text-sm font-semibold text-green-900">Desktop påvirkning</p>
                <p className="text-xs text-green-800 mt-1">Ingen (md:hidden)</p>
              </div>
              <div className="p-3 bg-green-50 rounded border border-green-200">
                <p className="text-sm font-semibold text-green-900">Design</p>
                <p className="text-xs text-green-800 mt-1">Enkel, visuelt lett</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 5. Optimistic Success */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Badge>5. Optimistic Success UX i LogPrice</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-blue-50 rounded border border-blue-200">
              <p className="font-semibold text-blue-900 mb-2">Implementering: OptimisticSuccess komponent</p>
              <div className="bg-white p-3 rounded font-mono text-xs text-slate-700 space-y-1">
                <p>📁 components/logprice/OptimisticSuccess.js</p>
                <p className="text-slate-500">- Overlay som vises umiddelbar ved submit</p>
                <p className="text-slate-500">- Grønn success-state vises mens API kjører</p>
                <p className="text-slate-500">- Hvis API feiler: viser rød error-state</p>
                <p className="text-slate-500">- Bruker endelig fra LogPrice handleSubmit</p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded border border-slate-200">
              <p className="font-semibold text-slate-900 mb-2">Flyt:</p>
              <div className="space-y-2 text-sm text-slate-700">
                <p><strong>1.</strong> Bruker klikker "Del pris"</p>
                <p><strong>2.</strong> setShowSuccess(true) → grønn overlay vises UMIDDELBAR</p>
                <p><strong>3.</strong> handleSubmit() kjører i bakgrunnen (setSubmitting(true))</p>
                <p><strong>4.</strong> Hvis OK: overlay forblir grønn + "Logg en til" / "Se statistikk" knapper</p>
                <p><strong>5.</strong> Hvis API feiler: overlay skifter til rød + viser error + "Prøv igjen"</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3 bg-green-50 rounded border border-green-200">
                <p className="text-sm font-semibold text-green-900">Umiddelbar feedback</p>
                <p className="text-xs text-green-800 mt-1">Bruker får grønt checkmark STRAKS</p>
              </div>
              <div className="p-3 bg-green-50 rounded border border-green-200">
                <p className="text-sm font-semibold text-green-900">API failure-håndtering</p>
                <p className="text-xs text-green-800 mt-1">Viser error, lar bruker prøve igjen</p>
              </div>
              <div className="p-3 bg-green-50 rounded border border-green-200">
                <p className="text-sm font-semibold text-green-900">Data-integritet</p>
                <p className="text-xs text-green-800 mt-1">Ingen endr. av submission/matching-logikk</p>
              </div>
              <div className="p-3 bg-green-50 rounded border border-green-200">
                <p className="text-sm font-semibold text-green-900">Scan/OCR-påvirkning</p>
                <p className="text-xs text-green-800 mt-1">Ingen (overlay-modal, ikke nav-endring)</p>
              </div>
            </div>

            <div className="p-3 bg-red-50 rounded border border-red-200">
              <p className="text-xs text-red-900">
                <strong>✓ Sikkerhet:</strong> Hvis API feiler, overlay blir rød og bruker kan ikke lukke implisitt. Må velge "Prøv igjen" eller "Lukk" eksplisitt. Ingen stille svikt.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Integration Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Integrasjonssammendrag</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="p-3 bg-slate-50 rounded">
              <p className="text-sm font-mono"><strong>Layout.js</strong></p>
              <p className="text-xs text-slate-600">+ MobileHeader import, + RouteAnimation wrapper rundt children</p>
            </div>
            <div className="p-3 bg-slate-50 rounded">
              <p className="text-sm font-mono"><strong>pages/App.jsx</strong></p>
              <p className="text-xs text-slate-600">+ TabStateProvider wrap BrowserRouter</p>
            </div>
            <div className="p-3 bg-slate-50 rounded">
              <p className="text-sm font-mono"><strong>pages/Dashboard</strong></p>
              <p className="text-xs text-slate-600">+ PullToRefresh, useTabState, RouteAnimation</p>
            </div>
            <div className="p-3 bg-slate-50 rounded">
              <p className="text-sm font-mono"><strong>pages/Statistics</strong></p>
              <p className="text-xs text-slate-600">+ PullToRefresh, useTabState, RouteAnimation</p>
            </div>
            <div className="p-3 bg-slate-50 rounded">
              <p className="text-sm font-mono"><strong>pages/LogPrice</strong></p>
              <p className="text-xs text-slate-600">+ OptimisticSuccess, RouteAnimation, error handling</p>
            </div>
          </CardContent>
        </Card>

        {/* Functionality Checklist */}
        <Card>
          <CardHeader>
            <CardTitle>Eksisterende funksjonalitet bekreftet</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {[
              "Dashboard (data load, fuel type select, SmartFill, LiveMarket, SSB trend)",
              "Statistics (prisfordeling, regional analyse, SSB historikk)",
              "LogPrice (scan, OCR, AI detection, GPS geolocation, station matching)",
              "Scan/OCR flow (uendret)",
              "user_reported matching (uendret)",
              "GooglePlaces data visning (uendret)",
              "Desktop-opplevelse intakt (top nav, desktop layout)"
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-2 p-2">
                <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-slate-700">{item}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Testing Notes */}
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-blue-900">Testing Notes</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-blue-800 space-y-2">
            <p><strong>Route Transitions:</strong> Åpne Dashboard → Statistics → LogPrice på mobil. Skal se slide-in fra høyre.</p>
            <p><strong>Tab State:</strong> Scroll ned på Dashboard, gå til Statistics, gå tilbake til Dashboard. Scroll pos skal gjenopprettes.</p>
            <p><strong>Pull-to-Refresh:</strong> Drag nedenfra på Dashboard/Statistics. Skal trigge loadData() når >60px.</p>
            <p><strong>Mobile Header:</strong> Sjekk at logo vises på root pages, back-knapp på child pages (mobil kun).</p>
            <p><strong>Optimistic Success:</strong> Logg pris, klikk "Del". Grønt overlay skal vise STRAKS. Vent på API, skal bli grønn eller rød.</p>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}