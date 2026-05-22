"use client";

import { useState, useCallback, useRef } from "react";
import SelfieCapture from "./SelfieCapture";
import PhotoGallery from "./PhotoGallery";
import MatchingProgress from "./MatchingProgress";
import { getEmbeddingFromAPI, matchPhotos } from "@/lib/faceMatching";
import { fetchEmbeddings, fetchManifest } from "@/lib/storage";
import type { AppState, EmbeddingEntry, ManifestEntry } from "@/lib/types";

const EVENT_NAME = process.env.NEXT_PUBLIC_EVENT_NAME ?? "Wedding Photos";
const PASSCODE   = process.env.NEXT_PUBLIC_EVENT_PASSCODE ?? "";

const DRIVE_LINKS = [
  {
    label: "Nandini · Hathpara + Wedding",
    url: "https://drive.google.com/drive/folders/1kPgO_z1KLMRVTaQPd5StFjGVxtZTJ4qZ?usp=sharing",
    status: "ready" as const,
  },
  {
    label: "Rohan · Hathpara + Wedding",
    url: "https://drive.google.com/drive/folders/1d7BK5QOsiweit_BKxft_FskmWq_IEV9Z?usp=sharing",
    status: "ready" as const,
  },
  {
    label: "Rohan · Sangeet",
    url: "https://drive.google.com/drive/folders/1qPphfVpcCG9Yh-KS9fWyHggR-Wi4xv9h",
    status: "partial" as const,
  },
  {
    label: "Rohan · Haldi",
    url: "https://drive.google.com/drive/folders/16Rjlcck2SL3VlEMmee0zobzNhxVbmMfX",
    status: "soon" as const,
  },
];

const STATUS_BADGE: Record<string, { label: string; color: string }> = {
  ready:   { label: "Ready",       color: "#22c55e" },
  partial: { label: "In progress", color: "#f59e0b" },
  soon:    { label: "Coming soon", color: "#94a3b8" },
};

const INITIAL: AppState = {
  step: "upload",
  matches: [],
  totalEmbeddings: 0,
  errorMessage: "",
};

