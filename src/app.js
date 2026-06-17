import {
  candidateTeachers as baseCandidateTeachers,
  courses as baseCourses,
  defaultShiftOverrides,
  existingLessons,
  grades,
  shiftRoster as baseShiftRoster,
  studentCatalog as baseStudentCatalog,
} from "./data.js?v=20260617-active-teacher-lessons";
import {
  applyCoursePermissions,
  buildDefaultCoursePermissions,
  countAllowedCourseCells,
  normalizeCoursePermissions,
  setTeacherCoursePermission,
} from "./coursePermissions.js?v=20260616-course-catalog";
import {
  buildLessonDetail,
  buildWeekOverview,
  filterCalendarLessons,
} from "./calendar.js?v=20260617-finance-series-hole";
import {
  buildLessonsForTeacher,
  expandRecurringLessons,
  formatMinutesToTime,
  matchTeachers,
  parseTimeToMinutes,
} from "./scheduler.js?v=20260616-course-catalog";
import {
  CAMPUS_OPTIONS,
  buildShiftLabel,
  buildUnavailableLessonsFromShifts,
  getTeacherShiftForDate,
  makeShiftKey,
  mergeTeacherShiftOverrides,
} from "./shifts.js?v=20260616-shift-labels";
import {
  deriveDeliveryTypeFromCampus,
  teachingSites,
} from "./courseCatalog.js?v=20260616-course-catalog";
import {
  addCustomCourse,
  addCustomTeacher,
  mergeCatalog,
  normalizeCustomCatalog,
} from "./customCatalog.js?v=20260616-permission-clean";
import {
  applyLessonEdits,
  deleteLessonEdit,
  normalizeLessonEdits,
  restoreDeletedLessonEdits,
  setLessonEdit,
} from "./lessonEdits.js?v=20260616-restore-deleted";
import {
  alignExplicitSeriesDates,
  deleteLessonsInScope,
  getScopedLessonCount,
  updateLessonsInScope,
} from "./lessonSeries.js?v=20260617-finance-series-8";
import {
  buildCourseOverview,
  buildStudentOverview,
  buildTeacherDayLessonIndex,
  splitStudentNames,
} from "./overview.js?v=20260617-shift-courses";
import {
  buildStudentDirectoryRows,
  filterStudentDirectoryRows,
  hideStudentDirectoryRecord,
  makeStudentDirectoryId,
  normalizeStudentDirectory,
  setStudentDirectoryRecord,
} from "./studentDirectory.js?v=20260617-student-search";
import {
  createRemoteStore,
  loadRemoteStoreConfig,
} from "./remoteStore.js?v=20260616-supabase-sync";

const SHIFT_STORAGE_KEY = "jiedeng-teacher-shifts-folder-20260617-shift";
const COURSE_PERMISSION_STORAGE_KEY = "jiedeng-course-permissions-folder-20260617-shift";
const LESSON_EDIT_STORAGE_KEY = "jiedeng-lesson-edits-folder-20260617-shift";
const LESSON_EDIT_RESTORE_RESULT_KEY = "jiedeng-lesson-edits-last-restore";
const LESSON_EDIT_RESTORE_BACKUP_PREFIX = "jiedeng-lesson-edits-backup-before-restore";
const CUSTOM_CATALOG_STORAGE_KEY = "jiedeng-custom-catalog-folder-20260617-shift";
const STUDENT_DIRECTORY_STORAGE_KEY = "jiedeng-student-directory-20260617";
const REMOTE_BUCKETS = {
  shiftOverrides: "shiftOverrides",
  coursePermissions: "coursePermissions",
  customCatalog: "customCatalog",
  lessonEdits: "lessonEdits",
  studentDirectory: "studentDirectory",
};
const WEEKDAYS = [
  { value: 1, label: "周一" },
  { value: 2, label: "周二" },
  { value: 3, label: "周三" },
  { value: 4, label: "周四" },
  { value: 5, label: "周五" },
  { value: 6, label: "周六" },
  { value: 7, label: "周日" },
];
const DURATION_OPTIONS = [
  { value: 45, label: "45 分钟" },
  { value: 60, label: "1 小时" },
  { value: 90, label: "1.5 小时" },
  { value: 120, label: "2 小时" },
  { value: 150, label: "2.5 小时" },
  { value: 180, label: "3 小时" },
];

const state = {
  selectedTeacherId: null,
  selectedShift: { teacherId: baseShiftRoster[0]?.id || "", date: "2026-06-29" },
  shiftOverrides: loadShiftOverrides(),
  customCatalog: loadCustomCatalog(),
  studentDirectory: loadStudentDirectory(),
  coursePermissions: {},
  lessonEdits: loadLessonEdits(),
  selectedLessonId: null,
  selectedCourseKey: "",
  studentSearchQuery: "",
  draftLesson: null,
  pendingConfirm: null,
  sync: {
    status: "local",
    email: "",
    message: "本地模式",
  },
  view: "planner",
  weekStart: "2026-06-29",
};

state.coursePermissions = loadCoursePermissions();

let remoteStore = createRemoteStore({ config: {} });
let remoteSyncReady = false;
let saveFeedbackToken = 0;

const teacherColors = {
  claire: "violet",
  phebe: "gray",
  sophie: "gray",
  lynn: "blue",
  tiana: "green",
  catherine: "orange",
  charlotte: "rose",
  gioia: "teal",
  karen: "amber",
  hanna: "cyan",
  reece: "violet",
};

const teacherAvatars = {
  claire: { character: "小恶魔", mark: "C", tone: "kuromi", image: "photo/1133570168691764439.jpeg" },
  sophie: { character: "美乐蒂", mark: "美", tone: "melody", image: "photo/9992430418961551.jpeg" },
  phebe: { character: "库洛米", mark: "库", tone: "kuromi", image: "photo/551268810646516216.jpeg" },
  lynn: { character: "玉桂狗", mark: "玉", tone: "cinnamon", image: "photo/2251868558517832.jpeg" },
  tiana: { character: "布丁狗", mark: "布", tone: "pompom", image: "photo/2885187258130354.jpeg" },
  catherine: { character: "Hello Kitty", mark: "Kitty", tone: "kitty", image: "photo/657807089360599950.jpeg" },
  charlotte: { character: "双子星", mark: "星", tone: "kiki", image: "photo/2251868558517840.jpeg" },
  gioia: { character: "帕恰狗", mark: "帕", tone: "pochacco", image: "photo/2251868558517826.jpeg" },
  karen: { character: "大耳狗", mark: "耳", tone: "mint", image: "photo/2885187258130352.jpeg" },
  hanna: { character: "巧克猫", mark: "巧", tone: "chococat", image: "photo/45599014979890058.jpeg" },
  reece: { character: "Keroppi", mark: "Ker", tone: "keroppi", image: "photo/344595809001891606.jpeg" },
};

const app = document.querySelector("#app");
app.innerHTML = `
  <header class="app-header">
    <div class="header-copy">
      <p class="label">内部排课工具 MVP</p>
      <h1>桔灯排课助手</h1>
      <p class="subhead">按学生空闲时间优先匹配老师，并用清晰周课表查看所有老师课程。</p>
    </div>
    <div class="header-sticker-board" aria-hidden="true">
      <img src="./background/1001417667159766837.jpeg" alt="" loading="lazy" />
    </div>
    <div class="header-metrics">
      <div><strong>${getCandidateTeachers().length}</strong><span>老师</span></div>
      <div><strong>${existingLessons.length}</strong><span>已导入课节</span></div>
      <div><strong>15m</strong><span>计算颗粒</span></div>
    </div>
	  </header>

  <section id="sync-panel" class="sync-panel" aria-live="polite"></section>
  <div id="student-delete-dialog" aria-live="polite"></div>

	  <nav class="workspace-tabs" aria-label="工作区">
    <button class="tab-button active" data-view-target="planner" type="button">排课助手</button>
    <button class="tab-button" data-view-target="courses" type="button">总课程</button>
    <button class="tab-button" data-view-target="students" type="button">总学员</button>
    <button class="tab-button" data-view-target="shifts" type="button">老师排班</button>
    <button class="tab-button" data-view-target="permissions" type="button">课程权限</button>
  </nav>

  <main>
    <section id="planner-view" class="workspace-view">
      <section class="planner-shell">
        <form id="request-form" class="panel form-panel">
          <img class="panel-sticker panel-sticker-form" src="./photo/˗ˏˋ꒰🍥꒱.jpeg" alt="" loading="lazy" aria-hidden="true" />
          <div class="panel-title">
            <div>
              <h2>新学员排课</h2>
              <p>默认以老师空闲时间为第一优先级。</p>
            </div>
            <span class="tag">固定周期课</span>
          </div>

          <div class="form-grid">
            <label>
              <span>学员姓名</span>
              <input name="studentName" value="Ivan" />
            </label>
            <label>
              <span>课程需求</span>
              <select name="course">${renderOptions(getCourses(), "WAICY 集训")}</select>
            </label>
            <label>
              <span>年级</span>
              <select name="grade">${renderOptions(grades, "Y6")}</select>
            </label>
            <label>
              <span>授课校区</span>
              <select name="campus">${renderOptions(teachingSites, "徐汇")}</select>
            </label>
            <label>
              <span>开始日期</span>
              <input type="date" name="startDate" value="2026-06-29" />
            </label>
            <label>
              <span>开始时间</span>
              <input type="time" name="startTime" value="14:00" step="900" />
            </label>
            <label>
              <span>单次时长</span>
              <select name="durationMinutes">${renderDurationOptions(180)}</select>
            </label>
            <label>
              <span>上课次数</span>
              <input name="sessionCount" type="number" value="12" min="1" step="1" />
            </label>
          </div>

          <fieldset>
            <legend>每周上课日</legend>
            <div class="weekday-picker">
              ${WEEKDAYS.map(
                (day) => `
                  <label>
                    <input type="checkbox" name="weekdays" value="${day.value}" ${
                      [1, 3, 5].includes(day.value) ? "checked" : ""
                    } />
                    <span>${day.label}</span>
                  </label>
                `,
              ).join("")}
            </div>
          </fieldset>
        </form>

        <section class="panel results-panel">
          <img class="panel-sticker panel-sticker-results" src="./photo/@mikkoillustrations on ig_.jpeg" alt="" loading="lazy" aria-hidden="true" />
          <div class="panel-title">
            <div>
              <h2>候选老师</h2>
              <p id="summary-line">根据当前需求自动计算。</p>
            </div>
            <button id="clear-preview" class="ghost-button" type="button">清空预排</button>
          </div>
          <div id="matches" class="matches"></div>
        </section>
      </section>

        <section class="calendar-section">
          <img class="panel-sticker panel-sticker-calendar" src="./background/calico critter desktop wallpaper high quality.jpeg" alt="" loading="lazy" aria-hidden="true" />
          <div class="calendar-toolbar">
            <div>
              <h2>所有老师总课表</h2>
              <p>按天查看周课程列表，课程会按时间段分组展示。</p>
            </div>
            <div class="calendar-actions">
              <button id="add-calendar-lesson" class="add-lesson-button" type="button">新增课程</button>
              <label>
                <span>周起始</span>
                <input id="week-start" type="date" value="${state.weekStart}" />
              </label>
            </div>
        </div>
        <div id="calendar" class="calendar"></div>
      </section>
    </section>

    <section id="courses-view" class="workspace-view hidden">
      <section class="overview-section panel">
        <div class="calendar-toolbar overview-toolbar">
          <div>
            <h2>总课程</h2>
            <p id="course-overview-line">查看当前已经排上的课程记录。</p>
          </div>
        </div>
        <div id="course-overview" class="overview-content"></div>
      </section>
    </section>

    <section id="students-view" class="workspace-view hidden">
      <section class="overview-section panel">
        <div class="calendar-toolbar overview-toolbar">
          <div>
            <h2>总学员</h2>
            <p id="student-overview-line">按学员汇总当前已经排上的课程。</p>
          </div>
        </div>
        <div id="student-overview" class="overview-content"></div>
      </section>
    </section>

    <section id="shifts-view" class="workspace-view hidden">
      <section class="shift-section panel">
        <div class="calendar-toolbar shift-toolbar">
          <div>
            <h2>老师排班</h2>
            <p id="shift-sync-line">修改后会立即同步到候选老师和总课表。</p>
          </div>
          <label>
            <span>周起始</span>
            <input id="shift-week-start" type="date" value="${state.weekStart}" />
          </label>
        </div>
        <div class="shift-layout">
          <div id="shift-grid" class="shift-grid"></div>
          <aside id="shift-editor" class="shift-editor"></aside>
        </div>
      </section>
    </section>

    <section id="permissions-view" class="workspace-view hidden">
      <section class="permission-section panel">
        <div class="calendar-toolbar permission-toolbar">
          <div>
            <h2>老师课程权限</h2>
            <p id="permission-sync-line">修改后会立即影响候选老师匹配。</p>
          </div>
          <button id="reset-permissions" class="ghost-button" type="button">恢复默认规则</button>
        </div>
        <form id="permission-add-form" class="permission-add-form">
          <label>
            <span>新增老师</span>
            <input name="newTeacherName" placeholder="老师姓名" />
          </label>
          <button data-permission-add="teacher" type="button">新增老师</button>
          <label>
            <span>新增课程</span>
            <input name="newCourseName" placeholder="课程名称" />
          </label>
          <button data-permission-add="course" type="button">新增课程</button>
        </form>
        <div id="permission-grid" class="permission-grid"></div>
      </section>
    </section>
  </main>
`;

