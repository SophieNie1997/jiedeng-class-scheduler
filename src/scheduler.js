const WEEKDAY_NAMES = {
  1: "星期一",
  2: "星期二",
  3: "星期三",
  4: "星期四",
  5: "星期五",
  6: "星期六",
  7: "星期日",
};

export function parseTimeToMinutes(time) {
  const match = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(String(time).trim());
  if (!match) {
    throw new Error(`Invalid time: ${time}`);
  }

  const minutes = Number(match[1]) * 60 + Number(match[2]);
  if (minutes % 15 !== 0) {
    throw new Error(`Time must align to a 15-minute slot: ${time}`);
  }

  return minutes;
}

export function formatMinutesToTime(minutes) {
  if (!Number.isInteger(minutes) || minutes < 0 || minutes > 24 * 60) {
    throw new Error(`Invalid minute value: ${minutes}`);
  }

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

export function intervalOverlaps(firstStart, firstEnd, secondStart, secondEnd) {
  return firstStart < secondEnd && secondStart < firstEnd;
}

export function getWeekday(dateString) {
  const date = parseDate(dateString);
  const day = date.getUTCDay();
  return day === 0 ? 7 : day;
}

export function expandRecurringLessons(request) {
  const startDate = parseDate(request.startDate);
  const requestedSessionCount = Number(request.sessionCount || 0);
  const daysToCheck = requestedSessionCount > 0
    ? requestedSessionCount * 7 + 7
    : Number(request.weeks || 1) * 7;
  const selectedWeekdays = new Set(request.weekdays.map(Number));
  const startMinutes = parseTimeToMinutes(request.startTime);
  const endMinutes = startMinutes + Number(request.durationMinutes);
  const lessons = [];

  if (endMinutes > 24 * 60) {
    throw new Error("Lesson cannot end after 24:00");
  }

  for (let offset = 0; offset < daysToCheck; offset += 1) {
    const date = addDays(startDate, offset);
    const dateString = toIsoDate(date);
    const weekday = getWeekday(dateString);

    if (!selectedWeekdays.has(weekday)) {
      continue;
    }

    lessons.push({
      date: dateString,
      weekday,
      weekdayName: WEEKDAY_NAMES[weekday],
      startTime: request.startTime,
      endTime: formatMinutesToTime(endMinutes),
      startMinutes,
      endMinutes,
      durationMinutes: Number(request.durationMinutes),
      studentName: request.studentName,
      course: request.course,
      grade: request.grade,
      deliveryType: request.deliveryType,
      campus: request.campus,
      sessionCount: requestedSessionCount || undefined,
      recurrenceWeekdays: Array.from(selectedWeekdays),
    });

    if (requestedSessionCount > 0 && lessons.length >= requestedSessionCount) {
      break;
    }
  }

  return lessons;
}

export function matchTeachers(teachers, existingLessons, request) {
  const desiredLessons = expandRecurringLessons(request);
  const matches = teachers.map((teacher) =>
    scoreTeacher(teacher, existingLessons, desiredLessons, request),
  );

  return matches.sort((left, right) => {
    if (right.availableSessions !== left.availableSessions) {
      return right.availableSessions - left.availableSessions;
    }

    if (right.fitScore !== left.fitScore) {
      return right.fitScore - left.fitScore;
    }

    if (left.weeklyLoadHours !== right.weeklyLoadHours) {
      return left.weeklyLoadHours - right.weeklyLoadHours;
    }

    return left.teacherName.localeCompare(right.teacherName, "zh-Hans-CN");
  });
}

export function buildLessonsForTeacher(teacher, request) {
  return expandRecurringLessons(request).map((lesson, index) => ({
    ...lesson,
    id: `preview-${teacher.id}-${index + 1}`,
    teacherId: teacher.id,
    teacherName: teacher.name,
    status: "预排",
  }));
}

function scoreTeacher(teacher, existingLessons, desiredLessons, request) {
  const fitIssues = getFitIssues(teacher, request);
  const courseBlocked = fitIssues.includes("课程不匹配");
  const conflicts = [];
  let availableSessions = 0;

  if (courseBlocked) {
    return {
      teacherId: teacher.id,
      teacherName: teacher.name,
      totalSessions: desiredLessons.length,
      availableSessions: 0,
      conflicts: desiredLessons.map((lesson) => ({
        date: lesson.date,
        weekdayName: lesson.weekdayName,
        startTime: lesson.startTime,
        endTime: lesson.endTime,
        reason: "课程不匹配",
        detail: `${teacher.name} 未开放 ${request.course}`,
      })),
      fitIssues,
      fitScore: 3 - fitIssues.length,
      weeklyLoadHours: getTeacherLoadHours(teacher.id, existingLessons),
      isRecommended: false,
    };
  }

  for (const lesson of desiredLessons) {
    const timeConflict = findTimeConflict(teacher, existingLessons, lesson);
    if (timeConflict) {
      conflicts.push(timeConflict);
    } else {
      availableSessions += 1;
    }
  }

  const fitScore = 3 - fitIssues.length;

  return {
    teacherId: teacher.id,
    teacherName: teacher.name,
    totalSessions: desiredLessons.length,
    availableSessions,
    conflicts,
    fitIssues,
    fitScore,
    weeklyLoadHours: getTeacherLoadHours(teacher.id, existingLessons),
    isRecommended: availableSessions === desiredLessons.length && fitIssues.length === 0,
  };
}

function findTimeConflict(teacher, existingLessons, lesson) {
  const scheduledConflict = existingLessons.find(
    (existing) =>
      existing.teacherId === teacher.id &&
      existing.date === lesson.date &&
      intervalOverlaps(
        parseTimeToMinutes(existing.startTime),
        parseTimeToMinutes(existing.endTime),
        lesson.startMinutes,
        lesson.endMinutes,
      ),
  );

  if (scheduledConflict) {
    if (scheduledConflict.status === "不可用") {
      return {
        date: lesson.date,
        weekdayName: lesson.weekdayName,
        startTime: lesson.startTime,
        endTime: lesson.endTime,
        reason: "老师不可排时间",
        detail: scheduledConflict.course || scheduledConflict.studentName || "不可用",
      };
    }

    return {
      date: lesson.date,
      weekdayName: lesson.weekdayName,
      startTime: lesson.startTime,
      endTime: lesson.endTime,
      reason: "已有课程冲突",
      detail: scheduledConflict.course || scheduledConflict.studentName || "已排课程",
    };
  }

  const unavailableConflict = (teacher.unavailable || []).find(
    (block) =>
      block.date === lesson.date &&
      intervalOverlaps(
        parseTimeToMinutes(block.startTime),
        parseTimeToMinutes(block.endTime),
        lesson.startMinutes,
        lesson.endMinutes,
      ),
  );

  if (unavailableConflict) {
    return {
      date: lesson.date,
      weekdayName: lesson.weekdayName,
      startTime: lesson.startTime,
      endTime: lesson.endTime,
      reason: unavailableConflict.reason || "老师临时不可用",
      detail: unavailableConflict.note || "",
    };
  }

  const availability = getAvailabilityCoverage(teacher, lesson);
  if (!availability.isCovered) {
    return {
      date: lesson.date,
      weekdayName: lesson.weekdayName,
      startTime: lesson.startTime,
      endTime: lesson.endTime,
      reason: availability.reason,
      detail: "",
    };
  }

  return null;
}

function getAvailabilityCoverage(teacher, lesson) {
  const dateOverride = (teacher.availabilityOverrides || []).find(
    (override) => override.date === lesson.date,
  );

  if (dateOverride) {
    return {
      isCovered: isCoveredByIntervals(dateOverride.intervals || [], lesson),
      reason: "不在老师当日排班时间内",
    };
  }

  return {
    isCovered: isCoveredByWeeklyAvailability(teacher, lesson),
    reason: "不在老师常规可排时间内",
  };
}

function isCoveredByWeeklyAvailability(teacher, lesson) {
  const intervals = (teacher.weeklyAvailability || [])
    .filter((slot) => Number(slot.weekday) === lesson.weekday)
    .map((slot) => ({
      startTime: slot.startTime,
      endTime: slot.endTime,
    }));

  return isCoveredByIntervals(intervals, lesson);
}

function isCoveredByIntervals(intervals, lesson) {
  return intervals.some((slot) => {
    const slotStart = parseTimeToMinutes(slot.startTime);
    const slotEnd = parseTimeToMinutes(slot.endTime);
    return slotStart <= lesson.startMinutes && slotEnd >= lesson.endMinutes;
  });
}

function getFitIssues(teacher, request) {
  const issues = [];

  if (request.course && !(teacher.courses || []).includes(request.course)) {
    issues.push("课程不匹配");
  }

  if (request.grade && !(teacher.grades || []).includes(request.grade)) {
    issues.push("年级不匹配");
  }

  if (request.deliveryType && !(teacher.deliveryTypes || []).includes(request.deliveryType)) {
    issues.push("授课方式不匹配");
  }

  return issues;
}

function getTeacherLoadHours(teacherId, existingLessons) {
  const minutes = existingLessons
    .filter((lesson) => lesson.teacherId === teacherId)
    .reduce((sum, lesson) => {
      return sum + parseTimeToMinutes(lesson.endTime) - parseTimeToMinutes(lesson.startTime);
    }, 0);

  return Math.round((minutes / 60) * 10) / 10;
}

function parseDate(dateString) {
  const date = new Date(`${dateString}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date: ${dateString}`);
  }
  return date;
}

function addDays(date, days) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function toIsoDate(date) {
  return date.toISOString().slice(0, 10);
}
