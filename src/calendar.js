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
    const groups = [];

    for (const lesson of dayLessons) {
      const timeRange = `${lesson.startTime}-${lesson.endTime}`;
      let group = groups.find((item) => item.timeRange === timeRange);
      if (!group) {
        group = { timeRange, lessons: [] };
        groups.push(group);
      }
      group.lessons.push(lesson);
    }

    return {
      ...day,
      lessonCount: dayLessons.length,
      groups,
    };
  });
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
  const endDate = seriesDates[seriesDates.length - 1] || lesson.date;
  const weekdayText = weekdays.join("、") || WEEKDAY_LABELS[getWeekday(lesson.date)];
  const timeRange = `${lesson.startTime}-${lesson.endTime}`;
  const durationMinutes = parseTimeToMinutes(lesson.endTime) - parseTimeToMinutes(lesson.startTime);
  const sessionCount = Number(lesson.sessionCount || seriesLessons.length) || seriesLessons.length;

  return {
    id: lesson.id,
    title: lesson.course || "未命名课程",
    teacherId: lesson.teacherId || "",
    teacherName: lesson.teacherName || "未填写",
    studentName: lesson.studentName || "未填写",
    course: lesson.course || "未填写",
    grade: lesson.grade || "未填写",
    deliveryType: lesson.deliveryType || "未填写",
    campus: lesson.campus || "未填写",
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

function formatWeeksBetween(startDate, endDate) {
  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  const days = Math.max(1, Math.floor((end - start) / 86400000) + 1);
  return `${Math.ceil(days / 7)} 周`;
}

function parseTimeToMinutes(time) {
  const [hourPart, minutePart = "0"] = String(time || "").split(":");
  return Number(hourPart) * 60 + Number(minutePart);
}
