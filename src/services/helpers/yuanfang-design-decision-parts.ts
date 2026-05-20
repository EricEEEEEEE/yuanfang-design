import type { StandardImagePromptContext } from "@/models/standard-background-generation";
import type { YuanfangAntiPatternKey, YuanfangBackgroundRole, YuanfangCompositionFamilyKey, YuanfangForegroundReadiness, YuanfangTitlePriorityMode, YuanfangTitleSafeDesignKey, YuanfangTitleSafeGeometry, YuanfangTitleSafeRenderMode, YuanfangVisualDominanceBudget, YuanfangVisualFamilyDecisionKey, YuanfangVisualSubjectPlanKey } from "@/models/yuanfang-design-decision";
import type { YuanfangLayoutGrammarKey, YuanfangVisualFamilyKey } from "@/models/yuanfang-visual-rules";
import type { ResolvedYuanfangVisualRules } from "@/services/helpers/yuanfang-visual-rule-resolver";
import { hasAny, positiveBriefText } from "@/services/helpers/standard-background-prompt-utils";

export type YuanfangDesignDecisionParts = {
  visualFamily: YuanfangVisualFamilyDecisionKey;
  composition: YuanfangCompositionFamilyKey;
  titleSafe: YuanfangTitleSafeDesignKey;
  geometry: YuanfangTitleSafeGeometry;
  overlayMode: YuanfangTitleSafeRenderMode;
  subjectPlan: YuanfangVisualSubjectPlanKey;
  backgroundRole: YuanfangBackgroundRole;
  titlePriorityMode: YuanfangTitlePriorityMode;
  visualDominanceBudget: YuanfangVisualDominanceBudget;
  foregroundReadiness: YuanfangForegroundReadiness;
  densityPlan: string;
  motifPlan: string;
  textPollutionGuard: string;
  differentiationPlan: string;
  titleSafeDesignPlan: string;
  antiPatterns: YuanfangAntiPatternKey[];
  promptDirectives: string[];
};

export function resolveDesignDecisionParts(context: StandardImagePromptContext, rules: ResolvedYuanfangVisualRules): YuanfangDesignDecisionParts {
  const visual = visualFamily(context, rules.family.key, rules.selectedStyleTreatment);
  const composition = compositionFamily(rules.family.key, rules.layout.key);
  const titleSafe = titleSafeDesign(composition, rules.family.key);
  const subjectPlan = visualSubjectPlan(context, rules.family.key);
  const role = backgroundRole(visual);
  const priority = titlePriorityMode(visual);
  const budget = visualDominanceBudget(visual, composition);
  const readiness = foregroundReadiness(role);
  return {
    visualFamily: visual,
    composition,
    titleSafe,
    geometry: titleSafeGeometry(titleSafe),
    overlayMode: overlayReserveMode(titleSafe),
    subjectPlan,
    backgroundRole: role,
    titlePriorityMode: priority,
    visualDominanceBudget: budget,
    foregroundReadiness: readiness,
    densityPlan: densityPlan(composition),
    motifPlan: motifPlan(subjectPlan),
    textPollutionGuard: textPollutionGuard(subjectPlan),
    differentiationPlan: differentiationPlan(rules.family.key, subjectPlan),
    titleSafeDesignPlan: titleReadyPlan(role, priority, budget),
    antiPatterns: antiPatterns(rules.family.key, titleSafe),
    promptDirectives: promptDirectives(composition, subjectPlan, role, priority, budget),
  };
}

