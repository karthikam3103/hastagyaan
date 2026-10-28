from __future__ import annotations

import io
import uuid
from pathlib import Path

import cv2
import numpy as np
from fastapi import FastAPI, File, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image, UnidentifiedImageError

try:
    from train_model import DATASET_DIR, load_classifier, train_classifier
except ModuleNotFoundError:
    from backend.train_model import DATASET_DIR, load_classifier, train_classifier

SAMPLE_DIR = DATASET_DIR / "train"
MAX_IMAGE_BYTES = 10 * 1024 * 1024
ALLOWED_MUDRAS = {
    "Pataka", "Tripataka", "Ardhapataka", "Kartarimukha 1",
    "Kartarimukha 2", "Mayura", "Ardhacandra", "Arala", "Sukatunda",
    "Musti", "Sikhara", "Kapittha", "Katakamukha 1", "Katakamukha 2",
    "Katakamukha 3", "Suci", "Candrakala", "Padmakosa", "Sarpasiras",
    "Mrgasirsa", "Simhamukha", "Kangula 1", "Kangula 2", "Alapadma",
    "Catura", "Bhramara", "Hamsasya", "Hamsapaksa", "Samdamsa", "Mukula",
    "Tamracuda", "Trisula 1", "Trisula 2", "Vyaghra / Urnanabha",
    "Ardhasuci", "Bana", "Palli", "Pralambha", "Trilinga", "Ardha Kangula",
    "Anjali", "Kapota", "Karkata", "Svastika", "Dolahasta", "Puspaputa",
    "Utsanga 1", "Utsanga 2", "Sivalinga", "Katakavardhana",
    "Kartarisvastika", "Sakata", "Sankha", "Cakra", "Samputa", "Pasa",
    "Kilaka", "Matsya", "Kurma", "Varaha", "Garuda", "Nagabandha",
    "Khatva", "Bherunda", "Avahittha",
}

app = FastAPI(
    title="HASTAGYAAN API",
    description="Bharatanatyam Mudra Recognition System",
    version="2.0.0",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def decode_image(image_bytes: bytes) -> np.ndarray:
    try:
        source = io.BytesIO(image_bytes)
        Image.open(source).verify()
        source.seek(0)
        image = Image.open(source).convert("RGB")
    except (UnidentifiedImageError, OSError, ValueError):
        raise HTTPException(status_code=400, detail="The uploaded file is not a valid image.")
    return cv2.cvtColor(np.asarray(image), cv2.COLOR_RGB2BGR)


async def read_image(file: UploadFile) -> np.ndarray:
    if file.content_type not in ("image/jpeg", "image/png", "image/webp"):
        raise HTTPException(status_code=400, detail="Please upload a JPEG, PNG, or WebP image.")
    image_bytes = await file.read()
    if len(image_bytes) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=413, detail="Image must be smaller than 10 MB.")
    return decode_image(image_bytes)


@app.get("/")
def home():
    return {"project": "HASTAGYAAN", "status": "Backend running"}


@app.get("/api/model/status")
def model_status():
    classifier = load_classifier()
    counts = {
        mudra: sum(1 for f in (SAMPLE_DIR / mudra).glob("*") if f.suffix.lower() in {".jpg", ".jpeg", ".png"})
        for mudra in sorted(ALLOWED_MUDRAS)
    }
    return {
        "ready": classifier is not None,
        "classes": classifier.model.classes_.tolist() if classifier is not None else [],
        "counts": counts,
        "total": sum(counts.values()),
    }


@app.post("/api/collect")
async def collect_sample(file: UploadFile = File(...), mudra: str = Query(...)):
    if mudra not in ALLOWED_MUDRAS:
        raise HTTPException(status_code=400, detail="Choose a valid mudra label.")
    image = await read_image(file)
    target = SAMPLE_DIR / mudra
    target.mkdir(parents=True, exist_ok=True)
    filename = target / f"{uuid.uuid4().hex}.jpg"
    if not cv2.imwrite(str(filename), image):
        raise HTTPException(status_code=500, detail="Could not save this training sample.")
    count = sum(1 for f in target.glob("*.jpg"))
    return {"saved": True, "mudra": mudra, "count": count}


@app.post("/api/train")
def train_model():
    try:
        result = train_classifier()
    except ImportError as error:
        raise HTTPException(status_code=503, detail=f"Install backend requirements first: {error}")
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error))
    return {"ready": True, **result}


@app.post("/api/predict")
async def predict_mudra(file: UploadFile = File(...)):
    classifier = load_classifier()
    if classifier is None:
        raise HTTPException(status_code=409, detail="No trained model yet. Collect samples and train the model first.")
    image = await read_image(file)
    feature = classifier.extract(image)
    probabilities = classifier.model.predict_proba([feature])[0]
    index = int(np.argmax(probabilities))
    score = float(probabilities[index])
    threshold = 0.45
    recognized = score >= threshold
    name = str(classifier.model.classes_[index])
    return {
        "status": "prediction",
        "recognized": recognized,
        "prediction": name if recognized else None,
        "candidate": name,
        "accuracy": score,
        "message": f"Detected {name}." if recognized else "Gesture unclear. Hold your hand steady and try again.",
        "model": "HASTAGYAAN HOG-SVM",
    }
