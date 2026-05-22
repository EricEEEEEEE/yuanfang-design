import { TITLE_COMPOSITION_GRAMMAR, type TitleCompositionMode } from "@/config/title-composition-grammar";
import {
  TITLE_FONT_SHAPE_PROFILES,
  TITLE_SCENE_STYLE_PROFILES,
  type TitleAdaptiveSizingPolicy,
  type TitleDesignPlan,
  type TitleDesignSceneKey,
  type TitleReferencePatternPlan,
  type TitleTypographyStrategy,
} from "@/config/title-design-system";
import { TITLE_FONT_REGISTRY } from "@/config/title-font-registry";
import type { TitleHierarchyContext } from "@/models/title-hierarchy-context";
import type { TitleFontRegistry, VectorTitleRole } from "@/models/title-vector-glyph-renderer";
import type { SpatialStrategy } from "@/services/spatial-strategy-planner.service";

export type ResolveTitleDesignPlanInput = {
  mainTitle: string;
  subtitle?: string;
  designFamily?: string;
  productOutputType?: string;
  eventBrief?: string;
  styleBrief?: string;
  visualDetails?: string;
  spatialStrategy: SpatialStrategy;
  titleHierarchyContext?: TitleHierarchyContext;
};

export function resolveTitleDesignPlan(input: ResolveTitleDesignPlanInput): TitleDesignPlan {
  const sceneKey = resolveSceneKey(input);
  const scene = TITLE_SCENE_STYLE_PROFILES[sceneKey];
  const fontShape = TITLE_FONT_SHAPE_PROFILES[scene.fontShape];
  const referencePatternPlan = resolveReferencePatternPlan(input.spatialStrategy, scene);
  const allowedModes = resolveAllowedModes(input.spatialStrategy.orientationPreference, scene.preferredCompositionModes);
  const typographyStrategy = resolveTypographyStrategy(sceneKey, scene.fontShape);
  const adaptiveSizingPolicy = adjustSizing(scene.adaptiveSizing, input.mainTitle, input.titleHierarchyContext);
  const diagnostics = buildDiagnostics(input, sceneKey, allowedModes, referencePatternPlan);

  return {
    planId: `l7-${sceneKey}-${input.spatialStrategy.primaryTextAnchorId}`,
    source: "rule-based-l7-v1",
    sceneStyleProfile: { ...scene, adaptiveSizing: adaptiveSizingPolicy },
    spatialTitleIntent: {
      orientationPreference: input.spatialStrategy.orientationPreference,
      strategyMode: input.spatialStrategy.strategyMode,
      primaryTextAnchorId: input.spatialStrategy.primaryTextAnchorId,
      negativeSpaceShape: input.spatialStrategy.backgroundLayout.negativeSpaceShape,
      dominantFlow: input.spatialStrategy.backgroundLayout.dominantFlow,
      recommendedTitleFlow: input.spatialStrategy.backgroundLayout.recommendedTitleFlow,
    },
    referencePatternPlan,
    lockupCompositionPlan: {
      allowedModes,
      preferredModes: allowedModes.slice(0, 6),
      forbiddenModes: ["platformCaption"],
    },
    typographyStrategy,
    fontShapePlan: fontShape,
    adaptiveSizingPolicy,
    hierarchyPlan: {
      posture: scene.hierarchyPosture,
      mainTitleRole: "hero",
      subtitlePriority: input.titleHierarchyContext?.recommendedSubtitlePriority ?? "normal",
      primaryMessagePolicy: input.titleHierarchyContext?.primaryMessage ? "rhythmOnly" : "visibleTextOnly",
      emphasisPolicy: "mainTitleSubstringOnly",
    },
    rendererStylePlan: {
      titleStylePreset: scene.titleStylePreset,
      decorationDensity: scene.decorationDensity,
      contrastPolicy: "brandStrokeAndShadow",
    },
    designQualityGates: [
      "scene_pattern_match",
      "font_shape_match",
      "composition_mode_allowed",
      "adaptive_sizing_target",
      "hierarchy_posture_match",
      "no_disallowed_reference_pattern",
    ],
    diagnostics,
  };
}

export function titleFontRegistryForDesignPlan(
  plan: TitleDesignPlan,
  base: TitleFontRegistry = TITLE_FONT_REGISTRY,
): TitleFontRegistry {
  const roleFonts: Record<VectorTitleRole, TitleFontRegistry["roleFonts"][VectorTitleRole]> = {
    ...base.roleFonts,
    hero: plan.typographyStrategy.roleFontKeys.hero[0] ?? base.roleFonts.hero,
    lead: plan.typographyStrategy.roleFontKeys.lead[0] ?? base.roleFonts.lead,
    accent: plan.typographyStrategy.roleFontKeys.accent[0] ?? base.roleFonts.accent,
    support: plan.typographyStrategy.roleFontKeys.lead[0] ?? base.roleFonts.support,
    subtitle: plan.typographyStrategy.roleFontKeys.subtitle[0] ?? base.roleFonts.subtitle,
  };

  return { ...base, roleFonts };
}

function resolveSceneKey(input: ResolveTitleDesignPlanInput): TitleDesignSceneKey {
  const intent = input.spatialStrategy.contentIntent;
  if (intent in TITLE_SCENE_STYLE_PROFILES) return intent as TitleDesignSceneKey;
  if (input.designFamily === "achievementShowcase") return "achievementShowcase";
  if (input.designFamily === "businessLaunch") return "businessLaunch";
  if (input.designFamily === "modernChinese") return "modernChinese";
  if (input.designFamily === "boldCampaign") return "campaign";
  if (input.designFamily === "literaryEditorial") return "literary";
  if (input.designFamily === "ipCartoonEvent") return "ipEvent";
  return "cleanNotice";
}

