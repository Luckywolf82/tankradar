import React, { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Camera, Upload } from "lucide-react";

export default function PhotoCapture({ onPhoto }) {
  const fileRef = useRef();

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (file) onPhoto(file);
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
    </div>
  );
}