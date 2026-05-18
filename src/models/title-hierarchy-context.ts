export type TitleHierarchyHookSource =
  | "mainTitle"
  | "subtitle"
  | "titleBrief"
  | "eventBrief"
  | "visualDetails"
  | "manual"
  | "none";

export type TitleHierarchyRisk = "none" | "medium" | "high";

export type TitleHierarchyIntent =
  | "mainTitlePrimary"
  | "subtitleHookSupport"
  | "briefOnlyThemeSupport"
  | "mainTitleKeywordEmphasis";

export type TitleSubtitlePriority = "normal" | "strong" | "preserveIfSafe";

export type TitleHierarchyContext = {
  source: "standard-form-v2-primary-message";
  mainTitle: string;
  subtitle?: string;
  primaryMessage?: string;
  hookSource: TitleHierarchyHookSource;
  mainTitleMismatch: boolean;
  titleHierarchyRisk: TitleHierarchyRisk;
  titleBrief?: string;
  titleEmphasisWords?: string[];
  hierarchyIntent: TitleHierarchyIntent;
  recommendedSubtitlePriority: TitleSubtitlePriority;
  visibleTextPolicy: {
    preserveMainTitle: true;
    noNewTitleText: true;
    allowedVisibleText: string[];
  };
  warnings: string[];
};