function visualFamily(context: StandardImagePromptContext, family: YuanfangVisualFamilyKey, style: string): YuanfangVisualFamilyDecisionKey {
  const text = positiveBriefText(context);
  if (style === "techBlueLearning") return "techDarkEducationKV";
  if (family === "brandEvent" || family === "companyActivity") return "modernBrandCampaign";
  if (hasAny(text, ["成语", "闯关", "任务卡", "故事角色", "儿童文学", "趣味活动", "角色", "IP"])) return "kidsLiteraryCharacterEvent";
  if (family === "achievementShowcase") return "achievementShowcaseVisual";
  if (family === "teachingCompetition" || family === "campusActivity") return "campusHonorCompetition";
  if (family === "poetryFestival" || family === "guofengLiterature") return "modernGuofengLiterature";
  if (hasAny(text, ["四大名著", "大唐", "三国", "西游", "游记"])) return "kidsLiteraryCharacterEvent";
  if (hasAny(text, ["亲子", "窗边", "夜晚", "咖啡", "陪伴", "生活方式"])) return "lifestyleLiteraryScene";
  if (family === "literaryActivity") return "freshReadingCourse";
  if (family === "enrollment" || family === "openClass") return "boldEnrollmentPromo";
  return "premiumNoticeVisual";
}

function compositionFamily(family: YuanfangVisualFamilyKey, layout: YuanfangLayoutGrammarKey): YuanfangCompositionFamilyKey {
  if (layout === "diagonalCampaignFlow") return "diagonalMomentumComposition";
  if (layout === "splitColorBlock") return "splitColorBlockComposition";
  if (layout === "verticalSealTitle") return "verticalSealComposition";
  if (layout === "leftTitleRightVisual" || layout === "rightTitleLeftVisual") return "strongSideTitleVisual";
  if (layout === "frameContainer") return family === "literaryActivity" ? "layeredCollageComposition" : "framedEditorialComposition";
  if (layout === "stageShowcase") return family === "teachingCompetition" ? "posterCardComposition" : "stageDepthComposition";
  return layout === "centerHeroLockup" ? "asymmetricHeroComposition" : "framedEditorialComposition";
}

function titleSafeDesign(composition: YuanfangCompositionFamilyKey, family: YuanfangVisualFamilyKey): YuanfangTitleSafeDesignKey {
  if (composition === "diagonalMomentumComposition") return "diagonalRibbonTitleLane";
  if (composition === "splitColorBlockComposition") return "colorBlockTitleField";
  if (composition === "verticalSealComposition") return "framedPlaqueTitleArea";
  if (composition === "strongSideTitleVisual" || composition === "posterCardComposition") return "sidePanelTitleField";
  if (composition === "layeredCollageComposition") return "editorialMarginTitleArea";
  if (composition === "stageDepthComposition") return family === "achievementShowcase" ? "stageLightTitleZone" : "spotlightTitleField";
  return "texturedPaperTitleField";
}

function visualSubjectPlan(context: StandardImagePromptContext, family: YuanfangVisualFamilyKey): YuanfangVisualSubjectPlanKey {
  const text = [context.visualHook?.primaryHook, context.form.eventBrief, context.form.visualDetails, context.form.titleBrief].filter(Boolean).join(" ");
  if (hasAny(text, ["AI作文", "作文批改", "智能反馈"])) return "techWritingInterfaceAbstraction";
  if (family === "brandEvent" || family === "companyActivity") return "brandLightTrailAndStage";
  if (hasAny(text, ["成语", "闯关", "任务卡", "故事角色", "儿童文学"])) return "booksAndCharacters";
  if (family === "teachingCompetition" || family === "campusActivity") return "teachingPodiumAndHonor";
  if (family === "achievementShowcase") return "stageAndWorks";
  if (family === "poetryFestival" || family === "guofengLiterature") return "guofengLandscapeAndScroll";
  return family === "literaryActivity" ? "booksAndCharacters" : "courseValuePath";
}

function backgroundRole(visual: YuanfangVisualFamilyDecisionKey): YuanfangBackgroundRole {
  if (visual === "modernBrandCampaign" || visual === "boldEnrollmentPromo") return "graphicKVBase";
  if (visual === "campusHonorCompetition" || visual === "achievementShowcaseVisual") return "campaignStageBase";
  if (visual === "lifestyleLiteraryScene") return "decorativeAtmosphereBase";
  return visual === "techDarkEducationKV" ? "titleLedPosterBase" : "subjectSupportiveScene";
}

