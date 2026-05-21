import type { TitleLockupBlueprint } from "@/config/title-lockup-blueprint";
import type { RasterMeasurementResult } from "@/models/title-raster-measurement";
import type { VectorGlyphRenderInput, VectorGlyphRenderResult, VectorGlyphWarning } from "@/models/title-vector-glyph-renderer";
import { measureTitleRaster } from "@/services/title-raster-measurement.service";
import { renderTitleVectorGlyph } from "@/services/title-vector-glyph-renderer.service";
import { evaluateTitleAssetVisualScale, type TitleAssetVisualScaleResult } from "@/services/helpers/title-asset-visual-scale";
import { TITLE_BASELINE_STYLE_PRESET, TITLE_RENDER_STYLE_PRESET } from "@/services/helpers/title-vector-glyph-style";

export type TitleAssetRenderAttemptInput = Pick<
  VectorGlyphRenderInput,
  | "source"
  | "blueprint"
  | "canvas"
  | "brandStyle"
  | "fontRegistry"
  | "fontFallback"
  | "safetyContext"
>;
export type TitleAssetRenderVariant = "styled" | "baseline";
export type TitleAssetRenderAttempt = {
  renderVariant: TitleAssetRenderVariant;
  measurementInput: VectorGlyphRenderInput;
  measurementResult: VectorGlyphRenderResult;
  rasterMeasurement: RasterMeasurementResult;
  rasterWarnings: VectorGlyphWarning[];
  visualScale: TitleAssetVisualScaleResult;
};
export type TitleAssetRenderSelection = {
  attempt: TitleAssetRenderAttempt;
  selectedRenderVariant: TitleAssetRenderVariant | "none";
  titleVisualScaleDiagnostics: Record<string, unknown>;
};

export async function selectMeasuredTitleAssetRenderVariant(input: TitleAssetRenderAttemptInput): Promise<TitleAssetRenderSelection> {
  const styled = await bestRenderAttempt(input, "styled");
  const baseline = await bestRenderAttempt(input, "baseline");
  const selected = selectRenderAttempt(styled, baseline);
  return { ...selected, titleVisualScaleDiagnostics: compareRenderVariants(styled, baseline, selected.selectedRenderVariant) };
}

export function renderTitleAssetDebugSvg(input: TitleAssetRenderAttemptInput, titleStylePreset: VectorGlyphRenderInput["titleStylePreset"]): string | undefined {
  return renderTitleVectorGlyph({
    ...createMeasurementRenderInput(input, "default", titleStylePreset === TITLE_BASELINE_STYLE_PRESET ? "baseline" : "styled"),
    renderMode: "debug",
    outputTarget: "debugSvg",
    fontEmbedMode: "full",
  }).svg;
}

async function bestRenderAttempt(input: TitleAssetRenderAttemptInput, renderVariant: TitleAssetRenderVariant): Promise<TitleAssetRenderAttempt> {
  const base = await measureRenderAttempt(input, "default", renderVariant);
  if (base.visualScale.passed || !base.rasterMeasurement.safety.passed) return base;
  const boosted = await measureRenderAttempt(input, "occupancyBoost", renderVariant);
  return boosted.measurementResult.svg && boosted.rasterMeasurement.safety.passed && (boosted.visualScale.passed || ratio(boosted) > ratio(base)) ? boosted : base;
}

async function measureRenderAttempt(input: TitleAssetRenderAttemptInput, renderSizingMode: VectorGlyphRenderInput["renderSizingMode"], renderVariant: TitleAssetRenderVariant): Promise<TitleAssetRenderAttempt> {
  const measurementInput = createMeasurementRenderInput(input, renderSizingMode, renderVariant);
  const measurementResult = renderTitleVectorGlyph(measurementInput);
  const rasterMeasurement = measurementResult.svg ? await measureTitleRaster({ candidateId: input.blueprint.candidateId, measurementSvg: measurementResult.svg, canvas: input.canvas, glyphRuns: measurementResult.glyphRuns, estimatedMeasuredBoxes: measurementResult.measuredBoxes, forbiddenZones: input.safetyContext?.forbiddenZones, mode: "hybrid", outputTarget: measurementResult.outputTarget, fontEmbedMode: measurementResult.fontEmbedMode }) : await failedMeasurement(input);
  const rasterWarnings = [...measurementResult.warnings, ...rasterMeasurement.warnings];
  const visualScale = rasterMeasurement.safety.passed ? evaluateTitleAssetVisualScale(input.blueprint, rasterMeasurement) : failedVisualScale(input.blueprint, rasterMeasurement, renderSizingMode, renderVariant);
  return { renderVariant, measurementInput, measurementResult, rasterMeasurement, rasterWarnings, visualScale };
}

