import { importedLessons } from "./importedLessons.js?v=20260617-folder-refresh";
import { importedStudents } from "./importedStudents.js?v=20260617-folder-refresh";
import {
  importedDefaultShiftOverrides,
  importedShiftRoster,
} from "./importedTeacherShifts.js?v=20260617-folder-refresh";
import {
  normalizeCourseList,
  normalizeLessonCatalogFields,
  teachingSites,
} from "./courseCatalog.js";

const allGrades = ["G2", "Y3", "Y6", "Y8", "Y9", "大班"];
const allDeliveryTypes = ["线上", "线下", "上门", "校区", "樱桃"];
const hiddenTeacherIds = new Set(["lency", "vicky"]);
const activeShiftRoster = importedShiftRoster.filter((teacher) => !hiddenTeacherIds.has(teacher.id));

export const teachers = activeShiftRoster;

export const candidateTeachers = teachers;

export const shiftRoster = activeShiftRoster;

export const defaultShiftOverrides = Object.fromEntries(
  Object.entries(importedDefaultShiftOverrides).filter(([key]) => !hiddenTeacherIds.has(String(key).split("__")[0])),
);

export const existingLessons = dedupeLessons(
  importedLessons.map(normalizeLessonCatalogFields),
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
