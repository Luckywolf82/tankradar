/**
 * CameraCapture — in-app camera with guided overlay, real-time hints, and light auto-zoom.
 *
 * Uses getUserMedia to stream the environment camera.
 * Overlay box guides the user to center price text.
 * Hint logic reads frame brightness variance as a proxy for whether readable text is present.
 * Auto-zoom: small incremental zoom via videoTrack.applyConstraints({ advanced: [{ zoom }] })
 *   — only if device supports it, max +3x, small steps of 0.3x.
 */

import React, { useRef, useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Camera, ZoomIn, AlertCircle } from "lucide-react";

// How often to analyze the frame for hints/zoom (ms)
const ANALYSIS_INTERVAL_MS = 1000;

// Zoom constraints
const ZOOM_MIN = 1.0;
const ZOOM_MAX = 3.0;
const ZOOM_STEP = 0.3;
const ZOOM_DEFAULT = 1.0;

// If variance below this threshold, text is probably absent / too small
const VARIANCE_LOW_THRESHOLD = 28;

// Overlay box geometry (fraction of viewport) — used for both display and crop
const BOX_TOP = 0.28;
const BOX_LEFT = 0.06;
const BOX_WIDTH = 0.88;
const BOX_HEIGHT = 0.38;

function sampleFrameVariance(videoEl, canvasEl) {
  if (!videoEl || !canvasEl) return null;
  const w = 120;
  const h = 80;
  canvasEl.width = w;
  canvasEl.height = h;
  const ctx = canvasEl.getContext("2d");
  // Sample the exact overlay box region
  const sx = videoEl.videoWidth * BOX_LEFT;
  const sy = videoEl.videoHeight * BOX_TOP;
  const sw = videoEl.videoWidth * BOX_WIDTH;
  const sh = videoEl.videoHeight * BOX_HEIGHT;
  try {
    ctx.drawImage(videoEl, sx, sy, sw, sh, 0, 0, w, h);
    const data = ctx.getImageData(0, 0, w, h).data;
    // Grayscale variance as proxy for contrast/text presence
    let sum = 0;
    let count = 0;
    for (let i = 0; i < data.length; i += 4) {
      const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      sum += gray;
      count++;
    }
    const mean = sum / count;
    let variance = 0;
    for (let i = 0; i < data.length; i += 4) {
      const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      variance += (gray - mean) ** 2;
    }
    return variance / count;
  } catch {
    return null;
  }
}

