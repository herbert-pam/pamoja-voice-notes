# Step 2: Get an OpenAI API key (for transcription)

1. Go to **platform.openai.com**, sign in (a separate account from ChatGPT's
   free tier — this is the pay-as-you-go API).
2. Add a payment method under **Settings > Billing**. Transcribing voice
   notes costs a small fraction of a cent per minute of audio — a typical
   personal-use volume runs well under a dollar a month. Check
   **platform.openai.com/pricing** for the current rate before relying on
   an exact number, since pricing can change.
3. Go to **platform.openai.com/api-keys**, click **Create new secret key**,
   name it `Pamoja Voice Notes`, and copy the key (starts with `sk-`).
   Save it somewhere private — this is `OPENAI_API_KEY`. Like the Notion
   key, you'll paste it directly into Vercel, never into this chat.

# Step 3: Put the code on GitHub (no terminal needed)

1. Go to **github.com** and create a free account if you don't have one.
2. Click the **+** in the top right → **New repository**. Name it
   `pamoja-voice-notes`, keep it either Public or Private (your choice),
   and click **Create repository** — leave it empty, don't add a README.
3. On the new repo's page, click **uploading an existing file**.
4. Unzip the project folder you were sent, then drag the *contents* of that
   folder (not the zip file itself, and not the folder as one item — select
   everything inside it) into the GitHub upload area. Modern browsers
   preserve the folder structure when you drag multiple files/folders at
   once.
5. Scroll down and click **Commit changes**.

# Step 4: Deploy to Vercel

1. Go to **vercel.com** and sign up — choose **Continue with GitHub** so it
   can see your new repo directly. No credit card required.
2. Click **Add New… > Project**.
3. Find `pamoja-voice-notes` in the list and click **Import**. Vercel will
   detect it's a Next.js app automatically — leave the build settings as
   the defaults.
4. Before clicking Deploy, expand **Environment Variables** and add all
   three of these (paste the values you saved earlier, not into this chat):
   - `OPENAI_API_KEY`
   - `NOTION_API_KEY`
   - `NOTION_DATABASE_ID`
5. Click **Deploy**. It takes about a minute the first time.
6. Once it finishes, Vercel gives you a URL like
   `https://pamoja-voice-notes.vercel.app`. Open that on your iPhone.

# Step 5: Add it to your iPhone home screen

1. Open the Vercel URL in **Safari** on your iPhone (must be Safari, not
   Chrome, for "Add to Home Screen" to work properly).
2. Tap the **Share** icon (square with an arrow) in the toolbar.
3. Tap **Add to Home Screen**, confirm the name (`Voice Notes`), and tap
   **Add**.

You'll now have an app icon on your home screen. Open it, allow microphone
access when prompted, record a short test note, tap one of the three
category buttons, and check that a new page shows up in your Notion
`Voice Notes` database within a few seconds.

# If something doesn't work

- **"Missing OPENAI_API_KEY" or "Missing NOTION_API_KEY" error** — an
  environment variable wasn't saved. In Vercel, go to your project's
  **Settings > Environment Variables**, check all three are there, then
  go to **Deployments** and re-deploy (environment variable changes need a
  fresh deploy to take effect).
- **"Notion save failed (404)"** — almost always means the database wasn't
  shared with the integration. Revisit step 3 in `NOTION_SETUP.md`.
- **"Notion save failed (400)" mentioning "Category"** — the Select
  options in Notion don't exactly match `Pamoja Marketing` /
  `Pamoja Operations` / `Pamoja Tournaments`. Check spelling/capitalization
  in the database.
- **Microphone doesn't work** — must be opened in Safari (not embedded in
  another app's browser), and the site must be the `https://` Vercel URL,
  not `http://`.
