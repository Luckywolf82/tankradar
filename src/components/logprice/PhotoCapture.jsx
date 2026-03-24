import React, { useRef, useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Camera, PenLine, Settings, ZoomIn, ZoomOut, SwitchCamera } from "lucide-react";

export default function PhotoCapture({ onPhoto, onSkip }) {
  const fileRef = useRef();
  const videoRef = useRef();
  const streamRef = useRef(null);
  const trackRef = useRef(null);

  const [mode, setMode] = useState("idle"); // idle | camera | fallback_help
  const [zoom, setZoom] = useState(2);
  const [zoomRange, setZoomRange] = useState({ min: 1, max: 5, step: 0.1 });
  const [supportsZoom, setSupportsZoom] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [cameraError, setCameraError] = useState(null);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
      trackRef.current = null;
    }
  }, []);

  // Start in-app camera with zoom support
  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      streamRef.current = stream;
      const track = stream.getVideoTracks()[0];
      trackRef.current = track;

      // Check zoom support
      const capabilities = track.getCapabilities?.() || {};
      if (capabilities.zoom) {
        const min = capabilities.zoom.min ?? 1;
        const max = capabilities.zoom.max ?? 5;
        const step = capabilities.zoom.step ?? 0.1;
        setZoomRange({ min, max, step });
        setSupportsZoom(true);

        // Apply 2x zoom automatically (clamped to what device supports)
        const defaultZoom = Math.min(2, max);
        setZoom(defaultZoom);
        await track.applyConstraints({ advanced: [{ zoom: defaultZoom }] });
      } else {
        setSupportsZoom(false);
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setMode("camera");
    } catch (err) {
      stopStream();
      // getUserMedia not supported or denied — fall back to file input
      setCameraError(err.message);
      setMode("idle");
      // Try native camera via file input as fallback
      fileRef.current?.click();
    }
  }, [stopStream]);

  // Apply zoom when slider changes
  const applyZoom = useCallback(async (value) => {
    setZoom(value);
    if (trackRef.current && supportsZoom) {
      try {
        await trackRef.current.applyConstraints({ advanced: [{ zoom: value }] });
      } catch (_) {}
    }
  }, [supportsZoom]);

  // Capture frame from video
  const capturePhoto = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    setCapturing(true);

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);

    canvas.toBlob(blob => {
      stopStream();
      setMode("idle");
      setCapturing(false);
      if (blob) {
        const file = new File([blob], "price_photo.jpg", { type: "image/jpeg" });
        onPhoto(file);
      }
    }, "image/jpeg", 0.92);
  }, [onPhoto, stopStream]);

  // Cleanup on unmount
  useEffect(() => () => stopStream(), [stopStream]);

  // Native file fallback handler
  const handleFile = (e) => {
    const file = e.target.files[0];
    if (file) onPhoto(file);
  };

  const handleOpenCamera = () => {
    // Try in-app camera first (supports zoom)
    if (navigator.mediaDevices?.getUserMedia) {
      startCamera();
    } else {
      fileRef.current?.click();
    }
  };

  // ── IN-APP CAMERA VIEW ──────────────────────────────────────────────────
  if (mode === "camera") {
    return (
      <div className="flex flex-col gap-3">
        <div className="relative rounded-xl overflow-hidden bg-black aspect-video w-full">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
          {/* Zoom indicator */}
          {supportsZoom && (
            <div className="absolute top-3 right-3 bg-black/60 text-white text-xs font-bold px-2 py-1 rounded-lg">
              {zoom.toFixed(1)}×
            </div>
          )}
          {/* Crosshair guide */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-16 h-16 border-2 border-white/50 rounded-sm" />
          </div>
        </div>

        {/* Zoom slider — only shown when device supports it */}
        {supportsZoom && (
          <div className="flex items-center gap-3 px-1">
            <button onClick={() => applyZoom(Math.max(zoomRange.min, +(zoom - zoomRange.step).toFixed(1)))}>
              <ZoomOut size={20} className="text-slate-500" />
            </button>
            <input
              type="range"
              min={zoomRange.min}
              max={zoomRange.max}
              step={zoomRange.step}
              value={zoom}
              onChange={e => applyZoom(parseFloat(e.target.value))}
              className="flex-1 accent-blue-600"
            />
            <button onClick={() => applyZoom(Math.min(zoomRange.max, +(zoom + zoomRange.step).toFixed(1)))}>
              <ZoomIn size={20} className="text-slate-500" />
            </button>
          </div>
        )}

        <p className="text-xs text-center text-slate-400">
          {supportsZoom
            ? "Optisk zoom — pek mot prisskiltet og juster zoom"
            : "Pek mot prisskiltet og hold stille"}
        </p>

        <Button
          className="bg-blue-600 hover:bg-blue-700 gap-2"
          onClick={capturePhoto}
          disabled={capturing}
        >
          <Camera size={18} />
          {capturing ? "Tar bilde…" : "Ta bilde"}
        </Button>

        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1 text-sm"
            onClick={() => { stopStream(); setMode("idle"); }}
          >
            Avbryt
          </Button>
          <Button
            variant="outline"
            className="flex-1 text-sm gap-1"
            onClick={() => { stopStream(); fileRef.current?.click(); }}
          >
            <SwitchCamera size={14} /> Velg fra galleri
          </Button>
        </div>

        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      </div>
    );
  }

  // ── IDLE / ENTRY VIEW ───────────────────────────────────────────────────
  return (
    <div className="flex flex-col items-center gap-4 py-8">
      <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center">
        <Camera className="text-blue-600" size={40} />
      </div>
      <h2 className="text-xl font-bold text-slate-800">Ta bilde av prisskiltet</h2>
      <p className="text-slate-500 text-sm text-center max-w-xs">
        Hold telefonen mot prisskiltet. Kameraet starter med 2× zoom for skarpere avlesning.
      </p>

      <Button
        className="bg-blue-600 hover:bg-blue-700 gap-2 w-full max-w-xs"
        onClick={handleOpenCamera}
      >
        <Camera size={18} /> Åpne kamera
      </Button>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFile}
      />

      {cameraError && (
        <div className="w-full max-w-xs bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-col gap-3">
          <div className="flex items-start gap-2">
            <Settings size={18} className="text-amber-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-800">Kamera åpnet ikke automatisk</p>
              <p className="text-xs text-amber-700 mt-0.5">
                Sjekk at TankRadar har tillatelse til å bruke kameraet, eller velg bilde fra galleriet.
              </p>
            </div>
          </div>
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