export interface EmbeddingEntry {
  photo: string;
  face_index: number;
  embedding: number[]; // 512-D ArcFace vector (L2-normalised)
}

export interface ManifestEntry {
  filename: string;
  thumbnail: string;
  face_count: number;
}

export type AppStep =
  | "upload"
  | "analyzing"   // API call: detect + embed selfie
  | "matching"    // browser-side cosine similarity
  | "results"
  | "no-face"
  | "error";

export interface AppState {
  step: AppStep;
  matches: string[];
  totalEmbeddings: number;
  errorMessage: string;
}
