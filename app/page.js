"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSession, signIn, signOut } from "next-auth/react";

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

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.88 2.7-6.62z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.98v2.33A9 9 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.17.28-1.7V4.97H.98A9 9 0 0 0 0 9c0 1.45.35 2.83.98 4.03z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .98 4.97L3.95 7.3C4.66 5.17 6.65 3.58 9 3.58z" />
    </svg>
  );
}

function SignInScreen() {
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("error")) setDenied(true);
    }
  }, []);

  return (
    <main>
      <div className="header">
        <h1>Pamoja Voice Notes</h1>
        <p>Sign in to record, tag, and send notes to Notion.</p>
      </div>
      <div className="card signin-card">
        {denied && (
          <p className="status error" style={{ marginTop: 0 }}>
            That Google account isn't approved for this app yet. Ask Herbert to add your email to the
            allowed list.
          </p>
        )}
        <button className="google-button" onClick={() => signIn("google")}>
          <GoogleIcon />
          Sign in with Google
        </button>
      </div>
    </main>
  );
}

function Recorder({ session }) {
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

        // Who recorded this is determined server-side from the signed-in
        // session (see /api/save) — nothing identity-related is trusted
        // from the client here.
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
      <div className="user-bar">
        <span>
          Signed in as <strong>{session.user?.name || session.user?.email}</strong>
        </span>
        <button className="signout-link" onClick={() => signOut()}>
          Sign out
        </button>
      </div>

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

export default function Home() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <main>
        <div className="header">
          <h1>Pamoja Voice Notes</h1>
        </div>
        <div className="status">
          <span className="spinner" /> Loading…
        </div>
      </main>
    );
  }

  if (!session) {
    return <SignInScreen />;
  }

  return <Recorder session={session} />;
}
