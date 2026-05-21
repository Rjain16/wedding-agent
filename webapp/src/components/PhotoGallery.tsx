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
          className="fixed inset-0 z-50 animate-fade-in flex items-center justify-center cursor-pointer"
          style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)" }}
          onClick={close}
        >
          {/* Modal box — clicking inside does NOT close */}
          <div
            className="relative flex flex-col cursor-default rounded-2xl overflow-hidden"
            style={{
              width: "min(88vw, 1100px)",
              maxHeight: "88vh",
              background: "rgba(10,10,10,0.97)",
              boxShadow: "0 32px 80px rgba(0,0,0,0.9)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top bar */}
            <div className="flex items-center justify-between px-4 py-3 shrink-0 border-b border-white/10">
              <span className="text-white/40 text-xs font-mono truncate max-w-[50%]">{currentFilename}</span>
              <div className="flex items-center gap-2">
                <span className="text-white/50 text-sm">{lightboxIndex + 1} / {photos.length}</span>
                <button onClick={(e) => downloadSingle(e, currentFilename)} className="btn-primary py-1.5 px-3 text-sm">
                  ↓ Download
                </button>
                <button
                  onClick={close}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white/70 hover:text-white transition-all hover:scale-110"
                  style={{ background: "rgba(255,255,255,0.1)" }}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Image + nav row */}
            <div className="flex items-center gap-2 px-3 py-4 min-h-0 flex-1">
              <button
                onClick={(e) => { e.stopPropagation(); prev(); }}
                className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-2xl text-white transition-all hover:scale-110"
                style={{ background: "rgba(255,255,255,0.12)" }}
              >
                ‹
              </button>

              <div className="relative flex-1 flex items-center justify-center min-w-0" style={{ minHeight: 200 }}>
                {!fullLoaded && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-10 h-10 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                  </div>
                )}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photoUrl(currentFilename)}
                  alt={currentFilename}
                  style={{ maxWidth: "100%", maxHeight: "calc(88vh - 110px)", objectFit: "contain" }}
                  className={`rounded-lg shadow-2xl transition-opacity duration-300 ${fullLoaded ? "opacity-100" : "opacity-0"}`}
                  onLoad={() => setFullLoaded(true)}
                />
              </div>

              <button
                onClick={(e) => { e.stopPropagation(); next(); }}
                className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-2xl text-white transition-all hover:scale-110"
                style={{ background: "rgba(255,255,255,0.12)" }}
              >
                ›
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
