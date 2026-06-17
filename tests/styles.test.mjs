import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const css = readFileSync(new URL("../styles.css", import.meta.url), "utf8");
const appSource = readFileSync(new URL("../src/app.js", import.meta.url), "utf8");

test("uses the same background for scheduled work cells and template work cells", () => {
  assert.equal(getRuleValue(".shift-cell.work", "background"), getRuleValue(".shift-cell.template", "background"));
});

test("calendar week overview uses readable lesson rows", () => {
  assert.equal(getRuleValue(".calendar-overview", "display"), "grid");
  assert.equal(getRuleValue(".lesson-row", "display"), "grid");
  assert.equal(getRuleValue(".lesson-row", "grid-template-columns"), "minmax(0, 1fr) auto");
});

test("calendar page only renders the week overview without single-day detail", () => {
  assert.equal(appSource.includes("day-detail"), false);
  assert.equal(appSource.includes("renderDayDetail"), false);
  assert.equal(css.includes("day-detail"), false);
  assert.equal(getRuleText(".calendar-day-card").includes("cursor: pointer"), false);
});

test("course permission view is available as a workspace tab", () => {
  assert.equal(appSource.includes('data-view-target="permissions"'), true);
  assert.equal(appSource.includes('id="permission-grid"'), true);
  assert.ok(css.includes(".permission-table"));
});

test("course and student overview views are available as workspace tabs", () => {
  assert.equal(appSource.includes('data-view-target="courses"'), true);
  assert.equal(appSource.includes('data-view-target="students"'), true);
  assert.equal(appSource.includes('id="course-overview"'), true);
  assert.equal(appSource.includes('id="student-overview"'), true);
  assert.equal(appSource.includes("renderCourseOverviewView"), true);
  assert.equal(appSource.includes("renderStudentOverviewView"), true);
  assert.equal(appSource.includes("renderCourseOverviewCard"), true);
  assert.equal(appSource.includes("data-course-delete"), true);
  assert.equal(appSource.includes("data-student-delete"), true);
  assert.ok(css.includes(".overview-section"));
  assert.ok(css.includes(".course-card-grid"));
  assert.ok(css.includes(".course-overview-card"));
  assert.ok(css.includes(".overview-delete-button"));
  assert.ok(css.includes(".student-summary-grid"));
});

test("calendar and permission views expose manual creation actions", () => {
  assert.equal(appSource.includes('id="add-calendar-lesson"'), true);
  assert.equal(appSource.includes("新增课程"), true);
  assert.equal(appSource.includes('id="permission-add-form"'), true);
  assert.equal(appSource.includes('name="newTeacherName"'), true);
  assert.equal(appSource.includes('name="newCourseName"'), true);
  assert.ok(css.includes(".add-lesson-button"));
  assert.ok(css.includes(".permission-add-form"));
});

test("course permission view uses only checkbox toggles without delete controls", () => {
  assert.equal(appSource.includes("removeTeacherFromPermissionGrid"), false);
  assert.equal(appSource.includes("removeCourseFromPermissionGrid"), false);
  assert.equal(appSource.includes("data-permission-remove-teacher"), false);
  assert.equal(appSource.includes("data-permission-remove-course"), false);
  assert.equal(css.includes(".permission-remove-button"), false);
  assert.equal(css.includes(".permission-name-cell"), false);
  assert.ok(css.includes(".permission-toggle"));
});

test("candidate teachers render as compact avatar groups with expandable detail", () => {
  assert.equal(appSource.includes("renderMatchGroups"), true);
  assert.equal(appSource.includes('class="match-groups"'), true);
  assert.equal(appSource.includes('class="teacher-avatar-button'), true);
  assert.equal(appSource.includes('class="match-detail-card'), true);
  assert.equal(appSource.includes("美乐蒂"), true);
  assert.equal(appSource.includes("库洛米"), true);
  assert.equal(appSource.includes("weeklyLoadHours"), false);
  assert.ok(css.includes(".teacher-avatar-button"));
  assert.ok(css.includes(".match-detail-card"));
});