const form = document.querySelector("#request-form");
const matchesNode = document.querySelector("#matches");
const summaryLine = document.querySelector("#summary-line");
const calendarNode = document.querySelector("#calendar");
const weekStartInput = document.querySelector("#week-start");
const shiftWeekStartInput = document.querySelector("#shift-week-start");
const shiftGridNode = document.querySelector("#shift-grid");
const shiftEditorNode = document.querySelector("#shift-editor");
const shiftSyncLine = document.querySelector("#shift-sync-line");
const plannerView = document.querySelector("#planner-view");
const coursesView = document.querySelector("#courses-view");
const studentsView = document.querySelector("#students-view");
const shiftsView = document.querySelector("#shifts-view");
const permissionsView = document.querySelector("#permissions-view");
const courseOverviewNode = document.querySelector("#course-overview");
const studentOverviewNode = document.querySelector("#student-overview");
const courseOverviewLine = document.querySelector("#course-overview-line");
const studentOverviewLine = document.querySelector("#student-overview-line");
const permissionGridNode = document.querySelector("#permission-grid");
const permissionSyncLine = document.querySelector("#permission-sync-line");
const resetPermissionsButton = document.querySelector("#reset-permissions");
const permissionAddForm = document.querySelector("#permission-add-form");
const addCalendarLessonButton = document.querySelector("#add-calendar-lesson");
const tabButtons = document.querySelectorAll("[data-view-target]");
const syncPanelNode = document.querySelector("#sync-panel");
const studentDeleteDialogNode = document.querySelector("#student-delete-dialog");

syncPanelNode.addEventListener("submit", (event) => {
  const form = event.target.closest("#sync-form");
  if (!form) {
    return;
  }

  event.preventDefault();
  requestSyncSignIn(form);
});

syncPanelNode.addEventListener("click", (event) => {
  const signOutButton = event.target.closest("[data-sync-action='sign-out']");
  if (!signOutButton) {
    return;
  }

  signOutFromRemoteSync();
});

form.addEventListener("input", () => {
  state.selectedTeacherId = null;
  render();
});

weekStartInput.addEventListener("input", () => {
  state.weekStart = weekStartInput.value;
  shiftWeekStartInput.value = state.weekStart;
  state.selectedLessonId = null;
  state.draftLesson = null;
  render();
});

shiftWeekStartInput.addEventListener("input", () => {
  state.weekStart = shiftWeekStartInput.value;
  weekStartInput.value = state.weekStart;
  state.selectedLessonId = null;
  state.draftLesson = null;
  render();
});

addCalendarLessonButton.addEventListener("click", () => {
  createDraftCalendarLesson();
});

courseOverviewNode.addEventListener("click", (event) => {
  const deleteButton = event.target.closest("[data-course-delete]");
  if (deleteButton) {
    openCourseDeleteConfirm(deleteButton.dataset.courseDelete);
    return;
  }

  const editButton = event.target.closest("[data-course-edit]");
  if (editButton) {
    openCourseInLessonEditor(editButton.dataset.courseEdit);
    return;
  }

  const courseButton = event.target.closest("[data-course-select]");
  if (!courseButton) {
    return;
  }

  state.selectedCourseKey = courseButton.dataset.courseSelect || "";
  renderCourseOverviewView();
});

studentOverviewNode.addEventListener("click", (event) => {
  const deleteButton = event.target.closest("[data-student-delete]");
  if (!deleteButton) {
    return;
  }

  openStudentDeleteConfirm(deleteButton.dataset.studentDelete);
});

studentOverviewNode.addEventListener("input", (event) => {
  const searchInput = event.target.closest("[data-student-search]");
  if (!searchInput) {
    return;
  }

  state.studentSearchQuery = searchInput.value;
  refreshStudentSearchResults();
});

studentDeleteDialogNode.addEventListener("click", (event) => {
  if (event.target.classList?.contains("student-delete-backdrop")) {
    closeStudentDeleteConfirm();
    return;
  }

  const cancelButton = event.target.closest("[data-student-delete-cancel]");
  if (cancelButton) {
    closeStudentDeleteConfirm();
    return;
  }

  const confirmButton = event.target.closest("[data-confirm-action]");
  if (!confirmButton) {
    return;
  }

  const action = confirmButton.dataset.confirmAction || "";
  const scope = confirmButton.dataset.lessonScope || "single";
  runPendingConfirmAction(action, scope);
  closeStudentDeleteConfirm();
});

studentOverviewNode.addEventListener("submit", (event) => {
  const studentForm = event.target.closest("#student-add-form");
  if (!studentForm) {
    return;
  }

  event.preventDefault();
  addStudentDirectoryRecordFromForm(studentForm);
});

studentOverviewNode.addEventListener("focusout", (event) => {
  const editableCell = event.target.closest("[data-student-edit-field]");
  if (!editableCell) {
    return;
  }

  saveStudentDirectoryField(editableCell);
});

calendarNode.addEventListener("click", (event) => {
  const addStudentButton = event.target.closest("[data-lesson-student-add]");
  if (addStudentButton) {
    const detailForm = addStudentButton.closest("#lesson-detail-form");
    appendLessonStudentName(detailForm);
    return;
  }

  const titleEditButton = event.target.closest("[data-course-title-edit]");
  if (titleEditButton) {
    const titleEditor = titleEditButton.closest(".lesson-title-editor");
    const titleInput = titleEditor?.querySelector("[name='course']");
    if (titleInput) {
      titleInput.readOnly = false;
      titleEditor.classList.add("is-editing");
      titleInput.focus();
      titleInput.select();
    }
    return;
  }

  const lessonActionButton = event.target.closest("[data-lesson-action]");
  if (lessonActionButton) {
    if (lessonActionButton.dataset.lessonAction === "save") {
      requestSelectedLessonSave();
    }

    if (lessonActionButton.dataset.lessonAction === "delete") {
      requestSelectedLessonDelete();
    }

    return;
  }

  const closeButton = event.target.closest("[data-lesson-detail-close]");
  if (closeButton) {
    state.selectedLessonId = null;
    state.draftLesson = null;
    renderCalendar();
    return;
  }

  const lessonButton = event.target.closest("[data-lesson-id]");
  if (!lessonButton) {
    return;
  }

  state.selectedLessonId = lessonButton.dataset.lessonId;
  state.draftLesson = null;
  renderCalendar();
});

calendarNode.addEventListener("input", (event) => {
  const detailForm = event.target.closest("#lesson-detail-form");
  if (detailForm) {
    updateLessonEndDatePreview(detailForm);
  }
});

calendarNode.addEventListener("change", (event) => {
  const detailForm = event.target.closest("#lesson-detail-form");
  if (detailForm) {
    updateLessonEndDatePreview(detailForm);
  }
});

tabButtons.forEach((button) => {
  button.addEventListener("click", () => {
    state.view = button.dataset.viewTarget;
    renderWorkspace();
  });
});

shiftGridNode.addEventListener("click", (event) => {
  const cell = event.target.closest("[data-shift-teacher-id]");
  if (!cell) {
    return;
  }

  state.selectedShift = {
    teacherId: cell.dataset.shiftTeacherId,
    date: cell.dataset.shiftDate,
  };
  renderShiftView();
});

shiftEditorNode.addEventListener("click", (event) => {
  const actionButton = event.target.closest("[data-shift-action]");
  if (!actionButton) {
    return;
  }

  if (actionButton.dataset.shiftAction === "clear") {
    clearSelectedShift();
  }
});

shiftEditorNode.addEventListener("change", (event) => {
  if (event.target.matches("[data-shift-field]")) {
    saveSelectedShiftFromEditor();
  }
});

permissionGridNode.addEventListener("change", (event) => {
  const checkbox = event.target.closest("[data-permission-teacher-id]");
  if (!checkbox) {
    return;
  }

  const teacherIds = getCandidateTeacherIds();
  state.coursePermissions = setTeacherCoursePermission(
    state.coursePermissions,
    checkbox.dataset.permissionTeacherId,
    checkbox.dataset.permissionCourse,
    checkbox.checked,
    teacherIds,
    getCourses(),
  );
  saveCoursePermissions(state.coursePermissions);
  render();
});

resetPermissionsButton.addEventListener("click", () => {
  state.coursePermissions = buildDefaultCoursePermissions(getCandidateTeacherIds(), getCourses());
  saveCoursePermissions(state.coursePermissions);
  refreshPlannerCourseOptions();
  render();
});

permissionAddForm.addEventListener("click", (event) => {
  const addButton = event.target.closest("[data-permission-add]");
  if (!addButton) {
    return;
  }

  if (addButton.dataset.permissionAdd === "teacher") {
    addTeacherFromPermissionForm();
  }

  if (addButton.dataset.permissionAdd === "course") {
    addCourseFromPermissionForm();
  }
});

document.querySelector("#clear-preview").addEventListener("click", () => {
  state.selectedTeacherId = null;
  render();
});

render();
initializeRemoteSync();

function render() {
  const request = readRequest();
  const desiredLessons = expandRecurringLessons(request);
  const effectiveTeachers = getEffectiveTeachers();
  const effectiveLessons = getEffectiveLessons();
  const matches = matchTeachers(effectiveTeachers, effectiveLessons, request);

  summaryLine.textContent = `${desiredLessons.length} 节课需要匹配，优先看老师时间是否完整覆盖。`;
  matchesNode.innerHTML = renderMatchGroups(matches);

  matchesNode.querySelectorAll("[data-teacher-id]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedTeacherId = button.dataset.teacherId;
      render();
    });
  });

  renderWorkspace();
  renderCalendar();
  renderCourseOverviewView();
  renderStudentOverviewView();
  renderStudentDeleteDialog();
  renderShiftView();
  renderCoursePermissions();
}

function renderMatchGroups(matches) {
  const availableMatches = matches.filter(isTeacherAvailable);
  const unavailableMatches = matches.filter((match) => !isTeacherAvailable(match));
  const selectedMatch = matches.find((match) => match.teacherId === state.selectedTeacherId);

  return `
    <div class="match-groups">
      ${renderMatchGroup("Available", "可完整排", availableMatches)}
      ${renderMatchGroup("Not available", "暂不可排", unavailableMatches)}
    </div>
    ${selectedMatch ? renderMatchDetailCard(selectedMatch) : ""}
  `;
}

function renderMatchGroup(title, subtitle, matches) {
  const content = matches.length
    ? matches.map((match) => renderTeacherAvatarButton(match)).join("")
    : `<span class="match-empty">暂无老师</span>`;

  return `
    <section class="match-group">
      <div class="match-group-head">
        <strong>${escapeHtml(title)}</strong>
        <span>${escapeHtml(subtitle)} · ${matches.length} 位</span>
      </div>
      <div class="teacher-avatar-list">${content}</div>
    </section>
  `;
}

function renderTeacherAvatarButton(match) {
  const ratio = `${match.availableSessions}/${match.totalSessions}`;
  const selected = state.selectedTeacherId === match.teacherId;
  const available = isTeacherAvailable(match);
  const avatar = getTeacherAvatar(match.teacherId);

  return `
    <button
      class="teacher-avatar-button ${available ? "available" : "unavailable"} ${selected ? "selected" : ""}"
      data-teacher-id="${escapeAttribute(match.teacherId)}"
      type="button"
      title="${escapeAttribute(`${match.teacherName} · ${avatar.character}`)}"
      aria-label="查看 ${escapeAttribute(match.teacherName)} 候选详情"
    >
      ${renderTeacherAvatarImage(avatar)}
      <strong>${escapeHtml(match.teacherName)}</strong>
      <em>${escapeHtml(ratio)}</em>
    </button>
  `;
}

