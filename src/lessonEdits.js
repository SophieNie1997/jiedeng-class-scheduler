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
