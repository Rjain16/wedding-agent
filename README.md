# AI Wedding Photo Finder

Find every photo you're in from a wedding — upload a selfie, get your photos instantly.

## How it works

1. **Organizer** runs a local Python script on the wedding photos folder
2. Script detects faces and generates 128-D embeddings (compatible with dlib)
3. Photos + embeddings are uploaded to any free storage (Supabase, R2, Firebase)
4. Guests open the deployed URL, upload a selfie, and instantly see their photos
5. All face matching happens **in the browser** — no backend, no stored selfies

---

## Quick start

### 1 — Process the photos (organizer, run once)

```bash
# Install Python deps (requires cmake: brew install cmake)
pip install -r requirements.txt

# From a Google Drive folder
python process_album.py --drive-link "https://drive.google.com/drive/folders/..."

# Or from a local directory
python process_album.py --local-dir ./raw-photos

# Use CNN model for better accuracy (slower, needs GPU for speed)
python process_album.py --local-dir ./raw-photos --model cnn
```

Output lands in `./project-output/`:
```
project-output/
├── photos/          ← original images
├── thumbnails/      ← 600px JPEG thumbnails
├── embeddings.json  ← face embeddings
└── manifest.json    ← file list with thumbnail names
```

### 2 — Upload assets to storage

Upload the **contents** of `project-output/` to your storage bucket, keeping the same folder structure (`photos/`, `thumbnails/`, `embeddings.json`, `manifest.json`).

Recommended free options:
- **Supabase Storage** — generous free tier, easy CORS config
- **Cloudflare R2** — 10 GB free, very fast CDN
- **Firebase Storage** — 5 GB free

Make sure CORS allows `GET` requests from your Vercel domain.

### 3 — Deploy the frontend

```bash
cd webapp
npm install
npm run setup-models   # copies face-api.js weights to public/models/
cp .env.local.example .env.local
# Edit .env.local: set NEXT_PUBLIC_STORAGE_BASE_URL
npm run dev            # local preview
```

Deploy to Vercel:
```bash
npx vercel --prod
# Set the env var in Vercel dashboard: NEXT_PUBLIC_STORAGE_BASE_URL
```

---

## Configuration (.env.local)

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_STORAGE_BASE_URL` | Yes | Base URL of your storage bucket (no trailing slash) |
| `NEXT_PUBLIC_EVENT_NAME` | No | Name shown in the header (default: "Wedding Photos") |
| `NEXT_PUBLIC_EVENT_PASSCODE` | No | Optional passcode to protect the page |

---

## Tech stack

| Layer | Technology |
|---|---|
| Processing script | Python + face_recognition (dlib) |
| Frontend | Next.js 14 + TailwindCSS |
| Face recognition | @vladmandic/face-api (dlib-compatible weights) |
| Hosting | Vercel (free tier) |
| Storage | Supabase / Cloudflare R2 / Firebase |

---

## Similarity threshold

The default Euclidean distance threshold is **0.6** (matching the dlib default).
To adjust: edit `THRESHOLD` in `webapp/src/lib/faceMatching.ts`.

- Lower (e.g. 0.5) → fewer false positives, may miss some real matches
- Higher (e.g. 0.65) → more matches, may include near-lookalikes

---

## Privacy

- Selfies are **never uploaded** or stored anywhere
- All face matching runs entirely in the user's browser (WebAssembly + TF.js)
- Only the precomputed wedding photo embeddings are loaded from storage
