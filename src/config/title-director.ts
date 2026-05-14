import type { TitleCompositionMode as LockupCompositionMode, TitleLockupIntent } from "@/config/title-composition-grammar";
import type { TitleOrientationPreference } from "@/config/title-lockup-blueprint";

// Title Director provides spatial decision hints for TitleLockupBlueprint.
// It follows Background Layout / Spatial Strategy / Brand Config and must not
// output fixed coordinates, final font decisions, or upstream renderer plans.

export type TitlePlacementKey = "topCenter" | "topLeft" | "centerHero" | "leftBlock" | "rightBlock" | "bottomHero" | "editorialTop" | "sealTitle";
export type TitleScaleLevel = "normal" | "large" | "hero";
export type TitleLineBreakMode = "auto" | "balanced" | "shortLines" | "singleLinePreferred";
export type TitleEmphasisMode = "solidHero" | "outlinedReadable" | "editorial" | "campaignImpact" | "chineseSeal" | "cleanReadable";
export type TitleReadabilitySupport = "none" | "lightShadow" | "shadowAndStroke" | "softGlow" | "subtleOverlay";
export type TitleDecorationKey = "none" | "stageLight" | "smallStars" | "goldLine" | "sealStamp" | "paperTag" | "bookMark" | "campaignLabel" | "growthArrow";
export type TitleOrientation = "horizontal" | "vertical" | "diagonal" | "stacked";
export type DeprecatedTitleDirectorCompositionMode = "heroCenter" | "topBanner" | "leftBlock" | "rightVertical" | "leftVertical" | "diagonalDynamic" | "editorialBlock" | "sealBadge";
export type TitleCompositionMode = LockupCompositionMode | DeprecatedTitleDirectorCompositionMode;
export type TitleEmphasisTarget = "allTitle" | "firstWord" | "keyword" | "titleAndSubtitle";
export type TitleScaleIntensity = "normal" | "large" | "huge";
export type TitleDecorationIntent = "none" | "stage" | "chinese" | "campaign" | "literary" | "playful";
export type TitleSpatialAnchorPreference = "primarySafeZone" | "centerNegativeSpace" | "leftNegativeSpace" | "rightNegativeSpace" | "topNegativeSpace" | "bottomNegativeSpace" | "stageFocus" | "editorialWhitespace" | "campaignImpactZone" | "secondaryAnchor";
export type TitleSemanticSplitPreference = "auto" | "leadHero" | "fullHero" | "threeStep" | "seasonHero" | "actionHero" | "culturalHero";
export type TitleForbiddenPatternHint = "fixedCoordinatePreset" | "legacyTitleBoxPreset" | "fontDrivenBackground" | "vectorRendererAsPlanner" | "platformCaptionAsMainTitle" | "perCharacterVerticalTitle" | "subtitleBetweenLeadAndHero" | "ignoreBrandSafeArea" | "overlapForbiddenZones";
export type TitleFontIntent = "stableSans" | "culturalSerif" | "campaignDisplay" | "literaryKai" | "playfulMarker" | "cleanSystem";
export type TitleLayoutBox = { x: number; y: number; width: number; height: number };
export type TitleAlignment = "left" | "center" | "right";
export type SubtitlePlacement = "below" | "side" | "verticalSide" | "none";

export type TitleDirectorConstraints = {
  obeyBackgroundLayout: true; obeySpatialStrategy: true; obeyBrandConfig: true;
  keepInsideSpatialAnchor: true; avoidForbiddenZones: true; avoidLogoArea: boolean;
  avoidMascotArea: boolean; preferNegativeSpace: boolean; noFixedCoordinates: true;
  noFinalFontDecision: true; vectorGlyphRendererIsDownstream: true;
};

export type TitleRendererHints = {
  titleArtStyle: string; titleScale: TitleScaleLevel; subtitleScale: TitleScaleLevel;
  lineBreakMode: TitleLineBreakMode; emphasisMode: TitleEmphasisMode;
  emphasisTarget: TitleEmphasisTarget; scaleIntensity: TitleScaleIntensity;
  readabilitySupport: TitleReadabilitySupport; effectIntent: string;
  decorationIntent: TitleDecorationIntent; decorationIntents: TitleDecorationKey[];
  fontIntent: TitleFontIntent; fontMood: string[]; styleHint: string;
};

