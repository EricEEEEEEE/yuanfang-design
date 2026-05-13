import {
  analyzeBackgroundLayout,
  type BackgroundLayoutAnalysisResult,
  type TextAnchor,
} from "@/services/background-layout-intelligence.service";
import {
  TITLE_REFERENCE_PATTERNS,
  type TitleReferencePatternKey,
} from "@/config/title-reference-patterns";

export type ContentIntentType =
  | "achievementShowcase"
  | "businessLaunch"
  | "modernChinese"
  | "campaign"
  | "literary"
  | "ipEvent"
  | "cleanNotice";

export type TitleSpatialStrategyMode =
  | "followBackgroundShape"
  | "centerLockup"
  | "contrastMotion"
  | "edgeLockup";

export type TitleOrientationPreference =
  | "verticalFirst"
  | "horizontalFirst"
  | "diagonalAllowed"
  | "stackedAllowed";

export type SpatialStrategyPatternPool = {
  primary: TitleReferencePatternKey[];
  secondary: TitleReferencePatternKey[];
  exploratory: TitleReferencePatternKey[];
  disallowed: TitleReferencePatternKey[];
};

export type SpatialStrategy = {
  source: "ai" | "fallback";
  contentIntent: ContentIntentType;
  strategyMode: TitleSpatialStrategyMode;
  orientationPreference: TitleOrientationPreference;
  primaryTextAnchorId: string;
  secondaryTextAnchorIds: string[];
  patternPool: SpatialStrategyPatternPool;
  candidateGuidance: string[];
  forbiddenGuidance: string[];
  reason: string;
  backgroundLayout: BackgroundLayoutAnalysisResult;
};

export type PlanSpatialStrategyInput = {
  backgroundImageBase64: string;
  mainTitle: string;
  subtitle?: string;
  designFamily?: string;
  layoutFamily?: string;
  productOutputType?: string;
  eventBrief?: string;
  styleBrief?: string;
  visualDetails?: string;
  avoidNotes?: string;
};

const FALLBACK_ANCHOR: TextAnchor = {
  id: "fallbackCenterAnchor",
  safeZoneId: "fallbackCenterSafeZone",
  x: 260,
  y: 160,
  width: 480,
  height: 520,
  preferredOrientation: "vertical",
  recommendedTitleFlow: "followShape",
  priority: 1,
  confidence: 0.5,
  reason: "fallback center anchor for spatial strategy planning.",
};

export async function planSpatialStrategy(
  input: PlanSpatialStrategyInput,
): Promise<SpatialStrategy> {
  const backgroundLayout = await analyzeBackgroundLayout({
    backgroundImageBase64: input.backgroundImageBase64,
    designFamily: input.designFamily,
    layoutFamily: input.layoutFamily,
    productOutputType: input.productOutputType,
    eventBrief: input.eventBrief,
    visualDetails: input.visualDetails,
    avoidNotes: input.avoidNotes,
  });
  const contentIntent = getContentIntent(input);
  const strategyMode = getStrategyMode(backgroundLayout);
  const orientationPreference = getOrientationPreference(backgroundLayout);
  const primaryTextAnchor = selectPrimaryTextAnchor(backgroundLayout);
  const patternPool = getPatternPool(contentIntent, backgroundLayout);

  return {
    source: backgroundLayout.source,
    contentIntent,
    strategyMode,
    orientationPreference,
    primaryTextAnchorId: primaryTextAnchor.id,
    secondaryTextAnchorIds: selectSecondaryTextAnchors(backgroundLayout, primaryTextAnchor.id),
    patternPool,
    candidateGuidance: buildCandidateGuidance(
      primaryTextAnchor.id,
      orientationPreference,
      strategyMode,
      backgroundLayout,
    ),
    forbiddenGuidance: buildForbiddenGuidance(),
    reason: buildReason(contentIntent, strategyMode, orientationPreference, primaryTextAnchor),
    backgroundLayout,
  };
}

function getContentIntent(input: PlanSpatialStrategyInput): ContentIntentType {
  if (input.designFamily === "achievementShowcase") return "achievementShowcase";
  if (input.designFamily === "businessLaunch") return "businessLaunch";
  if (input.designFamily === "modernChinese") return "modernChinese";
  if (input.designFamily === "boldCampaign") return "campaign";
  if (input.designFamily === "literaryEditorial") return "literary";
  if (input.designFamily === "ipCartoonEvent") return "ipEvent";

  const text = `${input.eventBrief || ""} ${input.mainTitle || ""}`;

  if (hasKeyword(text, ["成长", "汇报", "成果", "展示"])) return "achievementShowcase";
  if (hasKeyword(text, ["发布", "周年", "会议"])) return "businessLaunch";
  if (hasKeyword(text, ["国学", "诗词", "名著", "传统"])) return "modernChinese";
  if (hasKeyword(text, ["招生", "报名", "开班"])) return "campaign";
  if (hasKeyword(text, ["阅读", "文学", "书"])) return "literary";
  if (hasKeyword(text, ["游园", "夏令营", "暑期营", "IP"])) return "ipEvent";

  return "cleanNotice";
}

