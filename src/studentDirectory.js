const COURSE_LIKE_STUDENT_NAMES = new Set([
  "班课",
  "托福助教",
  "3:15-4:15浦东",
  "3:15-4:15徐汇或浦东",
  "WAICY比赛",
  "A1",
  "语文课程",
]);

const TEXT_FIELDS = [
  "name",
  "gender",
  "grade",
  "school",
  "businessType",
  "frequency",
  "phone",
  "address",
  "needs",
  "coursesText",
  "teachersText",
  "timeText",
];

export function makeStudentDirectoryId(name) {
  const normalized = normalizeText(name) || "student";
  return `student:${normalized}`;
}

export function normalizeStudentDirectory(raw) {
  const records = {};
  const hiddenIds = [];
  const source = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  const rawRecords = source.records && typeof source.records === "object" && !Array.isArray(source.records)
    ? source.records
    : {};

  for (const [fallbackId, record] of Object.entries(rawRecords)) {
    const normalized = normalizeStudentDirectoryRecord(record, fallbackId);
    if (normalized) {
      records[normalized.id] = normalized;
    }
  }

  for (const value of Array.isArray(source.hiddenIds) ? source.hiddenIds : []) {
    const id = normalizeText(value);
    if (id && !hiddenIds.includes(id)) {
      hiddenIds.push(id);
    }
  }

  return { records, hiddenIds };
}

export function setStudentDirectoryRecord(directory, record) {
  const normalizedDirectory = normalizeStudentDirectory(directory);
  const normalizedRecord = normalizeStudentDirectoryRecord(record);
  if (!normalizedRecord) {
    return normalizedDirectory;
  }

  return {
    ...normalizedDirectory,
    hiddenIds: normalizedDirectory.hiddenIds.filter((id) => id !== normalizedRecord.id),
    records: {
      ...normalizedDirectory.records,
      [normalizedRecord.id]: {
        ...(normalizedDirectory.records[normalizedRecord.id] || {}),
        ...normalizedRecord,
      },
    },
  };
}

export function hideStudentDirectoryRecord(directory, idOrName) {
  const normalizedDirectory = normalizeStudentDirectory(directory);
  const id = normalizeText(idOrName).startsWith("student:")
    ? normalizeText(idOrName)
    : makeStudentDirectoryId(idOrName);
  if (!id) {
    return normalizedDirectory;
  }

  const records = { ...normalizedDirectory.records };
  delete records[id];
  return {
    records,
    hiddenIds: normalizedDirectory.hiddenIds.includes(id)
      ? normalizedDirectory.hiddenIds
      : [...normalizedDirectory.hiddenIds, id],
  };
}

export function buildStudentDirectoryRows(overviewStudents, directory, options = {}) {
  const normalizedDirectory = normalizeStudentDirectory(directory);
  const recordsById = normalizedDirectory.records;
  const rowsById = new Map();

  for (const student of overviewStudents || []) {
    const name = normalizeText(student?.name);
    if (!name || isCourseLikeStudentName(name)) {
      continue;
    }

    const id = makeStudentDirectoryId(name);
    if (normalizedDirectory.hiddenIds.includes(id)) {
      continue;
    }
    rowsById.set(id, mergeStudentWithRecord(normalizeOverviewStudent(student, id), recordsById[id]));
  }

  const draft = normalizeDraftStudent(options.draftStudent);
  if (draft && !normalizedDirectory.hiddenIds.includes(draft.id)) {
    rowsById.set(draft.id, mergeStudentWithRecord(rowsById.get(draft.id) || createEmptyStudent(draft), draft));
  }

  for (const record of Object.values(recordsById)) {
    if (!record?.name || isCourseLikeStudentName(record.name)) {
      continue;
    }
    if (normalizedDirectory.hiddenIds.includes(record.id)) {
      continue;
    }
    if (!rowsById.has(record.id)) {
      rowsById.set(record.id, createEmptyStudent(record));
    }
  }

  return Array.from(rowsById.values()).sort(compareStudentRows);
}

export function filterStudentDirectoryRows(rows, query) {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) {
    return rows || [];
  }

  return (rows || []).filter((row) => buildStudentSearchText(row).includes(normalizedQuery));
}

