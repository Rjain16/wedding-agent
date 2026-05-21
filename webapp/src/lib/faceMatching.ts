"use client";

import type { EmbeddingEntry } from "./types";

/**
 * Send a base64 JPEG selfie to the /api/embed route.
 * Returns a 512-D ArcFace embedding (L2-normalised) or null if no face detected.
 */
export async function getEmbeddingFromAPI(imageBase64: string): Promise<number[] | null> {
  const res = await fetch("/api/embed", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ imageBase64 }),
  });

  if (res.status === 422) return null; // no_face

  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(body.error ?? `embed API error ${res.status}`);
  }

  const { embedding } = await res.json() as { embedding: number[] };
  return embedding;
}

/**
 * Find all photos whose best face embedding has cosine similarity ≥ threshold
 * to the selfie embedding. Returned in descending similarity order.
 *
 * ArcFace embeddings are L2-normalised, so cosine sim = dot product.
 * Typical same-person threshold: 0.35–0.45.
 */
export function matchPhotos(
  selfieEmbedding: number[],
  embeddings: EmbeddingEntry[],
  threshold = 0.35,
): string[] {
  const best = new Map<string, number>(); // photo → best cosine sim

  for (const entry of embeddings) {
    const sim = cosineSimilarity(selfieEmbedding, entry.embedding);
    if (sim < threshold) continue;
    const prev = best.get(entry.photo) ?? -Infinity;
    if (sim > prev) best.set(entry.photo, sim);
  }

  return Array.from(best.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([photo]) => photo);
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}
