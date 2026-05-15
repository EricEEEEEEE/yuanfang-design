import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import {
  DEFAULT_TITLE_FONT_FALLBACK,
  TITLE_FONT_REGISTRY,
} from "../src/config/title-font-registry";
import type { RasterMeasurementResult } from "../src/models/title-raster-measurement";
import type { VectorGlyphRenderInput, VectorGlyphRun } from "../src/models/title-vector-glyph-renderer";
import { measureTitleRaster } from "../src/services/title-raster-measurement.service";
import { renderTitleVectorGlyph } from "../src/services/title-vector-glyph-renderer.service";
import { generateScoredRefinedTitleCandidates } from "../src/use-cases/generate-scored-refined-title-candidates.use-case";

const BACKGROUND_IMAGE_PATH = "/tmp/yuanfang-title-director-bg.jpg";

async function main(): Promise<void> {
  if (!existsSync(BACKGROUND_IMAGE_PATH)) throw new Error(`VECTOR_RASTER_TEST_IMAGE_MISSING ${BACKGROUND_IMAGE_PATH}`);
  const backgroundImageBase64 = readFileSync(BACKGROUND_IMAGE_PATH).toString("base64");
  const pipeline = await generateScoredRefinedTitleCandidates({
    backgroundImageBase64,
    mainTitle: "成长汇报课",
    subtitle: "看见孩子的表达力量",
    designFamily: "achievementShowcase",
    layoutFamily: "centerTitle",
    displayPolicy: "titleOnlyDefault",
    productOutputType: "mainVisual",
    eventBrief: "这是一次学期成长汇报课，孩子会展示阅读、写作、表达和课堂展示方面的成长。",
    styleBrief: "明亮、有仪式感、有成果感，也要专业可信。",
    visualDetails: "作品墙、展示台、舞台光、奖章、表达麦克风、课程成果板。",
    avoidNotes: "不要山水卷轴、不要低幼卡通、不要人物太多。",
  });

  if (!process.env.OPENAI_API_KEY || pipeline.candidateResult.source === "fallback" || pipeline.finalCandidatePool.length === 0) {
    printFallback(pipeline.candidateResult.source, pipeline.finalCandidatePool.length, pipeline.diagnostics.reason);
    return;
  }

  const forbiddenZones = pipeline.candidateResult.spatialStrategy.backgroundLayout.forbiddenZones;
  const byId = new Map(pipeline.finalCandidatePool.map((item) => [item.candidateId, item]));
  const seen = new Set<string>();
  const ordered = [byId.get("c6-r1"), ...pipeline.recommendedCandidateIds.map((id) => byId.get(id)), ...pipeline.finalCandidatePool]
    .filter((item): item is (typeof pipeline.finalCandidatePool)[number] => Boolean(item))
    .filter((item) => { if (seen.has(item.candidateId)) return false; seen.add(item.candidateId); return true; });
  let selected: { input: VectorGlyphRenderInput; measurementSvgResult: ReturnType<typeof renderTitleVectorGlyph>; raster: Awaited<ReturnType<typeof measureTitleRaster>> } | null = null;
  for (const blueprint of ordered) {
    const input: VectorGlyphRenderInput = { source: "pipelineFinalPool", blueprint, canvas: { width: 1000, height: 1000 }, titleStylePreset: "achievement", brandStyle: "yuanfangDefault", fontRegistry: TITLE_FONT_REGISTRY, fontFallback: DEFAULT_TITLE_FONT_FALLBACK, safetyContext: { forbiddenZones }, renderMode: "debug", outputFormat: "svg", outputTarget: "measurementSvg", fontEmbedMode: "none", measurementRequirement: "estimatedOnly" };
    const measurementSvgResult = renderTitleVectorGlyph(input);
    if (!measurementSvgResult.svg) throw new Error("VECTOR_RASTER_MEASUREMENT_SVG_MISSING");
    const raster = await measureTitleRaster({ candidateId: blueprint.candidateId, measurementSvg: measurementSvgResult.svg, canvas: input.canvas, glyphRuns: measurementSvgResult.glyphRuns, estimatedMeasuredBoxes: measurementSvgResult.measuredBoxes, forbiddenZones, mode: "hybrid", outputTarget: measurementSvgResult.outputTarget, fontEmbedMode: measurementSvgResult.fontEmbedMode });
    selected = { input, measurementSvgResult, raster };
    if (raster.safety.passed) break;
  }
  if (!selected) throw new Error("VECTOR_RASTER_NO_RECOMMENDED_BLUEPRINT");
  const { input, measurementSvgResult, raster } = selected;
  const productionWithRaster = renderTitleVectorGlyph({
    ...input,
    renderMode: "production",
    outputTarget: "rasterLayer",
    fontEmbedMode: "none",
    measurementRequirement: "rasterRequiredForProduction",
    rasterMeasurementResult: raster,
  });
  const productionWithoutRaster = renderTitleVectorGlyph({
    ...input,
    renderMode: "production",
    outputTarget: "rasterLayer",
    fontEmbedMode: "none",
    measurementRequirement: "rasterRequiredForProduction",
  });
  const staleRaster = cloneRasterResult(raster);
  staleRaster.identity = { ...staleRaster.identity, measurementSvgHash: "stale-measurement-svg-hash" };
  const productionWithStale = renderTitleVectorGlyph({
    ...input,
    renderMode: "production",
    outputTarget: "rasterLayer",
    fontEmbedMode: "none",
    measurementRequirement: "rasterRequiredForProduction",
    rasterMeasurementResult: staleRaster,
  });
  const overflow = await createOverflowMeasurement();
  printResult(measurementSvgResult, raster, productionWithRaster, productionWithoutRaster, productionWithStale, overflow);
  if (!raster.safety.passed || !productionWithRaster.safety.passed || productionWithoutRaster.safety.passed || productionWithStale.safety.passed || !overflow.runMeasurements.some((item) => item.outsidePlannedBox)) {
    throw new Error("VECTOR_RASTER_MEASUREMENT_GATE_FAILED");
  }
}

