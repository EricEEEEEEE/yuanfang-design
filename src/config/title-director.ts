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

export type TitleOrientation =
  | "horizontal"
  | "vertical"
  | "diagonal"
  | "stacked";

export type TitleCompositionMode =
  | "heroCenter"
  | "topBanner"
  | "leftBlock"
  | "rightVertical"
  | "leftVertical"
  | "diagonalDynamic"
  | "editorialBlock"
  | "sealBadge";

export type TitleEmphasisTarget =
  | "allTitle"
  | "firstWord"
  | "keyword"
  | "titleAndSubtitle";

export type TitleScaleIntensity =
  | "normal"
  | "large"
  | "huge";

export type TitleDecorationIntent =
  | "none"
  | "stage"
  | "chinese"
  | "campaign"
  | "literary"
  | "playful";

export type TitleDirectorDecision = {
  placement: TitlePlacementKey;
  orientation: TitleOrientation;
  compositionMode: TitleCompositionMode;
  fontKey: string;
  titleArtStyle: string;
  titleScale: TitleScaleLevel;
  subtitleScale: TitleScaleLevel;
  lineBreakMode: TitleLineBreakMode;
  emphasisMode: TitleEmphasisMode;
  emphasisTarget: TitleEmphasisTarget;
  scaleIntensity: TitleScaleIntensity;
  readabilitySupport: TitleReadabilitySupport;
  decorationIntent: TitleDecorationIntent;
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
      orientation: "horizontal",
      compositionMode: "heroCenter",
      fontKey: "sourceHanSansBold",
      titleArtStyle: "stageGlow",
      titleScale: "hero",
      subtitleScale: "large",
      lineBreakMode: "balanced",
      emphasisMode: "solidHero",
      emphasisTarget: "titleAndSubtitle",
      scaleIntensity: "huge",
      readabilitySupport: "shadowAndStroke",
      decorationIntent: "stage",
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
      orientation: "vertical",
      compositionMode: "sealBadge",
      fontKey: "sourceHanSerifSemiBold",
      titleArtStyle: "modernChinese",
      titleScale: "large",
      subtitleScale: "normal",
      lineBreakMode: "balanced",
      emphasisMode: "chineseSeal",
      emphasisTarget: "allTitle",
      scaleIntensity: "large",
      readabilitySupport: "lightShadow",
      decorationIntent: "chinese",
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
      orientation: "diagonal",
      compositionMode: "diagonalDynamic",
      fontKey: "smileySans",
      titleArtStyle: "boldCampaign",
      titleScale: "hero",
      subtitleScale: "large",
      lineBreakMode: "shortLines",
      emphasisMode: "campaignImpact",
      emphasisTarget: "keyword",
      scaleIntensity: "huge",
      readabilitySupport: "shadowAndStroke",
      decorationIntent: "campaign",
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
      orientation: "horizontal",
      compositionMode: "editorialBlock",
      fontKey: "lxgwWenkaiGbMedium",
      titleArtStyle: "literaryEditorial",
      titleScale: "large",
      subtitleScale: "normal",
      lineBreakMode: "balanced",
      emphasisMode: "editorial",
      emphasisTarget: "allTitle",
      scaleIntensity: "large",
      readabilitySupport: "lightShadow",
      decorationIntent: "literary",
      decorations: ["paperTag", "bookMark"],
      reason: "文学阅读类主题需要编辑感和书卷气，标题应克制但有气质。",
    },
  },
  ipEventPlayful: {
    label: "品牌 IP 活动标题",
    suitableFor: ["暑期营", "游园会", "轻活动", "品牌 IP 活动"],
    decision: {
      placement: "centerHero",
      orientation: "stacked",
      compositionMode: "heroCenter",
      fontKey: "lxgwMarkerGothic",
      titleArtStyle: "ipEvent",
      titleScale: "large",
      subtitleScale: "normal",
      lineBreakMode: "shortLines",
      emphasisMode: "outlinedReadable",
      emphasisTarget: "keyword",
      scaleIntensity: "large",
      readabilitySupport: "shadowAndStroke",
      decorationIntent: "playful",
      decorations: ["smallStars", "bookMark"],
      reason: "轻活动需要活泼和品牌化，但不能低幼。",
    },
  },
  cleanBrand: {
    label: "品牌清晰标题",
    suitableFor: ["通用通知", "课程说明", "家长群", "正式说明图"],
    decision: {
      placement: "topCenter",
      orientation: "horizontal",
      compositionMode: "topBanner",
      fontKey: "sourceHanSansBold",
      titleArtStyle: "cleanBrand",
      titleScale: "normal",
      subtitleScale: "normal",
      lineBreakMode: "singleLinePreferred",
      emphasisMode: "cleanReadable",
      emphasisTarget: "titleAndSubtitle",
      scaleIntensity: "normal",
      readabilitySupport: "lightShadow",
      decorationIntent: "none",
      decorations: ["none"],
      reason: "正式说明类物料优先清楚、可信、稳定。",
    },
  },
};
