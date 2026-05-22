import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const HF_TOKEN = process.env.HF_TOKEN!;
const HF_BASE = "https://huggingface.co/datasets/Rjain16/wedding-photos/resolve/main";

export async function GET() {
  const res = await fetch(`${HF_BASE}/manifest.json`, {
    headers: { Authorization: `Bearer ${HF_TOKEN}` },
    next: { revalidate: 3600 },
  });
  if (!res.ok) return NextResponse.json({ error: "not found" }, { status: res.status });
  const data = await res.json();
  return NextResponse.json(data, {
    headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" },
  });
}
