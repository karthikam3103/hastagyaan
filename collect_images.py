import cv2
import os
import time

MUDRAS = [
    "Pataka", "Tripataka", "Ardhapataka",
    "Kartarimukha1", "Kartarimukha2", "Mayura",
    "Ardhachandra", "Arala", "Shukhatunda",
    "Mushti", "Shikhara", "Kapittha",
    "Katakamukha1", "Katakamukha2", "Katakamukha3",
    "Suchi", "Chandrakala", "Padmakosha",
    "Sarpashirsha", "Mrigashirsha", "Simhamukha",
    "Kangula1", "Kangula2", "Alapadma",
    "Chatura", "Bhramara", "Hamsasya",
    "Hamsapaksha", "Samdamsha", "Mukula",
    "Tamrachuda", "Trishula1", "Trishula2",
    "Vyaghra", "Ardhasuchi", "Bana", "Palli",
    "Pralambha", "Trilinga", "ArdhaKangula",
    "Anjali", "Kapota", "Karkata", "Swastika",
    "Dolahasta", "Pushpaputa", "Utsanga1", "Utsanga2",
    "Shivalinga", "Katakavardhana", "Kartariswastika",
    "Shakata", "Shankha", "Chakra", "Samputa",
    "Pasha", "Kilaka", "Matsya", "Kurma", "Varaha",
    "Garuda", "Nagabandha", "Khatva", "Bherunda",
    "Avahitta"
]

DATASET_DIR = "dataset"
TARGET_IMAGES = 100
CAPTURE_INTERVAL = 0.2


def collect_images(split, mudra):
    save_dir = os.path.join(DATASET_DIR, split, mudra)
    os.makedirs(save_dir, exist_ok=True)

    count = len([
        f for f in os.listdir(save_dir)
        if f.lower().endswith((".jpg", ".jpeg", ".png"))
    ])

    cap = cv2.VideoCapture(0)

    if not cap.isOpened():
        print("Camera could not open. Check camera permissions.")
        return

    capturing = False
    last_capture = 0

    print(f"\nMudra: {mudra}")
    print(f"Dataset: {split}")
    print("SPACE = Start/Pause | Q = Quit")

    while count < TARGET_IMAGES:
        success, frame = cap.read()

        if not success:
            print("Unable to read camera frame.")
            break

        frame = cv2.flip(frame, 1)

        status = "CAPTURING" if capturing else "PAUSED"

        cv2.putText(
            frame,
            f"{mudra} | {split}",
            (10, 30),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.8,
            (0, 255, 0),
            2
        )

        cv2.putText(
            frame,
            f"Images: {count}/{TARGET_IMAGES} | {status}",
            (10, 65),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.7,
            (0, 255, 255),
            2
        )

        cv2.imshow("HASTAGYAAN - Image Collection", frame)

        key = cv2.waitKey(1) & 0xFF

        if key == ord("q"):
            break

        if key == ord(" "):
            capturing = not capturing
            time.sleep(0.2)

        if capturing and time.time() - last_capture >= CAPTURE_INTERVAL:
            filename = os.path.join(
                save_dir,
                f"{mudra}_{count + 1:04d}.jpg"
            )

            if cv2.imwrite(filename, frame):
                count += 1

            last_capture = time.time()

    cap.release()
    cv2.destroyAllWindows()

    print(f"Saved images in: {save_dir}")
    print(f"Total images: {count}")


def main():
    print("\n===== HASTAGYAAN DATASET COLLECTION =====")
    print("1. Train")
    print("2. Validation")
    print("3. Test")

    split_choice = input("Choose dataset split (1-3): ").strip()

    splits = {
        "1": "train",
        "2": "validation",
        "3": "test"
    }

    if split_choice not in splits:
        print("Invalid choice.")
        return

    print("\nChoose mudra:")

    for i, mudra in enumerate(MUDRAS, start=1):
        print(f"{i}. {mudra}")

    mudra_choice = input("Choose mudra (1-5): ").strip()

    if not mudra_choice.isdigit():
        print("Invalid choice.")
        return

    index = int(mudra_choice) - 1

    if index not in range(len(MUDRAS)):
        print("Invalid choice.")
        return

    collect_images(splits[split_choice], MUDRAS[index])


if __name__ == "__main__":
    main()