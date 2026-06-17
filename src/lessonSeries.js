import {
  deleteLessonEdit,
  setLessonEdit,
} from "./lessonEdits.js";

export function getScopedLessonIds(lessons, selectedLessonId, scope = "single") {
  const selected = findLessonById(lessons, selectedLessonId);
  if (!selected) {
    return [];
  }

  if (scope !== "following") {
    return [String(selected.id)];
  }

  const selectedKey = getSeriesKey(selected);
  return lessons
    .filter((lesson) => getSeriesKey(lesson) === selectedKey)
    .filter((lesson) => String(lesson.date || "") >= String(selected.date || ""))
    .sort(compareSeriesLessons)
    .map((lesson) => String(lesson.id));
}

export function alignExplicitSeriesDates(lessons) {
  const alignedLessons = (lessons || []).map((lesson) => ({ ...lesson }));
  const groups = new Map();

  alignedLessons.forEach((lesson, index) => {
    const key = getSeriesKey(lesson);
    const group = groups.get(key) || [];
    group.push({ lesson, index });
    groups.set(key, group);
  });

  for (const group of groups.values()) {
    const sortedGroup = group.sort((left, right) => compareSeriesLessons(left.lesson, right.lesson));
    if (!shouldAlignSeriesGroup(sortedGroup)) {
      continue;
    }

    const seed = buildSeriesDateSeed(sortedGroup);
    const count = Math.min(seed.sessionCount, sortedGroup.length);
    const regeneratedDates = getRegeneratedDates(count, seed);

    regeneratedDates.forEach((date, index) => {
      sortedGroup[index].lesson.date = date;
    });
  }

  return alignedLessons;
}

export function updateLessonsInScope(lessons, rawEdits, selectedLessonId, scope, lessonChanges) {
  const selectedId = String(selectedLessonId);
  const lessonIds = getScopedLessonIds(lessons, selectedId, scope);
  const { regenerateSeriesDates, ...persistedLessonChanges } = lessonChanges || {};
  const regeneratedDates = getRegeneratedFollowingDates(
    scope,
    lessonIds.length,
    persistedLessonChanges,
    Boolean(regenerateSeriesDates),
  );

  return lessonIds.reduce((edits, lessonId, index) => {
    const lesson = findLessonById(lessons, lessonId);
    const date =
      regeneratedDates[index] ||
      (lessonId === selectedId ? persistedLessonChanges.date : lesson?.date || persistedLessonChanges.date);

    return setLessonEdit(edits, lessonId, {
      ...persistedLessonChanges,
      startDate: persistedLessonChanges.startDate || persistedLessonChanges.date,
      date,
    });
  }, rawEdits);
}

export function deleteLessonsInScope(lessons, rawEdits, selectedLessonId, scope) {
  return getScopedLessonIds(lessons, selectedLessonId, scope).reduce(
    (edits, lessonId) => deleteLessonEdit(edits, lessonId),
    rawEdits,
  );
}

export function getScopedLessonCount(lessons, selectedLessonId, scope) {
  return getScopedLessonIds(lessons, selectedLessonId, scope).length;
}

function findLessonById(lessons, lessonId) {
  const id = String(lessonId);
  return (lessons || []).find((lesson) => String(lesson.id) === id) || null;
}

function getSeriesKey(lesson) {
  return [
    lesson.teacherId || lesson.teacherName || "",
    lesson.studentName || "",
    lesson.course || "",
    lesson.startTime || "",
    lesson.endTime || "",
    lesson.deliveryType || "",
  ].join("|");
}

function compareSeriesLessons(left, right) {
  return (
    String(left.date || "").localeCompare(String(right.date || "")) ||
    String(left.startTime || "").localeCompare(String(right.startTime || "")) ||
    String(left.id || "").localeCompare(String(right.id || ""))
  );
}

function shouldAlignSeriesGroup(group) {
  if (group.length <= 1) {
    return false;
  }

  return group.some(({ lesson }) => {
    const status = String(lesson.status || "");
    return (
      Boolean(normalizeDateString(lesson.startDate)) ||
      Number(lesson.sessionCount || 0) > 1 ||
      Array.isArray(lesson.recurrenceWeekdays) ||
      status === "已编辑" ||
      status === "手动新增"
    );
  });
}

function buildSeriesDateSeed(group) {
  const explicitLesson =
    group.find(({ lesson }) => normalizeDateString(lesson.startDate))?.lesson ||
    group.find(({ lesson }) => Array.isArray(lesson.recurrenceWeekdays))?.lesson ||
    group.find(({ lesson }) => Number(lesson.sessionCount || 0) > 1)?.lesson ||
    group[0].lesson;
  const startDate = normalizeDateString(explicitLesson.startDate) || normalizeDateString(group[0].lesson.date);
  const sessionCount = Number(explicitLesson.sessionCount || 0) || group.length;
  const explicitWeekdays = normalizeWeekdayValues(explicitLesson.recurrenceWeekdays, startDate);

  return {
    ...explicitLesson,
    startDate,
    sessionCount,
    recurrenceWeekdays: explicitWeekdays.length ? explicitWeekdays : inferWeekdaysFromGroup(group),
  };
}

function inferWeekdaysFromGroup(group) {
  return Array.from(
    new Set(
      group
        .map(({ lesson }) => normalizeDateString(lesson.date))
        .filter(Boolean)
        .map((dateString) => getWeekdayValue(new Date(`${dateString}T00:00:00Z`))),
    ),
  ).sort((left, right) => left - right);
}

function getRegeneratedFollowingDates(scope, count, lessonChanges, shouldRegenerate) {
  if (scope !== "following" || !shouldRegenerate) {
    return [];
  }

  return getRegeneratedDates(count, lessonChanges);
}

function getRegeneratedDates(count, lessonChanges) {
  const startDate = normalizeDateString(lessonChanges?.startDate);
  if (!startDate || count <= 0) {
    return [];
  }

  const weekdayValues = normalizeWeekdayValues(lessonChanges.recurrenceWeekdays, startDate);
  const weekdaySet = new Set(weekdayValues);
  const dates = [];
  const cursor = new Date(`${startDate}T00:00:00Z`);
  const maxDaysToScan = Math.max(14, count * 10 + 14);

  for (let offset = 0; dates.length < count && offset <= maxDaysToScan; offset += 1) {
    const candidate = new Date(cursor);
    candidate.setUTCDate(cursor.getUTCDate() + offset);
    const candidateDate = candidate.toISOString().slice(0, 10);
    if (weekdaySet.has(getWeekdayValue(candidate))) {
      dates.push(candidateDate);
    }
  }

  return dates;
}

function normalizeWeekdayValues(recurrenceWeekdays, startDate) {
  const weekdays = Array.isArray(recurrenceWeekdays)
    ? recurrenceWeekdays.map((day) => Number(day)).filter((day) => Number.isInteger(day) && day >= 1 && day <= 7)
    : [];

  return weekdays;
}

function normalizeDateString(value) {
  const normalized = String(value || "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(normalized) ? normalized : "";
}

function getWeekdayValue(date) {
  const day = date.getUTCDay();
  return day === 0 ? 7 : day;
}