function getStrategyMode(layout: BackgroundLayoutAnalysisResult): TitleSpatialStrategyMode {
  if (layout.recommendedTitleFlow === "followShape") return "followBackgroundShape";
  if (layout.recommendedTitleFlow === "centerLockup") return "centerLockup";
  if (layout.recommendedTitleFlow === "contrastShape") return "contrastMotion";
  if (layout.recommendedTitleFlow === "edgeLockup") return "edgeLockup";

  return "centerLockup";
}

function getOrientationPreference(layout: BackgroundLayoutAnalysisResult): TitleOrientationPreference {
  if (layout.negativeSpaceShape === "verticalColumn" || layout.dominantFlow === "vertical") {
    return "verticalFirst";
  }

  if (layout.negativeSpaceShape === "horizontalBand" || layout.dominantFlow === "horizontal") {
    return "horizontalFirst";
  }

  if (
    layout.negativeSpaceShape === "diagonalRibbon" ||
    layout.dominantFlow === "diagonalUp" ||
    layout.dominantFlow === "diagonalDown"
  ) {
    return "diagonalAllowed";
  }

  const primaryAnchor = selectPrimaryTextAnchor(layout);

  if (primaryAnchor.preferredOrientation === "vertical") return "verticalFirst";
  if (primaryAnchor.preferredOrientation === "horizontal") return "horizontalFirst";
  if (primaryAnchor.preferredOrientation === "diagonal") return "diagonalAllowed";

  return "stackedAllowed";
}

function selectPrimaryTextAnchor(layout: BackgroundLayoutAnalysisResult): TextAnchor {
  return sortedTextAnchors(layout.textAnchors)[0] || FALLBACK_ANCHOR;
}

function selectSecondaryTextAnchors(
  layout: BackgroundLayoutAnalysisResult,
  primaryId: string,
): string[] {
  return sortedTextAnchors(layout.textAnchors)
    .filter((anchor) => anchor.id !== primaryId)
    .slice(0, 3)
    .map((anchor) => anchor.id);
}

function getPatternPool(
  intent: ContentIntentType,
  layout: BackgroundLayoutAnalysisResult,
): SpatialStrategyPatternPool {
  const basePool = getBasePatternPool(intent);

  if (
    layout.negativeSpaceShape === "diagonalRibbon" &&
    !basePool.disallowed.includes("campaignDiagonalImpact") &&
    !basePool.secondary.includes("campaignDiagonalImpact")
  ) {
    return {
      ...basePool,
      secondary: knownPatterns([...basePool.secondary, "campaignDiagonalImpact"]),
    };
  }

  return basePool;
}

function getBasePatternPool(intent: ContentIntentType): SpatialStrategyPatternPool {
  if (intent === "achievementShowcase") {
    return {
      primary: knownPatterns(["stageSplitHero", "stageMedalTitle", "businessLaunchHero"]),
      secondary: knownPatterns(["cleanBrandCentered", "literaryMagazineBlock"]),
      exploratory: knownPatterns(["literaryBookTitle"]),
      disallowed: knownPatterns([
        "campaignDiagonalImpact",
        "campaignTagStack",
        "ipPlayfulStack",
        "ipBadgeTitle",
        "modernChineseVerticalSeal",
        "modernChineseScrollTitle",
      ]),
    };
  }

  if (intent === "businessLaunch") {
    return {
      primary: knownPatterns(["businessLaunchHero", "stageSplitHero"]),
      secondary: knownPatterns(["stageMedalTitle", "cleanBrandCentered"]),
      exploratory: knownPatterns(["literaryMagazineBlock"]),
      disallowed: knownPatterns(["campaignDiagonalImpact", "campaignTagStack", "ipPlayfulStack", "ipBadgeTitle", "modernChineseVerticalSeal"]),
    };
  }

  if (intent === "modernChinese") {
    return {
      primary: knownPatterns(["modernChineseVerticalSeal", "modernChineseScrollTitle"]),
      secondary: knownPatterns(["literaryMagazineBlock", "literaryBookTitle"]),
      exploratory: knownPatterns(["cleanBrandCentered"]),
      disallowed: knownPatterns(["campaignDiagonalImpact", "campaignTagStack", "ipPlayfulStack", "ipBadgeTitle"]),
    };
  }

  if (intent === "campaign") {
    return {
      primary: knownPatterns(["campaignDiagonalImpact", "campaignTagStack"]),
      secondary: knownPatterns(["businessLaunchHero", "cleanBrandCentered"]),
      exploratory: knownPatterns(["ipBadgeTitle"]),
      disallowed: knownPatterns(["modernChineseVerticalSeal", "modernChineseScrollTitle", "literaryMagazineBlock", "literaryBookTitle"]),
    };
  }

  if (intent === "literary") {
    return {
      primary: knownPatterns(["literaryMagazineBlock", "literaryBookTitle"]),
      secondary: knownPatterns(["modernChineseScrollTitle", "cleanBrandCentered"]),
      exploratory: knownPatterns(["modernChineseVerticalSeal"]),
      disallowed: knownPatterns(["campaignDiagonalImpact", "campaignTagStack", "ipPlayfulStack", "ipBadgeTitle"]),
    };
  }

  if (intent === "ipEvent") {
    return {
      primary: knownPatterns(["ipPlayfulStack", "ipBadgeTitle"]),
      secondary: knownPatterns(["campaignTagStack", "cleanBrandCentered"]),
      exploratory: knownPatterns(["literaryBookTitle"]),
      disallowed: knownPatterns(["businessLaunchHero", "stageMedalTitle", "modernChineseVerticalSeal"]),
    };
  }

  return {
    primary: knownPatterns(["cleanBrandCentered", "businessLaunchHero"]),
    secondary: knownPatterns(["literaryBookTitle", "stageSplitHero"]),
    exploratory: knownPatterns(["literaryMagazineBlock"]),
    disallowed: knownPatterns(["campaignDiagonalImpact", "ipPlayfulStack", "modernChineseVerticalSeal"]),
  };
}

