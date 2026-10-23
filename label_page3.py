from pathlib import Path

folder = Path(__file__).resolve().parent / "dataset" / "pdf_source" / "page3_review"

labels = [
    "Alapadma",
    "Catura",
    "Bhramara",
    "Hamsasya",
    "Hamsapaksha",
    "Samdamsha",
    "Mukula",
    "Tamracuda",
    "Trisula_1",
    "Trisula_2",
]

for i, label in enumerate(labels, start=1):
    source = folder / f"{i:02d}_review.png"
    destination = folder / f"{i:02d}_{label}.png"

    if destination.exists():
        print(f"Already renamed: {destination.name}")
    elif source.exists():
        source.rename(destination)
        print(f"Renamed: {destination.name}")
    else:
        print(f"Missing image: {source.name}")