function normalizeStudentDirectoryRecord(record, fallbackId = "") {
  if (!record || typeof record !== "object") {
    return null;
  }

  const name = normalizeText(record.name);
  const id = normalizeText(record.id) || normalizeText(fallbackId) || makeStudentDirectoryId(name);
  if (!name || !id) {
    return null;
  }

  const normalized = { id, name };
  for (const field of TEXT_FIELDS) {
    const value = normalizeText(record[field]);
    if (value) {
      normalized[field] = value;
    }
  }
  return normalized;
}

function normalizeDraftStudent(student) {
  if (!student || typeof student !== "object") {
    return null;
  }

  const name = normalizeText(student.studentName || student.name);
  if (!name || isCourseLikeStudentName(name)) {
    return null;
  }

  return normalizeStudentDirectoryRecord({
    id: makeStudentDirectoryId(name),
    name,
    grade: student.grade,
    businessType: student.course,
    coursesText: student.course,
  });
}

function normalizeOverviewStudent(student, id) {
  return {
    id,
    name: normalizeText(student.name),
    gender: normalizeText(student.gender),
    grade: normalizeText(student.grade),
    school: normalizeText(student.school),
    businessType: normalizeText(student.businessType),
    frequency: normalizeText(student.frequency),
    phone: normalizeText(student.phone),
    address: normalizeText(student.address),
    needs: normalizeText(student.needs),
    courses: Array.isArray(student.courses) ? student.courses.map(normalizeText).filter(Boolean) : [],
    teachers: Array.isArray(student.teachers) ? student.teachers.map(normalizeText).filter(Boolean) : [],
    campuses: Array.isArray(student.campuses) ? student.campuses.map(normalizeText).filter(Boolean) : [],
    statuses: Array.isArray(student.statuses) ? student.statuses.map(normalizeText).filter(Boolean) : [],
    lessonIds: Array.isArray(student.lessonIds) ? student.lessonIds.map(String).filter(Boolean) : [],
    lessonCount: Number(student.lessonCount || 0),
    firstDate: normalizeText(student.firstDate),
    lastDate: normalizeText(student.lastDate),
  };
}

function mergeStudentWithRecord(student, record) {
  if (!record) {
    return student;
  }

  return {
    ...student,
    ...Object.fromEntries(TEXT_FIELDS.map((field) => [field, record[field] || student[field] || ""])),
    id: student.id || record.id,
    name: record.name || student.name,
  };
}

function createEmptyStudent(record) {
  return {
    id: record.id,
    name: record.name,
    gender: record.gender || "",
    grade: record.grade || "",
    school: record.school || "",
    businessType: record.businessType || "",
    frequency: record.frequency || "",
    phone: record.phone || "",
    address: record.address || "",
    needs: record.needs || "",
    courses: [],
    teachers: [],
    campuses: [],
    statuses: [],
    lessonIds: [],
    lessonCount: 0,
    firstDate: "",
    lastDate: "",
    coursesText: record.coursesText || "",
    teachersText: record.teachersText || "",
    timeText: record.timeText || "",
  };
}

function compareStudentRows(left, right) {
  return (
    Number(right.lessonCount || 0) - Number(left.lessonCount || 0) ||
    localeSort(left.grade || "", right.grade || "") ||
    localeSort(left.name || "", right.name || "")
  );
}

function buildStudentSearchText(student) {
  const values = [
    student?.name,
    student?.gender,
    student?.grade,
    student?.school,
    student?.businessType,
    student?.frequency,
    student?.phone,
    student?.address,
    student?.needs,
    student?.source,
    student?.coursesText,
    student?.teachersText,
    student?.timeText,
    ...(Array.isArray(student?.courses) ? student.courses : []),
    ...(Array.isArray(student?.teachers) ? student.teachers : []),
    ...(Array.isArray(student?.campuses) ? student.campuses : []),
    ...(Array.isArray(student?.statuses) ? student.statuses : []),
  ];

  return normalizeSearchText(values.filter(Boolean).join(" "));
}

function normalizeSearchText(value) {
  return normalizeText(value).toLocaleLowerCase("zh-Hans-CN").replace(/\s+/g, "");
}

function normalizeText(value) {
  return String(value ?? "").trim();
}

function isCourseLikeStudentName(name) {
  const normalized = normalizeText(name);
  const compact = normalized.replace(/\s+/g, "");
  return COURSE_LIKE_STUDENT_NAMES.has(normalized) || COURSE_LIKE_STUDENT_NAMES.has(compact) || /^A1[（(]/.test(compact);
}

function localeSort(left, right) {
  return String(left).localeCompare(String(right), "zh-Hans-CN", { numeric: true });
}