function renderMatchDetailCard(match) {
  const ratio = `${match.availableSessions}/${match.totalSessions}`;
  const avatar = getTeacherAvatar(match.teacherId);
  const available = isTeacherAvailable(match);
  const fitText = match.fitIssues.length ? match.fitIssues.join(" / ") : "课程、年级、校区匹配";
  const conflictText = match.conflicts.length
    ? match.conflicts.slice(0, 5).map((conflict) => renderConflictLine(conflict)).join("")
    : `<li>无时间冲突</li>`;

  return `
    <section class="match-detail-card ${available ? "available" : "unavailable"}">
      <div class="match-detail-head">
        ${renderTeacherAvatarImage(avatar)}
        <span>
          <strong>${escapeHtml(match.teacherName)}</strong>
          <em>${escapeHtml(ratio)} 可排</em>
        </span>
      </div>
      <div class="match-detail-grid">
        <span>
          <small>课程匹配</small>
          <strong>${escapeHtml(fitText)}</strong>
        </span>
        <span>
          <small>时间冲突</small>
          <strong>${match.conflicts.length ? `${match.conflicts.length} 个需处理` : "无冲突"}</strong>
        </span>
      </div>
      <ul class="match-conflict-list">${conflictText}</ul>
    </section>
  `;
}

function renderTeacherAvatarImage(avatar) {
  const image = avatar.image
    ? `<img src="${escapeAttribute(avatar.image)}" alt="" loading="lazy" aria-hidden="true" onerror="this.remove()" />`
    : "";

  return `
    <span class="teacher-avatar ${escapeAttribute(avatar.tone)}">
      <span class="teacher-avatar-fallback">${escapeHtml(avatar.mark)}</span>
      ${image}
    </span>
  `;
}

function renderShiftEditorAvatar(teacherId) {
  return `
    <span class="shift-editor-avatar" aria-hidden="true">
      ${renderTeacherAvatarImage(getTeacherAvatar(teacherId))}
    </span>
  `;
}

function renderConflictLine(conflict) {
  return `
    <li>
      <strong>${escapeHtml(conflict.date)} ${escapeHtml(conflict.weekdayName)}</strong>
      <span>${escapeHtml(conflict.reason)}</span>
    </li>
  `;
}

function isTeacherAvailable(match) {
  return match.availableSessions === match.totalSessions && match.fitIssues.length === 0;
}

function getTeacherAvatar(teacherId) {
  return teacherAvatars[teacherId] || { character: "随机角色", mark: "师", tone: "default" };
}

function renderCalendar() {
  const request = readRequest();
  const effectiveTeachers = getEffectiveTeachers();
  const effectiveLessons = getEffectiveLessons();
  const selectedTeacher = effectiveTeachers.find((teacher) => teacher.id === state.selectedTeacherId);
  const previewLessons = selectedTeacher ? buildLessonsForTeacher(selectedTeacher, request) : [];
  const editedPreviewLessons = applyLessonEdits(previewLessons, state.lessonEdits, {
    includeAddedLessons: false,
  });
  const weekDates = getWeekDates(state.weekStart);
  const visibleLessons = filterCalendarLessons([...effectiveLessons, ...editedPreviewLessons]);
  const allLessons = visibleLessons.filter((lesson) =>
    weekDates.some((date) => date.iso === lesson.date),
  );
  const overview = buildWeekOverview(weekDates, allLessons);
  const selectedLesson = allLessons.find((lesson) => lesson.id === state.selectedLessonId);
  const selectedDetail = selectedLesson
    ? buildLessonDetail(selectedLesson, visibleLessons)
    : state.draftLesson?.id === state.selectedLessonId
      ? buildLessonDetail(state.draftLesson, [state.draftLesson])
      : null;

  calendarNode.innerHTML = `
    ${selectedDetail ? renderLessonDetail(selectedDetail) : ""}
    <div class="calendar-overview">
      ${overview.map((day) => renderCalendarDayCard(day)).join("")}
    </div>
  `;
}

function renderCalendarDayCard(day) {
  const content = day.groups.length
    ? day.groups.map((group) => renderCalendarTimeGroup(group)).join("")
    : `<span class="calendar-empty">暂无课程</span>`;

  return `
    <article class="calendar-day-card">
      <span class="calendar-day-top">
        <span>
          <strong>${escapeHtml(day.label)}</strong>
          <em>${escapeHtml(day.iso.slice(5))}</em>
        </span>
        <b>${day.lessonCount} 节</b>
      </span>
      <span class="calendar-day-content">${content}</span>
    </article>
  `;
}

function renderCalendarTimeGroup(group) {
  return `
    <span class="calendar-time-group">
      <span class="time-range">${escapeHtml(group.timeRange)}</span>
      <span class="lesson-list">${group.lessons.map((lesson) => renderLessonRow(lesson)).join("")}</span>
    </span>
  `;
}

function renderLessonRow(lesson) {
  const color = teacherColors[lesson.teacherId] || "gray";
  const isPreview = lesson.status === "预排";
  const selected = state.selectedLessonId === lesson.id;
  const detail = getTeachingSiteLabel(lesson);

  return `
    <button
      class="lesson-row ${color} ${isPreview ? "preview" : ""} ${selected ? "selected" : ""}"
      data-lesson-id="${escapeAttribute(lesson.id)}"
      type="button"
      aria-label="查看 ${escapeAttribute(lesson.teacherName)} ${escapeAttribute(lesson.course)} 课程详情"
    >
      <span class="lesson-row-main">
        <strong>${escapeHtml(lesson.teacherName)}</strong>
        <span>${escapeHtml(lesson.studentName)} · ${escapeHtml(lesson.course)}</span>
      </span>
      <small>${escapeHtml(detail || lesson.status || "")}</small>
    </button>
  `;
}

function getTeachingSiteLabel(lesson) {
  if (lesson.campus) {
    return lesson.campus;
  }

  return lesson.deliveryType || lesson.status || "";
}

function renderLessonDetail(detail) {
  const color = teacherColors[detail.teacherId] || "gray";
  const avatar = getTeacherAvatar(detail.teacherId);

  return `
    <aside class="lesson-detail-panel ${color}${avatar.image ? " has-avatar-bg" : ""}"${renderLessonAvatarStyle(
      avatar,
    )} role="dialog" aria-label="课程详情">
      <div class="lesson-detail-head">
        <div>
          <p class="label">课程详情</p>
          <label class="lesson-title-editor">
            <input
              class="lesson-title-input"
              form="lesson-detail-form"
              name="course"
              type="text"
              value="${escapeAttribute(detail.course === "未填写" ? "" : detail.course)}"
              aria-label="课程名字"
              readonly
            />
            <button class="lesson-title-edit-button" data-course-title-edit type="button" aria-label="编辑课程名字">
              ${renderPencilIcon()}
            </button>
          </label>
          <p>${escapeHtml(detail.recurrence.summary)}</p>
        </div>
        <button class="lesson-detail-close" data-lesson-detail-close type="button" aria-label="关闭课程详情">
          <span aria-hidden="true">×</span>
        </button>
      </div>
      <form
        id="lesson-detail-form"
        class="lesson-detail-form"
        data-original-start-date="${escapeAttribute(detail.recurrence.startDate)}"
        data-explicit-start-date="${escapeAttribute(detail.recurrence.explicitStartDate || "")}"
        data-selected-date="${escapeAttribute(detail.date)}"
      >
        <div class="lesson-detail-grid">
          ${renderStudentNameField(detail.studentName)}
          ${renderSelectField("年级", "grade", ["", ...grades], detail.grade === "未填写" ? "" : detail.grade)}
          ${renderSelectField("授课校区", "campus", ["", ...teachingSites], detail.campus === "未填写" ? "" : detail.campus)}
          ${renderDetailField("开始日期", "startDate", detail.recurrence.startDate, "date")}
          ${renderReadOnlyField("结束日期", detail.recurrence.endDate, 'data-lesson-end-date-preview="true"')}
          ${renderDetailField("本节日期", "date", detail.date, "date")}
          ${renderDetailField("开始时间", "startTime", detail.startTime, "time")}
          ${renderReadOnlyField("结束时间", detail.endTime)}
          ${renderDurationSelect("单次时长", "durationMinutes", detail.durationMinutes)}
          ${renderDetailField("总上课次数", "sessionCount", detail.recurrence.sessionCount, "number", 'min="1" step="1"')}
          ${renderWeekdayCheckboxField(detail.recurrence.weekdayValues)}
          ${renderSelectField("上课老师", "teacherId", getCandidateTeachers().map((teacher) => teacher.id), detail.teacherId, formatTeacherOption)}
        </div>
        <label class="lesson-detail-wide">
          <span>课程内容/备注</span>
          <textarea name="notes" rows="3">${escapeHtml(detail.notes)}</textarea>
        </label>
        <div class="lesson-detail-actions">
          <button class="lesson-save-button" data-lesson-action="save" type="button">保存并同步</button>
          <button class="lesson-delete-button" data-lesson-action="delete" type="button" aria-label="删除课程">
            <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24">
              <path d="M4 7h16"></path>
              <path d="M10 11v6"></path>
              <path d="M14 11v6"></path>
              <path d="M6 7l1 13h10l1-13"></path>
              <path d="M9 7V4h6v3"></path>
            </svg>
          </button>
        </div>
      </form>
    </aside>
  `;
}

function renderStudentNameField(value) {
  return `
    <div class="lesson-student-field">
      <label>
        <span>学员</span>
        <input name="studentName" type="text" value="${escapeAttribute(value || "")}" />
      </label>
      <div class="lesson-student-add" aria-label="给这节课新增学员">
        <input data-lesson-student-add-input type="text" placeholder="新增学员姓名" aria-label="新增学员姓名" />
        <button data-lesson-student-add type="button">加入</button>
      </div>
    </div>
  `;
}

function renderLessonAvatarStyle(avatar) {
  if (!avatar.image) {
    return "";
  }

  return ` style="--lesson-avatar-image: url('${escapeAttribute(escapeCssString(avatar.image))}');"`;
}

function renderPencilIcon() {
  return `
    <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24">
      <path d="M12 20h9"></path>
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4 11.5-11.5z"></path>
    </svg>
  `;
}

function renderDetailField(label, name, value, type = "text", extraAttributes = "") {
  const attributes = [type === "time" ? 'step="900"' : "", extraAttributes].filter(Boolean).join(" ");

  return `
    <label>
      <span>${escapeHtml(label)}</span>
      <input name="${escapeAttribute(name)}" type="${escapeAttribute(type)}" value="${escapeAttribute(value || "")}" ${attributes} />
    </label>
  `;
}

function renderReadOnlyField(label, value, extraAttributes = "") {
  return `
    <label>
      <span>${escapeHtml(label)}</span>
      <input value="${escapeAttribute(value || "未填写")}" ${extraAttributes} readonly />
    </label>
  `;
}

function renderDurationSelect(label, name, selectedMinutes) {
  return `
    <label>
      <span>${escapeHtml(label)}</span>
      <select name="${escapeAttribute(name)}">${renderDurationOptions(selectedMinutes)}</select>
    </label>
  `;
}

function renderDurationOptions(selectedMinutes) {
  const selectedValue = Number.isFinite(Number(selectedMinutes)) ? Number(selectedMinutes) : 60;
  const options = DURATION_OPTIONS.some((option) => option.value === selectedValue)
    ? DURATION_OPTIONS
    : [...DURATION_OPTIONS, { value: selectedValue, label: formatDurationMinutes(selectedValue) }];

  return options
    .map(
      (option) =>
        `<option value="${option.value}" ${option.value === selectedValue ? "selected" : ""}>${escapeHtml(option.label)}</option>`,
    )
    .join("");
}

function renderWeekdayCheckboxField(selectedWeekdays) {
  const selectedSet = new Set((selectedWeekdays || []).map(Number));

  return `
    <fieldset class="lesson-weekday-field">
      <legend>每周上课日</legend>
      <div class="detail-weekday-picker">
        ${WEEKDAYS.map(
          (day) => `
            <label>
              <input type="checkbox" name="weekdays" value="${day.value}" ${selectedSet.has(day.value) ? "checked" : ""} />
              <span>${day.label}</span>
            </label>
          `,
        ).join("")}
      </div>
    </fieldset>
  `;
}

