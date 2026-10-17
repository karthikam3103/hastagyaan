from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
import io

app = FastAPI(
    title="HASTAGYAAN API",
    description="Bharatanatyam Mudra Recognition System",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MUDRAS = {
    "Alapadma": {
        "meaning": (
            "An open-hand gesture associated with a fully blossomed lotus. "
            "Its interpretation depends on the dance context."
        ),
        "uses": [
            "Depicting a blossomed lotus",
            "Expressing beauty and blossoming",
            "Supporting expressive storytelling",
        ],
    }
}


@app.get("/")
def home():
    return {
        "project": "HASTAGYAAN",
        "status": "Backend running",
    }


@app.get("/api/mudras")
def get_mudras():
    return MUDRAS


@app.post("/api/predict")
async def predict_mudra(file: UploadFile = File(...)):
    if file.content_type not in ("image/jpeg", "image/png", "image/webp"):
        raise HTTPException(
            status_code=400,
            detail="Please upload a JPEG, PNG, or WebP image.",
        )

    image_bytes = await file.read()

    if len(image_bytes) > 10 * 1024 * 1024:
        raise HTTPException(
            status_code=413,
            detail="Image must be smaller than 10 MB.",
        )

    try:
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        image.verify()
    except Exception:
        raise HTTPException(
            status_code=400,
            detail="The uploaded file is not a valid image.",
        )

    # CNN integration will be added after training the model.
    return {
        "status": "image_received",
        "recognized": False,
        "message": (
            "Image received successfully. The trained CNN model "
            "has not been integrated yet."
        ),
        "model": None,
        "prediction": None,
        "accuracy": None,
    }