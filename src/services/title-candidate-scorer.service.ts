import type { TitleBox, TitleLockupBlueprint } from "@/config/title-lockup-blueprint";
import type { TitleDesignPlan } from "@/config/title-design-system";
import type { ForbiddenZone } from "@/services/background-layout-intelligence.service";
import type { SpatialStrategy } from "@/services/spatial-strategy-planner.service";

export type ScoreTitleCandidatesInput = { lockupBlueprints: TitleLockupBlueprint[]; spatialStrategy: SpatialStrategy; titleDesignPlan?: TitleDesignPlan };
export type TitleCandidateScoreBreakdown = {
  spatialFitScore: number; lockupIntegrityScore: number; hierarchyScore: number; readabilityScore: number;
  subtitleSafetyScore: number; forbiddenZoneAvoidanceScore: number; candidateDiversityScore: number;
  l7DesignSystemScore?: number; repetitionPenalty: number; fallbackPenalty: number; totalScore: number; reasons: string[]; warnings: string[];
};
export type RecommendedAction = "refine" | "keep" | "reject";
export type RejectionReasonCode =
  | "fallback_candidate"
  | "strategy_mismatch_vertical_first"
  | "unsafe_spatial_fit"
  | "unsafe_forbidden_zone_overlap"
  | "unsafe_subtitle"
  | "none";
export type KeepButDoNotRefineReason =
  | "diversity_group_already_represented"
  | "below_refiner_threshold"
  | "max_refiner_candidates_reached"
  | "candidate_safe_but_lower_priority"
  | "none";
export type TitleCandidateScoringResult = {
  candidateId: string; rank: number; score: TitleCandidateScoreBreakdown; shouldEnterRefiner: boolean; shouldReject: boolean;
  recommendedAction: RecommendedAction; rejectionReasonCode: RejectionReasonCode; rawScoreRank: number; finalRank: number;
  refinerPriority?: number; keepButDoNotRefineReason?: KeepButDoNotRefineReason;
  diagnostic: TitleCandidateScoringDiagnostic;
};
export type ScoreTitleCandidatesResult = {
  source: "rule-based-v1"; results: TitleCandidateScoringResult[]; bestCandidateId: string | null; needsRefinement: boolean; reason: string;
};
export type TitleCandidateScoringDiagnostic = {
  arrangementSignature: ArrangementSignature;
  diversityGroupKey: string;
  nearestSimilarCandidateId: string | null;
  maxStructuralSimilarity: number;
  l7DesignGateSummary?: string;
  refinerSelectionReason: string;
};

type ScoreParts = Omit<TitleCandidateScoreBreakdown, "totalScore" | "reasons" | "warnings">;
type YSpanBucket = "flat" | "compact" | "medium" | "tall";
type XOffsetPattern = "centered" | "leftRightStagger" | "rightLeftStagger" | "diagonalDown" | "diagonalUp" | "single" | "unknown";
type HeroPosition = "top" | "middle" | "bottom" | "single" | "unknown";
type StructuralFamily = "fullHeroSingle" | "leadHeroDoubleHorizontal" | "threeStepVerticalStagger" | "verticalHeroStack" | "centerStageDouble" | "badgeHeroDouble" | "other";
type ArrangementSignature = {
  semanticSplitId: string;
  compositionMode: string;
  flowAxis: string;
  unitCount: number;
  ySpanBucket: YSpanBucket;
  xOffsetPattern: XOffsetPattern;
  heroPosition: HeroPosition;
  subtitlePlacement: string;
  subtitleVisibility: "visible" | "hidden";
  patternKeyGroup: string;
  structuralFamily: StructuralFamily;
};
type SimilarityMatch = { candidateId: string | null; score: number };
type RefinerSelection = {
  selectedIds: Set<string>;
  reasons: Map<string, string>;
  priorities: Map<string, number>;
  keepReasons: Map<string, KeepButDoNotRefineReason>;
};

