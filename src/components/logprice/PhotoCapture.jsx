import React, { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Camera, PenLine, ExternalLink, Copy, CheckCircle } from "lucide-react";

export default function PhotoCapture({ onPhoto, onSkip }) {
  const fileRef = useRef();
  const [copied, setCopied] = useState(false);
  const [showFallbackUrl, setShowFallbackUrl] = useState(false);

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (file) onPhoto(file);
  };

  const browserUrl = window.location.origin + window.location.pathname;

  const openInBrowser = () => {
    // Metode 1: window.open med _blank
    console.info("[PhotoCapture] external browser fallback — trying window.open(_blank)");
    const w = window.open(browserUrl, "_blank");

    if (w) {
      console.info("[PhotoCapture] external browser fallback — window.open succeeded");
      return;
    }

    // Metode 2: anchor element click
    console.warn("[PhotoCapture] external browser fallback — window.open returned null, trying anchor click");
    try {
      const a = document.createElement("a");
      a.href = browserUrl;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      console.info("[PhotoCapture] external browser fallback — anchor click dispatched");
    } catch (err) {
      console.error("[PhotoCapture] external browser fallback — anchor click failed", err);
    }

    // Uansett resultat fra metodene over: vis alltid kopi-UI i WebView
    // siden vi ikke kan verifisere om nettleser faktisk åpnet
    setShowFallbackUrl(true);
  };

  const copyUrl = () => {
    navigator.clipboard.writeText(browserUrl)
      .then(() => {
        console.info("[PhotoCapture] external browser fallback — clipboard copy succeeded");
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
      })
      .catch((err) => {
        console.error("[PhotoCapture] external browser fallback — clipboard copy failed", err);
        // Vis URL synlig så brukeren kan kopiere manuelt
        setShowFallbackUrl(true);
      });
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
        onClick={() => fileRef.current.click()}
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

      {/* Fallback for APK/WebView */}
      <div className="w-full max-w-xs border border-amber-200 bg-amber-50 rounded-lg p-3 mt-1 space-y-2">
        <p className="text-xs text-amber-700 text-center">
          Fungerer ikke kameraet i appen? Åpne siden i nettleseren din i stedet.
        </p>

        <button
          type="button"
          onClick={openInBrowser}
          className="w-full flex items-center justify-center gap-1.5 text-sm text-amber-800 font-medium hover:text-amber-900 py-1"
        >
          <ExternalLink size={14} /> Åpne i nettleser
        </button>

        {/* Kopi-knapp vises alltid som backup */}
        <button
          type="button"
          onClick={copyUrl}
          className="w-full flex items-center justify-center gap-1.5 text-xs text-amber-600 hover:text-amber-800 py-0.5"
        >
          {copied
            ? <><CheckCircle size={13} className="text-green-600" /> <span className="text-green-700 font-medium">Lenke kopiert – lim inn i Chrome eller Safari</span></>
            : <><Copy size={13} /> Kopier lenke</>
          }
        </button>

        {/* Vis URL synlig ved behov */}
        {showFallbackUrl && !copied && (
          <p className="text-xs text-amber-600 break-all select-all text-center pt-1 border-t border-amber-200">
            {browserUrl}
          </p>
        )}
      </div>

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