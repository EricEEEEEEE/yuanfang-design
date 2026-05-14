import type { TitleBox, TitleLockupBlueprint, TitleLockupUnit, TitleUnitBox } from "@/config/title-lockup-blueprint";
import type { TitleCandidateScoringResult } from "@/services/title-candidate-scorer.service";
import type { SpatialStrategy } from "@/services/spatial-strategy-planner.service";

export type RefineTitleCandidatesInput = { lockupBlueprints: TitleLockupBlueprint[]; spatialStrategy: SpatialStrategy; scorerResults: TitleCandidateScoringResult[]; options?: { maxVariantsPerCandidate?: 1 | 2; minSubtitleHeightPx?: number; minUnitGapPx?: number } };

export type TitleRefinementActionType = "preserveAsIs" | "expandLockupBox" | "rebalanceUnitBoxes" | "increaseHeroUnitHeight" | "normalizeThreeStepSpacing" | "restoreSubtitleBelowLockup" | "shiftSubtitleToSecondaryAnchor" | "hideUnsafeSubtitle" | "rejectUnsafeRefinement";

export type TitleRefinementActionRecord = { type: TitleRefinementActionType; sourceCandidateId: string; refinedCandidateId?: string; target: string; before?: unknown; after?: unknown; reason: string; safetyImpact: "neutral" | "improves_safety" | "requires_validation" | "rejects_unsafe" };

export type RefinedTitleLockupBlueprint = { sourceCandidateId: string; refinedCandidateId: string; blueprint: TitleLockupBlueprint; actions: TitleRefinementActionRecord[]; safety: { passed: boolean; reasons: string[] } };

export type RejectedRefinementCandidate = { sourceCandidateId: string; refinedCandidateId?: string; reason: string; actions: TitleRefinementActionRecord[]; safety: { passed: boolean; reasons: string[] } };

export type RefineTitleCandidatesResult = { source: "rule-based-v1"; refinedBlueprints: RefinedTitleLockupBlueprint[]; rejectedRefinementCandidates: RejectedRefinementCandidate[]; refinementActions: TitleRefinementActionRecord[]; warnings: string[]; reason: string };

export function refineTitleCandidates(input: RefineTitleCandidatesInput): RefineTitleCandidatesResult {
  const minGap = input.options?.minUnitGapPx ?? 16;
  const minSubtitleHeight = input.options?.minSubtitleHeightPx ?? 32;
  const byId = new Map(input.lockupBlueprints.map((blueprint) => [blueprint.candidateId, blueprint]));
  const selected = input.scorerResults
    .filter((result) => result.recommendedAction === "refine" && !result.shouldReject)
    .sort((left, right) => (right.refinerPriority ?? 0) - (left.refinerPriority ?? 0));
  const refinedBlueprints: RefinedTitleLockupBlueprint[] = [];
  const rejectedRefinementCandidates: RejectedRefinementCandidate[] = [];
  const refinementActions: TitleRefinementActionRecord[] = [];
  const warnings: string[] = [];

  for (const result of selected) {
    const source = byId.get(result.candidateId);
    const refinedCandidateId = `${result.candidateId}-r1`;
    const actions: TitleRefinementActionRecord[] = [];

    if (!source) {
      const action = rejectAction(result.candidateId, refinedCandidateId, "source blueprint missing.");
      rejectedRefinementCandidates.push(rejectRecord(result.candidateId, refinedCandidateId, [action], ["source blueprint missing."]));
      refinementActions.push(action);
      continue;
    }
    if (source.isFallbackCandidate) {
      const action = rejectAction(source.candidateId, refinedCandidateId, "fallback candidate cannot enter refiner.");
      rejectedRefinementCandidates.push(rejectRecord(source.candidateId, refinedCandidateId, [action], ["fallback candidate cannot enter refiner."]));
      refinementActions.push(action);
      continue;
    }

    const blueprint = cloneBlueprint(source);
    maybeExpandLockupBox(blueprint, input.spatialStrategy, actions, refinedCandidateId);
    rebalanceUnits(blueprint, minGap, actions, refinedCandidateId);
    refineSubtitle(blueprint, input.spatialStrategy, minGap, minSubtitleHeight, actions, refinedCandidateId);
    if (actions.length === 0) actions.push(action("preserveAsIs", blueprint.candidateId, refinedCandidateId, "candidate", null, null, "blueprint already satisfies v1 refiner geometry gates.", "neutral"));

    const safety = validateRefinedBlueprint(blueprint, input.spatialStrategy, minGap);
    if (safety.passed) {
      refinedBlueprints.push({ sourceCandidateId: source.candidateId, refinedCandidateId, blueprint, actions, safety });
    } else {
      const reject = rejectAction(source.candidateId, refinedCandidateId, safety.reasons.join("; "));
      actions.push(reject);
      rejectedRefinementCandidates.push(rejectRecord(source.candidateId, refinedCandidateId, actions, safety.reasons));
    }
    refinementActions.push(...actions);
  }

  if (selected.length === 0) warnings.push("no scorer-selected non-rejected candidates entered refiner.");
  return {
    source: "rule-based-v1",
    refinedBlueprints,
    rejectedRefinementCandidates,
    refinementActions,
    warnings,
    reason: `Refined ${refinedBlueprints.length} of ${selected.length} scorer-selected candidates; rejected ${rejectedRefinementCandidates.length}.`,
  };
}

