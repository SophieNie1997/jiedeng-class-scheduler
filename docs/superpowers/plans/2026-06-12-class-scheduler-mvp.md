# Class Scheduler MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local static web MVP for a course scheduler that recommends teachers for fixed recurring courses and shows an all-teacher weekly calendar grid.

**Architecture:** Use dependency-free browser code so the app opens locally and remains easy to hand off. Keep scheduling logic in a pure JavaScript module with Node tests, and keep DOM rendering in a separate browser module.

**Tech Stack:** HTML, CSS, vanilla JavaScript modules, Node built-in test runner.

---

## File Structure

- `index.html`: application shell and root mount point.
- `styles.css`: visual system, form layout, recommendation cards, and calendar grid.
- `src/scheduler.js`: pure scheduling utilities for time parsing, recurrence expansion, teacher matching, and conflict detection.
- `src/data.js`: sample teachers, students, and scheduled lessons derived from the current business scenario.
- `src/app.js`: browser UI state, event handlers, rendering, and local interactions.
- `tests/scheduler.test.mjs`: Node tests for the scheduling logic.

## Tasks

### Task 1: Scheduling Core

**Files:**
- Create: `src/scheduler.js`
- Test: `tests/scheduler.test.mjs`

- [ ] Write tests for 15-minute time parsing, recurring lesson expansion, teacher availability, and conflict scoring.
- [ ] Run `/Users/sophienie/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node --test tests/scheduler.test.mjs` and verify tests fail because the module does not exist.
- [ ] Implement the scheduling functions.
- [ ] Run the same test command and verify all tests pass.

### Task 2: Static App Data

**Files:**
- Create: `src/data.js`

- [ ] Create sample teacher records with weekly availability, teaching scopes, delivery types, and maximum weekly hours.
- [ ] Create sample existing lessons so the weekly grid has realistic occupied slots.
- [ ] Use names and lesson patterns visible in the provided spreadsheets, without storing private phone or address fields.

### Task 3: Browser UI

**Files:**
- Create: `index.html`
- Create: `src/app.js`
- Create: `styles.css`

- [ ] Build a two-panel operations surface: left side for new recurring scheduling, right side for recommendation results.
- [ ] Build a weekly calendar grid below the scheduler, with days across the top and time down the side.
- [ ] Render lesson cards at the correct day/time position using the 15-minute calculation model.
- [ ] Add interaction for selecting a recommended teacher and previewing the generated recurring lessons in the calendar.

### Task 4: Verification

**Files:**
- Modify as needed after verification.

- [ ] Run Node tests.
- [ ] Open the local app in a browser.
- [ ] Verify the page is nonblank, readable on desktop, and the recurring-course flow updates recommendations and preview cards.
- [ ] Fix any clipping, overlap, unreadable text, or broken interaction found during verification.

