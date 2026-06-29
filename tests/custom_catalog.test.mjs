import test from "node:test";
import assert from "node:assert/strict";

import * as customCatalog from "../src/customCatalog.js";

const {
  addCustomGrade,
  addCustomCourse,
  addCustomTeacher,
  hideBaseTeacher,
  mergeCatalog,
  normalizeCustomCatalog,
  removeCustomTeacher,
} = customCatalog;

const baseTeachers = [
  {
    id: "hanna",
    name: "Hanna",
    courses: ["英语陪伴"],
    grades: ["Y6"],
    deliveryTypes: ["线下"],
    maxWeeklyHours: 22,
    weeklyAvailability: [],
    unavailable: [],
  },
];

test("custom catalog adds a teacher with a stable manual teacher shape", () => {
  const catalog = addCustomTeacher({}, "Mia");

  assert.equal(catalog.teachers.length, 1);
  assert.equal(catalog.teachers[0].id, "mia");
  assert.equal(catalog.teachers[0].name, "Mia");
  assert.deepEqual(catalog.teachers[0].courses, []);
  assert.deepEqual(catalog.teachers[0].weeklyAvailability, []);
});

test("custom catalog dedupes courses and keeps normalized course names", () => {
  const catalog = addCustomCourse({ courses: ["AI 财商"] }, "财商x樱桃 徐汇暑期课");

  assert.deepEqual(catalog.courses, ["AI 财商"]);
});

test("custom catalog merges teachers and courses without duplicating base entries", () => {
  const catalog = normalizeCustomCatalog({
    teachers: [{ id: "hanna", name: "重复老师" }, { id: "mia", name: "Mia" }],
    courses: ["英语陪伴", "AI 财商"],
  });

  const merged = mergeCatalog(baseTeachers, ["英语陪伴"], catalog);

  assert.deepEqual(
    merged.teachers.map((teacher) => teacher.name),
    ["Hanna", "Mia"],
  );
  assert.deepEqual(merged.courses, ["英语陪伴", "AI 财商"]);
});

test("custom catalog keeps hidden imported teacher ids without removing shift roster by default", () => {
  const catalog = normalizeCustomCatalog({
    removedTeacherIds: ["hanna"],
    removedCourses: ["英语陪伴"],
    teachers: [{ id: "mia", name: "Mia" }],
    courses: ["AI 财商"],
  });

  const defaultMerged = mergeCatalog(baseTeachers, ["英语陪伴"], catalog);
  const permissionMerged = mergeCatalog(baseTeachers, ["英语陪伴"], catalog, { excludeRemovedTeachers: true });

  assert.deepEqual(catalog.removedTeacherIds, ["hanna"]);
  assert.equal("removedCourses" in catalog, false);
  assert.deepEqual(catalog.removedCourseNames, []);
  assert.deepEqual(
    defaultMerged.teachers.map((teacher) => teacher.name),
    ["Hanna", "Mia"],
  );
  assert.deepEqual(
    permissionMerged.teachers.map((teacher) => teacher.name),
    ["Mia"],
  );
  assert.deepEqual(defaultMerged.courses, ["英语陪伴", "AI 财商"]);
});

test("custom catalog can hide imported courses from permission-facing merged catalogs", () => {
  assert.equal(typeof customCatalog.hideBaseCourse, "function");

  const catalog = customCatalog.hideBaseCourse({ courses: ["AI 财商"] }, "英语陪伴");
  const defaultMerged = mergeCatalog(baseTeachers, ["英语陪伴"], catalog);
  const permissionMerged = mergeCatalog(baseTeachers, ["英语陪伴"], catalog, { excludeRemovedCourses: true });

  assert.deepEqual(catalog.removedCourseNames, ["英语陪伴"]);
  assert.deepEqual(defaultMerged.courses, ["英语陪伴", "AI 财商"]);
  assert.deepEqual(permissionMerged.courses, ["AI 财商"]);
});

test("custom catalog removes a manually added course and clears matching hidden course names", () => {
  assert.equal(typeof customCatalog.removeCustomCourse, "function");

  const catalog = normalizeCustomCatalog({
    courses: ["AI 财商", "写作工作坊"],
    removedCourseNames: ["AI 财商", "英语陪伴"],
  });

  const nextCatalog = customCatalog.removeCustomCourse(catalog, "AI 财商");

  assert.deepEqual(nextCatalog.courses, ["写作工作坊"]);
  assert.deepEqual(nextCatalog.removedCourseNames, ["英语陪伴"]);
});

test("custom catalog removes a manually added teacher by id", () => {
  const catalog = normalizeCustomCatalog({
    teachers: [
      { id: "mia", name: "Mia" },
      { id: "nina", name: "Nina" },
    ],
  });

  const nextCatalog = removeCustomTeacher(catalog, "mia");

  assert.deepEqual(
    nextCatalog.teachers.map((teacher) => teacher.name),
    ["Nina"],
  );
});

test("custom catalog can hide an imported teacher by id", () => {
  const catalog = hideBaseTeacher({}, "hanna");
  const merged = mergeCatalog(baseTeachers, ["英语陪伴"], catalog, { excludeRemovedTeachers: true });

  assert.deepEqual(catalog.removedTeacherIds, ["hanna"]);
  assert.deepEqual(merged.teachers, []);
});

test("custom catalog adds custom grades to planner options and teacher matching", () => {
  assert.equal(typeof addCustomGrade, "function");

  const catalog = addCustomGrade({ grades: ["Y10"] }, " 小班 ");
  const merged = mergeCatalog(baseTeachers, ["英语陪伴"], catalog, { baseGrades: ["G2", "Y6"] });

  assert.deepEqual(catalog.grades, ["Y10", "小班"]);
  assert.deepEqual(merged.grades, ["G2", "Y6", "Y10", "小班"]);
  assert.deepEqual(merged.teachers[0].grades, ["Y6", "Y10", "小班"]);
});
