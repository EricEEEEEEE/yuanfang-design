export type YuanfangVisualFamilyKey =
  | "companyActivity"
  | "brandEvent"
  | "openClass"
  | "enrollment"
  | "literaryActivity"
  | "campusActivity"
  | "teachingCompetition"
  | "guofengLiterature"
  | "poetryFestival"
  | "achievementShowcase";

export type YuanfangRuleDimensionKey =
  | "themeClarity"
  | "visualDensity"
  | "brandFeeling"
  | "titleDominance"
  | "layoutDiversity"
  | "titleSafeZone"
  | "logoSafeZone"
  | "mascotRole"
  | "backgroundComplexity"
  | "textPollutionRisk"
  | "aiGenericRisk"
  | "customerUsability";

export type YuanfangLayoutGrammarKey =
  | "topHeroTitle"
  | "leftTitleRightVisual"
  | "rightTitleLeftVisual"
  | "centerHeroLockup"
  | "diagonalCampaignFlow"
  | "verticalSealTitle"
  | "bottomInformationPanel"
  | "stageShowcase"
  | "splitColorBlock"
  | "frameContainer";

export type YuanfangLogoStrategyKey =
  | "colorFullLockup"
  | "whiteLockup"
  | "deepBlueLockup"
  | "repositionPreferred"
  | "minimalProtectionPatch";

export type YuanfangCanvasIntentKey =
  | "verticalPoster"
  | "horizontalKeyVisual"
  | "squareSocial";

export type YuanfangAspectRatioClass = "vertical" | "horizontal" | "square";

export type YuanfangStyleTreatmentKey =
  | "brandKineticKV"
  | "boldEnrollmentCampaign"
  | "literaryEditorialCollage"
  | "modernGuofengInk"
  | "warmAchievementStage"
  | "campusHonorFormal"
  | "techBlueLearning"
  | "premiumMinimalNotice";

export type YuanfangRuleConsumer = "L3_BACKGROUND" | "L4_SPATIAL" | "L5_PRIMARY_MESSAGE" | "L6_TITLE";

export type YuanfangRuleDimension = {
  key: YuanfangRuleDimensionKey;
  ruleKey: string;
  target: string;
  acceptance: string[];
  failureSignals: string[];
  appliesTo: YuanfangVisualFamilyKey[];
  consumers: YuanfangRuleConsumer[];
};

export type YuanfangVisualBenchmarkFamily = {
  key: YuanfangVisualFamilyKey;
  label: string;
  aliases: YuanfangVisualFamilyKey[];
  usedFor: string[];
  visualRequirements: string[];
  requiredDimensions: YuanfangRuleDimensionKey[];
  preferredLayouts: YuanfangLayoutGrammarKey[];
  preferredStyleTreatments: YuanfangStyleTreatmentKey[];
  preferredCanvasIntents: YuanfangCanvasIntentKey[];
  logoStrategyHints: YuanfangLogoStrategyKey[];
  forbiddenSignals: string[];
  primaryMotifs: string[];
  titleExpectation: string;
  benchmarkIntent: string;
};

export type YuanfangLayoutGrammar = {
  key: YuanfangLayoutGrammarKey;
  label: string;
  families: YuanfangVisualFamilyKey[];
  titlePlacement: string;
  visualSubjectPlacement: string;
  logoSafeZone: string;
  titleSafeZone: string;
  canvasSuitability: YuanfangAspectRatioClass[];
  forbiddenWhen: string[];
};

export type YuanfangLogoStrategy = {
  key: YuanfangLogoStrategyKey;
  label: string;
  logoVariantHint: string;
  placementCandidates: string[];
  protectionPolicy: string;
  promptGuidance: string;
  forbiddenSignals: string[];
};

export type YuanfangCanvasIntent = {
  key: YuanfangCanvasIntentKey;
  label: string;
  aspectRatioClass: YuanfangAspectRatioClass;
  futureCanvas: string;
  suitableFor: string[];
  promptGuidance: string;
};

export type YuanfangStyleTreatment = {
  key: YuanfangStyleTreatmentKey;
  label: string;
  suitableFamilies: YuanfangVisualFamilyKey[];
  promptGuidance: string;
  colorEnergy: string;
  motifTreatment: string;
  avoid: string[];
};

export type YuanfangTitleRule = {
  key: string;
  ruleKey: string;
  description: string;
  acceptance: string[];
  failureSignals: string[];
  consumers: YuanfangRuleConsumer[];
};

export type YuanfangBackgroundRule = {
  key: string;
  ruleKey: string;
  description: string;
  acceptance: string[];
  failureSignals: string[];
  consumers: YuanfangRuleConsumer[];
};

export type YuanfangNegativeRule = {
  key: string;
  ruleKey: string;
  description: string;
  consumers: YuanfangRuleConsumer[];
};

export type YuanfangVisualRuleLayer = {
  source: "yuanfang-visual-rules-l2";
  benchmarkSource: string;
  families: Record<YuanfangVisualFamilyKey, YuanfangVisualBenchmarkFamily>;
  dimensions: Record<YuanfangRuleDimensionKey, YuanfangRuleDimension>;
  layouts: Record<YuanfangLayoutGrammarKey, YuanfangLayoutGrammar>;
  logoStrategies: Record<YuanfangLogoStrategyKey, YuanfangLogoStrategy>;
  canvasIntents: Record<YuanfangCanvasIntentKey, YuanfangCanvasIntent>;
  styleTreatments: Record<YuanfangStyleTreatmentKey, YuanfangStyleTreatment>;
  titleRules: YuanfangTitleRule[];
  backgroundRules: YuanfangBackgroundRule[];
  negativeRules: YuanfangNegativeRule[];
  consumerMapping: Record<YuanfangRuleConsumer, string[]>;
};
