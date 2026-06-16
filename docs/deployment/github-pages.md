# GitHub Pages Deployment

## One-Time Supabase Setup

1. Create a Supabase project.
2. Open SQL Editor and run `docs/deployment/supabase.sql`.
3. In Authentication settings, enable Email provider.
4. Add the GitHub Pages URL to the allowed redirect URLs.
5. Copy `src/supabaseConfig.example.js` to `src/supabaseConfig.js`.
6. Fill in `url`, `anonKey`, and `redirectTo`.

Use the publishable anon key only. Do not paste a Supabase service role key into frontend files.

## GitHub Pages Setup

1. Create a GitHub repository for this folder.
2. Commit and push the project.
3. In GitHub repository settings, open Pages.
4. Choose Deploy from branch.
5. Select the default branch and root folder.
6. Visit the published Pages URL after the deployment finishes.

## Shared Editing Flow

1. A colleague opens the GitHub Pages URL.
2. They enter their work email in the sync panel.
3. Supabase sends a magic-link email.
4. After login, the app reads shared state from Supabase.
5. Saving lessons, shifts, permissions, or catalog changes writes to Supabase and updates other open sessions through Realtime.

## Local Fallback

If `src/supabaseConfig.js` is missing or empty, the app keeps the current local-only behavior and saves edits in browser `localStorage`.

