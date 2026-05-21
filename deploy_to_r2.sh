#!/bin/bash
# Upload wedding photo assets to Cloudflare R2
# Run AFTER: wrangler login && wrangler r2 bucket create wedding-photos

set -e

BUCKET="wedding-photos"
WRANGLER="node $(npm root -g)/wrangler/bin/wrangler.js"
PROJECT_ROOT="/Users/rohanjain/Documents/photos/project-output"

echo "=== Uploading embeddings.json ==="
$WRANGLER r2 object put "$BUCKET/embeddings.json" \
  --file "$PROJECT_ROOT/embeddings.json" \
  --content-type "application/json"

echo "=== Uploading manifest.json ==="
$WRANGLER r2 object put "$BUCKET/manifest.json" \
  --file "$PROJECT_ROOT/manifest.json" \
  --content-type "application/json"

echo "=== Uploading thumbnails (870 files) ==="
count=0
for f in "$PROJECT_ROOT/thumbnails"/*.jpg; do
  fname=$(basename "$f")
  $WRANGLER r2 object put "$BUCKET/thumbnails/$fname" \
    --file "$f" \
    --content-type "image/jpeg"
  count=$((count + 1))
  if [ $((count % 50)) -eq 0 ]; then
    echo "  Uploaded $count thumbnails..."
  fi
done
echo "  Done: $count thumbnails"

echo "=== Uploading photos (870 files) ==="
count=0
for f in "$PROJECT_ROOT/photos_flat"/*.jpg "$PROJECT_ROOT/photos_flat"/*.JPG 2>/dev/null; do
  [ -f "$f" ] || continue
  fname=$(basename "$f")
  $WRANGLER r2 object put "$BUCKET/photos/$fname" \
    --file "$f" \
    --content-type "image/jpeg"
  count=$((count + 1))
  if [ $((count % 50)) -eq 0 ]; then
    echo "  Uploaded $count photos..."
  fi
done
echo "  Done: $count photos"

echo ""
echo "=== Upload complete! ==="
echo "Set NEXT_PUBLIC_STORAGE_BASE_URL to your R2 public URL"