export type TitleDirectorSpatialHint = {
  spatialAnchorPreference: TitleSpatialAnchorPreference; orientationPreference: TitleOrientationPreference;
  compositionMode: LockupCompositionMode; semanticSplitPreference: TitleSemanticSplitPreference;
  lockupIntent: TitleLockupIntent; constraints: TitleDirectorConstraints;
  forbiddenPatternHints: TitleForbiddenPatternHint[]; rendererHints: TitleRendererHints;
};

export type TitleDirectorCompatibilityProjection = {
  placement: TitlePlacementKey; orientation: TitleOrientation; compositionMode: TitleCompositionMode;
  titleAlign: TitleAlignment; subtitlePlacement: SubtitlePlacement; titleArtStyle: string;
  titleScale: TitleScaleLevel; subtitleScale: TitleScaleLevel; lineBreakMode: TitleLineBreakMode;
  emphasisMode: TitleEmphasisMode; emphasisTarget: TitleEmphasisTarget;
  scaleIntensity: TitleScaleIntensity; readabilitySupport: TitleReadabilitySupport;
  decorationIntent: TitleDecorationIntent; decorations: TitleDecorationKey[]; reason: string;
  /** @deprecated Legacy compatibility only. New pipeline must use spatialContract.lockupBox. */
  titleBox?: TitleLayoutBox;
  /** @deprecated Legacy compatibility only. New pipeline must decide rotation in unitBox. */
  rotationDeg?: number;
  /** @deprecated Renderer hint only. New pipeline must resolve final font downstream. */
  fontKey?: string;
};

export type TitleDirectorDecision = Partial<Omit<TitleDirectorSpatialHint, "compositionMode">> & TitleDirectorCompatibilityProjection;
export type TitleDirectorPreset = { label: string; suitableFor: string[]; decision: TitleDirectorSpatialHint & TitleDirectorCompatibilityProjection };

const STRICT_SPATIAL_CONSTRAINTS: TitleDirectorConstraints = {
  obeyBackgroundLayout: true, obeySpatialStrategy: true, obeyBrandConfig: true,
  keepInsideSpatialAnchor: true, avoidForbiddenZones: true, avoidLogoArea: true,
  avoidMascotArea: true, preferNegativeSpace: true, noFixedCoordinates: true,
  noFinalFontDecision: true, vectorGlyphRendererIsDownstream: true,
};

