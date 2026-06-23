import test from "node:test";
import assert from "node:assert/strict";

import {
  createCourseColorResolver,
  getLessonCourseKey,
  getLessonColorKey,
  lessonColorPalette,
} from "../src/lessonColors.js";

test("lesson course keys keep course text normalized", () => {
  assert.equal(getLessonCourseKey({ teacherId: "lynn", teacherName: "Lynn", course: "Orion 复习" }), "orion 复习");
  assert.equal(getLessonCourseKey({ teacherId: "tiana", teacherName: "Tiana", course: "Orion 复习" }), "orion 复习");
});

test("lesson color keys include teacher identity and course", () => {
  assert.equal(getLessonColorKey({ teacherId: "lynn", teacherName: "Lynn", course: "Ziyi上门" }), "lynn|ziyi上门");
  assert.equal(getLessonColorKey({ teacherId: "tiana", teacherName: "Tiana", course: "Ziyi上门" }), "tiana|ziyi上门");
});

test("course color resolver reuses a color for the same teacher and course", () => {
  const resolveColor = createCourseColorResolver(["green", "blue", "rose"], new Map(), {
    lynn: ["green", "blue", "rose"],
  });

  assert.equal(resolveColor({ teacherId: "lynn", course: "Orion 复习" }), "green");
  assert.equal(resolveColor({ teacherId: "lynn", course: "Orion 复习" }), "green");
});

test("course color resolver separates teachers into different color families", () => {
  const resolveColor = createCourseColorResolver(lessonColorPalette);

  assert.equal(resolveColor({ teacherId: "lynn", teacherName: "Lynn", course: "Ziyi上门" }), "teal");
  assert.equal(resolveColor({ teacherId: "tiana", teacherName: "Tiana", course: "Patrick+Valerie" }), "orange");
});

test("course color resolver spreads one teacher's course tones apart", () => {
  const resolveColor = createCourseColorResolver(lessonColorPalette);

  assert.equal(resolveColor({ teacherId: "lynn", teacherName: "Lynn", course: "Ziyi上门" }), "teal");
  assert.equal(resolveColor({ teacherId: "lynn", teacherName: "Lynn", course: "Orion 复习" }), "blue");
  assert.equal(resolveColor({ teacherId: "tiana", teacherName: "Tiana", course: "Patrick+Valerie" }), "orange");
  assert.equal(resolveColor({ teacherId: "tiana", teacherName: "Tiana", course: "Kason" }), "butter");
});

test("course color resolver avoids repeats while the palette has room", () => {
  const resolveColor = createCourseColorResolver(lessonColorPalette);
  const lessons = [
    { teacherId: "claire", course: "WAICY 集训" },
    { teacherId: "phebe", course: "AI 财商" },
    { teacherId: "sophie", course: "英语陪伴" },
    { teacherId: "catherine", course: "托雅集训" },
    { teacherId: "lynn", course: "Ziyi" },
    { teacherId: "tiana", course: "Patrick+Valerie" },
    { teacherId: "lynn", course: "Kason" },
    { teacherId: "tiana", course: "Kason" },
    { teacherId: "tiana", course: "George的复习课" },
    { teacherId: "lynn", course: "Orion 复习" },
    { teacherId: "lynn", course: "Ziyi上门" },
    { teacherId: "lynn", course: "Eddie上门" },
  ];

  const colors = lessons.map((lesson) => resolveColor(lesson));

  assert.equal(new Set(colors).size, lessons.length);
});
