import { getWeekday } from "./scheduler.js";

export const CAMPUS_OPTIONS = ["浦东", "徐汇", "上门"];

const BLOCKED_DAY_START = "08:00";
const BLOCKED_DAY_END = "21:30";

export function makeShiftKey(teacherId, date) {
  return `${teacherId}__${date}`;
}

export function getTeacherShiftForDate(teacher, date, shifts) {
  const override = shifts[makeShiftKey(teacher.id, date)];
  if (override) {
    return normalizeShift(override, "override");
  }

  const weekday = getWeekday(date);
  const weeklySlot = (teacher.weeklyAvailability || []).find(
    (slot) => Number(slot.weekday) === weekday,
  );

  if (weeklySlot) {
    const templateShift = {
      type: "work",
      startTime: weeklySlot.startTime,
      endTime: weeklySlot.endTime,
      campus: weeklySlot.campus || "浦东",
    };

    return {
      source: "weekly",
      type: "template",
      label: buildShiftLabel(templateShift),
      startTime: weeklySlot.startTime,
      endTime: weeklySlot.endTime,
      campus: templateShift.campus,
    };
  }

  return {
    source: "empty",
    type: "empty",
    label: "未设置",
    startTime: "",
    endTime: "",
  };
}

export function buildAvailabilityOverrides(teachers, shifts) {
  const teacherIds = new Set(teachers.map((teacher) => teacher.id));
  const overridesByTeacher = {};

  for (const [key, shift] of Object.entries(shifts)) {
    const { teacherId, date } = parseShiftKey(key);
    if (!teacherIds.has(teacherId)) {
      continue;
    }

    if (shift.type === "work") {
      const normalized = normalizeShift(shift, "override");
      if (!normalized.startTime || !normalized.endTime) {
        continue;
      }

      if (!overridesByTeacher[teacherId]) {
        overridesByTeacher[teacherId] = [];
      }

      overridesByTeacher[teacherId].push({
        date,
        intervals: [{ startTime: normalized.startTime, endTime: normalized.endTime }],
        label: normalized.label,
        campus: normalized.campus,
      });
    }
  }

  for (const overrides of Object.values(overridesByTeacher)) {
    overrides.sort((left, right) => left.date.localeCompare(right.date));
  }

  return overridesByTeacher;
}

export function buildUnavailableLessonsFromShifts(teachers, shifts) {
  const teachersById = new Map(teachers.map((teacher) => [teacher.id, teacher]));
  const lessons = [];

  for (const [key, shift] of Object.entries(shifts)) {
    if (!["off", "holiday"].includes(shift.type)) {
      continue;
    }

    const { teacherId, date } = parseShiftKey(key);
    const teacher = teachersById.get(teacherId);
    if (!teacher) {
      continue;
    }

    lessons.push({
      id: `shift-block-${teacherId}-${date}`,
      teacherId,
      teacherName: teacher.name,
      studentName: "排班",
      course: shift.label || (shift.type === "holiday" ? "法定" : "休"),
      deliveryType: "排班",
      date,
      startTime: BLOCKED_DAY_START,
      endTime: BLOCKED_DAY_END,
      status: "不可用",
    });
  }

  return lessons.sort((left, right) =>
    `${left.date} ${left.teacherName}`.localeCompare(`${right.date} ${right.teacherName}`, "zh-Hans-CN"),
  );
}

export function mergeTeacherShiftOverrides(teachers, shifts) {
  const overridesByTeacher = buildAvailabilityOverrides(teachers, shifts);

  return teachers.map((teacher) => ({
    ...teacher,
    availabilityOverrides: [
      ...(teacher.availabilityOverrides || []),
      ...(overridesByTeacher[teacher.id] || []),
    ],
  }));
}

export function createShiftFromOption(option) {
  return normalizeShift(option, "override");
}

export function buildShiftLabel(shift) {
  if (shift.type === "holiday") {
    return "法定";
  }

  if (shift.type === "off") {
    return "休";
  }

  return `${formatStartTimeLabel(shift.startTime)}-${formatDisplayHour(shift.endTime)}`;
}

export function parseShiftKey(key) {
  const [teacherId, date] = String(key).split("__");
  return { teacherId, date };
}

function normalizeShift(shift, source) {
  if (shift.type === "work") {
    return {
      source,
      type: "work",
      label: shift.label || buildShiftLabel(shift),
      startTime: shift.startTime || "",
      endTime: shift.endTime || "",
      campus: shift.campus || "浦东",
      ...(shift.note ? { note: shift.note } : {}),
    };
  }

  if (shift.type === "holiday") {
    return {
      source,
      type: "holiday",
      label: shift.label || "法定",
      startTime: "",
      endTime: "",
      ...(shift.note ? { note: shift.note } : {}),
    };
  }

  if (shift.type === "off") {
    return {
      source,
      type: "off",
      label: shift.label || "休",
      startTime: "",
      endTime: "",
      ...(shift.note ? { note: shift.note } : {}),
    };
  }

  return {
    source,
    type: "empty",
    label: shift.label || "未设置",
    startTime: "",
    endTime: "",
  };
}

function formatStartTimeLabel(time) {
  const hour = Number(String(time || "").split(":")[0]);
  if (hour < 12) {
    return `早${formatDisplayHour(time)}`;
  }

  if (hour < 18) {
    return `下午${formatDisplayHour(time)}`;
  }

  return `晚${formatDisplayHour(time)}`;
}

function formatDisplayHour(time) {
  const [hourPart, minutePart = "00"] = String(time || "").split(":");
  const hour = Number(hourPart);
  const displayHour = hour > 12 ? hour - 12 : hour;

  if (minutePart !== "00") {
    return `${displayHour}:${minutePart}`;
  }

  return String(displayHour);
}
