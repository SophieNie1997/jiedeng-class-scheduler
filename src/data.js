import { importedLessons } from "./importedLessons.js?v=20260617-folder-refresh";
import { importedStudents } from "./importedStudents.js?v=20260617-student-table";
import {
  importedDefaultShiftOverrides,
  importedShiftRoster,
} from "./importedTeacherShifts.js?v=20260617-shift-refresh";
import {
  normalizeCourseList,
  normalizeLessonCatalogFields,
  teachingSites,
} from "./courseCatalog.js";

const allGrades = ["G2", "Y3", "Y6", "Y8", "Y9", "大班"];
const allDeliveryTypes = ["线上", "线下", "上门", "校区", "樱桃"];
const nonTeachingShiftIds = new Set(["lency", "vicky"]);
const activeTeachingRoster = importedShiftRoster.filter((teacher) => !nonTeachingShiftIds.has(teacher.id));
const activeTeacherIds = new Set(activeTeachingRoster.map((teacher) => teacher.id));
const shiftRosterIds = new Set(importedShiftRoster.map((teacher) => teacher.id));

export const teachers = activeTeachingRoster;

export const candidateTeachers = teachers;

export const shiftRoster = importedShiftRoster;

export const defaultShiftOverrides = Object.fromEntries(
  Object.entries(importedDefaultShiftOverrides).filter(([key]) => shiftRosterIds.has(String(key).split("__")[0])),
);

export const existingLessons = dedupeLessons(
  importedLessons
    .map(normalizeLessonCatalogFields)
    .filter((lesson) => activeTeacherIds.has(lesson.teacherId)),
);

export const studentCatalog = importedStudents;

export const courses = normalizeCourseList([
  "WAICY 集训",
  "WAICY 徐汇集训班",
  "AI 财商",
  "财商x樱桃 徐汇暑期课",
  "财商x樱桃 浦东暑期课",
  "英语陪伴",
  "托雅集训",
  "1v1 复习",
]);

export const grades = allGrades;

export const deliveryTypes = teachingSites;

function dedupeLessons(lessons) {
  const byKey = new Map();

  for (const lesson of lessons) {
    const key = [
      lesson.teacherId,
      lesson.date,
      lesson.startTime,
      lesson.endTime,
      lesson.course,
    ].join("|");
    byKey.set(key, lesson);
  }

  return Array.from(byKey.values()).sort((left, right) =>
    `${left.date} ${left.startTime} ${left.teacherName}`.localeCompare(
      `${right.date} ${right.startTime} ${right.teacherName}`,
      "zh-Hans-CN",
    ),
  );
}
