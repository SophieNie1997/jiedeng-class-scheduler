import test from "node:test";
import assert from "node:assert/strict";

import {
  expandRecurringLessons,
  formatMinutesToTime,
  matchTeachers,
  parseTimeToMinutes,
} from "../src/scheduler.js";

test("parses 15-minute time slots and rejects off-grid times", () => {
  assert.equal(parseTimeToMinutes("14:00"), 840);
  assert.equal(parseTimeToMinutes("20:45"), 1245);
  assert.equal(formatMinutesToTime(1020), "17:00");
  assert.throws(() => parseTimeToMinutes("14:10"), /15-minute/);
});

test("expands a fixed recurring schedule into dated lessons", () => {
  const lessons = expandRecurringLessons({
    startDate: "2026-06-15",
    weekdays: [1, 3, 5],
    startTime: "14:00",
    durationMinutes: 180,
    weeks: 4,
    studentName: "Ivan",
    course: "WAICY 集训",
    deliveryType: "线下",
  });

  assert.equal(lessons.length, 12);
  assert.deepEqual(
    lessons.slice(0, 3).map((lesson) => ({
      date: lesson.date,
      weekday: lesson.weekday,
      startTime: lesson.startTime,
      endTime: lesson.endTime,
    })),
    [
      { date: "2026-06-15", weekday: 1, startTime: "14:00", endTime: "17:00" },
      { date: "2026-06-17", weekday: 3, startTime: "14:00", endTime: "17:00" },
      { date: "2026-06-19", weekday: 5, startTime: "14:00", endTime: "17:00" },
    ],
  );
});

test("expands recurring lessons by requested session count", () => {
  const lessons = expandRecurringLessons({
    startDate: "2026-06-15",
    weekdays: [1, 3, 5],
    startTime: "14:00",
    durationMinutes: 120,
    sessionCount: 5,
    studentName: "Ivan",
    course: "WAICY 集训",
    deliveryType: "线下",
  });

  assert.equal(lessons.length, 5);
  assert.deepEqual(
    lessons.map((lesson) => lesson.date),
    ["2026-06-15", "2026-06-17", "2026-06-19", "2026-06-22", "2026-06-24"],
  );
});

test("ranks teachers by time availability before secondary fit", () => {
  const teachers = [
    {
      id: "lynn",
      name: "Lynn",
      courses: ["WAICY 集训"],
      grades: ["Y6"],
      deliveryTypes: ["线下", "上门"],
      maxWeeklyHours: 18,
      weeklyAvailability: [
        { weekday: 1, startTime: "14:00", endTime: "18:00" },
        { weekday: 3, startTime: "14:00", endTime: "18:00" },
        { weekday: 5, startTime: "14:00", endTime: "18:00" },
      ],
      unavailable: [],
    },
    {
      id: "tiana",
      name: "Tiana",
      courses: ["WAICY 集训"],
      grades: ["Y6"],
      deliveryTypes: ["线下"],
      maxWeeklyHours: 12,
      weeklyAvailability: [
        { weekday: 1, startTime: "14:00", endTime: "18:00" },
        { weekday: 3, startTime: "14:00", endTime: "18:00" },
      ],
      unavailable: [],
    },
  ];

  const existingLessons = [
    {
      id: "busy-1",
      teacherId: "tiana",
      date: "2026-06-17",
      startTime: "14:00",
      endTime: "17:00",
    },
  ];

  const matches = matchTeachers(teachers, existingLessons, {
    startDate: "2026-06-15",
    weekdays: [1, 3, 5],
    startTime: "14:00",
    durationMinutes: 180,
    weeks: 1,
    studentName: "Ivan",
    course: "WAICY 集训",
    grade: "Y6",
    deliveryType: "线下",
  });

  assert.equal(matches[0].teacherName, "Lynn");
  assert.equal(matches[0].availableSessions, 3);
  assert.equal(matches[0].totalSessions, 3);
  assert.equal(matches[0].conflicts.length, 0);
  assert.equal(matches[1].teacherName, "Tiana");
  assert.equal(matches[1].availableSessions, 1);
  assert.deepEqual(
    matches[1].conflicts.map((conflict) => conflict.reason),
    ["已有课程冲突", "不在老师常规可排时间内"],
  );
});

test("labels imported unavailable blocks separately from ordinary class conflicts", () => {
  const teachers = [
    {
      id: "gioia",
      name: "Gioia",
      courses: ["英语陪伴"],
      grades: ["Y6"],
      deliveryTypes: ["线下"],
      maxWeeklyHours: 20,
      weeklyAvailability: [{ weekday: 1, startTime: "08:00", endTime: "21:00" }],
      unavailable: [],
    },
  ];

  const matches = matchTeachers(
    teachers,
    [
      {
        id: "rest",
        teacherId: "gioia",
        date: "2026-06-29",
        startTime: "08:00",
        endTime: "21:00",
        course: "休息",
        status: "不可用",
      },
    ],
    {
      startDate: "2026-06-29",
      weekdays: [1],
      startTime: "14:00",
      durationMinutes: 180,
      weeks: 1,
      studentName: "Ivan",
      course: "英语陪伴",
      grade: "Y6",
      deliveryType: "线下",
    },
  );

  assert.equal(matches[0].conflicts[0].reason, "老师不可排时间");
  assert.equal(matches[0].conflicts[0].detail, "休息");
});

test("uses date-specific shift availability before weekly availability", () => {
  const teachers = [
    {
      id: "reece",
      name: "Reece",
      courses: ["WAICY 集训"],
      grades: ["Y6"],
      deliveryTypes: ["线下"],
      maxWeeklyHours: 12,
      weeklyAvailability: [{ weekday: 2, startTime: "12:00", endTime: "18:00" }],
      availabilityOverrides: [
        {
          date: "2026-06-29",
          intervals: [{ startTime: "09:00", endTime: "18:00" }],
          label: "早9-6",
        },
      ],
      unavailable: [],
    },
  ];

  const matches = matchTeachers(teachers, [], {
    startDate: "2026-06-29",
    weekdays: [1],
    startTime: "14:00",
    durationMinutes: 180,
    weeks: 1,
    studentName: "Ivan",
    course: "WAICY 集训",
    grade: "Y6",
    deliveryType: "线下",
  });

  assert.equal(matches[0].availableSessions, 1);
  assert.equal(matches[0].conflicts.length, 0);
});

test("treats an empty date-specific shift as outside that day schedule", () => {
  const teachers = [
    {
      id: "lynn",
      name: "Lynn",
      courses: ["WAICY 集训"],
      grades: ["Y6"],
      deliveryTypes: ["线下"],
      maxWeeklyHours: 18,
      weeklyAvailability: [{ weekday: 1, startTime: "09:00", endTime: "18:00" }],
      availabilityOverrides: [
        {
          date: "2026-06-29",
          intervals: [],
          label: "休",
        },
      ],
      unavailable: [],
    },
  ];

  const matches = matchTeachers(teachers, [], {
    startDate: "2026-06-29",
    weekdays: [1],
    startTime: "14:00",
    durationMinutes: 180,
    weeks: 1,
    studentName: "Ivan",
    course: "WAICY 集训",
    grade: "Y6",
    deliveryType: "线下",
  });

  assert.equal(matches[0].availableSessions, 0);
  assert.equal(matches[0].conflicts[0].reason, "不在老师当日排班时间内");
});
