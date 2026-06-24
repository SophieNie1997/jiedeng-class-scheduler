export const teacherAvatars = {
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

export const defaultTeacherAvatars = [
  { character: "小恶魔", tone: "kuromi", image: "photo/1133570168691764439.jpeg" },
  { character: "美乐蒂", tone: "melody", image: "photo/9992430418961551.jpeg" },
  { character: "库洛米", tone: "kuromi", image: "photo/551268810646516216.jpeg" },
  { character: "玉桂狗", tone: "cinnamon", image: "photo/2251868558517832.jpeg" },
  { character: "布丁狗", tone: "pompom", image: "photo/2885187258130354.jpeg" },
  { character: "Hello Kitty", tone: "kitty", image: "photo/657807089360599950.jpeg" },
  { character: "双子星", tone: "kiki", image: "photo/2251868558517840.jpeg" },
  { character: "帕恰狗", tone: "pochacco", image: "photo/2251868558517826.jpeg" },
  { character: "大耳狗", tone: "mint", image: "photo/2885187258130352.jpeg" },
  { character: "巧克猫", tone: "chococat", image: "photo/45599014979890058.jpeg" },
  { character: "Keroppi", tone: "keroppi", image: "photo/344595809001891606.jpeg" },
];

export const defaultTeacherAccentOverlays = [
  "rgba(255, 232, 143, 0.34)",
  "rgba(178, 222, 255, 0.32)",
  "rgba(191, 241, 214, 0.32)",
  "rgba(255, 204, 226, 0.31)",
  "rgba(221, 205, 255, 0.32)",
  "rgba(255, 215, 175, 0.31)",
];

export function getTeacherAvatar(teacherId, teacherName = "") {
  const key = normalizeTeacherKey(teacherId);
  if (teacherAvatars[key]) {
    return teacherAvatars[key];
  }

  const fallbackKey = key || normalizeTeacherKey(teacherName) || "teacher";
  const avatar = defaultTeacherAvatars[hashAvatarKey(fallbackKey) % defaultTeacherAvatars.length];
  return {
    ...avatar,
    accent: defaultTeacherAccentOverlays[hashAvatarKey(`${fallbackKey}:accent`) % defaultTeacherAccentOverlays.length],
    mark: makeAvatarMark(teacherName || teacherId),
  };
}

function normalizeTeacherKey(value) {
  return String(value || "").trim().toLowerCase();
}

function hashAvatarKey(value) {
  return Array.from(String(value || "")).reduce((hash, char) => {
    return ((hash * 31) + char.codePointAt(0)) >>> 0;
  }, 0);
}

function makeAvatarMark(value) {
  const firstVisibleCharacter = Array.from(String(value || "").trim()).find((char) =>
    /[a-z0-9\u4e00-\u9fff]/i.test(char),
  );
  return firstVisibleCharacter ? firstVisibleCharacter.toLocaleUpperCase("zh-Hans-CN") : "师";
}
