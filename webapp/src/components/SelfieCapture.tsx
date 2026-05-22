"use client";

import { useRef, useState, useCallback, useEffect } from "react";

interface Props {
  onImageReady: (base64: string) => void;
  disabled?: boolean;
}

function resizeToBase64(img: HTMLImageElement, maxDim = 800): string {
  const scale = Math.min(1, maxDim / Math.max(img.naturalWidth || 800, img.naturalHeight || 800));
  const w = Math.round((img.naturalWidth || 800) * scale);
  const h = Math.round((img.naturalHeight || 800) * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
  const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
  return dataUrl.split(",")[1];
}

export default function SelfieCapture({ onImageReady, disabled }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [preview, setPreview] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    return () => { streamRef.current?.getTracks().forEach((t) => t.stop()); };
  }, []);

  const loadPreview = useCallback((src: string) => {
    setPreview(src);
    setCameraActive(false);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) return;
    loadPreview(URL.createObjectURL(file));
  }, [loadPreview]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      setCameraActive(true);
      setPreview(null);
      requestAnimationFrame(() => {
        if (videoRef.current) videoRef.current.srcObject = stream;
      });
    } catch {
      setCameraError("Camera access denied. Please upload a photo instead.");
    }
  }, []);

  const captureFromCamera = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")!.drawImage(video, 0, 0);
    loadPreview(canvas.toDataURL("image/jpeg", 0.92));
  }, [loadPreview]);

  const handleFind = useCallback(() => {
    const img = imgRef.current;
    if (!img) return;
    const base64 = resizeToBase64(img);
    onImageReady(base64);
  }, [onImageReady]);

  const reset = useCallback(() => {
    setPreview(null);
    setCameraActive(false);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-sm mx-auto">
      {!preview && !cameraActive && (
        <div
          className={`upload-zone w-full ${dragOver ? "dragover" : ""}`}
          onClick={() => fileRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
        >
          <div className="w-16 h-16 rounded-full flex items-center justify-center text-3xl" style={{ background: "#C231FF15" }}>
            🤳
          </div>
          <div className="text-center">
            <p className="font-semibold text-gray-800">Upload a selfie</p>
            <p className="text-sm text-gray-400 mt-0.5">Drag & drop or click to browse</p>
          </div>
          <p className="text-xs text-gray-300">JPG, PNG, WEBP</p>
        </div>
      )}

      {cameraActive && (
        <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black">
          <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
          <button onClick={captureFromCamera} className="absolute bottom-4 left-1/2 -translate-x-1/2 btn-primary px-8">
            Capture
          </button>
          <button onClick={reset} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 text-white text-sm flex items-center justify-center hover:bg-black/70">
            ✕
          </button>
        </div>
      )}

      {preview && (
        <div className="relative w-full">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img ref={imgRef} src={preview} alt="Your selfie" crossOrigin="anonymous"
            className="w-full rounded-2xl object-cover max-h-64 shadow-md" />
          <button onClick={reset} className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 text-white text-xs flex items-center justify-center hover:bg-black/70">
            ✕
          </button>
        </div>
      )}

      <canvas ref={canvasRef} className="hidden" />

      {cameraError && <p className="text-xs text-red-500 text-center">{cameraError}</p>}

      <div className="flex gap-3 w-full">
        {!cameraActive && (
          <button onClick={startCamera} disabled={disabled} className="btn-secondary flex-1">
            📷 Use Camera
          </button>
        )}
        {preview && (
          <button onClick={handleFind} disabled={disabled} className="btn-primary flex-1">
            Find My Photos
          </button>
        )}
      </div>

      <input ref={fileRef} type="file" accept="image/*" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />
    </div>
  );
}
