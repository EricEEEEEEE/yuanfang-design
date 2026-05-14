import { existsSync, readFileSync, writeFileSync } from "node:fs";
import {
  DEFAULT_TITLE_FONT_FALLBACK,
  TITLE_FONT_REGISTRY,
} from "../src/config/title-font-registry";
import type { VectorGlyphRenderInput } from "../src/models/title-vector-glyph-renderer";
import { renderTitleVectorGlyph } from "../src/services/title-vector-glyph-renderer.service";
import { generateScoredRefinedTitleCandidates } from "../src/use-cases/generate-scored-refined-title-candidates.use-case";

const BACKGROUND_IMAGE_PATH = "/tmp/yuanfang-title-director-bg.jpg";
const SVG_OUTPUT_PATH = "/tmp/yuanfang-title-vector-glyph-skeleton.svg";

async function main(): Promise<void> {
  if (!existsSync(BACKGROUND_IMAGE_PATH)) {
    console.error("VECTOR_SKELETON_TEST_IMAGE_MISSING", BACKGROUND_IMAGE_PATH);
    process.exit(1);
  }

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

  console.log("VECTOR_SKELETON_PIPELINE_SOURCE", pipeline.source);
  console.log("VECTOR_SKELETON_CANDIDATE_SOURCE", pipeline.candidateResult.source);
  if (pipeline.candidateResult.source === "fallback" || pipeline.finalCandidatePool.length === 0) {
    console.log("VECTOR_SKELETON_FALLBACK_DIAGNOSTIC_ONLY", "YES");
    console.log("VECTOR_SKELETON_FINAL_POOL_COUNT", pipeline.finalCandidatePool.length);
    console.log("VECTOR_SKELETON_REASON", pipeline.diagnostics.reason);
    return;
  }

  const candidateId = pipeline.recommendedCandidateIds[0] ?? pipeline.finalCandidatePool[0]?.candidateId;
  const blueprint = pipeline.finalCandidatePool.find((item) => item.candidateId === candidateId);
  if (!blueprint) throw new Error("VECTOR_SKELETON_NO_RECOMMENDED_BLUEPRINT");

  const input: VectorGlyphRenderInput = {
    source: "pipelineFinalPool",
    blueprint,
    canvas: { width: 1000, height: 1000 },
    titleStylePreset: "achievement",
    brandStyle: "yuanfangDefault",
    fontRegistry: TITLE_FONT_REGISTRY,
    fontFallback: DEFAULT_TITLE_FONT_FALLBACK,
    safetyContext: {
      forbiddenZones: pipeline.candidateResult.spatialStrategy.backgroundLayout.forbiddenZones,
    },
    renderMode: "debug",
    outputFormat: "svg",
  };
  const result = renderTitleVectorGlyph(input);
  if (!result.svg) throw new Error("VECTOR_SKELETON_SVG_MISSING");
  writeFileSync(SVG_OUTPUT_PATH, result.svg);

  const mainRuns = result.glyphRuns.filter((run) => run.role !== "subtitle");
  const joinedTitle = mainRuns.map((run) => run.text).join("");
  console.log("VECTOR_SKELETON_SOURCE", result.source);
  console.log("VECTOR_SKELETON_CANDIDATE_ID", result.candidateId);
  console.log("VECTOR_SKELETON_MAIN_TITLE", blueprint.mainTitle);
  console.log("VECTOR_SKELETON_TITLE_JOIN_CHECK", joinedTitle === blueprint.mainTitle ? "PASS" : `FAIL:${joinedTitle}`);
  console.log("VECTOR_SKELETON_GLYPH_RUN_COUNT", result.glyphRuns.length);
  console.log("VECTOR_SKELETON_GLYPH_RUN_TEXTS", result.glyphRuns.map((run) => run.text).join("|"));
  console.log("VECTOR_SKELETON_FONT_KEYS", result.glyphRuns.map((run) => run.font.resolvedFontKey ?? "none").join(","));
  console.log("VECTOR_SKELETON_SAFETY_PASSED", result.safety.passed ? "YES" : "NO");
  console.log("VECTOR_SKELETON_SAFETY_CHECKS", JSON.stringify(result.safety.checks));
  console.log("VECTOR_SKELETON_WARNINGS", JSON.stringify(result.warnings));
  console.log("VECTOR_SKELETON_SVG_PATH", SVG_OUTPUT_PATH);
  console.log("VECTOR_SKELETON_SVG_LENGTH", result.svg.length);
  console.log("VECTOR_SKELETON_FALLBACK_DIAGNOSTIC_ONLY", "NO");
  console.log("VECTOR_SKELETON_REASON", result.reason);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error("TITLE_VECTOR_GLYPH_RENDERER_SKELETON_TEST_FAILED", message);
  process.exit(1);
});
