# Supabase Notes

A small static notes app with email/password registration, login and logout. Signed-in users can create, view, edit, and delete notes. Supabase Auth identifies each user; PostgreSQL row-level security ensures each account can access only its own notes.

## Set up Supabase

1. Create a project at [supabase.com/dashboard](https://supabase.com/dashboard).
2. In the project dashboard, open **SQL Editor**, paste in [`supabase/schema.sql`](./supabase/schema.sql), and run it. This creates the notes table, its update timestamp trigger, and the row-level security policy.
3. Open **Project Settings → API** and copy the **Project URL** and the **publishable key** (or the legacy `anon` key).
4. Put those values into [`config.js`](./config.js):

   ```js
   export const SUPABASE_URL = "https://your-project.supabase.co";
   export const SUPABASE_PUBLISHABLE_KEY = "your-publishable-key";
   ```

   These are browser-visible public values. Never use a `service_role` or secret key in this app; the database policy is the security boundary.
5. In **Authentication → Providers → Email**, keep email/password enabled. If email confirmation is on, confirm each test account from its email before logging in. For a throwaway local demo you may turn confirmation off in the Supabase Auth settings; do not disable it for a real service.

## Run locally

From the project directory, start a static file server:

```powershell
python -m http.server 8000
```

Open [http://localhost:8000](http://localhost:8000). The app loads Supabase JS from a CDN, so an internet connection is required. No package install or build step is needed.

## Verify account privacy with two browser sessions

1. Open the app in two separate browser profiles, or use a regular window and a private window.
2. Register and log in with two different test email accounts (confirm each email first if confirmation is enabled).
3. In the first session, create a note. Verify it appears there.
4. In the second session, verify that note is not listed. Create a different note there and verify only that account sees it.
5. Edit and delete each account's own note, then log out and back in to verify the changes persisted.

The app never requests another user's notes, and the `notes` table enforces ownership in PostgreSQL with row-level security.

## Deploy

This is a static site and can be deployed to GitHub Pages or another static host. Configure `config.js` with the same public Supabase URL and publishable key before deploying, and add the deployed site URL to your Supabase Auth URL configuration. Do not put private database credentials in frontend files.
