import type { TitleBox, TitleLockupBlueprint, TitleLockupBox, TitleUnitBox } from "@/config/title-lockup-blueprint";
import type { SpatialStrategy } from "@/services/spatial-strategy-planner.service";
import { box, getAnchorBox } from "@/services/helpers/title-candidate-refiner-geometry";

export const TARGET_LOCKUP_AREA_RATIO = 0.16;
export const MIN_ACCEPTABLE_LOCKUP_AREA_RATIO = 0.06;
export const TARGET_LOCKUP_WIDTH_RATIO = 0.52;
export const MIN_ACCEPTABLE_LOCKUP_WIDTH_RATIO = 0.2;
const CANVAS_AREA = 1000 * 1000;
export const FINAL_BELOW_MINIMUM_LOCKUP_REASON = "final_below_minimum_lockup_scale";

export type MinimumLockupScaleDiagnostics = {
  originalLockupAreaRatio: number;
  refinedLockupAreaRatio: number;
  targetLockupAreaRatio: number;
  minAcceptableLockupAreaRatio: number;
  minAcceptableLockupWidthRatio: number;
  scaleApplied: boolean;
  scaleFactorX: number;
  scaleFactorY: number;
  scaleBlockedReason?: string;
  scaleOutcome: "already_at_target" | "scaled_to_target" | "scaled_best_effort" | "scaled_to_minimum" | "blocked_by_anchor" | "blocked_by_forbidden_zone" | "blocked_by_subtitle" | "final_below_minimum";
  subtitlePreservedAfterScale: boolean;
  minimumScalePassed: boolean;
  titleScaleRecommendation: string;
};

type ScaledCandidate = { anchorBox: TitleBox; lockupBox: TitleLockupBox; unitBoxes: TitleUnitBox[]; bestEffort?: boolean };

export function enforceMinimumLockupScale(blueprint: TitleLockupBlueprint, strategy: SpatialStrategy): MinimumLockupScaleDiagnostics {
  const original = box(blueprint.lockupBox);
  const originalRatio = lockupAreaRatio(original);
  const subtitlePreserved = Boolean(blueprint.subtitleLockup.text && blueprint.subtitleLockup.subtitleBox);
  if (originalRatio >= TARGET_LOCKUP_AREA_RATIO) return diagnostics(originalRatio, originalRatio, false, 1, 1, undefined, "already_at_target", subtitlePreserved);

  const target = makeScaledCandidate(blueprint, strategy, TARGET_LOCKUP_AREA_RATIO, true);
  const targetWithoutSubtitleReserve = makeScaledCandidate(blueprint, strategy, TARGET_LOCKUP_AREA_RATIO, false);
  const bestEffort = makeBestEffortCandidate(blueprint, strategy);
  const minimum = originalRatio < MIN_ACCEPTABLE_LOCKUP_AREA_RATIO ? makeScaledCandidate(blueprint, strategy, MIN_ACCEPTABLE_LOCKUP_AREA_RATIO, true) : null;
  const minimumWithoutSubtitleReserve = originalRatio < MIN_ACCEPTABLE_LOCKUP_AREA_RATIO ? makeScaledCandidate(blueprint, strategy, MIN_ACCEPTABLE_LOCKUP_AREA_RATIO, false) : null;
  const candidates = [target, targetWithoutSubtitleReserve, bestEffort, minimum, minimumWithoutSubtitleReserve];
  const viable = candidates.find((candidate) => candidate && lockupVisualMinimumPassed(candidate.lockupBox) && !candidateBlockedReason(candidate, strategy)) ?? null;
  if (!viable) {
    const failed = candidates.find(Boolean);
    const reason = failed
      ? candidateBlockedReason(failed as ScaledCandidate, strategy)
      : blockedBySubtitleCapacity(blueprint, strategy) ? "blocked_by_subtitle" : "blocked_by_anchor";
    const outcome = reason ?? "blocked_by_anchor";
    return diagnostics(originalRatio, originalRatio, false, 1, 1, outcome, outcome, subtitlePreserved);
  }

  blueprint.lockupBox = viable.lockupBox;
  blueprint.spatialContract.lockupBox = { ...viable.lockupBox };
  blueprint.titleUnits = blueprint.titleUnits.map((unit, index) => ({ ...unit, unitBox: viable.unitBoxes[index] }));
  const outcome = lockupAreaRatio(viable.lockupBox) >= TARGET_LOCKUP_AREA_RATIO ? "scaled_to_target" : viable.bestEffort ? "scaled_best_effort" : "scaled_to_minimum";
  return diagnostics(originalRatio, lockupAreaRatio(viable.lockupBox), true, viable.lockupBox.width / original.width, viable.lockupBox.height / original.height, undefined, outcome, subtitlePreserved);
}