function resolveReferencePatternPlan(
  spatialStrategy: SpatialStrategy,
  scene: typeof TITLE_SCENE_STYLE_PROFILES[TitleDesignSceneKey],
): TitleReferencePatternPlan {
  const disallowed = unique([...spatialStrategy.patternPool.disallowed, ...scene.disallowedPatterns]);
  const allowed = (keys: typeof scene.preferredPatterns) => keys.filter((key) => !disallowed.includes(key));
  const primary = unique([...allowed(scene.preferredPatterns), ...spatialStrategy.patternPool.primary.filter((key) => !disallowed.includes(key))]).slice(0, 4);
  const secondary = unique([...allowed(scene.secondaryPatterns), ...spatialStrategy.patternPool.secondary.filter((key) => !disallowed.includes(key))]).slice(0, 4);
  const exploratory = spatialStrategy.patternPool.exploratory.filter((key) => !disallowed.includes(key)).slice(0, 2);

  return {
    primary: primary.length > 0 ? primary : ["cleanBrandCentered"],
    secondary,
    exploratory,
    disallowed,
    mutationBounds: ["splitUnits", "resizeUnits", "moveTitleBox", "changeSubtitlePlacement"],
  };
}

function resolveAllowedModes(orientationPreference: string, preferred: TitleCompositionMode[]): TitleCompositionMode[] {
  const filtered = preferred.filter((mode) => TITLE_COMPOSITION_GRAMMAR[mode].anchorUsagePolicy === "mainTitleAllowed");
  const vertical = filtered.filter((mode) => TITLE_COMPOSITION_GRAMMAR[mode].flowAxis === "vertical");
  const horizontal = filtered.filter((mode) => TITLE_COMPOSITION_GRAMMAR[mode].flowAxis === "horizontal");
  const centered = filtered.filter((mode) => TITLE_COMPOSITION_GRAMMAR[mode].flowAxis === "centered");
  const diagonal = filtered.filter((mode) => TITLE_COMPOSITION_GRAMMAR[mode].flowAxis === "diagonal");

  if (orientationPreference === "verticalFirst") return unique([...vertical, ...centered, ...horizontal, ...diagonal]);
  if (orientationPreference === "horizontalFirst") return unique([...horizontal, ...centered, ...vertical, ...diagonal]);
  if (orientationPreference === "diagonalAllowed") return unique([...diagonal, ...vertical, ...horizontal, ...centered]);
  return unique([...centered, ...vertical, ...horizontal, ...diagonal]);
}

function resolveTypographyStrategy(sceneKey: TitleDesignSceneKey, fontShapeKey: keyof typeof TITLE_FONT_SHAPE_PROFILES): TitleTypographyStrategy {
  const heroShape = TITLE_FONT_SHAPE_PROFILES[fontShapeKey];
  const subtitleShape = sceneKey === "literary" ? TITLE_FONT_SHAPE_PROFILES.literaryKai : TITLE_FONT_SHAPE_PROFILES.stableSans;
  const accentShape = sceneKey === "campaign" ? TITLE_FONT_SHAPE_PROFILES.campaignDisplay : TITLE_FONT_SHAPE_PROFILES.roundedFriendly;

  return {
    heroFontShape: heroShape.key,
    leadFontShape: heroShape.key,
    accentFontShape: accentShape.key,
    subtitleFontShape: subtitleShape.key,
    roleFontKeys: {
      hero: heroShape.fontKeys,
      lead: heroShape.fontKeys,
      accent: accentShape.fontKeys,
      subtitle: subtitleShape.fontKeys,
    },
    riskNotes: unique([...heroShape.riskNotes, ...accentShape.riskNotes, ...subtitleShape.riskNotes]),
  };
}

function adjustSizing(policy: TitleAdaptiveSizingPolicy, mainTitle: string, context?: TitleHierarchyContext): TitleAdaptiveSizingPolicy {
  const length = Array.from(mainTitle).length;
  const longTitlePenalty = length > 10 ? -0.02 : length <= 5 ? 0.01 : 0;
  const subtitleBoost = context?.recommendedSubtitlePriority === "strong" ? 4 : 0;

  return {
    ...policy,
    targetLockupAreaRatio: round(Math.max(policy.minAcceptableLockupAreaRatio, policy.targetLockupAreaRatio + longTitlePenalty)),
    subtitleMinHeightPx: policy.subtitleMinHeightPx + subtitleBoost,
  };
}

function buildDiagnostics(input: ResolveTitleDesignPlanInput, sceneKey: TitleDesignSceneKey, modes: TitleCompositionMode[], patterns: TitleReferencePatternPlan): string[] {
  return [
    `scene=${sceneKey}`,
    `anchor=${input.spatialStrategy.primaryTextAnchorId}`,
    `orientation=${input.spatialStrategy.orientationPreference}`,
    `modes=${modes.join("+")}`,
    `primaryPatterns=${patterns.primary.join("+")}`,
    `subtitlePriority=${input.titleHierarchyContext?.recommendedSubtitlePriority ?? "normal"}`,
  ];
}

function unique<T extends string>(values: readonly T[]): T[] {
  return Array.from(new Set(values));
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}
