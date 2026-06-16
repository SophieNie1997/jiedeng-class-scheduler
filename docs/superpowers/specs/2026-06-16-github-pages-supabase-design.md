# GitHub Pages + Supabase Design

## Goal

Turn the local static `桔灯排课助手` into a shared web app that can be hosted on GitHub Pages while storing colleague edits in Supabase so changes can be seen by other open browser sessions.

## Current State

The app is a static HTML/CSS/ES module site. Imported Excel data is compiled into JavaScript modules under `src/`, while user edits are currently stored in browser `localStorage`.

The shared mutable state has four buckets:

- `shiftOverrides`: teacher work/rest/holiday changes
- `coursePermissions`: which teachers can teach protected courses
- `customCatalog`: manual teacher and course directory additions
- `lessonEdits`: course edits, manual added lessons, and deleted lesson IDs

## Architecture

GitHub Pages hosts the static app. Supabase stores one row per state bucket in a `class_system_state` table. The browser loads local defaults immediately, then hydrates from Supabase when configured. Saving writes to `localStorage` first, then upserts the relevant Supabase row.

If Supabase is not configured, the app behaves exactly like the current local-only version.

## Data Flow

1. App loads static imported lessons, teacher roster, and default shifts.
2. App reads local storage synchronously so the first render is fast.
3. App attempts to load `src/supabaseConfig.js`.
4. If configured, app creates a Supabase client through the browser ESM CDN.
5. App fetches remote state rows, normalizes each bucket with existing helpers, updates state, and re-renders.
6. On save, app writes the bucket locally and upserts the remote row.
7. Realtime subscriptions listen for remote changes and apply updated buckets.

## Conflict Strategy

For the first shared MVP, each bucket uses last-write-wins. Each remote row includes `updated_at` and `updated_by` fields so the UI can later show who changed it. This keeps the migration small and avoids a heavy collaborative editor model before the team has used the shared tool.

## Security

The frontend uses a Supabase publishable anon key, which is safe to include in static frontend code only when Row Level Security is configured. The recommended MVP policy is:

- authenticated users can read all rows
- authenticated users can insert/update the four known bucket rows
- anonymous users cannot read or write production state

The first code step supports remote sync, but actual shared editing requires the Supabase project URL/key and RLS policies from `docs/deployment/supabase.sql`.

## Error Handling

Remote sync failures do not block local editing. The app logs a warning, keeps local state, and can retry on the next save or reload. Invalid remote payloads are normalized by the existing bucket-specific normalization functions.

## Testing

Unit tests cover the remote store without contacting Supabase by using a fake client. Existing scheduler, calendar, style, and Excel extraction tests remain the regression suite.

