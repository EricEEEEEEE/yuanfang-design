import { existsSync, readFileSync } from "node:fs";
import type { TitleBox, TitleLockupBlueprint } from "../src/config/title-lockup-blueprint";
import type { RefinedTitleLockupBlueprint } from "../src/services/title-candidate-refiner.service";
import { generateTitleCandidates } from "../src/services/title-candidate.service";
import { refineTitleCandidates } from "../src/services/title-candidate-refiner.service";
import { scoreTitleCandidates } from "../src/services/title-candidate-scorer.service";
import type { TitleCandidateScoringResult } from "../src/services/title-candidate-scorer.service";
import type { SpatialStrategy } from "../src/services/spatial-strategy-planner.service";

const BACKGROUND_IMAGE_PATH = "/tmp/yuanfang-title-director-bg.jpg";

async function main(): Promise<void> {
  runDeterministicScaleTests();
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

function runDeterministicScaleTests(): void {
  const safe = refineFixture("scaleSafe", [], { x: 300, y: 240, width: 150, height: 180 });
  const safeAction = scaleAction(safe);
  const safeJoin = orderedTitle(safe.refinedBlueprints[0].blueprint) === "春季公开课";
  const safeSubtitle = safe.refinedBlueprints[0].blueprint.subtitleLockup.placementPolicy !== "hidden";
  const safeRatio = areaRatio(safe.refinedBlueprints[0].blueprint.lockupBox);
  assert("REFINER_MIN_SCALE_UP_PASS", safeRatio >= 0.06 && safeAction?.scaleApplied === true && safeJoin && safeSubtitle);

  const blocked = refineFixture("scaleBlocked", [{ id: "blockedFutureScale", reasonType: "subject", reason: "fixture", x: 260, y: 80, width: 400, height: 400 }], { x: 100, y: 100, width: 130, height: 150 });
  const blockedAction = scaleAction(blocked);
  assert("REFINER_MIN_SCALE_BLOCKED_BY_SAFETY_PASS", areaRatio(blocked.refinedBlueprints[0].blueprint.lockupBox) < 0.06 && blockedAction?.scaleBlockedReason === "minimumLockupScaleBlockedBySafety" && blocked.refinedBlueprints[0].safety.passed);

  const subtitle = refineFixture("subtitlePreserved", [], { x: 230, y: 140, width: 180, height: 170 });
  const refined = subtitle.refinedBlueprints[0].blueprint;
  assert("REFINER_SUBTITLE_PRESERVED_AFTER_SCALE_PASS", refined.subtitleLockup.text === "4节课体验远方语文" && refined.subtitleLockup.subtitleBox !== null && refined.subtitleLockup.placementPolicy !== "hidden");
}

function refineFixture(id: string, forbiddenZones: SpatialStrategy["backgroundLayout"]["forbiddenZones"], lockup: TitleBox): ReturnType<typeof refineTitleCandidates> {
  const blueprint = fixtureBlueprint(id, lockup);
  return refineTitleCandidates({ lockupBlueprints: [blueprint], spatialStrategy: fixtureStrategy(forbiddenZones), scorerResults: [score(blueprint.candidateId)] });
}

function fixtureBlueprint(id: string, lockup: TitleBox): TitleLockupBlueprint {
  const lockupBox = { ...lockup, safePadding: 16, allowedOverflowPx: 0 };
  const unitA = { x: lockup.x + 16, y: lockup.y + 18, width: lockup.width - 32, height: 42, maxWidth: lockup.width - 32, maxHeight: 42, rotationDeg: 0 };
  const unitB = { x: lockup.x + 16, y: lockup.y + 78, width: lockup.width - 32, height: 54, maxWidth: lockup.width - 32, maxHeight: 54, rotationDeg: 0 };
  const subtitleBox = { x: lockup.x + 10, y: lockup.y + lockup.height + 20, width: lockup.width - 20, height: 32, maxWidth: lockup.width - 20, maxHeight: 32, rotationDeg: 0 };
  return { candidateId: id, spatialAnchorId: "anchor", semanticSplitId: "fixtureSplit", mainTitle: "春季公开课", compositionMode: "centerStageLockup", flowAxis: "centered", orientationPreference: "balanced", patternKeys: ["cleanBrandCentered"], effectIntent: "campaignImpact", decorationIntents: [], spatialContract: { spatialAnchorId: "anchor", anchorBox: anchor(), lockupBox, flowAxis: "centered", secondaryAnchorDefaultUsage: "subtitleOrAuxiliaryOnly", collisionPolicy: collision(), forbiddenZonePolicy: forbidden(), notes: [] }, lockupBox, titleUnits: [{ text: "春季", semanticRole: "lead", visualRole: "lead", unitBox: unitA, direction: "horizontal", visualWeight: 3, alignment: "center", readingOrder: 1, allowEmphasis: true }, { text: "公开课", semanticRole: "hero", visualRole: "hero", unitBox: unitB, direction: "horizontal", visualWeight: 6, alignment: "center", readingOrder: 2, allowEmphasis: true }], subtitleLockup: { text: "4节课体验远方语文", placementPolicy: "belowMainLockup", subtitleBox, visualWeight: 1.5, readingOrder: 99 }, collisionPolicy: collision(), forbiddenZonePolicy: forbidden(), readingOrder: ["春季", "公开课"], isFallbackCandidate: false, reason: "deterministic refiner scale fixture" };
}

function fixtureStrategy(forbiddenZones: SpatialStrategy["backgroundLayout"]["forbiddenZones"]): SpatialStrategy {
  return { source: "ai", contentIntent: "campaign", strategyMode: "centerLockup", orientationPreference: "verticalFirst", primaryTextAnchorId: "anchor", secondaryTextAnchorIds: ["secondary"], patternPool: { primary: ["cleanBrandCentered"], secondary: [], exploratory: [], disallowed: [] }, candidateGuidance: [], forbiddenGuidance: [], reason: "fixture", backgroundLayout: { source: "ai", safeZones: [{ id: "safe", shape: "centerBlock", complexity: "low", confidence: 1, reason: "fixture", ...anchor() }], forbiddenZones, negativeSpaceShape: "centerBlock", dominantFlow: "centered", recommendedTitleFlow: "centerLockup", textAnchors: [{ id: "anchor", safeZoneId: "safe", preferredOrientation: "vertical", recommendedTitleFlow: "centerLockup", priority: 1, confidence: 1, reason: "fixture", ...anchor() }, { id: "secondary", safeZoneId: "safe", x: 120, y: 760, width: 480, height: 120, preferredOrientation: "horizontal", recommendedTitleFlow: "centerLockup", priority: 2, confidence: 1, reason: "fixture" }], compositionReason: "fixture" } };
}

function score(candidateId: string): TitleCandidateScoringResult {
  return { candidateId, rank: 1, rawScoreRank: 1, finalRank: 1, shouldEnterRefiner: true, shouldReject: false, recommendedAction: "refine", rejectionReasonCode: "none", refinerPriority: 100, keepButDoNotRefineReason: "none", score: { spatialFitScore: 90, lockupIntegrityScore: 90, hierarchyScore: 90, readabilityScore: 90, subtitleSafetyScore: 90, forbiddenZoneAvoidanceScore: 90, candidateDiversityScore: 90, repetitionPenalty: 0, fallbackPenalty: 0, totalScore: 90, reasons: [], warnings: [] }, diagnostic: { arrangementSignature: { semanticSplitId: "fixtureSplit", compositionMode: "fixture", flowAxis: "fixture", unitCount: 2, ySpanBucket: "medium", xOffsetPattern: "centered", heroPosition: "middle", subtitlePlacement: "belowMainLockup", subtitleVisibility: "visible", patternKeyGroup: "clean", structuralFamily: "centerStageDouble" }, diversityGroupKey: "fixture", nearestSimilarCandidateId: null, maxStructuralSimilarity: 0, refinerSelectionReason: "fixture" } };
}

function scaleAction(result: ReturnType<typeof refineTitleCandidates>): { scaleApplied?: boolean; scaleBlockedReason?: string } | undefined {
  const after = result.refinementActions.find((item) => item.type === "enforceMinimumLockupScale")?.after as { diagnostics?: { scaleApplied?: boolean; scaleBlockedReason?: string } } | undefined;
  return after?.diagnostics;
}
function assert(label: string, pass: boolean): void { console.error(label, pass ? "PASS" : "FAIL"); if (!pass) throw new Error(label); }
function anchor(): TitleBox { return { x: 0, y: 0, width: 700, height: 700 }; }
function collision(): TitleLockupBlueprint["collisionPolicy"] { return { strategy: "reject", minGapPx: 16, avoidLogo: true, avoidMascot: true, avoidMainSubject: true }; }
function forbidden(): TitleLockupBlueprint["forbiddenZonePolicy"] { return { forbiddenZoneIds: [], allowOverlap: false, onConflict: "reject" }; }
function orderedTitle(blueprint: TitleLockupBlueprint): string { return blueprint.titleUnits.slice().sort((a, b) => a.readingOrder - b.readingOrder).map((unit) => unit.text).join(""); }
function areaRatio(value: TitleBox): number { return value.width * value.height / 1000000; }

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