function renderSelectField(label, name, values, selectedValue, formatter = (value) => value || "未填写") {
  const options = values.includes(selectedValue) ? values : [...values, selectedValue];

  return `
    <label>
      <span>${escapeHtml(label)}</span>
      <select name="${escapeAttribute(name)}">
        ${options
          .map(
            (value) =>
              `<option value="${escapeAttribute(value)}" ${value === selectedValue ? "selected" : ""}>${escapeHtml(
                formatter(value),
              )}</option>`,
          )
          .join("")}
      </select>
    </label>
  `;
}

function formatTeacherOption(teacherId) {
  return getCandidateTeachers().find((teacher) => teacher.id === teacherId)?.name || teacherId || "未填写";
}

function formatDurationMinutes(minutes) {
  if (!Number.isFinite(minutes) || minutes <= 0) {
    return "未填写";
  }

  if (minutes % 60 === 0) {
    return `${minutes / 60} 小时`;
  }

  if (minutes > 60 && minutes % 30 === 0) {
    return `${minutes / 60} 小时`;
  }

  return `${minutes} 分钟`;
}

function renderWorkspace() {
  plannerView.classList.toggle("hidden", state.view !== "planner");
  coursesView.classList.toggle("hidden", state.view !== "courses");
  studentsView.classList.toggle("hidden", state.view !== "students");
  shiftsView.classList.toggle("hidden", state.view !== "shifts");
  permissionsView.classList.toggle("hidden", state.view !== "permissions");

  tabButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.viewTarget === state.view);
  });
}

function renderCourseOverviewView() {
  const effectiveLessons = getEffectiveLessons();
  const today = getTodayIsoDate();
  const overview = buildCourseOverview(effectiveLessons, { today });
  const selectedCard = overview.courseCards.find((card) => card.key === state.selectedCourseKey) || null;
  courseOverviewLine.textContent = `从 ${formatDateForDisplay(today)} 起，还有 ${overview.totalCourses} 组未来课程、${overview.totalLessons} 节未完成课节。`;

  courseOverviewNode.innerHTML = `
    <div class="course-summary-strip">
      ${renderCourseSummaryPill("未来课程", overview.totalCourses, "按学员与课程汇总")}
      ${renderCourseSummaryPill("未来课节", overview.totalLessons, "今日以前自动隐藏")}
      ${renderCourseSummaryStickers()}
    </div>
    ${
      overview.courseCards.length
        ? `
          <div class="course-overview-board">
            <section class="course-quick-list" aria-label="所有课程总览">
              <div class="course-quick-header" aria-hidden="true">
                <span>课程 / 学员</span>
                <span>老师</span>
                <span>时间</span>
                <span>下节</span>
                <span>剩余</span>
                <span>校区</span>
              </div>
              <div class="course-quick-rows">
                ${overview.courseCards.map((card) => renderCourseOverviewRow(card, card.key === state.selectedCourseKey)).join("")}
              </div>
            </section>
            ${selectedCard ? renderCourseDetailCard(selectedCard) : renderCourseDetailPlaceholder()}
          </div>
        `
        : renderOverviewEmpty("目前没有未来课程")
    }
  `;
}

function renderCourseSummaryPill(label, value, caption) {
  return `
    <span>
      <strong>${escapeHtml(value)}</strong>
      <em>${escapeHtml(label)}</em>
      <small>${escapeHtml(caption)}</small>
    </span>
  `;
}

function renderCourseSummaryStickers() {
  return `
    <div class="course-summary-stickers" aria-hidden="true">
      <img class="course-summary-sticker" src="./background/my melody _3.jpeg" alt="" loading="lazy" />
      <img class="course-summary-sticker" src="./photo/@mikkoillustrations on ig_.jpeg" alt="" loading="lazy" />
      <img class="course-summary-sticker" src="./photo/♡.jpeg" alt="" loading="lazy" />
    </div>
  `;
}

function renderCourseOverviewRow(card, isSelected) {
  return `
    <article class="course-quick-row ${isSelected ? "selected" : ""}">
      <button
        class="course-quick-button"
        data-course-select="${escapeAttribute(card.key)}"
        type="button"
        aria-label="查看 ${escapeAttribute(card.studentName)} ${escapeAttribute(card.course)} 课程详情"
      >
        <span class="course-quick-main">
          <strong>${escapeHtml(card.course)}</strong>
          <small>${escapeHtml(card.studentName)}</small>
        </span>
        <span>${escapeHtml(card.teacherName)}</span>
        <span>${escapeHtml(card.timeLabel)}</span>
        <span>${escapeHtml(card.nextDate || "未填写")}</span>
        <span>${escapeHtml(card.lessonCount)} 节</span>
        <span>${escapeHtml(card.campus)}</span>
      </button>
      <button class="overview-delete-button course-row-delete" data-course-delete="${escapeAttribute(card.key)}" type="button" aria-label="删除这组课程">
        ${renderTrashIcon()}
      </button>
    </article>
  `;
}

function renderCourseDetailCard(card) {
  return `
    <aside class="course-detail-card" aria-label="课程详细信息">
      <img class="course-detail-sticker" src="./photo/@mikkoillustrations on ig_.jpeg" alt="" loading="lazy" aria-hidden="true" />
      <div class="course-detail-head">
        <div>
          <span>课程详情贴纸</span>
          <h3>${escapeHtml(card.course)}</h3>
          <p>${escapeHtml(card.studentName)}</p>
        </div>
      </div>
      <div class="course-detail-actions">
        <button class="course-edit-button" data-course-edit="${escapeAttribute(card.key)}" type="button">编辑课程</button>
        <button class="overview-delete-button" data-course-delete="${escapeAttribute(card.key)}" type="button" aria-label="删除这组课程">
          ${renderTrashIcon()}
        </button>
      </div>
      <div class="course-detail-tags">
        <span>${escapeHtml(card.lessonCount)} 节未完成</span>
        <span>${escapeHtml(card.timeLabel)}</span>
        <span>${escapeHtml(card.weekdays.join("、") || "上课日未填写")}</span>
      </div>
      <dl class="course-detail-list">
        ${renderStudentDetail("老师", card.teacherName)}
        ${renderStudentDetail("校区", card.campus)}
        ${renderStudentDetail("日期", `${card.firstDate || "未填写"} 至 ${card.lastDate || "未填写"}`)}
        ${renderStudentDetail("备注", card.notes.join("、") || "无")}
      </dl>
    </aside>
  `;
}

function renderCourseDetailPlaceholder() {
  return `
    <aside class="course-detail-card empty" aria-label="课程详细信息">
      <img class="course-detail-sticker" src="./photo/˗ˏˋ꒰🍥꒱.jpeg" alt="" loading="lazy" aria-hidden="true" />
      <div class="course-detail-head">
        <div>
          <span>课程详情贴纸</span>
          <h3>点一门课程看看</h3>
          <p>左侧总览只放核心信息，详细老师、日期、备注会在这里展开。</p>
        </div>
      </div>
    </aside>
  `;
}

function renderStudentOverviewView() {
  const today = getTodayIsoDate();
  const effectiveLessons = getEffectiveLessons();
  const students = getStudentDirectoryRows();
  const filteredStudents = filterStudentDirectoryRows(students, state.studentSearchQuery);
  const courseOverview = buildCourseOverview(effectiveLessons, { today });
  const activeStudents = students.filter((student) => student.lessonCount > 0).length;
  studentOverviewLine.textContent = `当前学员数据库共有 ${students.length} 位学员，其中 ${activeStudents} 位从 ${formatDateForDisplay(today)} 起还有未来课程。`;

  studentOverviewNode.innerHTML = `
    <div class="overview-stat-row">
      <article class="overview-stat-card">
        <span>总学员</span>
        <strong>${students.length}</strong>
        <em>来自学员信息与排课表</em>
      </article>
      <article class="overview-stat-card lavender">
        <span>未来课节</span>
        <strong>${courseOverview.totalLessons}</strong>
        <em>今日以前已自动隐藏</em>
      </article>
    </div>
    ${renderStudentAddForm()}
    ${renderStudentSearchBox(students.length, filteredStudents.length)}
    <div data-student-results>
      ${renderStudentResults(filteredStudents)}
    </div>
  `;
}

function renderStudentAddForm() {
  return `
    <form id="student-add-form" class="student-add-form">
      <label>
        <span>学员姓名</span>
        <input name="name" placeholder="新学员姓名" required />
      </label>
      <label>
        <span>年级</span>
        <input name="grade" placeholder="如 Y6" />
      </label>
      <label>
        <span>电话</span>
        <input name="phone" placeholder="家长电话" />
      </label>
      <label>
        <span>家庭住址</span>
        <input name="address" placeholder="校区/住址备注" />
      </label>
      <button type="submit">新增学员</button>
    </form>
  `;
}

function renderStudentSearchBox(totalCount, filteredCount) {
  return `
    <div class="student-search-box">
      <img src="./photo/♡.jpeg" alt="" loading="lazy" aria-hidden="true" />
      <label>
        <span>搜索学员小纸条</span>
        <input
          data-student-search
          type="search"
          value="${escapeAttribute(state.studentSearchQuery)}"
          placeholder="搜姓名、电话、住址、课程、老师..."
          autocomplete="off"
        />
      </label>
      <p data-student-search-count>${escapeHtml(formatStudentSearchCount(totalCount, filteredCount))}</p>
    </div>
  `;
}

function renderStudentResults(students) {
  if (students.length) {
    return renderStudentLedgerTable(students);
  }

  return renderOverviewEmpty(
    state.studentSearchQuery ? "没有搜到相关学员，小贴纸先帮你守着。" : "目前没有未来课程学员",
  );
}

function formatStudentSearchCount(totalCount, filteredCount) {
  const query = state.studentSearchQuery.trim();
  if (!query) {
    return `共 ${totalCount} 位学员`;
  }
  return `搜到 ${filteredCount} / ${totalCount} 位`;
}

function refreshStudentSearchResults() {
  const students = getStudentDirectoryRows();
  const filteredStudents = filterStudentDirectoryRows(students, state.studentSearchQuery);
  const countNode = studentOverviewNode.querySelector("[data-student-search-count]");
  const resultsNode = studentOverviewNode.querySelector("[data-student-results]");
  if (countNode) {
    countNode.textContent = formatStudentSearchCount(students.length, filteredStudents.length);
  }
  if (resultsNode) {
    resultsNode.innerHTML = renderStudentResults(filteredStudents);
  }
}

