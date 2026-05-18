import { existsSync, readFileSync } from "node:fs";
import {
  generateScoredRefinedTitleCandidates,
  type GenerateScoredRefinedTitleCandidatesResult,
} from "../src/use-cases/generate-scored-refined-title-candidates.use-case";
import type { TitleHierarchyContext } from "../src/models/title-hierarchy-context";
import { buildTitleHierarchyContext } from "../src/app/api/generate/standard/v2/title-hierarchy";
import type { StandardGenerateV2Request } from "../src/models/standard-generation-api-v2";

const BACKGROUND_IMAGE_PATH = "/tmp/yuanfang-title-director-bg.jpg";

async function main(): Promise<void> {
  if (!existsSync(BACKGROUND_IMAGE_PATH)) {
    console.error("TITLE_CANDIDATE_PIPELINE_TEST_IMAGE_MISSING", BACKGROUND_IMAGE_PATH);
    process.exit(1);
  }

  const backgroundImageBase64 = readFileSync(BACKGROUND_IMAGE_PATH).toString("base64");
  const titleHierarchyContext = manualSubtitleHookContext();
  const result = await generateScoredRefinedTitleCandidates({
    backgroundImageBase64,
    mainTitle: "成长汇报课",
    subtitle: "看见孩子的表达力量",
    titleHierarchyContext,
    designFamily: "achievementShowcase",
    layoutFamily: "centerTitle",
    displayPolicy: "titleOnlyDefault",
    productOutputType: "mainVisual",
    eventBrief:
      "这是一次学期成长汇报课，孩子会展示阅读、写作、表达和课堂展示方面的成长。",
    styleBrief: "明亮、有仪式感、有成果感，也要专业可信。",
    visualDetails: "作品墙、展示台、舞台光、奖章、表达麦克风、课程成果板。",
    avoidNotes: "不要山水卷轴、不要低幼卡通、不要人物太多。",
  });
  const first = result.finalCandidatePool[0];

  console.error("PIPELINE_SOURCE", result.source);
  console.error("PIPELINE_CANDIDATE_SOURCE", result.candidateResult.source);
  console.error("PIPELINE_SCORER_SOURCE", result.scoringResult.source);
  console.error("PIPELINE_REFINER_SOURCE", result.refinementResult.source);
  console.error("PIPELINE_ORIGINAL_BLUEPRINT_COUNT", result.candidateResult.lockupBlueprints.length);
  console.error("PIPELINE_REFINED_BLUEPRINT_COUNT", result.refinementResult.refinedBlueprints.length);
  console.error("PIPELINE_FINAL_POOL_COUNT", result.finalCandidatePool.length);
  console.error("PIPELINE_FINAL_CANDIDATE_IDS", result.finalCandidatePool.map((item) => item.candidateId).join(","));
  console.error("PIPELINE_RECOMMENDED_CANDIDATE_IDS", result.recommendedCandidateIds.join(","));
  console.error("PIPELINE_REJECTED_CANDIDATE_IDS", result.diagnostics.rejectedCandidateIds.join(","));
  console.error("PIPELINE_FALLBACK_FLAGS", result.finalCandidatePool.map((item) => String(item.isFallbackCandidate)).join(","));
  console.error(
    "PIPELINE_SAFETY_FLAGS",
    result.diagnostics.safetyFlags
      .map((item) => `${item.candidateId}:${item.passed ? "pass" : "fail"}:${item.reasons.join(",") || "none"}`)
      .join(" | "),
  );
  console.error("PIPELINE_REFINED_ID_MAP", JSON.stringify(result.diagnostics.refinedCandidateIdMap));
  console.error("PIPELINE_SOURCE_ID_MAP", JSON.stringify(result.diagnostics.sourceCandidateIdMap));
  console.error("FIRST_FINAL_LOCKUP_BOX", JSON.stringify(first?.lockupBox ?? null));
  console.error("FIRST_FINAL_UNIT_BOXES", JSON.stringify(first?.titleUnits.map((unit) => unit.unitBox) ?? []));
  console.error("FIRST_FINAL_SUBTITLE_BOX", JSON.stringify(first?.subtitleLockup.subtitleBox ?? null));
  console.error("PIPELINE_REASON", result.diagnostics.reason);
  console.error("PIPELINE_TITLE_CONTEXT_INTENT", result.candidateResult.titleHierarchyContext?.hierarchyIntent ?? "none");
  console.error("PIPELINE_TITLE_CONTEXT_PRIMARY", result.candidateResult.titleHierarchyContext?.primaryMessage ?? "none");
  console.error("PIPELINE_TITLE_CONTEXT_SUBTITLE_PRIORITY", result.candidateResult.titleHierarchyContext?.recommendedSubtitlePriority ?? "none");
  const contextChecks = runTitleHierarchyChecks(result, titleHierarchyContext);
  for (const [label, pass] of contextChecks) console.error(label, pass ? "PASS" : "FAIL");
  if (contextChecks.some(([, pass]) => !pass)) process.exit(1);
  runPrimaryMessageSampleChecks();
  console.log(JSON.stringify(summarize(result), null, 2));
}

function summarize(result: GenerateScoredRefinedTitleCandidatesResult): unknown {
  return {
    source: result.source,
    candidateSource: result.candidateResult.source,
    scorerSource: result.scoringResult.source,
    refinerSource: result.refinementResult.source,
    originalBlueprintCount: result.candidateResult.lockupBlueprints.length,
    refinedBlueprintCount: result.refinementResult.refinedBlueprints.length,
    finalCandidatePool: result.finalCandidatePool.map((blueprint) => ({
      candidateId: blueprint.candidateId,
      semanticSplitId: blueprint.semanticSplitId,
      compositionMode: blueprint.compositionMode,
      isFallbackCandidate: blueprint.isFallbackCandidate,
    })),
    recommendedCandidateIds: result.recommendedCandidateIds,
    diagnostics: result.diagnostics,
  };
}