test("candidate teacher avatars use local image files from the photo folder", () => {
  const avatarImagePaths = Array.from(appSource.matchAll(/image: "([^"]+)"/g), (match) => match[1]);

  assert.ok(avatarImagePaths.length >= 10);
  assert.equal(appSource.includes("renderTeacherAvatarImage"), true);
  assert.equal(appSource.includes("teacher-avatar-fallback"), true);
  assert.equal(appSource.includes("claire: {"), true);
  assert.ok(css.includes(".teacher-avatar img"));
  assert.ok(css.includes(".teacher-avatar-fallback"));

  for (const imagePath of avatarImagePaths) {
    assert.equal(existsSync(new URL(`../${imagePath}`, import.meta.url)), true, `${imagePath} should exist`);
  }
});

test("workspace uses planner-style decorative image assets", () => {
  assert.equal(appSource.includes('class="header-sticker-board"'), true);
  assert.equal(appSource.includes('class="panel-sticker panel-sticker-form"'), true);
  assert.equal(appSource.includes('class="panel-sticker panel-sticker-results"'), true);
  assert.equal(appSource.includes('class="panel-sticker panel-sticker-calendar"'), true);
  assert.ok(appSource.includes("background/1001417667159766837.jpeg"));
  assert.ok(appSource.includes("photo/˗ˏˋ꒰🍥꒱.jpeg"));
  assert.ok(appSource.includes("photo/@mikkoillustrations on ig_.jpeg"));
});

test("student planner title and sticker placement are simplified", () => {
  assert.equal(appSource.includes("新学员排课"), true);
  assert.equal(appSource.includes("新学员周期排课"), false);
  assert.equal(getRuleValue(".panel-sticker-form", "left"), "18px");
  assert.equal(getRuleValue(".panel-sticker-form", "bottom"), "18px");
  assert.equal(getRuleText(".panel-sticker-form").includes("top:"), false);
  assert.equal(getRuleText(".panel-sticker-form").includes("right:"), false);
});

test("shift editor shows the selected teacher avatar", () => {
  assert.equal(appSource.includes("renderShiftEditorAvatar"), true);
  assert.equal(appSource.includes('class="shift-editor-avatar"'), true);
  assert.ok(css.includes(".shift-editor-avatar"));
  assert.ok(getRuleText(".shift-editor-avatar .teacher-avatar").includes("width"));
});

test("shift editor auto-saves field changes and only shows the default restore action", () => {
  assert.equal(appSource.includes('data-shift-action="save"'), false);
  assert.equal(appSource.includes('shiftEditorNode.addEventListener("change"'), true);
  assert.equal(appSource.includes('class="primary-button" data-shift-action="clear"'), true);
});

test("selected states use the cream planner palette instead of deep green fills", () => {
  assert.ok(getRuleText(":root").includes("--selected-fill"));
  for (const selector of [
    ".tab-button.active",
    ".weekday-picker input:checked + span",
    ".detail-weekday-picker input:checked + span",
    ".primary-button",
    ".permission-toggle input:checked + span",
  ]) {
    assert.ok(getRuleText(selector).includes("var(--selected-fill"), `${selector} should use selected palette`);
    assert.equal(getRuleText(selector).includes("#2f7465"), false, `${selector} should not use deep green`);
  }
  assert.ok(getRuleText(".shift-cell.selected").includes("var(--selected-ring)"));
  assert.ok(getRuleText(".lesson-row.selected").includes("var(--selected-ring)"));
});

test("kawaii planner surface keeps dense modules readable", () => {
  assert.ok(getRuleText("body").includes("background-image"));
  assert.ok(getRuleText(".app-header").includes("border-radius"));
  assert.ok(getRuleText(`.panel,
.calendar-section`).includes("border-radius"));
  assert.ok(getRuleText(`.panel::before,
.calendar-section::before`).includes("radial-gradient"));
  assert.ok(getRuleText(".calendar-day-card").includes("border-radius"));
  assert.ok(getRuleText(".lesson-row").includes("border-radius"));
  assert.ok(getRuleText(`.shift-grid,
.permission-table-wrap`).includes("border-radius"));
});