export function withMinimumLockupScaleSafety<T extends { passed: boolean; reasons: string[] }>(blueprint: TitleLockupBlueprint, safety: T): T {
  if (minimumLockupScalePassed(blueprint)) return safety;
  const ratio = lockupAreaRatio(blueprint.lockupBox);
  const widthRatio = blueprint.lockupBox.width / 1000;
  const reasons = [...safety.reasons];
  if (ratio < MIN_ACCEPTABLE_LOCKUP_AREA_RATIO) reasons.push(`${FINAL_BELOW_MINIMUM_LOCKUP_REASON}:${round(ratio)}<${MIN_ACCEPTABLE_LOCKUP_AREA_RATIO}`);
  if (widthRatio < MIN_ACCEPTABLE_LOCKUP_WIDTH_RATIO) reasons.push(`final_below_minimum_lockup_width:${round(widthRatio)}<${MIN_ACCEPTABLE_LOCKUP_WIDTH_RATIO}`);
  return { ...safety, passed: false, reasons };
}

export function minimumLockupScalePassed(blueprint: TitleLockupBlueprint): boolean {
  return lockupVisualMinimumPassed(blueprint.lockupBox);
}

export function lockupAreaRatio(value: TitleBox): number {
  return value.width * value.height / CANVAS_AREA;
}

function makeScaledCandidate(blueprint: TitleLockupBlueprint, strategy: SpatialStrategy, ratio: number, reserveSubtitle: boolean): ScaledCandidate | null {
  const original = blueprint.lockupBox;
  if (original.width <= 0 || original.height <= 0) return null;
  const anchor = getAnchorBox(blueprint, strategy);
  const reserve = reserveSubtitle && blueprint.subtitleLockup.text ? Math.min(64, Math.round(anchor.height * 0.14)) : 0;
  const maxWidth = Math.max(1, anchor.width);
  const maxHeight = Math.max(1, anchor.height - reserve);
  if (maxWidth * maxHeight < ratio * CANVAS_AREA) return null;

  const factor = Math.sqrt((ratio * CANVAS_AREA) / Math.max(1, original.width * original.height));
  const targetWidth = ratio >= TARGET_LOCKUP_AREA_RATIO ? TARGET_LOCKUP_WIDTH_RATIO * 1000 : MIN_ACCEPTABLE_LOCKUP_WIDTH_RATIO * 1000;
  let width = Math.min(maxWidth, Math.max(original.width, original.width * factor, targetWidth));
  let height = Math.min(maxHeight, Math.max(original.height, original.height * factor));
  if (width * height < ratio * CANVAS_AREA) height = Math.min(maxHeight, Math.max(height, (ratio * CANVAS_AREA) / width));
  if (width * height < ratio * CANVAS_AREA) width = Math.min(maxWidth, Math.max(width, (ratio * CANVAS_AREA) / height));
  if (width * height < ratio * CANVAS_AREA) return null;

  const centerX = original.x + original.width / 2;
  const centerY = original.y + original.height / 2;
  const next: TitleLockupBox = {
    ...original,
    x: round(clamp(centerX - width / 2, anchor.x, anchor.x + anchor.width - width)),
    y: round(clamp(centerY - height / 2, anchor.y, anchor.y + maxHeight - height)),
    width: round(width),
    height: round(height),
    safePadding: round(original.safePadding * Math.min(width / original.width, height / original.height)),
  };
  return { anchorBox: anchor, lockupBox: next, unitBoxes: blueprint.titleUnits.map((unit) => scaleUnit(unit.unitBox, original, next)) };
}

function makeBestEffortCandidate(blueprint: TitleLockupBlueprint, strategy: SpatialStrategy): ScaledCandidate | null {
  const original = blueprint.lockupBox;
  if (original.width <= 0 || original.height <= 0) return null;
  const anchor = getAnchorBox(blueprint, strategy);
  if (anchor.width * anchor.height <= original.width * original.height) return null;
  const centerX = original.x + original.width / 2;
  const centerY = original.y + original.height / 2;
  const next: TitleLockupBox = {
    ...original,
    x: round(clamp(centerX - anchor.width / 2, anchor.x, anchor.x + anchor.width - anchor.width)),
    y: round(clamp(centerY - anchor.height / 2, anchor.y, anchor.y + anchor.height - anchor.height)),
    width: round(anchor.width),
    height: round(anchor.height),
    safePadding: round(original.safePadding * Math.min(anchor.width / original.width, anchor.height / original.height)),
  };
  return { anchorBox: anchor, lockupBox: next, unitBoxes: blueprint.titleUnits.map((unit) => scaleUnit(unit.unitBox, original, next)), bestEffort: true };
}