export function scoreTitleCandidates(input: ScoreTitleCandidatesInput): ScoreTitleCandidatesResult {
  const scoredResults = input.lockupBlueprints
    .map((blueprint) => scoreBlueprint(blueprint, input.lockupBlueprints, input.spatialStrategy, input.titleDesignPlan));
  const rawRankByCandidateId = getRawRankByCandidateId(scoredResults);
  const rankedResults = scoredResults
    .sort(compareScoringResults)
    .map((result, index) => ({
      ...result,
      rank: index + 1,
      finalRank: index + 1,
      rawScoreRank: rawRankByCandidateId.get(result.candidateId) ?? index + 1,
    }));
  const selection = selectRefinerCandidates(rankedResults);
  const results = rankedResults.map((result) => ({
    ...result,
    shouldEnterRefiner: selection.selectedIds.has(result.candidateId),
    recommendedAction: getRecommendedAction(result.shouldReject, selection.selectedIds.has(result.candidateId)),
    refinerPriority: selection.priorities.get(result.candidateId),
    keepButDoNotRefineReason: result.shouldReject || selection.selectedIds.has(result.candidateId)
      ? "none"
      : selection.keepReasons.get(result.candidateId) ?? "candidate_safe_but_lower_priority",
    diagnostic: {
      ...result.diagnostic,
      refinerSelectionReason: selection.reasons.get(result.candidateId) ?? "held: not selected for refiner calibration.",
    },
  }));
  const best = results.find((result) => !result.shouldReject) ?? null;

  return {
    source: "rule-based-v1",
    results,
    bestCandidateId: best?.candidateId ?? null,
    needsRefinement: !best || best.score.totalScore < 85,
    reason: best ? `Best candidate ${best.candidateId} scored ${best.score.totalScore}.` : "No non-fallback candidate is eligible for final selection.",
  };
}

function compareScoringResults(left: TitleCandidateScoringResult, right: TitleCandidateScoringResult): number {
  if (left.shouldReject !== right.shouldReject) return left.shouldReject ? 1 : -1;

  return right.score.totalScore - left.score.totalScore;
}

function compareRawScoreResults(left: TitleCandidateScoringResult, right: TitleCandidateScoringResult): number {
  return right.score.totalScore - left.score.totalScore;
}

function getRawRankByCandidateId(results: readonly TitleCandidateScoringResult[]): Map<string, number> {
  return new Map<string, number>(
    results
      .slice()
      .sort(compareRawScoreResults)
      .map((result, index): [string, number] => [result.candidateId, index + 1]),
  );
}

function scoreBlueprint(blueprint: TitleLockupBlueprint, all: readonly TitleLockupBlueprint[], strategy: SpatialStrategy, titleDesignPlan: TitleDesignPlan | undefined): TitleCandidateScoringResult {
  const reasons: string[] = []; const warnings: string[] = [];
  const arrangementSignature = createArrangementSignature(blueprint);
  const diversityGroupKey = getDiversityGroupKey(arrangementSignature);
  const similarityMatch = maxSimilarity(blueprint, all, arrangementSignature);
  const parts: ScoreParts = {
    spatialFitScore: spatialFit(blueprint, strategy, reasons),
    lockupIntegrityScore: lockupIntegrity(blueprint, reasons, warnings),
    hierarchyScore: hierarchy(blueprint, reasons, warnings),
    readabilityScore: readability(blueprint, reasons),
    subtitleSafetyScore: subtitleSafety(blueprint, strategy, reasons, warnings),
    forbiddenZoneAvoidanceScore: forbiddenAvoidance(blueprint, strategy, reasons),
    candidateDiversityScore: diversity(blueprint, all, arrangementSignature, similarityMatch, warnings),
    l7DesignSystemScore: l7DesignSystemFit(blueprint, titleDesignPlan, reasons, warnings),
    repetitionPenalty: Math.round(similarityMatch.score * 30),
    fallbackPenalty: blueprint.isFallbackCandidate ? 100 : 0,
  };
  const totalScore = clamp(
    parts.spatialFitScore * 0.2 + parts.lockupIntegrityScore * 0.16 + parts.hierarchyScore * 0.15 +
    parts.readabilityScore * 0.14 + parts.subtitleSafetyScore * 0.1 + parts.forbiddenZoneAvoidanceScore * 0.13 +
    parts.candidateDiversityScore * 0.07 + (parts.l7DesignSystemScore ?? 78) * 0.05 - parts.repetitionPenalty - parts.fallbackPenalty,
  );
  const shouldReject = blueprint.isFallbackCandidate || parts.spatialFitScore < 55 ||
    parts.lockupIntegrityScore < 60 || parts.readabilityScore < 50 || parts.forbiddenZoneAvoidanceScore < 70;
  const rejectionReasonCode = getRejectionReasonCode(blueprint, parts, strategy, shouldReject);

  if (blueprint.isFallbackCandidate) warnings.push("fallback candidate is diagnostic only and cannot be selected as final output.");
  return {
    candidateId: blueprint.candidateId,
    rank: 0,
    rawScoreRank: 0,
    finalRank: 0,
    shouldEnterRefiner: false,
    shouldReject,
    recommendedAction: "reject",
    rejectionReasonCode,
    keepButDoNotRefineReason: "none",
    score: { ...parts, totalScore, reasons, warnings },
    diagnostic: {
      arrangementSignature,
      diversityGroupKey,
      nearestSimilarCandidateId: similarityMatch.candidateId,
      maxStructuralSimilarity: Number(similarityMatch.score.toFixed(2)),
      l7DesignGateSummary: titleDesignPlan ? `${titleDesignPlan.planId}:${parts.l7DesignSystemScore}` : "no-title-design-plan",
      refinerSelectionReason: "pending refiner selection.",
    },
  };
}