function manualSubtitleHookContext(): TitleHierarchyContext {
  return {
    source: "standard-form-v2-primary-message",
    mainTitle: "成长汇报课",
    subtitle: "看见孩子的表达力量",
    primaryMessage: "表达力量",
    hookSource: "subtitle",
    mainTitleMismatch: true,
    titleHierarchyRisk: "medium",
    titleBrief: "突出孩子表达成长。",
    titleEmphasisWords: ["成长"],
    hierarchyIntent: "subtitleHookSupport",
    recommendedSubtitlePriority: "strong",
    visibleTextPolicy: { preserveMainTitle: true, noNewTitleText: true, allowedVisibleText: ["成长汇报课", "看见孩子的表达力量"] },
    warnings: [],
  };
}

function runTitleHierarchyChecks(result: GenerateScoredRefinedTitleCandidatesResult, context: TitleHierarchyContext): Array<[string, boolean]> {
  const pool = result.finalCandidatePool;
  return [
    ["PIPELINE_TITLE_CONTEXT_PASSED", result.candidateResult.titleHierarchyContext?.primaryMessage === context.primaryMessage],
    ["PIPELINE_MAIN_TITLE_PRESERVED", pool.every((item) => orderedTitle(item) === item.mainTitle)],
    ["PIPELINE_SUBTITLE_PRESERVED", pool.every((item) => !item.subtitleLockup.text || item.subtitleLockup.text === context.subtitle)],
    ["PIPELINE_NO_NEW_TITLE_TEXT", pool.every((item) => visibleTexts(item).every((text) => context.visibleTextPolicy.allowedVisibleText.includes(text)))],
    ["PIPELINE_SUBTITLE_HOOK_VISIBLE_WHEN_SAFE", pool.some((item) => item.subtitleLockup.text === context.subtitle && item.subtitleLockup.placementPolicy !== "hidden")],
    ["PIPELINE_RECOMMENDED_IDS_NOT_EMPTY", result.recommendedCandidateIds.length > 0],
    ["PIPELINE_REJECTED_GATES_UNCHANGED", result.finalCandidatePool.every((item) => !result.diagnostics.rejectedCandidateIds.includes(item.candidateId))],
  ];
}

function runPrimaryMessageSampleChecks(): void {
  const rows = sampleRequests().map(([label, request, expected]) => {
    const context = buildTitleHierarchyContext(request);
    const visibleText = context.visibleTextPolicy.allowedVisibleText.join("/");
    const hiddenOnly = Boolean(context.primaryMessage && !visibleText.includes(context.primaryMessage));
    const pass = context.primaryMessage === expected && context.mainTitle === request.title.mainTitle && (!hiddenOnly || context.hierarchyIntent === "briefOnlyThemeSupport");
    return { label, expected, actual: context.primaryMessage ?? "", intent: context.hierarchyIntent, priority: context.recommendedSubtitlePriority, pass };
  });
  for (const row of rows) console.error("PIPELINE_TITLE_CONTEXT_SAMPLE", `${row.label}:${row.actual}:${row.intent}:${row.priority}:${row.pass ? "PASS" : "FAIL"}`);
  if (rows.some((row) => !row.pass)) process.exit(1);
}

function sampleRequests(): Array<[string, StandardGenerateV2Request, string]> {
  return [
    ["fourClassics", request("暑期体验课", "四大名著体验营", "主打四大名著", "四大名著"), "四大名著"],
    ["aiWriting", request("春季公开课", "AI作文批改体验", "主打AI作文批改", "AI作文批改"), "AI作文批改"],
    ["expression", request("成长汇报课", "看见孩子的表达力量", "主打孩子第一次独立表达", "孩子第一次独立表达"), "孩子第一次独立表达"],
    ["poetry", request("端午诗词会", "在诗词里遇见传统文化", "突出诗词里的传统文化", "诗词里的传统文化"), "诗词里的传统文化"],
    ["wholeBook", request("阅读体验课", "走进整本书阅读", "主打整本书阅读", "整本书阅读"), "整本书阅读"],
  ];
}

function request(mainTitle: string, subtitle: string, titleBrief: string, theme: string): StandardGenerateV2Request {
  return { source: "standard-form-v2", brandKey: "yuanfangDefault", form: { productOutputType: "enrollment", eventBrief: `围绕${theme}设计课程活动，让家长一眼理解传播重点。`, styleBrief: "明亮可信", titleBrief }, title: { mainTitle, subtitle }, background: { mode: "debugFixture" } };
}

function orderedTitle(item: GenerateScoredRefinedTitleCandidatesResult["finalCandidatePool"][number]): string {
  return item.titleUnits.slice().sort((a, b) => a.readingOrder - b.readingOrder).map((unit) => unit.text).join("");
}

function visibleTexts(item: GenerateScoredRefinedTitleCandidatesResult["finalCandidatePool"][number]): string[] {
  return [orderedTitle(item), item.subtitleLockup.placementPolicy === "hidden" ? "" : item.subtitleLockup.text].filter(Boolean);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);

  console.error("TITLE_CANDIDATE_PIPELINE_TEST_FAILED", message);
  process.exit(1);
});
