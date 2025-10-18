import React, { useCallback, useRef, useState } from "react";
import { UploadCloud, Image as ImageIcon } from "lucide-react";

export default function UploadZone({ onImage }) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef();

  const handleFiles = useCallback((files) => {
    const f = files?.[0];
    if (!f) return;
    const img = new Image();
    img.onload = () => onImage(img, f);
    img.onerror = () => alert("Failed to load image");
    img.src = URL.createObjectURL(f);
  }, [onImage]);

  return (
    <div
      className={`rounded-2xl border-2 border-dashed p-6 text-center transition-colors ${dragOver ? "border-accent" : "border-white/20"}`}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
    >
      <div className="flex flex-col items-center gap-2 text-muted">
        <UploadCloud />
        <p className="text-sm">Drag & drop image here or</p>
        <button
          className="rounded-xl bg-primary/90 px-4 py-2 text-bg"
          onClick={() => inputRef.current?.click()}
        >
          Choose Image
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <p className="text-xs opacity-70 mt-2"><ImageIcon className="inline size-4 mr-1" />PNG/BMP recommended</p>
      </div>
    </div>
  );
}





