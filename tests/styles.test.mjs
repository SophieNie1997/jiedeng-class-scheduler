import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";

import { lessonColorPalette } from "../src/lessonColors.js";

const css = readFileSync(new URL("../styles.css", import.meta.url), "utf8");
const appSource = readFileSync(new URL("../src/app.js", import.meta.url), "utf8");
const remoteStoreSource = readFileSync(new URL("../src/remoteStore.js", import.meta.url), "utf8");
const indexSource = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const supabaseSql = readFileSync(new URL("../docs/deployment/supabase.sql", import.meta.url), "utf8");
const supabaseConfigSource = readFileSync(new URL("../src/supabaseConfig.js", import.meta.url), "utf8");

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
  assert.equal(getRuleValue(".lesson-row.blue", "border-left-color"), "#4f88d7");
  assert.equal(getRuleValue(".lesson-row.blue", "background"), "#e4efff");
  assert.equal(getRuleValue(".lesson-row.teal", "border-left-color"), "#2faaa2");
  assert.equal(getRuleValue(".lesson-row.teal", "background"), "#dcf7f3");
  assert.equal(getRuleValue(".lesson-row.orange", "border-left-color"), "#e18449");
  assert.equal(getRuleValue(".lesson-row.orange", "background"), "#fff0df");
  assert.equal(getRuleValue(".lesson-row.butter", "border-left-color"), "#c8b247");
  assert.equal(getRuleValue(".lesson-row.butter", "background"), "#fff9cc");
  assert.equal(getRuleValue(".lesson-row.periwinkle", "border-left-color"), "#6f7fd4");
  assert.equal(getRuleValue(".lesson-row.periwinkle", "background"), "#eceeff");
  assert.equal(getRuleValue(".lesson-row.violet", "border-left-color"), "#a28cc7");
  assert.equal(getRuleValue(".lesson-row.peach", "border-left-color"), "#df8f70");
  assert.equal(getRuleValue(".lesson-row.peach", "background"), "#fff0e8");
  assert.equal(getRuleValue(".lesson-row.lilac", "border-left-color"), "#b487d8");
  assert.equal(getRuleValue(".lesson-row.lilac", "background"), "#f4edff");
  assert.equal(css.includes(".lesson-row.pattern-"), false);
  assert.equal(appSource.includes("lessonPatternPalette"), false);
  for (const color of lessonColorPalette) {
    assert.ok(css.includes(`.lesson-row.${color}`), `${color} row style should exist`);
    assert.ok(css.includes(`.lesson-detail-panel.${color}`), `${color} detail style should exist`);
  }
  assert.equal(getRuleValue(".lesson-detail-panel.blue", "--lesson-accent"), "#4f88d7");
  assert.equal(getRuleValue(".lesson-detail-panel.teal", "--lesson-accent"), "#2faaa2");
  assert.equal(getRuleValue(".lesson-detail-panel.orange", "--lesson-accent"), "#e18449");
  assert.equal(getRuleValue(".lesson-detail-panel.butter", "--lesson-accent"), "#c8b247");
  assert.equal(getRuleValue(".lesson-detail-panel.periwinkle", "--lesson-accent"), "#6f7fd4");
  assert.equal(getRuleValue(".lesson-detail-panel.peach", "--lesson-accent"), "#df8f70");
  assert.equal(getRuleValue(".lesson-detail-panel.lilac", "--lesson-accent"), "#b487d8");
  assert.equal(appSource.includes('from "./lessonColors.js?v=20260623-month-cards"'), true);
  assert.equal(appSource.includes("getLessonColor,"), true);
  assert.equal(appSource.includes("getLessonColorKey,"), true);
  assert.match(
    appSource,
    /function renderLessonRow[\s\S]*const color = getLessonColor\(lesson\)/,
  );
  assert.match(
    appSource,
    /function renderLessonDetail[\s\S]*const color = getLessonColor\(detail\)/,
  );
  assert.equal(appSource.includes("teacherColors[lesson.teacherId]"), false);
  for (const oldColor of ["#2563eb", "#d66a24", "#7058d8", "#0f766e", "#0884a8"]) {
    assert.equal(css.includes(oldColor), false, `${oldColor} should not remain in lesson color tokens`);
  }
});

test("lesson colors are keyed by teacher and course", () => {
  const lessonColorSource = readFileSync(new URL("../src/lessonColors.js", import.meta.url), "utf8");
  const colorKeyFunction = /function getLessonColorKey\(lesson\) \{([\s\S]*?)\n\}/.exec(lessonColorSource)?.[1] || "";
  assert.match(lessonColorSource, /export const teacherColorFamilies/);
  assert.match(colorKeyFunction, /getLessonTeacherKey\(lesson\)/);
  assert.match(colorKeyFunction, /getLessonCourseKey\(lesson\)/);
});

test("calendar assets use cache-busted style and app URLs for teacher hours", () => {
  assert.equal(indexSource.includes("./styles.css?v=20260624-public-guest-sync"), true);
  assert.equal(indexSource.includes("./src/app.js?v=20260624-public-guest-sync"), true);
});