test("candidate teacher detail cards hide avatar character names", () => {
  assert.equal(appSource.includes("${escapeHtml(avatar.character)} · ${escapeHtml(ratio)} 可排"), false);
  assert.equal(appSource.includes("${escapeHtml(ratio)} 可排"), true);
});

test("calendar lesson rows open a lesson detail panel", () => {
  assert.equal(appSource.includes("data-lesson-id"), true);
  assert.equal(appSource.includes("renderLessonDetail"), true);
  assert.ok(css.includes(".lesson-detail-panel"));
});

test("lesson detail panel has editable fields and color variants", () => {
  assert.equal(appSource.includes('id="lesson-detail-form"'), true);
  assert.equal(appSource.includes('data-lesson-action="save"'), true);
  assert.equal(appSource.includes('data-lesson-action="delete"'), true);
  assert.ok(css.includes(".lesson-detail-panel.blue"));
  assert.ok(css.includes(".lesson-detail-panel.gray"));
});

test("lesson detail close button uses a glass circular x control", () => {
  assert.equal(appSource.includes('class="lesson-detail-close"'), true);
  assert.equal(appSource.includes('aria-label="关闭课程详情"'), true);
  assert.equal(appSource.includes('aria-hidden="true">×</span>'), true);
  assert.equal(appSource.includes('data-lesson-detail-close type="button">关闭</button>'), false);
  assert.equal(getRuleValue(".lesson-detail-close", "width"), "44px");
  assert.equal(getRuleValue(".lesson-detail-close", "height"), "44px");
  assert.equal(getRuleValue(".lesson-detail-close", "border-radius"), "999px");
  assert.ok(getRuleValue(".lesson-detail-close", "backdrop-filter").includes("blur"));
});

test("lesson detail actions use a softer save button and glass icon delete button", () => {
  assert.equal(appSource.includes('class="lesson-save-button"'), true);
  assert.equal(appSource.includes('class="lesson-delete-button"'), true);
  assert.equal(appSource.includes('aria-label="删除课程"'), true);
  assert.equal(appSource.includes('>删除课程</button>'), false);
  assert.equal(appSource.includes("<svg"), true);

  assert.equal(getRuleValue(".lesson-save-button", "color"), "var(--accent)");
  assert.equal(getRuleText(".lesson-save-button").includes("background: var(--accent)"), false);
  assert.equal(getRuleValue(".lesson-delete-button", "width"), "44px");
  assert.equal(getRuleValue(".lesson-delete-button", "height"), "44px");
  assert.equal(getRuleValue(".lesson-delete-button", "border-radius"), "999px");
  assert.ok(getRuleValue(".lesson-delete-button", "backdrop-filter").includes("blur"));
  assert.ok(getRuleValue(".lesson-delete-button svg", "stroke").includes("currentColor"));
});

test("lesson detail omits source and location fields", () => {
  assert.equal(appSource.includes('renderDetailField("上课地点"'), false);
  assert.equal(appSource.includes('renderDetailField("数据来源"'), false);
  assert.equal(appSource.includes('renderDetailField("状态"'), false);
  assert.equal(appSource.includes('formData.get("location")'), false);
  assert.equal(appSource.includes('formData.get("source")'), false);
  assert.equal(appSource.includes('formData.get("status")'), false);
});

test("lesson detail controls use tinted course colors without filling field wrappers", () => {
  assert.ok(
    getRuleText(".lesson-detail-grid > label,\n.lesson-detail-grid > fieldset,\n.lesson-detail-wide").includes(
      "background: transparent",
    ),
  );
  assert.ok(
    getRuleText(".lesson-detail-form input,\n.lesson-detail-form select,\n.lesson-detail-form textarea").includes(
      "background: var(--lesson-field)",
    ),
  );
  assert.equal(css.includes("--lesson-field: rgba(255, 255, 255"), false);
  assert.ok(getRuleText(".lesson-detail-panel.cyan").includes("--lesson-field"));
});

