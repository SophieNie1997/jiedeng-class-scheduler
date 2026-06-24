import test from "node:test";
import assert from "node:assert/strict";

import {
  applyCoursePermissions,
  buildDefaultCoursePermissions,
  normalizeCoursePermissions,
  setTeacherCoursePermission,
} from "../src/coursePermissions.js";
import { deriveDeliveryTypeFromCampus } from "../src/courseCatalog.js";
import { addCustomTeacher, mergeCatalog } from "../src/customCatalog.js";
import { matchTeachers } from "../src/scheduler.js";

const courseList = [
  "WAICY 集训",
  "AI 财商",
  "英语陪伴",
  "托雅集训",
  "1v1 复习",
];

test("default course permissions reserve WAICY and AI finance for Phebe and Sophie", () => {
  const permissions = buildDefaultCoursePermissions(["phebe", "sophie", "lynn"], courseList);

  assert.deepEqual(permissions.phebe, [
    "WAICY 集训",
    "AI 财商",
  ]);
  assert.deepEqual(permissions.sophie, permissions.phebe);
  assert.deepEqual(permissions.lynn, ["英语陪伴", "托雅集训", "1v1 复习"]);
});

test("course permissions drive teacher matching", () => {
  const teachers = [
    buildTeacher("phebe"),
    buildTeacher("lynn"),
  ];
  const permissions = buildDefaultCoursePermissions(["phebe", "lynn"], courseList);
  const restrictedTeachers = applyCoursePermissions(teachers, permissions, courseList);
  const matches = matchTeachers(restrictedTeachers, [], requestFor("WAICY 集训"));

  assert.equal(matches[0].teacherId, "phebe");
  assert.deepEqual(matches[0].fitIssues, []);
  assert.equal(matches[1].teacherId, "lynn");
  assert.deepEqual(matches[1].fitIssues, ["课程不匹配"]);
});

test("course mismatch blocks available session counts", () => {
  const teachers = [buildTeacher("lynn")];
  const permissions = { lynn: ["英语陪伴"] };
  const restrictedTeachers = applyCoursePermissions(teachers, permissions, courseList);
  const matches = matchTeachers(restrictedTeachers, [], requestFor("WAICY 集训"));

  assert.equal(matches[0].availableSessions, 0);
  assert.deepEqual(matches[0].fitIssues, ["课程不匹配"]);
});

test("editing one permission immediately changes the matching model", () => {
  const teachers = [
    buildTeacher("phebe"),
    buildTeacher("lynn"),
  ];
  const defaultPermissions = buildDefaultCoursePermissions(["phebe", "lynn"], courseList);
  const editedPermissions = setTeacherCoursePermission(
    defaultPermissions,
    "lynn",
    "WAICY 集训",
    true,
    ["phebe", "lynn"],
    courseList,
  );
  const restrictedTeachers = applyCoursePermissions(teachers, editedPermissions, courseList);
  const matches = matchTeachers(restrictedTeachers, [], requestFor("WAICY 集训"));

  assert.deepEqual(matches.map((match) => match.fitIssues), [[], []]);
});

test("new permission teachers can match offline campus requests after a course is enabled", () => {
  const courses = [...courseList, "IG预科班"];
  const catalog = addCustomTeacher({}, "IG类课程老师");
  const mergedCatalog = mergeCatalog([], courses, catalog);
  const teacher = {
    ...mergedCatalog.teachers[0],
    grades: ["Y8"],
    weeklyAvailability: [{ weekday: 3, startTime: "09:00", endTime: "12:00" }],
  };
  const permissions = setTeacherCoursePermission(
    {},
    teacher.id,
    "IG预科班",
    true,
    [teacher.id],
    courses,
  );
  const restrictedTeachers = applyCoursePermissions([teacher], permissions, courses);
  const matches = matchTeachers(restrictedTeachers, [], {
    startDate: "2026-06-24",
    weekdays: [3],
    startTime: "09:00",
    durationMinutes: 180,
    sessionCount: 1,
    studentName: "Mona",
    course: "IG预科班",
    grade: "Y8",
    deliveryType: deriveDeliveryTypeFromCampus("碧云"),
    campus: "碧云",
  });

  assert.deepEqual(matches[0].fitIssues, []);
  assert.equal(matches[0].availableSessions, 1);
});

test("normalization keeps saved permissions inside current teacher and course lists", () => {
  const normalized = normalizeCoursePermissions(
    {
      phebe: ["WAICY 集训", "不存在的课程"],
      removedTeacher: ["英语陪伴"],
    },
    ["phebe", "lynn"],
    courseList,
  );

  assert.deepEqual(normalized.phebe, ["WAICY 集训"]);
  assert.deepEqual(normalized.lynn, ["英语陪伴", "托雅集训", "1v1 复习"]);
  assert.equal("removedTeacher" in normalized, false);
});

function buildTeacher(id) {
  return {
    id,
    name: id === "phebe" ? "Phebe" : "Lynn",
    courses: [],
    grades: ["Y6"],
    deliveryTypes: ["线下"],
    weeklyAvailability: [{ weekday: 1, startTime: "14:00", endTime: "18:00" }],
    unavailable: [],
  };
}

function requestFor(course) {
  return {
    startDate: "2026-06-29",
    weekdays: [1],
    startTime: "14:00",
    durationMinutes: 180,
    weeks: 1,
    studentName: "Ivan",
    course,
    grade: "Y6",
    deliveryType: "线下",
  };
}
