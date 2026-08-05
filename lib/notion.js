// Creates a page in the single "Voice Notes" Notion database, with Category as
// a select property and the transcript written into the page body.

function chunkText(text, size) {
  if (!text) return [];
  const chunks = [];
  for (let i = 0; i < text.length; i += size) {
    chunks.push(text.slice(i, i + size));
  }
  return chunks;
}

export async function saveToNotion({ category, transcript, recordedAt }) {
  const apiKey = process.env.NOTION_API_KEY;
  const databaseId = process.env.NOTION_DATABASE_ID;

  if (!apiKey) throw new Error("Missing NOTION_API_KEY environment variable.");
  if (!databaseId) throw new Error("Missing NOTION_DATABASE_ID environment variable.");

  const cleanTranscript = (transcript || "").trim();
  const title = cleanTranscript
    ? cleanTranscript.slice(0, 60) + (cleanTranscript.length > 60 ? "…" : "")
    : `Voice note - ${recordedAt}`;

  // Notion blocks cap out at 2000 characters of rich text each, so long
  // transcripts are split across multiple paragraph blocks.
  const children = chunkText(cleanTranscript, 1900).map((chunk) => ({
    object: "block",
    type: "paragraph",
    paragraph: {
      rich_text: [{ type: "text", text: { content: chunk } }],
    },
  }));

  const res = await fetch("https://api.notion.com/v1/pages", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Notion-Version": "2022-06-28",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      parent: { database_id: databaseId },
      properties: {
        Name: { title: [{ text: { content: title } }] },
        Category: { select: { name: category } },
        Date: { date: { start: recordedAt } },
      },
      children: children.length
        ? children
        : [
            {
              object: "block",
              type: "paragraph",
              paragraph: { rich_text: [{ type: "text", text: { content: "(No speech detected.)" } }] },
            },
          ],
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Notion save failed (${res.status}): ${errText.slice(0, 300)}`);
  }

  const data = await res.json();
  return data.url;
}
