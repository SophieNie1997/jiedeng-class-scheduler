import { normalizeCourseList, teachingSites } from "./courseCatalog.js";

const DEFAULT_GRADES = ["G2", "Y3", "Y6", "Y8", "Y9", "大班"];

export function normalizeCustomCatalog(rawCatalog) {
  const teachers = Array.isArray(rawCatalog?.teachers)
    ? rawCatalog.teachers.map(normalizeCustomTeacher).filter(Boolean)
    : [];
  const courses = normalizeCourseList(Array.isArray(rawCatalog?.courses) ? rawCatalog.courses : []);
  const removedTeacherIds = normalizeIdList(rawCatalog?.removedTeacherIds);
  const removedCourseNames = normalizeCourseNameList(rawCatalog?.removedCourseNames);

  return {
    teachers: dedupeTeachers(teachers),
    courses,
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
    teachers: [...activeBaseTeachers, ...customTeachers],
    courses: normalizeCourseList([...baseCourses, ...catalog.courses]).filter((course) => !removedCourseNames.has(course)),
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
    deliveryTypes: teachingSites,
    maxWeeklyHours: 24,
    weeklyAvailability: [],
    unavailable: [],
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
