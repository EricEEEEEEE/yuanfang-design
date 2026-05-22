import type { TitleLockupBlueprint } from "@/config/title-lockup-blueprint";
import { DEFAULT_TITLE_FONT_FALLBACK, TITLE_FONT_REGISTRY } from "@/config/title-font-registry";
import type { StandardGenerationInput, StandardGenerationMeasuredCandidateAttempt } from "@/models/standard-generation";
import type { TitleAssetHandoffResult } from "@/models/title-asset";
import type { ForbiddenZone } from "@/services/background-layout-intelligence.service";
import { handoffRetryRejection, reviewStandardGenerationCandidateLineage } from "@/services/helpers/standard-generation-title-lineage";
import { scaleTitleLockupBlueprintToCanvas, STANDARD_TITLE_FROM_CANVAS } from "@/services/helpers/standard-generation-title-scale";
import { titleFontRegistryForDesignPlan } from "@/services/title-design-plan.service";
import type { GenerateScoredRefinedTitleCandidatesResult } from "@/use-cases/generate-scored-refined-title-candidates.use-case";
import { renderMeasuredTitleAsset } from "@/use-cases/render-measured-title-asset.use-case";

export type StandardTitleHandoffAttemptResult = {
  blueprint: TitleLockupBlueprint;
  handoff: TitleAssetHandoffResult;
  selectedByMeasuredRetry: boolean;
};

export function standardCandidateIds(input: StandardGenerationInput, pipeline?: GenerateScoredRefinedTitleCandidatesResult): string[] {
  if (!pipeline) return input.options?.manualCandidateId ? [input.options.manualCandidateId] : [];
  return input.options?.titleCandidateStrategy === "manualCandidateId"
    ? [input.options.manualCandidateId ?? ""].filter(Boolean)
    : pipeline.recommendedCandidateIds;
}

