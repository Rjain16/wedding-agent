#!/usr/bin/env python3
"""
embed_selfie.py — Generate a 512-D ArcFace embedding for a single image.

Outputs exactly one JSON line to stdout:
  {"embedding": [...512 floats...]}
  {"error": "no_face"}
"""

import sys
import json
import cv2


def main() -> None:
    if len(sys.argv) < 2:
        print(json.dumps({"error": "usage: embed_selfie.py <image_path>"}))
        sys.exit(1)

    img_path = sys.argv[1]

    # Redirect stdout → stderr during InsightFace init so its log lines
    # don't pollute the JSON we write to stdout.
    real_stdout = sys.stdout
    sys.stdout = sys.stderr

    from insightface.app import FaceAnalysis
    app = FaceAnalysis(name="buffalo_s", providers=["CPUExecutionProvider"])
    app.prepare(ctx_id=0, det_size=(640, 640))

    sys.stdout = real_stdout

    img = cv2.imread(img_path)
    if img is None:
        print(json.dumps({"error": "could_not_load"}))
        sys.exit(1)

    faces = app.get(img)
    if not faces:
        print(json.dumps({"error": "no_face"}))
        sys.exit(0)

    # Pick the largest / most prominent face
    face = max(faces, key=lambda f: (f.bbox[2] - f.bbox[0]) * (f.bbox[3] - f.bbox[1]))
    print(json.dumps({"embedding": face.normed_embedding.tolist()}))


if __name__ == "__main__":
    main()
