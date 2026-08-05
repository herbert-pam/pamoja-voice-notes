// Sends the recorded audio to OpenAI's transcription API and returns plain text.
export async function transcribeAudio(fileBuffer, filename, mimeType) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY environment variable.");
  }

  // whisper-1 is the most broadly available/stable model. You can switch to
  // gpt-4o-mini-transcribe or gpt-4o-transcribe later by setting the
  // TRANSCRIBE_MODEL environment variable in Vercel.
  const model = process.env.TRANSCRIBE_MODEL || "whisper-1";

  const form = new FormData();
  const blob = new Blob([fileBuffer], { type: mimeType || "application/octet-stream" });
  form.append("file", blob, filename);
  form.append("model", model);

  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Transcription failed (${res.status}): ${errText.slice(0, 300)}`);
  }

  const data = await res.json();
  return (data.text || "").trim();
}
