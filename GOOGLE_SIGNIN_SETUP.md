# Step: Add Google Sign-In

This adds a "Sign in with Google" screen in front of the recorder, so every
note gets tagged with who actually recorded it — and only people you
approve can use the app at all.

## 1. Create a Google Cloud project

1. Go to **console.cloud.google.com** and sign in (your Pamoja Google
   account is fine).
2. If you don't already have a project, click the project dropdown at the
   top and **New Project**. Name it `Pamoja Voice Notes` and create it.

## 2. Set up the OAuth consent screen

1. In the left sidebar, go to **APIs & Services > OAuth consent screen**.
2. Choose **External** as the user type (this just controls who *can*
   request access — the app itself will still only let approved emails in,
   via the allowlist in step 4 below).
3. Fill in the required fields: app name (`Pamoja Voice Notes`), your
   support email, and developer contact email.
4. On the Scopes step, the defaults (email, profile) are all this app
   needs — you don't need to add anything.
5. On the Test users step, you can add the specific Google emails of your
   team here too (Google requires this while the app is "in testing" —
   more on that below). Save and continue through to finish.

## 3. Create the OAuth Client ID

1. Go to **APIs & Services > Credentials**.
2. Click **+ Create Credentials > OAuth client ID**.
3. Application type: **Web application**. Name it `Pamoja Voice Notes`.
4. Under **Authorized redirect URIs**, click **+ Add URI** and enter:
   `https://YOUR-VERCEL-URL/api/auth/callback/google`
   — replace `YOUR-VERCEL-URL` with your actual Vercel domain (e.g.
   `pamoja-voice-notes.vercel.app`), no trailing slash.
5. Click **Create**. A popup shows your **Client ID** and **Client
   Secret** — copy both somewhere private. These are `GOOGLE_CLIENT_ID`
   and `GOOGLE_CLIENT_SECRET`.

**About "testing" mode:** Google apps start in Testing mode, which limits
sign-in to email addresses you've explicitly listed as test users (step 2.5
above) — capped at 100 users. For a small team of 2–10 people, this is
completely fine to leave as-is indefinitely; you only need to submit for
Google's verification review if you want it open to the general public,
which this app never should be.

## 4. Add the new environment variables in Vercel

Go to your project in Vercel → **Settings > Environment Variables** and
add these alongside the three you already have:

- `GOOGLE_CLIENT_ID` — from step 3
- `GOOGLE_CLIENT_SECRET` — from step 3
- `AUTH_SECRET` — a random secret used to encrypt sessions. Use this
  ready-made one (already generated securely for this app — save it
  somewhere private, treat it like a password):

  ```
  w9SQLKug+5klzNmKLbv66vuYQnaORHFXl7BSLnVqBVA=
  ```

- `ALLOWED_EMAILS` — a comma-separated list of the exact Google emails
  allowed to use the app, e.g.:

  ```
  herbert@pamojasidebyside.org,teammate@gmail.com
  ```

  Anyone not on this list will see "not approved" and won't be able to
  record, even if they successfully sign in with Google.

After adding these, go to **Deployments**, open the latest one, and
**Redeploy** — new environment variables only take effect on a fresh
deploy.

## 5. Add "Recorded By" to your Notion database

See the updated `NOTION_SETUP.md` — one new property to add, same idea as
Category.

## If something doesn't work

- **"Error 400: redirect_uri_mismatch"** — the redirect URI in Google
  Cloud Console doesn't exactly match your Vercel URL. Check for typos,
  `http` vs `https`, and no trailing slash.
- **"Access blocked: this app's request is invalid"** or similar — usually
  means the OAuth consent screen setup wasn't finished, or your email
  wasn't added as a test user in step 2.5.
- **Signs in fine but immediately bounces back with an error** — that's
  the `ALLOWED_EMAILS` check in the app itself rejecting the account.
  Double-check the email is spelled exactly right in that Vercel variable
  (case doesn't matter, but typos do).
