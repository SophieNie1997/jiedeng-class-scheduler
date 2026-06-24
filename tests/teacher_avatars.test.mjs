import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";

import {
  defaultTeacherAvatars,
  getTeacherAvatar,
  teacherAvatars,
} from "../src/teacherAvatars.js";

test("known teachers keep their assigned avatar images", () => {
  assert.equal(getTeacherAvatar("phebe").image, teacherAvatars.phebe.image);
  assert.equal(getTeacherAvatar("phebe").character, "库洛米");
});

test("custom teachers receive stable local avatar images", () => {
  const libby = getTeacherAvatar("libby");
  const libbyAgain = getTeacherAvatar("libby");
  const igTeacher = getTeacherAvatar("ig");

  assert.ok(defaultTeacherAvatars.length >= 6);
  assert.equal(libby.image, libbyAgain.image);
  assert.notEqual(libby.image, "");
  assert.notEqual(igTeacher.image, "");
  assert.equal(libby.mark, "L");
  assert.equal(igTeacher.mark, "I");
  assert.equal(existsSync(new URL(`../${libby.image}`, import.meta.url)), true);
  assert.equal(existsSync(new URL(`../${igTeacher.image}`, import.meta.url)), true);
});

test("custom teachers get a stable accent overlay when they reuse an image", () => {
  const lynn = getTeacherAvatar("lynn");
  const igTeacher = getTeacherAvatar("ig");
  const igTeacherAgain = getTeacherAvatar("ig");

  assert.equal(igTeacher.image, lynn.image);
  assert.match(igTeacher.accent, /^rgba\(\d+, \d+, \d+, 0\.\d+\)$/);
  assert.equal(igTeacher.accent, igTeacherAgain.accent);
  assert.notEqual(igTeacher.accent, lynn.accent || "");
});
