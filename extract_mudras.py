from pathlib import Path
import pymupdf
from PIL import Image
import io

BASE_DIR = Path(__file__).resolve().parent
PDF_PATH = BASE_DIR / "mudras.pdf"
OUTPUT_BASE = BASE_DIR / "dataset" / "pdf_source"


def main():
    if not PDF_PATH.exists():
        raise FileNotFoundError(f"PDF not found: {PDF_PATH}")

    doc = pymupdf.open(PDF_PATH)

    print(f"Total PDF pages: {len(doc)}")

    # Extract pages 2–7 (Python indexes pages from 0)
    for page_number in range(2, len(doc) + 1):
        page = doc[page_number - 1]

        output_dir = OUTPUT_BASE / f"page{page_number}_review"
        output_dir.mkdir(parents=True, exist_ok=True)

        pix = page.get_pixmap(
            matrix=pymupdf.Matrix(3, 3),
            alpha=False
        )

        page_image = Image.open(
            io.BytesIO(pix.tobytes("png"))
        ).convert("RGB")

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

        print(
            f"\nPage {page_number}: "
            f"{len(image_blocks)} image blocks found"
        )

        for index, block in enumerate(image_blocks, start=1):
            x0, y0, x1, y1 = block["bbox"]

            crop = page_image.crop((
                max(0, int(x0 * 3)),
                max(0, int(y0 * 3)),
                min(page_image.width, int(x1 * 3)),
                min(page_image.height, int(y1 * 3)),
            ))

            filename = f"{index:02d}_review.png"
            crop.save(output_dir / filename)
            print(f"Saved {filename}")

        print(f"Review folder: {output_dir}")

    doc.close()
    print("\nExtraction complete! Check each page's images before labeling.")


if __name__ == "__main__":
    main()