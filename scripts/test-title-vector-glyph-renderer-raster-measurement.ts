import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import {
  DEFAULT_TITLE_FONT_FALLBACK,
  TITLE_FONT_REGISTRY,
} from "../src/config/title-font-registry";
import type { VectorGlyphRenderInput } from "../src/models/title-vector-glyph-renderer";
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

  const recommended = pipeline.finalCandidatePool.filter((item) => pipeline.recommendedCandidateIds.includes(item.candidateId));
  const blueprint = recommended.find((item) => item.candidateId === "c6-r1") ?? recommended[0] ?? pipeline.finalCandidatePool[0];
  if (!blueprint) throw new Error("VECTOR_RASTER_NO_RECOMMENDED_BLUEPRINT");
  const forbiddenZones = pipeline.candidateResult.spatialStrategy.backgroundLayout.forbiddenZones;
  const input: VectorGlyphRenderInput = {
    source: "pipelineFinalPool",
    blueprint,
    canvas: { width: 1000, height: 1000 },
    titleStylePreset: "achievement",
    brandStyle: "yuanfangDefault",
    fontRegistry: TITLE_FONT_REGISTRY,
    fontFallback: DEFAULT_TITLE_FONT_FALLBACK,
    safetyContext: { forbiddenZones },
    renderMode: "debug",
    outputFormat: "svg",
    outputTarget: "measurementSvg",
    fontEmbedMode: "none",
    measurementRequirement: "estimatedOnly",
  };
  const measurementSvgResult = renderTitleVectorGlyph(input);
  if (!measurementSvgResult.svg) throw new Error("VECTOR_RASTER_MEASUREMENT_SVG_MISSING");
  const raster = await measureTitleRaster({
    candidateId: blueprint.candidateId,
    measurementSvg: measurementSvgResult.svg,
    canvas: input.canvas,
    glyphRuns: measurementSvgResult.glyphRuns,
    estimatedMeasuredBoxes: measurementSvgResult.measuredBoxes,
    forbiddenZones,
    mode: "hybrid",
    outputTarget: measurementSvgResult.outputTarget,
    fontEmbedMode: measurementSvgResult.fontEmbedMode,
  });
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
  printResult(measurementSvgResult, raster, productionWithRaster, productionWithoutRaster);
  if (!raster.safety.passed || !productionWithRaster.safety.passed || productionWithoutRaster.safety.passed) {
    throw new Error("VECTOR_RASTER_MEASUREMENT_GATE_FAILED");
  }
}

function printResult(
  measurementSvgResult: ReturnType<typeof renderTitleVectorGlyph>,
  raster: Awaited<ReturnType<typeof measureTitleRaster>>,
  productionWithRaster: ReturnType<typeof renderTitleVectorGlyph>,
  productionWithoutRaster: ReturnType<typeof renderTitleVectorGlyph>,
): void {
  const subtitleSafe = checkPassed(raster, "subtitle_not_overlapping_main_title");
  const forbiddenSafe = checkPassed(raster, "forbidden_zone_overlap");
  const productionGate = {
    withRaster: productionWithRaster.safety.passed ? "PASS" : "FAIL",
    withoutRaster: productionWithoutRaster.safety.passed ? "PASS" : "FAIL",
    withRasterCheck: safetyFlag(productionWithRaster, "raster_measurement_required_for_production"),
    withoutRasterCheck: safetyFlag(productionWithoutRaster, "raster_measurement_required_for_production"),
  };
  console.log("VECTOR_RASTER_MEASUREMENT_SOURCE", raster.source);
  console.log("VECTOR_RASTER_CANDIDATE_ID", raster.candidateId);
  console.log("VECTOR_RASTER_GLYPH_RUN_COUNT", measurementSvgResult.glyphRuns.length);
  console.log("VECTOR_RASTER_MEASURED_BOXES", JSON.stringify(raster.measuredBoxes));
  console.log("VECTOR_RASTER_ALPHA_BBOXES", JSON.stringify({ group: raster.groupInkBox, runs: raster.runMeasurements.map((item) => ({ runId: item.runId, inkBox: item.inkBox })) }));
  console.log("VECTOR_RASTER_UNIT_INSIDE_FLAGS", raster.runMeasurements.map((item) => `${item.runId}:${item.insidePlannedBox ? "PASS" : "FAIL"}`).join("|"));
  console.log("VECTOR_RASTER_SUBTITLE_OVERLAP", subtitleSafe ? "NO" : "YES");
  console.log("VECTOR_RASTER_FORBIDDEN_OVERLAP", forbiddenSafe ? "NO" : "YES");
  console.log("VECTOR_RASTER_MEASUREMENT_PASSED", raster.safety.passed ? "YES" : "NO");
  console.log("VECTOR_RASTER_PRODUCTION_GATE", JSON.stringify(productionGate));
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
  console.log("VECTOR_RASTER_MEASURED_BOXES", "none");
  console.log("VECTOR_RASTER_ALPHA_BBOXES", "none");
  console.log("VECTOR_RASTER_UNIT_INSIDE_FLAGS", "none");
  console.log("VECTOR_RASTER_SUBTITLE_OVERLAP", "N/A");
  console.log("VECTOR_RASTER_FORBIDDEN_OVERLAP", "N/A");
  console.log("VECTOR_RASTER_MEASUREMENT_PASSED", "DIAGNOSTIC_ONLY");
  console.log("VECTOR_RASTER_PRODUCTION_GATE", "DIAGNOSTIC_ONLY");
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
function gitStatusShort(): string {
  return execSync("git status --short", { encoding: "utf8" }).trim().replace(/\n/g, " | ") || "clean";
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error("TITLE_VECTOR_GLYPH_RENDERER_RASTER_MEASUREMENT_TEST_FAILED", message);
  process.exit(1);
});
