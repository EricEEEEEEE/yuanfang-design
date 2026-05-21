import type { TitleBox, TitleLockupBlueprint } from "@/config/title-lockup-blueprint";
import type { RasterMeasurementResult } from "@/models/title-raster-measurement";
import { MIN_ACCEPTABLE_LOCKUP_AREA_RATIO } from "@/services/helpers/title-candidate-refiner-scale";

export type TitleAssetVisualScaleMetrics = {
  blueprintLockupRatio: number;
  unitBoxAggregateRatio: number;
  unitBoxFillRatioInsideLockup: number;
  measuredTitleAssetRatio: number;
  measuredFinalTitleRatio: number;
  plannedUnitBoxAreaRatio: number;
  measuredGlyphBoxAreaRatio: number;
  glyphOccupancyInsideUnitBox: number;
  glyphOccupancyInsideLockup: number;
  renderScaleAdjustmentApplied: boolean;
  renderSizingBlockedReason?: string;
  transparentPaddingRatio: number;
  selectedScaledBlueprintUsed: boolean;
  measuredBelowMinimumReason?: string;
  titleStylePreset: string;
  contrastTreatmentApplied: boolean;
  hierarchyTreatmentApplied: boolean;
  mainTitleVisualWeight: number;
  subtitleVisualWeight: number;
  styleSafetyWarnings: string[];
  titleStyleAttempted?: boolean;
  titleStyleApplied?: boolean;
  titleStyleFallbackUsed?: boolean;
  titleStyleFallbackReason?: string;
  styledMeasuredTitleAssetRatio?: number;
  baselineMeasuredTitleAssetRatio?: number;
  styleMeasuredDelta?: number;
  selectedRenderVariant?: "styled" | "baseline" | "none";
};

export type TitleAssetVisualScaleResult = { passed: boolean; metrics: TitleAssetVisualScaleMetrics; reason: string };

export function evaluateTitleAssetVisualScale(blueprint: TitleLockupBlueprint, measurement: RasterMeasurementResult): TitleAssetVisualScaleResult {
  const canvasArea = Math.max(1, measurement.canvas.width * measurement.canvas.height);
  const blueprintLockupRatio = areaRatio(blueprint.lockupBox, canvasArea);
  const unitBoxAggregateRatio = round(blueprint.titleUnits.reduce((sum, unit) => sum + unit.unitBox.width * unit.unitBox.height, 0) / canvasArea);
  const measuredTitleAssetRatio = areaRatio(measurement.groupInkBox, canvasArea);
  const plannedUnitBoxAreaRatio = round(measurement.runMeasurements.reduce((sum, run) => sum + run.plannedBox.width * run.plannedBox.height, 0) / canvasArea);
  const measuredGlyphBoxAreaRatio = round(measurement.runMeasurements.reduce((sum, run) => sum + (run.measuredBox ? run.measuredBox.width * run.measuredBox.height : 0), 0) / canvasArea);
  const glyphOccupancyInsideUnitBox = round(measuredGlyphBoxAreaRatio / Math.max(plannedUnitBoxAreaRatio, 0.0001));
  const glyphOccupancyInsideLockup = round(measuredTitleAssetRatio / Math.max(blueprintLockupRatio, 0.0001));
  const renderScaleAdjustmentApplied = measurement.runMeasurements.some((run) => run.renderScaleAdjustmentApplied);
  const mainRuns = measurement.runMeasurements.filter((run) => run.role !== "subtitle");
  const subtitleRuns = measurement.runMeasurements.filter((run) => run.role === "subtitle");
  const contrastTreatmentApplied = mainRuns.some((run) => Boolean(run.contrastTreatmentApplied) && (run.strokeWidth ?? 0) >= 2);
  const hierarchyTreatmentApplied = mainRuns.some((run) => run.hierarchyTreatmentApplied) && subtitleRuns.every((run) => run.hierarchyTreatmentApplied !== false);
  const mainTitleVisualWeight = round(mainRuns.reduce((max, run) => Math.max(max, run.visualWeight ?? 0), 0));
  const subtitleVisualWeight = round(subtitleRuns.reduce((max, run) => Math.max(max, run.visualWeight ?? 0), 0));
  const styleSafetyWarnings = Array.from(new Set(measurement.runMeasurements.flatMap((run) => run.styleSafetyWarnings ?? [])));
  const titleStylePreset = measurement.runMeasurements.find((run) => run.titleStylePreset)?.titleStylePreset ?? "unknown";
  const transparentPaddingRatio = measurement.groupInkBox ? round(1 - measurement.groupInkBox.alphaPixelCount / Math.max(1, measurement.groupInkBox.width * measurement.groupInkBox.height)) : 1;
  const measuredBelowMinimumReason = measuredTitleAssetRatio < MIN_ACCEPTABLE_LOCKUP_AREA_RATIO ? `measured_title_bbox_below_minimum:${measuredTitleAssetRatio}<${MIN_ACCEPTABLE_LOCKUP_AREA_RATIO}` : undefined;
  const renderSizingBlockedReason = measuredBelowMinimumReason ? (renderScaleAdjustmentApplied ? "render_scale_adjustment_insufficient" : "render_scale_not_applied") : undefined;
  const metrics: TitleAssetVisualScaleMetrics = {
    blueprintLockupRatio,
    unitBoxAggregateRatio,
    unitBoxFillRatioInsideLockup: round(unitBoxAggregateRatio / Math.max(blueprintLockupRatio, 0.0001)),
    measuredTitleAssetRatio,
    measuredFinalTitleRatio: measuredTitleAssetRatio,
    plannedUnitBoxAreaRatio,
    measuredGlyphBoxAreaRatio,
    glyphOccupancyInsideUnitBox,
    glyphOccupancyInsideLockup,
    renderScaleAdjustmentApplied,
    ...(renderSizingBlockedReason ? { renderSizingBlockedReason } : {}),
    transparentPaddingRatio,
    selectedScaledBlueprintUsed: blueprint.candidateId === measurement.candidateId,
    ...(measuredBelowMinimumReason ? { measuredBelowMinimumReason } : {}),
    titleStylePreset,
    contrastTreatmentApplied,
    hierarchyTreatmentApplied,
    mainTitleVisualWeight,
    subtitleVisualWeight,
    styleSafetyWarnings,
  };
  return { passed: !measuredBelowMinimumReason, metrics, reason: measuredBelowMinimumReason ?? "measured_title_bbox_minimum_passed" };
}

function areaRatio(box: TitleBox | null | undefined, canvasArea: number): number {
  return round(box ? box.width * box.height / canvasArea : 0);
}
function round(value: number): number { return Math.round(value * 10000) / 10000; }
