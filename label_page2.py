from pathlib import Path

folder = Path("dataset/pdf_source/page2_review")

labels = [
    "Katakamukha_1",
    "Katakamukha_2",
    "Katakamukha_3",
    "Suci",
    "Candrakala",
    "Padmakosa",
    "Sarpasiras",
    "Mrgasisa",
    "Simhamukha",
    "Kangula_1",
    "Kangula_2",
]

for i, label in enumerate(labels, start=1):
    source = folder / f"{i:02d}_review.png"
    destination = folder / f"{i:02d}_{label}.png"

    if source.exists():
        source.rename(destination)
        print(f"Renamed: {destination.name}")
    else:
        print(f"Missing image: {source.name}")