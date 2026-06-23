# Student Absence Makeup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a student absence workflow so schedule teachers can mark a lesson as leave/requested absence, keep a small calendar marker in the original slot, and manage pending makeup lessons without deleting the original lesson.

**Architecture:** Store absence state as ordinary `lessonEdits.updates` fields instead of adding a new state bucket. Centralize absence predicates and update helpers in `src/lessonEdits.js`, let `src/calendar.js` exclude absence lessons from normal course/hour counts while still returning them for marker rendering, and keep the UI changes in the existing `src/app.js` planner/detail patterns.

**Tech Stack:** Static HTML/CSS/ES modules, Node built-in test runner, localStorage/Supabase bucket sync through the existing lesson edit save path.

---

## File Structure

- Modify `src/lessonEdits.js`: add constants, predicates, mark/restore/complete helpers, and keep absence fields normalized through existing update storage.
- Modify `src/calendar.js`: expose normal-versus-absence lesson filters, exclude absences from normal lesson statistics, and include absence marker data in week/day summaries.
- Modify `src/app.js`: add `待补课` panel state, buttons, event handlers, lesson detail absence actions, pending makeup table, and cache-busted imports.
- Modify `styles.css`: add absence badge, detail action, modal, and pending makeup table styling.
- Modify `index.html`: bump the app and stylesheet versions.
- Modify `tests/lesson_edits.test.mjs`, `tests/calendar.test.mjs`, and `tests/styles.test.mjs`: cover helper behavior, calendar/stat filtering, and visible UI/source hooks.

---

### Task 1: Lesson Absence Data Helpers

**Files:**
- Modify: `src/lessonEdits.js`
- Test: `tests/lesson_edits.test.mjs`

- [ ] **Step 1: Write failing tests**

Add tests that import and exercise these helpers:

```js
import {
  ABSENCE_STATUS,
  ABSENCE_MAKEUP_DONE,
  ABSENCE_MAKEUP_PENDING,
  applyLessonEdits,
  completeAbsenceMakeupEdit,
  deleteLessonEdit,
  isAbsenceLesson,
  isPendingMakeupLesson,
  markLessonAbsenceEdit,
  restoreAbsenceLessonEdit,
} from "../src/lessonEdits.js";

test("absence edit marks a lesson without deleting it", () => {
  const lessons = [{ id: "l1", status: "已确认", studentName: "Kason" }];
  const edits = markLessonAbsenceEdit({}, "l1", {
    reason: "生病",
    note: "发烧请假",
    markedAt: "2026-06-23T08:00:00.000Z",
  });
  const [lesson] = applyLessonEdits(lessons, edits);

  assert.equal(edits.deletedIds.includes("l1"), false);
  assert.equal(lesson.status, ABSENCE_STATUS);
  assert.equal(lesson.absenceStatus, ABSENCE_MAKEUP_PENDING);
  assert.equal(lesson.absenceReason, "生病");
  assert.equal(lesson.absenceNote, "发烧请假");
  assert.equal(lesson.absenceMarkedAt, "2026-06-23T08:00:00.000Z");
  assert.equal(isAbsenceLesson(lesson), true);
  assert.equal(isPendingMakeupLesson(lesson), true);
});

test("absence edit can be restored or marked as makeup done", () => {
  const marked = markLessonAbsenceEdit({}, "l1", { reason: "临时有事", markedAt: "2026-06-23T08:00:00.000Z" });
  const done = completeAbsenceMakeupEdit(marked, "l1");
  const restored = restoreAbsenceLessonEdit(marked, "l1");

  assert.equal(done.updates.l1.status, ABSENCE_STATUS);
  assert.equal(done.updates.l1.absenceStatus, ABSENCE_MAKEUP_DONE);
  assert.equal(isPendingMakeupLesson(done.updates.l1), false);
  assert.equal(restored.updates.l1.status, "已编辑");
  assert.equal("absenceStatus" in restored.updates.l1, false);
  assert.equal("absenceReason" in restored.updates.l1, false);
});

test("deleting a lesson still removes absence updates", () => {
  const marked = markLessonAbsenceEdit({}, "l1", { reason: "生病", markedAt: "2026-06-23T08:00:00.000Z" });
  const deleted = deleteLessonEdit(marked, "l1");

  assert.deepEqual(deleted.deletedIds, ["l1"]);
  assert.equal(deleted.updates.l1, undefined);
});
```

