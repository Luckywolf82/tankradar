import React, { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Camera, PenLine, Settings, ExternalLink } from "lucide-react";

export default function PhotoCapture({ onPhoto, onSkip }) {
  const fileRef = useRef();
  const [showPermissionHelp, setShowPermissionHelp] = useState(false);

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (file) {
      setShowPermissionHelp(false);
      onPhoto(file);
    }
  };

  const handleCameraClick = () => {
    // Lytter på om input forblir tom etter klikk — indikerer sperret tilgang
    const input = fileRef.current;
    input.value = "";
    input.click();

    // Hvis ingen fil er valgt etter 500ms, vis tilgangsveiledning
    const timer = setTimeout(() => {
      if (!input.files || input.files.length === 0) {
        setShowPermissionHelp(true);
      }
    }, 500);

    // Rydd opp timer hvis fil faktisk velges
    const cleanup = () => {
      clearTimeout(timer);
      input.removeEventListener("change", cleanup);
    };
    input.addEventListener("change", cleanup, { once: true });
  };

  const tryOpenSettings = () => {
    // Forsøk å åpne app-innstillinger via Median-bridge eller standard URL
    if (typeof window.median !== "undefined" && window.median?.app?.openSettings) {
      window.median.app.openSettings();
    } else {
      // Ikke mulig å åpne innstillinger direkte fra WebView — vis veiledning
      setShowPermissionHelp(true);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 py-8">
      <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center">
        <Camera className="text-blue-600" size={40} />
      </div>
      <h2 className="text-xl font-bold text-slate-800">Ta bilde av prisskiltet</h2>
      <p className="text-slate-500 text-sm text-center max-w-xs">
        Hold telefonen mot prisskiltet utenfor stasjonen. AI leser prisen automatisk.
      </p>

      <Button
        className="bg-blue-600 hover:bg-blue-700 gap-2 w-full max-w-xs"
        onClick={handleCameraClick}
      >
        <Camera size={18} /> Ta bilde / velg fra galleri
      </Button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFile}
      />

      {showPermissionHelp && (
        <div className="w-full max-w-xs bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-col gap-3">
          <div className="flex items-start gap-2">
            <Settings size={18} className="text-amber-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-800">Kameratilgang kan mangle</p>
              <p className="text-xs text-amber-700 mt-0.5">
                Appen har ikke tilgang til kameraet ditt. Du må aktivere dette i systeminnstillingene.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-amber-100 p-3 text-xs text-slate-600 space-y-1.5">
            <p className="font-semibold text-slate-700">Slik aktiverer du kameratilgang:</p>
            <p>1. Åpne <strong>Innstillinger</strong> på telefonen</p>
            <p>2. Gå til <strong>Apper</strong> → finn <strong>TankRadar</strong></p>
            <p>3. Trykk på <strong>Tillatelser</strong></p>
            <p>4. Slå på <strong>Kamera</strong></p>
            <p>5. Kom tilbake til appen og prøv igjen</p>
          </div>

          <Button
            variant="outline"
            className="gap-2 text-sm border-amber-300 text-amber-700 hover:bg-amber-50 w-full"
            onClick={tryOpenSettings}
          >
            <ExternalLink size={14} /> Prøv å åpne innstillinger
          </Button>

          <button
            type="button"
            className="text-xs text-slate-400 hover:text-slate-600 text-center"
            onClick={() => setShowPermissionHelp(false)}
          >
            Lukk
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={onSkip}
        className="text-sm text-slate-400 hover:text-blue-600 flex items-center gap-1 mt-1"
      >
        <PenLine size={14} /> Skriv inn pris manuelt
      </button>
    </div>
  );
}