function renderStudentLedgerTable(students) {
  return `
    <div class="student-table-planner">
      <img class="student-table-sticker sticker-ribbon" src="./background/my melody _3.jpeg" alt="" loading="lazy" aria-hidden="true" />
      <img class="student-table-sticker sticker-heart" src="./photo/♡.jpeg" alt="" loading="lazy" aria-hidden="true" />
      <div class="student-table-note">
        <span>Student ledger</span>
        <strong>${students.length} 位</strong>
      </div>
      <div class="student-ledger-wrap">
        <table class="student-ledger-table">
          <thead>
            <tr>
              <th>学员</th>
              <th>性别</th>
              <th>年级</th>
              <th>学校</th>
              <th>业务/频率</th>
              <th>电话</th>
              <th>家庭住址</th>
              <th>需求</th>
              <th>课程</th>
              <th>老师</th>
              <th>未来时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            ${students.map((student) => renderStudentTableRow(student)).join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderStudentTableRow(student) {
  const studentId = escapeAttribute(student.id || makeStudentDirectoryId(student.name));
  const coursesText = student.coursesText || student.courses.join("、") || "";
  const teachersText = student.teachersText || student.teachers.join("、") || "";
  const timeText =
    student.timeText ||
    (student.lessonCount ? `${student.firstDate || "未填写"} 至 ${student.lastDate || "未填写"}` : "未排未来课程");

  return `
    <tr>
      <th scope="row">
        <span
          class="student-ledger-name"
          contenteditable="true"
          spellcheck="false"
          data-student-id="${studentId}"
          data-student-edit-field="name"
        >${escapeHtml(student.name)}</span>
        <em>${escapeHtml(student.lessonCount ? `${student.lessonCount} 节课` : "未排未来课程")}</em>
      </th>
      ${renderStudentEditableCell(student, "gender", student.gender)}
      ${renderStudentEditableCell(student, "grade", student.grade)}
      ${renderStudentEditableCell(student, "school", student.school)}
      ${renderStudentEditableCell(student, "businessType", formatStudentBusiness(student))}
      ${renderStudentEditableCell(student, "phone", student.phone, "student-ledger-phone")}
      ${renderStudentEditableCell(student, "address", student.address, "student-ledger-address")}
      ${renderStudentEditableCell(student, "needs", student.needs)}
      ${renderStudentEditableCell(student, "coursesText", coursesText)}
      ${renderStudentEditableCell(student, "teachersText", teachersText)}
      ${renderStudentEditableCell(student, "timeText", timeText)}
      <td>
        <button
          class="overview-delete-button"
          data-student-delete="${studentId}"
          type="button"
          aria-label="删除这位学员的未来课程"
        >${renderTrashIcon()}</button>
      </td>
    </tr>
  `;
}

function renderStudentEditableCell(student, field, value, className = "") {
  return `
    <td
      ${className ? `class="${escapeAttribute(className)}"` : ""}
      contenteditable="true"
      spellcheck="false"
      data-student-id="${escapeAttribute(student.id || makeStudentDirectoryId(student.name))}"
      data-student-edit-field="${escapeAttribute(field)}"
    >${escapeHtml(value || "未填写")}</td>
  `;
}

function formatStudentBusiness(student) {
  return [student.businessType, student.frequency].filter(Boolean).join(" / ") || "未填写";
}

function getStudentDirectoryRows() {
  const overview = buildStudentOverview(getEffectiveLessons(), {
    today: getTodayIsoDate(),
    studentCatalog: baseStudentCatalog,
  });
  return buildStudentDirectoryRows(overview.students, state.studentDirectory, { draftStudent: readRequest() });
}

function addStudentDirectoryRecordFromForm(studentForm) {
  const formData = new FormData(studentForm);
  const name = String(formData.get("name") || "").trim();
  if (!name) {
    return;
  }

  const record = {
    id: makeStudentDirectoryId(name),
    name,
    grade: String(formData.get("grade") || "").trim(),
    phone: String(formData.get("phone") || "").trim(),
    address: String(formData.get("address") || "").trim(),
  };

  state.studentDirectory = setStudentDirectoryRecord(state.studentDirectory, record);
  saveStudentDirectory(state.studentDirectory);
  studentForm.reset();
  render();
}

function saveStudentDirectoryField(editableCell) {
  const studentId = editableCell.dataset.studentId || "";
  const field = editableCell.dataset.studentEditField || "";
  if (!studentId || !field) {
    return;
  }

  const rows = getStudentDirectoryRows();
  const row = rows.find((student) => student.id === studentId);
  const currentRecord = state.studentDirectory.records?.[studentId] || {};
  const currentName = currentRecord.name || row?.name || "";
  const nextValue = editableCell.textContent.trim();
  if (field === "name" && !nextValue) {
    editableCell.textContent = currentName || "未填写";
    return;
  }

  const normalizedValue = nextValue === "未填写" ? "" : nextValue;
  const nextRecord = {
    ...currentRecord,
    id: studentId,
    name: field === "name" ? normalizedValue : currentName,
    [field]: normalizedValue,
  };

  state.studentDirectory = setStudentDirectoryRecord(state.studentDirectory, nextRecord);
  saveStudentDirectory(state.studentDirectory);
  render();
}

function renderStudentDetail(label, value) {
  return `
    <div>
      <dt>${escapeHtml(label)}</dt>
      <dd>${escapeHtml(value)}</dd>
    </div>
  `;
}

function openStudentDeleteConfirm(studentId) {
  state.pendingConfirm = { type: "student-delete", studentId: studentId || "" };
  renderStudentDeleteDialog();
}

function openCourseDeleteConfirm(courseKey) {
  state.pendingConfirm = { type: "course-delete", courseKey: courseKey || "" };
  renderStudentDeleteDialog();
}

function openLessonScopeConfirm(action, lessonChanges = null) {
  state.pendingConfirm = {
    type: action === "save" ? "lesson-save" : "lesson-delete",
    lessonId: state.selectedLessonId || "",
    lessonChanges,
  };
  renderStudentDeleteDialog();
}

function closeStudentDeleteConfirm() {
  state.pendingConfirm = null;
  renderStudentDeleteDialog();
}

function renderStudentDeleteDialog() {
  if (!studentDeleteDialogNode) {
    return;
  }

  const dialog = buildPendingConfirmDialog();
  if (!dialog) {
    state.pendingConfirm = null;
    studentDeleteDialogNode.innerHTML = "";
    return;
  }

  studentDeleteDialogNode.innerHTML = `
    <div class="student-delete-backdrop">
      <section
        class="student-delete-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="student-delete-title"
      >
        <span class="student-delete-sticker" aria-hidden="true">♡</span>
        <p class="student-delete-kicker">${escapeHtml(dialog.kicker)}</p>
        <h3 id="student-delete-title">${escapeHtml(dialog.title)}</h3>
        <p>${escapeHtml(dialog.message)}</p>
        <div class="student-delete-actions">
          <button class="student-delete-cancel" data-student-delete-cancel type="button">先不删</button>
          ${dialog.actions
            .map(
              (action) => `
                <button
                  class="${escapeAttribute(action.className)}"
                  data-confirm-action="${escapeAttribute(action.action)}"
                  ${action.action === "student-delete" ? 'data-student-delete-confirm="true"' : ""}
                  ${action.scope ? `data-lesson-scope="${escapeAttribute(action.scope)}"` : ""}
                  type="button"
                >${escapeHtml(action.label)}</button>
              `,
            )
            .join("")}
        </div>
      </section>
    </div>
  `;
}

function buildPendingConfirmDialog() {
  const pending = state.pendingConfirm;
  if (!pending) {
    return null;
  }

  if (pending.type === "student-delete") {
    const student = getStudentDirectoryRows().find((item) => item.id === pending.studentId);
    if (!student) {
      return null;
    }
    const consequence = student.lessonIds.length
      ? `确认后会把 ${student.lessonIds.length} 节未来课程一起同步删除，同事们刷新网站后也会看不到这些课程。`
      : "确认后会把这位学员从总学员列表里隐藏，同事们刷新网站后也会看不到这条名册记录。";
    return {
      kicker: "小心心提醒",
      title: `确定要删除 ${student.name} 吗？`,
      message: `${consequence} 请确认不是手滑哦。`,
      actions: [{ label: "确认删除", action: "student-delete", className: "student-delete-confirm" }],
    };
  }

  if (pending.type === "course-delete") {
    const overview = buildCourseOverview(getEffectiveLessons(), { today: getTodayIsoDate() });
    const card = overview.courseCards.find((item) => item.key === pending.courseKey);
    if (!card) {
      return null;
    }
    return {
      kicker: "课程收纳提醒",
      title: `确定删除 ${card.studentName} · ${card.course} 吗？`,
      message: `确认后会同步删除这组 ${card.lessonIds.length} 节未来课程。请确认不是手滑哦。`,
      actions: [{ label: "确认删除", action: "course-delete", className: "student-delete-confirm" }],
    };
  }

  if (pending.type === "lesson-save" || pending.type === "lesson-delete") {
    const lesson = getEffectiveLessons().find((item) => String(item.id) === String(pending.lessonId));
    if (!lesson) {
      return null;
    }
    const isSave = pending.type === "lesson-save";
    const followingCount = getScopedLessonCount(getCalendarActionLessons(), pending.lessonId, "following");
    return {
      kicker: isSave ? "循环课程小纸条" : "删除课程小纸条",
      title: isSave ? "要修改哪几节课？" : `要删除 ${lesson.studentName} · ${lesson.course} 的哪几节？`,
      message: isSave
        ? "像苹果日历一样，可以只改当前这节，也可以把这节以及后续同系列课程一起更新。"
        : `仅此节会只删除当前课程；此节及后续会同步删除 ${followingCount} 节同系列课程。请确认不是手滑哦。`,
      actions: [
        { label: "仅此节", action: pending.type, scope: "single", className: "student-delete-cancel" },
        { label: "此节及后续", action: pending.type, scope: "following", className: "student-delete-confirm" },
      ],
    };
  }

  return null;
}

function runPendingConfirmAction(action, scope) {
  const pending = state.pendingConfirm;
  if (!pending || action !== pending.type) {
    return;
  }

  if (action === "student-delete") {
    deleteStudentOverviewCard(pending.studentId);
  }

  if (action === "course-delete") {
    deleteCourseOverviewCard(pending.courseKey);
  }

  if (action === "lesson-save") {
    saveSelectedLessonFromDetail(scope, pending.lessonChanges);
  }

  if (action === "lesson-delete") {
    deleteSelectedLessonFromDetail(scope);
  }
}

function renderOverviewEmpty(message) {
  return `<div class="overview-empty">${escapeHtml(message)}</div>`;
}

function renderTrashIcon() {
  return `
    <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24">
      <path d="M4 7h16"></path>
      <path d="M10 11v6"></path>
      <path d="M14 11v6"></path>
      <path d="M6 7l1 13h10l1-13"></path>
      <path d="M9 7V4h6v3"></path>
    </svg>
  `;
}

function renderShiftView() {
  const weekDates = getWeekDates(state.weekStart);
  const selectedDateInWeek = weekDates.some((date) => date.iso === state.selectedShift.date);
  if (!state.selectedShift.teacherId || !selectedDateInWeek) {
    state.selectedShift = {
      teacherId: getShiftRoster()[0]?.id || "",
      date: weekDates[0]?.iso || state.weekStart,
    };
  }

  const manualShiftCount = Object.keys(state.shiftOverrides).length;
  const shiftLessonIndex = buildTeacherDayLessonIndex(filterCalendarLessons(getEffectiveLessons()));
  shiftWeekStartInput.value = state.weekStart;
  shiftSyncLine.textContent = `${manualShiftCount} 个排班已录入，会即时参与候选老师匹配和总课表。`;

  shiftGridNode.innerHTML = `
    <div class="shift-corner">老师</div>
    ${weekDates
      .map(
        (day) => `
          <div class="shift-day-head">
            <strong>${day.iso.slice(5)}</strong>
            <span>${day.label}</span>
          </div>
        `,
      )
      .join("")}
    ${getShiftRoster()
      .map(
        (teacher) => `
          <div class="shift-teacher-name">${escapeHtml(teacher.name)}</div>
          ${weekDates.map((day) => renderShiftCell(teacher, day.iso, shiftLessonIndex)).join("")}
        `,
      )
      .join("")}
  `;

  renderShiftEditor();
}

function renderShiftCell(teacher, date, shiftLessonIndex) {
  const shift = getTeacherShiftForDate(teacher, date, state.shiftOverrides);
  const selected = state.selectedShift.teacherId === teacher.id && state.selectedShift.date === date;
  const lessons = getShiftCellLessons(shiftLessonIndex, teacher, date);
  return `
    <button
      class="shift-cell ${shift.type} ${shift.source} ${selected ? "selected" : ""}"
      data-shift-teacher-id="${escapeAttribute(teacher.id)}"
      data-shift-date="${date}"
      type="button"
    >
      <strong>${escapeHtml(shift.label)}</strong>
      ${renderShiftCampusMeta(shift)}
      ${renderShiftLessonList(lessons, shift)}
    </button>
  `;
}

function renderShiftEditor() {
  const teacher = getShiftRoster().find((item) => item.id === state.selectedShift.teacherId);
  if (!teacher) {
    shiftEditorNode.innerHTML = `<p class="empty-state">请选择一个老师排班格子。</p>`;
    return;
  }

  const key = makeShiftKey(teacher.id, state.selectedShift.date);
  const currentShift = getTeacherShiftForDate(teacher, state.selectedShift.date, state.shiftOverrides);
  const manualShift = state.shiftOverrides[key] || null;
  const editorType = manualShift?.type || (["off", "holiday"].includes(currentShift.type) ? currentShift.type : "work");
  const isWork = editorType === "work";
  const startTime = manualShift?.startTime || currentShift.startTime || "09:00";
  const endTime = manualShift?.endTime || currentShift.endTime || "18:00";
  const campus = manualShift?.campus || currentShift.campus || "浦东";
  const note = manualShift?.note || currentShift.note || "";

  shiftEditorNode.innerHTML = `
    <div class="shift-editor-title">
      ${renderShiftEditorAvatar(teacher.id)}
      <div>
        <strong>${escapeHtml(teacher.name)}</strong>
        <span>${state.selectedShift.date}</span>
      </div>
    </div>

    <label>
      <span>状态</span>
      <select data-shift-field="type" name="shiftType">
        <option value="work" ${editorType === "work" ? "selected" : ""}>上班</option>
        <option value="off" ${editorType === "off" ? "selected" : ""}>休息</option>
        <option value="holiday" ${editorType === "holiday" ? "selected" : ""}>法定假</option>
      </select>
    </label>

    <label>
      <span>校区</span>
      <select data-shift-field="campus" name="shiftCampus" ${isWork ? "" : "disabled"}>
        ${CAMPUS_OPTIONS.map(
          (option) => `<option value="${escapeAttribute(option)}" ${option === campus ? "selected" : ""}>${escapeHtml(option)}</option>`,
        ).join("")}
      </select>
    </label>

    <div class="editor-time-grid">
      <label>
        <span>开始</span>
        <input data-shift-field="start" name="shiftStart" type="time" value="${startTime}" step="900" ${
          isWork ? "" : "disabled"
        } />
      </label>
      <label>
        <span>结束</span>
        <input data-shift-field="end" name="shiftEnd" type="time" value="${endTime}" step="900" ${
          isWork ? "" : "disabled"
        } />
      </label>
    </div>

    <label>
      <span>备注</span>
      <input data-shift-field="note" name="shiftNote" value="${escapeAttribute(note)}" placeholder="可选" />
    </label>

    <div class="editor-actions">
      <button class="primary-button" data-shift-action="clear" type="button">恢复默认</button>
    </div>
  `;
}

function renderCoursePermissions() {
  const teacherIds = getCandidateTeacherIds();
  const courseList = getCourses();
  const permissions = normalizeCoursePermissions(state.coursePermissions, teacherIds, courseList);
  state.coursePermissions = permissions;
  const allowedCount = countAllowedCourseCells(permissions, teacherIds, courseList);

  permissionSyncLine.textContent = `${allowedCount} 个课程权限已开启，会即时参与候选老师匹配。`;
  permissionGridNode.innerHTML = `
    <div class="permission-table-wrap">
      <table class="permission-table">
        <thead>
          <tr>
            <th scope="col">老师</th>
            ${courseList.map((course) => `<th scope="col">${escapeHtml(course)}</th>`).join("")}
            <th scope="col">当前可上</th>
          </tr>
        </thead>
        <tbody>
          ${getCandidateTeachers().map((teacher) => renderPermissionRow(teacher, permissions)).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderPermissionRow(teacher, permissions) {
  const allowedCourses = permissions[teacher.id] || [];
  const allowedSet = new Set(allowedCourses);

  return `
    <tr>
      <th scope="row">${escapeHtml(teacher.name)}</th>
      ${getCourses().map((course) => renderPermissionToggle(teacher, course, allowedSet.has(course))).join("")}
      <td class="permission-summary">${escapeHtml(allowedCourses.join("、") || "未开放")}</td>
    </tr>
  `;
}

function renderPermissionToggle(teacher, course, isChecked) {
  const label = `${teacher.name} 可上 ${course}`;
  return `
    <td>
      <label class="permission-toggle" title="${escapeAttribute(label)}">
        <input
          type="checkbox"
          data-permission-teacher-id="${escapeAttribute(teacher.id)}"
          data-permission-course="${escapeAttribute(course)}"
          ${isChecked ? "checked" : ""}
          aria-label="${escapeAttribute(label)}"
        />
        <span aria-hidden="true"></span>
      </label>
    </td>
  `;
}

function createDraftCalendarLesson() {
  const teacher = getCandidateTeachers()[0] || { id: "", name: "" };
  const course = getCourses()[0] || "未填写";
  const date = state.weekStart;
  const id = `manual-${Date.now()}`;
  state.selectedLessonId = id;
  state.draftLesson = {
    id,
    teacherId: teacher.id,
    teacherName: teacher.name,
    studentName: "新学员",
    course,
    grade: "",
    deliveryType: deriveDeliveryTypeFromCampus("徐汇"),
    campus: "徐汇",
    date,
    startTime: "09:00",
    endTime: "10:00",
    durationMinutes: 60,
    sessionCount: 1,
    recurrenceWeekdays: [getWeekdayValue(date)],
    status: "手动新增",
    notes: "",
  };
  renderCalendar();
}

function addTeacherFromPermissionForm() {
  const input = permissionAddForm.querySelector('[name="newTeacherName"]');
  const nextCatalog = addCustomTeacher(state.customCatalog, input?.value || "");
  if (nextCatalog === state.customCatalog) {
    return;
  }

  state.customCatalog = nextCatalog;
  saveCustomCatalog(state.customCatalog);
  state.coursePermissions = normalizeCoursePermissions(state.coursePermissions, getCandidateTeacherIds(), getCourses());
  saveCoursePermissions(state.coursePermissions);
  if (input) {
    input.value = "";
  }
  render();
}

function addCourseFromPermissionForm() {
  const input = permissionAddForm.querySelector('[name="newCourseName"]');
  const previousCourses = new Set(getCourses());
  const nextCatalog = addCustomCourse(state.customCatalog, input?.value || "");
  if (nextCatalog === state.customCatalog) {
    return;
  }

  state.customCatalog = nextCatalog;
  saveCustomCatalog(state.customCatalog);
  refreshPlannerCourseOptions();
  state.coursePermissions = addDefaultPermissionsForNewCourses(
    state.coursePermissions,
    getCandidateTeacherIds(),
    getCourses(),
    previousCourses,
  );
  saveCoursePermissions(state.coursePermissions);
  if (input) {
    input.value = "";
  }
  render();
}

function addDefaultPermissionsForNewCourses(rawPermissions, teacherIds, courseList, previousCourses) {
  const normalized = normalizeCoursePermissions(rawPermissions, teacherIds, courseList);
  const defaults = buildDefaultCoursePermissions(teacherIds, courseList);
  const addedCourses = courseList.filter((course) => !previousCourses.has(course));

  if (!addedCourses.length) {
    return normalized;
  }

  return Object.fromEntries(
    teacherIds.map((teacherId) => {
      const allowed = new Set(normalized[teacherId] || []);
      for (const course of addedCourses) {
        if (defaults[teacherId]?.includes(course)) {
          allowed.add(course);
        }
      }
      return [teacherId, courseList.filter((course) => allowed.has(course))];
    }),
  );
}

function setSelectedShift(shift) {
  const key = makeShiftKey(state.selectedShift.teacherId, state.selectedShift.date);
  state.shiftOverrides = {
    ...state.shiftOverrides,
    [key]: compactShift(shift),
  };
  saveShiftOverrides(state.shiftOverrides);
  render();
}

function saveSelectedShiftFromEditor() {
  const type = shiftEditorNode.querySelector('[name="shiftType"]')?.value || "work";
  const campus = shiftEditorNode.querySelector('[name="shiftCampus"]')?.value || "浦东";
  const startTime = shiftEditorNode.querySelector('[name="shiftStart"]')?.value || "09:00";
  const endTime = shiftEditorNode.querySelector('[name="shiftEnd"]')?.value || "18:00";
  const note = shiftEditorNode.querySelector('[name="shiftNote"]')?.value.trim() || "";

  if (type === "work" && parseTimeToMinutes(startTime) >= parseTimeToMinutes(endTime)) {
    return;
  }

  setSelectedShift({
    type,
    label: getDefaultShiftLabel(type, campus, startTime, endTime),
    ...(note ? { note } : {}),
    ...(type === "work" ? { campus, startTime, endTime } : {}),
  });
}

function requestSelectedLessonSave() {
  if (!state.selectedLessonId) {
    return;
  }

  const detailForm = document.querySelector("#lesson-detail-form");
  if (!detailForm) {
    return;
  }

  const lessonChanges = readLessonChangesFromDetailForm(detailForm);
  if (!lessonChanges) {
    return;
  }

  if (state.draftLesson?.id === state.selectedLessonId) {
    saveSelectedLessonFromDetail("following", lessonChanges);
    return;
  }

  openLessonScopeConfirm("save", lessonChanges);
}

function saveSelectedLessonFromDetail(scope = "single", lessonChanges = null) {
  if (!state.selectedLessonId) {
    return;
  }

  const changes = lessonChanges || readLessonChangesFromDetailForm(document.querySelector("#lesson-detail-form"));
  if (!changes) {
    return;
  }

  if (state.draftLesson?.id === state.selectedLessonId) {
    state.lessonEdits = setManualLessonSeries(state.lessonEdits, state.selectedLessonId, changes);
    state.draftLesson = null;
  } else {
    state.lessonEdits = updateLessonsInScope(
      getCalendarActionLessons(),
      state.lessonEdits,
      state.selectedLessonId,
      scope,
      changes,
    );
  }

  saveLessonEdits(state.lessonEdits);
  closeLessonDetailToPlanner();
  render();
}

function closeLessonDetailToPlanner() {
  state.selectedLessonId = null;
  state.draftLesson = null;
  state.view = "planner";
}

function readLessonChangesFromDetailForm(detailForm) {
  const formData = new FormData(detailForm);
  const startTime = String(formData.get("startTime") || "09:00");
  const durationMinutes = Number(formData.get("durationMinutes") || 60);
  const endMinutes = parseTimeToMinutes(startTime) + durationMinutes;
  if (!Number.isFinite(durationMinutes) || durationMinutes <= 0 || endMinutes > 24 * 60) {
    return null;
  }

  const endTime = formatMinutesToTime(endMinutes);
  const teacherId = String(formData.get("teacherId") || "");
  const teacher = getCandidateTeachers().find((item) => item.id === teacherId);
  const campus = String(formData.get("campus") || "");
  const startDate = String(formData.get("startDate") || "");
  const date = String(formData.get("date") || "");
  const normalizedStartDate = startDate || date;
  const originalStartDate = String(detailForm.dataset.originalStartDate || "");
  const explicitStartDate = String(detailForm.dataset.explicitStartDate || "");
  const selectedDate = String(detailForm.dataset.selectedDate || date);
  const selectedWeekdays = formData
    .getAll("weekdays")
    .map(Number)
    .filter((weekday) => WEEKDAYS.some((day) => day.value === weekday));
  const sessionCount = Math.max(1, Number(formData.get("sessionCount") || 1));
  const regenerateSeriesDates = Boolean(
    normalizedStartDate &&
      (normalizedStartDate !== originalStartDate || (explicitStartDate && explicitStartDate !== selectedDate)),
  );

  return {
    teacherId,
    teacherName: teacher?.name || teacherId,
    studentName: String(formData.get("studentName") || "未填写"),
    course: String(formData.get("course") || "未填写"),
    grade: String(formData.get("grade") || ""),
    deliveryType: campus ? deriveDeliveryTypeFromCampus(campus) : "",
    campus,
    startDate: normalizedStartDate,
    date,
    startTime,
    endTime,
    durationMinutes,
    sessionCount,
    recurrenceWeekdays: selectedWeekdays.length ? selectedWeekdays : [getWeekdayValue(normalizedStartDate || date)],
    regenerateSeriesDates,
    notes: String(formData.get("notes") || ""),
    status: state.draftLesson?.id === state.selectedLessonId ? "手动新增" : "已编辑",
  };
}

function appendLessonStudentName(detailForm) {
  if (!detailForm) {
    return;
  }

  const studentInput = detailForm.querySelector("[name='studentName']");
  const addInput = detailForm.querySelector("[data-lesson-student-add-input]");
  if (!studentInput || !addInput) {
    return;
  }

  const currentNames = splitStudentNames(studentInput.value);
  const addedNames = splitStudentNames(addInput.value);
  if (!addedNames.length) {
    addInput.focus();
    return;
  }

  const names = [];
  const seenNames = new Set();
  for (const name of [...currentNames, ...addedNames]) {
    const key = name.toLocaleLowerCase("zh-Hans-CN");
    if (seenNames.has(key)) {
      continue;
    }
    seenNames.add(key);
    names.push(name);
  }

  studentInput.value = names.join("、");
  addInput.value = "";
  addInput.focus();
}

function updateLessonEndDatePreview(detailForm) {
  const endDateInput = detailForm.querySelector("[data-lesson-end-date-preview]");
  if (!endDateInput) {
    return;
  }

  const formData = new FormData(detailForm);
  const startDate = String(formData.get("startDate") || formData.get("date") || "");
  const sessionCount = Math.max(1, Number(formData.get("sessionCount") || 1));
  const weekdays = formData
    .getAll("weekdays")
    .map(Number)
    .filter((weekday) => WEEKDAYS.some((day) => day.value === weekday));

  endDateInput.value = calculateLessonEndDate(startDate, weekdays, sessionCount) || "未填写";
}

function calculateLessonEndDate(startDate, weekdays, sessionCount) {
  const normalizedStart = String(startDate || "").trim();
  const count = Number(sessionCount || 0);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalizedStart) || !count) {
    return "";
  }

  const selectedWeekdays = Array.isArray(weekdays) && weekdays.length ? weekdays : [getWeekdayValue(normalizedStart)];
  const weekdaySet = new Set(selectedWeekdays.map(Number));
  const cursor = new Date(`${normalizedStart}T00:00:00Z`);
  const maxDaysToScan = Math.max(14, count * 10 + 14);
  let matched = 0;

  for (let offset = 0; offset <= maxDaysToScan; offset += 1) {
    const candidate = new Date(cursor);
    candidate.setUTCDate(cursor.getUTCDate() + offset);
    const candidateDate = candidate.toISOString().slice(0, 10);
    if (!weekdaySet.has(getWeekdayValue(candidateDate))) {
      continue;
    }

    matched += 1;
    if (matched >= count) {
      return candidateDate;
    }
  }

  return "";
}