function selectRefinerCandidates(results: readonly TitleCandidateScoringResult[]): RefinerSelection {
  const selectedIds = new Set<string>(); const reasons = new Map<string, string>();
  const priorities = new Map<string, number>(); const keepReasons = new Map<string, KeepButDoNotRefineReason>();
  const eligible = results.filter((result) => !result.shouldReject);
  const selectedGroups = new Map<string, string>();

  for (const result of results) {
    if (result.shouldReject) {
      reasons.set(result.candidateId, "held: rejected candidate cannot enter refiner.");
      keepReasons.set(result.candidateId, "none");
    }
  }
  if (!eligible[0]) return { selectedIds, reasons, priorities, keepReasons };

  addRefinerSelection(eligible[0], "selected: top eligible non-rejected candidate.", selectedIds, selectedGroups, reasons, priorities);

  for (const result of eligible.slice(1)) {
    if (selectedIds.size >= 3) break;
    if (result.score.totalScore < 60) continue;
    if (selectedGroups.has(result.diagnostic.diversityGroupKey)) continue;
    addRefinerSelection(result, "selected: highest scoring candidate from a different structural diversity group.", selectedIds, selectedGroups, reasons, priorities);
  }

  for (const result of eligible) {
    if (selectedIds.has(result.candidateId)) continue;
    if (result.score.totalScore < 60) {
      reasons.set(result.candidateId, "held: below secondary refiner score threshold after top eligible was selected.");
      keepReasons.set(result.candidateId, "below_refiner_threshold");
      continue;
    }
    const owner = selectedGroups.get(result.diagnostic.diversityGroupKey);
    reasons.set(result.candidateId, owner ? `held: diversity group already represented by ${owner}.` : "held: refiner diversity quota reached.");
    keepReasons.set(result.candidateId, owner ? "diversity_group_already_represented" : "max_refiner_candidates_reached");
  }

  return { selectedIds, reasons, priorities, keepReasons };
}

function addRefinerSelection(result: TitleCandidateScoringResult, reason: string, selectedIds: Set<string>, selectedGroups: Map<string, string>, reasons: Map<string, string>, priorities: Map<string, number>): void {
  const priority = 100 - selectedIds.size * 10;

  selectedIds.add(result.candidateId);
  selectedGroups.set(result.diagnostic.diversityGroupKey, result.candidateId);
  reasons.set(result.candidateId, reason);
  priorities.set(result.candidateId, priority);
}

function getRecommendedAction(shouldReject: boolean, shouldEnterRefiner: boolean): RecommendedAction {
  if (shouldReject) return "reject";
  return shouldEnterRefiner ? "refine" : "keep";
}

