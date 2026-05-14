import { existsSync, readFileSync } from "node:fs";
import {
  generateScoredRefinedTitleCandidates,
  type GenerateScoredRefinedTitleCandidatesResult,
} from "../src/use-cases/generate-scored-refined-title-candidates.use-case";

const BACKGROUND_IMAGE_PATH = "/tmp/yuanfang-title-director-bg.jpg";

async function main(): Promise<void> {
  if (!existsSync(BACKGROUND_IMAGE_PATH)) {
    console.error("TITLE_CANDIDATE_PIPELINE_TEST_IMAGE_MISSING", BACKGROUND_IMAGE_PATH);
    process.exit(1);
  }

  const backgroundImageBase64 = readFileSync(BACKGROUND_IMAGE_PATH).toString("base64");
  const result = await generateScoredRefinedTitleCandidates({
    backgroundImageBase64,
    mainTitle: "成长汇报课",
    subtitle: "看见孩子的表达力量",
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

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);

  console.error("TITLE_CANDIDATE_PIPELINE_TEST_FAILED", message);
  process.exit(1);
});