function maybeExpandLockupBox(blueprint: TitleLockupBlueprint, strategy: SpatialStrategy, actions: TitleRefinementActionRecord[], refinedCandidateId: string): void {
  const minUnitHeight = blueprint.titleUnits.length >= 3 ? 64 : 76;
  if (blueprint.titleUnits.every((unit) => unit.unitBox.height >= minUnitHeight)) return;
  const before = box(blueprint.lockupBox);
  const anchor = getAnchorBox(blueprint, strategy);
  const subtitleReserve = blueprint.subtitleLockup.text ? 56 : 0;
  const maxHeight = Math.max(24, anchor.y + anchor.height - blueprint.lockupBox.y - subtitleReserve);
  blueprint.lockupBox.height = Math.round(Math.min(maxHeight, Math.max(blueprint.lockupBox.height, blueprint.lockupBox.height * 1.1)));
  blueprint.spatialContract.lockupBox = { ...blueprint.lockupBox };
  if (changed(before, blueprint.lockupBox)) actions.push(action("expandLockupBox", blueprint.candidateId, refinedCandidateId, "lockupBox", before, box(blueprint.lockupBox), "expanded lockupBox to give short title units more vertical room.", "requires_validation"));
}

function rebalanceUnits(blueprint: TitleLockupBlueprint, minGap: number, actions: TitleRefinementActionRecord[], refinedCandidateId: string): void {
  if (blueprint.titleUnits.length < 2) return;
  const before = unitBoxes(blueprint.titleUnits);
  const ordered = orderedUnits(blueprint);
  const padding = Math.min(blueprint.lockupBox.safePadding, Math.round(blueprint.lockupBox.height * 0.12));
  const usableY = blueprint.lockupBox.y + padding;
  const usableHeight = blueprint.lockupBox.height - padding * 2;
  let heights = ordered.map((unit) => Math.max(unit.unitBox.height, unit.visualRole === "hero" ? 82 : 56));
  const rawTotal = heights.reduce((sum, height) => sum + height, 0) + minGap * (ordered.length - 1);
  if (rawTotal > usableHeight) {
    const scale = Math.max(0.65, (usableHeight - minGap * (ordered.length - 1)) / Math.max(1, rawTotal));
    heights = heights.map((height) => Math.max(42, Math.round(height * scale)));
  }
  const total = heights.reduce((sum, height) => sum + height, 0) + minGap * (ordered.length - 1);
  let y = Math.round(usableY + Math.max(0, (usableHeight - total) / 2));
  ordered.forEach((unit, index) => {
    const nextHeight = heights[index];
    const nextWidth = unit.visualRole === "hero" ? Math.min(blueprint.lockupBox.width - padding * 2, Math.round(unit.unitBox.width * 1.06)) : unit.unitBox.width;
    const centerX = unit.unitBox.x + unit.unitBox.width / 2;
    unit.unitBox = { ...unit.unitBox, x: clamp(Math.round(centerX - nextWidth / 2), blueprint.lockupBox.x, blueprint.lockupBox.x + blueprint.lockupBox.width - nextWidth), y, width: nextWidth, height: nextHeight, maxWidth: nextWidth, maxHeight: nextHeight };
    y += nextHeight + minGap;
  });
  if (!boxesChanged(before, unitBoxes(blueprint.titleUnits))) return;
  const type = blueprint.semanticSplitId === "threeStep" ? "normalizeThreeStepSpacing" : "rebalanceUnitBoxes";
  actions.push(action(type, blueprint.candidateId, refinedCandidateId, "titleUnits.unitBox", before, unitBoxes(blueprint.titleUnits), "rebalanced title unit boxes while preserving semantic split and reading order.", "requires_validation"));
  if (ordered.some((unit, index) => unit.visualRole === "hero" && heights[index] > before[index].height)) actions.push(action("increaseHeroUnitHeight", blueprint.candidateId, refinedCandidateId, "hero.unitBox", before, unitBoxes(blueprint.titleUnits), "hero unit height was strengthened without changing title text.", "requires_validation"));
}