function getRejectionReasonCode(
  blueprint: TitleLockupBlueprint,
  parts: ScoreParts,
  strategy: SpatialStrategy,
  shouldReject: boolean,
): RejectionReasonCode {
  if (!shouldReject) return "none";
  if (blueprint.isFallbackCandidate) return "fallback_candidate";
  if (
    strategy.orientationPreference === "verticalFirst" &&
    !usesVerticalOrganization(blueprint)
  ) {
    return "strategy_mismatch_vertical_first";
  }
  if (
    strategy.backgroundLayout.negativeSpaceShape === "verticalColumn" &&
    !usesVerticalOrganization(blueprint)
  ) {
    return "strategy_mismatch_vertical_first";
  }
  if (parts.forbiddenZoneAvoidanceScore < 70) return "unsafe_forbidden_zone_overlap";
  if (parts.subtitleSafetyScore < 70) return "unsafe_subtitle";
  if (parts.spatialFitScore < 55 || parts.lockupIntegrityScore < 60 || parts.readabilityScore < 50) {
    return "unsafe_spatial_fit";
  }

  return "unsafe_spatial_fit";
}

function spatialFit(blueprint: TitleLockupBlueprint, strategy: SpatialStrategy, reasons: string[]): number {
  let score = 100; const anchorIds = [strategy.primaryTextAnchorId, ...strategy.secondaryTextAnchorIds];
  if (!inside(blueprint.lockupBox, blueprint.spatialContract.anchorBox)) score = penalty(score, 45, reasons, "lockupBox outside spatialAnchor");
  if (!anchorIds.includes(blueprint.spatialAnchorId)) score = penalty(score, 18, reasons, "spatialAnchorId not in spatialStrategy anchors");
  if (strategy.orientationPreference === "verticalFirst" && !usesVerticalOrganization(blueprint)) score = penalty(score, 28, reasons, "verticalFirst candidate does not follow vertical organization");
  if (strategy.backgroundLayout.negativeSpaceShape === "verticalColumn" && !usesVerticalOrganization(blueprint)) score = penalty(score, 20, reasons, "candidate does not follow verticalColumn shape");
  if (overlapsAny(blueprint.lockupBox, strategy.backgroundLayout.forbiddenZones)) score = penalty(score, 30, reasons, "lockupBox overlaps forbiddenZones");
  return clamp(score);
}

function lockupIntegrity(blueprint: TitleLockupBlueprint, reasons: string[], warnings: string[]): number {
  let score = 100;
  const orderedTitle = blueprint.titleUnits.slice().sort((a, b) => a.readingOrder - b.readingOrder).map((unit) => unit.text).join("");
  if (orderedTitle !== blueprint.mainTitle) score = penalty(score, 50, reasons, "titleUnits reading order does not join mainTitle");
  for (const unit of blueprint.titleUnits) if (!inside(unit.unitBox, blueprint.lockupBox)) score = penalty(score, 25, reasons, `unitBox outside lockupBox: ${unit.text}`);
  for (let left = 0; left < blueprint.titleUnits.length; left += 1) {
    for (let right = left + 1; right < blueprint.titleUnits.length; right += 1) {
      if (overlapRatio(blueprint.titleUnits[left].unitBox, blueprint.titleUnits[right].unitBox) > 0.35) score = penalty(score, 18, reasons, "titleUnits have obvious collision");
    }
  }
  if (sumArea(blueprint.titleUnits.map((unit) => unit.unitBox)) / area(blueprint.lockupBox) < 0.12) {
    warnings.push("titleUnits occupy little of lockupBox; may read as scattered rather than a lockup."); score -= 8;
  }
  return clamp(score);
}

function hierarchy(blueprint: TitleLockupBlueprint, reasons: string[], warnings: string[]): number {
  let score = 100; const heroes = blueprint.titleUnits.filter((unit) => unit.visualRole === "hero");
  const maxHero = Math.max(0, ...heroes.map((unit) => unit.visualWeight));
  const maxOther = Math.max(0, ...blueprint.titleUnits.filter((unit) => unit.visualRole !== "hero").map((unit) => unit.visualWeight));
  if (heroes.length === 0) score = penalty(score, 35, reasons, "missing hero unit");
  if (maxHero <= maxOther) score = penalty(score, 30, reasons, "hero visualWeight does not dominate");
  if (blueprint.semanticSplitId === "fullHero") { warnings.push("fullHero is stable but can be visually ordinary."); score -= 8; }
  for (const hero of heroes) if (distance(hero.unitBox, blueprint.lockupBox) / Math.max(1, diagonal(blueprint.lockupBox)) > 0.42) score = penalty(score, 12, reasons, "hero unit is far from lockup visual center");
  return clamp(score);
}

