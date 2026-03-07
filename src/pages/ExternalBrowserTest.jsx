import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { ExternalLink, Copy, CheckCircle } from "lucide-react";

const TEST_URL_EXTERNAL = "https://www.google.com";
const TEST_URL_APP = "https://tankradar.base44.app/LogPrice";

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
  testedUrl: null,
  currentHref: null,
  currentOrigin: null,
  userAgent: null,
};

export default function ExternalBrowserTest() {
  const [diag, setDiag] = useState(null);
  const [copied, setCopied] = useState(false);

  const runTest = (url) => {
    const hasMedian = typeof window.median !== "undefined";
    const medianWindowOpenExists = hasMedian && typeof window.median?.window?.open === "function";

    const d = {
      ...BLANK_DIAG,
      clickTriggered: true,
      isWebView: hasMedian,
      hasMedian,
      medianWindowOpenExists,
      currentHref: window.location.href,
      currentOrigin: window.location.origin,
      testedUrl: url,
      userAgent: navigator.userAgent,
    };
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

  const copyDiag = () => {
    if (!diag) return;
    navigator.clipboard.writeText(JSON.stringify(diag, null, 2))
      .then(() => { setCopied(true); setTimeout(() => setCopied(false), 3000); })
      .catch(() => {});
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-start p-6 gap-6 pt-12">
      <div className="w-full max-w-sm">
        <h1 className="text-white text-xl font-bold mb-1">Browser Handoff Test</h1>
        <p className="text-slate-400 text-sm mb-6">
          Test-URL: <span className="text-yellow-300 font-mono">{TEST_URL}</span>
        </p>

        <div className="flex flex-col gap-3">
          <Button
            className="bg-blue-600 hover:bg-blue-700 gap-2 w-full text-base py-5"
            onClick={() => runTest(TEST_URL_EXTERNAL)}
          >
            <ExternalLink size={18} /> Test: google.com (ekstern)
          </Button>
          <Button
            className="bg-green-700 hover:bg-green-800 gap-2 w-full text-base py-5"
            onClick={() => runTest(TEST_URL_APP)}
          >
            <ExternalLink size={18} /> Test: tankradar.base44.app (app-URL)
          </Button>
        </div>
        <p className="text-slate-500 text-xs text-center">
          Hvis app-URL åpnes internt (ikke system-browser), er det her problemet ligger.
        </p>

        {diag && (
          <div className="mt-6 bg-slate-800 rounded-xl p-4 space-y-1">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-300 font-bold text-sm">DIAGNOSTIKK</span>
              <button
                onClick={copyDiag}
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-white"
              >
                {copied
                  ? <><CheckCircle size={12} className="text-green-400" /> Kopiert</>
                  : <><Copy size={12} /> Kopier JSON</>
                }
              </button>
            </div>
            {Object.entries(diag).map(([k, v]) => (
              <div key={k} className="flex justify-between gap-2 text-xs font-mono">
                <span className="text-slate-400">{k}</span>
                <span className={
                  v === true ? "text-green-400" :
                  v === false ? "text-red-400" :
                  v === null ? "text-slate-500" :
                  "text-yellow-300 break-all text-right max-w-[60%]"
                }>
                  {v === null ? "null" : String(v)}
                </span>
              </div>
            ))}
          </div>
        )}

        {!diag && (
          <p className="text-slate-500 text-sm text-center mt-8">
            Trykk knappen for å starte diagnostikk
          </p>
        )}
      </div>
    </div>
  );
}