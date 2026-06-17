const WEEKDAY_LABELS = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

export function buildCourseOverview(lessons, options = {}) {
  const scheduledLessons = getScheduledLessons(lessons, options);
  const cardsByKey = new Map();

  for (const lesson of scheduledLessons) {
    const key = buildCourseCardKey(lesson);
    const current = cardsByKey.get(key) || createCourseCard(key, lesson);

    current.lessonCount += 1;
    addIfPresent(current.lessonIds, lesson.id);
    addIfPresent(current.notes, lesson.notes || lesson.note);
    addIfPresent(current.weekdays, getWeekdayLabel(lesson.date));
    current.firstDate = pickEarlierDate(current.firstDate, getLessonStartDate(lesson));
    current.lastDate = pickLaterDate(current.lastDate, lesson.date);
    current.nextDate = current.nextDate || lesson.date || "";
    cardsByKey.set(key, current);
  }

  const courseCards = Array.from(cardsByKey.values())
    .map((card) => ({
      ...card,
      lessonIds: Array.from(card.lessonIds),
      weekdays: Array.from(card.weekdays).sort(sortWeekdays),
      notes: Array.from(card.notes).sort(localeSort),
    }))
    .sort(compareCourseCards);

  return {
    totalCourses: courseCards.length,
    totalLessons: scheduledLessons.length,
    lessons: scheduledLessons,
    courseCards,
  };
}

export function buildStudentOverview(lessons, options = {}) {
  const scheduledLessons = getScheduledLessons(lessons, options);
  const studentsByName = new Map();

  for (const lesson of scheduledLessons) {
    const names = splitStudentNames(lesson.studentName);
    const studentNames = names.length ? names : ["未填写"];
    for (const name of studentNames) {
      const current = studentsByName.get(name) || createStudentOverviewRecord(name);

      current.lessonCount += 1;
      addIfPresent(current.lessonIds, lesson.id);
      addIfPresent(current.courses, lesson.course);
      addIfPresent(current.teachers, lesson.teacherName);
      addIfPresent(current.campuses, lesson.campus || lesson.deliveryType);
      addIfPresent(current.statuses, lesson.status);
      current.firstDate = pickEarlierDate(current.firstDate, lesson.date);
      current.lastDate = pickLaterDate(current.lastDate, lesson.date);
      studentsByName.set(name, current);
    }
  }

  for (const student of options.studentCatalog || []) {
    const name = normalizeText(student.name);
    if (!name) {
      continue;
    }

    const current = studentsByName.get(name) || createStudentOverviewRecord(name);

    current.gender = current.gender || normalizeText(student.gender);
    current.grade = current.grade || normalizeText(student.grade);
    current.school = current.school || normalizeText(student.school);
    current.businessType = current.businessType || normalizeText(student.businessType);
    current.frequency = current.frequency || normalizeText(student.frequency);
    current.needs = current.needs || normalizeText(student.needs);
    current.phone = current.phone || normalizeText(student.phone);
    current.address = current.address || normalizeText(student.address);
    current.source = current.source || normalizeText(student.source);
    studentsByName.set(name, current);
  }

  const students = Array.from(studentsByName.values())
    .map((student) => ({
      ...student,
      courses: Array.from(student.courses).sort(localeSort),
      teachers: Array.from(student.teachers).sort(localeSort),
      campuses: Array.from(student.campuses).sort(localeSort),
      statuses: Array.from(student.statuses).sort(localeSort),
      lessonIds: Array.from(student.lessonIds),
    }))
    .sort(
      (left, right) =>
        right.lessonCount - left.lessonCount ||
        localeSort(left.grade || "", right.grade || "") ||
        localeSort(left.name, right.name),
    );

  return {
    totalStudents: students.length,
    activeStudents: students.filter((student) => student.lessonCount > 0).length,
    students,
  };
}

export function buildTeacherDayLessonIndex(lessons) {
  const index = new Map();

  for (const lesson of lessons || []) {
    if (!lesson || lesson.status === "不可用") {
      continue;
    }

    const date = normalizeText(lesson.date);
    if (!date) {
      continue;
    }

    const teacherKeys = new Set([normalizeText(lesson.teacherId), normalizeText(lesson.teacherName)].filter(Boolean));
    if (!teacherKeys.size) {
      continue;
    }

    const summary = createTeacherDayLessonSummary(lesson);
    for (const teacherKey of teacherKeys) {
      const key = `${teacherKey}__${date}`;
      const items = index.get(key) || [];
      items.push(summary);
      index.set(key, items);
    }
  }

  for (const items of index.values()) {
    items.sort(compareTeacherDayLessons);
  }

  return index;
}

export function splitStudentNames(value) {
  const normalized = normalizeText(value);
  if (!normalized || normalized === "未填写") {
    return [];
  }

  return normalized
    .split(/[、，,；;\n]+/)
    .map(normalizeText)
    .filter((name) => name && name !== "未填写");
}

