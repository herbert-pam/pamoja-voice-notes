import { auth } from "../../../auth";
import { transcribeAudio } from "../../../lib/transcribe";
import { saveToNotion } from "../../../lib/notion";

export const runtime = "nodejs";
export const maxDuration = 60;

const ALLOWED_CATEGORIES = ["Pamoja Marketing", "Pamoja Operations", "Pamoja Tournaments"];

const allowedEmails = (process.env.ALLOWED_EMAILS || "")
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

export async function POST(request) {
  try {
    // Who recorded this comes from the verified server-side session, never
    // from anything the client sends — the sign-in callback already blocks
    // non-allowed emails from getting a session in the first place, this is
    // just a second check in case that config ever changes.
    const session = await auth();
    const email = session?.user?.email?.toLowerCase();
    if (!email) {
      return Response.json({ error: "You need to sign in first." }, { status: 401 });
    }
    if (allowedEmails.length > 0 && !allowedEmails.includes(email)) {
      return Response.json({ error: "Your account isn't approved for this app." }, { status: 403 });
    }
    const recordedBy = session.user?.name || email;

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
      recordedBy,
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
