import { normalizeCourseList } from "./courseCatalog.js";

const DEFAULT_GRADES = ["G2", "Y3", "Y6", "Y8", "Y9", "大班"];
const DEFAULT_DELIVERY_TYPES = ["线上", "线下", "上门", "校区", "樱桃"];

export function normalizeCustomCatalog(rawCatalog) {
  const teachers = Array.isArray(rawCatalog?.teachers)
    ? rawCatalog.teachers.map(normalizeCustomTeacher).filter(Boolean)
    : [];
  const courses = normalizeCourseList(Array.isArray(rawCatalog?.courses) ? rawCatalog.courses : []);
  const grades = normalizeGradeList(rawCatalog?.grades);
  const removedTeacherIds = normalizeIdList(rawCatalog?.removedTeacherIds);
  const removedCourseNames = normalizeCourseNameList(rawCatalog?.removedCourseNames);

  return {
    teachers: dedupeTeachers(teachers),
    courses,
    grades,
    removedTeacherIds,
    removedCourseNames,
  };
}

export function addCustomTeacher(rawCatalog, teacherName) {
  const catalog = normalizeCustomCatalog(rawCatalog);
  const name = String(teacherName || "").trim();
  if (!name) {
    return catalog;
  }

  if (catalog.teachers.some((teacher) => teacher.name.toLowerCase() === name.toLowerCase())) {
    return catalog;
  }

  const id = makeTeacherId(name, [...catalog.teachers.map((teacher) => teacher.id), ...catalog.removedTeacherIds]);
  return {
    ...catalog,
    removedTeacherIds: catalog.removedTeacherIds.filter((teacherId) => teacherId !== id),
    teachers: [
      ...catalog.teachers,
      buildCustomTeacher({
        id,
        name,
      }),
    ],
  };
}

export function removeCustomTeacher(rawCatalog, teacherId) {
  const catalog = normalizeCustomCatalog(rawCatalog);
  const id = String(teacherId || "").trim();
  if (!id) {
    return catalog;
  }

  return {
    ...catalog,
    teachers: catalog.teachers.filter((teacher) => teacher.id !== id),
  };
}

export function hideBaseTeacher(rawCatalog, teacherId) {
  const catalog = normalizeCustomCatalog(rawCatalog);
  const id = String(teacherId || "").trim();
  if (!id) {
    return catalog;
  }

  return {
    ...catalog,
    removedTeacherIds: dedupeIds([...catalog.removedTeacherIds, id]),
  };
}

export function addCustomCourse(rawCatalog, courseName) {
  const catalog = normalizeCustomCatalog(rawCatalog);
  const normalizedCourses = normalizeCourseList([String(courseName || "").trim()]);
  if (!normalizedCourses.length) {
    return catalog;
  }

  return {
    ...catalog,
    removedCourseNames: catalog.removedCourseNames.filter((course) => !normalizedCourses.includes(course)),
    courses: normalizeCourseList([...catalog.courses, ...normalizedCourses]),
  };
}

export function addCustomGrade(rawCatalog, gradeName) {
  const catalog = normalizeCustomCatalog(rawCatalog);
  const normalizedGrades = normalizeGradeList([String(gradeName || "").trim()]);
  if (!normalizedGrades.length) {
    return catalog;
  }

  return {
    ...catalog,
    grades: normalizeGradeList([...catalog.grades, ...normalizedGrades]),
  };
}

export function removeCustomCourse(rawCatalog, courseName) {
  const catalog = normalizeCustomCatalog(rawCatalog);
  const normalizedCourses = normalizeCourseList([String(courseName || "").trim()]);
  if (!normalizedCourses.length) {
    return catalog;
  }

  const course = normalizedCourses[0];
  return {
    ...catalog,
    courses: catalog.courses.filter((item) => item !== course),
    removedCourseNames: catalog.removedCourseNames.filter((item) => item !== course),
  };
}

export function hideBaseCourse(rawCatalog, courseName) {
  const catalog = normalizeCustomCatalog(rawCatalog);
  const normalizedCourses = normalizeCourseList([String(courseName || "").trim()]);
  if (!normalizedCourses.length) {
    return catalog;
  }

  return {
    ...catalog,
    removedCourseNames: normalizeCourseList([...catalog.removedCourseNames, ...normalizedCourses]),
  };
}