function printResult(
  measurementSvgResult: ReturnType<typeof renderTitleVectorGlyph>,
  raster: Awaited<ReturnType<typeof measureTitleRaster>>,
  productionWithRaster: ReturnType<typeof renderTitleVectorGlyph>,
  productionWithoutRaster: ReturnType<typeof renderTitleVectorGlyph>,
  productionWithStale: ReturnType<typeof renderTitleVectorGlyph>,
  overflow: Awaited<ReturnType<typeof measureTitleRaster>>,
): void {
  const subtitleSafe = checkPassed(raster, "subtitle_not_overlapping_main_title");
  const forbiddenSafe = checkPassed(raster, "forbidden_zone_overlap");
  const productionGate = {
    withRaster: productionWithRaster.safety.passed ? "PASS" : "FAIL",
    withoutRaster: productionWithoutRaster.safety.passed ? "PASS" : "FAIL",
    withStale: productionWithStale.safety.passed ? "PASS" : "FAIL",
    withRasterCheck: safetyFlag(productionWithRaster, "raster_measurement_required_for_production"),
    withoutRasterCheck: safetyFlag(productionWithoutRaster, "raster_measurement_required_for_production"),
    staleIdentityCheck: safetyFlag(productionWithStale, "raster_measurement_identity_matches"),
  };
  console.log("VECTOR_RASTER_MEASUREMENT_SOURCE", raster.source);
  console.log("VECTOR_RASTER_CANDIDATE_ID", raster.candidateId);
  console.log("VECTOR_RASTER_IDENTITY", JSON.stringify(raster.identity));
  console.log("VECTOR_RASTER_IDENTITY_MATCH", safetyFlag(productionWithRaster, "raster_measurement_identity_matches"));
  console.log("VECTOR_RASTER_MEASUREMENT_HASH", raster.identity.measurementSvgHash);
  console.log("VECTOR_RASTER_RUN_SCAN_MODE", raster.runScanMode);
  console.log("VECTOR_RASTER_RUN_EXPANSION_PX", raster.runExpansionPx);
  console.log("VECTOR_RASTER_GLYPH_RUN_COUNT", measurementSvgResult.glyphRuns.length);
  console.log("VECTOR_RASTER_MEASURED_BOXES", JSON.stringify(raster.measuredBoxes));
  console.log("VECTOR_RASTER_ALPHA_BBOXES", JSON.stringify({ group: raster.groupInkBox, runs: raster.runMeasurements.map((item) => ({ runId: item.runId, inkBox: item.inkBox })) }));
  console.log("VECTOR_RASTER_UNIT_INSIDE_FLAGS", raster.runMeasurements.map((item) => `${item.runId}:${item.insidePlannedBox ? "PASS" : "FAIL"}`).join("|"));
  console.log("VECTOR_RASTER_RUN_OUTSIDE_PLANNED_FLAGS", raster.runMeasurements.map((item) => `${item.runId}:${item.outsidePlannedBox ? "FAIL" : "PASS"}`).join("|"));
  console.log("VECTOR_RASTER_SUBTITLE_OVERLAP", subtitleSafe ? "NO" : "YES");
  console.log("VECTOR_RASTER_FORBIDDEN_OVERLAP", forbiddenSafe ? "NO" : "YES");
  console.log("VECTOR_RASTER_MEASUREMENT_PASSED", raster.safety.passed ? "YES" : "NO");
  console.log("VECTOR_RASTER_SAFETY_CODES", raster.safety.checks.map((item) => `${item.code}:${item.passed ? "PASS" : "FAIL"}`).join("|"));
  console.log("VECTOR_RASTER_PRODUCTION_GATE", JSON.stringify(productionGate));
  console.log("VECTOR_RASTER_PRODUCTION_GATE_WITH_STALE_RESULT", productionWithStale.safety.passed ? "PASS" : "FAIL");
  console.log("VECTOR_RASTER_PRODUCTION_GATE_WITHOUT_RASTER", productionWithoutRaster.safety.passed ? "PASS" : "FAIL");
  console.log("VECTOR_RASTER_PRODUCTION_GATE_WITH_RASTER", productionWithRaster.safety.passed ? "PASS" : "FAIL");
  console.log("VECTOR_RASTER_OVERFLOW_DETECTION", overflow.runMeasurements.some((item) => item.outsidePlannedBox) && !overflow.safety.passed ? "PASS" : "FAIL");
  console.log("VECTOR_RASTER_OVERFLOW_OUTSIDE_PLANNED_FLAGS", overflow.runMeasurements.map((item) => `${item.runId}:${item.outsidePlannedBox ? "FAIL" : "PASS"}`).join("|"));
  console.log("VECTOR_RASTER_OUTPUT_TARGET", measurementSvgResult.outputTarget);
  console.log("VECTOR_RASTER_FONT_EMBED_MODE", measurementSvgResult.fontEmbedMode);
  console.log("VECTOR_RASTER_SVG_LENGTH", measurementSvgResult.svg?.length ?? 0);
  console.log("VECTOR_RASTER_WARNINGS", JSON.stringify([...measurementSvgResult.warnings, ...raster.warnings]));
  console.log("VECTOR_RASTER_REASON", `${raster.reason} ${productionWithRaster.reason}`);
  console.log("GIT_STATUS_SHORT", gitStatusShort());
}

