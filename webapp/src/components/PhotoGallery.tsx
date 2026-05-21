"use client";

import { useState, useEffect, useCallback } from "react";
import JSZip from "jszip";
import PhotoCard from "./PhotoCard";
import { photoUrl } from "@/lib/storage";
import type { ManifestEntry } from "@/lib/types";

interface Props {
  matchedFilenames: string[];
  manifest: ManifestEntry[];
  onReset: () => void;
}

export default function PhotoGallery({ matchedFilenames, manifest, onReset }: Props) {
  const [downloading, setDownloading] = useState(false);
  const [dlProgress, setDlProgress] = useState(0);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [fullLoaded, setFullLoaded] = useState(false);

  // Deduplicate by filename
  const seen = new Set<string>();
  const photos = matchedFilenames.filter((f) => (seen.has(f) ? false : (seen.add(f), true)));
  const entryMap = new Map(manifest.map((m) => [m.filename, m]));

  const openAt = (i: number) => { setLightboxIndex(i); setFullLoaded(false); };
  const close = () => setLightboxIndex(null);
  const prev = useCallback(() => {
    setLightboxIndex((i) => { if (i === null) return null; setFullLoaded(false); return (i - 1 + photos.length) % photos.length; });
  }, [photos.length]);
  const next = useCallback(() => {
    setLightboxIndex((i) => { if (i === null) return null; setFullLoaded(false); return (i + 1) % photos.length; });
  }, [photos.length]);

  useEffect(() => {
    if (lightboxIndex === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft")  prev();
      if (e.key === "ArrowRight") next();
      if (e.key === "Escape")     close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxIndex, prev, next]);

  const downloadSingle = async (e: React.MouseEvent, filename: string) => {
    e.stopPropagation();
    try {
      const res = await fetch(photoUrl(filename));
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = filename; a.click();
      URL.revokeObjectURL(url);
    } catch {
      window.open(photoUrl(filename), "_blank");
    }
  };

  const downloadAll = async () => {
    if (downloading) return;
    setDownloading(true); setDlProgress(0);
    try {
      const zip = new JSZip();
      const folder = zip.folder("wedding-photos")!;
      for (let i = 0; i < photos.length; i++) {
        const res = await fetch(photoUrl(photos[i]));
        if (res.ok) folder.file(photos[i], await res.blob());
        setDlProgress(Math.round(((i + 1) / photos.length) * 100));
      }
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = "wedding-photos.zip"; a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Download failed. Try downloading photos individually.");
    } finally {
      setDownloading(false); setDlProgress(0);
    }
  };

  const currentFilename = lightboxIndex !== null ? photos[lightboxIndex] : null;

  return (
    <div className="animate-slide-up w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold" style={{ color: "#210235" }}>
              {photos.length === 0 ? "No matches found" : `${photos.length} photo${photos.length === 1 ? "" : "s"} found`}
            </h2>
            {photos.length > 0 && (
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full text-white" style={{ background: "linear-gradient(135deg, #C231FF, #9b1fd4)" }}>
                ✓ matched
              </span>
            )}
          </div>
          {photos.length > 0 && (
            <p className="text-sm text-gray-400 mt-1">Click any photo to view · use ← → arrows to browse</p>
          )}
        </div>

        <div className="flex gap-2 shrink-0">
          <button onClick={onReset} className="btn-secondary">Try another selfie</button>
          {photos.length > 0 && (
            <button onClick={downloadAll} disabled={downloading} className="btn-primary">
              {downloading ? `Downloading ${dlProgress}%…` : `↓ Download all`}
            </button>
          )}
        </div>
      </div>

      {/* Empty state */}
      {photos.length === 0 && (
        <div className="text-center py-20 text-gray-400">
          <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4 text-3xl">😔</div>
          <p className="font-semibold text-gray-600">No photos found</p>
          <p className="text-sm mt-1">Try a clearer selfie with good lighting and a visible face.</p>
        </div>
      )}

      {/* Grid */}
      {photos.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {photos.map((filename, i) => {
            const entry = entryMap.get(filename);
            return (
              <PhotoCard
                key={filename}
                filename={filename}
                thumbnailName={entry?.thumbnail ?? filename}
                onOpen={() => openAt(i)}
                onDownload={(e) => downloadSingle(e, filename)}
              />
            );
          })}
        </div>
      )}

      {/* Lightbox */}
      {lightboxIndex !== null && currentFilename && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center animate-fade-in overflow-hidden"
          style={{ background: "rgba(0,0,0,0.92)", backdropFilter: "blur(12px)" }}
          onClick={close}
        >
          {/* Image — padded away from top/bottom chrome */}
          <div
            className="relative flex items-center justify-center"
            style={{ width: "90vw", height: "calc(100vh - 120px)" }}
          >
            {!fullLoaded && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="w-10 h-10 rounded-full border-2 border-white/20 border-t-white animate-spin" />
              </div>
            )}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photoUrl(currentFilename)}
              alt={currentFilename}
              style={{ maxWidth: "90vw", maxHeight: "calc(100vh - 120px)", width: "auto", height: "auto" }}
              className={`rounded-xl object-contain shadow-2xl transition-opacity duration-300 cursor-default ${fullLoaded ? "opacity-100" : "opacity-0"}`}
              onClick={(e) => e.stopPropagation()}
              onLoad={() => setFullLoaded(true)}
            />
          </div>

          {/* Prev arrow */}
          <button
            onClick={(e) => { e.stopPropagation(); prev(); }}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full flex items-center justify-center text-2xl text-white transition-all hover:scale-110"
            style={{ background: "rgba(255,255,255,0.12)", backdropFilter: "blur(8px)" }}
          >
            ‹
          </button>

          {/* Next arrow */}
          <button
            onClick={(e) => { e.stopPropagation(); next(); }}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full flex items-center justify-center text-2xl text-white transition-all hover:scale-110"
            style={{ background: "rgba(255,255,255,0.12)", backdropFilter: "blur(8px)" }}
          >
            ›
          </button>

          {/* Top bar */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
            <span className="text-white/60 text-sm font-medium">
              {lightboxIndex + 1} / {photos.length}
            </span>
          </div>

          {/* Top-right controls */}
          <div className="absolute top-4 right-4 flex gap-2" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={(e) => downloadSingle(e, currentFilename)}
              className="btn-primary py-2 px-4 text-sm"
            >
              ↓ Download
            </button>
            <button
              onClick={close}
              className="w-9 h-9 rounded-full flex items-center justify-center text-white transition-all hover:scale-110"
              style={{ background: "rgba(255,255,255,0.12)", backdropFilter: "blur(8px)" }}
            >
              ✕
            </button>
          </div>

          {/* Filename bottom */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
            <span className="text-white/50 text-xs font-mono">{currentFilename}</span>
          </div>
        </div>
      )}
    </div>
  );
}
