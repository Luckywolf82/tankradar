import React, { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Camera, PenLine, ExternalLink, Copy, CheckCircle } from "lucide-react";

// Detekterer om appen kjører i Base44 APK / Median.co WebView
function isMedianWebView() {
  return typeof window.median !== "undefined";
}

export default function PhotoCapture({ onPhoto, onSkip }) {
  const fileRef = useRef();
  const [showDialog, setShowDialog] = useState(false);
  const [copied, setCopied] = useState(false);

  const browserUrl = window.location.origin + window.location.pathname;

  const handleCameraClick = () => {
    if (isMedianWebView()) {
      // APK/WebView detektert — kameravalg fungerer ikke korrekt her
      console.info("[PhotoCapture] Median WebView detected — showing browser redirect dialog");
      setShowDialog(true);
    } else {
      fileRef.current.click();
    }
  };

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (file) onPhoto(file);
  };

  const openExternal = (url) => {
    console.log("[PhotoCapture] browser handoff — median:", window.median);
    console.log("[PhotoCapture] browser handoff — userAgent:", navigator.userAgent);

    // Metode 1: Median bridge
    if (typeof window.median !== "undefined" && typeof window.median?.window?.open === "function") {
      try {
        console.log("[PhotoCapture] browser handoff — method: median.window.open");
        window.median.window.open(url, "external");
        return true;
      } catch (err) {
        console.log("[PhotoCapture] browser handoff — median.window.open failed:", err);
      }
    }

    // Metode 2: window.open _blank
    try {
      console.log("[PhotoCapture] browser handoff — method: window.open _blank");
      const w = window.open(url, "_blank");
      if (w) return true;
      console.log("[PhotoCapture] browser handoff — window.open returned null");
    } catch (err) {
      console.log("[PhotoCapture] browser handoff — window.open failed:", err);
    }

    // Metode 3: anchor click
    try {
      console.log("[PhotoCapture] browser handoff — method: anchor.click");
      const a = document.createElement("a");
      a.href = url;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return true;
    } catch (err) {
      console.log("[PhotoCapture] browser handoff — anchor.click failed:", err);
    }

    // Metode 4: window.location.href
    console.log("[PhotoCapture] browser handoff — method: window.location.href");
    window.location.href = url;
    return true;
  };

  const openInBrowser = () => {
    openExternal(browserUrl);
    setShowDialog(false);
  };

  const copyUrl = () => {
    navigator.clipboard.writeText(browserUrl)
      .then(() => {
        console.info("[PhotoCapture] clipboard copy succeeded");
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
      })
      .catch((err) => {
        console.error("[PhotoCapture] clipboard copy failed", err);
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

      <button
        type="button"
        onClick={onSkip}
        className="text-sm text-slate-400 hover:text-blue-600 flex items-center gap-1 mt-1"
      >
        <PenLine size={14} /> Skriv inn pris manuelt
      </button>

      {/* Modal — vises kun i APK/WebView */}
      {showDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowDialog(false)}
          />

          {/* Dialog */}
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 flex flex-col gap-4">
            <div className="flex items-center justify-center w-14 h-14 rounded-full bg-blue-100 mx-auto">
              <Camera className="text-blue-600" size={28} />
            </div>

            <div className="text-center">
              <h3 className="text-lg font-bold text-slate-800 mb-1">
                Åpne i nettleser
              </h3>
              <p className="text-sm text-slate-500">
                Kameraskann fungerer best i Chrome eller Safari.
                Vil du åpne TankRadar i nettleseren din?
              </p>
            </div>

            <Button
              className="bg-blue-600 hover:bg-blue-700 gap-2 w-full"
              onClick={openInBrowser}
            >
              <ExternalLink size={16} /> Åpne i nettleser
            </Button>

            {/* Kopi-lenke som sekundær fallback */}
            <button
              type="button"
              onClick={copyUrl}
              className="flex items-center justify-center gap-1.5 text-sm text-slate-500 hover:text-slate-700"
            >
              {copied
                ? <><CheckCircle size={14} className="text-green-600" /><span className="text-green-700">Lenke kopiert – lim inn i Chrome eller Safari</span></>
                : <><Copy size={14} /> Kopier lenke i stedet</>
              }
            </button>

            <button
              type="button"
              onClick={() => setShowDialog(false)}
              className="text-xs text-slate-400 hover:text-slate-600 text-center"
            >
              Avbryt
            </button>
          </div>
        </div>
      )}
    </div>
  );
}