import React, { useRef, useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Camera, PenLine, Settings, ZoomIn, ZoomOut } from "lucide-react";

export default function PhotoCapture({ onPhoto, onSkip }) {
  const fileRef = useRef();
  const videoRef = useRef();
  const streamRef = useRef(null);
  const trackRef = useRef(null);
  const startTimeoutRef = useRef(null);

  const [mode, setMode] = useState("idle"); // idle | camera
  const [zoom, setZoom] = useState(2);
  const [zoomRange, setZoomRange] = useState({ min: 1, max: 5, step: 0.1 });
  const [supportsZoom, setSupportsZoom] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [cameraError, setCameraError] = useState(null);

  const stopStream = useCallback(() => {
    clearTimeout(startTimeoutRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
      trackRef.current = null;
    }
  }, []);

  useEffect(() => () => stopStream(), [stopStream]);

  const fallbackToNative = useCallback(() => {
    stopStream();
    setMode("idle");
    fileRef.current.value = "";
    fileRef.current.click();
  }, [stopStream]);

  const startCamera = useCallback(async () => {
    setCameraError(null);
    setMode("camera");

    // Safety timeout: if stream doesn't start in 3s, fall back to native
    startTimeoutRef.current = setTimeout(() => {
      if (!streamRef.current) {
        setCameraError("Kameraet svarte ikke — bruker standard kamera.");
        fallbackToNative();
      }
    }, 3000);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      clearTimeout(startTimeoutRef.current);
      streamRef.current = stream;
      const track = stream.getVideoTracks()[0];
      trackRef.current = track;

      // Attach stream to video element
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }

      // Check zoom support (Android Chrome supports this; iOS Safari does not)
      const capabilities = track.getCapabilities?.() || {};
      if (capabilities.zoom) {
        const min = capabilities.zoom.min ?? 1;
        const max = capabilities.zoom.max ?? 5;
        const step = capabilities.zoom.step ?? 0.1;
        setZoomRange({ min, max, step });
        setSupportsZoom(true);
        const defaultZoom = Math.min(2, max);
        setZoom(defaultZoom);
        try {
          await track.applyConstraints({ advanced: [{ zoom: defaultZoom }] });
        } catch (_) {}
      } else {
        setSupportsZoom(false);
      }

    } catch (err) {
      clearTimeout(startTimeoutRef.current);
      // getUserMedia blocked (sandbox/iOS/permission denied) → silent fallback
      setCameraError("Bruker standard kamera.");
      fallbackToNative();
    }
  }, [fallbackToNative]);

  const applyZoom = useCallback(async (value) => {
    setZoom(value);
    if (trackRef.current && supportsZoom) {
      try {
        await trackRef.current.applyConstraints({ advanced: [{ zoom: value }] });
      } catch (_) {}
    }
  }, [supportsZoom]);

  const capturePhoto = useCallback(() => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    setCapturing(true);
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);
    canvas.toBlob(blob => {
      stopStream();
      setMode("idle");
      setCapturing(false);
      if (blob) onPhoto(new File([blob], "price_photo.jpg", { type: "image/jpeg" }));
    }, "image/jpeg", 0.92);
  }, [onPhoto, stopStream]);

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (file) onPhoto(file);
  };

  // ── IN-APP CAMERA ─────────────────────────────────────────────────────────
  if (mode === "camera") {
    return (
      <div className="flex flex-col gap-3">
        <div className="relative rounded-xl overflow-hidden bg-black w-full" style={{ aspectRatio: "16/9" }}>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
          {supportsZoom && (
            <div className="absolute top-3 right-3 bg-black/60 text-white text-xs font-bold px-2 py-1 rounded-lg">
              {zoom.toFixed(1)}×
            </div>
          )}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-20 h-12 border-2 border-white/60 rounded" />
          </div>
        </div>

        {supportsZoom && (
          <div className="flex items-center gap-3 px-1">
            <button onClick={() => applyZoom(Math.max(zoomRange.min, parseFloat((zoom - zoomRange.step).toFixed(1))))}>
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
            <button onClick={() => applyZoom(Math.min(zoomRange.max, parseFloat((zoom + zoomRange.step).toFixed(1))))}>
              <ZoomIn size={20} className="text-slate-500" />
            </button>
          </div>
        )}

        <p className="text-xs text-center text-slate-400">
          {supportsZoom ? "Juster zoom og pek mot prisskiltet" : "Pek mot prisskiltet og hold stille"}
        </p>

        <Button className="bg-blue-600 hover:bg-blue-700 gap-2" onClick={capturePhoto} disabled={capturing}>
          <Camera size={18} /> {capturing ? "Tar bilde…" : "Ta bilde"}
        </Button>

        <div className="flex gap-2">
          <Button variant="outline" className="flex-1 text-sm" onClick={() => { stopStream(); setMode("idle"); }}>
            Avbryt
          </Button>
          <Button variant="outline" className="flex-1 text-sm" onClick={fallbackToNative}>
            Velg fra galleri
          </Button>
        </div>

        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      </div>
    );
  }

  // ── IDLE ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col items-center gap-4 py-8">
      <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center">
        <Camera className="text-blue-600" size={40} />
      </div>
      <h2 className="text-xl font-bold text-slate-800">Ta bilde av prisskiltet</h2>
      <p className="text-slate-500 text-sm text-center max-w-xs">
        Hold telefonen mot prisskiltet. AI leser prisen automatisk.
      </p>

      <Button className="bg-blue-600 hover:bg-blue-700 gap-2 w-full max-w-xs" onClick={startCamera}>
        <Camera size={18} /> Ta bilde
      </Button>

      <Button variant="outline" className="gap-2 w-full max-w-xs" onClick={() => { fileRef.current.value = ""; fileRef.current.removeAttribute("capture"); fileRef.current.click(); }}>
        Velg fra galleri
      </Button>

      {/* Hidden inputs */}
      <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFile} />

      {cameraError && (
        <div className="w-full max-w-xs bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
          <Settings size={16} className="text-amber-600 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-700">{cameraError}</p>
        </div>
      )}

      <button type="button" onClick={onSkip} className="text-sm text-slate-400 hover:text-blue-600 flex items-center gap-1 mt-1">
        <PenLine size={14} /> Skriv inn pris manuelt
      </button>
    </div>
  );
}