export const ABSENCE_STATUS = "请假";
export const ABSENCE_MAKEUP_PENDING = "待补课";
export const ABSENCE_MAKEUP_DONE = "已补课";

export function normalizeLessonEdits(rawEdits) {
  const updates = rawEdits?.updates && typeof rawEdits.updates === "object" && !Array.isArray(rawEdits.updates)
    ? { ...rawEdits.updates }
    : {};
  const deletedIds = Array.isArray(rawEdits?.deletedIds) ? rawEdits.deletedIds.map(String) : [];

  return {
    updates,
    deletedIds: Array.from(new Set(deletedIds)),
  };
}

export function applyLessonEdits(lessons, rawEdits, options = {}) {
  const edits = normalizeLessonEdits(rawEdits);
  const deletedIds = new Set(edits.deletedIds);
  const lessonIds = new Set(lessons.map((lesson) => String(lesson.id)));
  const includeAddedLessons = options.includeAddedLessons !== false;

  const editedLessons = lessons
    .filter((lesson) => !deletedIds.has(String(lesson.id)))
    .map((lesson) => ({
      ...lesson,
      ...(edits.updates[String(lesson.id)] || {}),
      id: lesson.id,
    }));

  if (!includeAddedLessons) {
    return editedLessons;
  }

  const addedLessons = Object.entries(edits.updates)
    .filter(([id]) => !lessonIds.has(id) && !deletedIds.has(id))
    .map(([id, lesson]) => ({
      ...lesson,
      id,
    }));

  return [...editedLessons, ...addedLessons];
}

export function setLessonEdit(rawEdits, lessonId, changes) {
  const edits = normalizeLessonEdits(rawEdits);
  const id = String(lessonId);
  const deletedIds = edits.deletedIds.filter((item) => item !== id);

  return {
    updates: {
      ...edits.updates,
      [id]: compactChanges(changes),
    },
    deletedIds,
  };
}

export function findMatchingManualLessonSeriesBaseId(rawEdits, lessonChanges) {
  const edits = normalizeLessonEdits(rawEdits);
  const targetKey = getManualLessonSeriesKey(lessonChanges);
  if (!targetKey) {
    return "";
  }

  const matchingBaseIds = Object.entries(edits.updates)
    .filter(([, lesson]) => lesson?.status === "手动新增")
    .filter(([, lesson]) => getManualLessonSeriesKey(lesson) === targetKey)
    .map(([id]) => getManualLessonSeriesBaseId(id));

  return Array.from(new Set(matchingBaseIds)).sort(compareManualLessonBaseIds).at(-1) || "";
}

export function deleteLessonEdit(rawEdits, lessonId) {
  const edits = normalizeLessonEdits(rawEdits);
  const id = String(lessonId);
  const deletedIds = new Set(edits.deletedIds);
  deletedIds.add(id);

  const updates = { ...edits.updates };
  delete updates[id];

  return {
    updates,
    deletedIds: Array.from(deletedIds),
  };
}

export function restoreDeletedLessonEdits(rawEdits) {
  const edits = normalizeLessonEdits(rawEdits);

  return {
    updates: edits.updates,
    deletedIds: [],
  };
}

export function isAbsenceLesson(lesson) {
  return lesson?.status === ABSENCE_STATUS;
}

export function isPendingMakeupLesson(lesson) {
  return isAbsenceLesson(lesson) && (lesson.absenceStatus || ABSENCE_MAKEUP_PENDING) === ABSENCE_MAKEUP_PENDING;
}

export function markLessonAbsenceEdit(rawEdits, lessonId, {
  reason = "生病",
  note = "",
  markedAt = new Date().toISOString(),
} = {}) {
  const edits = normalizeLessonEdits(rawEdits);
  const id = String(lessonId);
  const current = edits.updates[id] || {};

  return setLessonEdit(edits, id, {
    ...current,
    status: ABSENCE_STATUS,
    absenceStatus: ABSENCE_MAKEUP_PENDING,
    absenceReason: reason || "生病",
    absenceNote: note || "",
    absenceMarkedAt: markedAt,
  });
}

