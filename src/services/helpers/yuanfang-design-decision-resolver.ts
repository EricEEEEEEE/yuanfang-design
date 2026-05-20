import { YUANFANG_VISUAL_RULE_LAYER } from "@/config/yuanfang-design-rules";
import type {
  YuanfangAntiPatternKey,
  YuanfangCompositionFamilyKey,
  YuanfangDesignDecision,
  YuanfangTitleSafeRenderMode,
  YuanfangTitleSafeGeometry,
  YuanfangTitleSafeDesignKey,
  YuanfangVisualFamilyDecisionKey,
  YuanfangVisualSubjectPlanKey,
} from "@/models/yuanfang-design-decision";
import type { StandardImagePromptContext } from "@/models/standard-background-generation";
import type { YuanfangLayoutGrammarKey, YuanfangVisualFamilyKey } from "@/models/yuanfang-visual-rules";
import type { ResolvedYuanfangVisualRules } from "@/services/helpers/yuanfang-visual-rule-resolver";
import { hasAny, splitAvoidNotes } from "@/services/helpers/standard-background-prompt-utils";

export function resolveYuanfangDesignDecision(
  context: StandardImagePromptContext,
  rules: ResolvedYuanfangVisualRules,
): YuanfangDesignDecision {
  const composition = compositionFamily(rules.family.key, rules.layout.key);
  const titleSafe = titleSafeDesign(composition, rules.family.key);
  const geometry = titleSafeGeometry(titleSafe);
  const overlayMode = overlayReserveMode(titleSafe);
  const subjectPlan = visualSubjectPlan(context, rules.family.key);
  const treatment = YUANFANG_VISUAL_RULE_LAYER.styleTreatments[rules.selectedStyleTreatment];
  return {
    decisionSource: "yuanfang-design-decision-v1",
    benchmarkFamily: rules.family.key,
    layoutGrammar: rules.layout.key,
    selectedVisualFamily: visualFamily(rules.family.key, rules.selectedStyleTreatment),
    selectedCompositionFamily: composition,
    selectedStyleTreatment: rules.selectedStyleTreatment,
    selectedCanvasIntent: rules.selectedCanvasIntent,
    selectedLogoStrategy: rules.selectedLogoStrategy,
    selectedTitleSafeDesign: titleSafe,
    selectedVisualSubjectPlan: subjectPlan,
    overlayReserveMode: overlayMode,
    titleSafeGeometry: geometry,
    titleSafeDesignPlan: titleSafeDesignPlan(titleSafe, overlayMode, geometry),
    logoSafeDesign: `${rules.logoProtectionPolicy}; protect icon, Chinese wordmark, and English wordmark together.`,
    colorEnergy: treatment.colorEnergy,
    densityPlan: densityPlan(composition),
    motifPlan: motifPlan(subjectPlan),
    textPollutionGuard: textPollutionGuard(subjectPlan),
    differentiationPlan: differentiationPlan(rules.family.key, subjectPlan),
    antiPatternWarnings: antiPatterns(rules.family.key, titleSafe),
    negativeSignals: splitAvoidNotes(context.form.avoidNotes ?? context.avoidNotes ?? "").slice(0, 6),
    promptDirectives: promptDirectives(composition, overlayMode, subjectPlan, geometry),
    decisionReason: `Combined ${rules.family.key}, ${rules.layout.key}, ${rules.selectedStyleTreatment}, ${rules.selectedCanvasIntent}, and ${rules.selectedLogoStrategy} before prompt assembly.`,
  };
}

function visualFamily(family: YuanfangVisualFamilyKey, style: string): YuanfangVisualFamilyDecisionKey {
  if (style === "techBlueLearning") return "techLearningVisual";
  if (family === "brandEvent" || family === "companyActivity") return "brandEventKV";
  if (family === "enrollment" || family === "openClass") return "enrollmentCampaign";
  if (family === "literaryActivity") return "literaryCourseVisual";
  if (family === "poetryFestival" || family === "guofengLiterature") return "guofengLiteratureVisual";
  if (family === "achievementShowcase") return "achievementShowcaseVisual";
  if (family === "teachingCompetition" || family === "campusActivity") return "campusHonorVisual";
  return "premiumNoticeVisual";
}