function createTeacherDayLessonSummary(lesson) {
  const startTime = normalizeText(lesson.startTime);
  const endTime = normalizeText(lesson.endTime);

  return {
    id: normalizeText(lesson.id),
    date: normalizeText(lesson.date),
    teacherId: normalizeText(lesson.teacherId),
    teacherName: normalizeText(lesson.teacherName),
    studentName: normalizeText(lesson.studentName) || "未填写",
    course: normalizeText(lesson.course) || "未填写",
    campus: normalizeText(lesson.campus || lesson.deliveryType) || "未填写",
    startTime,
    endTime,
    timeLabel: startTime && endTime ? `${startTime}-${endTime}` : startTime || endTime || "未填写",
  };
}

function compareTeacherDayLessons(left, right) {
  return (
    String(left.startTime || "").localeCompare(String(right.startTime || "")) ||
    String(left.endTime || "").localeCompare(String(right.endTime || "")) ||
    localeSort(left.studentName, right.studentName) ||
    localeSort(left.course, right.course)
  );
}

function createStudentOverviewRecord(name) {
  return {
    name,
    lessonCount: 0,
    courses: new Set(),
    teachers: new Set(),
    campuses: new Set(),
    statuses: new Set(),
    lessonIds: new Set(),
    firstDate: "",
    lastDate: "",
  };
}

function getScheduledLessons(lessons, options = {}) {
  const today = resolveToday(options);

  return lessons
    .filter((lesson) => lesson && lesson.status !== "不可用")
    .filter((lesson) => isFutureLesson(lesson, today))
    .sort(compareLessons)
    .map((lesson) => ({ ...lesson }));
}

function createCourseCard(key, lesson) {
  const startTime = normalizeText(lesson.startTime);
  const endTime = normalizeText(lesson.endTime);

  return {
    key,
    studentName: normalizeText(lesson.studentName) || "未填写",
    course: normalizeText(lesson.course) || "未填写",
    teacherName: normalizeText(lesson.teacherName) || normalizeText(lesson.teacherId) || "未填写",
    campus: normalizeText(lesson.campus || lesson.deliveryType) || "未填写",
    startTime,
    endTime,
    timeLabel: startTime && endTime ? `${startTime}-${endTime}` : startTime || endTime || "未填写",
    durationMinutes: Number(lesson.durationMinutes || 0),
    lessonCount: 0,
    lessonIds: new Set(),
    weekdays: new Set(),
    notes: new Set(),
    firstDate: "",
    lastDate: "",
    nextDate: "",
  };
}

function getLessonStartDate(lesson) {
  return normalizeText(lesson.startDate) || normalizeText(lesson.date);
}

function buildCourseCardKey(lesson) {
  return JSON.stringify([
    normalizeText(lesson.studentName) || "未填写",
    normalizeText(lesson.course) || "未填写",
    normalizeText(lesson.teacherName) || normalizeText(lesson.teacherId) || "未填写",
    normalizeText(lesson.startTime),
    normalizeText(lesson.endTime),
    String(Number(lesson.durationMinutes || 0) || ""),
  ]);
}

function compareCourseCards(left, right) {
  return (
    compareMaybeDate(left.nextDate, right.nextDate) ||
    String(left.startTime || "").localeCompare(String(right.startTime || "")) ||
    localeSort(left.studentName, right.studentName) ||
    localeSort(left.course, right.course) ||
    localeSort(left.teacherName, right.teacherName)
  );
}

function compareMaybeDate(left, right) {
  if (!left && !right) {
    return 0;
  }
  if (!left) {
    return 1;
  }
  if (!right) {
    return -1;
  }
  return String(left).localeCompare(String(right));
}

function isFutureLesson(lesson, today) {
  const date = normalizeText(lesson.date);
  if (!date) {
    return true;
  }
  if (!today) {
    return true;
  }
  return date >= today;
}

function resolveToday(options) {
  const explicitToday = normalizeText(options.today);
  if (explicitToday) {
    return explicitToday;
  }

  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function compareLessons(left, right) {
  return (
    String(left.date || "").localeCompare(String(right.date || "")) ||
    String(left.startTime || "").localeCompare(String(right.startTime || "")) ||
    String(left.teacherName || "").localeCompare(String(right.teacherName || "")) ||
    String(left.studentName || "").localeCompare(String(right.studentName || "")) ||
    String(left.course || "").localeCompare(String(right.course || ""))
  );
}

function getWeekdayLabel(dateString) {
  const normalized = normalizeText(dateString);
  if (!normalized) {
    return "";
  }

  const day = new Date(`${normalized}T00:00:00Z`).getUTCDay();
  return WEEKDAY_LABELS[day] || "";
}

function sortWeekdays(left, right) {
  return WEEKDAY_LABELS.indexOf(left) - WEEKDAY_LABELS.indexOf(right);
}

function addIfPresent(set, value) {
  const normalized = normalizeText(value);
  if (normalized) {
    set.add(normalized);
  }
}

function pickEarlierDate(current, next) {
  if (!next) {
    return current;
  }
  if (!current || next < current) {
    return next;
  }
  return current;
}

function pickLaterDate(current, next) {
  if (!next) {
    return current;
  }
  if (!current || next > current) {
    return next;
  }
  return current;
}

function normalizeText(value) {
  return String(value ?? "").trim();
}

function localeSort(left, right) {
  return String(left).localeCompare(String(right), "zh-CN");
}
