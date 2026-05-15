import { execSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import {
  DEFAULT_TITLE_FONT_FALLBACK,
  TITLE_FONT_REGISTRY,
} from "../src/config/title-font-registry";
import { generateScoredRefinedTitleCandidates } from "../src/use-cases/generate-scored-refined-title-candidates.use-case";
import { renderMeasuredTitleAsset } from "../src/use-cases/render-measured-title-asset.use-case";

const BACKGROUND_IMAGE_PATH = "/tmp/yuanfang-title-director-bg.jpg";
const TITLE_ASSET_OUTPUT_PATH = "/tmp/yuanfang-title-asset-handoff.png";

async function main(): Promise<void> {
  if (!existsSync(BACKGROUND_IMAGE_PATH)) throw new Error(`TITLE_ASSET_TEST_IMAGE_MISSING ${BACKGROUND_IMAGE_PATH}`);
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

  const byId = new Map(pipeline.finalCandidatePool.map((item) => [item.candidateId, item]));
  const seen = new Set<string>();
  const ordered = [byId.get("c6-r1"), ...pipeline.recommendedCandidateIds.map((id) => byId.get(id)), ...pipeline.finalCandidatePool]
    .filter((item): item is (typeof pipeline.finalCandidatePool)[number] => Boolean(item))
    .filter((item) => { if (seen.has(item.candidateId)) return false; seen.add(item.candidateId); return true; });
  let result: Awaited<ReturnType<typeof renderMeasuredTitleAsset>> | null = null;

  for (const blueprint of ordered) {
    result = await renderMeasuredTitleAsset({
      source: "pipelineFinalPool",
      blueprint,
      canvas: { width: 1000, height: 1000 },
      titleStylePreset: "achievement",
      brandStyle: "yuanfangDefault",
      fontRegistry: TITLE_FONT_REGISTRY,
      fontFallback: DEFAULT_TITLE_FONT_FALLBACK,
      safetyContext: { forbiddenZones: pipeline.candidateResult.spatialStrategy.backgroundLayout.forbiddenZones },
    });
    if (result.titleAsset) break;
  }

  if (!result?.titleAsset) throw new Error(`TITLE_ASSET_HANDOFF_FAILED ${result?.reason ?? "no result"}`);
  printResult(result);
}

function printResult(result: Awaited<ReturnType<typeof renderMeasuredTitleAsset>>): void {
  const asset = result.titleAsset;
  if (!asset) throw new Error("TITLE_ASSET_MISSING");
  const mainTitleJoin = asset.glyphRuns.filter((run) => run.role !== "subtitle").map((run) => run.text).join("");
  const identityMatch = asset.safety.checks.find((item) => item.code === "raster_measurement_identity_matches")?.passed ? "PASS" : "FAIL";
  if (asset.rasterLayer?.input) writeFileSync(TITLE_ASSET_OUTPUT_PATH, asset.rasterLayer.input);
  console.log("TITLE_ASSET_HANDOFF_SOURCE", result.source);
  console.log("TITLE_ASSET_CANDIDATE_ID", asset.candidateId);
  console.log("TITLE_ASSET_SOURCE_CANDIDATE_ID", asset.sourceCandidateId ?? "none");
  console.log("TITLE_ASSET_OUTPUT_TARGET", asset.outputTarget);
  console.log("TITLE_ASSET_RENDER_MODE", asset.renderMode);
  console.log("TITLE_ASSET_RASTER_LAYER_READY", asset.rasterLayer ? "YES" : "NO");
  console.log("TITLE_ASSET_RASTER_LAYER_MIME", asset.rasterLayer?.mimeType ?? "none");
  console.log("TITLE_ASSET_RASTER_LAYER_BYTES", asset.rasterLayer?.byteLength ?? 0);
  console.log("TITLE_ASSET_RASTER_LAYER_SHA256", asset.rasterLayer?.sha256 ?? "none");
  console.log("TITLE_ASSET_OUTPUT_PATH", asset.rasterLayer?.input ? TITLE_ASSET_OUTPUT_PATH : "none");
  console.log("TITLE_ASSET_MEASUREMENT_SOURCE", asset.rasterMeasurementResult?.source ?? "none");
  console.log("TITLE_ASSET_MEASUREMENT_PASSED", asset.rasterMeasurementResult?.safety.passed ? "YES" : "NO");
  console.log("TITLE_ASSET_IDENTITY_MATCH", identityMatch);
  console.log("TITLE_ASSET_SAFETY_CODES", asset.safety.checks.map((item) => `${item.code}:${item.passed ? "PASS" : "FAIL"}`).join("|"));
  console.log("TITLE_ASSET_GLYPH_RUN_COUNT", asset.glyphRuns.length);
  console.log("TITLE_ASSET_TITLE_JOIN_CHECK", mainTitleJoin === "成长汇报课" ? "PASS" : `FAIL:${mainTitleJoin}`);
  console.log("TITLE_ASSET_DEBUG_SVG_LENGTH", Number(asset.diagnostics.debugSvgLength ?? 0));
  console.log("TITLE_ASSET_MEASUREMENT_SVG_LENGTH", Number(asset.diagnostics.measurementSvgLength ?? 0));
  console.log("TITLE_ASSET_WARNINGS", JSON.stringify(asset.warnings));
  console.log("TITLE_ASSET_REASON", result.reason);
  console.log("GIT_STATUS_SHORT", gitStatusShort());
}

function printFallback(source: string, poolCount: number, reason: string): void {
  console.log("TITLE_ASSET_HANDOFF_SOURCE", "diagnostic-only");
  console.log("TITLE_ASSET_CANDIDATE_ID", "none");
  console.log("TITLE_ASSET_SOURCE_CANDIDATE_ID", "none");
  console.log("TITLE_ASSET_OUTPUT_TARGET", "none");
  console.log("TITLE_ASSET_RENDER_MODE", "none");
  console.log("TITLE_ASSET_RASTER_LAYER_READY", "DIAGNOSTIC_ONLY");
  console.log("TITLE_ASSET_RASTER_LAYER_MIME", "none");
  console.log("TITLE_ASSET_RASTER_LAYER_BYTES", 0);
  console.log("TITLE_ASSET_RASTER_LAYER_SHA256", "none");
  console.log("TITLE_ASSET_OUTPUT_PATH", "none");
  console.log("TITLE_ASSET_MEASUREMENT_SOURCE", "diagnostic-only");
  console.log("TITLE_ASSET_MEASUREMENT_PASSED", "DIAGNOSTIC_ONLY");
  console.log("TITLE_ASSET_IDENTITY_MATCH", "DIAGNOSTIC_ONLY");
  console.log("TITLE_ASSET_SAFETY_CODES", "DIAGNOSTIC_ONLY");
  console.log("TITLE_ASSET_GLYPH_RUN_COUNT", 0);
  console.log("TITLE_ASSET_TITLE_JOIN_CHECK", "DIAGNOSTIC_ONLY");
  console.log("TITLE_ASSET_DEBUG_SVG_LENGTH", 0);
  console.log("TITLE_ASSET_MEASUREMENT_SVG_LENGTH", 0);
  console.log("TITLE_ASSET_WARNINGS", JSON.stringify([`pipeline source: ${source}`, `final pool count: ${poolCount}`]));
  console.log("TITLE_ASSET_REASON", reason);
  console.log("GIT_STATUS_SHORT", gitStatusShort());
}

function gitStatusShort(): string {
  return execSync("git status --short", { encoding: "utf8" }).trim().replace(/\n/g, " | ") || "clean";
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error("TITLE_ASSET_HANDOFF_TEST_FAILED", message);
  process.exit(1);
});
