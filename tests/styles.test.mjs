import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";

const css = readFileSync(new URL("../styles.css", import.meta.url), "utf8");
const appSource = readFileSync(new URL("../src/app.js", import.meta.url), "utf8");
const indexSource = readFileSync(new URL("../index.html", import.meta.url), "utf8");

test("shift work cells use campus background colors instead of campus text labels", () => {
  assert.equal(
    getRuleValue(".shift-cell.work.shift-campus-babaiban,\n.shift-cell.template.shift-campus-babaiban", "background"),
    "#f0f8f4",
  );
  assert.equal(
    getRuleValue(".shift-cell.work.shift-campus-xuhui,\n.shift-cell.template.shift-campus-xuhui", "background"),
    "#ffeaf3",
  );
  assert.equal(
    getRuleValue(".shift-cell.work.shift-campus-biyun,\n.shift-cell.template.shift-campus-biyun", "background"),
    "#eef7ff",
  );
});

test("shift rest cells use a soft planner tint instead of hard gray", () => {
  assert.equal(getRuleValue(".shift-cell.off", "background"), "#f2edf1");
  assert.equal(getRuleValue(".shift-cell.off", "color"), "#7a6870");
  assert.notEqual(getRuleValue(".shift-cell.off", "background"), "#a9a9a9");
});

test("site uses a real png favicon", () => {
  assert.equal(indexSource.includes('href="data:,"'), false);
  assert.match(indexSource, /<link rel="icon" type="image\/png" href="\.\/favicon-kuromi\.png\?v=20260617-kuromi" \/>/);
  assert.equal(existsSync(new URL("../favicon-kuromi.png", import.meta.url)), true);
  const faviconHash = createHash("sha256")
    .update(readFileSync(new URL("../favicon-kuromi.png", import.meta.url)))
    .digest("hex");
  assert.equal(faviconHash, "16643287fb441eeb754543b6dc51a6664a6536f08a90070ccf8f5a2c94c4adf5");
});

test("calendar week overview uses readable lesson rows", () => {
  assert.equal(getRuleValue(".calendar-overview", "display"), "grid");
  assert.equal(getRuleValue(".lesson-row", "display"), "grid");
  assert.equal(getRuleValue(".lesson-row", "grid-template-columns"), "minmax(0, 1fr) auto");
});

test("calendar lesson color chips use the soft planner palette", () => {
  assert.equal(getRuleValue(".lesson-row.blue", "border-left-color"), "#6f9fcf");
  assert.equal(getRuleValue(".lesson-row.blue", "background"), "#edf6ff");
  assert.equal(getRuleValue(".lesson-row.violet", "border-left-color"), "#a28cc7");
  assert.equal(getRuleValue(".lesson-row.orange", "background"), "#fff1e7");
  assert.equal(getRuleValue(".lesson-detail-panel.blue", "--lesson-accent"), "#6f9fcf");
  for (const oldColor of ["#2563eb", "#d66a24", "#7058d8", "#0f766e", "#0884a8"]) {
    assert.equal(css.includes(oldColor), false, `${oldColor} should not remain in lesson color tokens`);
  }
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
  assert.equal(appSource.includes("renderCourseOverviewRow"), true);
  assert.equal(appSource.includes("renderCourseDetailCard"), true);
  assert.equal(appSource.includes("data-course-select"), true);
  assert.equal(appSource.includes("data-course-edit"), true);
  assert.equal(appSource.includes("openCourseInLessonEditor"), true);
  assert.equal(appSource.includes("data-course-delete"), true);
  assert.equal(appSource.includes("data-student-delete"), true);
  assert.ok(css.includes(".overview-section"));
  assert.ok(css.includes(".course-summary-strip"));
  assert.ok(css.includes(".course-overview-board"));
  assert.ok(css.includes(".course-quick-list"));
  assert.ok(css.includes(".course-quick-row"));
  assert.ok(css.includes(".course-detail-card"));
  assert.ok(css.includes(".course-detail-sticker"));
  assert.ok(css.includes(".overview-delete-button"));
  assert.equal(css.includes(".course-card-grid"), false);
  assert.equal(css.includes(".course-overview-card"), false);
  assert.equal(appSource.includes("renderStudentTableRow"), true);
  assert.equal(appSource.includes('id="student-add-form"'), true);
  assert.equal(appSource.includes("renderStudentSearchBox"), true);
  assert.equal(appSource.includes("data-student-search"), true);
  assert.equal(appSource.includes("filterStudentDirectoryRows"), true);
  assert.equal(appSource.includes('contenteditable="true"'), true);
  assert.equal(appSource.includes("data-student-edit-field"), true);
  assert.equal(appSource.includes("deleteStudentOverviewCard"), true);
  assert.equal(appSource.includes('class="student-table-planner"'), true);
  assert.equal(appSource.includes('class="student-table-sticker'), true);
  assert.ok(css.includes(".student-table-planner"));
  assert.ok(css.includes(".student-add-form"));
  assert.ok(css.includes(".student-search-box"));
  assert.ok(css.includes(".student-ledger-table"));
  assert.ok(css.includes(".student-table-sticker"));
});