- [ ] **Step 2: Verify RED**

Run: `node --test tests/lesson_edits.test.mjs`

Expected: FAIL because the absence constants and helper exports do not exist.

- [ ] **Step 3: Implement helpers**

Add constants and helpers to `src/lessonEdits.js`:

```js
export const ABSENCE_STATUS = "请假";
export const ABSENCE_MAKEUP_PENDING = "待补课";
export const ABSENCE_MAKEUP_DONE = "已补课";

export function isAbsenceLesson(lesson) {
  return lesson?.status === ABSENCE_STATUS;
}

export function isPendingMakeupLesson(lesson) {
  return isAbsenceLesson(lesson) && (lesson.absenceStatus || ABSENCE_MAKEUP_PENDING) === ABSENCE_MAKEUP_PENDING;
}

export function markLessonAbsenceEdit(rawEdits, lessonId, { reason = "生病", note = "", markedAt = new Date().toISOString() } = {}) {
  return setLessonEdit(rawEdits, lessonId, {
    status: ABSENCE_STATUS,
    absenceStatus: ABSENCE_MAKEUP_PENDING,
    absenceReason: reason || "生病",
    absenceNote: note || "",
    absenceMarkedAt: markedAt,
  });
}

export function restoreAbsenceLessonEdit(rawEdits, lessonId) {
  const edits = normalizeLessonEdits(rawEdits);
  const id = String(lessonId);
  const current = edits.updates[id] || {};
  const {
    absenceStatus,
    absenceReason,
    absenceNote,
    absenceMarkedAt,
    ...rest
  } = current;

  return setLessonEdit(edits, id, {
    ...rest,
    status: "已编辑",
  });
}

export function completeAbsenceMakeupEdit(rawEdits, lessonId) {
  const edits = normalizeLessonEdits(rawEdits);
  const id = String(lessonId);
  const current = edits.updates[id] || {};

  return setLessonEdit(edits, id, {
    ...current,
    status: ABSENCE_STATUS,
    absenceStatus: ABSENCE_MAKEUP_DONE,
  });
}
```

Then update `compactChanges` so empty absence fields can be cleared when restoring:

```js
if (value === undefined || value === null) {
  continue;
}
```

remains unchanged because the restore helper omits fields instead of setting them to null.

- [ ] **Step 4: Verify GREEN**

Run: `node --test tests/lesson_edits.test.mjs`

Expected: PASS.

---

### Task 2: Calendar And Hour Statistics Behavior

**Files:**
- Modify: `src/calendar.js`
- Test: `tests/calendar.test.mjs`

- [ ] **Step 1: Write failing tests**

Add tests that prove absences are not normal lessons but are preserved as markers:

```js
test("calendar week overview keeps absence markers separate from normal lessons", () => {
  const lessons = [
    makeCalendarLesson("normal", "2026-07-01", "09:00", "10:30"),
    {
      ...makeCalendarLesson("absence", "2026-07-01", "13:00", "15:00"),
      status: "请假",
      absenceStatus: "待补课",
      absenceReason: "生病",
    },
  ];

  const [day] = calendar.buildWeekOverview([{ iso: "2026-07-01", weekday: "三", label: "07-01" }], lessons);

  assert.equal(day.lessonCount, 1);
  assert.equal(day.absenceCount, 1);
  assert.equal(day.segments.find((segment) => segment.id === "afternoon").absenceMarkers.length, 1);
  assert.equal(day.segments.find((segment) => segment.id === "afternoon").absenceMarkers[0].id, "absence");
});

test("teacher weekly duration table excludes absence lessons", () => {
  const table = calendar.buildTeacherWeeklyDurationTable([
    {
      ...makeCalendarLesson("normal", "2026-07-01", "09:00", "10:30"),
      teacherId: "lynn",
      teacherName: "Lynn",
    },
    {
      ...makeCalendarLesson("absence", "2026-07-02", "09:00", "11:00"),
      teacherId: "lynn",
      teacherName: "Lynn",
      status: "请假",
      absenceStatus: "待补课",
    },
  ], {
    weeks: [{ label: "第1周", startDate: "2026-07-01", endDate: "2026-07-05" }],
    teachers: [{ id: "lynn", name: "Lynn" }],
  });

  assert.deepEqual(table.map((item) => [item.teacherName, item.totalLessonCount, item.totalMinutes]), [["Lynn", 1, 90]]);
});
```

