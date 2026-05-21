import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const HF_TOKEN = process.env.HF_TOKEN!;
const HF_BASE = "https://huggingface.co/datasets/Rjain16/wedding-photos/resolve/main";

export async function GET() {
  const res = await fetch(`${HF_BASE}/manifest.json`, {
    headers: { Authorization: `Bearer ${HF_TOKEN}` },
    cache: "no-store",
  });
  if (!res.ok) return NextResponse.json({ error: "not found" }, { status: res.status });
  const data = await res.json();
  return NextResponse.json(data, {
    headers: { "Cache-Control": "public, max-age=86400" },
  });
}