function setManualLessonSeries(rawEdits, baseLessonId, lessonChanges) {
  const { regenerateSeriesDates, ...persistedLessonChanges } = lessonChanges;
  const lessons = expandRecurringLessons({
    studentName: persistedLessonChanges.studentName,
    course: persistedLessonChanges.course,
    grade: persistedLessonChanges.grade,
    deliveryType: persistedLessonChanges.deliveryType,
    campus: persistedLessonChanges.campus,
    startDate: persistedLessonChanges.startDate || persistedLessonChanges.date,
    startTime: persistedLessonChanges.startTime,
    durationMinutes: persistedLessonChanges.durationMinutes,
    sessionCount: persistedLessonChanges.sessionCount,
    weekdays: persistedLessonChanges.recurrenceWeekdays,
  });
  return lessons.reduce((edits, lesson, index) => {
    const id = index === 0 ? baseLessonId : `${baseLessonId}-${index + 1}`;
    return setLessonEdit(edits, id, {
      ...persistedLessonChanges,
      ...lesson,
      teacherId: persistedLessonChanges.teacherId,
      teacherName: persistedLessonChanges.teacherName,
      status: "手动新增",
      notes: persistedLessonChanges.notes,
    });
  }, rawEdits);
}

function deleteCourseOverviewCard(courseKey) {
  const overview = buildCourseOverview(getEffectiveLessons(), { today: getTodayIsoDate() });
  const card = overview.courseCards.find((item) => item.key === courseKey);
  if (!card || !card.lessonIds.length) {
    return;
  }

  deleteLessonsByIds(card.lessonIds);
}

