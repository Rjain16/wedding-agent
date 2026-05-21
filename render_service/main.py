"""
Selfie embedding API — deploy to Render.com (free tier).
Receives a base64 JPEG, returns a 512-D ArcFace embedding.
"""

import os
import tempfile
import base64
import logging

import cv2
from flask import Flask, request, jsonify
from flask_cors import CORS

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)

ALLOWED_ORIGINS = os.environ.get(
    "ALLOWED_ORIGINS", "http://localhost:3000,https://localhost:3000"
).split(",")

CORS(app, origins=ALLOWED_ORIGINS, methods=["GET", "POST"], allow_headers=["Content-Type"])

logger.info("Loading InsightFace buffalo_s model ...")
from insightface.app import FaceAnalysis
fa = FaceAnalysis(name="buffalo_l", providers=["CPUExecutionProvider"])
fa.prepare(ctx_id=0, det_size=(640, 640))
logger.info("Model ready.")


@app.get("/health")
def health():
    return jsonify({"status": "ok"})


@app.post("/embed")
def embed():
    data = request.get_json(silent=True)
    if not data or "imageBase64" not in data:
        return jsonify({"error": "imageBase64 required"}), 400

    try:
        img_bytes = base64.b64decode(data["imageBase64"])
    except Exception:
        return jsonify({"error": "Invalid base64 image"}), 400

    with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as f:
        f.write(img_bytes)
        tmp_path = f.name

    try:
        img = cv2.imread(tmp_path)
        if img is None:
            return jsonify({"error": "could_not_load"}), 400

        faces = fa.get(img)
        if not faces:
            return jsonify({"detail": "no_face"}), 422

        face = max(faces, key=lambda f: (f.bbox[2] - f.bbox[0]) * (f.bbox[3] - f.bbox[1]))
        return jsonify({"embedding": face.normed_embedding.tolist()})
    finally:
        os.unlink(tmp_path)


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    app.run(host="0.0.0.0", port=port)
