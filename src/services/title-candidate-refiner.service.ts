import type { TitleLockupBlueprint } from "@/config/title-lockup-blueprint";
import {
  box,
  boxesChanged,
  changed,
  clamp,
  cloneBlueprint,
  createBelowSubtitleBox,
  createSecondarySubtitleBox,
  getAnchorBox,
  orderedUnits,
  subtitleSafe,
  unitBoxes,
  validateRefinedBlueprint,
} from "@/services/helpers/title-candidate-refiner-geometry";
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
  const selectedIds = new Set(selected.map((result) => result.candidateId));
  const refinedBlueprints: RefinedTitleLockupBlueprint[] = [];
  const rejectedRefinementCandidates: RejectedRefinementCandidate[] = [];
  const refinementActions: TitleRefinementActionRecord[] = [];
  const warnings: string[] = [];

  const refineOne = (result: TitleCandidateScoringResult, reasonPrefix = ""): void => {
    const source = byId.get(result.candidateId);
    const refinedCandidateId = `${result.candidateId}-r1`;
    const actions: TitleRefinementActionRecord[] = [];

    if (!source) {
      const reason = `${reasonPrefix}source blueprint missing.`;
      const action = rejectAction(result.candidateId, refinedCandidateId, reason);
      rejectedRefinementCandidates.push(rejectRecord(result.candidateId, refinedCandidateId, [action], [reason]));
      refinementActions.push(action);
      return;
    }
    if (source.isFallbackCandidate) {
      const reason = `${reasonPrefix}fallback candidate cannot enter refiner.`;
      const action = rejectAction(source.candidateId, refinedCandidateId, reason);
      rejectedRefinementCandidates.push(rejectRecord(source.candidateId, refinedCandidateId, [action], [reason]));
      refinementActions.push(action);
      return;
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
      const sourceSafety = validateRefinedBlueprint(source, input.spatialStrategy, minGap);
      if (sourceSafety.passed) {
        const preserve = action(
          "preserveAsIs",
          source.candidateId,
          refinedCandidateId,
          "candidate",
          null,
          null,
          `${reasonPrefix}refinement changes were unsafe (${safety.reasons.join("; ")}); original scorer-selected blueprint remains safe.`,
          "neutral",
        );
        refinedBlueprints.push({ sourceCandidateId: source.candidateId, refinedCandidateId, blueprint: cloneBlueprint(source), actions: [preserve], safety: sourceSafety });
        refinementActions.push(...actions, preserve);
        return;
      }
      const reject = rejectAction(source.candidateId, refinedCandidateId, `${reasonPrefix}${safety.reasons.join("; ")}`);
      actions.push(reject);
      rejectedRefinementCandidates.push(rejectRecord(source.candidateId, refinedCandidateId, actions, safety.reasons));
    }
    refinementActions.push(...actions);
  };

  for (const result of selected) refineOne(result);

  if (selected.length > 0 && refinedBlueprints.length === 0) {
    const replacements = input.scorerResults
      .filter((result) => result.recommendedAction === "keep" && !result.shouldReject && !selectedIds.has(result.candidateId))
      .sort((left, right) => left.finalRank - right.finalRank);
    for (const result of replacements) {
      const before = refinedBlueprints.length;
      refineOne(result, "replacement eligible candidate after scorer-selected refinements failed: ");
      if (refinedBlueprints.length > before) {
        warnings.push(`replacement refiner candidate used after unsafe primary refinements: ${result.candidateId}`);
        break;
      }
    }
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

function action(type: TitleRefinementActionType, sourceCandidateId: string, refinedCandidateId: string, target: string, before: unknown, after: unknown, reason: string, safetyImpact: TitleRefinementActionRecord["safetyImpact"]): TitleRefinementActionRecord {
  return { type, sourceCandidateId, refinedCandidateId, target, before, after, reason, safetyImpact };
}
function rejectAction(sourceCandidateId: string, refinedCandidateId: string, reason: string): TitleRefinementActionRecord { return action("rejectUnsafeRefinement", sourceCandidateId, refinedCandidateId, "candidate", null, null, reason, "rejects_unsafe"); }
function rejectRecord(sourceCandidateId: string, refinedCandidateId: string, actions: TitleRefinementActionRecord[], reasons: string[]): RejectedRefinementCandidate { return { sourceCandidateId, refinedCandidateId, reason: reasons.join("; "), actions, safety: { passed: false, reasons } }; }
