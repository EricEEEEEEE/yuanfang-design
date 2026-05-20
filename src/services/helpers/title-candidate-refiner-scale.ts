import type { TitleBox, TitleLockupBlueprint, TitleLockupBox, TitleUnitBox } from "@/config/title-lockup-blueprint";
import type { SpatialStrategy } from "@/services/spatial-strategy-planner.service";
import { box, getAnchorBox } from "@/services/helpers/title-candidate-refiner-geometry";

export const TARGET_LOCKUP_AREA_RATIO = 0.08;
export const MIN_ACCEPTABLE_LOCKUP_AREA_RATIO = 0.06;
const CANVAS_AREA = 1000 * 1000;

export type MinimumLockupScaleDiagnostics = {
  originalLockupAreaRatio: number;
  refinedLockupAreaRatio: number;
  targetLockupAreaRatio: number;
  minAcceptableLockupAreaRatio: number;
  scaleApplied: boolean;
  scaleFactorX: number;
  scaleFactorY: number;
  scaleBlockedReason?: string;
  subtitlePreservedAfterScale: boolean;
  minimumScalePassed: boolean;
  titleScaleRecommendation: string;
};

type ScaledCandidate = { anchorBox: TitleBox; lockupBox: TitleLockupBox; unitBoxes: TitleUnitBox[] };

export function enforceMinimumLockupScale(blueprint: TitleLockupBlueprint, strategy: SpatialStrategy): MinimumLockupScaleDiagnostics {
  const original = box(blueprint.lockupBox);
  const originalRatio = areaRatio(original);
  const subtitlePreserved = Boolean(blueprint.subtitleLockup.text && blueprint.subtitleLockup.subtitleBox);
  if (originalRatio >= TARGET_LOCKUP_AREA_RATIO) return diagnostics(originalRatio, originalRatio, false, 1, 1, undefined, subtitlePreserved);

  const target = makeScaledCandidate(blueprint, strategy, TARGET_LOCKUP_AREA_RATIO);
  const minimum = originalRatio < MIN_ACCEPTABLE_LOCKUP_AREA_RATIO ? makeScaledCandidate(blueprint, strategy, MIN_ACCEPTABLE_LOCKUP_AREA_RATIO) : null;
  const viable = [target, minimum].find((candidate) => candidate && candidateSafe(candidate, strategy)) ?? null;
  if (!viable) {
    const reason = target || minimum ? "minimumLockupScaleBlockedBySafety" : "minimumLockupScaleBlockedByAnchorCapacity";
    return diagnostics(originalRatio, originalRatio, false, 1, 1, reason, subtitlePreserved);
  }

  blueprint.lockupBox = viable.lockupBox;
  blueprint.spatialContract.lockupBox = { ...viable.lockupBox };
  blueprint.titleUnits = blueprint.titleUnits.map((unit, index) => ({ ...unit, unitBox: viable.unitBoxes[index] }));
  return diagnostics(originalRatio, areaRatio(viable.lockupBox), true, viable.lockupBox.width / original.width, viable.lockupBox.height / original.height, undefined, subtitlePreserved);
}

function makeScaledCandidate(blueprint: TitleLockupBlueprint, strategy: SpatialStrategy, ratio: number): ScaledCandidate | null {
  const original = blueprint.lockupBox;
  if (original.width <= 0 || original.height <= 0) return null;
  const anchor = getAnchorBox(blueprint, strategy);
  const reserve = blueprint.subtitleLockup.text ? Math.min(64, Math.round(anchor.height * 0.14)) : 0;
  const maxWidth = Math.max(1, anchor.width);
  const maxHeight = Math.max(1, anchor.height - reserve);
  if (maxWidth * maxHeight < ratio * CANVAS_AREA) return null;

  const factor = Math.sqrt((ratio * CANVAS_AREA) / Math.max(1, original.width * original.height));
  let width = Math.min(maxWidth, Math.max(original.width, original.width * factor));
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

function candidateSafe(candidate: ScaledCandidate, strategy: SpatialStrategy): boolean {
  const boxes = [candidate.lockupBox, ...candidate.unitBoxes];
  return boxes.every((item) => inside(item, candidate.anchorBox)) &&
    candidate.unitBoxes.every((unit) => inside(unit, candidate.lockupBox)) &&
    !strategy.backgroundLayout.forbiddenZones.some((zone) => boxes.some((item) => overlapRatio(item, zone) > 0.02));
}

function diagnostics(original: number, refined: number, scaleApplied: boolean, sx: number, sy: number, blocked: string | undefined, subtitlePreserved: boolean): MinimumLockupScaleDiagnostics {
  const minimumScalePassed = refined >= MIN_ACCEPTABLE_LOCKUP_AREA_RATIO;
  return {
    originalLockupAreaRatio: round(original),
    refinedLockupAreaRatio: round(refined),
    targetLockupAreaRatio: TARGET_LOCKUP_AREA_RATIO,
    minAcceptableLockupAreaRatio: MIN_ACCEPTABLE_LOCKUP_AREA_RATIO,
    scaleApplied,
    scaleFactorX: round(sx),
    scaleFactorY: round(sy),
    ...(blocked ? { scaleBlockedReason: blocked } : {}),
    subtitlePreservedAfterScale: subtitlePreserved,
    minimumScalePassed,
    titleScaleRecommendation: minimumScalePassed ? "minimumLockupScalePassed" : "inspectRefinerScaleSafetyOrScorerCandidateSelection",
  };
}

function areaRatio(value: TitleBox): number { return value.width * value.height / CANVAS_AREA; }
function inside(inner: TitleBox, outer: TitleBox): boolean { return inner.x >= outer.x && inner.y >= outer.y && inner.x + inner.width <= outer.x + outer.width && inner.y + inner.height <= outer.y + outer.height; }
function overlapRatio(left: TitleBox, right: TitleBox): number { const width = Math.max(0, Math.min(left.x + left.width, right.x + right.width) - Math.max(left.x, right.x)); const height = Math.max(0, Math.min(left.y + left.height, right.y + right.height) - Math.max(left.y, right.y)); return width * height / Math.max(1, Math.min(left.width * left.height, right.width * right.height)); }
function clamp(value: number, min: number, max: number): number { return Math.max(min, Math.min(max, value)); }
function round(value: number): number { return Math.round(value * 10000) / 10000; }
