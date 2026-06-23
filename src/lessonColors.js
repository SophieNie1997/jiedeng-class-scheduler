export const lessonColorPalette = [
  "green",
  "blue",
  "rose",
  "orange",
  "violet",
  "peach",
  "lilac",
  "teal",
  "amber",
  "cyan",
  "mint",
  "coral",
  "lavender",
  "butter",
  "aqua",
  "mauve",
  "olive",
  "steel",
  "plum",
  "sand",
  "seafoam",
  "berry",
  "periwinkle",
  "sage",
];

export const teacherColorFamilies = {
  claire: ["rose", "plum", "berry", "mauve"],
  phebe: ["violet", "periwinkle", "lilac", "lavender"],
  sophie: ["green", "olive", "mint", "sage"],
  lynn: ["teal", "blue", "periwinkle", "seafoam", "steel", "cyan", "aqua"],
  tiana: ["orange", "butter", "coral", "amber", "peach", "sand"],
  catherine: ["sand", "peach", "steel", "aqua"],
};

export const lessonColorOverrides = new Map([
  ["lynn|orion 复习", "blue"],
  ["lynn|ziyi上门", "teal"],
  ["lynn|语文课程", "periwinkle"],
  ["tiana|patrick+val", "orange"],
  ["tiana|patrick+valerie", "orange"],
  ["tiana|kason", "butter"],
]);

export function createCourseColorResolver(
  palette = lessonColorPalette,
  overrides = lessonColorOverrides,
  teacherFamilies = teacherColorFamilies,
) {
  const assignedColors = new Map();
  const fallbackFamilies = new Map();
  const usedColorsByTeacher = new Map();
  const reservedColorsByTeacher = buildReservedColorsByTeacher(overrides);

  return function resolveCourseColor(lesson) {
    const teacherKey = getLessonTeacherKey(lesson);
    const courseKey = getLessonCourseKey(lesson);
    const colorKey = getLessonColorKey(lesson);
    if (!courseKey) {
      return "gray";
    }

    if (!assignedColors.has(colorKey)) {
      const family = getTeacherColorFamily(teacherKey, palette, teacherFamilies, fallbackFamilies);
      const usedColors = getTeacherColorSet(usedColorsByTeacher, teacherKey);
      const reservedColors = reservedColorsByTeacher.get(teacherKey) || new Set();
      const color = overrides.get(colorKey) || getNextAvailableColor(family, usedColors, reservedColors);
      assignedColors.set(colorKey, color);
      usedColors.add(color);
    }

    return assignedColors.get(colorKey);
  };
}

function buildReservedColorsByTeacher(overrides) {
  const reserved = new Map();
  for (const [rawKey, color] of overrides) {
    const [teacherKey] = String(rawKey || "").split("|");
    if (!teacherKey || !color) {
      continue;
    }
    getTeacherColorSet(reserved, teacherKey).add(color);
  }
  return reserved;
}

function getTeacherColorFamily(teacherKey, palette, teacherFamilies, fallbackFamilies) {
  if (teacherFamilies[teacherKey]?.length) {
    return teacherFamilies[teacherKey];
  }

  if (!fallbackFamilies.has(teacherKey)) {
    const families = Object.values(teacherFamilies).filter((family) => family.length);
    const fallbackFamily = families[hashString(teacherKey) % families.length] || palette;
    fallbackFamilies.set(teacherKey, fallbackFamily);
  }

  return fallbackFamilies.get(teacherKey);
}

function getTeacherColorSet(map, teacherKey) {
  if (!map.has(teacherKey)) {
    map.set(teacherKey, new Set());
  }
  return map.get(teacherKey);
}

function getNextAvailableColor(palette, usedColors, reservedColors) {
  return (
    palette.find((color) => !usedColors.has(color) && !reservedColors.has(color)) ||
    palette.find((color) => !usedColors.has(color)) ||
    palette[usedColors.size % palette.length] ||
    "gray"
  );
}

function hashString(value) {
  return Array.from(String(value || "unknown")).reduce(
    (hash, character) => (hash * 31 + character.charCodeAt(0)) >>> 0,
    7,
  );
}

export function getLessonCourseKey(lesson) {
  return String(lesson?.course || lesson?.title || "")
    .toLowerCase()
    .trim();
}

export function getLessonTeacherKey(lesson) {
  return String(lesson?.teacherId || lesson?.teacherName || "unknown")
    .toLowerCase()
    .trim();
}

export function getLessonColorKey(lesson) {
  return `${getLessonTeacherKey(lesson)}|${getLessonCourseKey(lesson)}`;
}

export const getLessonColor = createCourseColorResolver();
