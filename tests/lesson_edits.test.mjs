import test from "node:test";
import assert from "node:assert/strict";

import {
  applyLessonEdits,
  deleteLessonEdit,
  normalizeLessonEdits,
  restoreDeletedLessonEdits,
  setLessonEdit,
} from "../src/lessonEdits.js";

test("lesson edits update matching fields without mutating source lessons", () => {
  const lessons = [
    {
      id: "lesson-1",
      teacherId: "hanna",
      teacherName: "Hanna",
      studentName: "班课",
      course: "全天营语法（基础）",
      deliveryType: "线下",
      date: "2026-07-01",
      startTime: "09:00",
      endTime: "11:30",
      status: "Excel导入",
    },
  ];
  const edits = setLessonEdit({}, "lesson-1", {
    teacherId: "phebe",
    teacherName: "Phebe",
    studentName: "新班课",
    course: "AI 财商",
    campus: "徐汇",
    date: "2026-07-02",
    startTime: "10:00",
    endTime: "12:00",
    notes: "改到徐汇",
  });

  const updated = applyLessonEdits(lessons, edits);

  assert.equal(updated[0].id, "lesson-1");
  assert.equal(updated[0].teacherId, "phebe");
  assert.equal(updated[0].teacherName, "Phebe");
  assert.equal(updated[0].course, "AI 财商");
  assert.equal(updated[0].campus, "徐汇");
  assert.equal(updated[0].date, "2026-07-02");
  assert.equal(updated[0].startTime, "10:00");
  assert.equal(updated[0].endTime, "12:00");
  assert.equal(updated[0].notes, "改到徐汇");
  assert.equal(lessons[0].teacherId, "hanna");
});

test("deleted lesson edits remove the lesson from active schedule data", () => {
  const lessons = [
    { id: "keep", teacherId: "hanna" },
    { id: "remove", teacherId: "lynn" },
  ];
  const edits = deleteLessonEdit({}, "remove");

  assert.deepEqual(
    applyLessonEdits(lessons, edits).map((lesson) => lesson.id),
    ["keep"],
  );
});

test("restore deleted lesson edits keeps updates and clears deleted ids", () => {
  const restored = restoreDeletedLessonEdits({
    updates: {
      keep: { course: "AI 财商", notes: "保留手动修改" },
    },
    deletedIds: ["restore-1", "restore-2"],
  });

  assert.deepEqual(restored, {
    updates: {
      keep: { course: "AI 财商", notes: "保留手动修改" },
    },
    deletedIds: [],
  });
});

test("lesson edits append user-created lessons to active schedule data", () => {
  const lessons = [{ id: "existing", teacherId: "hanna", course: "英语陪伴" }];
  const edits = setLessonEdit({}, "manual-lesson-1", {
    teacherId: "phebe",
    teacherName: "Phebe",
    studentName: "新增学生",
    course: "AI 财商",
    date: "2026-07-08",
    startTime: "10:00",
    endTime: "11:00",
    status: "手动新增",
  });

  const updated = applyLessonEdits(lessons, edits);

  assert.deepEqual(
    updated.map((lesson) => lesson.id),
    ["existing", "manual-lesson-1"],
  );
  assert.equal(updated[1].teacherName, "Phebe");
  assert.equal(updated[1].status, "手动新增");
});

test("lesson edits can skip appended lessons for temporary preview schedules", () => {
  const edits = setLessonEdit({}, "manual-lesson-1", {
    teacherId: "phebe",
    course: "AI 财商",
  });

  assert.deepEqual(applyLessonEdits([], edits, { includeAddedLessons: false }), []);
});

test("normalization keeps only supported lesson edit buckets", () => {
  const normalized = normalizeLessonEdits({
    updates: { a: { course: "英语陪伴" } },
    deletedIds: ["b"],
    unexpected: true,
  });

  assert.deepEqual(normalized, {
    updates: { a: { course: "英语陪伴" } },
    deletedIds: ["b"],
  });
});
