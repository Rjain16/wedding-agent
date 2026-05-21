"use client";

import { useState } from "react";
import JSZip from "jszip";
import PhotoCard from "./PhotoCard";
import { photoUrl, thumbnailUrl } from "@/lib/storage";
import type { ManifestEntry } from "@/lib/types";

interface Props {
  matchedFilenames: string[];
  manifest: ManifestEntry[];
  onReset: () => void;
}

export default function PhotoGallery({ matchedFilenames, manifest, onReset }: Props) {
  const [downloading, setDownloading] = useState(false);
  const [dlProgress, setDlProgress] = useState(0);

  // Build a filename → manifest entry lookup
  const entryMap = new Map(manifest.map((m) => [m.filename, m]));

  const downloadAll = async () => {
    if (downloading) return;
    setDownloading(true);
    setDlProgress(0);

    try {
      const zip = new JSZip();
      const folder = zip.folder("wedding-photos")!;

      for (let i = 0; i < matchedFilenames.length; i++) {
        const name = matchedFilenames[i];
        const res = await fetch(photoUrl(name));
        if (res.ok) {
          folder.file(name, await res.blob());
        }
        setDlProgress(Math.round(((i + 1) / matchedFilenames.length) * 100));
      }

      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "wedding-photos.zip";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download failed", err);
      alert("Download failed. Try downloading photos individually.");
    } finally {
      setDownloading(false);
      setDlProgress(0);
    }
  };

  return (
    <div className="animate-slide-up w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: "#210235" }}>
            {matchedFilenames.length === 0
              ? "No matches found"
              : `${matchedFilenames.length} photo${matchedFilenames.length === 1 ? "" : "s"} found`}
          </h2>
          {matchedFilenames.length > 0 && (
            <p className="text-sm text-gray-400 mt-0.5">Click any photo to view full size</p>
          )}
        </div>

        <div className="flex gap-2 shrink-0">
          <button onClick={onReset} className="btn-secondary">
            Try another selfie
          </button>
          {matchedFilenames.length > 0 && (
            <button
              onClick={downloadAll}
              disabled={downloading}
              className="btn-primary"
            >
              {downloading ? (
                <>Downloading {dlProgress}%…</>
              ) : (
                <>↓ Download all</>
              )}
            </button>
          )}
        </div>
      </div>

      {/* No results */}
      {matchedFilenames.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-4">😔</p>
          <p className="font-medium">We couldn't find any photos matching your face.</p>
          <p className="text-sm mt-1">Try a clearer selfie with good lighting.</p>
        </div>
      )}

      {/* Grid */}
      {matchedFilenames.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {matchedFilenames.map((filename) => {
            const entry = entryMap.get(filename);
            return (
              <PhotoCard
                key={filename}
                filename={filename}
                thumbnailName={entry?.thumbnail ?? filename}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
