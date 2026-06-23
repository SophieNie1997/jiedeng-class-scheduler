export function isCalendarVisibleLesson(lesson) {
  return lesson.status !== "不可用";
}

export function filterCalendarLessons(lessons) {
  return lessons.filter(isCalendarVisibleLesson);
}

export function buildWeekOverview(weekDates, lessons) {
  const visibleLessons = filterCalendarLessons(lessons);

  return weekDates.map((day) => {
    const dayLessons = visibleLessons
      .filter((lesson) => lesson.date === day.iso)
      .sort(compareCalendarLessons);
    const segments = DAYPARTS.map((daypart) => ({
      ...daypart,
      lessonCount: 0,
      groups: [],
    }));

    for (const lesson of dayLessons) {
      const timeRange = `${lesson.startTime}-${lesson.endTime}`;
      const segment = getCalendarDaypartSegment(segments, lesson.startTime);
      let group = segment.groups.find((item) => item.timeRange === timeRange);
      if (!group) {
        group = { timeRange, lessons: [] };
        segment.groups.push(group);
      }
      group.lessons.push(lesson);
      segment.lessonCount += 1;
    }

    return {
      ...day,
      lessonCount: dayLessons.length,
      groups: segments.flatMap((segment) => segment.groups),
      segments,
    };
  });
}

export function buildTeacherDurationSummary(lessons, { startDate, endDate, teachers = [] } = {}) {
  const visibleLessons = filterCalendarLessons(lessons)
    .filter((lesson) => isDateInRange(lesson.date, startDate, endDate));
  const rowsByTeacher = new Map();
  const teacherRoster = Array.isArray(teachers) ? teachers : [];

  for (const teacher of teacherRoster) {
    const teacherId = String(teacher.id || teacher.name || "").trim();
    const teacherName = String(teacher.name || teacher.id || "").trim();
    if (!teacherId && !teacherName) {
      continue;
    }

    rowsByTeacher.set(teacherId || teacherName, {
      teacherId: teacherId || teacherName,
      teacherName: teacherName || teacherId,
      lessonCount: 0,
      totalMinutes: 0,
    });
  }

  for (const lesson of visibleLessons) {
    const durationMinutes = getLessonDurationMinutes(lesson);
    if (durationMinutes <= 0) {
      continue;
    }

    const teacherId = String(lesson.teacherId || lesson.teacherName || "未填写");
    const teacherName = lesson.teacherName || lesson.teacherId || "未填写";
    const existing = rowsByTeacher.get(teacherId) || {
      teacherId,
      teacherName,
      lessonCount: 0,
      totalMinutes: 0,
    };
    existing.lessonCount += 1;
    existing.totalMinutes += durationMinutes;
    rowsByTeacher.set(teacherId, existing);
  }

  return Array.from(rowsByTeacher.values())
    .map((row) => ({
      ...row,
      totalHoursLabel: formatTotalHours(row.totalMinutes),
    }))
    .sort(
      (left, right) =>
        right.totalMinutes - left.totalMinutes ||
        right.lessonCount - left.lessonCount ||
        left.teacherName.localeCompare(right.teacherName, "zh-Hans-CN"),
    );
}