function scaleUnit(unit: TitleUnitBox, from: TitleBox, to: TitleBox): TitleUnitBox {
  const sx = to.width / from.width;
  const sy = to.height / from.height;
  return {
    ...unit,
    x: round(to.x + (unit.x - from.x) * sx),
    y: round(to.y + (unit.y - from.y) * sy),
    width: round(unit.width * sx),
    height: round(unit.height * sy),
    maxWidth: round(unit.maxWidth * sx),
    maxHeight: round(unit.maxHeight * sy),
  };
}

function candidateBlockedReason(candidate: ScaledCandidate, strategy: SpatialStrategy): MinimumLockupScaleDiagnostics["scaleOutcome"] | undefined {
  const boxes = [candidate.lockupBox, ...candidate.unitBoxes];
  if (!boxes.every((item) => inside(item, candidate.anchorBox)) || !candidate.unitBoxes.every((unit) => inside(unit, candidate.lockupBox))) return "blocked_by_anchor";
  if (strategy.backgroundLayout.forbiddenZones.some((zone) => boxes.some((item) => overlapRatio(item, zone) > 0.02))) return "blocked_by_forbidden_zone";
  return undefined;
}

function blockedBySubtitleCapacity(blueprint: TitleLockupBlueprint, strategy: SpatialStrategy): boolean {
  if (!blueprint.subtitleLockup.text) return false;
  const anchor = getAnchorBox(blueprint, strategy);
  const reserve = Math.min(64, Math.round(anchor.height * 0.14));
  return anchor.width * Math.max(1, anchor.height - reserve) < TARGET_LOCKUP_AREA_RATIO * CANVAS_AREA &&
    anchor.width * anchor.height >= TARGET_LOCKUP_AREA_RATIO * CANVAS_AREA;
}

function diagnostics(original: number, refined: number, scaleApplied: boolean, sx: number, sy: number, blocked: string | undefined, outcome: MinimumLockupScaleDiagnostics["scaleOutcome"], subtitlePreserved: boolean): MinimumLockupScaleDiagnostics {
  const minimumScalePassed = refined >= MIN_ACCEPTABLE_LOCKUP_AREA_RATIO;
  return {
    originalLockupAreaRatio: round(original),
    refinedLockupAreaRatio: round(refined),
    targetLockupAreaRatio: TARGET_LOCKUP_AREA_RATIO,
    minAcceptableLockupAreaRatio: MIN_ACCEPTABLE_LOCKUP_AREA_RATIO,
    minAcceptableLockupWidthRatio: MIN_ACCEPTABLE_LOCKUP_WIDTH_RATIO,
    scaleApplied,
    scaleFactorX: round(sx),
    scaleFactorY: round(sy),
    ...(blocked ? { scaleBlockedReason: blocked } : {}),
    scaleOutcome: outcome,
    subtitlePreservedAfterScale: subtitlePreserved,
    minimumScalePassed,
    titleScaleRecommendation: minimumScalePassed ? "minimumLockupScalePassed" : "inspectRefinerScaleSafetyOrScorerCandidateSelection",
  };
}

function lockupVisualMinimumPassed(value: TitleBox): boolean { return lockupAreaRatio(value) >= MIN_ACCEPTABLE_LOCKUP_AREA_RATIO && value.width / 1000 >= MIN_ACCEPTABLE_LOCKUP_WIDTH_RATIO; }
function inside(inner: TitleBox, outer: TitleBox): boolean { return inner.x >= outer.x && inner.y >= outer.y && inner.x + inner.width <= outer.x + outer.width && inner.y + inner.height <= outer.y + outer.height; }
function overlapRatio(left: TitleBox, right: TitleBox): number { const width = Math.max(0, Math.min(left.x + left.width, right.x + right.width) - Math.max(left.x, right.x)); const height = Math.max(0, Math.min(left.y + left.height, right.y + right.height) - Math.max(left.y, right.y)); return width * height / Math.max(1, Math.min(left.width * left.height, right.width * right.height)); }
function clamp(value: number, min: number, max: number): number { return Math.max(min, Math.min(max, value)); }
function round(value: number): number { return Math.round(value * 10000) / 10000; }