function openCourseInLessonEditor(courseKey) {
  const lessons = getEffectiveLessons();
  const overview = buildCourseOverview(lessons, { today: getTodayIsoDate() });
  const card = overview.courseCards.find((item) => item.key === courseKey);
  const lesson = card?.lessonIds.length
    ? lessons.find((item) => String(item.id) === String(card.lessonIds[0]))
    : null;
  if (!lesson) {
    return;
  }

  state.view = "planner";
  state.selectedLessonId = lesson.id;
  state.draftLesson = null;
  state.weekStart = getWeekStartForDate(lesson.date);
  weekStartInput.value = state.weekStart;
  shiftWeekStartInput.value = state.weekStart;
  render();
}

function deleteStudentOverviewCard(studentId) {
  const student = getStudentDirectoryRows().find((item) => item.id === studentId);
  if (!student) {
    return;
  }

  state.studentDirectory = hideStudentDirectoryRecord(state.studentDirectory, student.id);
  saveStudentDirectory(state.studentDirectory);

  if (student.lessonIds.length) {
    deleteLessonsByIds(student.lessonIds);
    return;
  }

  render();
}

function deleteLessonsByIds(lessonIds) {
  const ids = Array.from(new Set(lessonIds.map(String).filter(Boolean)));
  if (!ids.length) {
    return;
  }

  state.lessonEdits = ids.reduce((edits, lessonId) => deleteLessonEdit(edits, lessonId), state.lessonEdits);
  if (ids.includes(String(state.selectedLessonId))) {
    state.selectedLessonId = null;
    state.draftLesson = null;
  }
  saveLessonEdits(state.lessonEdits);
  render();
}

function requestSelectedLessonDelete() {
  if (!state.selectedLessonId) {
    return;
  }

  openLessonScopeConfirm("delete");
}

function deleteSelectedLessonFromDetail(scope = "single") {
  if (!state.selectedLessonId) {
    return;
  }

  if (state.draftLesson?.id === state.selectedLessonId) {
    closeLessonDetailToPlanner();
    render();
    return;
  }

  state.lessonEdits = deleteLessonsInScope(getCalendarActionLessons(), state.lessonEdits, state.selectedLessonId, scope);
  closeLessonDetailToPlanner();
  saveLessonEdits(state.lessonEdits);
  render();
}

function clearSelectedShift() {
  const key = makeShiftKey(state.selectedShift.teacherId, state.selectedShift.date);
  const nextOverrides = { ...state.shiftOverrides };
  delete nextOverrides[key];
  state.shiftOverrides = nextOverrides;
  saveShiftOverrides(state.shiftOverrides);
  render();
}

async function initializeRemoteSync() {
  try {
    const config = await loadRemoteStoreConfig();
    remoteStore = createRemoteStore({ config });
    document.documentElement.dataset.remoteSync = remoteStore.isConfigured ? "enabled" : "local";
    if (!remoteStore.isConfigured) {
      remoteSyncReady = false;
      state.sync = {
        status: "local",
        email: "",
        message: "本地保存中。配置 Supabase 后可开启同事共享同步。",
      };
      renderSyncPanel();
      return;
    }

    const session = await remoteStore.getSession();
    if (!session && config.requireAuth !== false) {
      remoteSyncReady = false;
      state.sync = {
        status: "auth",
        email: "",
        message: "输入工作邮箱后，用邮件链接登录即可同步编辑。",
      };
      renderSyncPanel();
      await remoteStore.onAuthStateChange((_event, nextSession) => {
        if (nextSession) {
          initializeRemoteSync();
        }
      });
      return;
    }

    state.sync = {
      status: "syncing",
      email: session?.user?.email || "",
      message: "正在读取云端排课数据...",
    };
    renderSyncPanel();

    const remoteBuckets = await remoteStore.loadAll();
    if (applyRemoteBuckets(remoteBuckets)) {
      render();
    }

    remoteSyncReady = true;
    state.sync = {
      status: "synced",
      email: session?.user?.email || "",
      message: "云端同步已开启，保存后同事会看到更新。",
    };
    renderSyncPanel();

    await remoteStore.subscribe((bucket, payload) => {
      if (applyRemoteBuckets({ [bucket]: payload })) {
        render();
      }
    });
  } catch (error) {
    document.documentElement.dataset.remoteSync = "error";
    remoteSyncReady = false;
    state.sync = {
      status: "error",
      email: state.sync.email,
      message: "云端同步暂不可用，当前仍会保存到本机浏览器。",
    };
    renderSyncPanel();
    console.warn("Supabase sync is unavailable; using local storage only.", error);
  }
}

async function requestSyncSignIn(form) {
  const email = String(new FormData(form).get("syncEmail") || "").trim();
  if (!email) {
    state.sync = {
      ...state.sync,
      status: "auth",
      message: "请先填写工作邮箱。",
    };
    renderSyncPanel();
    return;
  }

  try {
    state.sync = {
      ...state.sync,
      status: "syncing",
      email,
      message: "正在发送登录邮件...",
    };
    renderSyncPanel();
    await remoteStore.signInWithOtp(email);
    state.sync = {
      ...state.sync,
      status: "auth",
      email,
      message: "登录链接已发送，请在邮箱中打开后回到这个页面。",
    };
    renderSyncPanel();
  } catch (error) {
    state.sync = {
      ...state.sync,
      status: "error",
      email,
      message: "登录邮件发送失败，请检查邮箱或 Supabase 配置。",
    };
    renderSyncPanel();
    console.warn("Could not send Supabase magic link.", error);
  }
}

async function signOutFromRemoteSync() {
  try {
    await remoteStore.signOut();
  } catch (error) {
    console.warn("Could not sign out from Supabase.", error);
  }

  remoteSyncReady = false;
  state.sync = {
    status: "auth",
    email: "",
    message: "已退出云端同步。重新输入邮箱可继续共享编辑。",
  };
  renderSyncPanel();
}

function renderSyncPanel() {
  if (!syncPanelNode) {
    return;
  }

  const shouldShowAuthForm = state.sync.status === "auth" || (state.sync.status === "error" && !state.sync.email);

  if (shouldShowAuthForm) {
    syncPanelNode.innerHTML = `
      <div class="sync-copy">
        <strong>${state.sync.status === "error" ? "云端同步需要检查" : "云端同步登录"}</strong>
        <span>${escapeHtml(state.sync.message)}</span>
      </div>
      <form id="sync-form" class="sync-form">
        <input name="syncEmail" type="email" placeholder="同事邮箱" value="${escapeAttribute(state.sync.email)}" />
        <button type="submit">发送登录链接</button>
      </form>
    `;
    return;
  }

  const syncTitles = {
    local: "本地保存模式",
    syncing: "正在同步",
    synced: "云端同步已开启",
    error: "云端同步需要检查",
  };
  syncPanelNode.innerHTML = `
    <div class="sync-copy">
      <strong>${syncTitles[state.sync.status] || "本地保存模式"}</strong>
      <span>${escapeHtml(state.sync.message)}</span>
    </div>
    ${
      state.sync.email
        ? `<button class="sync-signout-button" data-sync-action="sign-out" type="button">${escapeHtml(state.sync.email)} · 退出</button>`
        : ""
    }
  `;
}

function applyRemoteBuckets(buckets) {
  if (!buckets || typeof buckets !== "object") {
    return false;
  }

  let changed = false;

  if (REMOTE_BUCKETS.customCatalog in buckets) {
    state.customCatalog = normalizeCustomCatalog(buckets[REMOTE_BUCKETS.customCatalog]);
    saveLocalCustomCatalog(state.customCatalog);
    changed = true;
  }

  if (REMOTE_BUCKETS.shiftOverrides in buckets) {
    state.shiftOverrides = hydrateShiftOverrides(buckets[REMOTE_BUCKETS.shiftOverrides]);
    saveLocalShiftOverrides(state.shiftOverrides);
    changed = true;
  }

  if (REMOTE_BUCKETS.lessonEdits in buckets) {
    state.lessonEdits = normalizeLessonEdits(buckets[REMOTE_BUCKETS.lessonEdits]);
    saveLocalLessonEdits(state.lessonEdits);
    changed = true;
  }

  if (REMOTE_BUCKETS.studentDirectory in buckets) {
    state.studentDirectory = normalizeStudentDirectory(buckets[REMOTE_BUCKETS.studentDirectory]);
    saveLocalStudentDirectory(state.studentDirectory);
    changed = true;
  }

  if (REMOTE_BUCKETS.coursePermissions in buckets || REMOTE_BUCKETS.customCatalog in buckets) {
    const nextPermissions =
      REMOTE_BUCKETS.coursePermissions in buckets
        ? buckets[REMOTE_BUCKETS.coursePermissions]
        : state.coursePermissions;
    state.coursePermissions = normalizeCoursePermissions(nextPermissions, getCandidateTeacherIds(), getCourses());
    saveLocalCoursePermissions(state.coursePermissions);
    changed = true;
  }

  return changed;
}

function saveRemoteBucket(bucket, payload) {
  if (!remoteStore.isConfigured || !remoteSyncReady) {
    showSaveFeedback("数据已保存到本机浏览器。登录云端同步后，同事可看到更新。", "local");
    return;
  }

  const token = showSaveFeedback("正在同步编辑内容...", "syncing");
  remoteStore
    .saveBucket(bucket, payload)
    .then(() => {
      if (token === saveFeedbackToken) {
        showSaveFeedback("数据已编辑成功，并同步到网站上。", "synced");
      }
    })
    .catch((error) => {
      document.documentElement.dataset.remoteSync = "error";
      if (token === saveFeedbackToken) {
        showSaveFeedback("保存到本机成功，但云端同步失败。请稍后再试。", "error");
      }
      console.warn(`Could not sync ${bucket} to Supabase.`, error);
    });
}

function showSaveFeedback(message, status = "synced") {
  saveFeedbackToken += 1;
  state.sync = {
    ...state.sync,
    status,
    message,
  };
  renderSyncPanel();
  return saveFeedbackToken;
}

