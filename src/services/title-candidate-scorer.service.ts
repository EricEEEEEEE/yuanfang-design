import type { TitleBox, TitleLockupBlueprint } from "@/config/title-lockup-blueprint";
import type { ForbiddenZone } from "@/services/background-layout-intelligence.service";
import type { SpatialStrategy } from "@/services/spatial-strategy-planner.service";

export type ScoreTitleCandidatesInput = { lockupBlueprints: TitleLockupBlueprint[]; spatialStrategy: SpatialStrategy };
export type TitleCandidateScoreBreakdown = {
  spatialFitScore: number; lockupIntegrityScore: number; hierarchyScore: number; readabilityScore: number;
  subtitleSafetyScore: number; forbiddenZoneAvoidanceScore: number; candidateDiversityScore: number;
  repetitionPenalty: number; fallbackPenalty: number; totalScore: number; reasons: string[]; warnings: string[];
};
export type TitleCandidateScoringResult = {
  candidateId: string; rank: number; score: TitleCandidateScoreBreakdown; shouldEnterRefiner: boolean; shouldReject: boolean;
};
export type ScoreTitleCandidatesResult = {
  source: "rule-based-v1"; results: TitleCandidateScoringResult[]; bestCandidateId: string | null; needsRefinement: boolean; reason: string;
};

type ScoreParts = Omit<TitleCandidateScoreBreakdown, "totalScore" | "reasons" | "warnings">;

export function scoreTitleCandidates(input: ScoreTitleCandidatesInput): ScoreTitleCandidatesResult {
  const results = input.lockupBlueprints
    .map((blueprint) => scoreBlueprint(blueprint, input.lockupBlueprints, input.spatialStrategy))
    .sort(compareScoringResults)
    .map((result, index) => ({
      ...result,
      rank: index + 1,
      shouldEnterRefiner: !result.shouldReject && index < 3 && result.score.totalScore >= 60,
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

function scoreBlueprint(blueprint: TitleLockupBlueprint, all: readonly TitleLockupBlueprint[], strategy: SpatialStrategy): TitleCandidateScoringResult {
  const reasons: string[] = []; const warnings: string[] = [];
  const parts: ScoreParts = {
    spatialFitScore: spatialFit(blueprint, strategy, reasons),
    lockupIntegrityScore: lockupIntegrity(blueprint, reasons, warnings),
    hierarchyScore: hierarchy(blueprint, reasons, warnings),
    readabilityScore: readability(blueprint, reasons),
    subtitleSafetyScore: subtitleSafety(blueprint, strategy, reasons, warnings),
    forbiddenZoneAvoidanceScore: forbiddenAvoidance(blueprint, strategy, reasons),
    candidateDiversityScore: diversity(blueprint, all, warnings),
    repetitionPenalty: Math.round(maxSimilarity(blueprint, all) * 30),
    fallbackPenalty: blueprint.isFallbackCandidate ? 100 : 0,
  };
  const totalScore = clamp(
    parts.spatialFitScore * 0.2 + parts.lockupIntegrityScore * 0.16 + parts.hierarchyScore * 0.15 +
    parts.readabilityScore * 0.14 + parts.subtitleSafetyScore * 0.1 + parts.forbiddenZoneAvoidanceScore * 0.13 +
    parts.candidateDiversityScore * 0.12 - parts.repetitionPenalty - parts.fallbackPenalty,
  );
  const shouldReject = blueprint.isFallbackCandidate || parts.spatialFitScore < 55 ||
    parts.lockupIntegrityScore < 60 || parts.readabilityScore < 50 || parts.forbiddenZoneAvoidanceScore < 70;

  if (blueprint.isFallbackCandidate) warnings.push("fallback candidate is diagnostic only and cannot be selected as final output.");
  return { candidateId: blueprint.candidateId, rank: 0, shouldEnterRefiner: false, shouldReject, score: { ...parts, totalScore, reasons, warnings } };
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

function diversity(blueprint: TitleLockupBlueprint, all: readonly TitleLockupBlueprint[], warnings: string[]): number {
  const value = clamp(100 - maxSimilarity(blueprint, all) * 75);
  if (value < 60) warnings.push("candidate is structurally similar to another candidate.");
  return value;
}

function maxSimilarity(blueprint: TitleLockupBlueprint, all: readonly TitleLockupBlueprint[]): number {
  return Math.max(0, ...all.filter((item) => item.candidateId !== blueprint.candidateId).map((item) => similarity(blueprint, item)));
}

function similarity(left: TitleLockupBlueprint, right: TitleLockupBlueprint): number {
  let score = 0;
  if (left.compositionMode === right.compositionMode) score += 0.25;
  if (left.semanticSplitId === right.semanticSplitId) score += 0.2;
  if (left.flowAxis === right.flowAxis) score += 0.1;
  if (left.titleUnits.length === right.titleUnits.length) score += 0.1;
  if (Math.abs(aspect(left.lockupBox) - aspect(right.lockupBox)) < 0.15) score += 0.12;
  if (Math.abs(ySpan(left) - ySpan(right)) < 45) score += 0.13;
  if (distance(left.lockupBox, right.lockupBox) < 70) score += 0.1;
  return Math.min(1, score);
}

function usesVerticalOrganization(blueprint: TitleLockupBlueprint): boolean {
  return blueprint.flowAxis === "vertical" || blueprint.titleUnits.some((unit) => unit.direction === "vertical") ||
    ySpan(blueprint) >= Math.max(60, blueprint.lockupBox.height * 0.22);
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
function ySpan(blueprint: TitleLockupBlueprint): number {
  if (blueprint.titleUnits.length < 2) return 0;
  const centers = blueprint.titleUnits.map((unit) => unit.unitBox.y + unit.unitBox.height / 2);
  return Math.max(...centers) - Math.min(...centers);
}
function penalty(score: number, amount: number, reasons: string[], reason: string): number { reasons.push(reason); return score - amount; }
function clamp(value: number): number { return Math.max(0, Math.min(100, Math.round(value))); }