- [ ] **Step 2: Verify RED**

Run: `node --test tests/calendar.test.mjs`

Expected: FAIL because absence markers do not exist and the duration table still counts status `请假`.

- [ ] **Step 3: Implement calendar predicates**

Import absence helpers from `lessonEdits.js` and add filters:

```js
import { isAbsenceLesson } from "./lessonEdits.js";

export function isCalendarVisibleLesson(lesson) {
  return lesson.status !== "不可用";
}

export function isNormalCalendarLesson(lesson) {
  return isCalendarVisibleLesson(lesson) && !isAbsenceLesson(lesson);
}

export function filterCalendarLessons(lessons) {
  return lessons.filter(isNormalCalendarLesson);
}

export function filterCalendarAbsenceLessons(lessons) {
  return lessons.filter((lesson) => isCalendarVisibleLesson(lesson) && isAbsenceLesson(lesson));
}
```

- [ ] **Step 4: Implement marker data in `buildWeekOverview`**

Use normal lessons for counts/groups and absence lessons for segment markers:

```js
const normalLessons = filterCalendarLessons(lessons);
const absenceLessons = filterCalendarAbsenceLessons(lessons);
```

Each segment should include `absenceMarkers: []`. For each absence on that day, push it into the matching segment. Each returned day should include `absenceCount`.

- [ ] **Step 5: Verify GREEN**

Run: `node --test tests/calendar.test.mjs`

Expected: PASS.

---

### Task 3: Planner UI And Pending Makeup Panel

**Files:**
- Modify: `src/app.js`
- Modify: `index.html`
- Test: `tests/styles.test.mjs`

- [ ] **Step 1: Write failing source/UI tests**

Add style/source assertions:

```js
test("calendar exposes student absence and pending makeup UI", () => {
  assert.equal(appSource.includes("toggle-makeup-panel"), true);
  assert.equal(appSource.includes("renderPendingMakeupPanel"), true);
  assert.equal(appSource.includes("data-lesson-action=\"absence\""), true);
  assert.equal(appSource.includes("data-lesson-action=\"restore-absence\""), true);
  assert.equal(appSource.includes("data-makeup-action=\"done\""), true);
  assert.equal(appSource.includes("renderAbsenceMarkers"), true);
  assert.ok(css.includes(".absence-marker"));
  assert.ok(css.includes(".pending-makeup-panel"));
  assert.ok(css.includes(".lesson-absence-button"));
});

test("student absence release is cache-busted", () => {
  assert.equal(indexSource.includes("./src/app.js?v=20260623-student-absence"), true);
  assert.equal(indexSource.includes("./styles.css?v=20260623-student-absence"), true);
});
```

- [ ] **Step 2: Verify RED**

Run: `node --test tests/styles.test.mjs`

Expected: FAIL because the new UI hooks and cache versions are absent.

- [ ] **Step 3: Add app imports and state**

Import helpers:

```js
import {
  applyLessonEdits,
  completeAbsenceMakeupEdit,
  deleteLessonEdit,
  isAbsenceLesson,
  isPendingMakeupLesson,
  markLessonAbsenceEdit,
  restoreAbsenceLessonEdit,
  setLessonEdit,
} from "./lessonEdits.js?v=20260623-student-absence";
```

Add state:

```js
showPendingMakeupPanel: false,
pendingAbsenceRequest: null,
```

