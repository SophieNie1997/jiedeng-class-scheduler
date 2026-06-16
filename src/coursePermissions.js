export const SPECIALIST_TEACHER_IDS = ["phebe", "sophie"];

export const PROTECTED_COURSES = ["WAICY 集训", "AI 财商"];

export function buildDefaultCoursePermissions(teacherIds, courses) {
  const protectedCourses = courses.filter((course) => PROTECTED_COURSES.includes(course));
  const remainingCourses = courses.filter((course) => !PROTECTED_COURSES.includes(course));
  const permissions = {};

  for (const teacherId of teacherIds) {
    permissions[teacherId] = SPECIALIST_TEACHER_IDS.includes(teacherId)
      ? protectedCourses
      : remainingCourses;
  }

  return permissions;
}

export function normalizeCoursePermissions(rawPermissions, teacherIds, courses) {
  const defaults = buildDefaultCoursePermissions(teacherIds, courses);
  const normalized = {};
  const courseSet = new Set(courses);

  for (const teacherId of teacherIds) {
    const savedCourses = Array.isArray(rawPermissions?.[teacherId])
      ? rawPermissions[teacherId].filter((course) => courseSet.has(course))
      : defaults[teacherId];
    normalized[teacherId] = dedupeCourses(savedCourses);
  }

  return normalized;
}

export function applyCoursePermissions(teachers, permissions, courses) {
  const teacherIds = teachers.map((teacher) => teacher.id);
  const normalized = normalizeCoursePermissions(permissions, teacherIds, courses);

  return teachers.map((teacher) => ({
    ...teacher,
    courses: normalized[teacher.id] || [],
  }));
}

export function setTeacherCoursePermission(permissions, teacherId, course, isAllowed, teacherIds, courses) {
  const normalized = normalizeCoursePermissions(permissions, teacherIds, courses);
  const nextCourses = new Set(normalized[teacherId] || []);

  if (isAllowed) {
    nextCourses.add(course);
  } else {
    nextCourses.delete(course);
  }

  return {
    ...normalized,
    [teacherId]: courses.filter((item) => nextCourses.has(item)),
  };
}

export function countAllowedCourseCells(permissions, teacherIds, courses) {
  const normalized = normalizeCoursePermissions(permissions, teacherIds, courses);
  return Object.values(normalized).reduce((total, teacherCourses) => total + teacherCourses.length, 0);
}

function dedupeCourses(courses) {
  return Array.from(new Set(courses));
}
