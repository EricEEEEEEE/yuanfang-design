import { execFileSync } from "node:child_process";
import { hasAll, primaryMessageChecks } from "./helpers/standard-background-prompt-builder-assertions";
import { ACHIEVEMENT, AVOID_STRESS, BRAND_EVENT, FESTIVAL, FOUR_CLASSICS, VALID_NEW_THEME_FIXTURES, context } from "./helpers/standard-background-prompt-builder-fixtures";
import type { StandardBackgroundPromptBuildResult } from "../src/models/standard-background-generation";
import { buildStandardBackgroundPrompt } from "../src/services/standard-background-prompt-builder.service";

const TEACHING_COMPETITION = context({
  productOutputType: "socialPost",
  eventBrief: "校区举办教学比赛和教师课堂风采展示，希望体现教学专业度、课堂成果和校区荣誉感。",
  styleBrief: "正式、明亮、有仪式感，但不要像综艺比赛或商业演唱会。",
  visualDetails: "舞台光、作品墙、展示台、奖章、教师风采和成长路径。",
  titleBrief: "突出校区教学比赛与课堂风采。",
  mainTitle: "教学比赛",
  subtitle: "课堂风采展示",
  hook: "教学比赛",
});
const AI_WRITING = context({
  productOutputType: "enrollment",
  eventBrief: "春季公开课展示 AI作文批改 和写作能力提升，让家长看到智能反馈如何帮助孩子修改作文。",
  styleBrief: "蓝色科技教育感，温暖可信，不要冷硬 SaaS 风。",
  visualDetails: "作文批改流程、写作成长路径、蓝色光效、课程模块。",
  titleBrief: "突出 AI作文批改 体验。",
  mainTitle: "春季公开课",
  subtitle: "AI作文批改体验",
  hook: "AI作文批改",
});

