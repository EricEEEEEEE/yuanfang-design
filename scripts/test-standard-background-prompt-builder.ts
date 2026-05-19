import { execFileSync } from "node:child_process";
import { hasAll, primaryMessageChecks } from "./helpers/standard-background-prompt-builder-assertions";
import { ACHIEVEMENT, AVOID_STRESS, BRAND_EVENT, FESTIVAL, FOUR_CLASSICS, context } from "./helpers/standard-background-prompt-builder-fixtures";
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
  visualDetails: "作文批改流程、学习路径、蓝色光效、课程模块。",
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
    ["STANDARD_BACKGROUND_BENCHMARK_LANGUAGE_CHECK", hasAll(four.prompt, ["Yuanfang education-brand key visual benchmark", "visual density", "primary visual hook", "title-safe", "logo-safe"])],
    ["STANDARD_BACKGROUND_SAFE_ZONE_PROTECTION_CHECK", hasAll(four.prompt, ["selected L2 layout grammar", "designed title-safe zone", "low-complexity", "not a blank board", "do not place detailed objects"])],
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
    ["STANDARD_BACKGROUND_DIVERSITY_LANGUAGE_CHECK", hasAll(brandEvent.prompt, ["selectedStyleTreatment", "selectedCanvasIntent", "selectedLogoStrategy", "Do not generate logo"])],
    ["STANDARD_BACKGROUND_AI_WRITING_TREATMENT_CHECK", hasAll(aiWriting.prompt, ["AI作文批改", "techBlueLearning", "blue learning technology"])],
    ["STANDARD_BACKGROUND_AVOID_STRESS_CHECK", hasAll(avoid.negativePrompt, ["真实照片", "日漫", "水印", "二维码", "廉价广告"])],
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
    titleSafe: pass(prompt, ["designed title-safe zone", "low-complexity", "not a blank board"]),
    logoSafe: pass(prompt, ["logo-safe", "top-right"]),
    noTextPolicy: pass(prompt + negativePrompt, ["Do not generate readable", "fake Chinese characters"]),
    genericGuard: pass(negativePrompt, ["generic AI art", "blank placeholder"]),
  };
}

function visualRuleChecks(samples: Array<[string, StandardBackgroundPromptBuildResult]>): { results: Record<string, string>[]; checks: Array<[string, boolean]> } {
  const expected: Record<string, { families: string[]; motif: string }> = {
    fourClassics: { families: ["literaryActivity", "enrollment", "openClass"], motif: "书页空间" },
    achievement: { families: ["achievementShowcase"], motif: "舞台光" },
    festival: { families: ["poetryFestival", "guofengLiterature"], motif: "诗卷" },
    brandEvent: { families: ["brandEvent", "companyActivity"], motif: "品牌色带" },
    teachingCompetition: { families: ["teachingCompetition", "campusActivity"], motif: "作品墙" },
    aiWriting: { families: ["openClass", "enrollment"], motif: "课程入口" },
  };
  const results = samples.map(([name, sample]) => {
    const rules = sample.promptDiagnostics.visualRules;
    const allowed = expected[name]?.families ?? [];
    return {
      sample: name,
      selectedBenchmarkFamily: rules?.selectedBenchmarkFamily ?? "",
      selectedLayoutGrammar: rules?.selectedLayoutGrammar ?? "",
      selectedStyleTreatment: rules?.selectedStyleTreatment ?? "",
      selectedCanvasIntent: rules?.selectedCanvasIntent ?? "",
      selectedLogoStrategy: rules?.selectedLogoStrategy ?? "",
      familyAccepted: rules && allowed.includes(rules.selectedBenchmarkFamily) ? "PASS" : "FAIL",
      layoutPresent: rules?.selectedLayoutGrammar ? "PASS" : "FAIL",
      promptContainsMotif: sample.prompt.includes(expected[name]?.motif ?? "family primary motifs") ? "PASS" : "FAIL",
      promptContainsLayoutIntent: hasAll(sample.prompt, ["selectedLayoutGrammar", "layout title placement", "layout visual subject placement"]) ? "PASS" : "FAIL",
      promptContainsSafeZones: hasAll(sample.prompt, ["designed title-safe zone", "logoSafePolicy"]) ? "PASS" : "FAIL",
      promptContainsDiversityIntent: hasAll(sample.prompt, ["selectedStyleTreatment", "selectedCanvasIntent", "selectedLogoStrategy"]) ? "PASS" : "FAIL",
      negativeContainsL2Rules: hasAll(sample.negativePrompt, ["fake Chinese characters", "fake logo", "generated mascot", "campus phone", "generic AI art", "empty placeholder gradient", "text-like patterns near title/logo zones"]) ? "PASS" : "FAIL",
      diagnosticsExposeRules: rules && rules.consumedRuleKeys.length > 0 && rules.negativeRuleKeys.length > 0 && rules.layoutSelectionReason && rules.styleTreatmentReason ? "PASS" : "FAIL",
    };
  });
  const layouts = results.map((item) => item.selectedLayoutGrammar);
  const styles = results.map((item) => item.selectedStyleTreatment);
  const canvasIntents = results.map((item) => item.selectedCanvasIntent);
  const logoStrategies = results.map((item) => item.selectedLogoStrategy);
  return {
    results,
    checks: [
      ["STANDARD_BACKGROUND_L2_FAMILY_SELECTION_CHECK", results.every((item) => item.familyAccepted === "PASS")],
      ["STANDARD_BACKGROUND_L2_LAYOUT_SELECTION_CHECK", results.every((item) => item.layoutPresent === "PASS") && new Set(layouts).size > 1],
      ["STANDARD_BACKGROUND_L2_PROMPT_CONSUMPTION_CHECK", results.every((item) => item.promptContainsMotif === "PASS" && item.promptContainsLayoutIntent === "PASS" && item.promptContainsSafeZones === "PASS" && item.promptContainsDiversityIntent === "PASS")],
      ["STANDARD_BACKGROUND_L2_NEGATIVE_RULE_CHECK", results.every((item) => item.negativeContainsL2Rules === "PASS")],
      ["STANDARD_BACKGROUND_L2_DIAGNOSTICS_CHECK", results.every((item) => item.diagnosticsExposeRules === "PASS")],
      ["STANDARD_BACKGROUND_NOT_ALL_CENTER_LAYOUT_CHECK", layouts.some((layout) => layout !== "centerHeroLockup")],
      ["STANDARD_BACKGROUND_STYLE_DIVERSITY_CHECK", new Set(styles).size > 3],
      ["STANDARD_BACKGROUND_CANVAS_INTENT_DIVERSITY_CHECK", canvasIntents.includes("horizontalKeyVisual") && canvasIntents.includes("verticalPoster")],
      ["STANDARD_BACKGROUND_LOGO_STRATEGY_NOT_DEFAULT_PATCH_CHECK", logoStrategies.some((item) => item !== "minimalProtectionPatch") && !logoStrategies.every((item) => item === "minimalProtectionPatch")],
    ],
  };
}

function pass(value: string, needles: string[]): string {
  return hasAll(value, needles) ? "PASS" : "CHECK";
}

main();