function selectRenderAttempt(styled: TitleAssetRenderAttempt, baseline: TitleAssetRenderAttempt): Omit<TitleAssetRenderSelection, "titleVisualScaleDiagnostics"> {
  if (renderSafe(styled)) return { attempt: styled, selectedRenderVariant: "styled" };
  if (renderSafe(baseline)) return { attempt: baseline, selectedRenderVariant: "baseline" };
  return ratio(styled) >= ratio(baseline) ? { attempt: styled, selectedRenderVariant: "none" } : { attempt: baseline, selectedRenderVariant: "none" };
}

function compareRenderVariants(styled: TitleAssetRenderAttempt, baseline: TitleAssetRenderAttempt, selectedRenderVariant: TitleAssetRenderVariant | "none"): Record<string, unknown> {
  const styledRatio = ratio(styled), baselineRatio = ratio(baseline), fallbackUsed = selectedRenderVariant === "baseline";
  return {
    titleStyleAttempted: true,
    titleStyleApplied: selectedRenderVariant === "styled",
    titleStyleFallbackUsed: fallbackUsed,
    ...(fallbackUsed ? { titleStyleFallbackReason: styled.visualScale.reason } : {}),
    styledMeasuredTitleAssetRatio: styledRatio,
    baselineMeasuredTitleAssetRatio: baselineRatio,
    styleMeasuredDelta: round(styledRatio - baselineRatio),
    selectedRenderVariant,
  };
}

function createMeasurementRenderInput(input: TitleAssetRenderAttemptInput, renderSizingMode: VectorGlyphRenderInput["renderSizingMode"], renderVariant: TitleAssetRenderVariant): VectorGlyphRenderInput {
  return { source: input.source, blueprint: input.blueprint, canvas: input.canvas, titleStylePreset: renderVariant === "styled" ? TITLE_RENDER_STYLE_PRESET : TITLE_BASELINE_STYLE_PRESET, brandStyle: input.brandStyle, fontRegistry: input.fontRegistry, fontFallback: input.fontFallback, safetyContext: input.safetyContext, renderMode: "debug", outputFormat: "svg", outputTarget: "measurementSvg", fontEmbedMode: "none", measurementRequirement: "estimatedOnly", renderSizingMode };
}

async function failedMeasurement(input: TitleAssetRenderAttemptInput): Promise<RasterMeasurementResult> {
  const empty = `<svg width="${input.canvas.width}" height="${input.canvas.height}" xmlns="http://www.w3.org/2000/svg"></svg>`;
  return measureTitleRaster({ candidateId: input.blueprint.candidateId, measurementSvg: empty, canvas: input.canvas, glyphRuns: [], estimatedMeasuredBoxes: { lockupBox: input.blueprint.lockupBox, unitBoxes: [] }, forbiddenZones: input.safetyContext?.forbiddenZones, mode: "hybrid", outputTarget: "measurementSvg", fontEmbedMode: "none" });
}

function failedVisualScale(blueprint: TitleLockupBlueprint, measurement: RasterMeasurementResult, renderSizingMode: VectorGlyphRenderInput["renderSizingMode"], renderVariant: TitleAssetRenderVariant): TitleAssetVisualScaleResult {
  return { passed: false, metrics: { blueprintLockupRatio: 0, unitBoxAggregateRatio: 0, unitBoxFillRatioInsideLockup: 0, measuredTitleAssetRatio: 0, measuredFinalTitleRatio: 0, plannedUnitBoxAreaRatio: 0, measuredGlyphBoxAreaRatio: 0, glyphOccupancyInsideUnitBox: 0, glyphOccupancyInsideLockup: 0, renderScaleAdjustmentApplied: renderSizingMode === "occupancyBoost", transparentPaddingRatio: 1, selectedScaledBlueprintUsed: false, titleStylePreset: renderVariant === "styled" ? TITLE_RENDER_STYLE_PRESET : TITLE_BASELINE_STYLE_PRESET, contrastTreatmentApplied: false, hierarchyTreatmentApplied: false, mainTitleVisualWeight: 0, subtitleVisualWeight: 0, styleSafetyWarnings: [] }, reason: measurement.reason || "raster_measurement_failed" };
}

function renderSafe(attempt: TitleAssetRenderAttempt): boolean { return Boolean(attempt.measurementResult.svg && attempt.rasterMeasurement.safety.passed && attempt.visualScale.passed); }
function ratio(attempt: TitleAssetRenderAttempt): number { return attempt.visualScale.metrics.measuredTitleAssetRatio; }
function round(value: number): number { return Math.round(value * 10000) / 10000; }