function printFallback(source: string, poolCount: number, reason: string): void {
  console.log("VECTOR_RASTER_MEASUREMENT_SOURCE", "diagnostic-only");
  console.log("VECTOR_RASTER_CANDIDATE_ID", "none");
  console.log("VECTOR_RASTER_GLYPH_RUN_COUNT", 0);
  console.log("VECTOR_RASTER_IDENTITY", "none");
  console.log("VECTOR_RASTER_IDENTITY_MATCH", "DIAGNOSTIC_ONLY");
  console.log("VECTOR_RASTER_MEASUREMENT_HASH", "none");
  console.log("VECTOR_RASTER_RUN_SCAN_MODE", "expanded");
  console.log("VECTOR_RASTER_RUN_EXPANSION_PX", 0);
  console.log("VECTOR_RASTER_MEASURED_BOXES", "none");
  console.log("VECTOR_RASTER_ALPHA_BBOXES", "none");
  console.log("VECTOR_RASTER_UNIT_INSIDE_FLAGS", "none");
  console.log("VECTOR_RASTER_RUN_OUTSIDE_PLANNED_FLAGS", "none");
  console.log("VECTOR_RASTER_SUBTITLE_OVERLAP", "N/A");
  console.log("VECTOR_RASTER_FORBIDDEN_OVERLAP", "N/A");
  console.log("VECTOR_RASTER_MEASUREMENT_PASSED", "DIAGNOSTIC_ONLY");
  console.log("VECTOR_RASTER_SAFETY_CODES", "DIAGNOSTIC_ONLY");
  console.log("VECTOR_RASTER_PRODUCTION_GATE", "DIAGNOSTIC_ONLY");
  console.log("VECTOR_RASTER_PRODUCTION_GATE_WITH_STALE_RESULT", "DIAGNOSTIC_ONLY");
  console.log("VECTOR_RASTER_PRODUCTION_GATE_WITHOUT_RASTER", "DIAGNOSTIC_ONLY");
  console.log("VECTOR_RASTER_PRODUCTION_GATE_WITH_RASTER", "DIAGNOSTIC_ONLY");
  console.log("VECTOR_RASTER_OVERFLOW_DETECTION", "DIAGNOSTIC_ONLY");
  console.log("VECTOR_RASTER_OVERFLOW_OUTSIDE_PLANNED_FLAGS", "DIAGNOSTIC_ONLY");
  console.log("VECTOR_RASTER_OUTPUT_TARGET", "none");
  console.log("VECTOR_RASTER_FONT_EMBED_MODE", "none");
  console.log("VECTOR_RASTER_SVG_LENGTH", 0);
  console.log("VECTOR_RASTER_WARNINGS", JSON.stringify([`pipeline source: ${source}`, `final pool count: ${poolCount}`]));
  console.log("VECTOR_RASTER_REASON", reason);
  console.log("GIT_STATUS_SHORT", gitStatusShort());
}

