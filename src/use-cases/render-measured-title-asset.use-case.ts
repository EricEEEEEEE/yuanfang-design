import { createHash } from "node:crypto";
import sharp from "sharp";
import type {
  TitleAsset,
  TitleAssetHandoffResult,
  TitleRasterLayer,
} from "@/models/title-asset";
import type { RasterMeasurementResult } from "@/models/title-raster-measurement";
import { renderTitleVectorGlyph } from "@/services/title-vector-glyph-renderer.service";
import type {
  VectorGlyphRenderInput,
  VectorGlyphRenderResult,
  VectorGlyphWarning,
} from "@/models/title-vector-glyph-renderer";
import { renderTitleAssetDebugSvg, selectMeasuredTitleAssetRenderVariant } from "@/services/helpers/title-asset-render-variant";

export type RenderMeasuredTitleAssetInput = Pick<
  VectorGlyphRenderInput,
  | "source"
  | "blueprint"
  | "canvas"
  | "titleStylePreset"
  | "brandStyle"
  | "fontRegistry"
  | "fontFallback"
  | "safetyContext"
> & {
  includeDebugSvg?: boolean;
  includeMeasurementSvg?: boolean;
  createdAt?: string;
};

export async function renderMeasuredTitleAsset(
  input: RenderMeasuredTitleAssetInput,
): Promise<TitleAssetHandoffResult> {
  const selection = await selectMeasuredTitleAssetRenderVariant(input);
  const attempt = selection.attempt;
  if (!attempt.measurementResult.svg) return fail(input, "measurementSvg render did not return SVG.", attempt.measurementResult.warnings, undefined, { measurementOutputTarget: attempt.measurementResult.outputTarget });
  if (!attempt.rasterMeasurement.safety.passed) return fail(input, "Sharp raster measurement did not pass.", attempt.rasterWarnings, undefined, diagnostics(attempt.measurementResult, undefined, attempt.rasterMeasurement));
  const { measurementInput, measurementResult, rasterMeasurement, rasterWarnings, visualScale } = attempt;
  const titleVisualScale = { ...visualScale.metrics, ...selection.titleVisualScaleDiagnostics };
  if (!visualScale.passed) return fail(input, visualScale.reason, rasterWarnings, undefined, { ...diagnostics(measurementResult, undefined, rasterMeasurement), titleVisualScale });

  const productionResult = renderTitleVectorGlyph({
    ...measurementInput,
    renderMode: "production",
    outputTarget: "rasterLayer",
    fontEmbedMode: "none",
    measurementRequirement: "rasterRequiredForProduction",
    rasterMeasurementResult: rasterMeasurement,
  });
  const warnings = Array.from(new Map([...rasterWarnings, ...productionResult.warnings.filter((item) => item.code !== "raster_layer_not_implemented")].map((item) => [`${item.code}:${item.target ?? ""}:${item.message}`, item])).values());
  if (!productionResult.safety.passed) {
    return fail(input, "production rasterLayer gate did not pass.", warnings, productionResult, diagnostics(measurementResult, productionResult, rasterMeasurement));
  }

  const rasterLayer = await rasterizeTitleLayer(measurementResult.svg!);
  const debugSvg = input.includeDebugSvg ? renderTitleAssetDebugSvg(input, measurementInput.titleStylePreset) : undefined;
  const titleAsset: TitleAsset = {
    assetId: assetId(input.blueprint.candidateId, rasterLayer.sha256),
    candidateId: input.blueprint.candidateId,
    sourceCandidateId: productionResult.sourceCandidateId,
    source: input.source,
    assetKind: "titleRasterLayer",
    renderMode: "production",
    outputTarget: "rasterLayer",
    canvas: input.canvas,
    rasterLayer,
    debugSvg,
    measurementSvg: input.includeMeasurementSvg ? measurementResult.svg : undefined,
    measuredBoxes: productionResult.measuredBoxes,
    glyphRuns: productionResult.glyphRuns,
    rasterMeasurementResult: rasterMeasurement,
    safety: productionResult.safety,
    diagnostics: { ...diagnostics(measurementResult, productionResult, rasterMeasurement, rasterLayer, debugSvg), titleVisualScale },
    warnings,
    createdAt: input.createdAt,
    reason: "Title asset handoff produced a production-gated transparent PNG title raster layer.",
  };

  return {
    source: "title-asset-handoff-v1",
    candidateId: input.blueprint.candidateId,
    titleAsset,
    diagnostics: titleAsset.diagnostics,
    safety: productionResult.safety,
    warnings,
    reason: titleAsset.reason,
  };
}

async function rasterizeTitleLayer(svg: string): Promise<TitleRasterLayer> {
  const { data, info } = await sharp(Buffer.from(svg)).ensureAlpha().png().toBuffer({ resolveWithObject: true });
  return {
    input: data,
    top: 0,
    left: 0,
    width: info.width,
    height: info.height,
    mimeType: "image/png",
    sha256: sha256(data),
    byteLength: data.byteLength,
  };
}

function fail(
  input: RenderMeasuredTitleAssetInput,
  reason: string,
  warnings: VectorGlyphWarning[],
  result?: VectorGlyphRenderResult,
  extraDiagnostics: Record<string, unknown> = {},
): TitleAssetHandoffResult {
  return {
    source: "title-asset-handoff-v1",
    candidateId: input.blueprint.candidateId,
    diagnostics: { ...extraDiagnostics, assetCreated: false },
    safety: result?.safety,
    warnings,
    reason,
  };
}

function diagnostics(
  measurementResult: VectorGlyphRenderResult,
  productionResult?: VectorGlyphRenderResult,
  rasterMeasurement?: RasterMeasurementResult,
  rasterLayer?: TitleRasterLayer,
  debugSvg?: string,
): Record<string, unknown> {
  return {
    measurementSvgLength: measurementResult.svg?.length ?? 0,
    measurementOutputTarget: measurementResult.outputTarget,
    measurementFontEmbedMode: measurementResult.fontEmbedMode,
    productionSvgLength: productionResult?.svg?.length ?? 0,
    productionOutputTarget: productionResult?.outputTarget,
    rasterMeasurementPassed: rasterMeasurement?.safety.passed ?? false,
    rasterMeasurementIdentity: rasterMeasurement?.identity,
    rasterMeasurementSafetyCodes: rasterMeasurement?.safety.checks.map((item) => `${item.code}:${item.passed ? "PASS" : "FAIL"}`) ?? [],
    productionSafetyCodes: productionResult?.safety.checks.map((item) => `${item.code}:${item.passed ? "PASS" : "FAIL"}`) ?? [],
    rasterLayerBytes: rasterLayer?.byteLength ?? 0,
    rasterLayerSha256: rasterLayer?.sha256,
    debugSvgLength: debugSvg?.length ?? 0,
  };
}

function assetId(candidateId: string, hash: string): string {
  return `title-asset-${candidateId}-${hash.slice(0, 12)}`;
}

function sha256(input: Buffer): string {
  return createHash("sha256").update(input).digest("hex");
}
