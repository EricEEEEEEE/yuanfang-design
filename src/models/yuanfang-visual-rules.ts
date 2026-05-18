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
  canvasSuitability: Array<"vertical" | "horizontal">;
  forbiddenWhen: string[];
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
  titleRules: YuanfangTitleRule[];
  backgroundRules: YuanfangBackgroundRule[];
  negativeRules: YuanfangNegativeRule[];
  consumerMapping: Record<YuanfangRuleConsumer, string[]>;
};
