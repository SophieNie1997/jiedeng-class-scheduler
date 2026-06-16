import test from "node:test";
import assert from "node:assert/strict";

import {
  deriveDeliveryTypeFromCampus,
  normalizeCourseList,
  normalizeLessonCatalogFields,
  teachingSites,
} from "../src/courseCatalog.js";

test("course catalog collapses location-specific course variants", () => {
  assert.deepEqual(
    normalizeCourseList([
      "WAICY 集训",
      "WAICY 徐汇集训班",
      "AI 财商",
      "财商x樱桃 徐汇暑期课",
      "财商x樱桃 浦东暑期课",
      "英语陪伴",
    ]),
    ["WAICY 集训", "AI 财商", "英语陪伴"],
  );
});

test("summer course variants keep course body and move location into campus", () => {
  assert.deepEqual(
    normalizeLessonCatalogFields({
      course: "财商x樱桃 徐汇暑期课",
      deliveryType: "线下",
      campus: "",
      notes: "需要名单 8天",
    }),
    {
      course: "AI 财商",
      deliveryType: "线下",
      campus: "徐汇",
      notes: "需要名单 8天；樱桃图书馆英语课后",
    },
  );

  assert.deepEqual(
    normalizeLessonCatalogFields({
      course: "WAICY 徐汇集训班",
      deliveryType: "线下",
      campus: "",
      notes: "正常上课",
    }),
    {
      course: "WAICY 集训",
      deliveryType: "线下",
      campus: "徐汇",
      notes: "正常上课",
    },
  );
});

test("teaching site options derive legacy delivery type for matching", () => {
  assert.deepEqual(teachingSites, ["浦东", "徐汇", "上门", "线上"]);
  assert.equal(deriveDeliveryTypeFromCampus("浦东"), "线下");
  assert.equal(deriveDeliveryTypeFromCampus("徐汇"), "线下");
  assert.equal(deriveDeliveryTypeFromCampus("上门"), "上门");
  assert.equal(deriveDeliveryTypeFromCampus("线上"), "线上");
});
