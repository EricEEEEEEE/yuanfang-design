export type TitlePlacementKey =
  | "topCenter"
  | "topLeft"
  | "centerHero"
  | "leftBlock"
  | "rightBlock"
  | "bottomHero"
  | "editorialTop"
  | "sealTitle";

export type TitleScaleLevel = "normal" | "large" | "hero";

export type TitleLineBreakMode =
  | "auto"
  | "balanced"
  | "shortLines"
  | "singleLinePreferred";

export type TitleEmphasisMode =
  | "solidHero"
  | "outlinedReadable"
  | "editorial"
  | "campaignImpact"
  | "chineseSeal"
  | "cleanReadable";

export type TitleReadabilitySupport =
  | "none"
  | "lightShadow"
  | "shadowAndStroke"
  | "softGlow"
  | "subtleOverlay";

export type TitleDecorationKey =
  | "none"
  | "stageLight"
  | "smallStars"
  | "goldLine"
  | "sealStamp"
  | "paperTag"
  | "bookMark"
  | "campaignLabel"
  | "growthArrow";

export type TitleDirectorDecision = {
  placement: TitlePlacementKey;
  fontKey: string;
  titleArtStyle: string;
  titleScale: TitleScaleLevel;
  subtitleScale: TitleScaleLevel;
  lineBreakMode: TitleLineBreakMode;
  emphasisMode: TitleEmphasisMode;
  readabilitySupport: TitleReadabilitySupport;
  decorations: TitleDecorationKey[];
  reason: string;
};

export type TitleDirectorPreset = {
  label: string;
  suitableFor: string[];
  decision: TitleDirectorDecision;
};

export const TITLE_DIRECTOR_PRESETS: Record<string, TitleDirectorPreset> = {
  stageHero: {
    label: "舞台主视觉标题",
    suitableFor: ["成长汇报课", "成果展示", "发布会", "教学比赛"],
    decision: {
      placement: "centerHero",
      fontKey: "sourceHanSansBold",
      titleArtStyle: "stageGlow",
      titleScale: "hero",
      subtitleScale: "large",
      lineBreakMode: "balanced",
      emphasisMode: "solidHero",
      readabilitySupport: "shadowAndStroke",
      decorations: ["stageLight", "smallStars"],
      reason:
        "舞台成果类活动需要标题成为画面主角，标题应更大、更实、更有仪式感。",
    },
  },
  modernChineseSeal: {
    label: "现代国风题签标题",
    suitableFor: ["国学", "诗词", "名著", "传统文化"],
    decision: {
      placement: "sealTitle",
      fontKey: "sourceHanSerifSemiBold",
      titleArtStyle: "modernChinese",
      titleScale: "large",
      subtitleScale: "normal",
      lineBreakMode: "balanced",
      emphasisMode: "chineseSeal",
      readabilitySupport: "lightShadow",
      decorations: ["goldLine", "sealStamp"],
      reason:
        "国风主题需要文化感标题，像题签或印章题字，但不能直接生成手写错字。",
    },
  },
  campaignImpact: {
    label: "招生强转化标题",
    suitableFor: ["招生", "开班提醒", "报名提醒", "短期活动"],
    decision: {
      placement: "topLeft",
      fontKey: "smileySans",
      titleArtStyle: "boldCampaign",
      titleScale: "hero",
      subtitleScale: "large",
      lineBreakMode: "shortLines",
      emphasisMode: "campaignImpact",
      readabilitySupport: "shadowAndStroke",
      decorations: ["campaignLabel", "growthArrow"],
      reason:
        "招生转化类物料需要标题快速抓住注意力，但仍要避免廉价促销感。",
    },
  },
  literaryEditorial: {
    label: "文学编辑标题",
    suitableFor: ["一本好书", "读书节", "文学周", "品牌理念"],
    decision: {
      placement: "editorialTop",
      fontKey: "lxgwWenkaiGbMedium",
      titleArtStyle: "literaryEditorial",
      titleScale: "large",
      subtitleScale: "normal",
      lineBreakMode: "balanced",
      emphasisMode: "editorial",
      readabilitySupport: "lightShadow",
      decorations: ["paperTag", "bookMark"],
      reason: "文学阅读类主题需要编辑感和书卷气，标题应克制但有气质。",
    },
  },
  ipEventPlayful: {
    label: "品牌 IP 活动标题",
    suitableFor: ["暑期营", "游园会", "轻活动", "品牌 IP 活动"],
    decision: {
      placement: "centerHero",
      fontKey: "lxgwMarkerGothic",
      titleArtStyle: "ipEvent",
      titleScale: "large",
      subtitleScale: "normal",
      lineBreakMode: "shortLines",
      emphasisMode: "outlinedReadable",
      readabilitySupport: "shadowAndStroke",
      decorations: ["smallStars", "bookMark"],
      reason: "轻活动需要活泼和品牌化，但不能低幼。",
    },
  },
  cleanBrand: {
    label: "品牌清晰标题",
    suitableFor: ["通用通知", "课程说明", "家长群", "正式说明图"],
    decision: {
      placement: "topCenter",
      fontKey: "sourceHanSansBold",
      titleArtStyle: "cleanBrand",
      titleScale: "normal",
      subtitleScale: "normal",
      lineBreakMode: "singleLinePreferred",
      emphasisMode: "cleanReadable",
      readabilitySupport: "lightShadow",
      decorations: ["none"],
      reason: "正式说明类物料优先清楚、可信、稳定。",
    },
  },
};

