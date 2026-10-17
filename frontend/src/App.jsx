import { useEffect, useRef, useState } from "react";
import "./App.css";

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

function App() {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const previousImageUrl = useRef(null);

  const [cameraOn, setCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [selectedMudra] = useState(mudras.alapadma);
  const [prediction, setPrediction] = useState(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [backendStatus, setBackendStatus] = useState("checking");

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

  async function startCamera() {
    setCameraError("");

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError(
        "Camera access is unavailable. Please use a supported browser."
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setCameraOn(true);
      setPrediction(null);
    } catch (error) {
      setCameraError(
        error.name === "NotAllowedError"
          ? "Camera permission was denied. Allow camera access in Chrome and try again."
          : "Could not start the camera. Check that your webcam is available."
      );
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setCameraOn(false);
    setPrediction(null);
    setCameraError("");
  }

  // Capture the webcam image and send it to FastAPI.
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
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      if (!canvas.width || !canvas.height) {
        throw new Error("The camera image is not ready. Try again.");
      }

      const context = canvas.getContext("2d");

      if (!context) {
        throw new Error("Unable to process the camera image.");
      }

      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Convert the captured frame into a JPEG image.
      const blob = await new Promise((resolve, reject) => {
        canvas.toBlob(
          (result) => {
            if (result) {
              resolve(result);
            } else {
              reject(new Error("Unable to capture the image."));
            }
          },
          "image/jpeg",
          0.92
        );
      });

      imageUrl = URL.createObjectURL(blob);

      // FastAPI expects the uploaded image under the field name "file".
      const formData = new FormData();
      formData.append("file", blob, "mudra.jpg");

      const response = await fetch(`${API_URL}/api/predict`, {
        method: "POST",
        body: formData,
      });

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

      setPrediction({
        imageUrl,
        message: data.message || "Image received by the backend.",
        recognized: data.recognized === true,
        mudraName: data.prediction || null,
        model: data.model || null,
        accuracy: data.accuracy ?? null,
        status: data.status || "image_received",
      });
    } catch (error) {
      if (imageUrl) {
        URL.revokeObjectURL(imageUrl);
      }

      setCameraError(
        error.message ||
          "Could not connect to the backend. Make sure FastAPI is running."
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
                Position your hand clearly in the frame, capture an image,
                and send it to our Python backend.
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
                      {isUploading ? "Sending image..." : "Capture gesture"}
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
            </article>

            <article className="result-card">
              <span className="eyebrow">RECOGNITION RESULT</span>

              <div className="result-symbol">✧</div>

              <h3>
                {isUploading
                  ? "Sending your image..."
                  : prediction
                    ? prediction.recognized
                      ? prediction.mudraName || "Mudra recognized"
                      : "Image received!"
                    : "Ready to discover?"}
              </h3>

              <p>
                {isUploading
                  ? "Please wait while the Python backend processes your image."
                  : prediction
                    ? prediction.message
                    : "Capture your hand gesture to send an image to the backend."}
              </p>

              {prediction && (
                <div className="capture-result">
                  <img
                    src={prediction.imageUrl}
                    alt="Captured hand gesture"
                  />

                  <strong>
                    {prediction.recognized
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

                  {!prediction.recognized && (
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
                  ? "Python backend connected"
                  : backendStatus === "offline"
                    ? "Python backend unavailable"
                    : "Checking backend connection..."}
              </div>

              <p className="muted-note">
                A real mudra prediction will appear after we train and
                integrate the CNN model.
              </p>
            </article>
          </div>
        </section>

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