function readability(blueprint: TitleLockupBlueprint, reasons: string[]): number {
  let score = 100;
  for (const unit of blueprint.titleUnits) {
    if (unit.unitBox.width < Math.max(48, Array.from(unit.text).length * 30)) score = penalty(score, 10, reasons, `unitBox may be too narrow: ${unit.text}`);
    if (unit.unitBox.height < 42) score = penalty(score, 10, reasons, `unitBox may be too short: ${unit.text}`);
    if (Math.abs(unit.unitBox.rotationDeg) > 8) score = penalty(score, 12, reasons, `rotation too large: ${unit.text}`);
  }
  if (sumArea(blueprint.titleUnits.map((unit) => unit.unitBox)) / area(blueprint.lockupBox) > 0.82) score = penalty(score, 12, reasons, "titleUnits are too dense inside lockupBox");
  return clamp(score);
}

function subtitleSafety(blueprint: TitleLockupBlueprint, strategy: SpatialStrategy, reasons: string[], warnings: string[]): number {
  let score = 100; const subtitleBox = blueprint.subtitleLockup.subtitleBox;
  if (!subtitleBox || blueprint.subtitleLockup.placementPolicy === "hidden") { warnings.push("subtitle is hidden or has no subtitleBox."); return 78; }
  for (const unit of blueprint.titleUnits) if (overlapRatio(subtitleBox, unit.unitBox) > 0.05) score = penalty(score, 24, reasons, "subtitle overlaps main title unit");
  const maxTitleBottom = Math.max(...blueprint.titleUnits.map((unit) => unit.unitBox.y + unit.unitBox.height));
  if (subtitleBox.y < maxTitleBottom && blueprint.subtitleLockup.placementPolicy === "belowMainLockup") score = penalty(score, 16, reasons, "subtitle enters main title vertical band");
  if (overlapsAny(subtitleBox, strategy.backgroundLayout.forbiddenZones)) score = penalty(score, 20, reasons, "subtitle overlaps forbiddenZones");
  return clamp(score);
}

function forbiddenAvoidance(blueprint: TitleLockupBlueprint, strategy: SpatialStrategy, reasons: string[]): number {
  let score = 100;
  const boxes = [blueprint.lockupBox, ...blueprint.titleUnits.map((unit) => unit.unitBox), ...(blueprint.subtitleLockup.subtitleBox ? [blueprint.subtitleLockup.subtitleBox] : [])];
  for (const zone of strategy.backgroundLayout.forbiddenZones) {
    if (boxes.some((box) => overlapRatio(box, zone) > 0.02)) score = penalty(score, forbiddenPenalty(zone), reasons, `overlaps forbiddenZone ${zone.id}:${zone.reasonType}`);
  }
  return clamp(score);
}

function diversity(blueprint: TitleLockupBlueprint, all: readonly TitleLockupBlueprint[], signature: ArrangementSignature, similarityMatch: SimilarityMatch, warnings: string[]): number {
  const duplicateGroupIds = all
    .filter((item) => item.candidateId !== blueprint.candidateId && getDiversityGroupKey(createArrangementSignature(item)) === getDiversityGroupKey(signature))
    .map((item) => item.candidateId);
  const value = clamp(100 - similarityMatch.score * 72 - duplicateGroupIds.length * 4);
  if (duplicateGroupIds.length > 0) warnings.push(`candidate repeats diversity group with ${duplicateGroupIds.join(",")}.`);
  if (value < 60) warnings.push("candidate is structurally similar to another candidate.");
  return value;
}

