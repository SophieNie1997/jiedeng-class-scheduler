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

function getRegeneratedFollowingDates(scope, count, lessonChanges, shouldRegenerate) {
  const startDate = normalizeDateString(lessonChanges?.startDate);
  if (scope !== "following" || !shouldRegenerate || !startDate || count <= 0) {
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

  if (weekdays.length > 0) {
    return weekdays;
  }

  return [getWeekdayValue(new Date(`${startDate}T00:00:00Z`))];
}

function normalizeDateString(value) {
  const normalized = String(value || "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(normalized) ? normalized : "";
}

function getWeekdayValue(date) {
  const day = date.getUTCDay();
  return day === 0 ? 7 : day;
}