export function restoreAbsenceLessonEdit(rawEdits, lessonId) {
  const edits = normalizeLessonEdits(rawEdits);
  const id = String(lessonId);
  const current = edits.updates[id] || {};
  const {
    absenceStatus,
    absenceReason,
    absenceNote,
    absenceMarkedAt,
    ...rest
  } = current;

  return setLessonEdit(edits, id, {
    ...rest,
    status: "已编辑",
  });
}

export function completeAbsenceMakeupEdit(rawEdits, lessonId) {
  const edits = normalizeLessonEdits(rawEdits);
  const id = String(lessonId);
  const current = edits.updates[id] || {};

  return setLessonEdit(edits, id, {
    ...current,
    status: ABSENCE_STATUS,
    absenceStatus: ABSENCE_MAKEUP_DONE,
  });
}

function compactChanges(changes) {
  const compacted = {};

  for (const [key, value] of Object.entries(changes || {})) {
    if (value === undefined || value === null) {
      continue;
    }
    compacted[key] = typeof value === "string" ? value.trim() : value;
  }

  return compacted;
}

function getManualLessonSeriesBaseId(lessonId) {
  const match = String(lessonId || "").match(/^(manual-\d+)-\d+$/);
  return match ? match[1] : String(lessonId || "");
}

function compareManualLessonBaseIds(left, right) {
  const leftTime = getManualLessonBaseTime(left);
  const rightTime = getManualLessonBaseTime(right);
  if (leftTime !== rightTime) {
    return leftTime - rightTime;
  }
  return String(left).localeCompare(String(right));
}

function getManualLessonBaseTime(lessonId) {
  const match = String(lessonId || "").match(/^manual-(\d+)/);
  return match ? Number(match[1]) : 0;
}

function getManualLessonSeriesKey(lesson) {
  if (!lesson || typeof lesson !== "object") {
    return "";
  }
  const startDate = normalizeSeriesDate(lesson.startDate || lesson.date);
  if (!lesson.teacherId || !lesson.studentName || !lesson.course || !startDate || !lesson.startTime) {
    return "";
  }

  return [
    normalizeSeriesText(lesson.teacherId),
    normalizeSeriesText(lesson.studentName),
    normalizeSeriesText(lesson.course),
    normalizeSeriesText(lesson.grade),
    normalizeSeriesText(lesson.campus),
    startDate,
    normalizeSeriesText(lesson.startTime),
    normalizeSeriesText(lesson.endTime),
    normalizeSeriesNumber(lesson.durationMinutes),
    normalizeSeriesNumber(lesson.sessionCount),
    normalizeSeriesWeekdays(lesson.recurrenceWeekdays, startDate),
  ].join("|");
}

function normalizeSeriesText(value) {
  return String(value || "").trim();
}

function normalizeSeriesNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? String(number) : "";
}

function normalizeSeriesDate(value) {
  const normalized = normalizeSeriesText(value);
  return /^\d{4}-\d{2}-\d{2}$/.test(normalized) ? normalized : "";
}

function normalizeSeriesWeekdays(value, fallbackDate) {
  const weekdays = Array.isArray(value)
    ? value.map(Number).filter((day) => Number.isInteger(day) && day >= 1 && day <= 7)
    : [];
  const normalizedWeekdays = weekdays.length ? weekdays : [getWeekdayValueFromDateString(fallbackDate)].filter(Boolean);
  return Array.from(new Set(normalizedWeekdays)).sort((left, right) => left - right).join(",");
}

function getWeekdayValueFromDateString(dateString) {
  const normalized = normalizeSeriesDate(dateString);
  if (!normalized) {
    return 0;
  }
  const day = new Date(`${normalized}T00:00:00Z`).getUTCDay();
  return day === 0 ? 7 : day || 0;
}
