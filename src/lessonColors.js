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

export const courseColorOverrides = new Map([
  ["orion 复习", "blue"],
  ["ziyi上门", "peach"],
]);

export function createCourseColorResolver(palette = lessonColorPalette, overrides = courseColorOverrides) {
  const assignedColors = new Map();
  const usedColors = new Set();
  const reservedColors = new Set(overrides.values());

  return function resolveCourseColor(lesson) {
    const courseKey = getLessonCourseKey(lesson);
    if (!courseKey) {
      return "gray";
    }

    if (!assignedColors.has(courseKey)) {
      const color = overrides.get(courseKey) || getNextAvailableColor(palette, usedColors, reservedColors);
      assignedColors.set(courseKey, color);
      usedColors.add(color);
    }

    return assignedColors.get(courseKey);
  };
}

function getNextAvailableColor(palette, usedColors, reservedColors) {
  return (
    palette.find((color) => !usedColors.has(color) && !reservedColors.has(color)) ||
    palette.find((color) => !usedColors.has(color)) ||
    palette[usedColors.size % palette.length] ||
    "gray"
  );
}

export function getLessonCourseKey(lesson) {
  return String(lesson?.course || lesson?.title || "")
    .toLowerCase()
    .trim();
}

export function getLessonColorKey(lesson) {
  return getLessonCourseKey(lesson);
}

export const getLessonColor = createCourseColorResolver();
