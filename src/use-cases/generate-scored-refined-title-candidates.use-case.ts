import type { TitleLockupBlueprint, TitleLockupBox } from "@/config/title-lockup-blueprint";
import {
  generateTitleCandidates,
  type GenerateTitleCandidatesInput,
  type GenerateTitleCandidatesResult,
} from "@/services/title-candidate.service";
import {
  scoreTitleCandidates,
  type ScoreTitleCandidatesResult,
  type TitleCandidateScoringResult,
} from "@/services/title-candidate-scorer.service";
import {
  refineTitleCandidates,
  type RefineTitleCandidatesResult,
  type RefinedTitleLockupBlueprint,
} from "@/services/title-candidate-refiner.service";
import { withMinimumLockupScaleSafety } from "@/services/helpers/title-candidate-refiner-scale";

export type GenerateScoredRefinedTitleCandidatesInput = GenerateTitleCandidatesInput;
export type TitleCandidatePipelineSource = "rule-based-v1";
export type FinalCandidatePoolItemDiagnostic = {
  candidateId: string;
  sourceCandidateId?: string;
  origin: "refined" | "original_keep";
  recommendedAction: "refine" | "keep";
  safetyPassed: boolean;
  reason: string;
};
export type FinalCandidatePoolSafetyFlag = { candidateId: string; passed: boolean; reasons: string[] };
export type GenerateScoredRefinedTitleCandidatesResult = {
  source: TitleCandidatePipelineSource;
  candidateResult: GenerateTitleCandidatesResult;
  scoringResult: ScoreTitleCandidatesResult;
  refinementResult: RefineTitleCandidatesResult;
  finalCandidatePool: TitleLockupBlueprint[];
  recommendedCandidateIds: string[];
  diagnostics: {
    finalPoolItems: FinalCandidatePoolItemDiagnostic[];
    rejectedCandidateIds: string[];
    fallbackCandidateIds: string[];
    refinedCandidateIdMap: Record<string, string>;
    sourceCandidateIdMap: Record<string, string>;
    safetyFlags: FinalCandidatePoolSafetyFlag[];
    warnings: string[];
    reason: string;
  };
};

type PoolBuildResult = Pick<GenerateScoredRefinedTitleCandidatesResult, "finalCandidatePool" | "recommendedCandidateIds" | "diagnostics">;

export async function generateScoredRefinedTitleCandidates(
  input: GenerateScoredRefinedTitleCandidatesInput,
): Promise<GenerateScoredRefinedTitleCandidatesResult> {
  const candidateResult = await generateTitleCandidates(input);
  const scoringResult = scoreTitleCandidates({
    lockupBlueprints: candidateResult.lockupBlueprints,
    spatialStrategy: candidateResult.spatialStrategy,
  });
  const refinementResult = refineTitleCandidates({
    lockupBlueprints: candidateResult.lockupBlueprints,
    spatialStrategy: candidateResult.spatialStrategy,
    scorerResults: scoringResult.results,
  });
  const pool = buildFinalCandidatePool(candidateResult, scoringResult, refinementResult);

  return { source: "rule-based-v1", candidateResult, scoringResult, refinementResult, ...pool };
}

function buildFinalCandidatePool(
  candidateResult: GenerateTitleCandidatesResult,
  scoringResult: ScoreTitleCandidatesResult,
  refinementResult: RefineTitleCandidatesResult,
): PoolBuildResult {
  const sourceById = new Map(candidateResult.lockupBlueprints.map((blueprint) => [blueprint.candidateId, blueprint]));
  const scoreById = new Map(scoringResult.results.map((result) => [result.candidateId, result]));
  const rejectedIds = new Set(scoringResult.results.filter((result) => result.shouldReject).map((result) => result.candidateId));
  const fallbackCandidateIds = candidateResult.lockupBlueprints.filter((blueprint) => blueprint.isFallbackCandidate).map((blueprint) => blueprint.candidateId);
  const refinedCandidateIdMap: Record<string, string> = {};
  const sourceCandidateIdMap: Record<string, string> = {};
  const finalCandidatePool: TitleLockupBlueprint[] = [];
  const recommendedCandidateIds: string[] = [];
  const finalPoolItems: FinalCandidatePoolItemDiagnostic[] = [];
  const safetyFlags: FinalCandidatePoolSafetyFlag[] = [];
  const warnings = [...refinementResult.warnings];

  for (const item of refinementResult.refinedBlueprints.slice().sort((left, right) => compareRefined(left, right, scoreById))) {
    const score = scoreById.get(item.sourceCandidateId);
    const source = sourceById.get(item.sourceCandidateId);
    if (!item.safety.passed || !score || score.shouldReject || !source || source.isFallbackCandidate) continue;
    const blueprint = cloneBlueprint(item.blueprint);
    blueprint.candidateId = item.refinedCandidateId;
    refinedCandidateIdMap[item.sourceCandidateId] = item.refinedCandidateId;
    sourceCandidateIdMap[item.refinedCandidateId] = item.sourceCandidateId;
    const safety = withMinimumLockupScaleSafety(blueprint, validatePoolCandidate(blueprint, rejectedIds, item.sourceCandidateId));
    const recommendedAction = score.recommendedAction === "refine" ? "refine" : "keep";
    addPoolCandidate({ blueprint, safety, sourceCandidateId: item.sourceCandidateId, origin: "refined", recommendedAction, reason: `${recommendedAction === "refine" ? "refined" : "measured retry refinement"} from ${item.sourceCandidateId}.` }, finalCandidatePool, recommendedCandidateIds, finalPoolItems, safetyFlags, warnings);
  }

  for (const score of scoringResult.results.filter((result) => result.recommendedAction === "keep" && !result.shouldReject).sort((left, right) => left.finalRank - right.finalRank)) {
    const source = sourceById.get(score.candidateId);
    if (!source || source.isFallbackCandidate) continue;
    const blueprint = cloneBlueprint(source);
    const safety = withMinimumLockupScaleSafety(blueprint, validatePoolCandidate(blueprint, rejectedIds));
    addPoolCandidate({ blueprint, safety, origin: "original_keep", recommendedAction: "keep", reason: score.keepButDoNotRefineReason ?? "candidate kept without refinement." }, finalCandidatePool, recommendedCandidateIds, finalPoolItems, safetyFlags, warnings);
  }

  const reason = finalCandidatePool.length > 0
    ? `Built final candidate pool with ${finalCandidatePool.length} candidates; recommended ${recommendedCandidateIds.length}.`
    : "Diagnostic only: no formal final candidates passed pipeline contract.";

  return {
    finalCandidatePool,
    recommendedCandidateIds,
    diagnostics: {
      finalPoolItems,
      rejectedCandidateIds: Array.from(rejectedIds),
      fallbackCandidateIds,
      refinedCandidateIdMap,
      sourceCandidateIdMap,
      safetyFlags,
      warnings,
      reason,
    },
  };
}