test("lesson detail panel uses the selected teacher avatar as a glass background", () => {
  assert.equal(appSource.includes("getTeacherAvatar(detail.teacherId)"), true);
  assert.equal(appSource.includes("renderLessonAvatarStyle"), true);
  assert.equal(appSource.includes("--lesson-avatar-image"), true);
  assert.equal(appSource.includes("has-avatar-bg"), true);
  assert.ok(getRuleText(".lesson-detail-panel.has-avatar-bg::before").includes("background-image: var(--lesson-avatar-image)"));
  assert.ok(getRuleText(".lesson-detail-panel.has-avatar-bg::after").includes("backdrop-filter"));
});

test("lesson detail background avatar stays visibly decorative", () => {
  const backgroundRule = getRuleText(".lesson-detail-panel.has-avatar-bg::before");
  const veilRule = getRuleText(".lesson-detail-panel.has-avatar-bg::after");

  assert.equal(getRuleValue(".lesson-detail-panel.has-avatar-bg::before", "opacity"), "0.42");
  assert.equal(backgroundRule.includes("blur("), false);
  assert.ok(backgroundRule.includes("contrast"));
  assert.equal(getRuleValue(".lesson-detail-panel.has-avatar-bg::after", "background"), "rgba(255, 255, 255, 0.08)");
  assert.ok(getRuleValue(".lesson-detail-panel.has-avatar-bg::after", "backdrop-filter").includes("blur(3px)"));
  assert.ok(veilRule.includes("saturate"));
});

test("lesson detail weekday picker has a wider single-row layout", () => {
  assert.equal(getRuleValue(".lesson-weekday-field", "grid-column"), "span 2");
  assert.equal(getRuleValue(".detail-weekday-picker", "grid-template-columns"), "repeat(7, minmax(48px, 1fr))");
});

test("lesson detail weekday title sits inside the aligned field border", () => {
  assert.equal(getRuleValue(".lesson-weekday-field legend", "float"), "left");
  assert.equal(getRuleValue(".lesson-weekday-field legend", "width"), "100%");
  assert.equal(getRuleValue(".detail-weekday-picker", "clear"), "both");
});

test("planner uses teaching site instead of course location variants", () => {
  assert.equal(appSource.includes("授课校区"), true);
  assert.equal(appSource.includes("授课方式"), false);
  assert.equal(appSource.includes("teachingSites"), true);
  assert.equal(appSource.includes("WAICY 徐汇集训班"), false);
  assert.equal(appSource.includes("财商x樱桃 徐汇暑期课"), false);
});

test("recurring lesson fields use editable session count controls", () => {
  assert.equal(appSource.includes("持续周期"), false);
  assert.equal(appSource.includes("上课次数"), true);
  assert.equal(appSource.includes('name="sessionCount"'), true);
  assert.equal(appSource.includes('name="durationMinutes"'), true);
  assert.equal(appSource.includes('name="weekdays"'), true);
  assert.equal(appSource.includes("renderWeekdayCheckboxField"), true);
});

test("app exposes a Supabase sync sign-in panel for shared editing", () => {
  assert.equal(appSource.includes('id="sync-panel"'), true);
  assert.equal(appSource.includes('id="sync-form"'), true);
  assert.equal(appSource.includes('name="syncEmail"'), true);
});

test("app shows a clear synced edit confirmation after saving", () => {
  assert.equal(appSource.includes("数据已编辑成功，并同步到网站上"), true);
  assert.equal(appSource.includes("showSaveFeedback"), true);
  assert.equal(appSource.includes("正在同步编辑内容"), true);
});

function getRuleText(selector) {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const rule = new RegExp(`${escapedSelector}\\s*\\{([^}]+)\\}`, "m").exec(css);
  assert.ok(rule, `Missing CSS rule for ${selector}`);
  return rule[1];
}

function getRuleValue(selector, property) {
  const declaration = new RegExp(`${property}\\s*:\\s*([^;]+);`).exec(getRuleText(selector));
  assert.ok(declaration, `Missing ${property} in ${selector}`);
  return declaration[1].trim();
}