test("calendar defaults to a month overview and drills into a week from lessons", () => {
  assert.equal(appSource.includes('calendarViewMode: "month"'), true);
  assert.equal(appSource.includes("calendarMonthAnchor: getTodayIsoDate()"), true);
  assert.equal(appSource.includes('data-calendar-view-mode="month"'), true);
  assert.equal(appSource.includes('data-calendar-view-mode="week"'), true);
  assert.equal(appSource.includes("calendarViewModeButtons"), true);
  assert.equal(appSource.includes("renderCalendarMonthGrid"), true);
  assert.equal(appSource.includes("renderCalendarMonthWeek"), true);
  assert.equal(appSource.includes("renderCalendarMonthDaypartRow"), true);
  assert.equal(appSource.includes("renderCalendarMonthDistributionCell"), false);
  assert.equal(appSource.includes("renderCalendarMonthCourseStrip"), false);
  assert.equal(appSource.includes("renderCalendarWeekMatrix"), true);
  assert.equal(appSource.includes("renderCalendarWeekDaypartRow"), true);
  assert.equal(appSource.includes("renderCalendarMonthLessonChip"), true);
  assert.match(
    appSource,
    /const monthSummaryButton = event\.target\.closest\("\[data-calendar-week-date\]"\)[\s\S]*const anchorDate = monthSummaryButton\.dataset\.calendarWeekDate \|\| state\.weekStart[\s\S]*state\.calendarWeekAnchor = anchorDate[\s\S]*state\.weekStart = getWeekStartForDate\(anchorDate\)/,
  );
  assert.ok(css.includes(".calendar-view-toggle"));
  assert.ok(css.includes(".calendar-month-overview-grid"));
  assert.ok(css.includes(".calendar-month-week-card"));
  assert.ok(css.includes(".calendar-month-week-grid"));
  assert.ok(css.includes(".lesson-row.calendar-month-lesson"));
});

test("calendar exposes a teacher duration summary entry and panel", () => {
  assert.equal(appSource.includes("buildTeacherWeeklyDurationTable"), true);
  assert.equal(appSource.includes("./calendar.js?v=20260623-absence-detail-status"), true);
  assert.equal(appSource.includes("includeUnlistedTeachers: false"), true);
  assert.equal(appSource.includes('id="toggle-teacher-hours"'), true);
  assert.equal(appSource.includes('id="teacher-hours-panel"'), true);
  assert.equal(appSource.includes("课时统计"), true);
  assert.equal(appSource.includes("renderTeacherHoursPanel"), true);
  assert.equal(appSource.includes("renderTeacherHoursCell"), true);
  assert.equal(appSource.includes("teacher-hours-teacher-card"), true);
  assert.equal(appSource.includes("teacher-hours-sticker"), true);
  assert.equal(appSource.includes("renderTeacherAvatarImage(getTeacherAvatar(item.teacherId))"), true);
  assert.equal(appSource.includes("calendar-teacher-hours-panel"), true);
  assert.equal(appSource.includes("calendar-teacher-hours-table"), true);
  assert.equal(appSource.includes("teacher-hours-week-label"), true);
  assert.equal(appSource.includes("teacher-hours-month-total"), true);
  assert.equal(appSource.includes("teacher-hours-range"), true);
  assert.equal(appSource.includes('class="calendar-primary-actions"'), true);
  assert.equal(appSource.includes('class="calendar-utility-bar"'), true);
  assert.equal(appSource.includes('class="calendar-date-control"'), true);
  assert.ok(css.includes(".teacher-hours-button"));
  assert.ok(css.includes(".calendar-primary-actions"));
  assert.ok(css.includes(".calendar-utility-bar"));
  assert.ok(css.includes(".calendar-date-control"));
  assert.ok(css.includes(".calendar-teacher-hours-panel"));
  assert.ok(css.includes(".calendar-teacher-hours-scroll"));
  assert.ok(css.includes(".calendar-teacher-hours-table"));
  assert.ok(css.includes(".calendar-teacher-hours-cell"));
  assert.ok(css.includes(".teacher-hours-teacher-card"));
  assert.ok(css.includes(".teacher-hours-sticker"));
  assert.equal(getRuleValue(".calendar-actions", "display"), "grid");
  assert.equal(getRuleValue(".calendar-actions", "width"), "min(100%, 456px)");
  assert.equal(getRuleValue(".calendar-actions", "min-width"), "0");
  assert.equal(getRuleValue(".calendar-actions", "max-width"), "100%");
  assert.equal(getRuleValue(".calendar-primary-actions", "display"), "flex");
  assert.equal(getRuleValue(".calendar-utility-bar", "display"), "flex");
  assert.equal(getRuleValue(".calendar-utility-bar", "justify-content"), "end");
  assert.equal(getRuleValue(".calendar-utility-bar", "width"), "min(100%, 456px)");
  assert.equal(getRuleValue(".calendar-utility-bar", "max-width"), "100%");
  assert.equal(getRuleValue(".calendar-date-control", "display"), "grid");
  assert.equal(getRuleValue(".calendar-date-control", "grid-template-columns"), "auto minmax(132px, 1fr)");
  assert.equal(getRuleValue(".calendar-date-control", "min-width"), "220px");
  assert.equal(getRuleValue(".calendar-date-control input", "width"), "100%");
  assert.equal(getRuleValue(".teacher-hours-button", "height"), "34px");
  assert.equal(getRuleValue(".calendar-teacher-hours-panel", "display"), "grid");
  assert.equal(getRuleValue(".calendar-teacher-hours-scroll", "overflow-x"), "auto");
  assert.equal(getRuleValue(".calendar-teacher-hours-table", "width"), "100%");
  assert.equal(getRuleValue(".teacher-hours-sticker .teacher-avatar", "width"), "38px");
});

