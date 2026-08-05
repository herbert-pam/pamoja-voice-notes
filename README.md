# Pamoja Voice Notes

A tiny installable web app: record a voice note on your iPhone, tap a
category (Pamoja Marketing / Pamoja Operations / Pamoja Tournaments), and
the transcript gets sent straight into a Notion database.

## Setup order

1. **`NOTION_SETUP.md`** — create the Notion integration and database.
2. **`DEPLOY.md`** — get an OpenAI API key, put this code on GitHub, deploy
   it to Vercel for free, and add it to your iPhone home screen.

## How it works

- The page (`app/page.js`) records audio in the browser with the
  MediaRecorder API — no native app, no App Store.
- `manifest.json` and the meta tags in `app/layout.js` are what let iOS
  treat it like a real app icon when you "Add to Home Screen."
- When you pick a category, the recording is uploaded to `/api/save`
  (`app/api/save/route.js`), which:
  1. Sends the audio to OpenAI's transcription API (`lib/transcribe.js`).
  2. Creates a page in your Notion database with the transcript
     (`lib/notion.js`).
- Recordings themselves aren't stored anywhere after transcription — only
  the resulting text reaches Notion. Say the word if you'd rather keep the
  original audio files too; that's a small follow-up feature, not a
  rebuild.

## Local development (optional, only if you want to tinker with the code)

```bash
npm install
npm run dev
```

Requires Node.js 18+ installed on whatever machine you run this on.
