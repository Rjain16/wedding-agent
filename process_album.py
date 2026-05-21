#!/usr/bin/env python3
"""
process_album.py — Wedding Photo Processor (InsightFace / ArcFace)

Uses RetinaFace for detection (handles turbans, glasses, angles, low-light)
and ArcFace for 512-D embeddings (state-of-the-art accuracy).

Usage:
  python process_album.py --local-dir ./raw-photos
  python process_album.py --drive-link "https://drive.google.com/drive/folders/..."
  python process_album.py --local-dir ./raw-photos --output ./out --model buffalo_l
"""

import argparse
import json
import shutil
import sys
from pathlib import Path


SUPPORTED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}


# ---------------------------------------------------------------------------
# Dependency check
# ---------------------------------------------------------------------------

def check_dependencies() -> None:
    missing = []
    for pkg, import_name in [
        ("insightface", "insightface"),
        ("onnxruntime", "onnxruntime"),
        ("opencv-python", "cv2"),
        ("Pillow", "PIL"),
        ("tqdm", "tqdm"),
        ("numpy", "numpy"),
    ]:
        try:
            __import__(import_name)
        except ImportError:
            missing.append(pkg)
    if missing:
        print(f"[error] Missing packages: {', '.join(missing)}")
        print("        Run: pip install insightface onnxruntime opencv-python Pillow tqdm numpy")
        sys.exit(1)


# ---------------------------------------------------------------------------
# Google Drive
# ---------------------------------------------------------------------------

def parse_folder_id(drive_link: str) -> str:
    if "folders/" in drive_link:
        return drive_link.split("folders/")[1].split("?")[0].split("/")[0]
    if "id=" in drive_link:
        return drive_link.split("id=")[1].split("&")[0]
    raise ValueError(f"Cannot extract folder ID from: {drive_link}")


def download_from_drive(drive_link: str, dest_dir: Path) -> list[Path]:
    import gdown
    folder_id = parse_folder_id(drive_link)
    print(f"[info] Google Drive folder ID: {folder_id}")
    dest_dir.mkdir(parents=True, exist_ok=True)
    gdown.download_folder(id=folder_id, output=str(dest_dir), quiet=False, use_cookies=False)
    # rglob so files inside subfolders (e.g. Cam.1/) are included
    return [p for p in dest_dir.rglob("*") if p.suffix.lower() in SUPPORTED_EXTENSIONS]


# ---------------------------------------------------------------------------
# Photo collection
# ---------------------------------------------------------------------------

def collect_local_photos(local_dir: Path, photos_dir: Path) -> list[Path]:
    sources = [p for p in local_dir.rglob("*") if p.suffix.lower() in SUPPORTED_EXTENSIONS]
    if not sources:
        print(f"[error] No supported images found in {local_dir}")
        sys.exit(1)
    if local_dir.resolve() != photos_dir.resolve():
        print(f"[info] Copying {len(sources)} photos to {photos_dir} …")
        photos_dir.mkdir(parents=True, exist_ok=True)
        for src in sources:
            dst = photos_dir / src.name
            if not dst.exists():
                shutil.copy2(src, dst)
    return [p for p in photos_dir.rglob("*") if p.suffix.lower() in SUPPORTED_EXTENSIONS]


# ---------------------------------------------------------------------------
# Thumbnail
# ---------------------------------------------------------------------------

def generate_thumbnail(image_path: Path, thumb_dir: Path, size: tuple[int, int] = (600, 600)) -> str:
    from PIL import Image, UnidentifiedImageError
    out_name = image_path.stem + ".jpg"
    out_path = thumb_dir / out_name
    if out_path.exists():
        return out_name
    try:
        with Image.open(image_path) as img:
            img = img.convert("RGB")
            img.thumbnail(size, Image.LANCZOS)
            img.save(out_path, "JPEG", quality=82, optimize=True)
        return out_name
    except (UnidentifiedImageError, Exception) as exc:
        print(f"  [warn] Thumbnail failed for {image_path.name}: {exc}")
        return image_path.name


# ---------------------------------------------------------------------------
# Core processing
# ---------------------------------------------------------------------------

def build_face_analyzer(model_name: str):
    """Build and warm up InsightFace FaceAnalysis."""
    import insightface
    from insightface.app import FaceAnalysis

    print(f"[info] Loading InsightFace model '{model_name}' (downloads on first use) …")
    app = FaceAnalysis(
        name=model_name,
        providers=["CPUExecutionProvider"],  # use 'CUDAExecutionProvider' if GPU available
    )
    app.prepare(ctx_id=0, det_size=(640, 640))
    return app


def process_photos(
    photos: list[Path],
    output_dir: Path,
    model_name: str = "buffalo_l",
) -> tuple[list[dict], list[dict]]:
    import cv2
    from tqdm import tqdm

    app = build_face_analyzer(model_name)
    thumb_dir = output_dir / "thumbnails"
    thumb_dir.mkdir(exist_ok=True)

    embeddings: list[dict] = []
    manifest: list[dict] = []

    print(f"\n[info] Processing {len(photos)} photos …\n")

    for photo_path in tqdm(photos, desc="Faces"):
        try:
            # InsightFace uses BGR (OpenCV convention)
            img = cv2.imread(str(photo_path))
            if img is None:
                print(f"\n  [warn] Could not load {photo_path.name}")
                continue

            faces = app.get(img)
            thumb_name = generate_thumbnail(photo_path, thumb_dir)

            manifest.append({
                "filename": photo_path.name,
                "thumbnail": thumb_name,
                "face_count": len(faces),
            })

            for idx, face in enumerate(faces):
                # normed_embedding is L2-normalised (unit norm); embedding is raw
                embeddings.append({
                    "photo": photo_path.name,
                    "face_index": idx,
                    "embedding": face.normed_embedding.tolist(),
                })

        except Exception as exc:
            print(f"\n  [warn] Skipping {photo_path.name}: {exc}")

    return embeddings, manifest


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Generate ArcFace embeddings + thumbnails from wedding photos."
    )
    source_group = parser.add_mutually_exclusive_group(required=True)
    source_group.add_argument("--drive-link", metavar="URL")
    source_group.add_argument("--local-dir", metavar="PATH")

    parser.add_argument("--output", default="./project-output", metavar="PATH")
    parser.add_argument(
        "--model",
        default="buffalo_l",
        choices=["buffalo_l", "buffalo_m", "buffalo_s"],
        help="buffalo_l = most accurate (default), buffalo_s = fastest",
    )

    args = parser.parse_args()
    check_dependencies()

    output_dir = Path(args.output)
    photos_dir = output_dir / "photos"
    output_dir.mkdir(parents=True, exist_ok=True)
    photos_dir.mkdir(exist_ok=True)

    if args.drive_link:
        photos = download_from_drive(args.drive_link, photos_dir)
    else:
        photos = collect_local_photos(Path(args.local_dir), photos_dir)

    print(f"[info] {len(photos)} photos to process")

    embeddings, manifest = process_photos(photos, output_dir, model_name=args.model)

    with open(output_dir / "embeddings.json", "w") as fh:
        json.dump(embeddings, fh)
    with open(output_dir / "manifest.json", "w") as fh:
        json.dump(manifest, fh, indent=2)

    print(f"\n{'=' * 52}")
    print("Processing complete!")
    print(f"  Photos     : {len(manifest)}")
    print(f"  Embeddings : {len(embeddings)}")
    print(f"  Model      : {args.model} (ArcFace 512-D)")
    print(f"  Output     : {output_dir.resolve()}")
    print(f"{'=' * 52}")


if __name__ == "__main__":
    main()
