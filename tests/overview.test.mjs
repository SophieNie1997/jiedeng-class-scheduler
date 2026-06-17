import test from "node:test";
import assert from "node:assert/strict";

import { buildCourseOverview, buildStudentOverview, buildTeacherDayLessonIndex } from "../src/overview.js";

const lessons = [
  {
    id: "past-lesson",
    teacherName: "Phebe",
    studentName: "Ivan",
    course: "AI 财商",
    campus: "浦东",
    date: "2026-06-01",
    startTime: "10:00",
    endTime: "12:00",
    status: "已排",
  },
  {
    id: "lesson-2",
    teacherName: "Sophie",
    studentName: "Ivan",
    course: "WAICY 集训",
    campus: "徐汇",
    date: "2026-07-01",
    startTime: "14:00",
    endTime: "17:00",
    status: "已排",
  },
  {
    id: "unavailable-1",
    teacherName: "Sophie",
    studentName: "不可排",
    course: "灰色不可排",
    date: "2026-07-01",
    startTime: "09:00",
    endTime: "12:00",
    status: "不可用",
  },
  {
    id: "lesson-1",
    teacherName: "Phebe",
    studentName: "Ivan",
    course: "AI 财商",
    campus: "浦东",
    date: "2026-06-29",
    startTime: "10:00",
    endTime: "12:00",
    status: "手动新增",
  },
  {
    id: "lesson-3",
    teacherName: "Phebe",
    studentName: "Mia",
    course: "AI 财商",
    campus: "浦东",
    date: "2026-06-30",
    startTime: "10:00",
    endTime: "12:00",
    status: "已排",
  },
  {
    id: "lesson-4",
    teacherName: "Phebe",
    studentName: "Mia",
    course: "AI 财商",
    campus: "浦东",
    date: "2026-07-07",
    startTime: "10:00",
    endTime: "12:00",
    status: "已排",
  },
];

test("course overview groups future scheduled lessons into course cards", () => {
  const overview = buildCourseOverview(lessons, { today: "2026-06-30" });

  assert.equal(overview.totalCourses, 2);
  assert.equal(overview.totalLessons, 3);
  assert.deepEqual(
    overview.lessons.map((lesson) => lesson.id),
    ["lesson-3", "lesson-2", "lesson-4"],
  );
  assert.deepEqual(
    overview.courseCards.map((card) => `${card.studentName}:${card.course}:${card.lessonCount}`),
    ["Mia:AI 财商:2", "Ivan:WAICY 集训:1"],
  );

  const miaCard = overview.courseCards[0];
  assert.deepEqual(miaCard.lessonIds, ["lesson-3", "lesson-4"]);
  assert.equal(miaCard.nextDate, "2026-06-30");
  assert.equal(miaCard.lastDate, "2026-07-07");
  assert.deepEqual(miaCard.weekdays, ["周二"]);
  assert.equal(Object.hasOwn(miaCard, "status"), false);
});

test("course overview date range uses edited lesson start date", () => {
  const overview = buildCourseOverview(
    [
      {
        ...lessons.find((lesson) => lesson.id === "lesson-3"),
        startDate: "2026-06-20",
      },
      lessons.find((lesson) => lesson.id === "lesson-4"),
    ],
    { today: "2026-06-19" },
  );

  assert.equal(overview.courseCards[0].firstDate, "2026-06-20");
  assert.equal(overview.courseCards[0].lastDate, "2026-07-07");
});

test("course overview keeps same edited course together when campus is missing on later lessons", () => {
  const overview = buildCourseOverview(
    [
      {
        id: "finance-single",
        teacherName: "Phebe",
        studentName: "财商班课",
        course: "财商徐汇班课",
        campus: "徐汇",
        date: "2026-07-07",
        startTime: "15:30",
        endTime: "17:00",
        durationMinutes: 90,
        status: "手动新增",
      },
      {
        id: "finance-series",
        teacherName: "Phebe",
        studentName: "财商班课",
        course: "财商徐汇班课",
        campus: "",
        date: "2026-07-08",
        startTime: "15:30",
        endTime: "17:00",
        durationMinutes: 90,
        status: "已编辑",
      },
    ],
    { today: "2026-07-01" },
  );

  assert.equal(overview.totalCourses, 1);
  assert.equal(overview.courseCards[0].lessonCount, 2);
  assert.deepEqual(overview.courseCards[0].lessonIds, ["finance-single", "finance-series"]);
  assert.equal(overview.courseCards[0].nextDate, "2026-07-07");
});

