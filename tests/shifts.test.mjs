import test from "node:test";
import assert from "node:assert/strict";

import {
  defaultShiftOverrides,
  shiftRoster,
} from "../src/data.js";
import {
  buildBulkShiftOverride,
  buildBulkShiftTargets,
  buildShiftLabel,
  buildAvailabilityOverrides,
  buildUnavailableLessonsFromShifts,
  getTeacherShiftForDate,
  makeShiftKey,
} from "../src/shifts.js";

const teachers = [
  {
    id: "lynn",
    name: "Lynn",
    weeklyAvailability: [{ weekday: 1, startTime: "14:00", endTime: "21:00" }],
  },
  {
    id: "reece",
    name: "Reece",
    weeklyAvailability: [],
  },
];

test("builds bulk shift targets across a date range and skips existing shift records by default", () => {
  const shifts = {
    [makeShiftKey("lynn", "2026-06-30")]: {
      type: "off",
      label: "休",
    },
  };

  assert.deepEqual(
    buildBulkShiftTargets(teachers, {
      teacherId: "__all",
      startDate: "2026-06-29",
      endDate: "2026-07-03",
      weekdays: [1, 2, 3, 4, 5],
      mode: "fill-empty",
    }, shifts),
    [
      { teacherId: "lynn", date: "2026-06-29", key: "lynn__2026-06-29" },
      { teacherId: "lynn", date: "2026-07-01", key: "lynn__2026-07-01" },
      { teacherId: "lynn", date: "2026-07-02", key: "lynn__2026-07-02" },
      { teacherId: "lynn", date: "2026-07-03", key: "lynn__2026-07-03" },
      { teacherId: "reece", date: "2026-06-29", key: "reece__2026-06-29" },
      { teacherId: "reece", date: "2026-06-30", key: "reece__2026-06-30" },
      { teacherId: "reece", date: "2026-07-01", key: "reece__2026-07-01" },
      { teacherId: "reece", date: "2026-07-02", key: "reece__2026-07-02" },
      { teacherId: "reece", date: "2026-07-03", key: "reece__2026-07-03" },
    ],
  );
});

test("builds compact bulk shift overrides for work and rest days", () => {
  assert.deepEqual(
    buildBulkShiftOverride({
      type: "work",
      campus: "徐汇",
      startTime: "10:00",
      endTime: "19:00",
      note: "暑期集中排班",
    }),
    {
      type: "work",
      label: "早10-7",
      campus: "徐汇",
      startTime: "10:00",
      endTime: "19:00",
      note: "暑期集中排班",
    },
  );

  assert.deepEqual(buildBulkShiftOverride({ type: "off", note: "" }), {
    type: "off",
    label: "休",
  });
});

test("derives editable cells from explicit shifts before weekly templates", () => {
  const shifts = {
    [makeShiftKey("lynn", "2026-06-29")]: {
      type: "work",
      startTime: "09:00",
      endTime: "18:00",
      campus: "八佰伴",
      note: "临时换班",
    },
  };

  assert.deepEqual(getTeacherShiftForDate(teachers[0], "2026-06-29", shifts), {
    source: "override",
    type: "work",
    label: "早9-6",
    startTime: "09:00",
    endTime: "18:00",
    campus: "八佰伴",
    note: "临时换班",
  });

  assert.deepEqual(getTeacherShiftForDate(teachers[0], "2026-07-06", shifts), {
    source: "weekly",
    type: "template",
    label: "下午2-9",
    startTime: "14:00",
    endTime: "21:00",
    campus: "八佰伴",
  });
});

test("normalizes legacy Pudong campus to Babaiban and accepts Biyun", () => {
  assert.deepEqual(
    buildBulkShiftOverride({
      type: "work",
      campus: "浦东",
      startTime: "09:00",
      endTime: "18:00",
    }),
    {
      type: "work",
      label: "早9-6",
      campus: "八佰伴",
      startTime: "09:00",
      endTime: "18:00",
    },
  );

  assert.equal(
    buildBulkShiftOverride({
      type: "work",
      campus: "碧云",
      startTime: "09:00",
      endTime: "18:00",
    }).campus,
    "碧云",
  );
});

test("converts work shifts into date-specific teacher availability", () => {
  const shifts = {
    [makeShiftKey("reece", "2026-06-29")]: {
      type: "work",
      startTime: "10:00",
      endTime: "19:00",
      campus: "徐汇",
    },
  };

  assert.deepEqual(buildAvailabilityOverrides(teachers, shifts), {
    reece: [
      {
        date: "2026-06-29",
        intervals: [{ startTime: "10:00", endTime: "19:00" }],
        label: "早10-7",
        campus: "徐汇",
      },
    ],
  });
});

