import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import { writeFileSync, unlinkSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

const SCRIPT = join(process.cwd(), "embed_selfie.py");
const PYTHON = process.env.PYTHON_BIN ?? "python3";

// When set, forward requests to the Render.com API instead of running Python locally
const EMBED_API_URL = process.env.PYTHON_EMBED_URL ?? "";

export async function POST(request: NextRequest) {
  let tmpPath = "";
  try {
    const { imageBase64 } = (await request.json()) as { imageBase64: string };
    if (!imageBase64) {
      return NextResponse.json({ error: "imageBase64 required" }, { status: 400 });
    }

    // Production: proxy to Render.com Python service
    if (EMBED_API_URL) {
      const res = await fetch(`${EMBED_API_URL}/embed`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64 }),
        signal: AbortSignal.timeout(60_000),
      });
      const data = await res.json() as { embedding?: number[]; error?: string; detail?: string };
      if (res.status === 422 || data.detail === "no_face") {
        return NextResponse.json({ error: "no_face" }, { status: 422 });
      }
      if (!res.ok || !data.embedding) {
        return NextResponse.json({ error: data.error ?? data.detail ?? "upstream error" }, { status: 500 });
      }
      return NextResponse.json({ embedding: data.embedding });
    }

    // Development: run Python subprocess locally
    tmpPath = join(tmpdir(), `selfie_${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`);
    writeFileSync(tmpPath, Buffer.from(imageBase64, "base64"));

    const { stdout, stderr } = await execFileAsync(PYTHON, [SCRIPT, tmpPath], {
      timeout: 60_000,
    });

    if (stderr) console.error("[embed] stderr:", stderr);

    const result = JSON.parse(stdout.trim()) as { embedding?: number[]; error?: string };

    if (result.error === "no_face") {
      return NextResponse.json({ error: "no_face" }, { status: 422 });
    }
    if (result.error || !result.embedding) {
      return NextResponse.json({ error: result.error ?? "unknown" }, { status: 500 });
    }

    return NextResponse.json({ embedding: result.embedding });
  } catch (err) {
    console.error("[embed] error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  } finally {
    if (tmpPath) try { unlinkSync(tmpPath); } catch {}
  }
}
