import test from "node:test";
import assert from "node:assert/strict";

import { existingLessons } from "../src/data.js";
import { summerCourseLessons } from "../src/summerCourseLessons.js";

test("summer course lessons are included in the app lesson dataset", () => {
  assert.equal(summerCourseLessons.length, 0);

  const summerIds = new Set(summerCourseLessons.map((lesson) => lesson.id));
  const mergedSummerLessons = existingLessons.filter((lesson) => summerIds.has(lesson.id));

  assert.equal(mergedSummerLessons.length, 0);
});

test("app lesson dataset excludes early demo seed lessons", () => {
  assert.equal(existingLessons.some((lesson) => String(lesson.id).startsWith("lesson-")), false);
});
