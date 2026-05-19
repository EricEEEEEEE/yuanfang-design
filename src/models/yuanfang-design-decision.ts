import type {
  YuanfangCanvasIntentKey,
  YuanfangLayoutGrammarKey,
  YuanfangLogoStrategyKey,
  YuanfangStyleTreatmentKey,
  YuanfangVisualFamilyKey,
} from "@/models/yuanfang-visual-rules";

export type YuanfangVisualFamilyDecisionKey =
  | "brandEventKV"
  | "enrollmentCampaign"
  | "literaryCourseVisual"
  | "guofengLiteratureVisual"
  | "achievementShowcaseVisual"
  | "campusHonorVisual"
  | "techLearningVisual"
  | "premiumNoticeVisual";

export type YuanfangCompositionFamilyKey =
  | "strongSideTitleVisual"
  | "asymmetricHeroComposition"
  | "diagonalMomentumComposition"
  | "framedEditorialComposition"
  | "stageDepthComposition"
  | "verticalSealComposition"
  | "splitColorBlockComposition"
  | "layeredCollageComposition"
  | "posterCardComposition";

export type YuanfangTitleSafeDesignKey =
  | "texturedPaperTitleField"
  | "colorBlockTitleField"
  | "spotlightTitleField"
  | "diagonalRibbonTitleLane"
  | "framedPlaqueTitleArea"
  | "sidePanelTitleField"
  | "editorialMarginTitleArea"
  | "stageLightTitleZone";

export type YuanfangVisualSubjectPlanKey =
  | "booksAndCharacters"
  | "stageAndWorks"
  | "guofengLandscapeAndScroll"
  | "brandLightTrailAndStage"
  | "teachingPodiumAndHonor"
  | "techWritingInterfaceAbstraction"
  | "courseValuePath";

export type YuanfangAntiPatternKey =
  | "centerBlankBoard"
  | "overblankTitleZone"
  | "lowerOnlyDecoration"
  | "softPastelSameness"
  | "fakeLogoPatch"
  | "genericAIWallpaper"
  | "tinyFloatingTitle"
  | "textLikeTextureNearSafeZone";

export type YuanfangDesignDecision = {
  decisionSource: "yuanfang-design-decision-v1";
  benchmarkFamily: YuanfangVisualFamilyKey;
  layoutGrammar: YuanfangLayoutGrammarKey;
  selectedVisualFamily: YuanfangVisualFamilyDecisionKey;
  selectedCompositionFamily: YuanfangCompositionFamilyKey;
  selectedStyleTreatment: YuanfangStyleTreatmentKey;
  selectedCanvasIntent: YuanfangCanvasIntentKey;
  selectedLogoStrategy: YuanfangLogoStrategyKey;
  selectedTitleSafeDesign: YuanfangTitleSafeDesignKey;
  selectedVisualSubjectPlan: YuanfangVisualSubjectPlanKey;
  titleSafeDesignPlan: string;
  logoSafeDesign: string;
  colorEnergy: string;
  densityPlan: string;
  motifPlan: string;
  textPollutionGuard: string;
  differentiationPlan: string;
  antiPatternWarnings: YuanfangAntiPatternKey[];
  negativeSignals: string[];
  promptDirectives: string[];
  decisionReason: string;
};
