# GitHub Pages Deployment

## One-Time Supabase Setup

1. Create a Supabase project.
2. Open SQL Editor and run `docs/deployment/supabase.sql`.
3. Leave `requireAuth: false` in `src/supabaseConfig.js` if the team should edit without logging in.
4. If you later restore login-gated editing, enable Email provider and add the GitHub Pages URL to the allowed redirect URLs.
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
2. The app reads shared state from Supabase immediately.
3. Saving lessons, shifts, permissions, students, or catalog changes writes to Supabase and updates other open sessions through Realtime.

With `requireAuth: false`, anyone with the public link can edit shared state. Switch it back to `true` and tighten the SQL policies before requiring login again.

## Local Fallback

If `src/supabaseConfig.js` is missing or empty, the app keeps the current local-only behavior and saves edits in browser `localStorage`.