export function mergeCatalog(baseTeachers, baseCourses, rawCatalog, options = {}) {
  const catalog = normalizeCustomCatalog(rawCatalog);
  const removedTeacherIds = options.excludeRemovedTeachers ? new Set(catalog.removedTeacherIds) : new Set();
  const removedCourseNames = options.excludeRemovedCourses ? new Set(catalog.removedCourseNames) : new Set();
  const extraGrades = normalizeGradeList(options.extraGrades);
  const grades = normalizeGradeList([...(options.baseGrades || DEFAULT_GRADES), ...catalog.grades, ...extraGrades]);
  const teacherExtraGrades = normalizeGradeList([...catalog.grades, ...extraGrades]);
  const baseTeacherIds = new Set(baseTeachers.map((teacher) => teacher.id));
  const baseTeacherNames = new Set(baseTeachers.map((teacher) => teacher.name.toLowerCase()));
  const activeBaseTeachers = baseTeachers.filter((teacher) => !removedTeacherIds.has(teacher.id));
  const customTeachers = catalog.teachers.filter(
    (teacher) =>
      !removedTeacherIds.has(teacher.id) &&
      !baseTeacherIds.has(teacher.id) &&
      !baseTeacherNames.has(teacher.name.toLowerCase()),
  );

  return {
    teachers: [...activeBaseTeachers, ...customTeachers].map((teacher) =>
      withExtraTeacherGrades(teacher, teacherExtraGrades),
    ),
    courses: normalizeCourseList([...baseCourses, ...catalog.courses]).filter((course) => !removedCourseNames.has(course)),
    grades,
  };
}

function normalizeCustomTeacher(rawTeacher) {
  const name = String(rawTeacher?.name || "").trim();
  if (!name) {
    return null;
  }

  return buildCustomTeacher({
    id: String(rawTeacher?.id || makeTeacherId(name)).trim(),
    name,
  });
}

function buildCustomTeacher({ id, name }) {
  return {
    id,
    name,
    courses: [],
    grades: DEFAULT_GRADES,
    deliveryTypes: DEFAULT_DELIVERY_TYPES,
    maxWeeklyHours: 24,
    weeklyAvailability: [],
    unavailable: [],
  };
}

function withExtraTeacherGrades(teacher, extraGrades) {
  if (!extraGrades.length) {
    return teacher;
  }

  return {
    ...teacher,
    grades: normalizeGradeList([...(Array.isArray(teacher.grades) ? teacher.grades : []), ...extraGrades]),
  };
}

function makeTeacherId(name, existingIds = []) {
  const existing = new Set(existingIds);
  const normalized = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const base = normalized || "teacher";
  let id = base;
  let index = 2;

  while (existing.has(id)) {
    id = `${base}-${index}`;
    index += 1;
  }

  return id;
}

function dedupeTeachers(teachers) {
  const seen = new Set();
  const deduped = [];

  for (const teacher of teachers) {
    if (seen.has(teacher.id)) {
      continue;
    }

    seen.add(teacher.id);
    deduped.push(teacher);
  }

  return deduped;
}

function normalizeIdList(rawIds) {
  return dedupeIds(Array.isArray(rawIds) ? rawIds : []);
}

function normalizeCourseNameList(rawCourses) {
  return normalizeCourseList(Array.isArray(rawCourses) ? rawCourses : []);
}

function normalizeGradeList(rawGrades) {
  const grades = Array.isArray(rawGrades) ? rawGrades : [];
  const seen = new Set();
  const normalized = [];

  for (const rawGrade of grades) {
    const grade = String(rawGrade || "").trim();
    if (!grade || seen.has(grade)) {
      continue;
    }

    seen.add(grade);
    normalized.push(grade);
  }

  return normalized;
}

function dedupeIds(ids) {
  const seen = new Set();
  const deduped = [];

  for (const rawId of ids) {
    const id = String(rawId || "").trim();
    if (!id || seen.has(id)) {
      continue;
    }

    seen.add(id);
    deduped.push(id);
  }

  return deduped;
}