function compactShift(shift) {
  if (shift.type === "work") {
    return {
      type: "work",
      label: shift.label || getDefaultShiftLabel("work", shift.campus || "浦东", shift.startTime, shift.endTime),
      campus: shift.campus || "浦东",
      startTime: shift.startTime,
      endTime: shift.endTime,
      ...(shift.note ? { note: shift.note } : {}),
    };
  }

  if (shift.type === "holiday") {
    return {
      type: "holiday",
      label: shift.label || "法定",
      ...(shift.note ? { note: shift.note } : {}),
    };
  }

  return {
    type: "off",
    label: shift.label || "休",
    ...(shift.note ? { note: shift.note } : {}),
  };
}

function getDefaultShiftLabel(type, campus, startTime, endTime) {
  return buildShiftLabel({ type, campus, startTime, endTime });
}

function getEffectiveTeachers() {
  const permissionedTeachers = applyCoursePermissions(getCandidateTeachers(), state.coursePermissions, getCourses());
  return mergeTeacherShiftOverrides(permissionedTeachers, state.shiftOverrides);
}

function getEffectiveLessons() {
  const activeTeacherIds = new Set(baseCandidateTeachers.map((teacher) => teacher.id));
  return alignExplicitSeriesDates(applyLessonEdits(
    [...existingLessons, ...buildUnavailableLessonsFromShifts(getShiftRoster(), state.shiftOverrides)],
    state.lessonEdits,
  ), { deletedIds: state.lessonEdits.deletedIds }).filter((lesson) => activeTeacherIds.has(lesson.teacherId));
}

function getCalendarActionLessons() {
  const lessons = filterCalendarLessons(getEffectiveLessons());
  if (!state.draftLesson) {
    return lessons;
  }

  return [...lessons.filter((lesson) => lesson.id !== state.draftLesson.id), state.draftLesson];
}

function renderShiftCellMeta(shift) {
  if (["work", "template"].includes(shift.type) && shift.campus) {
    return shift.campus;
  }

  return "";
}

function getShiftCellLessons(shiftLessonIndex, teacher, date) {
  const idKey = teacher.id ? `${teacher.id}__${date}` : "";
  const nameKey = teacher.name ? `${teacher.name}__${date}` : "";
  return shiftLessonIndex.get(idKey) || shiftLessonIndex.get(nameKey) || [];
}

function renderShiftCampusMeta(shift) {
  const campus = renderShiftCellMeta(shift);
  if (!campus) {
    return "";
  }

  return `<span class="shift-campus-label ${getShiftCampusClass(campus)}">${escapeHtml(campus)}</span>`;
}

function renderShiftLessonList(lessons, shift) {
  if (!lessons.length) {
    return "";
  }

  const visibleLessons = lessons.slice(0, 3);
  const overflowCount = lessons.length - visibleLessons.length;
  return `
    <span class="shift-lesson-list" aria-label="当天课程">
      ${visibleLessons.map((lesson) => renderShiftLessonChip(lesson, shift.campus)).join("")}
      ${overflowCount > 0 ? `<span class="shift-lesson-more">+ ${overflowCount} 节</span>` : ""}
    </span>
  `;
}

function renderShiftLessonChip(lesson, fallbackCampus) {
  const campus = resolveShiftLessonCampus(lesson.campus, fallbackCampus);
  return `
    <span class="shift-lesson-chip ${getShiftCampusClass(campus)}">
      <span class="shift-lesson-time">${escapeHtml(lesson.timeLabel)}</span>
      <span class="shift-lesson-title">${escapeHtml(lesson.studentName)} · ${escapeHtml(lesson.course)}</span>
      <span class="shift-lesson-campus">${escapeHtml(campus)}</span>
    </span>
  `;
}

function resolveShiftLessonCampus(campus, fallbackCampus) {
  const value = String(campus || "").trim();
  if (value.includes("徐汇") || value.includes("浦东")) {
    return value;
  }

  const fallback = String(fallbackCampus || "").trim();
  if (fallback.includes("徐汇") || fallback.includes("浦东")) {
    return fallback;
  }

  return value || fallback || "未填写";
}

function getShiftCampusClass(campus) {
  const value = String(campus || "");
  if (value.includes("徐汇")) {
    return "shift-campus-xuhui";
  }
  if (value.includes("浦东")) {
    return "shift-campus-pudong";
  }
  return "shift-campus-neutral";
}

function readRequest() {
  const formData = new FormData(form);
  const weekdays = formData.getAll("weekdays").map(Number);
  const campus = String(formData.get("campus"));

  return {
    studentName: String(formData.get("studentName") || "新学员"),
    course: String(formData.get("course")),
    grade: String(formData.get("grade")),
    deliveryType: deriveDeliveryTypeFromCampus(campus),
    campus,
    startDate: String(formData.get("startDate")),
    startTime: String(formData.get("startTime")),
    durationMinutes: Number(formData.get("durationMinutes") || 180),
    sessionCount: Math.max(1, Number(formData.get("sessionCount") || 1)),
    weekdays: weekdays.length ? weekdays : [1],
  };
}

function renderOptions(values, selectedValue) {
  return values
    .map((value) => `<option value="${value}" ${value === selectedValue ? "selected" : ""}>${value}</option>`)
    .join("");
}

function getWeekDates(weekStart) {
  const start = new Date(`${weekStart}T00:00:00Z`);
  return WEEKDAYS.map((day, index) => {
    const date = new Date(start);
    date.setUTCDate(start.getUTCDate() + index);
    return {
      iso: date.toISOString().slice(0, 10),
      label: day.label,
    };
  });
}

function getWeekStartForDate(dateString) {
  const date = new Date(`${dateString}T00:00:00Z`);
  const weekday = getWeekdayValue(dateString);
  date.setUTCDate(date.getUTCDate() - weekday + 1);
  return date.toISOString().slice(0, 10);
}

function getTodayIsoDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDateForDisplay(dateString) {
  return String(dateString || "").replaceAll("-", "/");
}

function getWeekdayValue(dateString) {
  const day = new Date(`${dateString}T00:00:00Z`).getUTCDay();
  return day === 0 ? 7 : day || 1;
}

function getCandidateTeachers() {
  return mergeCatalog(baseCandidateTeachers, baseCourses, state.customCatalog).teachers;
}

function getCourses() {
  return mergeCatalog(baseCandidateTeachers, baseCourses, state.customCatalog).courses;
}

function getShiftRoster() {
  return mergeCatalog(baseShiftRoster, baseCourses, state.customCatalog).teachers;
}

function getCandidateTeacherIds() {
  return getCandidateTeachers().map((teacher) => teacher.id);
}

function refreshPlannerCourseOptions() {
  const courseSelect = form.querySelector('[name="course"]');
  if (!courseSelect) {
    return;
  }

  const selectedValue = courseSelect.value;
  courseSelect.innerHTML = renderOptions(getCourses(), selectedValue);
  if (!getCourses().includes(selectedValue)) {
    courseSelect.value = getCourses()[0] || "";
  }
}

function loadCustomCatalog() {
  try {
    const raw = localStorage.getItem(CUSTOM_CATALOG_STORAGE_KEY);
    return normalizeCustomCatalog(raw ? JSON.parse(raw) : {});
  } catch {
    return normalizeCustomCatalog({});
  }
}

function loadShiftOverrides() {
  try {
    const raw = localStorage.getItem(SHIFT_STORAGE_KEY);
    if (!raw) {
      return { ...defaultShiftOverrides };
    }

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }

    return hydrateShiftOverrides(parsed);
  } catch {
    return { ...defaultShiftOverrides };
  }
}

function loadCoursePermissions() {
  const teacherIds = getCandidateTeacherIds();
  try {
    const raw = localStorage.getItem(COURSE_PERMISSION_STORAGE_KEY);
    if (!raw) {
      return buildDefaultCoursePermissions(teacherIds, getCourses());
    }

    const parsed = JSON.parse(raw);
    return normalizeCoursePermissions(parsed, teacherIds, getCourses());
  } catch {
    return buildDefaultCoursePermissions(teacherIds, getCourses());
  }
}

function loadLessonEdits() {
  try {
    const raw = localStorage.getItem(LESSON_EDIT_STORAGE_KEY);
    return restoreDeletedLessonsIfRequested(normalizeLessonEdits(raw ? JSON.parse(raw) : {}));
  } catch {
    return restoreDeletedLessonsIfRequested(normalizeLessonEdits({}));
  }
}

function loadStudentDirectory() {
  try {
    const raw = localStorage.getItem(STUDENT_DIRECTORY_STORAGE_KEY);
    return normalizeStudentDirectory(raw ? JSON.parse(raw) : {});
  } catch {
    return normalizeStudentDirectory({});
  }
}

function restoreDeletedLessonsIfRequested(edits) {
  if (typeof window === "undefined") {
    return edits;
  }

  const url = new URL(window.location.href);
  if (url.searchParams.get("restoreDeletedLessons") !== "1") {
    return edits;
  }

  const deletedCount = edits.deletedIds.length;
  const restored = restoreDeletedLessonEdits(edits);
  const restoredAt = new Date().toISOString();
  const backupKey = deletedCount
    ? `${LESSON_EDIT_RESTORE_BACKUP_PREFIX}-${restoredAt.replace(/[:.]/g, "-")}`
    : "";
  const result = {
    restoredAt,
    restoredDeletedCount: deletedCount,
    backupKey,
  };

  if (deletedCount) {
    localStorage.setItem(backupKey, JSON.stringify(edits));
    localStorage.setItem(LESSON_EDIT_STORAGE_KEY, JSON.stringify(restored));
  }
  localStorage.setItem(LESSON_EDIT_RESTORE_RESULT_KEY, JSON.stringify(result));
  document.documentElement.dataset.lessonRestoreCount = String(deletedCount);
  document.documentElement.dataset.lessonRestoreBackup = backupKey;

  url.searchParams.delete("restoreDeletedLessons");
  window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);

  return restored;
}

function saveShiftOverrides(shifts) {
  saveLocalShiftOverrides(shifts);
  saveRemoteBucket(REMOTE_BUCKETS.shiftOverrides, shifts);
}

function saveCoursePermissions(permissions) {
  saveLocalCoursePermissions(permissions);
  saveRemoteBucket(REMOTE_BUCKETS.coursePermissions, permissions);
}

function saveCustomCatalog(catalog) {
  const normalizedCatalog = normalizeCustomCatalog(catalog);
  saveLocalCustomCatalog(normalizedCatalog);
  saveRemoteBucket(REMOTE_BUCKETS.customCatalog, normalizedCatalog);
}

function saveLessonEdits(edits) {
  const normalizedEdits = normalizeLessonEdits(edits);
  saveLocalLessonEdits(normalizedEdits);
  saveRemoteBucket(REMOTE_BUCKETS.lessonEdits, normalizedEdits);
}

function saveStudentDirectory(directory) {
  const normalizedDirectory = normalizeStudentDirectory(directory);
  saveLocalStudentDirectory(normalizedDirectory);
  saveRemoteBucket(REMOTE_BUCKETS.studentDirectory, normalizedDirectory);
}

function saveLocalShiftOverrides(shifts) {
  localStorage.setItem(SHIFT_STORAGE_KEY, JSON.stringify(shifts));
}

function saveLocalCoursePermissions(permissions) {
  localStorage.setItem(COURSE_PERMISSION_STORAGE_KEY, JSON.stringify(permissions));
}

function saveLocalCustomCatalog(catalog) {
  localStorage.setItem(CUSTOM_CATALOG_STORAGE_KEY, JSON.stringify(normalizeCustomCatalog(catalog)));
}

function saveLocalLessonEdits(edits) {
  localStorage.setItem(LESSON_EDIT_STORAGE_KEY, JSON.stringify(normalizeLessonEdits(edits)));
}

function saveLocalStudentDirectory(directory) {
  localStorage.setItem(STUDENT_DIRECTORY_STORAGE_KEY, JSON.stringify(normalizeStudentDirectory(directory)));
}

function hydrateShiftOverrides(shifts) {
  const hydrated = { ...defaultShiftOverrides };

  for (const [key, shift] of Object.entries(shifts)) {
    const defaultShift = defaultShiftOverrides[key] || {};
    hydrated[key] = {
      ...defaultShift,
      ...shift,
      ...(shift.type === "work" ? { campus: shift.campus || defaultShift.campus || inferCampus(shift) } : {}),
    };
  }

  return hydrated;
}

function inferCampus(shift) {
  if (String(shift.label || "").startsWith("徐汇")) {
    return "徐汇";
  }

  if (String(shift.label || "").startsWith("上门")) {
    return "上门";
  }

  return "浦东";
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[char];
  });
}

function escapeCssString(value) {
  return String(value ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/[\n\r\f]/g, "");
}

function escapeAttribute(value) {
  return escapeHtml(value);
}
