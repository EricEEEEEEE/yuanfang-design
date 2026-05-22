import type { StandardFontKey } from "@/config/font-library";
import type { TitleCompositionMode } from "@/config/title-composition-grammar";
import type { TitleReferencePatternKey } from "@/config/title-reference-patterns";
import type { TitleFontPresetKey } from "@/models/title-vector-glyph-renderer";

export type TitleDesignSceneKey =
  | "achievementShowcase"
  | "businessLaunch"
  | "modernChinese"
  | "campaign"
  | "literary"
  | "ipEvent"
  | "cleanNotice";

export type TitleFontShapeKey =
  | "stableSans"
  | "culturalSerif"
  | "literaryKai"
  | "campaignDisplay"
  | "playfulMarker"
  | "roundedFriendly"
  | "cleanSystem";

export type TitleDecorationDensity = "none" | "light" | "medium" | "strong";
export type TitleHierarchyPosture = "heroFirst" | "leadHero" | "hookSupport" | "informationFirst";

export type TitleFontShapeProfile = {
  key: TitleFontShapeKey;
  fontKeys: StandardFontKey[];
  fallbackShape: TitleFontShapeKey;
  suitableScenes: TitleDesignSceneKey[];
  avoidScenes: TitleDesignSceneKey[];
  traits: string[];
  riskNotes: string[];
};

export type TitleAdaptiveSizingPolicy = {
  targetLockupAreaRatio: number;
  minAcceptableLockupAreaRatio: number;
  targetUnitFillRatio: number;
  heroToLeadWeightRatio: number;
  subtitleMinHeightPx: number;
  maxRotationDeg: number;
};

export type TitleSceneStyleProfile = {
  sceneKey: TitleDesignSceneKey;
  label: string;
  titleMood: string[];
  fontShape: TitleFontShapeKey;
  hierarchyPosture: TitleHierarchyPosture;
  decorationDensity: TitleDecorationDensity;
  titleStylePreset: TitleFontPresetKey;
  preferredCompositionModes: TitleCompositionMode[];
  preferredPatterns: TitleReferencePatternKey[];
  secondaryPatterns: TitleReferencePatternKey[];
  disallowedPatterns: TitleReferencePatternKey[];
  adaptiveSizing: TitleAdaptiveSizingPolicy;
  qualityHints: string[];
};

export type TitleReferencePatternPlan = {
  primary: TitleReferencePatternKey[];
  secondary: TitleReferencePatternKey[];
  exploratory: TitleReferencePatternKey[];
  disallowed: TitleReferencePatternKey[];
  mutationBounds: string[];
};

export type TitleTypographyStrategy = {
  heroFontShape: TitleFontShapeKey;
  leadFontShape: TitleFontShapeKey;
  accentFontShape: TitleFontShapeKey;
  subtitleFontShape: TitleFontShapeKey;
  roleFontKeys: {
    hero: StandardFontKey[];
    lead: StandardFontKey[];
    accent: StandardFontKey[];
    subtitle: StandardFontKey[];
  };
  riskNotes: string[];
};

export type TitleDesignPlan = {
  planId: string;
  source: "rule-based-l7-v1";
  sceneStyleProfile: TitleSceneStyleProfile;
  spatialTitleIntent: {
    orientationPreference: string;
    strategyMode: string;
    primaryTextAnchorId: string;
    negativeSpaceShape: string;
    dominantFlow: string;
    recommendedTitleFlow: string;
  };
  referencePatternPlan: TitleReferencePatternPlan;
  lockupCompositionPlan: {
    allowedModes: TitleCompositionMode[];
    preferredModes: TitleCompositionMode[];
    forbiddenModes: TitleCompositionMode[];
  };
  typographyStrategy: TitleTypographyStrategy;
  fontShapePlan: TitleFontShapeProfile;
  adaptiveSizingPolicy: TitleAdaptiveSizingPolicy;
  hierarchyPlan: {
    posture: TitleHierarchyPosture;
    mainTitleRole: "hero";
    subtitlePriority: "normal" | "preserveIfSafe" | "strong";
    primaryMessagePolicy: "visibleTextOnly" | "rhythmOnly";
    emphasisPolicy: "mainTitleSubstringOnly";
  };
  rendererStylePlan: {
    titleStylePreset: TitleFontPresetKey;
    decorationDensity: TitleDecorationDensity;
    contrastPolicy: "brandStrokeAndShadow";
  };
  designQualityGates: string[];
  diagnostics: string[];
};

