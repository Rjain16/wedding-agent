"use client";

import { useState } from "react";
import { thumbnailUrl } from "@/lib/storage";

interface Props {
  filename: string;
  thumbnailName: string;
  onOpen: () => void;
  onDownload?: (e: React.MouseEvent) => void;
}

export default function PhotoCard({ filename, thumbnailName, onOpen, onDownload }: Props) {
  const [thumbLoaded, setThumbLoaded] = useState(false);

  return (
    <div
      className="group relative overflow-hidden rounded-2xl bg-gray-100 cursor-pointer aspect-square shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5"
      onClick={onOpen}
    >
      {!thumbLoaded && (
        <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200 animate-pulse-slow" />
      )}

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={thumbnailUrl(thumbnailName)}
        alt={filename}
        loading="lazy"
        className={`w-full h-full object-cover transition-all duration-500 group-hover:scale-105 ${thumbLoaded ? "opacity-100" : "opacity-0"}`}
        onLoad={() => setThumbLoaded(true)}
      />

      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-end justify-between p-2.5">
        <span className="text-white/80 text-xs truncate max-w-[80%] drop-shadow">{filename}</span>
        {onDownload && (
          <button
            onClick={onDownload}
            className="w-8 h-8 rounded-full bg-white/90 hover:bg-white flex items-center justify-center text-sm shadow transition-all hover:scale-110"
            title="Download"
          >
            ↓
          </button>
        )}
      </div>
    </div>
  );
}
