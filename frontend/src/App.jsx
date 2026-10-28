import { useCallback, useEffect, useRef, useState } from "react";
import "./App.css";
import mudraImages from "./mudras.json";
import mudraTranslations from "./mudraTranslations.json";

const API_URL = "http://127.0.0.1:8000";

const mudras = {
  alapadma: {
    name: "Alapadma",
    subtitle: "The Fully Blossomed Lotus",
    meaning:
      "Alapadma is an open-hand gesture associated with a fully blossomed lotus. Its interpretation depends on the dance and storytelling context.",
    uses: [
      "Depicting a blossomed lotus or flower",
      "Expressing beauty and blossoming",
      "Supporting expressive storytelling in dance",
    ],
    instructions:
      "Open your palm and spread your fingers outward in a relaxed, flower-like shape. Follow your teacher's reference for the traditional finger positions.",
  },
};


function MudraLibrary() {
  const [group, setGroup] = useState("");
  const [selectedName, setSelectedName] = useState("");
  const [search, setSearch] = useState("");

  const groups = {
    asamyuta: [
      "Pataka", "Tripataka", "Ardhapataka",
      "Kartarimukha 1", "Kartarimukha 2", "Mayura",
      "Ardhacandra", "Arala", "Sukatunda", "Musti",
      "Sikhara", "Kapittha", "Katakamukha 1",
      "Katakamukha 2", "Katakamukha 3", "Suci",
      "Candrakala", "Padmakosa", "Sarpasiras",
      "Mrgasirsa", "Simhamukha", "Kangula 1",
      "Kangula 2", "Alapadma", "Catura", "Bhramara",
      "Hamsasya", "Hamsapaksa", "Samdamsa", "Mukula",
      "Tamracuda", "Trisula 1", "Trisula 2",
      "Vyaghra / Urnanabha", "Ardhasuci", "Bana",
      "Palli", "Pralambha", "Trilinga", "Ardha Kangula"
    ],
    samyuta: [
      "Anjali", "Kapota", "Karkata", "Svastika",
      "Dolahasta", "Puspaputa", "Utsanga 1", "Utsanga 2",
      "Sivalinga", "Katakavardhana", "Kartarisvastika",
      "Sakata", "Sankha", "Cakra", "Samputa", "Pasa",
      "Kilaka", "Matsya", "Kurma", "Varaha", "Garuda",
      "Nagabandha", "Khatva", "Bherunda", "Avahittha"
    ]
  };

  const normalize = (value) =>
    value.toLowerCase().replace(/[^a-z0-9]/g, "");

  const names = groups[group] || [];
  const filteredNames = names.filter((name) =>
    name.toLowerCase().includes(search.toLowerCase())
  );

  const images = mudraImages || [];
  const selectedImage = images.find((item) => {
    const imageName = normalize(
      item.name.replace(/^\d+\s*/, "")
    );
    const wantedName = normalize(selectedName);
    return wantedName &&
      (imageName === wantedName || imageName.startsWith(wantedName));
  });

  const selectedTranslation = Object.entries(mudraTranslations).find(
    ([name]) => normalize(name) === normalize(selectedName)
  )?.[1];


  return (
    <section id="mudra-library" className="section mudra-library-section">
      <div className="section-heading">
        <p className="eyebrow">EXPLORE THE COLLECTION</p>
        <h2>Mudra Library</h2>
        <p>Choose a group, then select the mudra you want to learn.</p>
      </div>

      <div className="library-selectors">
        <div className="mudra-field">
          <label htmlFor="mudra-category">Main category</label>
          <select id="mudra-category" value="classical" disabled>
            <option value="classical">Classical Indian Dance (Hastas)</option>
          </select>
        </div>

        <div className="mudra-field">
          <label htmlFor="mudra-group">Select mudra group</label>
          <select
            id="mudra-group"
            value={group}
            onChange={(event) => {
              setGroup(event.target.value);
              setSelectedName("");
              setSearch("");
            }}
          >
            <option value="">Choose a group...</option>
            <option value="asamyuta">Asamyuta Hasta (40 entries)</option>
            <option value="samyuta">Samyuta Hasta (25 entries)</option>
          </select>
        </div>

        <div className="mudra-field mudra-search-field">
          <label htmlFor="mudra-search">Search</label>
          <input
            id="mudra-search"
            type="search"
            placeholder="Search selected group..."
            value={search}
            disabled={!group}
            onChange={(event) => {
              setSearch(event.target.value);
              setSelectedName("");
            }}
          />
        </div>
      </div>

      {!group && (
        <p className="muted-note">
          Select a mudra group to begin exploring.
        </p>
      )}

      {group && (
        <div className="mudra-field mudra-choice-field">
          <label htmlFor="mudra-choice">
            Select a mudra ({filteredNames.length} available)
          </label>
          <select
            id="mudra-choice"
            value={selectedName}
            onChange={(event) => setSelectedName(event.target.value)}
          >
            <option value="">Choose a mudra...</option>
            {filteredNames.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </div>
      )}

      {selectedName && (
        <article className="selected-mudra-detail">
          <h3>{selectedName}</h3>
          {selectedImage ? (
            <img src={selectedImage.image} alt={`${selectedName} mudra`} />
          ) : (
            <p className="muted-note">
              No matching reference image was found for this mudra yet.
            </p>
          )}
          <div className="mudra-translation-grid">
            {["English", "Telugu", "Tamil", "Kannada", "Malayalam"].map((language, index) => (
              <div className="mudra-language" key={language}>
                <span>{language}</span>
                <strong>{selectedTranslation?.[index] || "Translation not provided yet"}</strong>
              </div>
            ))}
          </div>
        </article>
      )}
    </section>
  );
}

function App() {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const cameraPageActive = useRef(false);
  const cameraStarting = useRef(false);
  const liveRequestBusy = useRef(false);
  const collectRequestBusy = useRef(false);
  const livePredictionHistory = useRef([]);
  const livePredictionMisses = useRef(0);
  const previousImageUrl = useRef(null);

  const [cameraOn, setCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [selectedMudra] = useState(mudras.alapadma);
  const [prediction, setPrediction] = useState(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [backendStatus, setBackendStatus] = useState("checking");
  const [modelReady, setModelReady] = useState(false);
  const [liveResult, setLiveResult] = useState(null);
  const [livePredictionError, setLivePredictionError] = useState("");
  const [trainingMudra, setTrainingMudra] = useState("Alapadma");
  const [isCollecting, setIsCollecting] = useState(false);
  const [sampleCounts, setSampleCounts] = useState({});
  const [trainingMessage, setTrainingMessage] = useState("");
  const [isTraining, setIsTraining] = useState(false);

  const trainingMudras = [
    "Pataka", "Tripataka", "Ardhapataka", "Kartarimukha 1",
    "Kartarimukha 2", "Mayura", "Ardhacandra", "Arala", "Sukatunda",
    "Musti", "Sikhara", "Kapittha", "Katakamukha 1", "Katakamukha 2",
    "Katakamukha 3", "Suci", "Candrakala", "Padmakosa", "Sarpasiras",
    "Mrgasirsa", "Simhamukha", "Kangula 1", "Kangula 2", "Alapadma",
    "Catura", "Bhramara", "Hamsasya", "Hamsapaksa", "Samdamsa", "Mukula",
    "Tamracuda", "Trisula 1", "Trisula 2", "Vyaghra / Urnanabha",
    "Ardhasuci", "Bana", "Palli", "Pralambha", "Trilinga", "Ardha Kangula",
    "Anjali", "Kapota", "Karkata", "Svastika", "Dolahasta", "Puspaputa",
    "Utsanga 1", "Utsanga 2", "Sivalinga", "Katakavardhana",
    "Kartarisvastika", "Sakata", "Sankha", "Cakra", "Samputa", "Pasa",
    "Kilaka", "Matsya", "Kurma", "Varaha", "Garuda", "Nagabandha",
    "Khatva", "Bherunda", "Avahittha",
  ];

  const refreshModelStatus = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/model/status`);
      if (!response.ok) return;
      const data = await response.json();
      setModelReady(data.ready);
      setSampleCounts(data.counts || {});
    } catch {
      // Backend status is also shown in the page header.
    }
  }, []);

  const getFrameBlob = useCallback(() => {
    const video = videoRef.current;
    if (!video || video.readyState < 2 || !video.videoWidth) {
      return Promise.resolve(null);
    }
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) return Promise.resolve(null);
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.78));
  }, []);

  useEffect(() => {
    refreshModelStatus();
    const timer = window.setInterval(refreshModelStatus, 5000);
    return () => window.clearInterval(timer);
  }, [refreshModelStatus]);

  useEffect(() => {
    if (!cameraOn || !modelReady) return undefined;
    let effectIsActive = true;
    let requestController = null;
    livePredictionHistory.current = [];
    livePredictionMisses.current = 0;
    const timer = window.setInterval(async () => {
      if (liveRequestBusy.current) return;
      liveRequestBusy.current = true;
      requestController = new AbortController();
      try {
        const blob = await getFrameBlob();
        if (!blob) return;
        const formData = new FormData();
        formData.append("file", blob, "live-frame.jpg");
        const response = await fetch(`${API_URL}/api/predict`, {
          method: "POST",
          body: formData,
          signal: requestController.signal,
        });
        const data = await response.json();
        if (!effectIsActive) return;
        if (!response.ok) {
          if (response.status === 409) setModelReady(false);
          setLivePredictionError(data.detail || "Prediction is temporarily unavailable.");
          return;
        }

        setLivePredictionError("");
        if (data.recognized && data.prediction) {
          livePredictionMisses.current = 0;
          const history = [...livePredictionHistory.current, data.prediction].slice(-3);
          livePredictionHistory.current = history;
          const stableName = history.find(
            (name) => history.filter((item) => item === name).length >= 2
          );
          if (stableName) setLiveResult({ ...data, prediction: stableName });
        } else {
          livePredictionMisses.current += 1;
          livePredictionHistory.current = [];
          if (livePredictionMisses.current >= 3) setLiveResult(data);
        }
      } catch (error) {
        if (effectIsActive && error.name !== "AbortError") {
          setLivePredictionError("Live prediction is temporarily unavailable.");
        }
      } finally {
        liveRequestBusy.current = false;
      }
    }, 1500);
    return () => {
      effectIsActive = false;
      window.clearInterval(timer);
      requestController?.abort();
      liveRequestBusy.current = false;
    };
  }, [cameraOn, getFrameBlob, modelReady]);

  useEffect(() => {
    if (!cameraOn || !isCollecting) return undefined;
    const timer = window.setInterval(async () => {
      if (collectRequestBusy.current) return;
      collectRequestBusy.current = true;
      try {
        const blob = await getFrameBlob();
        if (!blob) return;
        const formData = new FormData();
        formData.append("file", blob, "mudra-sample.jpg");
        const response = await fetch(
          `${API_URL}/api/collect?mudra=${encodeURIComponent(trainingMudra)}`,
          { method: "POST", body: formData }
        );
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.detail || "Could not save sample.");
        }
        const data = await response.json();
        setSampleCounts((current) => ({ ...current, [trainingMudra]: data.count }));
      } catch (error) {
        setTrainingMessage(error.message);
        setIsCollecting(false);
      } finally {
        collectRequestBusy.current = false;
      }
    }, 450);
    return () => window.clearInterval(timer);
  }, [cameraOn, getFrameBlob, isCollecting, trainingMudra]);

  async function trainMudraModel() {
    setIsTraining(true);
    setTrainingMessage("Training the model…");
    try {
      const response = await fetch(`${API_URL}/api/train`, { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Model training failed.");
      setModelReady(true);
      setTrainingMessage(`Model trained on ${data.sample_count} samples across ${data.classes.length} mudras.`);
      refreshModelStatus();
    } catch (error) {
      setTrainingMessage(error.message);
    } finally {
      setIsTraining(false);
    }
  }

  // Check whether the Python backend is running.
  useEffect(() => {
    let cancelled = false;

    async function checkBackend() {
      
      try {
        const response = await fetch(`${API_URL}/`);

        if (!response.ok) {
          throw new Error("Backend unavailable");
        }

        if (!cancelled) {
          setBackendStatus("online");
        }
      } catch {
        if (!cancelled) {
          setBackendStatus("offline");
        }
      }
    }

    checkBackend();

    const interval = window.setInterval(checkBackend, 10000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  // Release the camera and temporary image URLs when leaving the page.
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      window.speechSynthesis?.cancel();

      if (previousImageUrl.current) {
        URL.revokeObjectURL(previousImageUrl.current);
      }
    };
  }, []);

  const startCamera = useCallback(async () => {
    setCameraError("");

    if (streamRef.current || cameraStarting.current) return;

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError(
        "Camera access is unavailable. Please use a supported browser."
      );
      return;
    }

    cameraStarting.current = true;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      // The permission prompt can outlast the time the user spends on this
      // section. Do not keep a stream that arrived after they left it.
      if (!cameraPageActive.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setCameraOn(true);
      setLiveResult(null);
      setLivePredictionError("");
      setPrediction(null);
    } catch (error) {
      setCameraError(
        error.name === "NotAllowedError"
          ? "Camera permission was denied. Allow camera access in Chrome and try again."
          : "Could not start the camera. Check that your webcam is available."
      );
    } finally {
      cameraStarting.current = false;
    }
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setCameraOn(false);
    setLiveResult(null);
    setLivePredictionError("");
    setPrediction(null);
    setCameraError("");
  }, []);

  // Turn the camera on only while the recognition page is in view.
  useEffect(() => {
    const cameraPage = document.getElementById("recognize");
    if (!cameraPage) return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const isActive = entry.isIntersecting;
        cameraPageActive.current = isActive;

        if (isActive) {
          startCamera();
        } else {
          setIsCollecting(false);
          stopCamera();
        }
      },
      { threshold: 0.2 }
    );

    observer.observe(cameraPage);
    return () => {
      cameraPageActive.current = false;
      observer.disconnect();
      stopCamera();
    };
  }, [startCamera, stopCamera]);

  // Capture one labeled training example with the selected mudra.
  async function captureImage() {
    const video = videoRef.current;

    if (!video || video.readyState < 2) {
      setCameraError("Wait until the camera video is ready.");
      return;
    }

    if (isUploading) {
      return;
    }

    setCameraError("");
    setIsUploading(true);
    setPrediction(null);

    let imageUrl = null;

    try {
      const blob = await getFrameBlob();
      if (!blob) throw new Error("The camera image is not ready. Try again.");

      imageUrl = URL.createObjectURL(blob);
      const formData = new FormData();
      formData.append("file", blob, "mudra-training-sample.jpg");

      const response = await fetch(
        `${API_URL}/api/collect?mudra=${encodeURIComponent(trainingMudra)}`,
        {
        method: "POST",
        body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "The backend could not process the image."
        );
      }

      // Release the previous captured image URL.
      if (previousImageUrl.current) {
        URL.revokeObjectURL(previousImageUrl.current);
      }

      previousImageUrl.current = imageUrl;
      setSampleCounts((current) => ({ ...current, [trainingMudra]: data.count }));
      setTrainingMessage(`Saved training example ${data.count} for ${trainingMudra}.`);

      setPrediction({
        imageUrl,
        message: `Training example ${data.count} saved for ${trainingMudra}.`,
        recognized: false,
        mudraName: null,
        model: "training sample",
        accuracy: null,
        status: "sample_saved",
      });
    } catch (error) {
      if (imageUrl) {
        URL.revokeObjectURL(imageUrl);
      }

      setCameraError(
          error.message || "Could not save this training example."
      );
    } finally {
      setIsUploading(false);
    }
  }

  function speakMeaning() {
    if (!("speechSynthesis" in window)) {
      setCameraError("Speech output is not supported in this browser.");
      return;
    }

    window.speechSynthesis.cancel();

    const text = `${selectedMudra.name}. ${selectedMudra.meaning} It can be used to depict a blossomed lotus or flower. The exact meaning depends on the dance context.`;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-IN";
    utterance.rate = 0.9;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  }

  function stopSpeaking() {
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);
  }

  return (
    <div className="app">
      <header className="navbar">
        <a className="brand" href="#home">
          <span className="brand-icon">ह</span>

          <span>
            <strong>HASTAGYAAN</strong>
            <small>Learn the language of mudras</small>
          </span>
        </a>

        <nav>
          <a href="#learn">Learn</a>
          <a href="#recognize">Recognition</a>
          <a href="#meaning">Mudra Library</a>
        </nav>

        <span className="status">
          <span
            className="status-dot"
            style={{
              background:
                backendStatus === "online"
                  ? "#5d9971"
                  : backendStatus === "offline"
                    ? "#c45b5b"
                    : "#d4a24b",
            }}
          />

          {backendStatus === "online"
            ? "Backend Connected"
            : backendStatus === "offline"
              ? "Backend Offline"
              : "Connecting..."}
        </span>
      </header>

      <main id="home">
        <section className="hero">
          <div className="hero-copy">
            <span className="eyebrow">INDIAN CLASSICAL DANCE · AI</span>

            <h1>
              Every gesture
              <br />
              tells a <span>story.</span>
            </h1>

            <p>
              Discover Bharatanatyam hand gestures, learn how to form them,
              and explore the meanings behind every mudra.
            </p>

            <a className="primary-button" href="#learn">
              Explore your first mudra <span>→</span>
            </a>

            <div className="hero-note">
              <span>✦</span> Learn · Practice · Discover
            </div>
          </div>

          <div className="hero-art">
            <div className="art-circle" />

            <div className="art-label">
              <span>01 / YOUR FIRST MUDRA</span>
              <strong>Alapadma</strong>
              <small>The blossomed lotus</small>
            </div>

            <div
              className="lotus-symbol"
              aria-label="Decorative lotus illustration"
            >
              <svg viewBox="0 0 300 280" role="img">
                <g
                  fill="#E7A5B8"
                  stroke="#9E4968"
                  strokeWidth="2"
                  strokeLinejoin="round"
                >
                  <path d="M150 232 C83 191 91 113 150 31 C209 113 217 191 150 232Z" />
                  <path d="M148 232 C58 214 29 157 44 91 C100 112 139 167 148 232Z" />
                  <path d="M152 232 C242 214 271 157 256 91 C200 112 161 167 152 232Z" />
                  <path d="M149 233 C84 228 45 192 22 146 C91 150 129 185 149 233Z" />
                  <path d="M151 233 C216 228 255 192 278 146 C209 150 171 185 151 233Z" />
                </g>

                <path
                  d="M150 231 Q148 251 137 263 M150 231 Q153 250 166 263"
                  stroke="#68805B"
                  strokeWidth="5"
                  fill="none"
                  strokeLinecap="round"
                />

                <path
                  d="M150 235 C123 218 117 183 150 147 C183 183 177 218 150 235Z"
                  fill="#F8D7A8"
                  stroke="#9E4968"
                  strokeWidth="2"
                />
              </svg>
            </div>

            <div className="floating-card">
              <span>✿</span>
              <div>
                <strong>Alapadma</strong>
                <small>Blossoming · Beauty</small>
              </div>
            </div>
          </div>
        </section>

        <section id="learn" className="section">
          <div className="section-heading">
            <div>
              <span className="eyebrow">STEP 01 · LEARN</span>
              <h2>Meet your first mudra</h2>
              <p>Study the gesture before you try it yourself.</p>
            </div>

            <span className="step-count">01 — 03</span>
          </div>

          <div className="learning-grid">
            <article className="reference-card">
              <div className="reference-visual">
                <span className="image-tag">REFERENCE GESTURE</span>
                <div className="reference-flower">❀</div>
                <p>Alapadma</p>
                <small>Open lotus-like hand gesture</small>
              </div>

              <div className="reference-caption">
                <div>
                  <strong>{selectedMudra.name}</strong>
                  <span>Alapadma · Lotus gesture</span>
                </div>

                <span className="flower-icon">✿</span>
              </div>

              <p className="reference-warning">
                This flower is an illustration, not a verified photograph of
                the traditional hand position.
              </p>
            </article>

            <article className="instruction-card">
              <span className="eyebrow">YOUR LEARNING GUIDE</span>
              <h3>How to form the gesture</h3>
              <p>{selectedMudra.instructions}</p>

              <div className="instruction-list">
                <div>
                  <span>01</span>
                  <p>Relax your hand and open your palm.</p>
                </div>

                <div>
                  <span>02</span>
                  <p>Spread your fingers into a flower-like shape.</p>
                </div>

                <div>
                  <span>03</span>
                  <p>Compare your fingers with a verified reference.</p>
                </div>
              </div>

              <div className="video-placeholder">
                <span className="play-icon">▶</span>
                <div>
                  <strong>Gesture demonstration</strong>
                  <small>Reference video will be added here</small>
                </div>
              </div>

              <p className="muted-note">
                Follow a qualified Bharatanatyam teacher for the exact
                traditional finger positions.
              </p>
            </article>
          </div>
        </section>

        <section id="recognize" className="section recognition-section">
          <div className="section-heading">
            <div>
              <span className="eyebrow">STEP 02 · PRACTICE</span>
              <h2>Try it in front of the camera</h2>
              <p>
                The camera starts while this section is open and checks for
                trained mudras automatically. Capture gesture saves a labeled
                training example.
              </p>
            </div>

            <span className="step-count">02 — 03</span>
          </div>

          <div className="camera-grid">
            <article className="camera-card">
              <div className="camera-topbar">
                <span>LIVE CAMERA</span>

                <span className={cameraOn ? "live-label active" : "live-label"}>
                  <span />
                  {cameraOn ? "CAMERA ON" : "CAMERA OFF"}
                </span>
              </div>

              <div className="camera-view">
                <video
                  ref={videoRef}
                  className={
                    cameraOn ? "camera-video visible" : "camera-video"
                  }
                  autoPlay
                  playsInline
                  muted
                />

                {!cameraOn && (
                  <div className="camera-empty">
                    <span>◎</span>
                    <strong>Your practice space</strong>
                    <p>Start the camera to see your hand here.</p>
                  </div>
                )}

                {cameraOn && (
                  <div className="camera-guide" aria-hidden="true">
                    <span />
                    <span />
                    <span />
                    <span />
                  </div>
                )}
              </div>

              <div className="detection-caption">
                Detected Mudra: {cameraOn
                  ? modelReady
                    ? liveResult?.recognized
                      ? liveResult.prediction
                      : livePredictionError
                        ? "Prediction unavailable"
                        : "Detecting…"
                    : "Model not ready"
                  : "Camera off"}
              </div>

              {livePredictionError && cameraOn && modelReady && (
                <p className="prediction-error" role="status">
                  {livePredictionError}
                </p>
              )}

              {cameraError && (
                <p className="error-message">{cameraError}</p>
              )}

              <div className="camera-actions">
                {!cameraOn ? (
                  <button
                    className="primary-button"
                    onClick={startCamera}
                  >
                    Start camera →
                  </button>
                ) : (
                  <>
                    <button
                      className="primary-button"
                      onClick={captureImage}
                      disabled={isUploading}
                    >
                      {isUploading ? "Saving example…" : "Capture gesture"}
                    </button>

                    <button
                      className="secondary-button"
                      onClick={stopCamera}
                      disabled={isUploading}
                    >
                      Stop camera
                    </button>
                  </>
                )}
              </div>

              <p className="privacy-note">
                Your camera is used only after you grant permission.
              </p>

              <div className="training-panel">
                <span className="eyebrow">BUILD YOUR RECOGNIZER</span>
                <p>
                  Choose the pose you are showing, then collect examples. Keep
                  your hand inside the frame and vary its distance and angle.
                </p>
                <label className="mudra-field">
                  <span>Mudra label</span>
                  <select
                    value={trainingMudra}
                    onChange={(event) => setTrainingMudra(event.target.value)}
                    disabled={isCollecting}
                  >
                    {trainingMudras.map((name) => (
                      <option value={name} key={name}>{name}</option>
                    ))}
                  </select>
                </label>
                <p className="muted-note">
                  {sampleCounts[trainingMudra] || 0} samples saved for {trainingMudra};
                collect at least 20 for every mudra you want to recognize.
                </p>
                <div className="camera-actions">
                  <button
                    className={isCollecting ? "secondary-button" : "primary-button"}
                    onClick={() => {
                      setTrainingMessage("");
                      setIsCollecting((value) => !value);
                    }}
                    disabled={!cameraOn}
                  >
                    {isCollecting ? "Stop collecting" : "Collect this mudra"}
                  </button>
                  <button
                    className="secondary-button"
                    onClick={trainMudraModel}
                    disabled={isTraining}
                  >
                    {isTraining ? "Training…" : "Train model"}
                  </button>
                </div>
                {trainingMessage && <p className="muted-note">{trainingMessage}</p>}
              </div>
            </article>

            <article className="result-card">
              <span className="eyebrow">RECOGNITION RESULT</span>

              <div className="result-symbol">✧</div>

              <h3>
                {modelReady && liveResult
                  ? liveResult.recognized ? liveResult.prediction : "Hold your mudra steady…"
                  : isUploading
                    ? "Saving training example…"
                    : prediction
                      ? prediction.status === "sample_saved"
                        ? "Training example saved"
                        : prediction.mudraName || "Mudra recognized"
                      : modelReady ? "Show a mudra to the camera" : "Collect examples to begin"}
              </h3>

              <p>
                {modelReady && liveResult
                  ? liveResult.recognized
                    ? `Live match · ${(liveResult.accuracy * 100).toFixed(0)}% confidence`
                    : "No confident match yet. Adjust your hand and lighting."
                  : isUploading
                    ? `Saving this frame as ${trainingMudra}.`
                    : prediction
                      ? prediction.message
                      : "Select a label, collect examples, then train the model for live recognition."}
              </p>

              {prediction && (
                <div className="capture-result">
                  <img
                    src={prediction.imageUrl}
                    alt="Captured hand gesture"
                  />

                  <strong>
                    {prediction.status === "sample_saved"
                      ? "Training example saved"
                      : prediction.recognized
                        ? "Recognition completed"
                        : "Image uploaded successfully"}
                  </strong>

                  <p>{prediction.message}</p>

                  {prediction.recognized && prediction.accuracy != null && (
                    <p>
                      Model confidence:{" "}
                      {(Number(prediction.accuracy) * 100).toFixed(1)}%
                    </p>
                  )}

                  {!prediction.recognized && prediction.status !== "sample_saved" && (
                    <p>
                      The image has reached the backend, but the trained CNN
                      has not been connected yet.
                    </p>
                  )}
                </div>
              )}

              <div className="model-status">
                <span
                  className="status-dot pending"
                  style={{
                    background:
                      backendStatus === "online" ? "#5d9971" : "#d4a24b",
                  }}
                />

                {backendStatus === "online"
                  ? modelReady ? "Live mudra model ready" : "Backend connected · model needs training"
                  : backendStatus === "offline"
                    ? "Python backend unavailable"
                    : "Checking backend connection..."}
              </div>

              <p className="muted-note">
                The model learns from your labeled camera examples. Its
                confidence depends on the variety and quality of those samples.
              </p>
            </article>
          </div>
        </section>

        <MudraLibrary />

        <section id="meaning" className="section meaning-section">
          <div className="section-heading">
            <div>
              <span className="eyebrow">STEP 03 · UNDERSTAND</span>
              <h2>Discover the meaning</h2>
              <p>
                Explore the traditional symbolism and expressive uses of
                this gesture.
              </p>
            </div>

            <span className="step-count">03 — 03</span>
          </div>

          <article className="meaning-card">
            <div className="meaning-icon">❀</div>

            <div className="meaning-copy">
              <span className="eyebrow">YOUR MUDRA GUIDE</span>

              <h3>{selectedMudra.name}</h3>
              <h4>{selectedMudra.subtitle}</h4>

              <p>{selectedMudra.meaning}</p>

              <h4>How it can be used</h4>

              <ul>
                {selectedMudra.uses.map((use) => (
                  <li key={use}>{use}</li>
                ))}
              </ul>

              <p className="muted-note">
                Interpretations vary by tradition, teacher, and choreography.
                Confirm detailed explanations with a qualified Bharatanatyam
                teacher or authoritative reference.
              </p>

              <div className="speech-actions">
                <button className="primary-button" onClick={speakMeaning}>
                  {isSpeaking ? "Speaking..." : "🔊 Listen to meaning"}
                </button>

                {isSpeaking && (
                  <button
                    className="secondary-button"
                    onClick={stopSpeaking}
                  >
                    Stop audio
                  </button>
                )}
              </div>
            </div>
          </article>
        </section>

        <footer className="footer">
          <a className="brand footer-brand" href="#home">
            <span className="brand-icon">ह</span>

            <span>
              <strong>HASTAGYAAN</strong>
              <small>Tradition meets technology</small>
            </span>
          </a>

          <p>Built to help preserve and explore Indian classical dance.</p>
        </footer>
      </main>
    </div>
  );
}

export default App;