function titlePriorityMode(visual: YuanfangVisualFamilyDecisionKey): YuanfangTitlePriorityMode {
  if (visual === "modernBrandCampaign" || visual === "boldEnrollmentPromo") return "titleHeroExpected";
  if (visual === "kidsLiteraryCharacterEvent" || visual === "modernGuofengLiterature") return "titleAndSubjectBalanced";
  return visual === "lifestyleLiteraryScene" ? "titleDominant" : "subjectLedButTitleClear";
}

function visualDominanceBudget(visual: YuanfangVisualFamilyDecisionKey, composition: YuanfangCompositionFamilyKey): YuanfangVisualDominanceBudget {
  const highDetailZones = composition === "diagonalMomentumComposition" ? "edges and directional-flow subject clusters" : "edges, corners, podiums, character groups, or motif clusters";
  const detail = visual === "kidsLiteraryCharacterEvent" || visual === "modernBrandCampaign" ? "medium" : visual === "lifestyleLiteraryScene" ? "low" : "medium";
  return { backgroundPrimarySubject: "30-45%", futureTitleDominanceReserved: "35-50%", decorativeDetailBudget: detail, highDetailZones, titleRelevantArea: "medium-low detail, graphic, integrated, never empty and never the final focal climax" };
}

function foregroundReadiness(role: YuanfangBackgroundRole): YuanfangForegroundReadiness {
  return {
    hierarchy: `${role}: leave compositional hierarchy unfinished until the future title lockup takes over.`,
    avoid: "avoid finished illustration focal climax, over-detailed central focal climax, and background overpowering the title layer.",
    support: "use bold shapes, color blocks, directional flow, and controlled motifs as graphic support for future system-rendered title.",
  };
}

function titleReadyPlan(role: YuanfangBackgroundRole, priority: YuanfangTitlePriorityMode, budget: YuanfangVisualDominanceBudget): string {
  return `${role}/${priority}: title-ready campaign base; future title lockup keeps ${budget.futureTitleDominanceReserved} dominance while background subject stays ${budget.backgroundPrimarySubject}.`;
}

function antiPatterns(family: YuanfangVisualFamilyKey, titleSafe: YuanfangTitleSafeDesignKey): YuanfangAntiPatternKey[] {
  const patterns: YuanfangAntiPatternKey[] = ["genericAIWallpaper", "tinyFloatingTitle", "textLikeTextureNearSafeZone", "fakeLogoPatch", "centerBlankBoard", "overblankTitleZone", "oversizedTitleSafeBoard", "titleSafeAreaOver40Percent", "disconnectedTitleIsland", "visibleTitleContainer", "titleCardArtifact", "standaloneBlankPaper", "oversizedTextPlaque", "labelPatchForTitle", "emptyContainerForText", "finishedIllustrationFocalClimax", "overDetailedCentralFocalClimax", "backgroundOverpowersTitle", "titleLayerNoDominance"];
  if (titleSafe === "framedPlaqueTitleArea") patterns.push("giantEmptyPlaque", "oversizedTextPlaque");
  if (titleSafe === "sidePanelTitleField") patterns.push("fullHeightBlankPanel", "fullHeightSideWall");
  if (titleSafe === "stageLightTitleZone" || titleSafe === "spotlightTitleField") patterns.push("emptySpotlightCurtain");
  if (titleSafe === "editorialMarginTitleArea" || titleSafe === "texturedPaperTitleField") patterns.push("centralPaperSheetDominance", "centralDocumentDominance");
  if (family !== "brandEvent" && family !== "companyActivity") patterns.push("softPastelSameness");
  if (family === "enrollment" || family === "openClass" || family === "literaryActivity") patterns.push("lowerOnlyDecoration");
  return Array.from(new Set(patterns));
}

