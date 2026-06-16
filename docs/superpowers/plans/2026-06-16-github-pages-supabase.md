# GitHub Pages Supabase Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a GitHub Pages compatible Supabase sync layer while preserving the current local-only behavior.

**Architecture:** Keep the static frontend. Add a small storage adapter that maps four local state buckets to Supabase rows, falls back to `localStorage`, and exposes realtime subscription hooks for the app.

**Tech Stack:** Vanilla ES modules, Node test runner, GitHub Pages static hosting, Supabase JavaScript client loaded from CDN in the browser.

---

### Task 1: Document Deployment Inputs

**Files:**
- Create: `docs/deployment/supabase.sql`
- Create: `src/supabaseConfig.example.js`
- Create: `.nojekyll`

- [ ] Add SQL for `class_system_state` with RLS and realtime publication.
- [ ] Add a browser config example with `url` and `anonKey` placeholders.
- [ ] Add `.nojekyll` so GitHub Pages serves `src/` assets without Jekyll processing.

### Task 2: Remote Store Adapter

**Files:**
- Create: `src/remoteStore.js`
- Create: `tests/remote_store.test.mjs`

- [ ] Write tests for configured/unconfigured remote store behavior.
- [ ] Verify the tests fail before implementation.
- [ ] Implement `createRemoteStore`.
- [ ] Verify tests pass.

### Task 3: App Integration

**Files:**
- Modify: `src/app.js`
- Test: `tests/styles.test.mjs`
- Test: `tests/remote_store.test.mjs`

- [ ] Add app bucket constants and a hydration flow.
- [ ] Replace direct save-only behavior with local save plus async remote upsert.
- [ ] Subscribe to remote bucket changes and re-render after normalization.
- [ ] Keep local behavior unchanged when `src/supabaseConfig.js` is missing.

### Task 4: GitHub Readiness

**Files:**
- Create: `.gitignore`
- Create: `docs/deployment/github-pages.md`

- [ ] Ignore local Supabase config and OS/cache files.
- [ ] Document GitHub Pages setup steps.
- [ ] Initialize git if needed.
- [ ] Check whether `gh` is authenticated before attempting remote creation or push.

### Task 5: Verification

**Commands:**
- `node --check src/app.js`
- `node --test tests/*.mjs`
- `/Users/sophienie/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 tests/extract_excel_lessons_test.py`
- `/Users/sophienie/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 tests/extract_summer_courses_test.py`

- [ ] Run all commands and inspect output.
- [ ] Start or reuse a local static server.
- [ ] Check `http://127.0.0.1:4173/` in the browser if UI behavior changed.

