"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import JSZip from "jszip";
import PhotoCard from "./PhotoCard";
import { photoUrl } from "@/lib/storage";
import type { ManifestEntry } from "@/lib/types";

// 3 rows of the grid — gives ~10 on mobile (2 cols), ~15 on laptop (5 cols)
function calcBatch(): number {
  if (typeof window === "undefined") return 15;
  const w = window.innerWidth;
  const cols = w >= 1024 ? 5 : w >= 768 ? 4 : w >= 640 ? 3 : 2;
  return cols * 3;
}

interface Props {
  matchedFilenames: string[];
  manifest: ManifestEntry[];
  onReset: () => void;
  browseAll?: boolean;
}

export default function PhotoGallery({ matchedFilenames, manifest, onReset, browseAll = false }: Props) {
  const [downloading, setDownloading] = useState(false);
  const [dlProgress, setDlProgress] = useState(0);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [fullLoaded, setFullLoaded] = useState(false);
  const [visibleCount, setVisibleCount] = useState(() => calcBatch());
  const batchRef = useRef(calcBatch());
  const sentinelRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);

  // Deduplicate by filename
  const seen = new Set<string>();
  const photos = matchedFilenames.filter((f) => (seen.has(f) ? false : (seen.add(f), true)));
  const entryMap = new Map(manifest.map((m) => [m.filename, m]));

  // Recalculate batch on resize and reset on new results
  useEffect(() => {
    const update = () => { batchRef.current = calcBatch(); };
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => {
    const b = calcBatch();
    batchRef.current = b;
    setVisibleCount(b);
  }, [photos.length]);

  // Infinite scroll sentinel
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || visibleCount >= photos.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((c) => Math.min(c + batchRef.current, photos.length));
        }
      },
      { rootMargin: "300px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [visibleCount, photos.length]);

  const openAt = (i: number) => { setLightboxIndex(i); setFullLoaded(false); };
  const close = () => setLightboxIndex(null);
  const prev = useCallback(() => {
    setLightboxIndex((i) => { if (i === null) return null; setFullLoaded(false); return (i - 1 + photos.length) % photos.length; });
  }, [photos.length]);
  const next = useCallback(() => {
    setLightboxIndex((i) => { if (i === null) return null; setFullLoaded(false); return (i + 1) % photos.length; });
  }, [photos.length]);

  // Keyboard navigation
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

  // Touch swipe handlers
  const onTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (dx < -50) next();
    else if (dx > 50) prev();
    touchStartX.current = null;
  };

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
  const visiblePhotos = photos.slice(0, visibleCount);

  return (
    <>
      <div className="animate-slide-up w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold" style={{ color: "#210235" }}>
              {browseAll
                ? `All ${photos.length} photos`
                : photos.length === 0 ? "No matches found" : `${photos.length} photo${photos.length === 1 ? "" : "s"} found`}
            </h2>
            {photos.length > 0 && !browseAll && (
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full text-white" style={{ background: "linear-gradient(135deg, #C231FF, #9b1fd4)" }}>
                ✓ matched
              </span>
            )}
            {browseAll && (
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full text-white" style={{ background: "linear-gradient(135deg, #5AAFFE, #1F22B2)" }}>
                sorted A–Z
              </span>
            )}
          </div>
          {photos.length > 0 && (
            <p className="text-sm text-gray-400 mt-1">
              {browseAll ? "All photos sorted by name · tap to view" : "Tap any photo to view · swipe or use ← → to browse"}
            </p>
          )}
        </div>

        <div className="flex gap-2 shrink-0">
          <button onClick={onReset} className="btn-secondary">{browseAll ? "← Back" : "Try another selfie"}</button>
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

      {/* Grid — only renders visibleCount photos */}
      {photos.length > 0 && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {visiblePhotos.map((filename, i) => {
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

          {/* Sentinel + loading indicator */}
          {visibleCount < photos.length && (
            <div ref={sentinelRef} className="flex justify-center py-8">
              <div className="w-6 h-6 rounded-full border-2 border-gray-300 border-t-gray-600 animate-spin" />
            </div>
          )}
          {visibleCount >= photos.length && photos.length > batchRef.current && (
            <p className="text-center text-xs text-gray-400 py-6">All {photos.length} photos loaded</p>
          )}
        </>
      )}

      </div>{/* end animate-slide-up */}

      {/* Lightbox — outside the transformed parent so position:fixed works relative to viewport */}
      {lightboxIndex !== null && currentFilename && (
        <div
          className="fixed inset-0 z-50 animate-fade-in flex items-start justify-center cursor-pointer"
          style={{ background: "rgba(0,0,0,0.88)", padding: "12px 12px 12px" }}
          onClick={close}
        >
          {/* Modal fills the remaining viewport — click inside does NOT close */}
          <div
            className="relative flex flex-col cursor-default rounded-2xl overflow-hidden w-full"
            style={{
              maxWidth: 1200,
              height: "calc(100vh - 24px)",
              background: "rgba(10,10,10,0.98)",
              boxShadow: "0 32px 80px rgba(0,0,0,0.9)",
            }}
            onClick={(e) => e.stopPropagation()}
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
          >
            {/* Top bar */}
            <div className="flex items-center justify-between px-3 py-2.5 shrink-0 border-b border-white/10">
              <span className="text-white/40 text-xs font-mono truncate max-w-[40%]">{currentFilename}</span>
              <div className="flex items-center gap-2">
                <span className="text-white/50 text-xs sm:text-sm">{lightboxIndex + 1} / {photos.length}</span>
                <button
                  onClick={(e) => downloadSingle(e, currentFilename)}
                  className="btn-primary py-1.5 px-3 text-xs sm:text-sm"
                >
                  ↓ Save
                </button>
                <button
                  onClick={close}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-base transition-all hover:scale-110"
                  style={{ background: "rgba(255,255,255,0.25)" }}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Image + nav */}
            <div className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-3 sm:py-4 min-h-0 flex-1">
              <button
                onClick={(e) => { e.stopPropagation(); prev(); }}
                className="shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-xl sm:text-2xl text-white transition-all active:scale-95"
                style={{ background: "rgba(255,255,255,0.12)" }}
              >
                ‹
              </button>

              <div className="relative flex-1 flex items-center justify-center min-w-0" style={{ minHeight: 180 }}>
                {!fullLoaded && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                  </div>
                )}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photoUrl(currentFilename)}
                  alt={currentFilename}
                  style={{ maxWidth: "100%", maxHeight: "calc(100vh - 120px)", objectFit: "contain" }}
                  className={`rounded-lg shadow-2xl transition-opacity duration-300 ${fullLoaded ? "opacity-100" : "opacity-0"}`}
                  onLoad={() => setFullLoaded(true)}
                />
              </div>

              <button
                onClick={(e) => { e.stopPropagation(); next(); }}
                className="shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-xl sm:text-2xl text-white transition-all active:scale-95"
                style={{ background: "rgba(255,255,255,0.12)" }}
              >
                ›
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
