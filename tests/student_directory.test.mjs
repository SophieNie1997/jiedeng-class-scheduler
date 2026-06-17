import test from "node:test";
import assert from "node:assert/strict";

import {
  buildStudentDirectoryRows,
  filterStudentDirectoryRows,
  hideStudentDirectoryRecord,
  makeStudentDirectoryId,
  normalizeStudentDirectory,
  setStudentDirectoryRecord,
} from "../src/studentDirectory.js";

const overviewStudents = [
  {
    name: "Ivan",
    lessonCount: 2,
    lessonIds: ["lesson-1", "lesson-2"],
    courses: ["WAICY 集训"],
    teachers: ["Sophie"],
    campuses: ["徐汇"],
    firstDate: "2026-06-29",
    lastDate: "2026-07-03",
    grade: "Y6",
    phone: "13800000000",
  },
  {
    name: "班课",
    lessonCount: 8,
    lessonIds: ["course-like-1"],
    courses: ["WAICY 比赛"],
    teachers: ["Phebe"],
    campuses: ["浦东"],
    firstDate: "2026-06-29",
    lastDate: "2026-07-24",
  },
  {
    name: "A1",
    lessonCount: 1,
    lessonIds: ["course-like-2"],
    courses: ["英语陪伴"],
    teachers: ["Claire"],
    campuses: ["徐汇"],
    firstDate: "2026-07-01",
    lastDate: "2026-07-01",
  },
  {
    name: "A1（Miles）",
    lessonCount: 1,
    lessonIds: ["course-like-3"],
    courses: ["英语陪伴"],
    teachers: ["Claire"],
    campuses: ["徐汇"],
    firstDate: "2026-07-02",
    lastDate: "2026-07-02",
  },
];

test("student directory filters course-like names from the ledger", () => {
  const rows = buildStudentDirectoryRows(overviewStudents, normalizeStudentDirectory({}));

  assert.deepEqual(
    rows.map((row) => row.name),
    ["Ivan"],
  );
});

test("student directory merges editable record fields without losing lesson ids", () => {
  const directory = setStudentDirectoryRecord(normalizeStudentDirectory({}), {
    id: makeStudentDirectoryId("Ivan"),
    name: "Ivan",
    phone: "13911112222",
    address: "浦东新区测试地址",
    needs: "先同步资料",
  });

  const rows = buildStudentDirectoryRows(overviewStudents, directory);
  const ivan = rows.find((row) => row.name === "Ivan");

  assert.equal(ivan.phone, "13911112222");
  assert.equal(ivan.address, "浦东新区测试地址");
  assert.equal(ivan.needs, "先同步资料");
  assert.deepEqual(ivan.lessonIds, ["lesson-1", "lesson-2"]);
});

test("student directory includes manually added students with no course linkage", () => {
  const directory = setStudentDirectoryRecord(normalizeStudentDirectory({}), {
    id: makeStudentDirectoryId("新同学"),
    name: "新同学",
    grade: "Y3",
    phone: "13600000000",
    address: "徐汇区测试地址",
  });

  const rows = buildStudentDirectoryRows(overviewStudents, directory);
  const manualStudent = rows.find((row) => row.name === "新同学");

  assert.equal(manualStudent.grade, "Y3");
  assert.equal(manualStudent.phone, "13600000000");
  assert.equal(manualStudent.address, "徐汇区测试地址");
  assert.equal(manualStudent.lessonCount, 0);
  assert.deepEqual(manualStudent.lessonIds, []);
});

test("student directory keeps hidden students out of the planner draft row", () => {
  const hiddenDirectory = hideStudentDirectoryRecord(normalizeStudentDirectory({}), "Ivan");
  const rows = buildStudentDirectoryRows(overviewStudents, hiddenDirectory, {
    draftStudent: {
      studentName: "Ivan",
      grade: "Y6",
      course: "WAICY 集训",
    },
  });

  assert.equal(rows.some((row) => row.name === "Ivan"), false);
});

test("student directory search matches names, contact details, and course fields", () => {
  const directory = setStudentDirectoryRecord(normalizeStudentDirectory({}), {
    id: makeStudentDirectoryId("Ivan"),
    name: "Ivan",
    phone: "13911112222",
    address: "浦东新区测试地址",
    needs: "需要周中下午",
  });
  const rows = buildStudentDirectoryRows(overviewStudents, directory);

  assert.deepEqual(
    filterStudentDirectoryRows(rows, "Ivan").map((row) => row.name),
    ["Ivan"],
  );
  assert.deepEqual(
    filterStudentDirectoryRows(rows, "1391111").map((row) => row.name),
    ["Ivan"],
  );
  assert.deepEqual(
    filterStudentDirectoryRows(rows, "WAICY").map((row) => row.name),
    ["Ivan"],
  );
  assert.deepEqual(filterStudentDirectoryRows(rows, "不存在的小纸条"), []);
});
