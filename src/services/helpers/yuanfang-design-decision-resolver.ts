import { YUANFANG_VISUAL_RULE_LAYER } from "@/config/yuanfang-design-rules";
import type {
  YuanfangAntiPatternKey,
  YuanfangCompositionFamilyKey,
  YuanfangDesignDecision,
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
    titleSafeDesignPlan: titleSafeDesignPlan(titleSafe),
    logoSafeDesign: `${rules.logoProtectionPolicy}; protect icon, Chinese wordmark, and English wordmark together.`,
    colorEnergy: treatment.colorEnergy,
    densityPlan: densityPlan(composition),
    motifPlan: motifPlan(subjectPlan),
    textPollutionGuard: textPollutionGuard(subjectPlan),
    differentiationPlan: differentiationPlan(rules.family.key, subjectPlan),
    antiPatternWarnings: antiPatterns(rules.family.key, titleSafe),
    negativeSignals: splitAvoidNotes(context.form.avoidNotes ?? context.avoidNotes ?? "").slice(0, 6),
    promptDirectives: promptDirectives(composition, titleSafe, subjectPlan),
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
  const patterns: YuanfangAntiPatternKey[] = ["genericAIWallpaper", "tinyFloatingTitle", "textLikeTextureNearSafeZone", "fakeLogoPatch", "centerBlankBoard", "overblankTitleZone"];
  if (family !== "brandEvent" && family !== "companyActivity") patterns.push("softPastelSameness");
  if (family === "enrollment" || family === "openClass" || family === "literaryActivity") patterns.push("lowerOnlyDecoration");
  return Array.from(new Set(patterns));
}

function densityPlan(composition: YuanfangCompositionFamilyKey): string {
  if (composition === "stageDepthComposition" || composition === "posterCardComposition") return "stage depth with side displays, layered light, podium planes, and readable calm areas";
  if (composition === "diagonalMomentumComposition") return "diagonal motion layers with a clear non-text hero subject";
  if (composition === "layeredCollageComposition") return "layered editorial foreground, midground motif, and textured title field";
  if (composition === "verticalSealComposition") return "modern guofeng layers around a compact bordered title lane with texture and adjacent breathing room";
  return "3-5 controlled layers with designed safe zones and visible family motif";
}

function titleSafeDesignPlan(titleSafe: YuanfangTitleSafeDesignKey): string {
  const map: Record<YuanfangTitleSafeDesignKey, string> = {
    texturedPaperTitleField: "warm paper fiber, soft edge shadow, shallow paper overlap, and calm grain",
    colorBlockTitleField: "brand color gradient, kinetic boundary curve, restrained light streak, and layered color depth",
    spotlightTitleField: "stage light cone, floor plane, soft side glow, and shallow backdrop depth",
    diagonalRibbonTitleLane: "diagonal ribbon motion, light-band boundary, layered blue field, and clear title runway",
    framedPlaqueTitleArea: "compact bordered plaque, subtle material grain, small corner ornament, and adjacent guofeng layers",
    sidePanelTitleField: "side panel structure, fine divider line, brand texture, and shallow shadow depth",
    editorialMarginTitleArea: "editorial margin, paper overlap, publication edge texture, and layered reading-space boundary",
    stageLightTitleZone: "warm stage light, soft floor reflection, display-wall edge, and shallow spatial depth",
  };
  return `${map[titleSafe]}; low-complexity but visibly designed.`;
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

function promptDirectives(composition: YuanfangCompositionFamilyKey, titleSafe: YuanfangTitleSafeDesignKey, subjectPlan: YuanfangVisualSubjectPlanKey): string[] {
  return [
    "Use this as a designed poster key visual composition, not a generic illustration.",
    `The composition should visibly follow ${composition}.`,
    `The title-safe area must be ${titleSafe}: low-complexity but visibly designed, with subtle structure, material, boundary, and depth.`,
    `The main visual subject plan is ${subjectPlan}; make it the largest non-text visual memory point.`,
    "Avoid centerBlankBoard and overblankTitleZone; the calm title area must still look intentionally designed.",
  ];
}
