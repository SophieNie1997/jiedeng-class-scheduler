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

export function createCourseColorResolver(palette = lessonColorPalette) {
  const assignedColors = new Map();

  return function resolveCourseColor(lesson) {
    const courseKey = getLessonCourseKey(lesson);
    if (!courseKey) {
      return "gray";
    }

    if (!assignedColors.has(courseKey)) {
      const color = palette[assignedColors.size % palette.length] || "gray";
      assignedColors.set(courseKey, color);
    }

    return assignedColors.get(courseKey);
  };
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