export const TITLE_FONT_SHAPE_PROFILES: Record<TitleFontShapeKey, TitleFontShapeProfile> = {
  stableSans: shape("stableSans", ["sourceHanSansBold"], "cleanSystem", ["achievementShowcase", "businessLaunch", "cleanNotice"], [], ["厚重", "清晰", "可信"], ["避免所有场景都退回普通黑体。"]),
  culturalSerif: shape("culturalSerif", ["sourceHanSerifSemiBold"], "stableSans", ["modernChinese"], ["campaign", "ipEvent"], ["文化感", "题签感", "克制"], ["禁止廉价古风和游戏字气质。"]),
  literaryKai: shape("literaryKai", ["lxgwWenkaiGbMedium"], "culturalSerif", ["literary", "modernChinese"], ["campaign"], ["书卷气", "编辑感", "温和"], ["不能小清新手账化。"]),
  campaignDisplay: shape("campaignDisplay", ["smileySans", "gensenRoundedBold"], "stableSans", ["campaign"], ["modernChinese", "literary"], ["抓眼", "转化", "高对比"], ["避免廉价促销和过度斜切。"]),
  playfulMarker: shape("playfulMarker", ["lxgwMarkerGothic"], "roundedFriendly", ["ipEvent"], ["businessLaunch", "modernChinese"], ["活泼", "亲和", "活动感"], ["不能低幼或散乱。"]),
  roundedFriendly: shape("roundedFriendly", ["gensenRoundedBold"], "stableSans", ["ipEvent", "cleanNotice"], ["modernChinese"], ["圆润", "友好", "轻活动"], ["不适合严肃发布会主标题。"]),
  cleanSystem: shape("cleanSystem", ["sourceHanSansBold"], "stableSans", ["cleanNotice"], [], ["稳定", "信息清楚", "低装饰"], ["只能作为信息优先或安全兜底。"]),
};

