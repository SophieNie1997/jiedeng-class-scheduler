import test from "node:test";
import assert from "node:assert/strict";

import {
  createCourseColorResolver,
  getLessonCourseKey,
  lessonColorPalette,
} from "../src/lessonColors.js";

test("lesson course keys ignore teacher identity", () => {
  assert.equal(getLessonCourseKey({ teacherId: "lynn", teacherName: "Lynn", course: "Orion 复习" }), "orion 复习");
  assert.equal(getLessonCourseKey({ teacherId: "tiana", teacherName: "Tiana", course: "Orion 复习" }), "orion 复习");
});

test("course color resolver reuses a color for the same course", () => {
  const resolveColor = createCourseColorResolver(["green", "blue", "rose"]);

  assert.equal(resolveColor({ teacherId: "lynn", course: "Orion 复习" }), "green");
  assert.equal(resolveColor({ teacherId: "tiana", course: "Orion 复习" }), "green");
});

test("course color resolver avoids repeats while the palette has room", () => {
  const resolveColor = createCourseColorResolver(lessonColorPalette);
  const courses = [
    "WAICY 集训",
    "AI 财商",
    "英语陪伴",
    "托雅集训",
    "1v1 复习",
    "Ziyi",
    "Patrick+Valerie",
    "Kason",
    "George的复习课",
    "Orion 复习",
    "Ziyi上门",
    "Eddie上门",
  ];

  const colors = courses.map((course) => resolveColor({ course }));

  assert.equal(new Set(colors).size, courses.length);
});