test("teacher day lesson index groups visible same-day courses for shift cells", () => {
  const index = buildTeacherDayLessonIndex([
    {
      id: "sophie-afternoon",
      teacherId: "sophie",
      teacherName: "Sophie",
      studentName: "Ivan",
      course: "WAICY 集训",
      campus: "徐汇",
      date: "2026-07-01",
      startTime: "15:30",
      endTime: "18:30",
      status: "已排",
    },
    {
      id: "sophie-morning",
      teacherId: "sophie",
      teacherName: "Sophie",
      studentName: "Mia",
      course: "AI 财商",
      campus: "浦东",
      date: "2026-07-01",
      startTime: "10:00",
      endTime: "12:00",
      status: "已排",
    },
    {
      id: "hidden-shift-block",
      teacherId: "sophie",
      teacherName: "Sophie",
      studentName: "排班",
      course: "休",
      campus: "徐汇",
      date: "2026-07-01",
      startTime: "09:00",
      endTime: "18:00",
      status: "不可用",
    },
    {
      id: "phebe-lesson",
      teacherId: "phebe",
      teacherName: "Phebe",
      studentName: "Eric",
      course: "托福",
      campus: "浦东",
      date: "2026-07-01",
      startTime: "13:00",
      endTime: "14:30",
      status: "已排",
    },
  ]);

  assert.deepEqual(
    index.get("sophie__2026-07-01").map((lesson) => `${lesson.timeLabel} ${lesson.campus} ${lesson.studentName} ${lesson.course}`),
    ["10:00-12:00 浦东 Mia AI 财商", "15:30-18:30 徐汇 Ivan WAICY 集训"],
  );
  assert.equal(index.get("sophie__2026-07-01").some((lesson) => lesson.id === "hidden-shift-block"), false);
  assert.equal(index.get("phebe__2026-07-01")[0].studentName, "Eric");
});

test("student overview groups future scheduled lessons by student name with delete ids", () => {
  const overview = buildStudentOverview(lessons, { today: "2026-06-30" });

  assert.equal(overview.totalStudents, 2);
  assert.deepEqual(
    overview.students.map((student) => student.name),
    ["Mia", "Ivan"],
  );

  const mia = overview.students[0];
  assert.equal(mia.lessonCount, 2);
  assert.deepEqual(mia.lessonIds, ["lesson-3", "lesson-4"]);
  assert.deepEqual(mia.courses, ["AI 财商"]);
  assert.deepEqual(mia.teachers, ["Phebe"]);
  assert.equal(mia.firstDate, "2026-06-30");
  assert.equal(mia.lastDate, "2026-07-07");

  const ivan = overview.students[1];
  assert.equal(ivan.lessonCount, 1);
  assert.deepEqual(ivan.lessonIds, ["lesson-2"]);
  assert.deepEqual(ivan.courses, ["WAICY 集训"]);
});

test("student overview splits multi-student lesson names into separate ledger rows", () => {
  const overview = buildStudentOverview(
    [
      {
        id: "shared-lesson",
        teacherName: "Sophie",
        studentName: "Amy、Ben, Coco",
        course: "WAICY 集训",
        campus: "徐汇",
        date: "2026-07-08",
        startTime: "14:00",
        endTime: "17:00",
        status: "已编辑",
      },
    ],
    { today: "2026-07-01" },
  );

  assert.deepEqual(
    overview.students.map((student) => student.name),
    ["Amy", "Ben", "Coco"],
  );
  for (const student of overview.students) {
    assert.equal(student.lessonCount, 1);
    assert.deepEqual(student.lessonIds, ["shared-lesson"]);
    assert.deepEqual(student.courses, ["WAICY 集训"]);
  }
});

test("student overview includes imported student catalog entries without future lessons", () => {
  const overview = buildStudentOverview(lessons, {
    today: "2026-06-30",
    studentCatalog: [
      {
        name: "Eric",
        grade: "G2",
        school: "上实验国际部",
        frequency: "周一-周五",
        needs: "樱桃",
      },
      {
        name: "Ivan",
        grade: "Y6",
        school: "YCIS",
      },
    ],
  });

  assert.equal(overview.totalStudents, 3);
  assert.equal(overview.activeStudents, 2);

  const eric = overview.students.find((student) => student.name === "Eric");
  assert.equal(eric.lessonCount, 0);
  assert.equal(eric.grade, "G2");
  assert.equal(eric.school, "上实验国际部");

  const ivan = overview.students.find((student) => student.name === "Ivan");
  assert.equal(ivan.lessonCount, 1);
  assert.equal(ivan.grade, "Y6");
});
