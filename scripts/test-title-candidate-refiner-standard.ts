import { existsSync, readFileSync } from "node:fs";
import type { RefinedTitleLockupBlueprint } from "../src/services/title-candidate-refiner.service";
import { generateTitleCandidates } from "../src/services/title-candidate.service";
import { refineTitleCandidates } from "../src/services/title-candidate-refiner.service";
import { scoreTitleCandidates } from "../src/services/title-candidate-scorer.service";

const BACKGROUND_IMAGE_PATH = "/tmp/yuanfang-title-director-bg.jpg";

async function main(): Promise<void> {
  if (!existsSync(BACKGROUND_IMAGE_PATH)) {
    console.error("TITLE_CANDIDATE_REFINER_TEST_IMAGE_MISSING", BACKGROUND_IMAGE_PATH);
    process.exit(1);
  }

  const backgroundImageBase64 = readFileSync(BACKGROUND_IMAGE_PATH).toString("base64");
  const candidateResult = await generateTitleCandidates({
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
  const scoringResult = scoreTitleCandidates({
    lockupBlueprints: candidateResult.lockupBlueprints,
    spatialStrategy: candidateResult.spatialStrategy,
  });
  const refinerResult = refineTitleCandidates({
    lockupBlueprints: candidateResult.lockupBlueprints,
    spatialStrategy: candidateResult.spatialStrategy,
    scorerResults: scoringResult.results,
  });
  const first = refinerResult.refinedBlueprints[0];

  console.error("REFINER_SOURCE", refinerResult.source);
  console.error("TITLE_CANDIDATES_SOURCE", candidateResult.source);
  console.error("TITLE_LOCKUP_BLUEPRINT_COUNT", candidateResult.lockupBlueprints.length);
  console.error(
    "BLUEPRINT_IS_FALLBACK_FLAGS",
    candidateResult.lockupBlueprints.map((blueprint) => String(blueprint.isFallbackCandidate)).join(","),
  );
  console.error(
    "SCORER_RECOMMENDED_ACTIONS",
    scoringResult.results.map((result) => `${result.candidateId}:${result.recommendedAction}`).join(" | "),
  );
  console.error(
    "REFINER_INPUT_CANDIDATES",
    scoringResult.results
      .filter((result) => result.recommendedAction === "refine" && !result.shouldReject)
      .map((result) => result.candidateId)
      .join(","),
  );
  console.error("REFINED_BLUEPRINT_COUNT", refinerResult.refinedBlueprints.length);
  console.error(
    "REFINED_CANDIDATE_IDS",
    refinerResult.refinedBlueprints.map((item) => item.refinedCandidateId).join(","),
  );
  console.error(
    "REFINER_ACTIONS",
    refinerResult.refinementActions
      .map((action) => `${action.sourceCandidateId}:${action.refinedCandidateId ?? "none"}:${action.type}:${action.target}`)
      .join(" | "),
  );
  console.error(
    "REFINER_SAFETY_FLAGS",
    refinerResult.refinedBlueprints
      .map((item) => `${item.refinedCandidateId}:${item.safety.passed ? "pass" : "fail"}:${item.safety.reasons.join(",") || "none"}`)
      .join(" | "),
  );
  console.error(
    "REFINER_REJECTED_CANDIDATES",
    refinerResult.rejectedRefinementCandidates
      .map((item) => `${item.sourceCandidateId}:${item.reason}`)
      .join(" | "),
  );
  console.error("FIRST_REFINED_LOCKUP_BOX", JSON.stringify(first?.blueprint.lockupBox ?? null));
  console.error("FIRST_REFINED_UNIT_BOXES", JSON.stringify(first?.blueprint.titleUnits.map((unit) => unit.unitBox) ?? []));
  console.error("FIRST_REFINED_SUBTITLE_BOX", JSON.stringify(first?.blueprint.subtitleLockup.subtitleBox ?? null));
  console.error("REFINER_REASON", refinerResult.reason);
  console.log(JSON.stringify({
    scoringResult: {
      source: scoringResult.source,
      bestCandidateId: scoringResult.bestCandidateId,
      actions: scoringResult.results.map((result) => ({
        candidateId: result.candidateId,
        recommendedAction: result.recommendedAction,
        shouldReject: result.shouldReject,
      })),
    },
    refinerResult: {
      ...refinerResult,
      refinedBlueprints: refinerResult.refinedBlueprints.map(summarizeRefined),
    },
  }, null, 2));
}

function summarizeRefined(item: RefinedTitleLockupBlueprint): unknown {
  return {
    sourceCandidateId: item.sourceCandidateId,
    refinedCandidateId: item.refinedCandidateId,
    candidateId: item.blueprint.candidateId,
    semanticSplitId: item.blueprint.semanticSplitId,
    compositionMode: item.blueprint.compositionMode,
    lockupBox: item.blueprint.lockupBox,
    unitBoxes: item.blueprint.titleUnits.map((unit) => ({
      text: unit.text,
      role: unit.visualRole,
      box: unit.unitBox,
    })),
    subtitleBox: item.blueprint.subtitleLockup.subtitleBox,
    actions: item.actions.map((action) => action.type),
    safety: item.safety,
  };
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);

  console.error("TITLE_CANDIDATE_REFINER_TEST_FAILED", message);
  process.exit(1);
});
