import type { EmbeddingEntry, ManifestEntry } from "./types";

const BASE = (process.env.NEXT_PUBLIC_STORAGE_BASE_URL ?? "").replace(/\/$/, "");

export function photoUrl(filename: string): string {
  return `${BASE}/photos/${filename}`;
}

export function thumbnailUrl(thumbnailName: string): string {
  return `${BASE}/thumbnails/${thumbnailName}`;
}

const BUST = Date.now();

export async function fetchEmbeddings(): Promise<EmbeddingEntry[]> {
  const res = await fetch(`${BASE}/embeddings.json?v=${BUST}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to fetch embeddings (${res.status})`);
  return res.json() as Promise<EmbeddingEntry[]>;
}

export async function fetchManifest(): Promise<ManifestEntry[]> {
  const res = await fetch(`${BASE}/manifest.json?v=${BUST}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to fetch manifest (${res.status})`);
  return res.json() as Promise<ManifestEntry[]>;
}