function compositionFamily(family: YuanfangVisualFamilyKey, layout: YuanfangLayoutGrammarKey): YuanfangCompositionFamilyKey {
  if (layout === "diagonalCampaignFlow") return "diagonalMomentumComposition";
  if (layout === "splitColorBlock") return "splitColorBlockComposition";
  if (layout === "verticalSealTitle") return "verticalSealComposition";
  if (layout === "leftTitleRightVisual" || layout === "rightTitleLeftVisual") return "strongSideTitleVisual";
  if (layout === "frameContainer") return family === "literaryActivity" ? "layeredCollageComposition" : "framedEditorialComposition";
  if (layout === "stageShowcase") return family === "teachingCompetition" ? "posterCardComposition" : "stageDepthComposition";
  if (layout === "centerHeroLockup") return "asymmetricHeroComposition";
  return "framedEditorialComposition";
}

function titleSafeDesign(composition: YuanfangCompositionFamilyKey, family: YuanfangVisualFamilyKey): YuanfangTitleSafeDesignKey {
  if (composition === "diagonalMomentumComposition") return "diagonalRibbonTitleLane";
  if (composition === "splitColorBlockComposition") return "colorBlockTitleField";
  if (composition === "verticalSealComposition") return "framedPlaqueTitleArea";
  if (composition === "strongSideTitleVisual") return "sidePanelTitleField";
  if (composition === "layeredCollageComposition") return "editorialMarginTitleArea";
  if (composition === "posterCardComposition") return "sidePanelTitleField";
  if (composition === "stageDepthComposition") return family === "achievementShowcase" ? "stageLightTitleZone" : "spotlightTitleField";
  return "texturedPaperTitleField";
}

function visualSubjectPlan(context: StandardImagePromptContext, family: YuanfangVisualFamilyKey): YuanfangVisualSubjectPlanKey {
  const text = [context.visualHook?.primaryHook, context.form.eventBrief, context.form.visualDetails, context.form.titleBrief].filter(Boolean).join(" ");
  if (hasAny(text, ["AI作文", "作文批改", "智能反馈"])) return "techWritingInterfaceAbstraction";
  if (family === "brandEvent" || family === "companyActivity") return "brandLightTrailAndStage";
  if (family === "teachingCompetition" || family === "campusActivity") return "teachingPodiumAndHonor";
  if (family === "achievementShowcase") return "stageAndWorks";
  if (family === "poetryFestival" || family === "guofengLiterature") return "guofengLandscapeAndScroll";
  if (family === "literaryActivity") return "booksAndCharacters";
  return "courseValuePath";
}

function antiPatterns(family: YuanfangVisualFamilyKey, titleSafe: YuanfangTitleSafeDesignKey): YuanfangAntiPatternKey[] {
  const patterns: YuanfangAntiPatternKey[] = ["genericAIWallpaper", "tinyFloatingTitle", "textLikeTextureNearSafeZone", "fakeLogoPatch", "centerBlankBoard", "overblankTitleZone", "oversizedTitleSafeBoard", "titleSafeAreaOver40Percent", "disconnectedTitleIsland", "visibleTitleContainer", "titleCardArtifact", "standaloneBlankPaper", "oversizedTextPlaque", "labelPatchForTitle", "emptyContainerForText"];
  if (titleSafe === "framedPlaqueTitleArea") patterns.push("giantEmptyPlaque", "oversizedTextPlaque");
  if (titleSafe === "sidePanelTitleField") patterns.push("fullHeightBlankPanel", "fullHeightSideWall");
  if (titleSafe === "stageLightTitleZone" || titleSafe === "spotlightTitleField") patterns.push("emptySpotlightCurtain");
  if (titleSafe === "editorialMarginTitleArea" || titleSafe === "texturedPaperTitleField") patterns.push("centralPaperSheetDominance", "centralDocumentDominance");
  if (family !== "brandEvent" && family !== "companyActivity") patterns.push("softPastelSameness");
  if (family === "enrollment" || family === "openClass" || family === "literaryActivity") patterns.push("lowerOnlyDecoration");
  return Array.from(new Set(patterns));
}