export const TITLE_SCENE_STYLE_PROFILES: Record<TitleDesignSceneKey, TitleSceneStyleProfile> = {
  achievementShowcase: scene("achievementShowcase", "成果展示标题", ["舞台感", "成果感", "家长信任"], "stableSans", "leadHero", "medium", "achievement", ["verticalHeroStack", "stageMonument", "staggeredColumn", "centerStageLockup", "splitLeadHero"], ["stageSplitHero", "stageMedalTitle", "businessLaunchHero"], ["cleanBrandCentered", "literaryMagazineBlock"], ["campaignDiagonalImpact", "campaignTagStack", "ipPlayfulStack", "ipBadgeTitle", "modernChineseVerticalSeal", "modernChineseScrollTitle"], sizing(0.16, 0.06, 0.54, 1.65, 32, 6), ["标题应像成果展示主视觉，不是普通说明文字。"]),
  businessLaunch: scene("businessLaunch", "品牌发布标题", ["发布会", "正式", "品牌 KV"], "stableSans", "heroFirst", "medium", "business", ["stageMonument", "centerStageLockup", "splitLeadHero"], ["businessLaunchHero", "stageSplitHero"], ["stageMedalTitle", "cleanBrandCentered"], ["ipPlayfulStack", "ipBadgeTitle", "modernChineseVerticalSeal"], sizing(0.15, 0.055, 0.52, 1.55, 30, 4), ["标题要有品牌发布重量。"]),
  modernChinese: scene("modernChinese", "现代国风标题", ["文化感", "题签", "留白"], "culturalSerif", "leadHero", "light", "modernChinese", ["verticalHeroStack", "centerStageLockup", "splitLeadHero"], ["modernChineseVerticalSeal", "modernChineseScrollTitle"], ["literaryMagazineBlock", "literaryBookTitle"], ["campaignDiagonalImpact", "campaignTagStack", "ipPlayfulStack", "ipBadgeTitle"], sizing(0.13, 0.05, 0.46, 1.45, 28, 3), ["国风来自空间和题签秩序，不是逐字竖排。"]),
  campaign: scene("campaign", "招生转化标题", ["行动", "抓眼", "转化"], "campaignDisplay", "heroFirst", "strong", "campaign", ["splitLeadHero", "staggeredColumn", "centerStageLockup"], ["campaignDiagonalImpact", "campaignTagStack"], ["businessLaunchHero", "cleanBrandCentered"], ["modernChineseVerticalSeal", "modernChineseScrollTitle", "literaryMagazineBlock", "literaryBookTitle"], sizing(0.17, 0.065, 0.58, 1.75, 30, 8), ["关键词应承担最大视觉冲击。"]),
  literary: scene("literary", "文学编辑标题", ["书卷气", "编辑感", "克制"], "literaryKai", "hookSupport", "light", "literary", ["centerStageLockup", "splitLeadHero", "verticalHeroStack"], ["literaryMagazineBlock", "literaryBookTitle"], ["modernChineseScrollTitle", "cleanBrandCentered"], ["campaignDiagonalImpact", "campaignTagStack", "ipPlayfulStack"], sizing(0.12, 0.048, 0.44, 1.35, 28, 2), ["克制但不能缩成小字。"]),
  ipEvent: scene("ipEvent", "IP 活动标题", ["活泼", "亲和", "品牌活动"], "playfulMarker", "leadHero", "medium", "playful", ["staggeredColumn", "badgeHeroLockup", "splitLeadHero"], ["ipPlayfulStack", "ipBadgeTitle"], ["campaignTagStack", "cleanBrandCentered"], ["modernChineseVerticalSeal", "modernChineseScrollTitle", "businessLaunchHero"], sizing(0.15, 0.055, 0.5, 1.55, 28, 6), ["活泼感来自节奏，不是散乱。"]),
  cleanNotice: scene("cleanNotice", "品牌清晰标题", ["清楚", "正式", "信息优先"], "cleanSystem", "informationFirst", "none", "clean", ["centerStageLockup", "splitLeadHero"], ["cleanBrandCentered"], ["businessLaunchHero", "literaryBookTitle"], ["campaignDiagonalImpact", "modernChineseVerticalSeal", "ipPlayfulStack"], sizing(0.1, 0.04, 0.38, 1.25, 24, 0), ["只用于通知或安全兜底。"]),
};

function shape(key: TitleFontShapeKey, fontKeys: StandardFontKey[], fallbackShape: TitleFontShapeKey, suitableScenes: TitleDesignSceneKey[], avoidScenes: TitleDesignSceneKey[], traits: string[], riskNotes: string[]): TitleFontShapeProfile {
  return { key, fontKeys, fallbackShape, suitableScenes, avoidScenes, traits, riskNotes };
}

function sizing(targetLockupAreaRatio: number, minAcceptableLockupAreaRatio: number, targetUnitFillRatio: number, heroToLeadWeightRatio: number, subtitleMinHeightPx: number, maxRotationDeg: number): TitleAdaptiveSizingPolicy {
  return { targetLockupAreaRatio, minAcceptableLockupAreaRatio, targetUnitFillRatio, heroToLeadWeightRatio, subtitleMinHeightPx, maxRotationDeg };
}

function scene(sceneKey: TitleDesignSceneKey, label: string, titleMood: string[], fontShape: TitleFontShapeKey, hierarchyPosture: TitleHierarchyPosture, decorationDensity: TitleDecorationDensity, titleStylePreset: TitleFontPresetKey, preferredCompositionModes: TitleCompositionMode[], preferredPatterns: TitleReferencePatternKey[], secondaryPatterns: TitleReferencePatternKey[], disallowedPatterns: TitleReferencePatternKey[], adaptiveSizing: TitleAdaptiveSizingPolicy, qualityHints: string[]): TitleSceneStyleProfile {
  return { sceneKey, label, titleMood, fontShape, hierarchyPosture, decorationDensity, titleStylePreset, preferredCompositionModes, preferredPatterns, secondaryPatterns, disallowedPatterns, adaptiveSizing, qualityHints };
}