test("builds default work labels from campus and time", () => {
  assert.equal(buildShiftLabel({ type: "work", startTime: "09:00", endTime: "18:00" }), "早9-6");
  assert.equal(buildShiftLabel({ type: "work", startTime: "10:00", endTime: "19:00" }), "早10-7");
  assert.equal(buildShiftLabel({ type: "work", startTime: "14:00", endTime: "20:00" }), "下午2-8");
  assert.equal(buildShiftLabel({ type: "work", startTime: "08:30", endTime: "12:30" }), "早8:30-12:30");
  assert.equal(buildShiftLabel({ type: "off" }), "休");
  assert.equal(buildShiftLabel({ type: "holiday" }), "法定");
});

test("converts rest and statutory holiday shifts into unavailable calendar lessons", () => {
  const shifts = {
    [makeShiftKey("lynn", "2026-06-29")]: {
      type: "off",
      label: "休",
    },
    [makeShiftKey("reece", "2026-06-29")]: {
      type: "holiday",
      label: "法定",
    },
  };

  assert.deepEqual(
    buildUnavailableLessonsFromShifts(teachers, shifts).map((lesson) => ({
      id: lesson.id,
      teacherId: lesson.teacherId,
      teacherName: lesson.teacherName,
      date: lesson.date,
      startTime: lesson.startTime,
      endTime: lesson.endTime,
      course: lesson.course,
      status: lesson.status,
    })),
    [
      {
        id: "shift-block-lynn-2026-06-29",
        teacherId: "lynn",
        teacherName: "Lynn",
        date: "2026-06-29",
        startTime: "08:00",
        endTime: "21:30",
        course: "休",
        status: "不可用",
      },
      {
        id: "shift-block-reece-2026-06-29",
        teacherId: "reece",
        teacherName: "Reece",
        date: "2026-06-29",
        startTime: "08:00",
        endTime: "21:30",
        course: "法定",
        status: "不可用",
      },
    ],
  );
});

test("syncs teacher roster and default shifts from the latest duty workbook", () => {
  assert.deepEqual(
    shiftRoster.map((person) => person.name),
    ["Claire", "Phebe", "Sophie", "Lynn", "Tiana", "Catherine"],
  );
  assert.equal(shiftRoster.some((person) => person.id === "claire"), true);
  assert.equal(shiftRoster.some((person) => person.id === "lency"), false);
  assert.equal(shiftRoster.some((person) => person.id === "vicky"), false);
  assert.equal(shiftRoster.some((person) => person.id === "reece"), false);
  assert.equal(shiftRoster.some((person) => person.id === "charlotte"), false);
  assert.equal(shiftRoster.some((person) => person.id === "gioia"), false);
  assert.equal(shiftRoster.some((person) => person.id === "karen"), false);
  assert.equal(shiftRoster.some((person) => person.id === "hanna"), false);
});

test("includes workbook imported roster shifts through July 2026", () => {
  const lynn = shiftRoster.find((person) => person.id === "lynn");
  const phebe = shiftRoster.find((person) => person.id === "phebe");
  const sophie = shiftRoster.find((person) => person.id === "sophie");

  assert.ok(lynn);
  assert.ok(phebe);
  assert.ok(sophie);

  assert.deepEqual(getTeacherShiftForDate(lynn, "2026-06-15", defaultShiftOverrides), {
    source: "override",
    type: "work",
    label: "晚1-9",
    startTime: "13:00",
    endTime: "21:00",
    campus: "八佰伴",
  });
  assert.deepEqual(getTeacherShiftForDate(phebe, "2026-06-20", defaultShiftOverrides), {
    source: "override",
    type: "holiday",
    label: "法定",
    startTime: "",
    endTime: "",
  });
  assert.deepEqual(getTeacherShiftForDate(phebe, "2026-06-29", defaultShiftOverrides), {
    source: "override",
    type: "work",
    label: "早10-7",
    startTime: "10:00",
    endTime: "19:00",
    campus: "徐汇",
  });
  assert.deepEqual(getTeacherShiftForDate(sophie, "2026-06-27", defaultShiftOverrides), {
    source: "override",
    type: "off",
    label: "休",
    startTime: "",
    endTime: "",
  });
});
