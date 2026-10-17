from pathlib import Path
from PIL import Image, ImageOps, ImageDraw

BASE_DIR = Path(__file__).resolve().parent
PAGES_DIR = BASE_DIR / "dataset" / "pdf_source" / "pages"
OUTPUT_PATH = BASE_DIR / "dataset" / "pdf_source" / "contact_sheet.jpg"

page_files = sorted(
    PAGES_DIR.glob("page_*.png"),
    key=lambda p: int(p.stem.split("_")[1])
)

if not page_files:
    raise SystemExit(f"No page images found in {PAGES_DIR}")

thumb_width = 450
margin = 20
label_height = 35
thumbnails = []

for page_file in page_files:
    image = Image.open(page_file).convert("RGB")
    image.thumbnail((thumb_width, 650))

    card = Image.new(
        "RGB",
        (thumb_width, image.height + label_height),
        "white"
    )
    card.paste(image, ((thumb_width - image.width) // 2, label_height))
    draw = ImageDraw.Draw(card)
    draw.text((10, 8), page_file.stem, fill="black")
    thumbnails.append(card)

columns = 2
rows = (len(thumbnails) + columns - 1) // columns
cell_width = thumb_width + margin
cell_height = max(im.height for im in thumbnails) + margin

sheet = Image.new(
    "RGB",
    (columns * cell_width + margin, rows * cell_height + margin),
    "#dddddd"
)

for index, thumbnail in enumerate(thumbnails):
    x = margin + (index % columns) * cell_width
    y = margin + (index // columns) * cell_height
    sheet.paste(thumbnail, (x, y))

OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
sheet.save(OUTPUT_PATH, quality=90)

print(f"Contact sheet saved to: {OUTPUT_PATH}")