function checkPassed(raster: Awaited<ReturnType<typeof measureTitleRaster>>, code: string): boolean {
  return raster.safety.checks.find((item) => item.code === code)?.passed ?? false;
}
function safetyFlag(result: ReturnType<typeof renderTitleVectorGlyph>, code: string): string {
  return result.safety.checks.find((item) => item.code === code)?.passed ? "PASS" : "FAIL";
}
async function createOverflowMeasurement(): Promise<RasterMeasurementResult> {
  const plannedBox = { x: 50, y: 30, width: 40, height: 40, maxWidth: 40, maxHeight: 40, rotationDeg: 0 };
  const run: VectorGlyphRun = {
    runId: "synthetic-overflow-run",
    text: "T",
    role: "hero",
    font: { requestedFontKey: null, resolvedFontKey: "sourceHanSansBold", family: "synthetic", filePath: null, weight: 700, style: "normal", fallbackFamilies: [], status: "available", warnings: [], reason: "synthetic overflow fixture." },
    fontSize: 40,
    fill: "#000",
    strokeWidth: 0,
    transform: "rotate(0)",
    plannedBox,
    measuredBox: plannedBox,
    fontEmbedded: false,
    estimated: true,
    visualWeight: 1,
    allowEmphasis: false,
    rotationDeg: 0,
  };
  return measureTitleRaster({
    candidateId: "synthetic-overflow",
    measurementSvg: '<svg width="160" height="100" viewBox="0 0 160 100" xmlns="http://www.w3.org/2000/svg"><rect x="45" y="30" width="50" height="40" fill="#000"/></svg>',
    canvas: { width: 160, height: 100 },
    glyphRuns: [run],
    estimatedMeasuredBoxes: { lockupBox: plannedBox, unitBoxes: [{ text: run.text, planned: plannedBox, measured: plannedBox }] },
    mode: "hybrid",
    outputTarget: "measurementSvg",
    fontEmbedMode: "none",
  });
}
function cloneRasterResult(value: RasterMeasurementResult): RasterMeasurementResult {
  return JSON.parse(JSON.stringify(value)) as RasterMeasurementResult;
}
function gitStatusShort(): string {
  return execSync("git status --short", { encoding: "utf8" }).trim().replace(/\n/g, " | ") || "clean";
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error("TITLE_VECTOR_GLYPH_RENDERER_RASTER_MEASUREMENT_TEST_FAILED", message);
  process.exit(1);
});
