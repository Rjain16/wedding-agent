import type { EmbeddingEntry, ManifestEntry } from "./types";

export function photoUrl(filename: string): string {
  return `/api/asset/photos/${encodeURIComponent(filename)}`;
}

export function thumbnailUrl(thumbnailName: string): string {
  return `/api/asset/thumbnails/${encodeURIComponent(thumbnailName)}`;
}

export async function fetchEmbeddings(): Promise<EmbeddingEntry[]> {
  const res = await fetch("/api/data/embeddings", { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to fetch embeddings (${res.status})`);
  return res.json() as Promise<EmbeddingEntry[]>;
}

export async function fetchManifest(): Promise<ManifestEntry[]> {
  const res = await fetch("/api/data/manifest", { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to fetch manifest (${res.status})`);
  return res.json() as Promise<ManifestEntry[]>;
}
