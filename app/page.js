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

  useEffect(() => {
    return () => {
      clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const startRecording = useCallback(async () => {
    setErrorMessage("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = pickMimeType();
      mimeTypeRef.current = mimeType;
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeTypeRef.current || "audio/webm" });
        setAudioUrl(URL.createObjectURL(blob));
        streamRef.current?.getTracks().forEach((t) => t.stop());
        clearInterval(timerRef.current);
        setPhase("recorded");
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setSeconds(0);
      setPhase("recording");
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch (err) {
      setErrorMessage(
        "Couldn't access the microphone. Check that this app has microphone permission in iPhone Settings > Safari."
      );
      setPhase("error");
    }
  }, []);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
  }, []);

  const reset = useCallback(() => {
    setPhase("idle");
    setSeconds(0);
    setAudioUrl(null);
    setErrorMessage("");
    setNotionUrl("");
    setSelectedCategory("");
    chunksRef.current = [];
  }, []);

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