function refineSubtitle(blueprint: TitleLockupBlueprint, strategy: SpatialStrategy, minGap: number, minHeight: number, actions: TitleRefinementActionRecord[], refinedCandidateId: string): void {
  if (!blueprint.subtitleLockup.text) return;
  const before = blueprint.subtitleLockup.subtitleBox ? box(blueprint.subtitleLockup.subtitleBox) : null;
  const below = createBelowSubtitleBox(blueprint, strategy, minHeight);
  if (subtitleSafe(below, blueprint, strategy, minGap)) {
    blueprint.subtitleLockup = { ...blueprint.subtitleLockup, placementPolicy: "belowMainLockup", subtitleBox: below };
    actions.push(action("restoreSubtitleBelowLockup", blueprint.candidateId, refinedCandidateId, "subtitleLockup.subtitleBox", before, box(below), "subtitle fits below the lockup without entering hero space.", "improves_safety"));
    return;
  }
  const secondary = createSecondarySubtitleBox(strategy, minHeight);
  if (secondary && subtitleSafe(secondary, blueprint, strategy, minGap)) {
    blueprint.subtitleLockup = { ...blueprint.subtitleLockup, placementPolicy: "secondaryAnchor", subtitleBox: secondary };
    actions.push(action("shiftSubtitleToSecondaryAnchor", blueprint.candidateId, refinedCandidateId, "subtitleLockup.subtitleBox", before, box(secondary), "subtitle moved to secondary anchor because below-lockup placement was unsafe.", "improves_safety"));
    return;
  }
  blueprint.subtitleLockup = { ...blueprint.subtitleLockup, placementPolicy: "hidden", subtitleBox: null };
  actions.push(action("hideUnsafeSubtitle", blueprint.candidateId, refinedCandidateId, "subtitleLockup", before, null, "subtitle remains hidden as safety fallback.", "improves_safety"));
}