function l7DesignSystemFit(
  blueprint: TitleLockupBlueprint,
  titleDesignPlan: TitleDesignPlan | undefined,
  reasons: string[],
  warnings: string[],
): number {
  if (!titleDesignPlan) {
    warnings.push("L7 titleDesignPlan missing; design gates are diagnostic only.");
    return 78;
  }

  let score = 100;
  const plan = titleDesignPlan;
  const patternPlan = plan.referencePatternPlan;
  const lockupRatio = area(blueprint.lockupBox) / 1_000_000;
  const target = plan.adaptiveSizingPolicy.targetLockupAreaRatio;
  const min = plan.adaptiveSizingPolicy.minAcceptableLockupAreaRatio;

  if (!plan.lockupCompositionPlan.allowedModes.includes(blueprint.compositionMode)) {
    score = penalty(score, 24, reasons, `L7 composition mode not allowed: ${blueprint.compositionMode}`);
  }
  if (blueprint.patternKeys.some((key) => patternPlan.disallowed.includes(key as (typeof patternPlan.disallowed)[number]))) {
    score = penalty(score, 30, reasons, "L7 candidate uses disallowed reference pattern");
  }
  if (!blueprint.patternKeys.some((key) => patternPlan.primary.includes(key as (typeof patternPlan.primary)[number]) || patternPlan.secondary.includes(key as (typeof patternPlan.secondary)[number]))) {
    score = penalty(score, 12, reasons, "L7 candidate lacks primary or secondary reference pattern");
  }
  if (lockupRatio < min) {
    score = penalty(score, 22, reasons, `L7 lockup ratio below minimum: ${round(lockupRatio)}<${min}`);
  } else if (Math.abs(lockupRatio - target) > 0.08) {
    score = penalty(score, 8, reasons, `L7 lockup ratio far from target: ${round(lockupRatio)} vs ${target}`);
  }
  if (plan.hierarchyPlan.subtitlePriority === "strong" && blueprint.subtitleLockup.text && blueprint.subtitleLockup.placementPolicy === "hidden") {
    score = penalty(score, 10, reasons, "L7 strong subtitle priority hidden by candidate");
  }
  if (plan.fontShapePlan.key === "cleanSystem" && plan.sceneStyleProfile.sceneKey !== "cleanNotice") {
    score = penalty(score, 10, reasons, "L7 non-notice scene fell back to cleanSystem font shape");
  }

  return clamp(score);
}

function maxSimilarity(blueprint: TitleLockupBlueprint, all: readonly TitleLockupBlueprint[], signature = createArrangementSignature(blueprint)): SimilarityMatch {
  return all.filter((item) => item.candidateId !== blueprint.candidateId).reduce<SimilarityMatch>((best, item) => {
    const score = similarity(blueprint, item, signature, createArrangementSignature(item));

    return score > best.score ? { candidateId: item.candidateId, score } : best;
  }, { candidateId: null, score: 0 });
}

function similarity(left: TitleLockupBlueprint, right: TitleLockupBlueprint, leftSignature = createArrangementSignature(left), rightSignature = createArrangementSignature(right)): number {
  let score = 0;
  if (getDiversityGroupKey(leftSignature) === getDiversityGroupKey(rightSignature)) score += 0.42;
  if (leftSignature.structuralFamily === rightSignature.structuralFamily) score += 0.14;
  if (leftSignature.semanticSplitId === rightSignature.semanticSplitId) score += 0.1;
  if (leftSignature.compositionMode === rightSignature.compositionMode) score += 0.08;
  if (leftSignature.flowAxis === rightSignature.flowAxis) score += 0.05;
  if (leftSignature.unitCount === rightSignature.unitCount) score += 0.06;
  if (leftSignature.ySpanBucket === rightSignature.ySpanBucket) score += 0.05;
  if (leftSignature.xOffsetPattern === rightSignature.xOffsetPattern) score += 0.04;
  if (leftSignature.heroPosition === rightSignature.heroPosition) score += 0.04;
  if (leftSignature.subtitleVisibility === rightSignature.subtitleVisibility) score += 0.02;
  if (leftSignature.patternKeyGroup === rightSignature.patternKeyGroup) score += 0.03;
  if (Math.abs(aspect(left.lockupBox) - aspect(right.lockupBox)) < 0.15) score += 0.04;
  if (distance(left.lockupBox, right.lockupBox) < 70) score += 0.04;
  return Math.min(1, score);
}

