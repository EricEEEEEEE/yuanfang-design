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

export type YuanfangTitleSafeGeometryShape =
  | "narrowLane"
  | "compactPanel"
  | "ribbon"
  | "cornerField"
  | "sideBand"
  | "spotlightPatch"
  | "editorialMargin";

export type YuanfangTitleSafeRenderMode =
  | "implicitNegativeSpace"
  | "embeddedQuietPocket"
  | "edgeLowDetailPocket"
  | "motionPathReserve"
  | "backgroundIntegratedReserve";

export type YuanfangTitleSafeGeometry = {
  maxCanvasAreaRatio: number;
  preferredAreaRatioRange: [number, number];
  shape: YuanfangTitleSafeGeometryShape;
  mustAnchorToVisualSubject: boolean;
  mustAvoidFullHeightPanel: boolean;
  mustAvoidFullWidthPanel: boolean;
  mustKeepBackgroundVisibleAround: boolean;
  constraintPrompt: string;
};

export type YuanfangAntiPatternKey =
  | "centerBlankBoard"
  | "overblankTitleZone"
  | "oversizedTitleSafeBoard"
  | "fullHeightBlankPanel"
  | "giantEmptyPlaque"
  | "emptySpotlightCurtain"
  | "centralPaperSheetDominance"
  | "titleSafeAreaOver40Percent"
  | "disconnectedTitleIsland"
  | "visibleTitleContainer"
  | "titleCardArtifact"
  | "standaloneBlankPaper"
  | "oversizedTextPlaque"
  | "fullHeightSideWall"
  | "centralDocumentDominance"
  | "labelPatchForTitle"
  | "emptyContainerForText"
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
  overlayReserveMode: YuanfangTitleSafeRenderMode;
  titleSafeGeometry: YuanfangTitleSafeGeometry;
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