test("calendar month locator uses a month picker instead of a full date field", () => {
  assert.equal(appSource.includes("function getCalendarDateControlValue"), true);
  assert.equal(appSource.includes("function getCalendarDateFromControlValue"), true);
  assert.equal(appSource.includes("function formatMonthInputValue"), true);
  assert.equal(appSource.includes('weekStartInput.type = isMonthView ? "month" : "date"'), true);
  assert.equal(appSource.includes("return `${normalized}-01`;"), true);
  assert.equal(appSource.includes('weekStartInput.setAttribute("aria-label", isMonthView ? "选择月份" : "选择周定位日期")'), true);
  assert.match(
    appSource,
    /function renderCalendar\(\)[\s\S]*syncCalendarDateControl\(\);[\s\S]*calendarViewModeButtons/,
  );
  assert.match(
    appSource,
    /weekStartInput\.addEventListener\("input"[\s\S]*getCalendarDateFromControlValue\(weekStartInput\.value\)[\s\S]*state\.calendarMonthAnchor = inputDate/,
  );
});

test("calendar week locator keeps the selected date while rendering its natural week", () => {
  assert.equal(appSource.includes("calendarWeekAnchor: getTodayIsoDate()"), true);
  assert.match(
    appSource,
    /weekStartInput\.addEventListener\("input"[\s\S]*state\.calendarWeekAnchor = inputDate;[\s\S]*state\.weekStart = getWeekStartForDate\(inputDate\);/,
  );
  assert.match(
    appSource,
    /function getCalendarDateInputValue\(\)[\s\S]*: state\.calendarWeekAnchor \|\| state\.weekStart \|\| getWeekStartForDate\(getTodayIsoDate\(\)\)/,
  );
  assert.equal(appSource.includes('calendarDateLabel.textContent = isMonthView ? "月份定位" : "周定位"'), true);
  assert.equal(appSource.includes('weekStartInput.setAttribute("aria-label", isMonthView ? "选择月份" : "选择周定位日期")'), true);
});

test("calendar exposes student absence and pending makeup UI", () => {
  assert.equal(appSource.includes('id="toggle-makeup-panel"'), true);
  assert.equal(appSource.includes('id="pending-makeup-panel"'), true);
  assert.equal(appSource.includes("renderPendingMakeupPanel"), true);
  assert.equal(appSource.includes("getPendingMakeupLessons"), true);
  assert.equal(appSource.includes("ABSENCE_MAKEUP_DONE"), true);
  assert.equal(appSource.includes("ABSENCE_MAKEUP_PENDING"), true);
  assert.equal(appSource.includes('data-lesson-action="absence"'), true);
  assert.equal(appSource.includes('data-lesson-action="restore-absence"'), true);
  assert.equal(appSource.includes('data-lesson-action="makeup-done"'), true);
  assert.equal(appSource.includes('data-makeup-action="done"'), true);
  assert.equal(appSource.includes("renderAbsenceMarkers"), true);
  assert.equal(appSource.includes("formatAbsenceStatusLabel"), true);
  assert.equal(appSource.includes("请假（"), true);
  assert.equal(appSource.includes("标记为已补课"), true);
  assert.equal(appSource.includes("已标记为已补课"), true);
  assert.equal(appSource.includes('disabled aria-disabled="true"'), true);
  assert.equal(appSource.includes("openAbsenceConfirm"), true);
  assert.equal(appSource.includes("markLessonAbsenceEdit"), true);
  assert.equal(appSource.includes("[lesson.teacherName, lesson.studentName, lesson.course]"), true);
  assert.ok(css.includes(".absence-marker"));
  assert.ok(css.includes(".pending-makeup-panel"));
  assert.ok(css.includes(".lesson-absence-button"));
  assert.ok(css.includes(".lesson-absence-button:disabled"));
});

test("calendar views align morning afternoon evening rows across date columns", () => {
  assert.equal(appSource.includes("calendar-daypart-axis"), true);
  assert.equal(appSource.includes("calendar-month-daypart-row"), true);
  assert.equal(appSource.includes("calendar-month-daypart-cell"), true);
  assert.match(appSource, /calendar-month-daypart-cell[\s\S]*empty"><\/span>/);
  assert.equal(appSource.includes("calendar-daypart-empty-label\">空"), false);
  assert.equal(appSource.includes("calendar-week-daypart-row"), true);
  assert.equal(appSource.includes("calendar-week-daypart-cell"), true);
  assert.equal(appSource.includes("overview.map((day) => renderCalendarDayCard(day))"), false);
  assert.equal(appSource.includes("day.segments.map((segment) => renderCalendarMonthDaypart(segment))"), false);
  assert.ok(css.includes(".calendar-daypart-axis"));
  assert.ok(css.includes(".calendar-month-daypart-row"));
  assert.ok(css.includes(".calendar-month-daypart-cell"));
  assert.ok(css.includes(".lesson-row.calendar-month-lesson"));
  assert.ok(css.includes(".calendar-month-lesson-teacher"));
  assert.ok(css.includes(".calendar-week-daypart-row"));
  assert.ok(css.includes(".calendar-week-daypart-cell"));
  assert.ok(css.includes(".calendar-daypart-morning"));
  assert.ok(css.includes(".calendar-daypart-afternoon"));
  assert.ok(css.includes(".calendar-daypart-evening"));
  assert.equal(getRuleValue(".calendar-month-week-days", "grid-template-columns"), "74px repeat(7, minmax(0, 1fr))");
  assert.equal(getRuleValue(".calendar-month-daypart-row", "grid-template-columns"), "74px repeat(7, minmax(0, 1fr))");
  assert.equal(getRuleValue(".calendar-week-days", "grid-template-columns"), "96px repeat(7, minmax(0, 1fr))");
  assert.equal(getRuleValue(".calendar-week-daypart-row", "grid-template-columns"), "96px repeat(7, minmax(0, 1fr))");
  assert.equal(getRuleValue(".calendar-daypart-axis", "position"), "sticky");
  assert.equal(getRuleValue(".calendar-daypart-axis", "border-right"), "4px solid var(--daypart-accent)");
  assert.equal(getRuleValue(".calendar-week-daypart-cell", "border-left"), "0");
  assert.equal(getRuleValue(".calendar-week-daypart-cell.empty", "border-style"), "solid");
  assert.equal(getRuleValue(".calendar-month-daypart-cell.empty", "border"), "0");
});

test("calendar month overview uses compact lesson cards with teacher and course", () => {
  assert.equal(getRuleValue(".calendar-month-overview-grid", "grid-template-columns"), "repeat(2, minmax(0, 1fr))");
  assert.equal(appSource.includes('class="calendar-month-lesson-time"'), true);
  assert.equal(appSource.includes('class="calendar-month-lesson-teacher"'), true);
  assert.equal(appSource.includes('class="calendar-month-lesson-course"'), true);
  assert.equal(appSource.includes("calendar-month-daypart-count"), false);
  assert.equal(appSource.includes("calendar-month-course-strips"), false);
  assert.equal(
    getRuleValue(".calendar-month-week-days", "grid-template-columns"),
    "74px repeat(7, minmax(0, 1fr))",
  );
  assert.equal(getRuleValue(".calendar-month-daypart-cell", "min-height"), "76px");
  assert.equal(getRuleValue(".calendar-month-daypart-lessons", "display"), "grid");
  assert.equal(getRuleValue(".lesson-row.calendar-month-lesson", "grid-template-columns"), "minmax(0, 1fr)");
  assert.equal(getRuleValue(".lesson-row.calendar-month-lesson", "border-left-width"), "4px");
  assert.equal(getRuleValue(".lesson-row.calendar-month-lesson .calendar-month-lesson-time", "white-space"), "nowrap");
  assert.equal(getRuleValue(".lesson-row.calendar-month-lesson .calendar-month-lesson-copy", "min-width"), "0");
  assert.equal(getRuleValue(".lesson-row.calendar-month-lesson .calendar-month-lesson-course", "-webkit-line-clamp"), "2");
  assert.equal(getRuleValue(".calendar-month-daypart-cell.empty", "background"), "transparent");
  assert.equal(css.includes(".calendar-month-lesson span span"), false);
  assert.equal(css.includes(".calendar-month-course-strip"), false);
});

test("candidate preview lessons look visibly different from synced lessons", () => {
  assert.equal(getRuleValue(".lesson-row.preview", "border-left-color"), "#d65f91");
  assert.equal(getRuleValue(".lesson-row.preview", "outline"), "3px dashed rgba(214, 95, 145, 0.82)");
  assert.equal(getRuleValue(".lesson-row.preview::after", "content"), "\"试排\"");
  assert.equal(getRuleValue(".lesson-row.preview small", "font-weight"), "900");
});

test("candidate preview lessons can be confirmed into synced manual lessons", () => {
  assert.equal(appSource.includes("确认排课并同步到网站"), true);
  assert.equal(appSource.includes("isPreviewLessonId"), true);
  assert.match(
    appSource,
    /function requestSelectedLessonSave[\s\S]*isPreviewLessonId\(state\.selectedLessonId\)[\s\S]*saveSelectedLessonFromDetail\("following", lessonChanges\)/,
  );
  assert.match(
    appSource,
    /function saveSelectedLessonFromDetail[\s\S]*manual-\$\{Date\.now\(\)\}[\s\S]*setManualLessonSeries/,
  );
  assert.match(
    appSource,
    /function saveSelectedLessonFromDetail[\s\S]*state\.selectedTeacherId = null/,
  );
  assert.match(
    appSource,
    /function readLessonChangesFromDetailForm[\s\S]*isPreviewLessonId\(state\.selectedLessonId\)[\s\S]*"手动新增"/,
  );
});

test("preview lesson detail uses an obvious confirmation call to action", () => {
  assert.equal(appSource.includes("preview-confirm"), true);
  assert.equal(appSource.includes("lesson-confirm-hint"), true);
  assert.equal(appSource.includes("确认后会写入所有老师总课表"), true);
  assert.equal(getRuleValue(".lesson-detail-actions.preview-confirm", "display"), "grid");
  assert.equal(getRuleValue(".lesson-detail-actions.preview-confirm", "grid-template-columns"), "minmax(0, 1fr) 48px");
  assert.ok(getRuleText(".lesson-detail-actions.preview-confirm").includes("linear-gradient"));
  assert.equal(getRuleValue(".lesson-detail-actions.preview-confirm .lesson-save-button", "width"), "100%");
  assert.equal(getRuleValue(".lesson-detail-actions.preview-confirm .lesson-save-button", "height"), "58px");
  assert.equal(getRuleValue(".lesson-detail-actions.preview-confirm .lesson-save-button", "font-size"), "18px");
  assert.ok(
    getRuleText(".lesson-detail-actions.preview-confirm .lesson-save-button").includes(
      "background: linear-gradient",
    ),
  );
  assert.ok(css.includes(".lesson-confirm-hint"));
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

test("course permission view can delete any teacher with the heart confirmation", () => {
  assert.equal(appSource.includes("openPermissionTeacherDeleteConfirm"), true);
  assert.equal(appSource.includes("deletePermissionTeacher"), true);
  assert.equal(appSource.includes("data-permission-delete-teacher"), true);
  assert.equal(appSource.includes("permission-teacher-name-cell"), true);
  assert.equal(appSource.includes("isCustomPermissionTeacher"), false);
  assert.equal(appSource.includes("确认删除老师"), true);
  assert.equal(appSource.includes("小心心提醒"), true);
  assert.equal(appSource.includes("data-permission-remove-course"), false);
  assert.ok(css.includes(".permission-delete-teacher-button"));
  assert.ok(css.includes(".permission-teacher-name-cell"));
  assert.ok(css.includes(".permission-toggle"));
});

test("course permission view can delete courses with confirmation", () => {
  assert.equal(appSource.includes("openPermissionCourseDeleteConfirm"), true);
  assert.equal(appSource.includes("deletePermissionCourse"), true);
  assert.equal(appSource.includes("data-permission-delete-course"), true);
  assert.equal(appSource.includes("permission-course-head-cell"), true);
  assert.equal(appSource.includes("hideBaseCourse"), true);
  assert.equal(appSource.includes("removeCustomCourse"), true);
  assert.equal(appSource.includes("确认删除课程"), true);
  assert.equal(appSource.includes("历史课程和已排课程不会被自动删除"), true);
  assert.ok(css.includes(".permission-course-head-cell"));
  assert.ok(css.includes(".permission-delete-course-button"));
  assert.equal(getRuleValue(".permission-delete-course-button", "width"), "26px");
});

test("course permission course deletion is cache-busted in app imports", () => {
  assert.equal(appSource.includes("./customCatalog.js?v=20260623-permission-course-delete"), true);
  assert.equal(indexSource.includes("./src/app.js?v=20260624-public-guest-sync"), true);
  assert.equal(indexSource.includes("./styles.css?v=20260624-public-guest-sync"), true);
});

test("course permission teacher column leaves room for full teacher names", () => {
  assert.equal(getRuleValue(".permission-table", "min-width"), "1260px");
  assert.equal(getRuleValue(".permission-table th:first-child,\n.permission-table td:first-child", "width"), "168px");
  assert.equal(getRuleValue(".permission-teacher-name-cell", "gap"), "8px");
  assert.equal(getRuleValue(".permission-delete-teacher-button", "width"), "30px");
});

test("course permission width update is cache-busted in the stylesheet URL", () => {
  assert.equal(indexSource.includes("./styles.css?v=20260624-public-guest-sync"), true);
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

test("shift roster follows course permission teachers with non-teaching exceptions", () => {
  assert.equal(appSource.includes("buildShiftRoster"), true);
  assert.equal(appSource.includes("./shifts.js?v=20260623-shift-roster-sync"), true);
  assert.equal(appSource.includes('const SHIFT_ROSTER_EXTRA_TEACHER_IDS = ["lency", "vicky"]'), true);
  assert.match(
    appSource,
    /function getShiftRoster\(\) \{[\s\S]*buildShiftRoster\(baseShiftRoster, getCandidateTeachers\(\), \{[\s\S]*extraTeacherIds: SHIFT_ROSTER_EXTRA_TEACHER_IDS/,
  );
  assert.match(
    appSource,
    /const selectedTeacherInRoster = getShiftRoster\(\)\.some\(\(teacher\) => teacher\.id === state\.selectedShift\.teacherId\)/,
  );
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
  const sideStackStart = appSource.indexOf('id="shift-side-stack" class="shift-side-stack"');
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
  assert.equal(appSource.includes("只填空白格子"), false);
  assert.equal(appSource.includes("覆盖已有排班"), false);
  assert.equal(appSource.includes("当前筛选没有可更新的格子"), false);
  assert.equal(appSource.includes('mode: "overwrite"'), true);
  assert.equal(appSource.includes("renderBulkShiftPreviewText"), false);
  assert.ok(css.includes(".shift-bulk-form"));
  assert.ok(css.includes(".shift-bulk-weekdays"));
  assert.equal(css.includes(".shift-bulk-preview"), false);
  assert.equal(css.includes(".shift-bulk-mode"), false);
  assert.ok(css.includes(".shift-bulk-actions"));
});

test("shift view opens a dedicated monthly roster planner", () => {
  assert.equal(appSource.includes('id="open-month-shift-planner"'), true);
  assert.equal(appSource.includes('data-shift-action="month-plan"'), true);
  assert.equal(appSource.includes("设置月排班"), true);
  assert.equal(appSource.includes('id="shift-month-planner"'), true);
  assert.equal(appSource.includes("showShiftMonthPlanner"), true);
  assert.equal(appSource.includes("renderShiftMonthPlanner"), true);
  assert.equal(appSource.includes("handleShiftMonthPlannerSubmit"), true);
  assert.equal(appSource.includes("getMonthShiftPlannerDates"), true);
  assert.equal(appSource.includes("月排班设置小纸条"), true);
  assert.equal(appSource.includes("应用到月排班"), true);
  assert.ok(css.includes(".month-shift-planner-button"));
  assert.ok(css.includes(".shift-month-planner"));
  assert.ok(css.includes(".shift-month-planner-backdrop"));
  assert.ok(css.includes(".shift-month-planner-card"));
  assert.equal(getRuleValue(".shift-month-planner", "position"), "fixed");
});

test("shift toolbar date control aligns label and input on one row", () => {
  assert.equal(appSource.includes('class="shift-date-control"'), true);
  assert.equal(getRuleValue(".shift-date-control", "display"), "grid");
  assert.equal(getRuleValue(".shift-date-control", "grid-template-columns"), "auto minmax(170px, 1fr)");
  assert.equal(getRuleValue(".shift-date-control", "align-items"), "center");
  assert.equal(getRuleValue(".shift-date-control", "width"), "260px");
  assert.equal(getRuleValue(".shift-date-control span", "margin"), "0");
  assert.equal(getRuleValue(".shift-date-control input", "height"), "42px");
});

test("shift view supports week and month modes", () => {
  assert.equal(appSource.includes('shiftViewMode: "month"'), true);
  assert.equal(appSource.includes("shiftMonthAnchor"), true);
  assert.equal(appSource.includes('data-shift-view-mode="month"'), true);
  assert.equal(appSource.includes("getShiftViewDates"), true);
  assert.equal(appSource.includes("getMonthWeeks"), true);
  assert.equal(appSource.includes("renderShiftMonthGrid"), true);
  assert.equal(appSource.includes("renderShiftWeekGrid"), true);
  assert.equal(appSource.includes("renderShiftMonthOverviewCell"), true);
  assert.equal(appSource.includes("renderShiftWeekOverlay"), true);
  assert.equal(appSource.includes("openShiftWeekOverlay"), true);
  assert.equal(appSource.includes("closeShiftWeekOverlay"), true);
  assert.equal(appSource.includes("data-shift-week-open"), true);
  assert.equal(appSource.includes('id="shift-week-overlay"'), true);
  assert.equal(appSource.includes("month-overview"), true);
  assert.equal(appSource.includes("shift-lesson-count"), true);
  assert.equal(appSource.includes("outside-month"), true);
  assert.ok(css.includes(".shift-view-toggle"));
  assert.ok(css.includes(".shift-grid.month"));
  assert.ok(css.includes(".shift-grid.month-overview"));
  assert.ok(css.includes(".shift-week-overlay"));
  assert.ok(css.includes(".shift-week-modal"));
  assert.ok(css.includes(".shift-month-week-grid"));
  assert.ok(css.includes(".shift-month-week-label"));
  assert.ok(css.includes(".shift-cell.outside-month"));
});

test("shift month overview keeps the default screen compact before opening a week", () => {
  const monthGridRenderer = /function renderShiftMonthGrid[\s\S]*?function renderShiftMonthOverviewWeek/.exec(appSource)?.[0] || "";
  const monthWeekRenderer = /function renderShiftMonthOverviewWeek[\s\S]*?function renderShiftMonthOverviewCell/.exec(appSource)?.[0] || "";
  const monthCellRenderer = /function renderShiftMonthOverviewCell[\s\S]*?function renderShiftWeekOverlay/.exec(appSource)?.[0] || "";

  assert.match(
    appSource,
    /function renderShiftView[\s\S]*if \(isMonthView && !state\.activeShiftWeekStart\)[\s\S]*shiftSideStackNode\.classList\.add\("hidden"\)/,
  );
  assert.equal(monthGridRenderer.includes("data-shift-week-open"), true);
  assert.equal(monthWeekRenderer.includes("renderShiftMonthOverviewCell"), true);
  assert.match(
    appSource,
    /function renderShiftMonthOverviewCell[\s\S]*formatShiftCellLabel\(shift\)[\s\S]*function renderShiftWeekOverlay/s,
  );
  assert.equal(monthCellRenderer.includes("getShiftCellLessons"), false);
  assert.equal(monthCellRenderer.includes("renderShiftLessonList"), false);
  assert.equal(monthCellRenderer.includes("shift-lesson-count"), false);
  assert.equal(appSource.includes("renderShiftLessonList(lessons, shift, selectedLessonIds, shiftViewMode)"), true);
  assert.equal(appSource.includes('renderShiftLessonList(lessons, shift, selectedLessonIds, "month")'), false);
  assert.equal(css.includes(".shift-month-week-grid .shift-lesson-list"), false);
});

test("shift month overview has kawaii stickers without blocking schedule density", () => {
  const monthGridRenderer = /function renderShiftMonthGrid[\s\S]*?function renderShiftMonthOverviewWeek/.exec(appSource)?.[0] || "";

  assert.equal(monthGridRenderer.includes("shift-month-overview-shell"), true);
  assert.equal(monthGridRenderer.includes("shift-month-sticker-strip"), true);
  assert.equal(monthGridRenderer.includes("shift-month-floating-sticker"), true);
  assert.equal(monthGridRenderer.includes("shift-month-week-sticker"), true);
  assert.equal(monthGridRenderer.includes("aria-hidden=\"true\""), true);
  assert.ok(css.includes(".shift-month-sticker-strip"));
  assert.ok(css.includes(".shift-month-floating-sticker"));
  assert.ok(css.includes(".shift-month-week-sticker"));
  assert.ok(getRuleText(".shift-month-floating-sticker").includes("pointer-events: none"));
  assert.ok(getRuleText(".shift-month-week-sticker").includes("pointer-events: none"));
});

test("shift month overview separates work and rest states at a glance", () => {
  assert.ok(getRuleText(".shift-month-mini-cell.work").includes("inset 4px 0 0 var(--shift-month-campus-accent"));
  assert.ok(getRuleText(".shift-month-mini-cell.work strong").includes("var(--shift-month-campus-text"));
  assert.equal(
    getRuleValue(".shift-month-mini-cell.work.shift-campus-xuhui", "background"),
    "linear-gradient(180deg, #ffd9e8 0%, #fff5f9 100%)",
  );
  assert.equal(
    getRuleValue(".shift-month-mini-cell.work.shift-campus-babaiban", "background"),
    "linear-gradient(180deg, #dff6ea 0%, #f4fff8 100%)",
  );
  assert.equal(
    getRuleValue(".shift-month-mini-cell.work.shift-campus-biyun", "background"),
    "linear-gradient(180deg, #dceeff 0%, #f4faff 100%)",
  );
  assert.ok(
    getRuleText(".shift-month-mini-cell.off,\n.shift-month-mini-cell.holiday").includes(
      "repeating-linear-gradient",
    ),
  );
  assert.equal(getRuleValue(".shift-month-mini-cell.off,\n.shift-month-mini-cell.holiday", "color"), "#6c5864");
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

test("new lesson request defaults empty weekdays to the start date weekday", () => {
  assert.equal(appSource.includes("weekdays.length ? weekdays : [1]"), false);
  assert.match(
    appSource,
    /function readRequest\(\)[\s\S]*const startDate = String\(formData\.get\("startDate"\)\)[\s\S]*weekdays: weekdays\.length \? weekdays : \[getWeekdayValue\(startDate\)\]/,
  );
});

test("app exposes a Supabase sync sign-in panel for shared editing", () => {
  assert.equal(appSource.includes('id="sync-panel"'), true);
  assert.equal(appSource.includes('id="sync-form"'), true);
  assert.equal(appSource.includes('name="syncEmail"'), true);
  assert.equal(appSource.includes('./remoteStore.js?v=20260624-public-guest-sync'), true);
  assert.equal(appSource.includes("function getSyncSignInErrorMessage"), true);
  assert.equal(appSource.includes("getSyncSignInErrorMessage(error)"), true);
  assert.equal(appSource.includes("项目每小时登录邮件额度"), true);
  assert.equal(appSource.includes("60 秒窗口还没过"), true);
  assert.equal(appSource.includes("请等 1 分钟后再试"), false);
  assert.equal(appSource.includes("Redirect URLs"), true);
});

test("unauthenticated shared mode can sync as a public guest", () => {
  assert.equal(supabaseConfigSource.includes("requireAuth: false"), true);
  assert.equal(remoteStoreSource.includes('const SUPABASE_CONFIG_IMPORT_VERSION = "20260624-public-guest-sync";'), true);
  assert.equal(remoteStoreSource.includes('import(`./supabaseConfig.js?v=${SUPABASE_CONFIG_IMPORT_VERSION}`)'), true);
  assert.equal(appSource.includes("const publicGuestWriteEnabled = config.requireAuth === false;"), true);
  assert.equal(appSource.includes("const canWrite = isAuthenticated || publicGuestWriteEnabled;"), true);
  assert.equal(appSource.includes('document.documentElement.dataset.remoteSync = canWrite ? "enabled" : "viewer"'), true);
  assert.equal(appSource.includes('status: canWrite ? "synced" : "viewer"'), true);
  assert.equal(appSource.includes("公开同步模式已开启，无需登录，保存后同事会看到更新。"), true);
  assert.equal(appSource.includes("临时访客编辑模式已开启，可以先编辑并保存在本机"), false);
  assert.equal(appSource.includes("function rejectReadOnlySave()"), true);
  assert.match(appSource, /function saveLessonEdits\(edits\) \{\s+if \(rejectReadOnlySave\(\)\)/);
  assert.equal(appSource.includes('document.documentElement.dataset.remoteSync = "viewer-unavailable"'), true);
  assert.equal(appSource.includes("云端只读还没开通。请先登录查看最新排课"), true);
  assert.equal(appSource.includes("remoteSyncCanWrite"), true);
  assert.equal(css.includes('html[data-remote-sync="auth-required"] .workspace-tabs'), false);
  assert.equal(css.includes('html[data-remote-sync="auth-required"] main'), false);
  assert.equal(getRuleValue('html[data-remote-sync="viewer-unavailable"] .workspace-tabs', "display"), "none");
  assert.equal(getRuleValue('html[data-remote-sync="viewer-unavailable"] main', "display"), "none");
  assert.match(supabaseSql, /for select\s+to anon, authenticated\s+using \(true\);/);
  assert.match(supabaseSql, /for insert\s+to anon, authenticated\s+with check/);
  assert.match(supabaseSql, /for update\s+to anon, authenticated\s+using \(true\)\s+with check/);
});

test("public guest sync mode leaves write controls enabled and saves remotely", () => {
  assert.equal(appSource.includes("TEMPORARY_GUEST_EDIT_MODE"), false);
  assert.equal(appSource.includes("const READ_ONLY_WRITE_SELECTORS = ["), true);
  assert.equal(appSource.includes("function isWriteLocked()"), true);
  assert.equal(appSource.includes("remoteSyncAuthenticated"), true);
  assert.equal(appSource.includes("function applyReadOnlyMode()"), true);
  assert.equal(appSource.includes("const isAuthenticated = Boolean(session);"), true);
  assert.equal(appSource.includes("const canWrite = isAuthenticated || publicGuestWriteEnabled;"), true);
  const writeLockBody = /function isWriteLocked\(\) \{([\s\S]*?)\n\}/.exec(appSource)?.[1] || "";
  assert.equal(writeLockBody.includes("remoteSyncCanWrite"), true);
  assert.equal(writeLockBody.includes("!remoteSyncCanWrite"), true);
  assert.equal(writeLockBody.includes("remoteSyncReady"), false);
  assert.equal(writeLockBody.includes('state.sync.status !== "error"'), false);
  assert.equal(appSource.includes("当前临时允许未登录编辑"), false);
  assert.equal(appSource.includes("云端同步暂不可用。你已登录，可以先编辑"), true);
  assert.equal(appSource.includes("数据已保存到本机浏览器；云端同步暂不可用"), true);
  assert.match(appSource, /remoteStore\s*\.\s*saveBucket\(bucket, payload\)/);
  assert.equal(appSource.includes('document.documentElement.dataset.writeLocked = isWriteLocked() ? "true" : "false"'), true);
  for (const selector of [
    "#request-form input",
    "#request-form select",
    "#add-calendar-lesson",
    "#clear-preview",
    "[data-course-delete]",
    "[data-course-edit]",
    "[data-student-delete]",
    "[data-lesson-action]",
    "[data-lesson-student-add]",
    "[data-course-title-edit]",
    "#shift-editor input",
    "#shift-editor select",
    "#shift-editor button",
    "#shift-bulk-form input",
    "#shift-month-planner input",
    "#reset-permissions",
    "#permission-add-form input",
    ".permission-toggle input",
    "[data-permission-delete-teacher]",
    "[data-permission-delete-course]",
  ]) {
    assert.ok(appSource.includes(`"${selector}"`), `${selector} should be included in the read-only lock selectors`);
  }
  assert.match(appSource, /addCalendarLessonButton\.addEventListener\("click", \(\) => \{\s+if \(rejectReadOnlyAction\("新增课程"\)\)/);
  assert.match(appSource, /permissionGridNode\.addEventListener\("change", \(event\) => \{\s+if \(rejectReadOnlyAction\("调整课程权限"\)\)/);
  assert.match(appSource, /studentOverviewNode\.addEventListener\("submit"[\s\S]*rejectReadOnlyAction\("新增学员"\)/);
  assert.equal(getRuleValue('html[data-write-locked="true"] [data-readonly-action="true"]', "cursor"), "not-allowed");
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
