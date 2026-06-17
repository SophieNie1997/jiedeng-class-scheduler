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
  return getScopedLessonIds(lessons, selectedId, scope).reduce((edits, lessonId) => {
    const lesson = findLessonById(lessons, lessonId);
    const date = lessonId === selectedId ? lessonChanges.date : lesson?.date || lessonChanges.date;
    return setLessonEdit(edits, lessonId, {
      ...lessonChanges,
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
    lesson.campus || "",
  ].join("|");
}

function compareSeriesLessons(left, right) {
  return (
    String(left.date || "").localeCompare(String(right.date || "")) ||
    String(left.startTime || "").localeCompare(String(right.startTime || "")) ||
    String(left.id || "").localeCompare(String(right.id || ""))
  );
}
