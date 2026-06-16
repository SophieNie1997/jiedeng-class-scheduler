import test from "node:test";
import assert from "node:assert/strict";

import { existingLessons } from "../src/data.js";
import { summerCourseLessons } from "../src/summerCourseLessons.js";

test("summer course lessons are included in the app lesson dataset", () => {
  assert.equal(summerCourseLessons.length, 32);

  const summerIds = new Set(summerCourseLessons.map((lesson) => lesson.id));
  const mergedSummerLessons = existingLessons.filter((lesson) => summerIds.has(lesson.id));

  assert.equal(mergedSummerLessons.length, 32);
  assert.ok(
    mergedSummerLessons.some(
      (lesson) =>
        lesson.teacherId === "phebe" &&
        lesson.course === "AI 财商" &&
        lesson.campus === "徐汇" &&
        lesson.notes.includes("樱桃图书馆英语课后") &&
        lesson.date === "2026-07-17",
    ),
  );
  assert.ok(
    mergedSummerLessons.some(
      (lesson) =>
        lesson.teacherId === "sophie" &&
        lesson.course === "WAICY 集训" &&
        lesson.campus === "徐汇" &&
        lesson.date === "2026-07-15",
    ),
  );
});

test("app lesson dataset excludes early demo seed lessons", () => {
  assert.equal(existingLessons.some((lesson) => String(lesson.id).startsWith("lesson-")), false);
});
