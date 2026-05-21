"""
Selfie embedding API — deploy to Render.com (free tier).
Receives a base64 JPEG, returns a 512-D ArcFace embedding.
"""

import os
import tempfile
import base64
import json
import logging

import cv2
import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

# Allow requests from Vercel frontend (and localhost for dev)
ALLOWED_ORIGINS = os.environ.get(
    "ALLOWED_ORIGINS",
    "http://localhost:3000,https://localhost:3000"
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["POST"],
    allow_headers=["Content-Type"],
)

# Load InsightFace once at startup
from insightface.app import FaceAnalysis

logger.info("Loading InsightFace buffalo_s model …")
fa = FaceAnalysis(name="buffalo_s", providers=["CPUExecutionProvider"])
fa.prepare(ctx_id=0, det_size=(640, 640))
logger.info("Model ready.")


class EmbedRequest(BaseModel):
    imageBase64: str


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/embed")
def embed(req: EmbedRequest):
    # Decode image
    try:
        img_bytes = base64.b64decode(req.imageBase64)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid base64 image")

    # Write to temp file
    with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as f:
        f.write(img_bytes)
        tmp_path = f.name

    try:
        img = cv2.imread(tmp_path)
        if img is None:
            raise HTTPException(status_code=400, detail="could_not_load")

        faces = fa.get(img)
        if not faces:
            raise HTTPException(status_code=422, detail="no_face")

        # Largest face
        face = max(faces, key=lambda f: (f.bbox[2] - f.bbox[0]) * (f.bbox[3] - f.bbox[1]))
        return {"embedding": face.normed_embedding.tolist()}

    finally:
        os.unlink(tmp_path)
