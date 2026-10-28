"""Train and cache a HOG + SVM mudra image classifier."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
import pickle

import cv2
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
DATASET_DIR = ROOT / "dataset"
MODEL_PATH = Path(__file__).resolve().parent / "mudra_model.pkl"
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png"}
FEATURE_VERSION = "numpy-hog-v1"
_cached = None
_cached_mtime = None


def extract_feature(image: np.ndarray) -> np.ndarray:
    height, width = image.shape[:2]
    if not height or not width:
        raise ValueError("Empty image.")
    scale = 128 / max(height, width)
    resized = cv2.resize(
        image,
        (max(1, int(width * scale)), max(1, int(height * scale))),
    )
    canvas = np.zeros((128, 128, 3), dtype=np.uint8)
    y = (128 - resized.shape[0]) // 2
    x = (128 - resized.shape[1]) // 2
    canvas[y:y + resized.shape[0], x:x + resized.shape[1]] = resized
    gray = cv2.cvtColor(canvas, cv2.COLOR_BGR2GRAY)

    # Compute a compact HOG descriptor with NumPy instead of OpenCV's optional
    # HOGDescriptor API. Some OpenCV wheels (including newer minimal builds)
    # omit that API, which otherwise prevents the FastAPI app from starting.
    gray = gray.astype(np.float32)
    dx = np.zeros_like(gray)
    dy = np.zeros_like(gray)
    dx[:, 1:-1] = gray[:, 2:] - gray[:, :-2]
    dy[1:-1, :] = gray[2:, :] - gray[:-2, :]
    magnitude = np.hypot(dx, dy)
    orientation = np.mod(np.degrees(np.arctan2(dy, dx)), 180.0)

    cell_histograms = np.zeros((8, 8, 9), dtype=np.float32)
    bin_edges = np.linspace(0, 180, 10)
    for cell_y in range(8):
        for cell_x in range(8):
            y0, x0 = cell_y * 16, cell_x * 16
            cell_histograms[cell_y, cell_x] = np.histogram(
                orientation[y0:y0 + 16, x0:x0 + 16],
                bins=bin_edges,
                weights=magnitude[y0:y0 + 16, x0:x0 + 16],
            )[0]

    blocks = []
    for block_y in range(7):
        for block_x in range(7):
            block = cell_histograms[
                block_y:block_y + 2, block_x:block_x + 2
            ].reshape(-1)
            blocks.append(block / np.sqrt(np.dot(block, block) + 1e-6))
    return np.concatenate(blocks).astype(np.float32)


@dataclass
class Classifier:
    model: object

    @staticmethod
    def extract(image: np.ndarray) -> np.ndarray:
        return extract_feature(image)


def load_classifier():
    global _cached, _cached_mtime
    if not MODEL_PATH.exists():
        _cached = None
        _cached_mtime = None
        return None
    mtime = MODEL_PATH.stat().st_mtime_ns
    if _cached_mtime != mtime:
        with MODEL_PATH.open("rb") as model_file:
            saved_model = pickle.load(model_file)
        if (
            isinstance(saved_model, dict)
            and saved_model.get("feature_version") == FEATURE_VERSION
        ):
            _cached = Classifier(saved_model["model"])
        else:
            # Do not apply the NumPy HOG features to a model trained with a
            # different descriptor implementation; it would return bad labels.
            _cached = None
        _cached_mtime = mtime
    return _cached


def train_classifier():
    try:
        from sklearn.svm import SVC
    except ImportError as error:
        raise ImportError("scikit-learn is missing") from error

    features, labels = [], []
    counts = {}
    if not DATASET_DIR.exists():
        raise ValueError("No training data found. Collect labeled camera samples first.")

    for label_dir in sorted((DATASET_DIR / "train").glob("*")):
        if not label_dir.is_dir():
            continue
        images = [p for p in label_dir.iterdir() if p.suffix.lower() in IMAGE_EXTENSIONS]
        if not images:
            continue
        counts[label_dir.name] = len(images)
        for image_path in images:
            image = cv2.imread(str(image_path))
            if image is not None:
                features.append(extract_feature(image))
                labels.append(label_dir.name)

    if len(counts) < 2:
        raise ValueError("Collect examples for at least two different mudras before training.")
    small_classes = {name: count for name, count in counts.items() if count < 20}
    if small_classes:
        labels_text = ", ".join(f"{name} ({count}/20)" for name, count in small_classes.items())
        raise ValueError(f"Collect at least 20 samples for each mudra: {labels_text}.")

    model = SVC(kernel="rbf", C=8, probability=True, class_weight="balanced")
    model.fit(np.asarray(features), np.asarray(labels))
    MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    with MODEL_PATH.open("wb") as model_file:
        pickle.dump(
            {"feature_version": FEATURE_VERSION, "model": model},
            model_file,
        )
    global _cached, _cached_mtime
    _cached = Classifier(model)
    _cached_mtime = MODEL_PATH.stat().st_mtime_ns
    return {
        "classes": model.classes_.tolist(),
        "sample_count": len(labels),
        "samples_per_class": counts,
    }