export default function CameraCapture({ onCapture, onFallback }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const analysisCanvasRef = useRef(null);
  const streamRef = useRef(null);
  const trackRef = useRef(null);
  const analysisTimerRef = useRef(null);

  const [ready, setReady] = useState(false);
  const [error, setError] = useState(null);
  const [hint, setHint] = useState(null); // null | string
  const [currentZoom, setCurrentZoom] = useState(ZOOM_DEFAULT);
  const [zoomSupported, setZoomSupported] = useState(false);
  const [capturing, setCapturing] = useState(false);

  // Start stream
  useEffect(() => {
    let cancelled = false;
    async function startCamera() {
      try {
        const constraints = {
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        if (cancelled) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }
        streamRef.current = stream;
        const track = stream.getVideoTracks()[0];
        trackRef.current = track;

        // Check zoom support
        const caps = track.getCapabilities?.() || {};
        if (caps.zoom) {
          setZoomSupported(true);
        }

        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setReady(true);
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Kamerafeil");
        }
      }
    }
    startCamera();
    return () => {
      cancelled = true;
      stopStream();
    };
  }, []);

  // Frame analysis loop for hints + auto-zoom
  useEffect(() => {
    if (!ready) return;
    analysisTimerRef.current = setInterval(() => {
      analyzeFrame();
    }, ANALYSIS_INTERVAL_MS);
    return () => clearInterval(analysisTimerRef.current);
  }, [ready, currentZoom]);

  function stopStream() {
    clearInterval(analysisTimerRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  }

  const analyzeFrame = useCallback(() => {
    const variance = sampleFrameVariance(videoRef.current, analysisCanvasRef.current);
    if (variance === null) return;

    if (variance < VARIANCE_LOW_THRESHOLD) {
      // Low contrast in center — text likely not visible or too small
      const hints = [
        "Flytt nærmere prisskiltet",
        "Zoom litt inn",
        "Hold kamera rolig",
      ];
      // Cycle through hints so user sees different suggestions
      setHint(hints[Math.floor(Date.now() / 3000) % hints.length]);

      // Light auto-zoom: only increment if zoom supported and not at max
      if (zoomSupported && currentZoom < ZOOM_MAX) {
        const newZoom = Math.min(currentZoom + ZOOM_STEP, ZOOM_MAX);
        applyZoom(newZoom);
      }
    } else {
      // Good contrast — clear hint
      setHint(null);
    }
  }, [currentZoom, zoomSupported]);

  async function applyZoom(zoom) {
    if (!trackRef.current || !zoomSupported) return;
    try {
      await trackRef.current.applyConstraints({ advanced: [{ zoom }] });
      setCurrentZoom(zoom);
    } catch {
      // Zoom not supported on this device even though caps said so
      setZoomSupported(false);
    }
  }

  const handleCapture = useCallback(() => {
    if (!videoRef.current || capturing) return;
    setCapturing(true);

    const video = videoRef.current;
    const canvas = canvasRef.current;

    // Crop to the overlay box region for tighter, cleaner input to OCR
    const sx = Math.round(video.videoWidth * BOX_LEFT);
    const sy = Math.round(video.videoHeight * BOX_TOP);
    const sw = Math.round(video.videoWidth * BOX_WIDTH);
    const sh = Math.round(video.videoHeight * BOX_HEIGHT);

    canvas.width = sw;
    canvas.height = sh;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, sw, sh);

    canvas.toBlob(
      (blob) => {
        if (!blob) { setCapturing(false); return; }
        const file = new File([blob], "capture.jpg", { type: "image/jpeg" });
        stopStream();
        onCapture(file);
      },
      "image/jpeg",
      0.93
    );
  }, [capturing, onCapture]);

  // Fallback if camera fails
  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 py-4 text-center">
        <AlertCircle className="text-amber-500" size={32} />
        <p className="text-sm text-slate-600">
          Kamera ikke tilgjengelig. Bruk filvalgknappen nedenfor.
        </p>
        <Button
          className="bg-blue-600 hover:bg-blue-700 gap-2"
          onClick={onFallback}
        >
          <Camera size={16} /> Velg bilde fra galleri
        </Button>
      </div>
    );
  }

  return (
    <div className="relative w-full" style={{ aspectRatio: "9/16", maxHeight: "70vh", overflow: "hidden", borderRadius: "0.75rem", background: "#000" }}>
      {/* Live video */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        playsInline
        muted
        autoPlay
      />

      {/* Semi-transparent dimmed overlay OUTSIDE the target box */}
      {ready && (
        <>
          {/* Top dim */}
          <div className="absolute inset-x-0 top-0 bg-black/45" style={{ height: "35%" }} />
          {/* Bottom dim */}
          <div className="absolute inset-x-0 bottom-0 bg-black/45" style={{ height: "35%" }} />
          {/* Left dim */}
          <div className="absolute left-0 bg-black/45" style={{ top: "35%", height: "30%", width: "10%" }} />
          {/* Right dim */}
          <div className="absolute right-0 bg-black/45" style={{ top: "35%", height: "30%", width: "10%" }} />

          {/* Target box border */}
          <div
            className="absolute"
            style={{
              top: "35%",
              left: "10%",
              width: "80%",
              height: "30%",
              border: "2px solid rgba(255,255,255,0.85)",
              borderRadius: "8px",
              boxShadow: "0 0 0 1px rgba(255,255,255,0.2)",
              pointerEvents: "none",
            }}
          >
            {/* Corner accents */}
            {[
              { top: -2, left: -2, borderTop: "3px solid #60a5fa", borderLeft: "3px solid #60a5fa" },
              { top: -2, right: -2, borderTop: "3px solid #60a5fa", borderRight: "3px solid #60a5fa" },
              { bottom: -2, left: -2, borderBottom: "3px solid #60a5fa", borderLeft: "3px solid #60a5fa" },
              { bottom: -2, right: -2, borderBottom: "3px solid #60a5fa", borderRight: "3px solid #60a5fa" },
            ].map((style, i) => (
              <div key={i} className="absolute w-5 h-5" style={{ ...style, borderRadius: "2px" }} />
            ))}
          </div>

          {/* Guide label above box */}
          <div
            className="absolute text-white text-xs font-medium text-center"
            style={{ top: "calc(35% - 1.6rem)", left: "10%", width: "80%", opacity: 0.85 }}
          >
            Plasser prisskiltet i boksen
          </div>
        </>
      )}

      {/* Real-time hint */}
      {hint && (
        <div
          className="absolute inset-x-0 flex justify-center"
          style={{ top: "calc(35% + 30% + 0.75rem)" }}
        >
          <div className="bg-black/70 text-white text-sm font-medium px-4 py-2 rounded-full flex items-center gap-2">
            <ZoomIn size={14} className="text-blue-300" />
            {hint}
          </div>
        </div>
      )}

      {/* Zoom indicator (only when zoom is active and supported) */}
      {zoomSupported && currentZoom > ZOOM_DEFAULT + 0.05 && (
        <div className="absolute top-3 right-3 bg-black/60 text-white text-xs px-2 py-1 rounded-lg">
          {currentZoom.toFixed(1)}×
        </div>
      )}

      {/* Loading state */}
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80">
          <div className="flex flex-col items-center gap-2 text-white">
            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
            <span className="text-sm">Starter kamera...</span>
          </div>
        </div>
      )}

      {/* Capture button */}
      {ready && (
        <div className="absolute bottom-5 inset-x-0 flex justify-center">
          <button
            onClick={handleCapture}
            disabled={capturing}
            className="w-16 h-16 rounded-full bg-white border-4 border-blue-400 shadow-lg flex items-center justify-center active:scale-95 transition-transform disabled:opacity-60"
            aria-label="Ta bilde"
          >
            {capturing ? (
              <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-blue-500" />
            )}
          </button>
        </div>
      )}

      {/* Hidden canvases */}
      <canvas ref={canvasRef} className="hidden" />
      <canvas ref={analysisCanvasRef} className="hidden" />
    </div>
  );
}