test("course overview uses stickers instead of covered student metrics", () => {
  assert.equal(appSource.includes("覆盖学员"), false);
  assert.equal(appSource.includes("renderCourseSummaryStickers"), true);
  assert.ok(css.includes(".course-summary-stickers"));
  assert.ok(css.includes(".course-summary-sticker"));
});

test("student ledger uses opaque sticky name cells", () => {
  assert.equal(getRuleValue(".student-ledger-table tbody th", "background"), "#fff7fa");
  assert.equal(getRuleValue(".student-ledger-table tbody tr:nth-child(even) th", "background-color"), "#fffafd");
  assert.equal(getRuleValue(".student-ledger-table tbody tr:hover th", "background-color"), "#edf8f3");
  assert.equal(getRuleValue(".student-ledger-table thead th:first-child", "left"), "0");
  assert.equal(getRuleValue(".student-ledger-table thead th:first-child", "z-index"), "4");
});

test("student directory controls stay inside the panel and table scrolls internally", () => {
  assert.equal(getRuleValue(".overview-content", "grid-template-columns"), "minmax(0, 1fr)");
  assert.ok(
    getRuleText(".student-add-form,\n.student-search-box,\n.student-table-planner").includes("min-width: 0"),
  );
  assert.ok(
    getRuleText(".student-add-form,\n.student-search-box,\n.student-table-planner").includes("max-width: 100%"),
  );
  assert.equal(getRuleValue(".student-table-planner", "overflow"), "hidden");
  assert.equal(getRuleValue(".student-ledger-wrap", "overflow"), "auto");
  assert.equal(getRuleValue(".student-ledger-wrap", "max-width"), "100%");
  assert.equal(getRuleValue(".student-ledger-table", "min-width"), "1480px");
});

