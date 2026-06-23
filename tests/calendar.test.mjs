import test from "node:test";
import assert from "node:assert/strict";

import {
  buildLessonDetail,
  buildWeekOverview,
  filterCalendarLessons,
  isCalendarVisibleLesson,
} from "../src/calendar.js";

test("calendar view hides unavailable blocks and keeps course cards", () => {
  const lessons = [
    { id: "confirmed", status: "已确认" },
    { id: "unavailable", status: "不可用" },
    { id: "preview", status: "预排" },
    { id: "imported", status: "Excel导入" },
  ];

  assert.equal(isCalendarVisibleLesson({ status: "不可用" }), false);
  assert.deepEqual(
    filterCalendarLessons(lessons).map((lesson) => lesson.id),
    ["confirmed", "preview", "imported"],
  );
});

test("builds a week overview grouped by day and time range", () => {
  const weekDates = [
    { iso: "2026-07-01", label: "周三" },
    { iso: "2026-07-02", label: "周四" },
  ];
  const lessons = [
    {
      id: "late",
      date: "2026-07-01",
      startTime: "13:00",
      endTime: "16:00",
      teacherName: "Tiana",
      studentName: "Kason",
      course: "英语陪伴",
      status: "已确认",
    },
    {
      id: "hidden",
      date: "2026-07-01",
      startTime: "08:00",
      endTime: "21:30",
      teacherName: "Gioia",
      studentName: "不可用",
      course: "休",
      status: "不可用",
    },
    {
      id: "early-b",
      date: "2026-07-01",
      startTime: "09:00",
      endTime: "12:00",
      teacherName: "Karen",
      studentName: "班课",
      course: "语法基础",
      status: "已确认",
    },
    {
      id: "early-a",
      date: "2026-07-01",
      startTime: "09:00",
      endTime: "12:00",
      teacherName: "Hanna",
      studentName: "班课",
      course: "写作基础",
      status: "已确认",
    },
  ];

  const overview = buildWeekOverview(weekDates, lessons);

  assert.equal(overview[0].lessonCount, 3);
  assert.equal(overview[0].groups.length, 2);
  assert.equal(overview[0].groups[0].timeRange, "09:00-12:00");
  assert.deepEqual(
    overview[0].groups[0].lessons.map((lesson) => lesson.id),
    ["early-a", "early-b"],
  );
  assert.deepEqual(
    overview[0].groups[1].lessons.map((lesson) => lesson.id),
    ["late"],
  );
  assert.equal(overview[1].lessonCount, 0);
});

test("builds fixed morning afternoon evening daypart segments", () => {
  const weekDates = [
    { iso: "2026-07-01", label: "周三" },
  ];
  const lessons = [
    makeCalendarLesson("morning", "2026-07-01", "09:00", "11:00"),
    makeCalendarLesson("afternoon", "2026-07-01", "13:00", "15:00"),
    makeCalendarLesson("evening", "2026-07-01", "18:30", "20:30"),
  ];

  const [day] = buildWeekOverview(weekDates, lessons);

  assert.deepEqual(
    day.segments.map((segment) => [segment.id, segment.label, segment.lessonCount]),
    [
      ["morning", "上午", 1],
      ["afternoon", "下午", 1],
      ["evening", "晚上", 1],
    ],
  );
  assert.deepEqual(
    day.segments.map((segment) => segment.groups.flatMap((group) => group.lessons.map((lesson) => lesson.id))),
    [["morning"], ["afternoon"], ["evening"]],
  );
});

test("keeps empty daypart segments visible for sparse days", () => {
  const weekDates = [
    { iso: "2026-07-01", label: "周三" },
  ];
  const lessons = [
    makeCalendarLesson("afternoon", "2026-07-01", "13:00", "15:00"),
  ];

  const [day] = buildWeekOverview(weekDates, lessons);

  assert.deepEqual(
    day.segments.map((segment) => [segment.id, segment.lessonCount, segment.groups.length]),
    [
      ["morning", 0, 0],
      ["afternoon", 1, 1],
      ["evening", 0, 0],
    ],
  );
});