export function buildTeacherWeeklyDurationTable(lessons, { weeks = [], teachers = [], includeUnlistedTeachers = true } = {}) {
  const normalizedWeeks = Array.isArray(weeks)
    ? weeks
        .map((week, index) => ({
          label: week.label || `第${index + 1}周`,
          rangeLabel: week.rangeLabel || "",
          startDate: week.startDate || "",
          endDate: week.endDate || week.startDate || "",
        }))
        .filter((week) => week.startDate && week.endDate)
    : [];
  const rowsByTeacher = new Map();
  const teacherRoster = Array.isArray(teachers) ? teachers : [];

  for (const teacher of teacherRoster) {
    const teacherId = String(teacher.id || teacher.name || "").trim();
    const teacherName = String(teacher.name || teacher.id || "").trim();
    if (!teacherId && !teacherName) {
      continue;
    }

    rowsByTeacher.set(teacherId || teacherName, createTeacherWeeklyDurationRow(
      teacherId || teacherName,
      teacherName || teacherId,
      normalizedWeeks,
    ));
  }

  for (const lesson of filterCalendarLessons(lessons)) {
    const durationMinutes = getLessonDurationMinutes(lesson);
    if (durationMinutes <= 0) {
      continue;
    }

    const weekIndex = normalizedWeeks.findIndex((week) => isDateInRange(lesson.date, week.startDate, week.endDate));
    if (weekIndex < 0) {
      continue;
    }

    const teacherId = String(lesson.teacherId || lesson.teacherName || "未填写");
    const teacherName = lesson.teacherName || lesson.teacherId || "未填写";
    const existingRow = rowsByTeacher.get(teacherId);
    if (!existingRow && !includeUnlistedTeachers) {
      continue;
    }

    const row = existingRow || createTeacherWeeklyDurationRow(teacherId, teacherName, normalizedWeeks);
    row.weeks[weekIndex].lessonCount += 1;
    row.weeks[weekIndex].totalMinutes += durationMinutes;
    row.totalLessonCount += 1;
    row.totalMinutes += durationMinutes;
    rowsByTeacher.set(teacherId, row);
  }

  return Array.from(rowsByTeacher.values())
    .map((row) => ({
      ...row,
      totalHoursLabel: formatTotalHours(row.totalMinutes),
      weeks: row.weeks.map((week) => ({
        ...week,
        totalHoursLabel: formatTotalHours(week.totalMinutes),
      })),
    }))
    .sort(
      (left, right) =>
        right.totalMinutes - left.totalMinutes ||
        right.totalLessonCount - left.totalLessonCount ||
        left.teacherName.localeCompare(right.teacherName, "zh-Hans-CN"),
    );
}

const DAYPARTS = [
  { id: "morning", label: "上午", rangeLabel: "12:00 前" },
  { id: "afternoon", label: "下午", rangeLabel: "12:00-18:00" },
  { id: "evening", label: "晚上", rangeLabel: "18:00 后" },
];

function createTeacherWeeklyDurationRow(teacherId, teacherName, weeks) {
  return {
    teacherId,
    teacherName,
    totalLessonCount: 0,
    totalMinutes: 0,
    weeks: weeks.map((week) => ({
      ...week,
      lessonCount: 0,
      totalMinutes: 0,
    })),
  };
}

function getCalendarDaypartSegment(segments, startTime) {
  const minutes = parseTimeToMinutes(startTime);
  const segmentId = getCalendarDaypartId(minutes);
  return segments.find((segment) => segment.id === segmentId) || segments[1] || segments[0];
}

function getCalendarDaypartId(startMinutes) {
  if (startMinutes < 12 * 60) {
    return "morning";
  }
  if (startMinutes < 18 * 60) {
    return "afternoon";
  }
  return "evening";
}

export function buildLessonDetail(lesson, lessons) {
  const seriesLessons = findSeriesLessons(lesson, lessons);
  const seriesDates = seriesLessons.map((item) => item.date).sort();
  const seriesWeekdayValues = Array.from(new Set(seriesLessons.map((item) => getWeekday(item.date)))).sort(
    (left, right) => left - right,
  );
  const editedWeekdayValues = Array.isArray(lesson.recurrenceWeekdays)
    ? lesson.recurrenceWeekdays.map(Number).filter((weekday) => WEEKDAY_LABELS[weekday])
    : [];
  const weekdayValues = editedWeekdayValues.length ? editedWeekdayValues : seriesWeekdayValues;
  const weekdays = weekdayValues.map((weekday) => WEEKDAY_LABELS[weekday]);
  const startDate = lesson.startDate || seriesDates[0] || lesson.date;
  const timeRange = `${lesson.startTime}-${lesson.endTime}`;
  const durationMinutes = parseTimeToMinutes(lesson.endTime) - parseTimeToMinutes(lesson.startTime);
  const sessionCount = Number(lesson.sessionCount || seriesLessons.length) || seriesLessons.length;
  const endDate = calculateRecurringEndDate(startDate, weekdayValues, sessionCount) || seriesDates[seriesDates.length - 1] || lesson.date;
  const weekdayText = weekdays.join("、") || WEEKDAY_LABELS[getWeekday(lesson.date)];

  return {
    id: lesson.id,
    title: lesson.course || "未命名课程",
    teacherId: lesson.teacherId || "",
    teacherName: lesson.teacherName || "未填写",
    studentName: lesson.studentName || "未填写",
    course: lesson.course || "未填写",
    grade: lesson.grade || "未填写",
    deliveryType: lesson.deliveryType || "未填写",
    campus: normalizeCampusForDisplay(lesson.campus) || "未填写",
    location: lesson.location || "",
    date: lesson.date,
    weekdayName: WEEKDAY_LABELS[getWeekday(lesson.date)],
    dateLabel: `${lesson.date} ${WEEKDAY_LABELS[getWeekday(lesson.date)]}`,
    startTime: lesson.startTime,
    endTime: lesson.endTime,
    timeRange,
    durationMinutes,
    durationLabel: formatDuration(lesson.startTime, lesson.endTime),
    status: lesson.status || "未填写",
    isPreview: lesson.status === "预排",
    notes: lesson.notes || lesson.note || "",
    source: lesson.source || "",
    recurrence: {
      startDate,
      explicitStartDate: lesson.startDate || "",
      endDate,
      weekdayText,
      weekdayValues,
      sessionCount,
      weeksLabel: formatWeeksBetween(startDate, endDate),
      summary: `${startDate} 开始，每周：${weekdayText} ${timeRange}，共 ${sessionCount} 节`,
    },
  };
}