function densityPlan(composition: YuanfangCompositionFamilyKey): string {
  if (composition === "stageDepthComposition" || composition === "posterCardComposition") return "stage depth with side displays, layered light, podium planes, and readable calm areas";
  if (composition === "diagonalMomentumComposition") return "diagonal motion layers with a clear non-text hero subject";
  if (composition === "layeredCollageComposition") return "layered editorial foreground, midground motif, and embedded quiet visual pocket";
  if (composition === "verticalSealComposition") return "modern guofeng layers around a narrow seal-side low-detail pocket with adjacent breathing room";
  return "3-5 controlled layers with designed safe zones and visible family motif";
}

function overlayReserveMode(titleSafe: YuanfangTitleSafeDesignKey): YuanfangTitleSafeRenderMode {
  if (titleSafe === "diagonalRibbonTitleLane") return "motionPathReserve";
  if (titleSafe === "editorialMarginTitleArea" || titleSafe === "texturedPaperTitleField") return "edgeLowDetailPocket";
  if (titleSafe === "stageLightTitleZone" || titleSafe === "spotlightTitleField") return "implicitNegativeSpace";
  return "embeddedQuietPocket";
}

function titleSafeDesignPlan(titleSafe: YuanfangTitleSafeDesignKey, mode: YuanfangTitleSafeRenderMode, geometry: YuanfangTitleSafeGeometry): string {
  const map: Record<YuanfangTitleSafeDesignKey, string> = {
    texturedPaperTitleField: "low-detail pocket along an existing book or page edge, with no separate object",
    colorBlockTitleField: "compact low-detail portion within active brand color movement, with the background subject still primary",
    spotlightTitleField: "localized calm patch created by stage lighting gradient, with stage objects dominant",
    diagonalRibbonTitleLane: "low-detail segment along an existing dynamic ribbon path, not a dominant strip",
    framedPlaqueTitleArea: "small ornamental accent region or seal-side quiet pocket, not a visible label object",
    sidePanelTitleField: "narrow low-detail side pocket integrated with an existing wall, ribbon, or podium edge",
    editorialMarginTitleArea: "embedded quiet editorial margin along a side or corner of the existing composition",
    stageLightTitleZone: "localized calm patch created by stage light falloff, with stage objects dominant",
  };
  return `${mode}: ${map[titleSafe]}; ${geometry.constraintPrompt}`;
}

function titleSafeGeometry(titleSafe: YuanfangTitleSafeDesignKey): YuanfangTitleSafeGeometry {
  const shared = "implicit overlay reserve; low-detail pocket, visually integrated, not a separate object; background subject remains primary";
  const map: Record<YuanfangTitleSafeDesignKey, Omit<YuanfangTitleSafeGeometry, "constraintPrompt">> = {
    texturedPaperTitleField: baseGeometry("compactPanel", 0.28, [0.12, 0.24]),
    colorBlockTitleField: baseGeometry("cornerField", 0.28, [0.14, 0.26]),
    spotlightTitleField: baseGeometry("spotlightPatch", 0.32, [0.16, 0.3]),
    diagonalRibbonTitleLane: baseGeometry("ribbon", 0.26, [0.12, 0.22]),
    framedPlaqueTitleArea: baseGeometry("narrowLane", 0.3, [0.12, 0.24]),
    sidePanelTitleField: baseGeometry("sideBand", 0.3, [0.14, 0.26]),
    editorialMarginTitleArea: baseGeometry("editorialMargin", 0.28, [0.12, 0.24]),
    stageLightTitleZone: baseGeometry("spotlightPatch", 0.35, [0.18, 0.32]),
  };
  return { ...map[titleSafe], constraintPrompt: `${shared}; keep it below maxCanvasAreaRatio ${map[titleSafe].maxCanvasAreaRatio} and away from titleSafeAreaOver40Percent.` };
}