function addPoolCandidate(
  item: { blueprint: TitleLockupBlueprint; safety: FinalCandidatePoolSafetyFlag; sourceCandidateId?: string; origin: "refined" | "original_keep"; recommendedAction: "refine" | "keep"; reason: string },
  finalCandidatePool: TitleLockupBlueprint[],
  recommendedCandidateIds: string[],
  finalPoolItems: FinalCandidatePoolItemDiagnostic[],
  safetyFlags: FinalCandidatePoolSafetyFlag[],
  warnings: string[],
): void {
  if (finalCandidatePool.some((candidate) => candidate.candidateId === item.blueprint.candidateId)) {
    warnings.push(`duplicate candidateId skipped: ${item.blueprint.candidateId}`);
    return;
  }
  safetyFlags.push(item.safety);
  if (!item.safety.passed) {
    warnings.push(`${item.blueprint.candidateId} skipped: ${item.safety.reasons.join("; ")}`);
    return;
  }
  finalCandidatePool.push(item.blueprint);
  if (item.recommendedAction === "refine") recommendedCandidateIds.push(item.blueprint.candidateId);
  finalPoolItems.push({ candidateId: item.blueprint.candidateId, sourceCandidateId: item.sourceCandidateId, origin: item.origin, recommendedAction: item.recommendedAction, safetyPassed: true, reason: item.reason });
}

function compareRefined(left: RefinedTitleLockupBlueprint, right: RefinedTitleLockupBlueprint, scoreById: Map<string, TitleCandidateScoringResult>): number {
  const leftScore = scoreById.get(left.sourceCandidateId);
  const rightScore = scoreById.get(right.sourceCandidateId);
  const priorityDiff = (rightScore?.refinerPriority ?? 0) - (leftScore?.refinerPriority ?? 0);
  if (priorityDiff !== 0) return priorityDiff;
  return (leftScore?.finalRank ?? 999) - (rightScore?.finalRank ?? 999);
}

function validatePoolCandidate(blueprint: TitleLockupBlueprint, rejectedIds: ReadonlySet<string>, sourceCandidateId?: string): FinalCandidatePoolSafetyFlag {
  const reasons: string[] = [];
  const scorerCandidateId = sourceCandidateId ?? blueprint.candidateId;
  const joinedTitle = blueprint.titleUnits.slice().sort((left, right) => left.readingOrder - right.readingOrder).map((unit) => unit.text).join("");
  if (blueprint.isFallbackCandidate) reasons.push("fallback candidate cannot enter final pool.");
  if (rejectedIds.has(scorerCandidateId)) reasons.push("scorer rejected candidate cannot enter final pool.");
  if (joinedTitle !== blueprint.mainTitle) reasons.push("titleUnits readingOrder does not join mainTitle.");
  if (!sameLockupBox(blueprint.spatialContract.lockupBox, blueprint.lockupBox)) reasons.push("spatialContract.lockupBox does not match lockupBox.");
  if (sourceCandidateId && blueprint.candidateId === sourceCandidateId) reasons.push("refined candidateId must differ from sourceCandidateId.");
  return { candidateId: blueprint.candidateId, passed: reasons.length === 0, reasons };
}

function sameLockupBox(left: TitleLockupBox, right: TitleLockupBox): boolean {
  return left.x === right.x && left.y === right.y && left.width === right.width && left.height === right.height && left.safePadding === right.safePadding && left.allowedOverflowPx === right.allowedOverflowPx;
}

function cloneBlueprint(blueprint: TitleLockupBlueprint): TitleLockupBlueprint {
  return JSON.parse(JSON.stringify(blueprint)) as TitleLockupBlueprint;
}
