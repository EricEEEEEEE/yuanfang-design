import { createHash } from "node:crypto";
import sharp from "sharp";
import type {
  TitleAsset,
  TitleAssetHandoffResult,
  TitleRasterLayer,
} from "@/models/title-asset";
import { measureTitleRaster } from "@/services/title-raster-measurement.service";
import { renderTitleVectorGlyph } from "@/services/title-vector-glyph-renderer.service";
import type {
  VectorGlyphRenderInput,
  VectorGlyphRenderResult,
  VectorGlyphWarning,
} from "@/models/title-vector-glyph-renderer";

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
  const measurementInput = createMeasurementRenderInput(input);
  const measurementResult = renderTitleVectorGlyph(measurementInput);
  if (!measurementResult.svg) {
    return fail(input, "measurementSvg render did not return SVG.", measurementResult.warnings, undefined, {
      measurementOutputTarget: measurementResult.outputTarget,
    });
  }

  const rasterMeasurement = await measureTitleRaster({
    candidateId: input.blueprint.candidateId,
    measurementSvg: measurementResult.svg,
    canvas: input.canvas,
    glyphRuns: measurementResult.glyphRuns,
    estimatedMeasuredBoxes: measurementResult.measuredBoxes,
    forbiddenZones: input.safetyContext?.forbiddenZones,
    mode: "hybrid",
    outputTarget: measurementResult.outputTarget,
    fontEmbedMode: measurementResult.fontEmbedMode,
  });
  const rasterWarnings = [...measurementResult.warnings, ...rasterMeasurement.warnings];
  if (!rasterMeasurement.safety.passed) {
    return fail(input, "Sharp raster measurement did not pass.", rasterWarnings, undefined, diagnostics(measurementResult, undefined, rasterMeasurement));
  }

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

  const rasterLayer = await rasterizeTitleLayer(measurementResult.svg);
  const debugSvg = input.includeDebugSvg ? renderDebugSvg(input) : undefined;
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
    diagnostics: diagnostics(measurementResult, productionResult, rasterMeasurement, rasterLayer, debugSvg),
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

function createMeasurementRenderInput(input: RenderMeasuredTitleAssetInput): VectorGlyphRenderInput {
  return {
    source: input.source,
    blueprint: input.blueprint,
    canvas: input.canvas,
    titleStylePreset: input.titleStylePreset,
    brandStyle: input.brandStyle,
    fontRegistry: input.fontRegistry,
    fontFallback: input.fontFallback,
    safetyContext: input.safetyContext,
    renderMode: "debug",
    outputFormat: "svg",
    outputTarget: "measurementSvg",
    fontEmbedMode: "none",
    measurementRequirement: "estimatedOnly",
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

function renderDebugSvg(input: RenderMeasuredTitleAssetInput): string | undefined {
  return renderTitleVectorGlyph({
    ...createMeasurementRenderInput(input),
    renderMode: "debug",
    outputTarget: "debugSvg",
    fontEmbedMode: "full",
  }).svg;
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
  rasterMeasurement?: Awaited<ReturnType<typeof measureTitleRaster>>,
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
