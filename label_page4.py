from pathlib import Path

folder = Path(__file__).resolve().parent / "dataset" / "pdf_source" / "page4_review"

labels = [
    "Vyaghra",
    "Ardhasuci",
    "Bana",
    "Palli",
    "Pralambha",
    "Trilinga",
    "Ardha_Kangula",
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