export default function MainApp() {
  const [state, setState] = useState<AppState>(INITIAL);
  const [viewingAll, setViewingAll] = useState(false);
  const [allManifest, setAllManifest] = useState<ManifestEntry[] | null>(null);
  const [loadingAll, setLoadingAll] = useState(false);

  const embeddingsCache = useRef<EmbeddingEntry[] | null>(null);
  const manifestCache   = useRef<ManifestEntry[] | null>(null);

  const [unlocked, setUnlocked] = useState(!PASSCODE);
  const [passcodeInput, setPasscodeInput] = useState("");
  const [passcodeError, setPasscodeError] = useState(false);

  const checkPasscode = () => {
    if (passcodeInput === PASSCODE) {
      setUnlocked(true);
    } else {
      setPasscodeError(true);
      setTimeout(() => setPasscodeError(false), 1500);
    }
  };

  const handleSelfie = useCallback(async (base64: string) => {
    try {
      setState((s) => ({ ...s, step: "analyzing" }));
      const embedding = await getEmbeddingFromAPI(base64);

      if (!embedding) {
        setState((s) => ({ ...s, step: "no-face" }));
        return;
      }

      setState((s) => ({ ...s, step: "matching" }));
      if (!embeddingsCache.current) {
        const [embs, manifest] = await Promise.all([fetchEmbeddings(), fetchManifest()]);
        embeddingsCache.current = embs;
        manifestCache.current  = manifest;
      }
      setState((s) => ({ ...s, totalEmbeddings: embeddingsCache.current!.length }));

      const matches = await new Promise<string[]>((resolve) => {
        setTimeout(() => resolve(matchPhotos(embedding, embeddingsCache.current!)), 0);
      });

      const sorted = [...matches].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
      setState((s) => ({ ...s, step: "results", matches: sorted }));
    } catch (err) {
      console.error(err);
      setState((s) => ({
        ...s,
        step: "error",
        errorMessage: err instanceof Error ? err.message : "Something went wrong.",
      }));
    }
  }, []);

  const handleViewAll = useCallback(async () => {
    setLoadingAll(true);
    try {
      const manifest = manifestCache.current ?? await fetchManifest();
      manifestCache.current = manifest;
      const sorted = [...manifest].sort((a, b) => a.filename.localeCompare(b.filename, undefined, { sensitivity: "base" }));
      setAllManifest(sorted);
      setViewingAll(true);
    } catch {
      // ignore
    } finally {
      setLoadingAll(false);
    }
  }, []);

  const reset = useCallback(() => {
    setState(INITIAL);
    setViewingAll(false);
  }, []);

  const isProcessing = state.step === "analyzing" || state.step === "matching";

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="px-6 py-4 flex items-center justify-between border-b border-gray-100">
        <div className="flex items-center gap-2">
          <span className="text-xl">💍</span>
          <span className="font-semibold text-sm" style={{ color: "#210235" }}>{EVENT_NAME}</span>
        </div>
        {(state.step === "results" || viewingAll) && (
          <button onClick={reset} className="btn-secondary text-xs py-1.5 px-3">New search</button>
        )}
      </header>

      <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-10">
        {/* Passcode gate */}
        {!unlocked && (
          <div className="flex flex-col items-center justify-center gap-6 min-h-[60vh] animate-fade-in">
            <div className="card p-8 w-full max-w-sm flex flex-col items-center gap-5">
              <span className="text-4xl">🔒</span>
              <div className="text-center">
                <h1 className="text-xl font-bold" style={{ color: "#210235" }}>Enter passcode</h1>
                <p className="text-sm text-gray-400 mt-1">This event is password protected</p>
              </div>
              <input
                type="password"
                value={passcodeInput}
                onChange={(e) => setPasscodeInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && checkPasscode()}
                placeholder="Enter passcode"
                className={`w-full rounded-xl border px-4 py-3 text-sm outline-none focus:ring-2 transition-all ${
                  passcodeError
                    ? "border-red-400 ring-red-100 animate-pulse"
                    : "border-gray-200 focus:ring-[#C231FF30] focus:border-[#C231FF]"
                }`}
              />
              <button onClick={checkPasscode} className="btn-primary w-full">Unlock</button>
            </div>
          </div>
        )}

        {unlocked && (
          <>
            {/* Upload screen */}
            {state.step === "upload" && !viewingAll && (
              <div className="flex flex-col items-center gap-10 animate-fade-in">
                <div className="text-center max-w-lg">
                  <h1 className="text-4xl sm:text-5xl font-bold leading-tight" style={{ color: "#210235" }}>
                    Find your<br />
                    <span style={{ color: "#C231FF" }}>wedding photos</span>
                  </h1>
                  <p className="text-gray-500 mt-4 text-base sm:text-lg">
                    Upload a selfie and we'll instantly find every photo you're in — no account needed.
                  </p>
                </div>

                <div className="card p-6 sm:p-8 w-full max-w-sm">
                  <SelfieCapture onImageReady={handleSelfie} disabled={isProcessing} />
                </div>

                {/* View all photos button */}
                <button
                  onClick={handleViewAll}
                  disabled={loadingAll}
                  className="flex items-center gap-2 text-sm font-medium transition-colors"
                  style={{ color: "#5AAFFE" }}
                >
                  {loadingAll ? (
                    <span className="w-4 h-4 rounded-full border-2 border-[#5AAFFE]/30 border-t-[#5AAFFE] animate-spin inline-block" />
                  ) : (
                    <span>🖼️</span>
                  )}
                  {loadingAll ? "Loading…" : "Browse all photos without face scan"}
                </button>

                {/* How it works */}
                <div className="grid grid-cols-3 gap-4 w-full max-w-lg text-center">
                  {[
                    { icon: "🤳", title: "Upload selfie", desc: "Take or upload a photo of yourself" },
                    { icon: "🔍", title: "Face matching", desc: "ArcFace AI finds you in every photo" },
                    { icon: "📥", title: "Download",      desc: "Save your favorites or grab them all" },
                  ].map((s) => (
                    <div key={s.title} className="flex flex-col items-center gap-2">
                      <span className="text-2xl">{s.icon}</span>
                      <p className="text-xs font-semibold text-gray-700">{s.title}</p>
                      <p className="text-xs text-gray-400 leading-snug">{s.desc}</p>
                    </div>
                  ))}
                </div>

                {/* Photo source links */}
                <div className="w-full max-w-lg">
                  <div
                    className="rounded-2xl p-5 border"
                    style={{ background: "#210235" + "08", borderColor: "#210235" + "18" }}
                  >
                    <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "#210235" }}>
                      📁 Photo sources
                    </p>
                    <div className="flex flex-col gap-2">
                      {DRIVE_LINKS.map((link) => {
                        const badge = STATUS_BADGE[link.status];
                        return (
                          <a
                            key={link.label}
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-between rounded-xl px-3 py-2.5 transition-all hover:opacity-80 gap-3"
                            style={{ background: "white", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <svg width="16" height="16" viewBox="0 0 87.3 78" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
                                <path d="M6.6 66.85l3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8H0a7.8 7.8 0 001.5 4.35l5.1 9.5z" fill="#0066DA"/>
                                <path d="M43.65 25L29.9 1.2C28.55 2 27.4 3.1 26.6 4.5L1.5 48.5A7.8 7.8 0 000 52.85h27.5L43.65 25z" fill="#00AC47"/>
                                <path d="M73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25a7.8 7.8 0 001.2-4.65H59.8L73.55 76.8z" fill="#EA4335"/>
                                <path d="M43.65 25L57.4 1.2A15.6 15.6 0 0043.65 0a15.6 15.6 0 00-13.75 1.2L43.65 25z" fill="#00832D"/>
                                <path d="M59.8 52.85H27.5L13.75 76.65c1.35.8 2.9 1.35 4.5 1.35h50.8c1.6 0 3.15-.45 4.5-1.35L59.8 52.85z" fill="#2684FC"/>
                                <path d="M73.4 26.45L60.7 4.5c-.8-1.4-1.95-2.5-3.3-3.3L43.65 25 59.8 52.85h27.45a7.8 7.8 0 00-1.2-4.65L73.4 26.45z" fill="#FFBA00"/>
                              </svg>
                              <span className="text-xs font-medium text-gray-700 truncate">{link.label}</span>
                            </div>
                            <span
                              className="text-xs font-semibold px-2 py-0.5 rounded-full shrink-0"
                              style={{ background: badge.color + "18", color: badge.color }}
                            >
                              {badge.label}
                            </span>
                          </a>
                        );
                      })}
                    </div>
                    <p className="text-xs text-gray-400 mt-3">
                      Full resolution originals available in Google Drive above.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Processing */}
            {isProcessing && (
              <div className="flex flex-col items-center">
                <MatchingProgress step={state.step} />
                {state.totalEmbeddings > 0 && (
                  <p className="text-xs text-gray-400 mt-2">
                    Scanning {state.totalEmbeddings.toLocaleString()} face embeddings
                  </p>
                )}
              </div>
            )}

            {/* No face */}
            {state.step === "no-face" && (
              <div className="flex flex-col items-center gap-6 py-16 animate-fade-in">
                <span className="text-5xl">🙈</span>
                <div className="text-center">
                  <h2 className="text-xl font-semibold" style={{ color: "#210235" }}>No face detected</h2>
                  <p className="text-gray-500 text-sm mt-2 max-w-sm">
                    Try a clear, well-lit selfie where your face is fully visible.
                  </p>
                </div>
                <button onClick={reset} className="btn-primary">Try again</button>
              </div>
            )}

            {/* Error */}
            {state.step === "error" && (
              <div className="flex flex-col items-center gap-6 py-16 animate-fade-in">
                <span className="text-5xl">⚠️</span>
                <div className="text-center">
                  <h2 className="text-xl font-semibold" style={{ color: "#210235" }}>Something went wrong</h2>
                  <p className="text-gray-500 text-sm mt-2 max-w-sm font-mono">{state.errorMessage}</p>
                </div>
                <button onClick={reset} className="btn-primary">Try again</button>
              </div>
            )}

            {/* Face-match results */}
            {state.step === "results" && manifestCache.current && (
              <PhotoGallery
                matchedFilenames={state.matches}
                manifest={manifestCache.current}
                onReset={reset}
              />
            )}

            {/* Browse all photos */}
            {viewingAll && allManifest && (
              <PhotoGallery
                matchedFilenames={allManifest.map((e) => e.filename)}
                manifest={allManifest}
                onReset={reset}
                browseAll
              />
            )}
          </>
        )}
      </main>

      <footer className="text-center py-6 text-xs text-gray-300">
        Selfies are never stored. All matching happens locally.
      </footer>
    </div>
  );
}