export const TITLE_DIRECTOR_PRESETS: Record<string, TitleDirectorPreset> = {
  stageHero: {
    label: "舞台主视觉标题",
    suitableFor: ["成长汇报课", "成果展示", "发布会", "教学比赛"],
    decision: {
      spatialAnchorPreference: "stageFocus", orientationPreference: "centerFirst", compositionMode: "stageMonument", semanticSplitPreference: "leadHero", lockupIntent: "mainTitle",
      constraints: STRICT_SPATIAL_CONSTRAINTS, forbiddenPatternHints: ["fixedCoordinatePreset", "legacyTitleBoxPreset", "fontDrivenBackground", "vectorRendererAsPlanner"],
      rendererHints: { titleArtStyle: "stageGlow", titleScale: "hero", subtitleScale: "large", lineBreakMode: "balanced", emphasisMode: "solidHero", emphasisTarget: "titleAndSubtitle", scaleIntensity: "huge", readabilitySupport: "shadowAndStroke", effectIntent: "stage-weight-and-ceremony", decorationIntent: "stage", decorationIntents: ["stageLight", "smallStars"], fontIntent: "stableSans", fontMood: ["厚重", "清晰", "舞台感"], styleHint: "标题结构先服从舞台聚光和安全空间，字体只作为下游渲染倾向。" },
      placement: "centerHero", orientation: "horizontal", titleAlign: "center", subtitlePlacement: "below", titleArtStyle: "stageGlow", titleScale: "hero", subtitleScale: "large", lineBreakMode: "balanced", emphasisMode: "solidHero", emphasisTarget: "titleAndSubtitle", scaleIntensity: "huge", readabilitySupport: "shadowAndStroke", decorationIntent: "stage", decorations: ["stageLight", "smallStars"],
      reason: "舞台成果类活动应先服从背景聚光、安全区和品牌约束，再生成主标题 lockup。",
    },
  },
  modernChineseSeal: {
    label: "现代国风题签标题",
    suitableFor: ["国学", "诗词", "名著", "传统文化"],
    decision: {
      spatialAnchorPreference: "rightNegativeSpace", orientationPreference: "verticalFirst", compositionMode: "verticalHeroStack", semanticSplitPreference: "culturalHero", lockupIntent: "mainTitle",
      constraints: STRICT_SPATIAL_CONSTRAINTS, forbiddenPatternHints: ["perCharacterVerticalTitle", "fixedCoordinatePreset", "fontDrivenBackground"],
      rendererHints: { titleArtStyle: "modernChinese", titleScale: "large", subtitleScale: "normal", lineBreakMode: "balanced", emphasisMode: "chineseSeal", emphasisTarget: "allTitle", scaleIntensity: "large", readabilitySupport: "lightShadow", effectIntent: "modern-cultural-seal", decorationIntent: "chinese", decorationIntents: ["goldLine", "sealStamp"], fontIntent: "culturalSerif", fontMood: ["文化感", "题签感", "克制"], styleHint: "竖向倾向来自空间策略，不等于逐字竖排；字体在渲染层再解析。" },
      placement: "sealTitle", orientation: "vertical", titleAlign: "center", subtitlePlacement: "verticalSide", titleArtStyle: "modernChinese", titleScale: "large", subtitleScale: "normal", lineBreakMode: "balanced", emphasisMode: "chineseSeal", emphasisTarget: "allTitle", scaleIntensity: "large", readabilitySupport: "lightShadow", decorationIntent: "chinese", decorations: ["goldLine", "sealStamp"],
      reason: "国风标题应根据山水、卷轴和留白空间选择题签式 lockup，而不是由字体反向决定画面。",
    },
  },
  campaignImpact: {
    label: "招生强转化标题",
    suitableFor: ["招生", "开班提醒", "报名提醒", "短期活动"],
    decision: {
      spatialAnchorPreference: "campaignImpactZone", orientationPreference: "diagonalFirst", compositionMode: "splitLeadHero", semanticSplitPreference: "actionHero", lockupIntent: "mainTitle",
      constraints: STRICT_SPATIAL_CONSTRAINTS, forbiddenPatternHints: ["fixedCoordinatePreset", "fontDrivenBackground", "overlapForbiddenZones"],
      rendererHints: { titleArtStyle: "boldCampaign", titleScale: "hero", subtitleScale: "large", lineBreakMode: "shortLines", emphasisMode: "campaignImpact", emphasisTarget: "keyword", scaleIntensity: "huge", readabilitySupport: "shadowAndStroke", effectIntent: "conversion-impact", decorationIntent: "campaign", decorationIntents: ["campaignLabel", "growthArrow"], fontIntent: "campaignDisplay", fontMood: ["抓眼", "高对比", "转化"], styleHint: "强营销标题先服从招生动线和安全区，展示字体只是下游增强手段。" },
      placement: "topLeft", orientation: "diagonal", titleAlign: "left", subtitlePlacement: "below", titleArtStyle: "boldCampaign", titleScale: "hero", subtitleScale: "large", lineBreakMode: "shortLines", emphasisMode: "campaignImpact", emphasisTarget: "keyword", scaleIntensity: "huge", readabilitySupport: "shadowAndStroke", decorationIntent: "campaign", decorations: ["campaignLabel", "growthArrow"],
      reason: "招生转化类标题应利用空间动势和可读区强化行动词，不使用固定斜切坐标。",
    },
  },
  literaryEditorial: {
    label: "文学编辑标题",
    suitableFor: ["一本好书", "读书节", "文学周", "品牌理念"],
    decision: {
      spatialAnchorPreference: "editorialWhitespace", orientationPreference: "balanced", compositionMode: "centerStageLockup", semanticSplitPreference: "fullHero", lockupIntent: "mainTitle",
      constraints: STRICT_SPATIAL_CONSTRAINTS, forbiddenPatternHints: ["legacyTitleBoxPreset", "fontDrivenBackground", "ignoreBrandSafeArea"],
      rendererHints: { titleArtStyle: "literaryEditorial", titleScale: "large", subtitleScale: "normal", lineBreakMode: "balanced", emphasisMode: "editorial", emphasisTarget: "allTitle", scaleIntensity: "large", readabilitySupport: "lightShadow", effectIntent: "editorial-calm-hierarchy", decorationIntent: "literary", decorationIntents: ["paperTag", "bookMark"], fontIntent: "literaryKai", fontMood: ["书卷气", "克制", "编辑感"], styleHint: "文学标题先服从纸张层次和留白空间，再由渲染层选择字体资产。" },
      placement: "editorialTop", orientation: "horizontal", titleAlign: "center", subtitlePlacement: "below", titleArtStyle: "literaryEditorial", titleScale: "large", subtitleScale: "normal", lineBreakMode: "balanced", emphasisMode: "editorial", emphasisTarget: "allTitle", scaleIntensity: "large", readabilitySupport: "lightShadow", decorationIntent: "literary", decorations: ["paperTag", "bookMark"],
      reason: "文学阅读类标题应服从编辑留白和阅读空间，不把背景降级成字体装饰底板。",
    },
  },
  ipEventPlayful: {
    label: "品牌 IP 活动标题",
    suitableFor: ["暑期营", "游园会", "轻活动", "品牌 IP 活动"],
    decision: {
      spatialAnchorPreference: "centerNegativeSpace", orientationPreference: "balanced", compositionMode: "staggeredColumn", semanticSplitPreference: "auto", lockupIntent: "mainTitle",
      constraints: STRICT_SPATIAL_CONSTRAINTS, forbiddenPatternHints: ["fixedCoordinatePreset", "perCharacterVerticalTitle", "vectorRendererAsPlanner"],
      rendererHints: { titleArtStyle: "ipEvent", titleScale: "large", subtitleScale: "normal", lineBreakMode: "shortLines", emphasisMode: "outlinedReadable", emphasisTarget: "keyword", scaleIntensity: "large", readabilitySupport: "shadowAndStroke", effectIntent: "playful-brand-lockup", decorationIntent: "playful", decorationIntents: ["smallStars", "bookMark"], fontIntent: "playfulMarker", fontMood: ["活泼", "亲和", "品牌 IP 感"], styleHint: "活泼感来自 lockup 节奏和空间关系，字体只在下游增强。" },
      placement: "centerHero", orientation: "stacked", titleAlign: "center", subtitlePlacement: "below", titleArtStyle: "ipEvent", titleScale: "large", subtitleScale: "normal", lineBreakMode: "shortLines", emphasisMode: "outlinedReadable", emphasisTarget: "keyword", scaleIntensity: "large", readabilitySupport: "shadowAndStroke", decorationIntent: "playful", decorations: ["smallStars", "bookMark"],
      reason: "IP 活动标题应根据互动道具和安全留白组织错落 lockup，避免散乱或坐标模板化。",
    },
  },
  cleanBrand: {
    label: "品牌清晰标题",
    suitableFor: ["通用通知", "课程说明", "家长群", "正式说明图"],
    decision: {
      spatialAnchorPreference: "topNegativeSpace", orientationPreference: "horizontalFirst", compositionMode: "centerStageLockup", semanticSplitPreference: "fullHero", lockupIntent: "mainTitle",
      constraints: STRICT_SPATIAL_CONSTRAINTS, forbiddenPatternHints: ["platformCaptionAsMainTitle", "fontDrivenBackground", "legacyTitleBoxPreset"],
      rendererHints: { titleArtStyle: "cleanBrand", titleScale: "normal", subtitleScale: "normal", lineBreakMode: "singleLinePreferred", emphasisMode: "cleanReadable", emphasisTarget: "titleAndSubtitle", scaleIntensity: "normal", readabilitySupport: "lightShadow", effectIntent: "clean-brand-readability", decorationIntent: "none", decorationIntents: ["none"], fontIntent: "cleanSystem", fontMood: ["清楚", "可信", "品牌一致"], styleHint: "正式说明图优先服从品牌安全区和可读性，避免用字体风格反向塑造背景。" },
      placement: "topCenter", orientation: "horizontal", titleAlign: "center", subtitlePlacement: "below", titleArtStyle: "cleanBrand", titleScale: "normal", subtitleScale: "normal", lineBreakMode: "singleLinePreferred", emphasisMode: "cleanReadable", emphasisTarget: "titleAndSubtitle", scaleIntensity: "normal", readabilitySupport: "lightShadow", decorationIntent: "none", decorations: ["none"],
      reason: "正式说明类物料应以空间安全、品牌一致和可读性为先，字体渲染保持下游执行。",
    },
  },
};