Update `index.html` and relevant imports to `20260623-student-absence`.

- [ ] **Step 4: Add pending makeup button and panel rendering**

Add a `待补课` button beside `课时统计`. Implement:

```js
function getPendingMakeupLessons(lessons) {
  return lessons.filter(isPendingMakeupLesson).sort(compareCalendarLessons);
}
```

Render a table with date, time, teacher, student, course, reason/note, and actions. The table actions call `openLessonDetailById`, `restoreAbsenceForLesson`, and `completeMakeupForLesson`.

- [ ] **Step 5: Add lesson detail actions**

In `renderLessonDetail`, show:

- Normal lesson: `标记请假` button with `data-lesson-action="absence"`.
- Absence lesson: `恢复为正常课程` and `标记已补课` buttons with distinct action values.

Use a small confirm modal for marking absence:

```js
function openAbsenceConfirm(lessonId) {
  state.pendingAbsenceRequest = { lessonId, reason: "生病", note: "" };
  renderAbsenceConfirmDialog();
}
```

Saving the confirm calls `markLessonAbsenceEdit(state.lessonEdits, lessonId, { reason, note })`, then `saveLessonEdits`.

- [ ] **Step 6: Add absence marker rendering**

In month and week daypart rows, call `renderAbsenceMarkers(segment.absenceMarkers)`. Each marker is clickable with the existing lesson-detail selection path:

```html
<button class="absence-marker" data-lesson-id="...">
  <strong>请假</strong>
  <span>13:00-15:00</span>
  <small>学生 · 课程</small>
</button>
```

- [ ] **Step 7: Verify GREEN**

Run: `node --test tests/styles.test.mjs`

Expected: PASS.

---

### Task 4: Styling And Full Verification

**Files:**
- Modify: `styles.css`
- Test: `tests/styles.test.mjs`

- [ ] **Step 1: Implement styles**

Add styles for:

- `.absence-marker`
- `.lesson-absence-button`
- `.pending-makeup-panel`
- `.pending-makeup-table`
- `.absence-confirm-modal`

The visual goal is soft, compact, and clearly different from normal course cards.

- [ ] **Step 2: Run targeted tests**

Run:

```bash
node --test tests/lesson_edits.test.mjs
node --test tests/calendar.test.mjs
node --test tests/styles.test.mjs
```

Expected: PASS.

- [ ] **Step 3: Run full verification**

Run:

```bash
node --test tests/*.test.mjs
node --check src/app.js
node --check src/calendar.js
node --check src/lessonEdits.js
git diff --check
```

Expected: PASS, no whitespace errors.

- [ ] **Step 4: Local resource verification**

Run:

```bash
python3 -m http.server 4173 --bind 127.0.0.1
curl -s http://127.0.0.1:4173/ | rg "20260623-student-absence"
curl -s "http://127.0.0.1:4173/src/app.js?v=20260623-student-absence" | rg "renderPendingMakeupPanel|markLessonAbsenceEdit|renderAbsenceMarkers"
curl -s "http://127.0.0.1:4173/src/calendar.js?v=20260623-student-absence" | rg "filterCalendarAbsenceLessons|absenceMarkers"
```

Expected: all commands find the new release strings and hooks.

- [ ] **Step 5: Commit and deploy**

Run:

```bash
git add index.html styles.css src/app.js src/calendar.js src/lessonEdits.js tests/lesson_edits.test.mjs tests/calendar.test.mjs tests/styles.test.mjs docs/superpowers/plans/2026-06-23-student-absence-makeup.md
git commit -m "Add student absence makeup tracking"
git push origin main
```

Expected: push succeeds.

- [ ] **Step 6: Hosted verification**

Run:

```bash
curl -fsSL "https://sophienie1997.github.io/jiedeng-class-scheduler/" | rg "20260623-student-absence"
curl -fsSL "https://sophienie1997.github.io/jiedeng-class-scheduler/src/app.js?v=20260623-student-absence" | rg "renderPendingMakeupPanel|markLessonAbsenceEdit"
```

Expected: hosted page serves the new release.