function buildCandidateGuidance(
  primaryTextAnchorId: string,
  orientationPreference: TitleOrientationPreference,
  strategyMode: TitleSpatialStrategyMode,
  layout: BackgroundLayoutAnalysisResult,
): string[] {
  const guidance = [
    `使用 ${primaryTextAnchorId} 作为主要标题空间锚点。`,
    "所有候选必须绑定 spatialAnchorId 或 textAnchor id。",
    `标题方向必须服从 orientationPreference: ${orientationPreference}。`,
    "reference patterns 是设计语法，不是模板。",
    "pattern 不得压过背景空间判断。",
  ];

  if (orientationPreference === "verticalFirst") {
    guidance.push("候选应沿竖向留白/聚光柱组织，不要全部机械横排。");
    guidance.push("可使用“成长 / 汇报课”上下或竖向错落。");
  }

  if (orientationPreference === "horizontalFirst") {
    guidance.push("候选可横向展开，但必须有主次字组层级。");
  }

  if (strategyMode === "contrastMotion") {
    guidance.push("候选可形成斜向张力，但不能为了变化而变化。");
  }

  if (layout.negativeSpaceShape === "verticalColumn" || layout.dominantFlow === "vertical") {
    guidance.push("即使使用 stage/business pattern，也要沿 verticalColumn 组织字组；不要把主题 pattern 误改成国风。");
  }

  if (layout.negativeSpaceShape === "horizontalBand") {
    guidance.push("优先横向展开，但仍需主次字组层级。");
  }

  if (layout.negativeSpaceShape === "diagonalRibbon") {
    guidance.push("可考虑 contrastMotion guidance；如果 campaignDiagonalImpact 被禁用，不要强行加入斜切营销 pattern。");
  }

  return guidance;
}

function buildForbiddenGuidance(): string[] {
  return [
    "不允许压 forbiddenZones。",
    "不允许覆盖 Logo / 主体 / 高复杂度细节。",
    "不允许只根据 designFamily 决定横排竖排。",
    "不允许候选与 negativeSpaceShape 脱节。",
    "不允许 fallback candidates 用于正式产品输出。",
  ];
}

function buildReason(
  contentIntent: ContentIntentType,
  strategyMode: TitleSpatialStrategyMode,
  orientationPreference: TitleOrientationPreference,
  primaryTextAnchor: TextAnchor,
): string {
  return `内容意图为 ${contentIntent}，背景策略为 ${strategyMode}，标题方向优先 ${orientationPreference}，主锚点为 ${primaryTextAnchor.id}。`;
}

function sortedTextAnchors(textAnchors: TextAnchor[]): TextAnchor[] {
  return [...textAnchors].sort((left, right) => {
    if (left.priority !== right.priority) {
      return left.priority - right.priority;
    }

    return right.confidence - left.confidence;
  });
}

function knownPatterns(keys: TitleReferencePatternKey[]): TitleReferencePatternKey[] {
  return keys.filter((key) => Boolean(TITLE_REFERENCE_PATTERNS[key]));
}

function hasKeyword(value: string, keywords: string[]): boolean {
  return keywords.some((keyword) => value.includes(keyword));
}
