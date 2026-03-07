import React, { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Camera, PenLine, ExternalLink, Copy, CheckCircle } from "lucide-react";

const BLANK_DIAG = {
  clickTriggered: false,
  isWebView: false,
  hasMedian: false,
  medianWindowOpenExists: false,
  triedMedianOpen: false,
  triedWindowOpen: false,
  triedAnchorClick: false,
  triedLocationHref: false,
  lastError: null,
  lastMethod: null,
  scanFallbackUrl: null,
  userAgent: null,
};

function buildDiag(url) {
  const hasMedian = typeof window.median !== "undefined";
  const medianWindowOpenExists = hasMedian && typeof window.median?.window?.open === "function";
  return {
    ...BLANK_DIAG,
    clickTriggered: true,
    isWebView: hasMedian,
    hasMedian,
    medianWindowOpenExists,
    scanFallbackUrl: url,
    userAgent: navigator.userAgent,
  };
}

export default function PhotoCapture({ onPhoto, onSkip }) {
  const fileRef = useRef();
  const [showDialog, setShowDialog] = useState(false);
  const [copied, setCopied] = useState(false);
  const [diag, setDiag] = useState(null);

  const browserUrl = window.location.origin + window.location.pathname;

  const handleCameraClick = () => {
    const hasMedian = typeof window.median !== "undefined";
    if (hasMedian) {
      setDiag(null);
      setShowDialog(true);
    } else {
      fileRef.current.click();
    }
  };

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (file) onPhoto(file);
  };

  const runOpenExternal = (url) => {
    const d = buildDiag();
    setDiag({ ...d });

    // Metode 1: median.window.open
    if (d.medianWindowOpenExists) {
      d.triedMedianOpen = true;
      d.lastMethod = "median.window.open";
      setDiag({ ...d });
      try {
        window.median.window.open(url, "external");
        return;
      } catch (err) {
        d.lastError = "median.window.open threw: " + err.message;
        setDiag({ ...d });
      }
    }

    // Metode 2: window.open _blank
    d.triedWindowOpen = true;
    d.lastMethod = "window.open(_blank)";
    setDiag({ ...d });
    try {
      const w = window.open(url, "_blank");
      if (w) return;
      d.lastError = "window.open returned null";
      setDiag({ ...d });
    } catch (err) {
      d.lastError = "window.open threw: " + err.message;
      setDiag({ ...d });
    }

    // Metode 3: anchor click
    d.triedAnchorClick = true;
    d.lastMethod = "anchor.click(_blank)";
    setDiag({ ...d });
    try {
      const a = document.createElement("a");
      a.href = url;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return;
    } catch (err) {
      d.lastError = "anchor.click threw: " + err.message;
      setDiag({ ...d });
    }

    // Metode 4: window.location.href
    d.triedLocationHref = true;
    d.lastMethod = "window.location.href";
    setDiag({ ...d });
    try {
      window.location.href = url;
    } catch (err) {
      d.lastError = "location.href threw: " + err.message;
      setDiag({ ...d });
    }
  };

  const copyUrl = () => {
    navigator.clipboard.writeText(browserUrl)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
      })
      .catch(() => {});
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

      {/* Modal */}
      {showDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowDialog(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-5 flex flex-col gap-3 overflow-y-auto max-h-[90vh]">

            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 mx-auto">
              <Camera className="text-blue-600" size={24} />
            </div>

            <div className="text-center">
              <h3 className="text-lg font-bold text-slate-800 mb-1">Åpne i nettleser</h3>
              <p className="text-sm text-slate-500">
                Kameraskann fungerer best i Chrome eller Safari.
              </p>
            </div>

            <Button
              className="bg-blue-600 hover:bg-blue-700 gap-2 w-full"
              onClick={() => runOpenExternal(browserUrl)}
            >
              <ExternalLink size={16} /> Åpne i nettleser
            </Button>

            {/* Debug-boks — vises etter knappetrykk */}
            {diag && (
              <div className="bg-slate-900 rounded-lg p-3 text-xs font-mono space-y-0.5">
                <p className="text-slate-400 mb-1 font-bold">DIAGNOSTIKK</p>
                {Object.entries(diag).map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-2">
                    <span className="text-slate-400">{k}</span>
                    <span className={
                      v === true ? "text-green-400" :
                      v === false ? "text-red-400" :
                      v === null ? "text-slate-500" :
                      "text-yellow-300"
                    }>
                      {v === null ? "null" : String(v)}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={copyUrl}
              className="flex items-center justify-center gap-1.5 text-sm text-slate-500 hover:text-slate-700"
            >
              {copied
                ? <><CheckCircle size={14} className="text-green-600" /><span className="text-green-700">Lenke kopiert</span></>
                : <><Copy size={14} /> Kopier lenke</>
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