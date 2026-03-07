import React, { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Camera, PenLine, ExternalLink, Copy } from "lucide-react";

export default function PhotoCapture({ onPhoto, onSkip }) {
  const fileRef = useRef();
  const [fallbackState, setFallbackState] = useState("idle"); // idle | copied | failed

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (file) onPhoto(file);
  };

  const openInBrowser = () => {
    const url = window.location.origin + window.location.pathname;

    // Strategi 1: anchor-element med target="_blank" — mest kompatibelt
    try {
      const a = document.createElement("a");
      a.href = url;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      // Sjekk om window.open også returnerer noe (WebView blokkerer = null)
      const w = window.open(url, "_blank");
      if (!w) {
        // Strategi 2: kopier URL til clipboard som siste utvei
        navigator.clipboard.writeText(url).then(() => {
          setFallbackState("copied");
        }).catch(() => {
          console.error("[PhotoCapture] external browser fallback failed — clipboard also unavailable");
          setFallbackState("failed");
        });
      }
    } catch (err) {
      console.error("[PhotoCapture] external browser fallback failed", err);
      setFallbackState("failed");
    }
  };

  const browserUrl = window.location.origin + window.location.pathname;

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
      <div className="w-full max-w-xs border border-amber-200 bg-amber-50 rounded-lg p-3 mt-1">
        <p className="text-xs text-amber-700 text-center mb-2">
          Fungerer ikke kameraet? Kameraskann virker best i nettleseren på mobil.
        </p>
        <button
          type="button"
          onClick={openInBrowser}
          className="w-full flex items-center justify-center gap-1.5 text-sm text-amber-800 font-medium hover:text-amber-900"
        >
          <ExternalLink size={14} /> Åpne kameraskann i nettleser
        </button>
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