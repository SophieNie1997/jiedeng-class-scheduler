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