test("student delete uses a second-step in-app confirmation dialog", () => {
  assert.equal(appSource.includes('id="student-delete-dialog"'), true);
  assert.equal(appSource.includes("openStudentDeleteConfirm"), true);
  assert.equal(appSource.includes("openCourseDeleteConfirm"), true);
  assert.equal(appSource.includes("openLessonScopeConfirm"), true);
  assert.equal(appSource.includes("deleteStudentOverviewCard(deleteButton.dataset.studentDelete)"), false);
  assert.equal(appSource.includes("deleteCourseOverviewCard(deleteButton.dataset.courseDelete)"), false);
  assert.equal(appSource.includes("deleteSelectedLessonFromDetail()"), false);
  assert.equal(appSource.includes("window.confirm"), false);
  assert.equal(appSource.includes("data-student-delete-confirm"), true);
  assert.equal(appSource.includes("data-confirm-action"), true);
  assert.equal(appSource.includes("确认删除"), true);
  assert.equal(appSource.includes("仅此节"), true);
  assert.equal(appSource.includes("此节及后续"), true);
  assert.equal(appSource.includes("请确认不是手滑"), true);
  assert.ok(css.includes(".student-delete-backdrop"));
  assert.ok(css.includes(".student-delete-modal"));
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

test("shift editor auto-saves field changes and offers compact restore plus bulk actions", () => {
  assert.equal(appSource.includes('data-shift-action="save"'), false);
  assert.equal(appSource.includes('shiftEditorNode.addEventListener("change"'), true);
  assert.equal(appSource.includes('class="primary-button" data-shift-action="clear"'), true);
  assert.equal(appSource.includes('data-shift-action="bulk"'), true);
  assert.equal(appSource.includes("批量修改"), true);
  assert.equal(appSource.includes("toggleShiftBulkForm"), true);
  assert.ok(css.includes(".shift-bulk-toggle"));
});

test("shift sidebar shows the editable shift card above the course detail sticker", () => {
  const sideStackStart = appSource.indexOf('<div class="shift-side-stack">');
  const editorIndex = appSource.indexOf('id="shift-editor"', sideStackStart);
  const bulkFormIndex = appSource.indexOf('id="shift-bulk-form"', sideStackStart);
  const courseDetailIndex = appSource.indexOf('id="shift-course-detail"', sideStackStart);

  assert.ok(sideStackStart >= 0);
  assert.ok(editorIndex > sideStackStart);
  assert.ok(bulkFormIndex > editorIndex);
  assert.ok(courseDetailIndex > bulkFormIndex);
});

test("shift cells show clickable same-day course times and names without student or campus clutter", () => {
  const cellRenderer = /function renderShiftCell[\s\S]*?function renderShiftCourseDetail/.exec(appSource)?.[0] || "";
  const chipRenderer = /function renderShiftLessonChip[\s\S]*?function getShiftCampusClass/.exec(appSource)?.[0] || "";

  assert.equal(appSource.includes("buildTeacherDayLessonIndex"), true);
  assert.equal(appSource.includes("renderShiftLessonList"), true);
  assert.equal(cellRenderer.includes("getShiftCampusClass(shift.campus)"), true);
  assert.equal(cellRenderer.includes("formatShiftCellLabel(shift)"), true);
  assert.equal(appSource.includes("function formatShiftCellLabel"), true);
  assert.equal(appSource.includes('replace(/八佰伴|徐汇|浦东|碧云/g, "")'), true);
  assert.equal(appSource.includes("isCompactShiftTimeLabel(label)"), true);
  assert.equal(appSource.includes("compactShiftTimeToClock"), true);
  assert.equal(cellRenderer.includes("renderShiftCampusMeta"), false);
  assert.equal(appSource.includes("function renderShiftCampusMeta"), false);
  assert.equal(appSource.includes("function renderShiftCellMeta"), false);
  assert.equal(appSource.includes("resolveShiftLessonCampus"), false);
  assert.equal(appSource.includes('id="shift-course-detail"'), true);
  assert.equal(appSource.includes("renderShiftCourseDetail"), true);
  assert.equal(appSource.includes("openShiftCourseDetail"), true);
  assert.equal(appSource.includes("shiftCourseDetailNode.addEventListener"), true);
  assert.equal(appSource.includes('shiftGridNode.addEventListener("keydown"'), true);
  assert.equal(appSource.includes("selectShiftCell"), true);
  assert.equal(appSource.includes("renderCourseDetailCard(selectedCard)"), true);
  assert.equal(appSource.includes('class="shift-lesson-list"'), true);
  assert.equal(chipRenderer.includes("<button"), true);
  assert.equal(chipRenderer.includes('type="button"'), true);
  assert.equal(chipRenderer.includes("data-shift-lesson-select"), true);
  assert.equal(chipRenderer.includes('class="shift-lesson-time"'), true);
  assert.equal(chipRenderer.includes('class="shift-lesson-campus"'), false);
  assert.equal(chipRenderer.includes("getShiftCampusClass("), false);
  assert.equal(chipRenderer.includes("lesson.studentName"), false);
  assert.equal(chipRenderer.includes("lesson.timeLabel"), true);
  assert.equal(chipRenderer.includes("escapeHtml(courseName)"), true);
  assert.equal(appSource.includes("shift-campus-xuhui"), true);
  assert.equal(appSource.includes("shift-campus-babaiban"), true);
  assert.equal(appSource.includes("shift-campus-biyun"), true);
  assert.ok(css.includes(".shift-lesson-list"));
  assert.ok(css.includes(".shift-lesson-chip"));
  assert.equal(css.includes(".shift-campus-label"), false);
  assert.ok(css.includes(".shift-side-stack"));
  assert.ok(css.includes(".shift-lesson-chip.selected"));
});

test("shift view offers a compact bulk scheduling sticker with in-app confirmation", () => {
  assert.equal(appSource.includes('id="shift-bulk-form" class="shift-bulk-form hidden"'), true);
  assert.equal(appSource.includes("showShiftBulkForm: false"), true);
  assert.equal(appSource.includes("if (!state.showShiftBulkForm)"), true);
  assert.equal(appSource.includes('shiftBulkFormNode.classList.add("hidden")'), true);
  assert.equal(appSource.includes('shiftBulkFormNode.classList.remove("hidden")'), true);
  assert.equal(appSource.includes("renderShiftBulkForm"), true);
  assert.equal(appSource.includes("data-bulk-shift-field"), true);
  assert.equal(appSource.includes("data-bulk-shift-weekday"), true);
  assert.equal(appSource.includes("openBulkShiftConfirm"), true);
  assert.equal(appSource.includes("applyBulkShift"), true);
  assert.equal(appSource.includes('action: "bulk-shift"'), true);
  assert.equal(appSource.includes("data-confirm-action"), true);
  assert.equal(appSource.includes("只填空白格子"), true);
  assert.equal(appSource.includes("覆盖已有排班"), true);
  assert.ok(css.includes(".shift-bulk-form"));
  assert.ok(css.includes(".shift-bulk-weekdays"));
  assert.ok(css.includes(".shift-bulk-preview"));
  assert.ok(css.includes(".shift-bulk-actions"));
});

test("shift view supports week and month modes", () => {
  assert.equal(appSource.includes('shiftViewMode: "week"'), true);
  assert.equal(appSource.includes('data-shift-view-mode="month"'), true);
  assert.equal(appSource.includes("getShiftViewDates"), true);
  assert.equal(appSource.includes("getMonthDates"), true);
  assert.equal(appSource.includes("shift-lesson-count"), true);
  assert.ok(css.includes(".shift-view-toggle"));
  assert.ok(css.includes(".shift-grid.month"));
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
  assert.equal(appSource.includes('name="startDate"'), true);
  assert.equal(appSource.includes("总上课次数"), true);
  assert.equal(appSource.includes("结束日期"), true);
  assert.equal(appSource.includes("data-lesson-end-date-preview"), true);
  assert.equal(appSource.includes("updateLessonEndDatePreview"), true);
  assert.equal(appSource.includes('data-course-title-edit'), true);
  assert.equal(appSource.includes("renderStudentNameField"), true);
  assert.equal(appSource.includes("data-lesson-student-add"), true);
  assert.equal(appSource.includes("appendLessonStudentName"), true);
  assert.equal(appSource.includes('class="lesson-title-edit-button"'), true);
  assert.equal(appSource.includes('formData.get("startDate")'), true);
  assert.ok(css.includes(".lesson-detail-panel.blue"));
  assert.ok(css.includes(".lesson-detail-panel.gray"));
  assert.ok(css.includes(".lesson-title-editor"));
  assert.ok(css.includes(".lesson-title-edit-button"));
  assert.ok(css.includes(".lesson-student-field"));
  assert.ok(css.includes(".lesson-student-add"));
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
    getRuleText(
      ".lesson-detail-grid > label,\n.lesson-detail-grid > .lesson-student-field,\n.lesson-detail-grid > fieldset,\n.lesson-detail-wide",
    ).includes("background: transparent"),
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
  assert.equal(appSource.includes("八佰伴"), true);
  assert.equal(appSource.includes("碧云"), true);
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

test("lesson detail save and delete return to the planner calendar", () => {
  assert.equal(appSource.includes("closeLessonDetailToPlanner"), true);
  assert.equal(appSource.includes('state.view = "planner"'), true);
  assert.match(
    appSource,
    /function saveSelectedLessonFromDetail[\s\S]*saveLessonEdits\(state\.lessonEdits\);[\s\S]*closeLessonDetailToPlanner\(\);[\s\S]*render\(\);/,
  );
  assert.match(
    appSource,
    /function deleteSelectedLessonFromDetail[\s\S]*closeLessonDetailToPlanner\(\);[\s\S]*saveLessonEdits\(state\.lessonEdits\);[\s\S]*render\(\);/,
  );
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
