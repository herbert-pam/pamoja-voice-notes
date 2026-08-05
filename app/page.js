"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const CATEGORIES = ["Pamoja Marketing", "Pamoja Operations", "Pamoja Tournaments"];

function pickMimeType() {
  const candidates = [
    "audio/mp4",
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg",
  ];
  for (const type of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported?.(type)) {
      return type;
    }
  }
  return "";
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const s = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  return `${m}:${s}`;
}

export default function Home() {
  const [phase, setPhase] = useState("idle"); // idle | recording | recorded | uploading | done | error
  const [seconds, setSeconds] = useState(0);
  const [audioUrl, setAudioUrl] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [notionUrl, setNotionUrl] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const timerRef = useRef(null);
  const mimeTypeRef = useRef("");
  const wakeLockRef = useRef(null);
  const interruptedRef = useRef(false);

  const releaseWakeLock = useCallback(() => {
    wakeLockRef.current?.release?.().catch(() => {});
    wakeLockRef.current = null;
  }, []);

  const requestWakeLock = useCallback(async () => {
    try {
      if ("wakeLock" in navigator) {
        wakeLockRef.current = await navigator.wakeLock.request("screen");
      }
    } catch {
      // Wake Lock isn't supported/available (older iOS, low battery mode, etc).
      // Recording can still proceed — the screen just won't be held awake automatically.
    }
  }, []);

  useEffect(() => {
    // If the screen locks anyway (wake lock denied, or the user presses the
    // physical lock button), iOS kills the mic. Re-acquire the wake lock when
    // we come back to the foreground so the *next* recording is protected too.
    const onVisibility = () => {
      if (document.visibilityState === "visible" && mediaRecorderRef.current?.state === "recording") {
        requestWakeLock();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      releaseWakeLock();
    };
  }, [requestWakeLock, releaseWakeLock]);

  const startRecording = useCallback(async () => {
    setErrorMessage("");
    interruptedRef.current = false;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = pickMimeType();
      mimeTypeRef.current = mimeType;
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];

      // iOS cuts off microphone access the moment the screen locks or Safari
      // is backgrounded — this fires when that happens mid-recording.
      stream.getAudioTracks().forEach((track) => {
        track.onended = () => {
          if (mediaRecorderRef.current?.state === "recording") {
            interruptedRef.current = true;
            mediaRecorderRef.current.stop();
          }
        };
      });

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        clearInterval(timerRef.current);
        releaseWakeLock();
        streamRef.current?.getTracks().forEach((t) => t.stop());

        if (interruptedRef.current) {
          chunksRef.current = [];
          setErrorMessage(
            "Recording stopped because the screen locked or the app went to the background. iPhone doesn't allow web apps to use the microphone while locked — keep the screen on and this app in the foreground while recording. (This app now tries to keep your screen awake automatically during recording, but that only works if Low Power Mode is off.)"
          );
          setPhase("error");
          return;
        }

        const blob = new Blob(chunksRef.current, { type: mimeTypeRef.current || "audio/webm" });
        setAudioUrl(URL.createObjectURL(blob));
        setPhase("recorded");
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setSeconds(0);
      setPhase("recording");
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
      requestWakeLock();
    } catch (err) {
      setErrorMessage(
        "Couldn't access the microphone. Check that this app has microphone permission in iPhone Settings > Safari."
      );
      setPhase("error");
    }
  }, [requestWakeLock, releaseWakeLock]);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
  }, []);

  const reset = useCallback(() => {
    releaseWakeLock();
    setPhase("idle");
    setSeconds(0);
    setAudioUrl(null);
    setErrorMessage("");
    setNotionUrl("");
    setSelectedCategory("");
    chunksRef.current = [];
  }, [releaseWakeLock]);

  const submit = useCallback(
    async (category) => {
      if (!chunksRef.current.length) return;
      setSelectedCategory(category);
      setPhase("uploading");
      setErrorMessage("");
      try {
        const blob = new Blob(chunksRef.current, { type: mimeTypeRef.current || "audio/webm" });
        const form = new FormData();
        const ext = (mimeTypeRef.current || "").includes("mp4") ? "m4a" : "webm";
        form.append("audio", blob, `note.${ext}`);
        form.append("category", category);

        const res = await fetch("/api/save", { method: "POST", body: form });
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data?.error || "Something went wrong saving this note.");
        }

        setNotionUrl(data.notionUrl || "");
        setPhase("done");
      } catch (err) {
        setErrorMessage(err.message || "Something went wrong saving this note.");
        setPhase("error");
      }
    },
    []
  );

  return (
    <main>
      <div className="header">
        <h1>Pamoja Voice Notes</h1>
        <p>Record it, tag it, and it lands in Notion as text.</p>
      </div>

      {(phase === "idle" || phase === "recording") && (
        <div className="record-area">
          <button
            className={`record-button ${phase === "recording" ? "recording" : ""}`}
            onClick={phase === "recording" ? stopRecording : startRecording}
          >
            {phase === "recording" ? "Stop" : "Record"}
          </button>
          <div className="timer">{phase === "recording" ? formatTime(seconds) : "Tap to start"}</div>
        </div>
      )}

      {phase === "recorded" && audioUrl && (
        <>
          <div className="card">
            <h2>Preview</h2>
            <audio controls src={audioUrl} />
          </div>
          <div className="category-grid">
            {CATEGORIES.map((cat) => (
              <button key={cat} className="category-button" onClick={() => submit(cat)}>
                {cat}
              </button>
            ))}
          </div>
          <button className="reset-link" onClick={reset}>
            Discard and re-record
          </button>
        </>
      )}

      {phase === "uploading" && (
        <div className="status">
          <span className="spinner" /> Transcribing and sending to Notion under{" "}
          <strong>{selectedCategory}</strong>…
        </div>
      )}

      {phase === "done" && (
        <div className="status success">
          Saved to Notion under <strong>{selectedCategory}</strong>.
          {notionUrl && (
            <>
              {" "}
              <a href={notionUrl} target="_blank" rel="noreferrer">
                Open in Notion
              </a>
            </>
          )}
          <div>
            <button className="reset-link" onClick={reset}>
              Record another note
            </button>
          </div>
        </div>
      )}

      {phase === "error" && (
        <div className="status error">
          {errorMessage}
          <div>
            <button className="reset-link" onClick={reset}>
              Try again
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
