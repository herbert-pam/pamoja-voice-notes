# Step 1: Set up Notion

You'll create one Notion database that holds every recording, with a
Category field to sort Marketing / Operations / Tournaments notes and a
Recorded By field showing who made each note. This takes about 5 minutes.

## 1. Create the integration (this is how the app talks to your Notion)

1. Go to **notion.so/my-integrations** and sign in.
2. Click **New integration**.
3. Name it `Pamoja Voice Notes`, pick the workspace you want it connected to, and click **Save**.
4. On the next screen, copy the **Internal Integration Secret** (it starts with `secret_` or `ntn_`). Save it somewhere private — this is your `NOTION_API_KEY`, and you'll paste it into Vercel later (never into this chat).

## 2. Create the database

1. In Notion, create a new page and add a **Table - Full page** database. Name it `Voice Notes`.
2. Set up these properties exactly as named below — the app matches these names and category options exactly, so spelling and capitalization matter:
   - `Name` — this already exists by default (it's the title property). Leave it as is.
   - `Category` — add a new property, type **Select**. Add three options, spelled exactly:
     - `Pamoja Marketing`
     - `Pamoja Operations`
     - `Pamoja Tournaments`
   - `Date` — add a new property, type **Date**.
   - `Recorded By` — add a new property, type **Select**. You don't need to
     add options here — the app creates a new option automatically the
     first time each person signs in and records a note.

Every recording will show up as a page in this database, with the full transcript written into the page body (not just the property — Notion property text is capped at 2000 characters, so long transcripts go in the body instead).

## 3. Share the database with your integration

1. Open the `Voice Notes` database.
2. Click the **•••** menu in the top right corner.
3. Under **Connections**, search for and add `Pamoja Voice Notes` (the integration you created in step 1).

If you skip this step, the app will get a "not found" error when it tries to save notes, even though your API key is correct.

## 4. Get the database ID

1. Open the `Voice Notes` database as a full page (not a modal).
2. Look at the URL in your browser. It looks like:
   `https://www.notion.so/yourworkspace/1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d?v=...`
3. The 32-character chunk right after your workspace name (before the `?v=`) is your **Database ID**. Copy it — this is `NOTION_DATABASE_ID`.

You now have two values saved somewhere private:
- `NOTION_API_KEY` (the integration secret)
- `NOTION_DATABASE_ID` (from the URL)

You'll enter both of these into Vercel's environment variables in the next step — see `DEPLOY.md`.