function createArrangementSignature(blueprint: TitleLockupBlueprint): ArrangementSignature {
  const unitCount = blueprint.titleUnits.length;
  const ySpanBucket = getYSpanBucket(blueprint);
  const xOffsetPattern = getXOffsetPattern(blueprint);
  const heroPosition = getHeroPosition(blueprint);
  const subtitleVisibility = !blueprint.subtitleLockup.subtitleBox || blueprint.subtitleLockup.placementPolicy === "hidden" ? "hidden" : "visible";

  return {
    semanticSplitId: blueprint.semanticSplitId,
    compositionMode: blueprint.compositionMode,
    flowAxis: blueprint.flowAxis,
    unitCount,
    ySpanBucket,
    xOffsetPattern,
    heroPosition,
    subtitlePlacement: blueprint.subtitleLockup.placementPolicy,
    subtitleVisibility,
    patternKeyGroup: getPatternKeyGroup(blueprint.patternKeys),
    structuralFamily: getStructuralFamily(blueprint, unitCount, xOffsetPattern),
  };
}

function getDiversityGroupKey(signature: ArrangementSignature): string {
  return [
    signature.semanticSplitId,
    signature.unitCount,
    signature.ySpanBucket,
    signature.heroPosition,
    signature.subtitleVisibility,
  ].join(":");
}

function getYSpanBucket(blueprint: TitleLockupBlueprint): YSpanBucket {
  const ratio = ySpan(blueprint) / Math.max(1, blueprint.lockupBox.height);
  if (ratio < 0.12) return "flat";
  if (ratio < 0.28) return "compact";
  if (ratio < 0.52) return "medium";
  return "tall";
}

function getXOffsetPattern(blueprint: TitleLockupBlueprint): XOffsetPattern {
  const units = orderedUnits(blueprint);
  if (units.length === 0) return "unknown";
  if (units.length === 1) return "single";

  const centerX = blueprint.lockupBox.x + blueprint.lockupBox.width / 2;
  const offsets = units.map((unit) => (unit.unitBox.x + unit.unitBox.width / 2 - centerX) / Math.max(1, blueprint.lockupBox.width));
  const maxAbsOffset = Math.max(...offsets.map((offset) => Math.abs(offset)));
  if (maxAbsOffset < 0.045) return "centered";

  const first = offsets[0]; const second = offsets[1]; const last = offsets[offsets.length - 1];
  if (first < -0.035 && second > 0.035) return "leftRightStagger";
  if (first > 0.035 && second < -0.035) return "rightLeftStagger";
  if (first < -0.035 && last > 0.035) return "diagonalDown";
  if (first > 0.035 && last < -0.035) return "diagonalUp";
  return "unknown";
}

function getHeroPosition(blueprint: TitleLockupBlueprint): HeroPosition {
  if (blueprint.titleUnits.length === 1) return "single";
  const hero = blueprint.titleUnits
    .filter((unit) => unit.visualRole === "hero")
    .sort((left, right) => right.visualWeight - left.visualWeight)[0];
  if (!hero) return "unknown";

  const ratio = (hero.unitBox.y + hero.unitBox.height / 2 - blueprint.lockupBox.y) / Math.max(1, blueprint.lockupBox.height);
  if (ratio < 0.35) return "top";
  if (ratio > 0.65) return "bottom";
  return "middle";
}

function getPatternKeyGroup(patternKeys: readonly string[]): string {
  const groups = Array.from(new Set(patternKeys.map((key) => {
    if (key.startsWith("stage")) return "stage";
    if (key.startsWith("business")) return "business";
    if (key.startsWith("modernChinese")) return "chinese";
    if (key.startsWith("campaign")) return "campaign";
    if (key.startsWith("literary")) return "literary";
    if (key.startsWith("ip")) return "ip";
    if (key.startsWith("clean")) return "clean";
    return "unknown";
  }))).sort();

  return groups.join("+") || "none";
}