export function standardCandidateRetryIds(input: StandardGenerationInput, pipeline: GenerateScoredRefinedTitleCandidatesResult, primaryIds: string[]): string[] {
  if (input.options?.titleCandidateStrategy === "manualCandidateId") return primaryIds;
  const seen = new Set<string>();
  return [...primaryIds, ...pipeline.finalCandidatePool.map((item) => item.candidateId)].filter((id) => {
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

export async function firstSuccessfulStandardTitleHandoff(input: StandardGenerationInput, pipeline: GenerateScoredRefinedTitleCandidatesResult, ids: string[], primaryIds: string[], zones: ForbiddenZone[], attempts: StandardGenerationMeasuredCandidateAttempt[], failures: string[]): Promise<StandardTitleHandoffAttemptResult | undefined> {
  const byId = new Map(pipeline.finalCandidatePool.map((item) => [item.candidateId, item]));
  const primary = new Set(primaryIds);
  for (const id of ids) {
    const source = byId.get(id);
    const lineage = reviewStandardGenerationCandidateLineage(id, pipeline);
    const rejection = handoffRetryRejection(lineage);
    if (!source || rejection) {
      attempts.push(measuredAttempt(pipeline, id, false, false, rejection ?? "candidate_not_in_final_pool", !primary.has(id)));
      continue;
    }
    const blueprint = scaleTitleLockupBlueprintToCanvas(source, STANDARD_TITLE_FROM_CANVAS, input.canvas);
    const handoff = await renderMeasuredTitleAsset({
      source: "pipelineFinalPool",
      blueprint,
      canvas: input.canvas,
      titleStylePreset: pipeline.candidateResult.titleDesignPlan?.rendererStylePlan.titleStylePreset ?? "achievement",
      brandStyle: "yuanfangDefault",
      fontRegistry: pipeline.candidateResult.titleDesignPlan
        ? titleFontRegistryForDesignPlan(pipeline.candidateResult.titleDesignPlan, TITLE_FONT_REGISTRY)
        : TITLE_FONT_REGISTRY,
      fontFallback: DEFAULT_TITLE_FONT_FALLBACK,
      safetyContext: { forbiddenZones: zones },
    });
    const visualScale = titleVisualScale(handoff);
    if (handoff.titleAsset?.rasterLayer && handoff.safety?.passed) {
      attempts.push(measuredAttempt(pipeline, id, true, true, undefined, !primary.has(id), visualScale));
      return { blueprint, handoff, selectedByMeasuredRetry: !primary.has(id) };
    }
    attempts.push(measuredAttempt(pipeline, id, true, false, handoff.reason, !primary.has(id), visualScale));
    failures.push(`${id}: ${handoff.reason}`);
  }
  return undefined;
}

function measuredAttempt(pipeline: GenerateScoredRefinedTitleCandidatesResult, id: string, retryEligible: boolean, measuredPass: boolean, failReason?: string, selectedByMeasuredRetry?: boolean, visualScale: ReturnType<typeof titleVisualScale> = {}): StandardGenerationMeasuredCandidateAttempt {
  return {
    attemptedCandidateId: id,
    baseCandidateId: pipeline.diagnostics.sourceCandidateIdMap[id] ?? id,
    retryEligible,
    measuredPass,
    ...(visualScale.measuredTitleAssetRatio !== undefined ? { measuredTitleAssetRatio: visualScale.measuredTitleAssetRatio } : {}),
    ...(visualScale.measuredFinalTitleRatio !== undefined ? { measuredFinalTitleRatio: visualScale.measuredFinalTitleRatio } : {}),
    ...(visualScale.glyphOccupancyInsideUnitBox !== undefined ? { glyphOccupancyInsideUnitBox: visualScale.glyphOccupancyInsideUnitBox } : {}),
    ...(visualScale.glyphOccupancyInsideLockup !== undefined ? { glyphOccupancyInsideLockup: visualScale.glyphOccupancyInsideLockup } : {}),
    ...(visualScale.renderScaleAdjustmentApplied !== undefined ? { renderScaleAdjustmentApplied: visualScale.renderScaleAdjustmentApplied } : {}),
    ...(visualScale.renderSizingBlockedReason ? { renderSizingBlockedReason: visualScale.renderSizingBlockedReason } : {}),
    ...(visualScale.titleStylePreset ? { titleStylePreset: visualScale.titleStylePreset } : {}),
    ...(visualScale.contrastTreatmentApplied !== undefined ? { contrastTreatmentApplied: visualScale.contrastTreatmentApplied } : {}),
    ...(visualScale.hierarchyTreatmentApplied !== undefined ? { hierarchyTreatmentApplied: visualScale.hierarchyTreatmentApplied } : {}),
    ...(visualScale.titleStyleAttempted !== undefined ? { titleStyleAttempted: visualScale.titleStyleAttempted } : {}),
    ...(visualScale.titleStyleApplied !== undefined ? { titleStyleApplied: visualScale.titleStyleApplied } : {}),
    ...(visualScale.titleStyleFallbackUsed !== undefined ? { titleStyleFallbackUsed: visualScale.titleStyleFallbackUsed } : {}),
    ...(visualScale.titleStyleFallbackReason ? { titleStyleFallbackReason: visualScale.titleStyleFallbackReason } : {}),
    ...(visualScale.styledMeasuredTitleAssetRatio !== undefined ? { styledMeasuredTitleAssetRatio: visualScale.styledMeasuredTitleAssetRatio } : {}),
    ...(visualScale.baselineMeasuredTitleAssetRatio !== undefined ? { baselineMeasuredTitleAssetRatio: visualScale.baselineMeasuredTitleAssetRatio } : {}),
    ...(visualScale.styleMeasuredDelta !== undefined ? { styleMeasuredDelta: visualScale.styleMeasuredDelta } : {}),
    ...(visualScale.selectedRenderVariant ? { selectedRenderVariant: visualScale.selectedRenderVariant } : {}),
    ...(failReason ? { failReason } : {}),
    ...(selectedByMeasuredRetry ? { selectedByMeasuredRetry: true } : {}),
  };
}

function titleVisualScale(handoff: TitleAssetHandoffResult): Partial<StandardGenerationMeasuredCandidateAttempt> {
  return (handoff.titleAsset?.diagnostics.titleVisualScale ?? handoff.diagnostics.titleVisualScale ?? {}) as Partial<StandardGenerationMeasuredCandidateAttempt>;
}
