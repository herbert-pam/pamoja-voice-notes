import { transcribeAudio } from "../../../lib/transcribe";
import { saveToNotion } from "../../../lib/notion";

export const runtime = "nodejs";
export const maxDuration = 60;

const ALLOWED_CATEGORIES = ["Pamoja Marketing", "Pamoja Operations", "Pamoja Tournaments"];

export async function POST(request) {
  try {
    const formData = await request.formData();
    const audio = formData.get("audio");
    const category = formData.get("category");

    if (!audio || typeof audio === "string") {
      return Response.json({ error: "No audio was received." }, { status: 400 });
    }
    if (!ALLOWED_CATEGORIES.includes(category)) {
      return Response.json({ error: "Unknown category." }, { status: 400 });
    }

    const arrayBuffer = await audio.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (buffer.length === 0) {
      return Response.json({ error: "The recording was empty." }, { status: 400 });
    }

    const transcript = await transcribeAudio(buffer, audio.name || "note.webm", audio.type);
    const notionUrl = await saveToNotion({
      category,
      transcript,
      recordedAt: new Date().toISOString(),
    });

    return Response.json({ ok: true, transcript, notionUrl });
  } catch (err) {
    console.error(err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Unexpected server error." },
      { status: 500 }
    );
  }
}
