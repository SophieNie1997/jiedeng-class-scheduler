import test from "node:test";
import assert from "node:assert/strict";

import { getScopedLessonIds, updateLessonsInScope } from "../src/lessonSeries.js";

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
