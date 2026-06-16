# Calendar Week Overview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the crowded seven-day time grid with a readable week overview.

**Architecture:** Keep matching and imported lesson data unchanged. Add pure calendar view helpers in `src/calendar.js`, then render a grouped week overview in `src/app.js`. The calendar surface intentionally avoids the older single-day detail timeline.

**Tech Stack:** Vanilla JavaScript modules, native CSS, Node test runner.

---

### Task 1: Calendar View Data Helpers

**Files:**
- Modify: `src/calendar.js`
- Test: `tests/calendar.test.mjs`

- [ ] Write tests for grouped week overview data.
- [ ] Run `node --test tests/calendar.test.mjs` and confirm the new tests fail.
- [ ] Add `compareCalendarLessons` and `buildWeekOverview`.
- [ ] Re-run `node --test tests/calendar.test.mjs`.

### Task 2: Render Week Overview

**Files:**
- Modify: `src/app.js`
- Modify: `styles.css`

- [ ] Replace `renderCalendar()` with a week overview.
- [ ] Add CSS for `.calendar-overview`, `.calendar-day-card`, `.calendar-time-group`, and `.lesson-row`.
- [ ] Remove old time-grid detail styling after the week overview is sufficient.

### Task 3: Verify

**Files:**
- Test: `tests/*.mjs`
- Test: `tests/extract_excel_lessons_test.py`

- [ ] Run `node --check src/app.js && node --check src/calendar.js`.
- [ ] Run `node --test tests/*.mjs`.
- [ ] Run bundled Python unittest for Excel extraction.
- [ ] Open `http://127.0.0.1:4173/` and verify the week overview shows full course rows without narrow horizontal stacking.