function validateRefinedBlueprint(blueprint: TitleLockupBlueprint, strategy: SpatialStrategy, minGap: number): { passed: boolean; reasons: string[] } {
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

function subtitleSafe(subtitleBox: TitleUnitBox, blueprint: TitleLockupBlueprint, strategy: SpatialStrategy, minGap: number): boolean {
  if (blueprint.titleUnits.some((unit) => overlapRatio(subtitleBox, unit.unitBox) > 0.01)) return false;
  const minTop = Math.min(...blueprint.titleUnits.map((unit) => unit.unitBox.y));
  const maxBottom = Math.max(...blueprint.titleUnits.map((unit) => unit.unitBox.y + unit.unitBox.height));
  if (subtitleBox.y < maxBottom + minGap && subtitleBox.y + subtitleBox.height > minTop) return false;
  return !strategy.backgroundLayout.forbiddenZones.some((zone) => overlapRatio(subtitleBox, zone) > 0.02);
}

function createBelowSubtitleBox(blueprint: TitleLockupBlueprint, strategy: SpatialStrategy, minHeight: number): TitleUnitBox {
  const anchor = getAnchorBox(blueprint, strategy);
  const width = Math.round(Math.min(blueprint.lockupBox.width * 0.76, anchor.width * 0.86, anchor.width - 2));
  const height = Math.round(Math.max(minHeight, Math.min(44, anchor.height * 0.12)));
  return { x: clamp(Math.round(blueprint.lockupBox.x + (blueprint.lockupBox.width - width) / 2), anchor.x, anchor.x + anchor.width - width), y: clamp(Math.round(blueprint.lockupBox.y + blueprint.lockupBox.height + 12), anchor.y, anchor.y + anchor.height - height), width, height, maxWidth: width, maxHeight: height, rotationDeg: 0 };
}

function createSecondarySubtitleBox(strategy: SpatialStrategy, minHeight: number): TitleUnitBox | null {
  const anchorId = strategy.secondaryTextAnchorIds[0];
  const anchor = strategy.backgroundLayout.textAnchors.find((item) => item.id === anchorId);
  if (!anchor) return null;
  const width = Math.round(Math.min(anchor.width * 0.76, anchor.width - 2));
  const height = Math.round(Math.max(minHeight, Math.min(44, anchor.height * 0.28, anchor.height - 2)));
  return { x: clamp(Math.round(anchor.x + (anchor.width - width) / 2), anchor.x, anchor.x + anchor.width - width), y: clamp(Math.round(anchor.y + (anchor.height - height) / 2), anchor.y, anchor.y + anchor.height - height), width, height, maxWidth: width, maxHeight: height, rotationDeg: 0 };
}

function action(type: TitleRefinementActionType, sourceCandidateId: string, refinedCandidateId: string, target: string, before: unknown, after: unknown, reason: string, safetyImpact: TitleRefinementActionRecord["safetyImpact"]): TitleRefinementActionRecord {
  return { type, sourceCandidateId, refinedCandidateId, target, before, after, reason, safetyImpact };
}
function rejectAction(sourceCandidateId: string, refinedCandidateId: string, reason: string): TitleRefinementActionRecord { return action("rejectUnsafeRefinement", sourceCandidateId, refinedCandidateId, "candidate", null, null, reason, "rejects_unsafe"); }
function rejectRecord(sourceCandidateId: string, refinedCandidateId: string, actions: TitleRefinementActionRecord[], reasons: string[]): RejectedRefinementCandidate { return { sourceCandidateId, refinedCandidateId, reason: reasons.join("; "), actions, safety: { passed: false, reasons } }; }
function cloneBlueprint(blueprint: TitleLockupBlueprint): TitleLockupBlueprint { return JSON.parse(JSON.stringify(blueprint)) as TitleLockupBlueprint; }
function orderedUnits(blueprint: TitleLockupBlueprint): TitleLockupUnit[] { return blueprint.titleUnits.slice().sort((left, right) => left.readingOrder - right.readingOrder); }
function unitBoxes(units: readonly TitleLockupUnit[]): TitleBox[] { return units.map((unit) => box(unit.unitBox)); }
function box(value: TitleBox): TitleBox { return { x: value.x, y: value.y, width: value.width, height: value.height }; }
function getAnchorBox(blueprint: TitleLockupBlueprint, strategy: SpatialStrategy): TitleBox { return strategy.backgroundLayout.textAnchors.find((anchor) => anchor.id === blueprint.spatialAnchorId) ?? blueprint.spatialContract.anchorBox; }
function inside(inner: TitleBox, outer: TitleBox, overflow = 0): boolean { return inner.x >= outer.x - overflow && inner.y >= outer.y - overflow && inner.x + inner.width <= outer.x + outer.width + overflow && inner.y + inner.height <= outer.y + outer.height + overflow; }
function overlapRatio(left: TitleBox, right: TitleBox): number { const width = Math.max(0, Math.min(left.x + left.width, right.x + right.width) - Math.max(left.x, right.x)); const height = Math.max(0, Math.min(left.y + left.height, right.y + right.height) - Math.max(left.y, right.y)); return width * height / Math.max(1, Math.min(left.width * left.height, right.width * right.height)); }
function boxesChanged(left: readonly TitleBox[], right: readonly TitleBox[]): boolean { return left.length !== right.length || left.some((item, index) => changed(item, right[index])); }
function changed(left: TitleBox | null, right: TitleBox | null): boolean { return !left || !right || !sameBox(left, right); }
function sameBox(left: TitleBox, right: TitleBox): boolean { return Math.round(left.x) === Math.round(right.x) && Math.round(left.y) === Math.round(right.y) && Math.round(left.width) === Math.round(right.width) && Math.round(left.height) === Math.round(right.height); }
function clamp(value: number, min: number, max: number): number { return Math.round(Math.max(min, Math.min(max, value))); }
