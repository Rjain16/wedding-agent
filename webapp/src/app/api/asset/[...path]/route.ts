import { NextRequest, NextResponse } from "next/server";

const HF_TOKEN = process.env.HF_TOKEN!;
const HF_BASE = "https://huggingface.co/datasets/Rjain16/wedding-photos/resolve/main";

export async function GET(
  _req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const joined = params.path.join("/");

  // Only allow photos/ and thumbnails/ paths
  if (!/^(photos|thumbnails)\/[^/]+\.(jpg|jpeg|png|webp)$/i.test(joined)) {
    return NextResponse.json({ error: "invalid path" }, { status: 400 });
  }

  const res = await fetch(`${HF_BASE}/${joined}`, {
    headers: { Authorization: `Bearer ${HF_TOKEN}` },
  });

  if (!res.ok) return new NextResponse(null, { status: res.status });

  const buf = await res.arrayBuffer();
  return new NextResponse(buf, {
    headers: {
      "Content-Type": res.headers.get("Content-Type") ?? "image/jpeg",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