function baseGeometry(shape: YuanfangTitleSafeGeometry["shape"], maxCanvasAreaRatio: number, preferredAreaRatioRange: [number, number]): Omit<YuanfangTitleSafeGeometry, "constraintPrompt"> {
  return {
    shape,
    maxCanvasAreaRatio,
    preferredAreaRatioRange,
    mustAnchorToVisualSubject: true,
    mustAvoidFullHeightPanel: true,
    mustAvoidFullWidthPanel: true,
    mustKeepBackgroundVisibleAround: true,
  };
}

function motifPlan(plan: YuanfangVisualSubjectPlanKey): string {
  const map: Record<YuanfangVisualSubjectPlanKey, string> = {
    booksAndCharacters: "books, literary scene layers, and character silhouettes as theme memory points",
    stageAndWorks: "stage light, works wall, display table, and growth path",
    guofengLandscapeAndScroll: "scroll, modern ink landscape, festival plant, and literary space",
    brandLightTrailAndStage: "brand light trail, launch stage, course upgrade path, and brand color field",
    teachingPodiumAndHonor: "teaching podium, honor display, structured classroom/stage, and professional education cues",
    techWritingInterfaceAbstraction: "abstract writing revision panels, learning path, blue light arcs, and paper/book anchor",
    courseValuePath: "course modules, signup momentum, growth path, and clear theme symbol",
  };
  return map[plan];
}

function textPollutionGuard(plan: YuanfangVisualSubjectPlanKey): string {
  const base = "use abstract shapes, icons, color blocks, blank cards, blurred geometric marks; no pseudo text rows, fake handwritten lines, fake UI labels, fake certificate words, fake document paragraphs, or wall poster text blocks";
  if (plan === "techWritingInterfaceAbstraction") return `${base}; UI-like cards must use bars, dots, and icons only`;
  if (plan === "stageAndWorks" || plan === "teachingPodiumAndHonor") return `${base}; works walls, certificates, and displays must stay symbol-only`;
  return base;
}

function differentiationPlan(family: YuanfangVisualFamilyKey, subjectPlan: YuanfangVisualSubjectPlanKey): string {
  if (family === "achievementShowcase") return "parent-facing growth showcase: warm light, child work display, expression outcome, reading growth path, symbol-only works wall";
  if (family === "teachingCompetition") return "formal teaching event: podium, honor medallion, structured classroom/stage, professional education cues, not the warm child-growth showcase template";
  return `family-specific subject focus: ${subjectPlan}`;
}

function promptDirectives(composition: YuanfangCompositionFamilyKey, mode: YuanfangTitleSafeRenderMode, subjectPlan: YuanfangVisualSubjectPlanKey, geometry: YuanfangTitleSafeGeometry): string[] {
  return [
    "Use this as a designed poster key visual composition, not a generic illustration.",
    `The composition should visibly follow ${composition}.`,
    `Create an implicit overlay reserve using ${mode}: a low-detail pocket that is visually integrated, not a separate object, with background subject remains primary; maxCanvasAreaRatio ${geometry.maxCanvasAreaRatio}.`,
    `The main visual subject plan is ${subjectPlan}; make it the largest non-text visual memory point.`,
    "Avoid visibleTitleContainer, titleCardArtifact, standaloneBlankPaper, oversizedTextPlaque, fullHeightSideWall, centralDocumentDominance, labelPatchForTitle, emptyContainerForText, and older blank-zone artifacts.",
  ];
}
