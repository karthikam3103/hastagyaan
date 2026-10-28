# Live mudra recognition

The camera classifier learns from labeled camera frames stored under
`dataset/train/<Mudra name>/`. Start with at least two mudras and collect at
least 20 varied examples for each. Vary your distance, hand angle, and lighting
while collecting; repeated identical frames are not useful training examples.

Install the backend dependencies from the project root:

```sh
python3 -m pip install -r backend/requirements.txt
```

Start FastAPI from the project root:

```sh
python3 -m uvicorn backend.main:app --reload
```

Open the Recognition section in the frontend, select the pose shown, and press
**Collect this mudra**. Press **Stop collecting** before changing the label.
After collecting examples for at least two mudras, press **Train model**. The
camera then checks the live view about once per second. The trained model is
saved as `backend/mudra_model.pkl` and reloads after a backend restart.

The current classifier uses whole-frame HOG image features and an SVM. It is a
starter model, not a hand-landmark model; include varied backgrounds and camera
angles in the labeled examples and treat confidence as an estimate. Recognition
is limited to labels with collected training samples.
