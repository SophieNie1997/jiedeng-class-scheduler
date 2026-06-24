import test from "node:test";
import assert from "node:assert/strict";

import {
  ABSENCE_MAKEUP_DONE,
  ABSENCE_MAKEUP_PENDING,
  ABSENCE_STATUS,
  applyLessonEdits,
  completeAbsenceMakeupEdit,
  deleteLessonEdit,
  findMatchingManualLessonSeriesBaseId,
  isAbsenceLesson,
  isPendingMakeupLesson,
  markLessonAbsenceEdit,
  normalizeLessonEdits,
  restoreDeletedLessonEdits,
  restoreAbsenceLessonEdit,
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

test("matching manual lesson series reuses an existing base id", () => {
  const seriesLesson = {
    teacherId: "ig",
    teacherName: "IG类课程老师",
    studentName: "Mona",
    course: "IG预科班",
    grade: "Y8",
    deliveryType: "校区",
    campus: "碧云",
    startDate: "2026-06-24",
    date: "2026-06-24",
    startTime: "09:00",
    endTime: "12:00",
    durationMinutes: 180,
    sessionCount: 12,
    recurrenceWeekdays: [1, 3],
    status: "手动新增",
  };
  const edits = setLessonEdit(
    setLessonEdit({}, "manual-1782279412769", seriesLesson),
    "manual-1782279412769-2",
    {
      ...seriesLesson,
      date: "2026-06-29",
    },
  );

  const match = findMatchingManualLessonSeriesBaseId(edits, {
    ...seriesLesson,
    regenerateSeriesDates: true,
  });

  assert.equal(match, "manual-1782279412769");
});

test("matching manual lesson series ignores different course groups", () => {
  const edits = setLessonEdit({}, "manual-2000", {
    teacherId: "ig",
    teacherName: "IG类课程老师",
    studentName: "Mona",
    course: "测试",
    grade: "Y8",
    deliveryType: "校区",
    campus: "碧云",
    startDate: "2026-06-24",
    date: "2026-06-24",
    startTime: "09:00",
    endTime: "12:00",
    durationMinutes: 180,
    sessionCount: 12,
    recurrenceWeekdays: [1, 3],
    status: "手动新增",
  });

  const match = findMatchingManualLessonSeriesBaseId(edits, {
    teacherId: "ig",
    teacherName: "IG类课程老师",
    studentName: "Mona",
    course: "IG预科班",
    grade: "Y8",
    deliveryType: "校区",
    campus: "碧云",
    startDate: "2026-06-24",
    date: "2026-06-24",
    startTime: "09:00",
    endTime: "12:00",
    durationMinutes: 180,
    sessionCount: 12,
    recurrenceWeekdays: [1, 3],
    status: "手动新增",
  });

  assert.equal(match, "");
});

test("matching manual lesson series treats the campus as the delivery identity", () => {
  const edits = setLessonEdit({}, "manual-3000", {
    teacherId: "ig",
    teacherName: "IG类课程老师",
    studentName: "Mona",
    course: "IG预科班",
    grade: "Y8",
    deliveryType: "校区",
    campus: "碧云",
    startDate: "2026-06-24",
    date: "2026-06-24",
    startTime: "09:00",
    endTime: "12:00",
    durationMinutes: 180,
    sessionCount: 12,
    recurrenceWeekdays: [1, 3],
    status: "手动新增",
  });

  const match = findMatchingManualLessonSeriesBaseId(edits, {
    teacherId: "ig",
    teacherName: "IG类课程老师",
    studentName: "Mona",
    course: "IG预科班",
    grade: "Y8",
    deliveryType: "线下",
    campus: "碧云",
    startDate: "2026-06-24",
    date: "2026-06-24",
    startTime: "09:00",
    endTime: "12:00",
    durationMinutes: 180,
    sessionCount: 12,
    recurrenceWeekdays: [1, 3],
    status: "手动新增",
  });

  assert.equal(match, "manual-3000");
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

test("absence edit preserves existing lesson updates", () => {
  const edits = setLessonEdit({}, "l1", {
    teacherId: "lynn",
    teacherName: "Lynn",
    notes: "先改到 Lynn",
  });
  const marked = markLessonAbsenceEdit(edits, "l1", {
    reason: "其他",
    markedAt: "2026-06-23T08:00:00.000Z",
  });

  assert.equal(marked.updates.l1.teacherId, "lynn");
  assert.equal(marked.updates.l1.teacherName, "Lynn");
  assert.equal(marked.updates.l1.notes, "先改到 Lynn");
  assert.equal(marked.updates.l1.status, ABSENCE_STATUS);
  assert.equal(marked.updates.l1.absenceReason, "其他");
});

test("absence edit can be restored or marked as makeup done", () => {
  const marked = markLessonAbsenceEdit({}, "l1", {
    reason: "临时有事",
    markedAt: "2026-06-23T08:00:00.000Z",
  });
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
  const marked = markLessonAbsenceEdit({}, "l1", {
    reason: "生病",
    markedAt: "2026-06-23T08:00:00.000Z",
  });
  const deleted = deleteLessonEdit(marked, "l1");

  assert.deepEqual(deleted.deletedIds, ["l1"]);
  assert.equal(deleted.updates.l1, undefined);
});
