import { existsSync, readFileSync } from "node:fs";
import { generateTitleCandidates } from "../src/services/title-candidate.service";
import { scoreTitleCandidates } from "../src/services/title-candidate-scorer.service";

const BACKGROUND_IMAGE_PATH = "/tmp/yuanfang-title-director-bg.jpg";

async function main(): Promise<void> {
  if (!existsSync(BACKGROUND_IMAGE_PATH)) {
    console.error("TITLE_CANDIDATE_SCORER_TEST_IMAGE_MISSING", BACKGROUND_IMAGE_PATH);
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
  const finalRanking = scoringResult.results.filter((result) => !result.shouldReject);
  const rejectedRanking = scoringResult.results.filter((result) => result.shouldReject);

  console.error("TITLE_CANDIDATES_SOURCE", candidateResult.source);
  if (candidateResult.source === "fallback") {
    console.error("TITLE_CANDIDATES_SOURCE fallback FAIL", candidateResult.reason);
  }
  console.error("TITLE_LOCKUP_BLUEPRINT_COUNT", candidateResult.lockupBlueprints.length);
  console.error(
    "BLUEPRINT_IS_FALLBACK_FLAGS",
    candidateResult.lockupBlueprints.map((blueprint) => String(blueprint.isFallbackCandidate)).join(","),
  );
  console.error("SCORER_SOURCE", scoringResult.source);
  console.error("SCORER_BEST_CANDIDATE_ID", scoringResult.bestCandidateId ?? "null");
  console.error("SCORER_NEEDS_REFINEMENT", String(scoringResult.needsRefinement));
  console.error("SCORER_REASON", scoringResult.reason);
  console.error(
    "SCORER_RANKING",
    scoringResult.results
      .map((result) => [
        result.rank,
        result.candidateId,
        result.score.totalScore,
        result.shouldEnterRefiner ? "refiner" : "hold",
        result.shouldReject ? "reject" : "keep",
      ].join(":"))
      .join(" | "),
  );
  console.error(
    "SCORER_FINAL_RANKING",
    finalRanking
      .map((result) => `${result.rank}:${result.candidateId}:${result.score.totalScore}:${result.shouldEnterRefiner ? "refiner" : "keep"}`)
      .join(" | "),
  );
  console.error(
    "SCORER_REJECTED_RANKING",
    rejectedRanking
      .map((result) => `${result.rank}:${result.candidateId}:${result.score.totalScore}:reject`)
      .join(" | "),
  );
  console.error("SCORER_TOP_ELIGIBLE", finalRanking[0]?.candidateId ?? "null");
  console.error(
    "SCORER_DIVERSITY_GROUPS",
    scoringResult.results
      .map((result) => `${result.candidateId}:${result.diagnostic.diversityGroupKey}`)
      .join(" | "),
  );
  console.error(
    "SCORER_REFINER_SELECTION",
    scoringResult.results
      .map((result) => [
        result.candidateId,
        result.shouldEnterRefiner ? "refiner" : "hold",
        result.diagnostic.refinerSelectionReason,
      ].join(":"))
      .join(" | "),
  );
  console.error(
    "SCORER_STRUCTURAL_SIMILARITY",
    scoringResult.results
      .map((result) => `${result.candidateId}:${result.diagnostic.nearestSimilarCandidateId ?? "none"}:${result.diagnostic.maxStructuralSimilarity}`)
      .join(" | "),
  );
  console.error(
    "SCORER_ARRANGEMENT_SIGNATURES",
    JSON.stringify(scoringResult.results.map((result) => ({
      candidateId: result.candidateId,
      signature: result.diagnostic.arrangementSignature,
    }))),
  );
  console.error(
    "SCORER_BREAKDOWN",
    JSON.stringify(scoringResult.results.map((result) => ({
      candidateId: result.candidateId,
      rank: result.rank,
      score: result.score,
      shouldEnterRefiner: result.shouldEnterRefiner,
      shouldReject: result.shouldReject,
      diagnostic: result.diagnostic,
    }))),
  );
  console.log(JSON.stringify({
    candidateResult: {
      source: candidateResult.source,
      reason: candidateResult.reason,
      lockupBlueprints: candidateResult.lockupBlueprints,
    },
    scoringResult,
  }, null, 2));
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);

  console.error("TITLE_CANDIDATE_SCORER_TEST_FAILED", message);
  process.exit(1);
});
