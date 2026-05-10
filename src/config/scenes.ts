export type StandardThemeKey =
  | "springRecruitment"
  | "summerClass"
  | "trialClass"
  | "readingFestival"
  | "parentOpenDay";

export type StandardStyleKey =
  | "warm"
  | "lively"
  | "chinese"
  | "minimal"
  | "literary";

export type StandardElementKey =
  | "childrenReading"
  | "books"
  | "classroom"
  | "classicalPoetry"
  | "campus";

export type OptimizeSceneKey =
  | "teacherPortrait"
  | "blackboard"
  | "classroomMoment"
  | "studentWork";

export type SceneField = {
  label: string;
};

export const STANDARD_THEMES: Record<StandardThemeKey, SceneField> = {
  springRecruitment: {
    label: "春季招生",
  },
  summerClass: {
    label: "暑假班",
  },
  trialClass: {
    label: "试听课",
  },
  readingFestival: {
    label: "读书节",
  },
  parentOpenDay: {
    label: "家长开放日",
  },
};

export const STANDARD_STYLES: Record<StandardStyleKey, SceneField> = {
  warm: {
    label: "温暖",
  },
  lively: {
    label: "活泼",
  },
  chinese: {
    label: "国风",
  },
  minimal: {
    label: "简约",
  },
  literary: {
    label: "文艺",
  },
};

export const STANDARD_ELEMENTS: Record<StandardElementKey, SceneField> = {
  childrenReading: {
    label: "孩子阅读",
  },
  books: {
    label: "书本",
  },
  classroom: {
    label: "课堂场景",
  },
  classicalPoetry: {
    label: "古诗意境",
  },
  campus: {
    label: "校园",
  },
};

export const OPTIMIZE_SCENES: Record<OptimizeSceneKey, SceneField> = {
  teacherPortrait: {
    label: "老师风采照",
  },
  blackboard: {
    label: "板书分享",
  },
  classroomMoment: {
    label: "课堂瞬间",
  },
  studentWork: {
    label: "学生作品展示",
  },
};