export function compareCalendarLessons(left, right) {
  return (
    left.startTime.localeCompare(right.startTime) ||
    left.endTime.localeCompare(right.endTime) ||
    String(left.teacherName || "").localeCompare(String(right.teacherName || "")) ||
    String(left.studentName || "").localeCompare(String(right.studentName || ""))
  );
}

const WEEKDAY_LABELS = {
  1: "周一",
  2: "周二",
  3: "周三",
  4: "周四",
  5: "周五",
  6: "周六",
  7: "周日",
};

function findSeriesLessons(lesson, lessons) {
  const seriesKey = getSeriesKey(lesson);
  return lessons
    .filter((item) => getSeriesKey(item) === seriesKey)
    .sort(compareCalendarLessons);
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

function calculateRecurringEndDate(startDate, weekdayValues, sessionCount) {
  const normalizedStart = String(startDate || "").trim();
  const count = Number(sessionCount || 0);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalizedStart) || !count) {
    return "";
  }

  const weekdays = Array.isArray(weekdayValues) && weekdayValues.length
    ? weekdayValues.map(Number).filter((weekday) => WEEKDAY_LABELS[weekday])
    : [getWeekday(normalizedStart)];
  const weekdaySet = new Set(weekdays);
  const cursor = new Date(`${normalizedStart}T00:00:00Z`);
  let matched = 0;
  const maxDaysToScan = Math.max(14, count * 10 + 14);

  for (let offset = 0; offset <= maxDaysToScan; offset += 1) {
    const candidate = new Date(cursor);
    candidate.setUTCDate(cursor.getUTCDate() + offset);
    const dateString = candidate.toISOString().slice(0, 10);
    if (!weekdaySet.has(getWeekday(dateString))) {
      continue;
    }

    matched += 1;
    if (matched >= count) {
      return dateString;
    }
  }

  return "";
}

function getWeekday(dateString) {
  const day = new Date(`${dateString}T00:00:00Z`).getUTCDay();
  return day === 0 ? 7 : day;
}

function formatDuration(startTime, endTime) {
  const minutes = parseTimeToMinutes(endTime) - parseTimeToMinutes(startTime);
  if (minutes <= 0) {
    return "未填写";
  }

  if (minutes % 60 === 0) {
    return `${minutes / 60} 小时`;
  }

  if (minutes > 60 && minutes % 30 === 0) {
    return `${minutes / 60} 小时`;
  }

  return `${minutes} 分钟`;
}

function formatTotalHours(totalMinutes) {
  if (totalMinutes <= 0) {
    return "0 小时";
  }

  const hours = totalMinutes / 60;
  return `${Number.isInteger(hours) ? hours : Number(hours.toFixed(1))} 小时`;
}

function getLessonDurationMinutes(lesson) {
  const explicitDuration = Number(lesson.durationMinutes || 0);
  if (explicitDuration > 0) {
    return explicitDuration;
  }

  return parseTimeToMinutes(lesson.endTime) - parseTimeToMinutes(lesson.startTime);
}

function isDateInRange(dateString, startDate, endDate) {
  const date = String(dateString || "");
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && (!startDate || date >= startDate) && (!endDate || date <= endDate);
}

function formatWeeksBetween(startDate, endDate) {
  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  const days = Math.max(1, Math.floor((end - start) / 86400000) + 1);
  return `${Math.ceil(days / 7)} 周`;
}

function normalizeCampusForDisplay(value) {
  const normalized = String(value ?? "").trim();
  return normalized === "浦东" ? "八佰伴" : normalized;
}

function parseTimeToMinutes(time) {
  const [hourPart, minutePart = "0"] = String(time || "").split(":");
  return Number(hourPart) * 60 + Number(minutePart);
}
