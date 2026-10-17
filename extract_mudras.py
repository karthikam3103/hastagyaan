from pathlib import Path
import pymupdf
from PIL import Image
import io

BASE_DIR = Path(__file__).resolve().parent
PDF_PATH = BASE_DIR / "mudras.pdf"
OUTPUT_DIR = BASE_DIR / "dataset" / "pdf_source" / "page1_review"

# Labels as they appear in the PDF
LABELS = [
    "pataka", "tripataka", "ardhapataka", "kartarimukha 1",
    "kartarimukha 2", "mayura", "ardhachandra", "arala",
    "śukatuṇḍa", "muṣṭi", "śikhara", "kapittha",
]

def main():
    if not PDF_PATH.exists():
        raise FileNotFoundError(f"PDF not found: {PDF_PATH}")

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    doc = pymupdf.open(PDF_PATH)
    page = doc[0]

    # Render at high resolution
    pix = page.get_pixmap(matrix=pymupdf.Matrix(3, 3), alpha=False)
    image = Image.open(io.BytesIO(pix.tobytes("png"))).convert("RGB")

    # Detect image blocks on the page
    blocks = page.get_text("dict")["blocks"]
    image_blocks = [
        block for block in blocks
        if block.get("type") == 1 and "bbox" in block
    ]

    image_blocks.sort(
        key=lambda block: (
            round(block["bbox"][1] / 80),
            block["bbox"][0]
        )
    )

    print("Image blocks found:", len(image_blocks))

    for index, block in enumerate(image_blocks):
        x0, y0, x1, y1 = block["bbox"]
        crop = image.crop((
            max(0, int(x0 * 3)),
            max(0, int(y0 * 3)),
            min(image.width, int(x1 * 3)),
            min(image.height, int(y1 * 3)),
        ))

        filename = f"{index + 1:02d}_review.png"
        crop.save(OUTPUT_DIR / filename)
        print(f"Saved {filename}")

    doc.close()
    print(f"\nReview crops saved in: {OUTPUT_DIR}")
    print("Check the crops before assigning labels.")

if __name__ == "__main__":
    main()