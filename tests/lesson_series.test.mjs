import test from "node:test";
import assert from "node:assert/strict";

import { alignExplicitSeriesDates, getScopedLessonIds, updateLessonsInScope } from "../src/lessonSeries.js";

const lessons = [
  makeLesson("a", "2026-07-01", "Phebe"),
  makeLesson("b", "2026-07-08", "Phebe"),
  makeLesson("c", "2026-07-15", "Phebe"),
  makeLesson("other-teacher", "2026-07-08", "Sophie", "sophie"),
  makeLesson("other-time", "2026-07-15", "Phebe", "phebe", "16:00", "17:00"),
];

test("lesson scope can target only the current lesson", () => {
  assert.deepEqual(getScopedLessonIds(lessons, "b", "single"), ["b"]);
});

test("lesson scope can target current and following matching series lessons", () => {
  assert.deepEqual(getScopedLessonIds(lessons, "b", "following"), ["b", "c"]);
});

test("lesson scope keeps a matching series together when campus is missing on a later lesson", () => {
  assert.deepEqual(
    getScopedLessonIds(
      [
        makeLesson("a", "2026-07-07", "Phebe"),
        {
          ...makeLesson("b", "2026-07-08", "Phebe"),
          campus: "",
        },
      ],
      "a",
      "following",
    ),
    ["a", "b"],
  );
});

test("scoped updates keep following lesson dates while applying edited fields", () => {
  const updates = updateLessonsInScope(lessons, {}, "b", "following", {
    teacherId: "lynn",
    teacherName: "Lynn",
    studentName: "班课",
    course: "AI 财商",
    campus: "徐汇",
    deliveryType: "线下",
    date: "2026-07-09",
    startTime: "10:00",
    endTime: "11:00",
    durationMinutes: 60,
    notes: "改后续",
  });

  assert.equal(updates.updates.b.date, "2026-07-09");
  assert.equal(updates.updates.c.date, "2026-07-15");
  assert.equal(updates.updates.c.teacherName, "Lynn");
  assert.equal(updates.updates.c.startTime, "10:00");
  assert.equal(updates.updates.c.notes, "改后续");
  assert.equal(Object.hasOwn(updates.updates, "other-teacher"), false);
  assert.equal(Object.hasOwn(updates.updates, "other-time"), false);
});

test("scoped updates regenerate following lesson dates from edited start date", () => {
  const updates = updateLessonsInScope(lessons, {}, "b", "following", {
    teacherId: "phebe",
    teacherName: "Phebe",
    studentName: "班课",
    course: "AI 财商",
    campus: "徐汇",
    deliveryType: "线下",
    startDate: "2026-07-07",
    date: "2026-07-08",
    startTime: "15:00",
    endTime: "16:00",
    durationMinutes: 60,
    sessionCount: 2,
    recurrenceWeekdays: [2, 3, 4, 5],
    regenerateSeriesDates: true,
    notes: "开始日期提前",
  });

  assert.equal(updates.updates.b.date, "2026-07-07");
  assert.equal(updates.updates.c.date, "2026-07-08");
  assert.equal(updates.updates.b.startDate, "2026-07-07");
  assert.equal(updates.updates.c.startDate, "2026-07-07");
});

test("explicit edited series dates align from their saved start date on load", () => {
  const aligned = alignExplicitSeriesDates([
    {
      ...makeLesson("b", "2026-07-08", "Phebe"),
      startDate: "2026-07-07",
      sessionCount: 2,
      recurrenceWeekdays: [2, 3],
    },
    {
      ...makeLesson("c", "2026-07-15", "Phebe"),
      startDate: "2026-07-07",
      sessionCount: 2,
      recurrenceWeekdays: [2, 3],
    },
  ]);

  assert.deepEqual(
    aligned.map((lesson) => lesson.date),
    ["2026-07-07", "2026-07-08"],
  );
});

function makeLesson(id, date, teacherName, teacherId = teacherName.toLowerCase(), startTime = "15:00", endTime = "16:00") {
  return {
    id,
    teacherId,
    teacherName,
    studentName: "班课",
    course: "AI 财商",
    deliveryType: "线下",
    campus: "徐汇",
    date,
    startTime,
    endTime,
    durationMinutes: 60,
    status: "已确认",
  };
}
