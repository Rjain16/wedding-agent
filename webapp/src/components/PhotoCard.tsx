"use client";

import { useState } from "react";
import { thumbnailUrl, photoUrl } from "@/lib/storage";

interface Props {
  filename: string;
  thumbnailName: string;
}

export default function PhotoCard({ filename, thumbnailName }: Props) {
  const [lightbox, setLightbox] = useState(false);
  const [thumbLoaded, setThumbLoaded] = useState(false);

  const thumb = thumbnailUrl(thumbnailName);
  const full = photoUrl(filename);

  const download = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch(full);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      window.open(full, "_blank");
    }
  };

  return (
    <>
      <div
        className="group relative overflow-hidden rounded-xl bg-gray-100 cursor-pointer aspect-square"
        onClick={() => setLightbox(true)}
      >
        {/* Skeleton */}
        {!thumbLoaded && (
          <div className="absolute inset-0 bg-gray-100 animate-pulse-slow" />
        )}

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={thumb}
          alt={filename}
          loading="lazy"
          className={`w-full h-full object-cover transition-all duration-300 group-hover:scale-105 ${thumbLoaded ? "opacity-100" : "opacity-0"}`}
          onLoad={() => setThumbLoaded(true)}
        />

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-200 flex items-end justify-end p-2">
          <button
            onClick={download}
            className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 w-8 h-8 rounded-full bg-white/90 hover:bg-white flex items-center justify-center text-sm shadow"
            title="Download"
          >
            ↓
          </button>
        </div>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setLightbox(false)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={full}
            alt={filename}
            className="max-w-full max-h-full rounded-xl object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          <div className="absolute top-4 right-4 flex gap-2">
            <button
              onClick={download}
              className="btn-primary py-2 px-4 text-sm"
            >
              ↓ Download
            </button>
            <button
              onClick={() => setLightbox(false)}
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </>
  );
}
