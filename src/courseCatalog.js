export const teachingSites = ["浦东", "徐汇", "上门", "线上"];

const COURSE_VARIANTS = {
  "WAICY 徐汇集训班": {
    course: "WAICY 集训",
    campus: "徐汇",
  },
  "财商x樱桃 徐汇暑期课": {
    course: "AI 财商",
    campus: "徐汇",
    contextNote: "樱桃图书馆英语课后",
  },
  "财商x樱桃 浦东暑期课": {
    course: "AI 财商",
    campus: "浦东",
    contextNote: "樱桃图书馆英语课后",
  },
};

export function normalizeCourseName(course) {
  return COURSE_VARIANTS[course]?.course || course;
}

export function normalizeCourseList(courses) {
  return Array.from(new Set(courses.map(normalizeCourseName)));
}

export function normalizeLessonCatalogFields(lesson) {
  const variant = COURSE_VARIANTS[lesson.course] || {};
  const campus = variant.campus || normalizeCampus(lesson.campus || lesson.deliveryType);
  const deliveryType = campus ? deriveDeliveryTypeFromCampus(campus) : lesson.deliveryType;

  return {
    ...lesson,
    course: variant.course || lesson.course,
    deliveryType,
    campus,
    notes: appendNote(lesson.notes || lesson.note || "", variant.contextNote),
  };
}

export function deriveDeliveryTypeFromCampus(campus) {
  if (campus === "线上") {
    return "线上";
  }

  if (campus === "上门") {
    return "上门";
  }

  return "线下";
}

export function normalizeCampus(value) {
  if (value === "线上" || value === "上门" || value === "徐汇" || value === "浦东") {
    return value;
  }

  return "";
}

function appendNote(notes, addition) {
  if (!addition || String(notes).includes(addition)) {
    return notes;
  }

  return notes ? `${notes}；${addition}` : addition;
}
