export type StandardThemeKey =
  | "trialClass"
  | "recruitment"
  | "seasonalClass"
  | "readingFestival"
  | "classicalLiterature"
  | "showcase";

export type StandardStyleKey =
  | "warm"
  | "lively"
  | "chinese"
  | "literary";

export type StandardElementKey =
  | "childrenReading"
  | "books"
  | "classroom"
  | "classicalPoetry";

export type OptimizeSceneKey =
  | "teacherPortrait"
  | "blackboard"
  | "classroomMoment"
  | "studentWork";

export type SceneField = {
  label: string;
};

export const STANDARD_THEMES: Record<StandardThemeKey, SceneField> = {
  trialClass: {
    label: "试听课 / 公开课",
  },
  recruitment: {
    label: "招生推广",
  },
  seasonalClass: {
    label: "寒暑假班",
  },
  readingFestival: {
    label: "读书节 / 阅读活动",
  },
  classicalLiterature: {
    label: "国学 / 诗词 / 名著活动",
  },
  showcase: {
    label: "汇报课 / 家长开放日",
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
  literary: {
    label: "文艺",
  },
};

export const STANDARD_ELEMENTS: Record<StandardElementKey, SceneField> = {
  childrenReading: {
    label: "阅读氛围元素",
  },
  books: {
    label: "书本 / 书页",
  },
  classroom: {
    label: "课堂空间氛围",
  },
  classicalPoetry: {
    label: "古诗意境",
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