test("builds lesson detail with inferred recurring schedule", () => {
  const lessons = [
    makeLesson("a", "2026-07-07"),
    makeLesson("b", "2026-07-08"),
    makeLesson("c", "2026-07-14"),
    makeLesson("d", "2026-07-15"),
    {
      ...makeLesson("other", "2026-07-08"),
      teacherId: "sophie",
      teacherName: "Sophie",
    },
  ];

  const detail = buildLessonDetail(lessons[0], lessons);

  assert.equal(detail.title, "AI 财商");
  assert.equal(detail.teacherName, "Phebe");
  assert.equal(detail.studentName, "班课");
  assert.equal(detail.dateLabel, "2026-07-07 周二");
  assert.equal(detail.timeRange, "15:15-16:15");
  assert.equal(detail.durationLabel, "1 小时");
  assert.equal(detail.durationMinutes, 60);
  assert.equal(detail.recurrence.startDate, "2026-07-07");
  assert.equal(detail.recurrence.endDate, "2026-07-15");
  assert.equal(detail.recurrence.weekdayText, "周二、周三");
  assert.deepEqual(detail.recurrence.weekdayValues, [2, 3]);
  assert.equal(detail.recurrence.sessionCount, 4);
  assert.equal(detail.recurrence.weeksLabel, "2 周");
  assert.equal(detail.recurrence.summary, "2026-07-07 开始，每周：周二、周三 15:15-16:15，共 4 节");
  assert.equal(detail.campus, "徐汇");
  assert.equal(detail.location, "上海电影厂 1108");
  assert.equal(detail.notes, "需要名单 8天");
});

test("lesson detail uses saved editable start date before inferred series date", () => {
  const detail = buildLessonDetail(
    {
      ...makeLesson("edited", "2026-07-07"),
      startDate: "2026-07-01",
    },
    [makeLesson("edited", "2026-07-07"), makeLesson("later", "2026-07-14")],
  );

  assert.equal(detail.recurrence.startDate, "2026-07-01");
  assert.equal(detail.recurrence.summary, "2026-07-01 开始，每周：周二 15:15-16:15，共 2 节");
});

test("lesson detail calculates end date from start date weekdays and total session count", () => {
  const detail = buildLessonDetail(
    {
      ...makeLesson("a", "2026-07-07"),
      startDate: "2026-07-07",
      sessionCount: 7,
      recurrenceWeekdays: [2, 3, 4, 5],
    },
    [
      {
        ...makeLesson("a", "2026-07-07"),
        startDate: "2026-07-07",
        sessionCount: 7,
        recurrenceWeekdays: [2, 3, 4, 5],
      },
      makeLesson("b", "2026-07-08"),
      makeLesson("c", "2026-07-10"),
      makeLesson("d", "2026-07-14"),
      makeLesson("e", "2026-07-15"),
      makeLesson("f", "2026-07-16"),
      makeLesson("g", "2026-07-17"),
    ],
  );

  assert.equal(detail.recurrence.endDate, "2026-07-16");
  assert.equal(detail.recurrence.summary, "2026-07-07 开始，每周：周二、周三、周四、周五 15:15-16:15，共 7 节");
});

test("lesson detail keeps a series together when a later lesson has no campus", () => {
  const detail = buildLessonDetail(
    makeLesson("a", "2026-07-07"),
    [
      makeLesson("a", "2026-07-07"),
      {
        ...makeLesson("b", "2026-07-08"),
        campus: "",
      },
    ],
  );

  assert.equal(detail.recurrence.endDate, "2026-07-08");
  assert.deepEqual(detail.recurrence.weekdayValues, [2, 3]);
  assert.equal(detail.recurrence.sessionCount, 2);
});

test("lesson detail marks preview lessons for confirmation", () => {
  const detail = buildLessonDetail(
    {
      ...makeLesson("preview-phebe-1", "2026-07-07"),
      status: "预排",
    },
    [
      {
        ...makeLesson("preview-phebe-1", "2026-07-07"),
        status: "预排",
      },
    ],
  );

  assert.equal(detail.isPreview, true);
  assert.equal(detail.status, "预排");
});

function makeCalendarLesson(id, date, startTime, endTime) {
  return {
    id,
    date,
    startTime,
    endTime,
    teacherName: "Lynn",
    studentName: "Ziyi",
    course: "Ziyi上门",
    status: "已确认",
  };
}

function makeLesson(id, date) {
  return {
    id,
    teacherId: "phebe",
    teacherName: "Phebe",
    studentName: "班课",
    course: "AI 财商",
    deliveryType: "线下",
    campus: "徐汇",
    location: "上海电影厂 1108",
    date,
    startTime: "15:15",
    endTime: "16:15",
    status: "待确认",
    notes: "需要名单 8天",
  };
}