function getStructuralFamily(blueprint: TitleLockupBlueprint, unitCount: number, xOffsetPattern: XOffsetPattern): StructuralFamily {
  if (unitCount === 1 || blueprint.semanticSplitId === "fullHero") return "fullHeroSingle";
  if (blueprint.compositionMode === "staggeredColumn" || (unitCount >= 3 && xOffsetPattern !== "centered")) return "threeStepVerticalStagger";
  if (blueprint.compositionMode === "verticalHeroStack") return "verticalHeroStack";
  if (blueprint.compositionMode === "centerStageLockup" && unitCount === 2) return "centerStageDouble";
  if (blueprint.compositionMode === "badgeHeroLockup" && unitCount === 2) return "badgeHeroDouble";
  if (unitCount === 2 && blueprint.semanticSplitId.toLowerCase().includes("hero")) return "leadHeroDoubleHorizontal";
  return "other";
}

function usesVerticalOrganization(blueprint: TitleLockupBlueprint): boolean {
  if (blueprint.flowAxis === "vertical" || blueprint.compositionMode === "verticalHeroStack" || blueprint.compositionMode === "staggeredColumn") return true;
  if (blueprint.titleUnits.some((unit) => unit.direction === "vertical")) return true;
  if (blueprint.titleUnits.length < 2) return false;

  const span = ySpan(blueprint);
  const spanThreshold = Math.max(40, Math.min(120, blueprint.lockupBox.height * 0.22));
  if (
    blueprint.orientationPreference === "verticalFirst" &&
    (blueprint.compositionMode === "centerStageLockup" || blueprint.compositionMode === "badgeHeroLockup") &&
    span >= spanThreshold
  ) {
    return true;
  }

  return aspect(blueprint.lockupBox) > 1.15 && span >= spanThreshold || span >= 80;
}

function overlapsAny(box: TitleBox, zones: readonly ForbiddenZone[]): boolean {
  return zones.some((zone) => overlapRatio(box, zone) > 0.02);
}

function forbiddenPenalty(zone: ForbiddenZone): number {
  if (zone.reasonType === "logo" || zone.reasonType === "subject") return 45;
  if (zone.reasonType === "mascot" || zone.reasonType === "textConflict") return 38;
  if (zone.reasonType === "highDetail") return 26;
  return 14;
}

function inside(inner: TitleBox, outer: TitleBox): boolean {
  return inner.x >= outer.x && inner.y >= outer.y && inner.x + inner.width <= outer.x + outer.width &&
    inner.y + inner.height <= outer.y + outer.height;
}

function overlapRatio(left: TitleBox, right: TitleBox): number {
  const width = Math.max(0, Math.min(left.x + left.width, right.x + right.width) - Math.max(left.x, right.x));
  const height = Math.max(0, Math.min(left.y + left.height, right.y + right.height) - Math.max(left.y, right.y));
  return width * height / Math.max(1, Math.min(area(left), area(right)));
}

function area(box: TitleBox): number { return Math.max(0, box.width) * Math.max(0, box.height); }
function sumArea(boxes: readonly TitleBox[]): number { return boxes.reduce((sum, box) => sum + area(box), 0); }
function center(box: TitleBox): { x: number; y: number } { return { x: box.x + box.width / 2, y: box.y + box.height / 2 }; }
function diagonal(box: TitleBox): number { return Math.sqrt(box.width ** 2 + box.height ** 2); }
function aspect(box: TitleBox): number { return box.height / Math.max(1, box.width); }
function distance(left: TitleBox, right: TitleBox): number {
  const leftCenter = center(left); const rightCenter = center(right);
  return Math.sqrt((leftCenter.x - rightCenter.x) ** 2 + (leftCenter.y - rightCenter.y) ** 2);
}
function orderedUnits(blueprint: TitleLockupBlueprint): TitleLockupBlueprint["titleUnits"] {
  return blueprint.titleUnits.slice().sort((left, right) => left.readingOrder - right.readingOrder);
}
function ySpan(blueprint: TitleLockupBlueprint): number {
  if (blueprint.titleUnits.length < 2) return 0;
  const centers = orderedUnits(blueprint).map((unit) => unit.unitBox.y + unit.unitBox.height / 2);
  return Math.max(...centers) - Math.min(...centers);
}
function penalty(score: number, amount: number, reasons: string[], reason: string): number { reasons.push(reason); return score - amount; }
function clamp(value: number): number { return Math.max(0, Math.min(100, Math.round(value))); }
function round(value: number): number { return Math.round(value * 1000) / 1000; }
