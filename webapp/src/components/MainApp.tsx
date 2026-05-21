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

const INITIAL: AppState = {
  step: "upload",
  matches: [],
  totalEmbeddings: 0,
  errorMessage: "",
};

export default function MainApp() {
  const [state, setState] = useState<AppState>(INITIAL);

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
      // Step 1 — get ArcFace embedding via API (InsightFace / RetinaFace)
      setState((s) => ({ ...s, step: "analyzing" }));
      const embedding = await getEmbeddingFromAPI(base64);

      if (!embedding) {
        setState((s) => ({ ...s, step: "no-face" }));
        return;
      }

      // Step 2 — fetch embeddings (cached after first run)
      setState((s) => ({ ...s, step: "matching" }));
      if (!embeddingsCache.current) {
        const [embs, manifest] = await Promise.all([fetchEmbeddings(), fetchManifest()]);
        embeddingsCache.current = embs;
        manifestCache.current  = manifest;
      }
      setState((s) => ({ ...s, totalEmbeddings: embeddingsCache.current!.length }));

      // Step 3 — cosine similarity matching in browser
      const matches = await new Promise<string[]>((resolve) => {
        setTimeout(() => resolve(matchPhotos(embedding, embeddingsCache.current!)), 0);
      });

      setState((s) => ({ ...s, step: "results", matches }));
    } catch (err) {
      console.error(err);
      setState((s) => ({
        ...s,
        step: "error",
        errorMessage: err instanceof Error ? err.message : "Something went wrong.",
      }));
    }
  }, []);

  const reset = useCallback(() => setState(INITIAL), []);

  const isProcessing = state.step === "analyzing" || state.step === "matching";

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="px-6 py-4 flex items-center justify-between border-b border-gray-100">
        <div className="flex items-center gap-2">
          <span className="text-xl">💍</span>
          <span className="font-semibold text-sm" style={{ color: "#210235" }}>{EVENT_NAME}</span>
        </div>
        {state.step === "results" && (
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
            {/* Upload */}
            {state.step === "upload" && (
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

            {/* Results */}
            {state.step === "results" && manifestCache.current && (
              <PhotoGallery
                matchedFilenames={state.matches}
                manifest={manifestCache.current}
                onReset={reset}
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
