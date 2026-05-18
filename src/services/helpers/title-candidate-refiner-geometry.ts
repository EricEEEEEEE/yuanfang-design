import type { TitleBox, TitleLockupBlueprint, TitleLockupUnit, TitleUnitBox } from "@/config/title-lockup-blueprint";
import type { SpatialStrategy } from "@/services/spatial-strategy-planner.service";

export function validateRefinedBlueprint(blueprint: TitleLockupBlueprint, strategy: SpatialStrategy, minGap: number): { passed: boolean; reasons: string[] } {
  const reasons: string[] = [];
  const title = orderedUnits(blueprint).map((unit) => unit.text).join("");
  if (blueprint.isFallbackCandidate) reasons.push("fallback candidate cannot be refined.");
  if (title !== blueprint.mainTitle) reasons.push("titleUnits readingOrder does not join mainTitle.");
  if (blueprint.spatialContract.lockupBox !== blueprint.lockupBox && !sameBox(blueprint.spatialContract.lockupBox, blueprint.lockupBox)) reasons.push("spatialContract.lockupBox does not match root lockupBox.");
  if (!inside(blueprint.lockupBox, getAnchorBox(blueprint, strategy), blueprint.lockupBox.allowedOverflowPx)) reasons.push("lockupBox outside anchorBox.");
  for (const unit of blueprint.titleUnits) if (!inside(unit.unitBox, blueprint.lockupBox, blueprint.lockupBox.allowedOverflowPx)) reasons.push(`unitBox outside lockupBox: ${unit.text}`);
  for (let i = 0; i < blueprint.titleUnits.length; i += 1) for (let j = i + 1; j < blueprint.titleUnits.length; j += 1) if (overlapRatio(blueprint.titleUnits[i].unitBox, blueprint.titleUnits[j].unitBox) > 0.05) reasons.push("titleUnits overlap.");
  const subtitleBox = blueprint.subtitleLockup.subtitleBox;
  if (subtitleBox && !subtitleSafe(subtitleBox, blueprint, strategy, minGap)) reasons.push("subtitleBox is unsafe.");
  const boxes = [blueprint.lockupBox, ...blueprint.titleUnits.map((unit) => unit.unitBox), ...(subtitleBox ? [subtitleBox] : [])];
  for (const zone of strategy.backgroundLayout.forbiddenZones) if (boxes.some((item) => overlapRatio(item, zone) > 0.02)) reasons.push(`box overlaps forbiddenZone ${zone.id}.`);
  return { passed: reasons.length === 0, reasons };
}

export function subtitleSafe(subtitleBox: TitleUnitBox, blueprint: TitleLockupBlueprint, strategy: SpatialStrategy, minGap: number): boolean {
  if (blueprint.titleUnits.some((unit) => overlapRatio(subtitleBox, unit.unitBox) > 0.01)) return false;
  const minTop = Math.min(...blueprint.titleUnits.map((unit) => unit.unitBox.y));
  const maxBottom = Math.max(...blueprint.titleUnits.map((unit) => unit.unitBox.y + unit.unitBox.height));
  if (subtitleBox.y < maxBottom + minGap && subtitleBox.y + subtitleBox.height > minTop) return false;
  return !strategy.backgroundLayout.forbiddenZones.some((zone) => overlapRatio(subtitleBox, zone) > 0.02);
}

export function createBelowSubtitleBox(blueprint: TitleLockupBlueprint, strategy: SpatialStrategy, minHeight: number): TitleUnitBox {
  const anchor = getAnchorBox(blueprint, strategy);
  const width = Math.round(Math.min(blueprint.lockupBox.width * 0.76, anchor.width * 0.86, anchor.width - 2));
  const height = Math.round(Math.max(minHeight, Math.min(44, anchor.height * 0.12)));
  return { x: clamp(Math.round(blueprint.lockupBox.x + (blueprint.lockupBox.width - width) / 2), anchor.x, anchor.x + anchor.width - width), y: clamp(Math.round(blueprint.lockupBox.y + blueprint.lockupBox.height + 12), anchor.y, anchor.y + anchor.height - height), width, height, maxWidth: width, maxHeight: height, rotationDeg: 0 };
}

export function createSecondarySubtitleBox(strategy: SpatialStrategy, minHeight: number): TitleUnitBox | null {
  const anchorId = strategy.secondaryTextAnchorIds[0];
  const anchor = strategy.backgroundLayout.textAnchors.find((item) => item.id === anchorId);
  if (!anchor) return null;
  const width = Math.round(Math.min(anchor.width * 0.76, anchor.width - 2));
  const height = Math.round(Math.max(minHeight, Math.min(44, anchor.height * 0.28, anchor.height - 2)));
  return { x: clamp(Math.round(anchor.x + (anchor.width - width) / 2), anchor.x, anchor.x + anchor.width - width), y: clamp(Math.round(anchor.y + (anchor.height - height) / 2), anchor.y, anchor.y + anchor.height - height), width, height, maxWidth: width, maxHeight: height, rotationDeg: 0 };
}

export function cloneBlueprint(blueprint: TitleLockupBlueprint): TitleLockupBlueprint { return JSON.parse(JSON.stringify(blueprint)) as TitleLockupBlueprint; }
export function orderedUnits(blueprint: TitleLockupBlueprint): TitleLockupUnit[] { return blueprint.titleUnits.slice().sort((left, right) => left.readingOrder - right.readingOrder); }
export function unitBoxes(units: readonly TitleLockupUnit[]): TitleBox[] { return units.map((unit) => box(unit.unitBox)); }
export function box(value: TitleBox): TitleBox { return { x: value.x, y: value.y, width: value.width, height: value.height }; }
export function getAnchorBox(blueprint: TitleLockupBlueprint, strategy: SpatialStrategy): TitleBox { return strategy.backgroundLayout.textAnchors.find((anchor) => anchor.id === blueprint.spatialAnchorId) ?? blueprint.spatialContract.anchorBox; }
function inside(inner: TitleBox, outer: TitleBox, overflow = 0): boolean { return inner.x >= outer.x - overflow && inner.y >= outer.y - overflow && inner.x + inner.width <= outer.x + outer.width + overflow && inner.y + inner.height <= outer.y + outer.height + overflow; }
function overlapRatio(left: TitleBox, right: TitleBox): number { const width = Math.max(0, Math.min(left.x + left.width, right.x + right.width) - Math.max(left.x, right.x)); const height = Math.max(0, Math.min(left.y + left.height, right.y + right.height) - Math.max(left.y, right.y)); return width * height / Math.max(1, Math.min(left.width * left.height, right.width * right.height)); }
export function boxesChanged(left: readonly TitleBox[], right: readonly TitleBox[]): boolean { return left.length !== right.length || left.some((item, index) => changed(item, right[index])); }
export function changed(left: TitleBox | null, right: TitleBox | null): boolean { return !left || !right || !sameBox(left, right); }
function sameBox(left: TitleBox, right: TitleBox): boolean { return Math.round(left.x) === Math.round(right.x) && Math.round(left.y) === Math.round(right.y) && Math.round(left.width) === Math.round(right.width) && Math.round(left.height) === Math.round(right.height); }
export function clamp(value: number, min: number, max: number): number { return Math.round(Math.max(min, Math.min(max, value))); }