function densityPlan(composition: YuanfangCompositionFamilyKey): string {
  if (composition === "stageDepthComposition" || composition === "posterCardComposition") return "stage depth and honor objects stay supportive; title-ready central/upper structure remains medium-low detail";
  if (composition === "diagonalMomentumComposition") return "diagonal motion layers support a future title lockup; high-detail motifs stay on edges and flow nodes";
  if (composition === "layeredCollageComposition") return "editorial layers and motifs support title dominance without a visible text holder";
  if (composition === "verticalSealComposition") return "modern guofeng graphic layers, not a complete mountain-scroll illustration";
  return "3-5 controlled layers with restrained focal detail and title-ready hierarchy";
}

function overlayReserveMode(titleSafe: YuanfangTitleSafeDesignKey): YuanfangTitleSafeRenderMode {
  if (titleSafe === "diagonalRibbonTitleLane") return "motionPathReserve";
  if (titleSafe === "editorialMarginTitleArea" || titleSafe === "texturedPaperTitleField") return "edgeLowDetailPocket";
  return titleSafe === "stageLightTitleZone" || titleSafe === "spotlightTitleField" ? "implicitNegativeSpace" : "embeddedQuietPocket";
}

function titleSafeGeometry(titleSafe: YuanfangTitleSafeDesignKey): YuanfangTitleSafeGeometry {
  const shape = titleSafe === "diagonalRibbonTitleLane" ? "ribbon" : titleSafe === "framedPlaqueTitleArea" ? "narrowLane" : titleSafe === "sidePanelTitleField" ? "sideBand" : titleSafe === "editorialMarginTitleArea" ? "editorialMargin" : titleSafe === "stageLightTitleZone" || titleSafe === "spotlightTitleField" ? "spotlightPatch" : "compactPanel";
  return { shape, maxCanvasAreaRatio: titleSafe === "stageLightTitleZone" ? 0.35 : 0.28, preferredAreaRatioRange: [0.12, 0.26], mustAnchorToVisualSubject: true, mustAvoidFullHeightPanel: true, mustAvoidFullWidthPanel: true, mustKeepBackgroundVisibleAround: true, constraintPrompt: "keep title-relevant area medium-low detail and below titleSafeAreaOver40Percent without drawing a container" };
}

function motifPlan(plan: YuanfangVisualSubjectPlanKey): string {
  const map: Record<YuanfangVisualSubjectPlanKey, string> = {
    booksAndCharacters: "books, literary scene layers, character silhouettes, task paths, and playful symbols as supporting memory points",
    stageAndWorks: "stage light, works wall, display table, and growth path as support for later title lockup",
    guofengLandscapeAndScroll: "scroll, ink layers, festival plants, and classical space as graphic support, not a full landscape climax",
    brandLightTrailAndStage: "brand light trail, launch stage, course upgrade path, and brand color field supporting title dominance",
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
  if (family === "achievementShowcase") return "parent-facing growth showcase: warm support layers, not a finished stage illustration";
  if (family === "teachingCompetition") return "formal teaching event: podium and honor cues support the title-led poster hierarchy";
  return `family-specific subject support: ${subjectPlan}`;
}

function promptDirectives(composition: YuanfangCompositionFamilyKey, subjectPlan: YuanfangVisualSubjectPlanKey, role: YuanfangBackgroundRole, priority: YuanfangTitlePriorityMode, budget: YuanfangVisualDominanceBudget): string[] {
  return [
    `Use this as a title-ready campaign background, not a finished illustration; backgroundRole=${role}; titlePriorityMode=${priority}.`,
    `The composition should visibly follow ${composition}, but leave future title lockup dominance reserved at ${budget.futureTitleDominanceReserved}.`,
    `The main visual subject plan is ${subjectPlan}; keep background primary subject around ${budget.backgroundPrimarySubject}, with high detail limited to ${budget.highDetailZones}.`,
    "Background supports title hierarchy: bold graphic base, controlled motifs, medium-low title-relevant area, no final focal climax.",
    "Avoid finishedIllustrationFocalClimax, overDetailedCentralFocalClimax, backgroundOverpowersTitle, titleLayerNoDominance, and visible title-container artifacts.",
  ];
}
