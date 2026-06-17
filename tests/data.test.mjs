import test from "node:test";
import assert from "node:assert/strict";

import { candidateTeachers, existingLessons } from "../src/data.js";
import { applyLessonEdits, setLessonEdit } from "../src/lessonEdits.js";

const activeTeacherIds = new Set(candidateTeachers.map((teacher) => teacher.id));
const activeTeacherNames = new Set(candidateTeachers.map((teacher) => teacher.name));

test("app lesson dataset only keeps lessons for the six active teachers", () => {
  assert.deepEqual(
    candidateTeachers.map((teacher) => teacher.name),
    ["Claire", "Phebe", "Sophie", "Lynn", "Tiana", "Catherine"],
  );
  assert.ok(existingLessons.length > 0);
  assert.equal(
    existingLessons.every(
      (lesson) => activeTeacherIds.has(lesson.teacherId) && activeTeacherNames.has(lesson.teacherName),
    ),
    true,
  );
  assert.equal(existingLessons.some((lesson) => ["Gioia", "Charlotte", "Karen", "Hanna"].includes(lesson.teacherName)), false);
});

test("post-edit lesson filtering can drop legacy Supabase lesson edits for retired teachers", () => {
  const edits = setLessonEdit({}, "manual-old-teacher", {
    teacherId: "gioia",
    teacherName: "Gioia",
    studentName: "旧老师课程",
    course: "WAICY 集训",
    date: "2026-07-01",
    startTime: "10:00",
    endTime: "11:00",
  });
  const edited = applyLessonEdits(existingLessons, edits);
  const filtered = edited.filter((lesson) => activeTeacherIds.has(lesson.teacherId));

  assert.equal(edited.some((lesson) => lesson.teacherName === "Gioia"), true);
  assert.equal(filtered.some((lesson) => lesson.teacherName === "Gioia"), false);
});