function main() {
  const four = buildStandardBackgroundPrompt({ promptContext: FOUR_CLASSICS });
  const achievement = buildStandardBackgroundPrompt({ promptContext: ACHIEVEMENT });
  const festival = buildStandardBackgroundPrompt({ promptContext: FESTIVAL });
  const brandEvent = buildStandardBackgroundPrompt({ promptContext: BRAND_EVENT });
  const teachingCompetition = buildStandardBackgroundPrompt({ promptContext: TEACHING_COMPETITION });
  const aiWriting = buildStandardBackgroundPrompt({ promptContext: AI_WRITING });
  const avoid = buildStandardBackgroundPrompt({ promptContext: AVOID_STRESS });
  const validThemes = VALID_NEW_THEME_FIXTURES.map(([name, promptContext]) => [name, buildStandardBackgroundPrompt({ promptContext })] as const);
  const coreSamples = [four, achievement, festival, brandEvent, teachingCompetition, aiWriting];
  const semanticSamples = [...coreSamples, ...validThemes.map(([, result]) => result)];
  const primary = primaryMessageChecks();
  const visualRules = visualRuleChecks([
    ["fourClassics", four],
    ["achievement", achievement],
    ["festival", festival],
    ["brandEvent", brandEvent],
    ["teachingCompetition", teachingCompetition],
    ["aiWriting", aiWriting],
  ]);
  const checks = [
    ["STANDARD_BACKGROUND_BENCHMARK_LANGUAGE_CHECK", hasAll(four.prompt, ["complete campaign key visual", "event poster", "Primary visual hook"])],
    ["STANDARD_BACKGROUND_SPATIAL_HANDOFF_CHECK", hasAll(four.prompt, ["L4 spatial analysis", "complete activity KV", "natural calmer regions"])],
    ["STANDARD_BACKGROUND_FOUR_CLASSICS_THEME_CHECK", hasAll(four.prompt, ["四大名著", "书籍", "国风"])],
    ["STANDARD_BACKGROUND_NO_TEXT_POLICY_CHECK", hasAll(four.prompt, ["Background visual only", "not a final poster", "Do not generate readable", "Do not generate title"])],
    ["STANDARD_BACKGROUND_NO_LOGO_POLICY_CHECK", hasAll(four.prompt, ["Do not generate logo", "Logo is composited later"])],
    ["STANDARD_BACKGROUND_NO_CAMPUS_POLICY_CHECK", hasAll(four.prompt, ["campus phone", "Campus information is composited later"])],
    ["STANDARD_BACKGROUND_NEGATIVE_PROMPT_CHECK", hasAll(four.negativePrompt, ["readable text", "fake Chinese characters", "QR code", "phone number", "address"])],
    ["STANDARD_BACKGROUND_GENERIC_AI_ART_GUARD_CHECK", hasAll(four.negativePrompt, ["generic AI art", "blank placeholder", "empty gradient background", "weak primary visual hook"])],
    ["STANDARD_BACKGROUND_ACHIEVEMENT_CHECK", hasAll(achievement.prompt, ["阅读成果", "作品墙", "舞台光"])],
    ["STANDARD_BACKGROUND_FESTIVAL_CHECK", hasAll(festival.prompt, ["诗词", "节日", "书卷"])],
    ["STANDARD_BACKGROUND_BRAND_EVENT_CHECK", hasAll(brandEvent.prompt, ["发布会", "品牌升级", "brand event", "brand color"])],
    ["STANDARD_BACKGROUND_TEACHING_COMPETITION_CHECK", hasAll(teachingCompetition.prompt, ["教学比赛", "作品墙", "stageShowcase"])],
    ["STANDARD_BACKGROUND_DIVERSITY_LANGUAGE_CHECK", hasAll(brandEvent.prompt, ["selectedStyleTreatment", "selectedCanvasIntent", "selectedLogoStrategy", "Yuanfang design decision", "Do not generate logo"])],
    ["STANDARD_BACKGROUND_AI_WRITING_TREATMENT_CHECK", hasAll(aiWriting.prompt, ["AI作文批改", "techBlueLearning", "blue learning technology"])],
    ["STANDARD_BACKGROUND_AVOID_STRESS_CHECK", hasAll(avoid.negativePrompt, ["真实照片", "日漫", "水印", "二维码", "廉价广告"])],
    ["STANDARD_BACKGROUND_NO_TITLE_SAFE_CONTAINER_LANGUAGE_CHECK", semanticSamples.every((sample) => !hasAnyPrompt(sample.prompt, ["title field", "title card", "blank paper", "empty plaque", "large blank", "central document", "full-height side panel", "spotlight curtain", "implicit overlay reserve", "low-detail pocket", "title-safe"]))],
    ["STANDARD_BACKGROUND_COMPLETE_KV_CHECK", semanticSamples.every((sample) => hasAll(sample.prompt, ["complete campaign key visual", "event poster composition"]) || hasAll(sample.prompt, ["complete activity KV", "campaign KV background"]))],
    ["STANDARD_BACKGROUND_VISIBLE_CONTAINER_NEGATIVE_CHECK", semanticSamples.every((sample) => hasAll(sample.negativePrompt, ["do not draw a title card", "do not draw a blank paper sheet for text", "do not draw a visible empty title container"]))],
    ["STANDARD_BACKGROUND_TEXT_POLLUTION_GUARD_CHECK", hasAll(aiWriting.negativePrompt, ["fake UI labels", "fake certificate words", "fake document paragraphs", "wall poster text blocks", "pseudo text rows", "fake handwritten lines"])],
    ["STANDARD_BACKGROUND_FESTIVAL_VERTICAL_SEAL_STABILITY_CHECK", festival.promptDiagnostics.visualRules?.designDecision.selectedCompositionFamily === "verticalSealComposition" && !hasAnyPrompt(festival.prompt, ["empty plaque", "large blank"])],
    ["STANDARD_BACKGROUND_ACHIEVEMENT_TEACHING_DIFFERENTIATION_CHECK", visualRules.results.find((item) => item.sample === "achievement")?.selectedVisualSubjectPlan === "stageAndWorks" && visualRules.results.find((item) => item.sample === "teachingCompetition")?.selectedVisualSubjectPlan === "teachingPodiumAndHonor" && visualRules.results.find((item) => item.sample === "achievement")?.selectedCompositionFamily !== visualRules.results.find((item) => item.sample === "teachingCompetition")?.selectedCompositionFamily],
    ["STANDARD_BACKGROUND_VALID_NEW_THEME_FIXTURES_CHECK", validThemes.length === 6 && VALID_NEW_THEME_FIXTURES.every(([, item]) => ["festival", "parentNotice", "socialPost", "enrollment"].includes(item.form.productOutputType))],
    ["STANDARD_BACKGROUND_VALID_NEW_THEME_PROMPT_CHECK", validThemes.every(([, sample]) => hasAll(sample.prompt, ["complete campaign key visual", "L4 spatial analysis"]) && hasAll(sample.negativePrompt, ["do not draw a title card", "do not draw a blank paper sheet for text", "do not draw a visible empty title container"]))],
    ["STANDARD_BACKGROUND_READING_NOT_GUOFENG_BY_DEFAULT_CHECK", readingNotGuofeng(validThemes)],
    ["STANDARD_BACKGROUND_GUOFENG_REQUIRES_STRONG_SIGNAL_CHECK", styleOf("flying flower poetry challenge", validThemes) === "modernGuofengInk" && styleOf("world book day", validThemes) !== "modernGuofengInk"],
    ["STANDARD_BACKGROUND_DIRECT_BENCHMARK_FAMILY_COVERAGE_CHECK", new Set(semanticSamples.map((item) => item.promptDiagnostics.visualRules?.designDecision.selectedVisualFamily)).size >= 7],
  ];
  const qa = [
    ["fourClassicsEnrollment", qualitySummary(four.prompt, four.negativePrompt)],
    ["achievementShowcase", qualitySummary(achievement.prompt, achievement.negativePrompt)],
    ["festivalPoetry", qualitySummary(festival.prompt, festival.negativePrompt)],
    ["brandEventLaunch", qualitySummary(brandEvent.prompt, brandEvent.negativePrompt)],
    ["teachingCompetition", qualitySummary(teachingCompetition.prompt, teachingCompetition.negativePrompt)],
    ["aiWriting", qualitySummary(aiWriting.prompt, aiWriting.negativePrompt)],
  ];

  console.log("STANDARD_BACKGROUND_PROMPT_SOURCE", four.source);
  console.log("STANDARD_BACKGROUND_PROMPT_OK", four.ok ? "PASS" : "FAIL");
  console.log("STANDARD_BACKGROUND_PROMPT_VERSION", four.promptDiagnostics.promptVersion);
  console.log("STANDARD_BACKGROUND_PROMPT_HASH", four.promptDiagnostics.promptHash);
  console.log("STANDARD_BACKGROUND_PROMPT_LENGTH", four.prompt.length);
  console.log("STANDARD_BACKGROUND_NEGATIVE_PROMPT_LENGTH", four.negativePrompt.length);
  console.log("STANDARD_BACKGROUND_CONSUMED_FIELDS", JSON.stringify(four.promptDiagnostics.consumedFields));
  console.log("STANDARD_BACKGROUND_TEMPLATE_SOURCES", JSON.stringify(four.promptDiagnostics.usedTemplateSources));
  console.log("STANDARD_BACKGROUND_FORBIDDEN_ELEMENTS", JSON.stringify(four.promptDiagnostics.forbiddenGeneratedElements));
  console.log("STANDARD_BACKGROUND_VISUAL_RULES", JSON.stringify(visualRules.results));
  console.log("STANDARD_BACKGROUND_BENCHMARK_SAMPLE_QA", JSON.stringify(qa));
  console.log("STANDARD_PRIMARY_MESSAGE_SAMPLE_RESULTS", JSON.stringify(primary.results));
  for (const [label, passed] of checks) console.log(label, passed ? "PASS" : "FAIL");
  for (const [label, passed] of primary.checks) console.log(label, passed ? "PASS" : "FAIL");
  for (const [label, passed] of visualRules.checks) console.log(label, passed ? "PASS" : "FAIL");
  console.log("STANDARD_BACKGROUND_WARNINGS", JSON.stringify(four.promptDiagnostics.warnings));
  console.log("GIT_STATUS_SHORT", JSON.stringify(gitStatus()));

  if (!four.ok || !four.promptDiagnostics.promptHash || checks.some(([, passed]) => !passed) || primary.checks.some(([, passed]) => !passed) || visualRules.checks.some(([, passed]) => !passed)) {
    process.exitCode = 1;
  }
}

function gitStatus(): string {
  return execFileSync("git", ["status", "--short"], { encoding: "utf8" }).trim();
}

function qualitySummary(prompt: string, negativePrompt: string): Record<string, string> {
  return {
    themeVisible: pass(prompt, ["primary visual hook", "Main visual theme anchor"]),
    designDensity: pass(prompt, ["visual density", "3-5 controlled layers"]),
    yuanfangBrand: pass(prompt, ["Yuanfang", "brand color", "education-brand"]),
    titleSafe: pass(prompt, ["L4 spatial analysis", "natural calmer regions", "complete activity KV"]),
    logoSafe: pass(prompt, ["logo-safe", "top-right"]),
    noTextPolicy: pass(prompt + negativePrompt, ["Do not generate readable", "fake Chinese characters"]),
    genericGuard: pass(negativePrompt, ["generic AI art", "blank placeholder"]),
  };
}

function visualRuleChecks(samples: Array<[string, StandardBackgroundPromptBuildResult]>): { results: Record<string, string>[]; checks: Array<[string, boolean]> } {
  const expected: Record<string, { families: string[]; motif: string; visual: string; composition: string; subject: string }> = {
    fourClassics: { families: ["literaryActivity", "enrollment", "openClass"], motif: "书页空间", visual: "kidsLiteraryCharacterEvent", composition: "layeredCollageComposition", subject: "booksAndCharacters" },
    achievement: { families: ["achievementShowcase"], motif: "舞台光", visual: "achievementShowcaseVisual", composition: "stageDepthComposition", subject: "stageAndWorks" },
    festival: { families: ["poetryFestival", "guofengLiterature"], motif: "诗卷", visual: "modernGuofengLiterature", composition: "verticalSealComposition", subject: "guofengLandscapeAndScroll" },
    brandEvent: { families: ["brandEvent", "companyActivity"], motif: "品牌色带", visual: "modernBrandCampaign", composition: "splitColorBlockComposition", subject: "brandLightTrailAndStage" },
    teachingCompetition: { families: ["teachingCompetition", "campusActivity"], motif: "作品墙", visual: "campusHonorCompetition", composition: "posterCardComposition", subject: "teachingPodiumAndHonor" },
    aiWriting: { families: ["openClass", "enrollment"], motif: "课程入口", visual: "techDarkEducationKV", composition: "diagonalMomentumComposition", subject: "techWritingInterfaceAbstraction" },
  };
  const results = samples.map(([name, sample]) => {
    const rules = sample.promptDiagnostics.visualRules;
    const decision = rules?.designDecision;
    const allowed = expected[name]?.families ?? [];
    return {
      sample: name,
      selectedBenchmarkFamily: rules?.selectedBenchmarkFamily ?? "",
      selectedLayoutGrammar: rules?.selectedLayoutGrammar ?? "",
      selectedStyleTreatment: rules?.selectedStyleTreatment ?? "",
      selectedCanvasIntent: rules?.selectedCanvasIntent ?? "",
      selectedLogoStrategy: rules?.selectedLogoStrategy ?? "",
      selectedVisualFamily: decision?.selectedVisualFamily ?? "",
      selectedCompositionFamily: decision?.selectedCompositionFamily ?? "",
      selectedTitleSafeDesign: decision?.selectedTitleSafeDesign ?? "",
      selectedTitleSafeGeometryShape: decision?.titleSafeGeometry.shape ?? "",
      selectedVisualSubjectPlan: decision?.selectedVisualSubjectPlan ?? "",
      familyAccepted: rules && allowed.includes(rules.selectedBenchmarkFamily) ? "PASS" : "FAIL",
      layoutPresent: rules?.selectedLayoutGrammar ? "PASS" : "FAIL",
      decisionAccepted: decision?.selectedVisualFamily === expected[name]?.visual && decision?.selectedCompositionFamily === expected[name]?.composition && decision?.selectedVisualSubjectPlan === expected[name]?.subject ? "PASS" : "FAIL",
      promptContainsMotif: sample.prompt.includes(expected[name]?.motif ?? "family primary motifs") ? "PASS" : "FAIL",
      promptContainsLayoutIntent: hasAll(sample.prompt, ["selectedLayoutGrammar", "layout visual subject placement"]) ? "PASS" : "FAIL",
      promptContainsSafeZones: hasAll(sample.prompt, ["L4 spatial analysis", "logoSafePolicy"]) ? "PASS" : "FAIL",
      promptContainsDiversityIntent: hasAll(sample.prompt, ["selectedStyleTreatment", "selectedCanvasIntent", "selectedLogoStrategy", "selectedVisualFamily", "antiPatternWarnings"]) ? "PASS" : "FAIL",
      negativeContainsL2Rules: hasAll(sample.negativePrompt, ["fake Chinese characters", "fake logo", "generated mascot", "campus phone", "generic AI art", "empty placeholder gradient", "text-like patterns near title/logo zones"]) ? "PASS" : "FAIL",
      diagnosticsExposeRules: rules && decision && rules.consumedRuleKeys.length > 0 && rules.negativeRuleKeys.length > 0 && decision.antiPatternWarnings.includes("genericAIWallpaper") && decision.decisionReason ? "PASS" : "FAIL",
    };
  });
  const layouts = results.map((item) => item.selectedLayoutGrammar);
  const styles = results.map((item) => item.selectedStyleTreatment);
  const canvasIntents = results.map((item) => item.selectedCanvasIntent);
  const logoStrategies = results.map((item) => item.selectedLogoStrategy);
  const titleSafeDesigns = results.map((item) => item.selectedTitleSafeDesign);
  return {
    results,
    checks: [
      ["STANDARD_BACKGROUND_L2_FAMILY_SELECTION_CHECK", results.every((item) => item.familyAccepted === "PASS")],
      ["STANDARD_BACKGROUND_L2_LAYOUT_SELECTION_CHECK", results.every((item) => item.layoutPresent === "PASS") && new Set(layouts).size > 1],
      ["STANDARD_BACKGROUND_DESIGN_DECISION_CHECK", results.every((item) => item.decisionAccepted === "PASS")],
      ["STANDARD_BACKGROUND_L2_PROMPT_CONSUMPTION_CHECK", results.every((item) => item.promptContainsMotif === "PASS" && item.promptContainsLayoutIntent === "PASS" && item.promptContainsSafeZones === "PASS" && item.promptContainsDiversityIntent === "PASS")],
      ["STANDARD_BACKGROUND_L2_NEGATIVE_RULE_CHECK", results.every((item) => item.negativeContainsL2Rules === "PASS")],
      ["STANDARD_BACKGROUND_L2_DIAGNOSTICS_CHECK", results.every((item) => item.diagnosticsExposeRules === "PASS")],
      ["STANDARD_BACKGROUND_NOT_ALL_CENTER_LAYOUT_CHECK", layouts.some((layout) => layout !== "centerHeroLockup")],
      ["STANDARD_BACKGROUND_STYLE_DIVERSITY_CHECK", new Set(styles).size > 3],
      ["STANDARD_BACKGROUND_CANVAS_INTENT_DIVERSITY_CHECK", canvasIntents.includes("horizontalKeyVisual") && canvasIntents.includes("verticalPoster")],
      ["STANDARD_BACKGROUND_LOGO_STRATEGY_NOT_DEFAULT_PATCH_CHECK", logoStrategies.some((item) => item !== "minimalProtectionPatch") && !logoStrategies.every((item) => item === "minimalProtectionPatch")],
      ["STANDARD_BACKGROUND_TITLE_SAFE_DESIGN_DIVERSITY_CHECK", new Set(titleSafeDesigns).size > 3],
      ["STANDARD_BACKGROUND_TITLE_SAFE_ANTI_PATTERN_CHECK", samples.every(([, sample]) => (["centerBlankBoard", "overblankTitleZone", "textLikeTextureNearSafeZone", "oversizedTitleSafeBoard", "titleSafeAreaOver40Percent", "disconnectedTitleIsland", "visibleTitleContainer", "titleCardArtifact", "standaloneBlankPaper"] as const).every((item) => sample.promptDiagnostics.visualRules?.designDecision.antiPatternWarnings.includes(item)))],
      ["STANDARD_BACKGROUND_NEGATIVE_INTENT_NOT_POSITIVE_STYLE_CHECK", results.find((item) => item.sample === "brandEvent")?.selectedStyleTreatment === "brandKineticKV"],
    ],
  };
}

function pass(value: string, needles: string[]): string { return hasAll(value, needles) ? "PASS" : "CHECK"; }
function hasAnyPrompt(value: string, needles: string[]): boolean { return needles.some((needle) => value.includes(needle)); }

function styleOf(name: string, samples: readonly (readonly [string, StandardBackgroundPromptBuildResult])[]): string {
  return samples.find(([sampleName]) => sampleName === name)?.[1].promptDiagnostics.visualRules?.selectedStyleTreatment ?? "";
}

function readingNotGuofeng(samples: readonly (readonly [string, StandardBackgroundPromptBuildResult])[]): boolean {
  return ["world book day", "parent-child reading night", "winter reading camp"].every((name) => styleOf(name, samples) !== "modernGuofengInk");
}

main();
