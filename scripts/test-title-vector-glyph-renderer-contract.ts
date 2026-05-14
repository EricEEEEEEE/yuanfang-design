import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import {
  DEFAULT_TITLE_FONT_FALLBACK,
  TITLE_FONT_REGISTRY,
  getTitleFontRegistryDiagnostics,
  resolveTitleFontForPreset,
  resolveTitleFontForRole,
} from "../src/config/title-font-registry";
import type {
  TitleFontResolveResult,
  VectorGlyphRenderInput,
  VectorGlyphWarning,
} from "../src/models/title-vector-glyph-renderer";
import { generateScoredRefinedTitleCandidates } from "../src/use-cases/generate-scored-refined-title-candidates.use-case";

const BACKGROUND_IMAGE_PATH = "/tmp/yuanfang-title-director-bg.jpg";

async function main(): Promise<void> {
  if (!existsSync(BACKGROUND_IMAGE_PATH)) {
    console.error("VECTOR_CONTRACT_TEST_IMAGE_MISSING", BACKGROUND_IMAGE_PATH);
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
  const candidate = pipeline.finalCandidatePool.find((item) => pipeline.recommendedCandidateIds.includes(item.candidateId)) ??
    pipeline.finalCandidatePool[0];
  if (!candidate) throw new Error("VECTOR_CONTRACT_NO_FINAL_CANDIDATE");

  const input: VectorGlyphRenderInput = {
    source: "pipelineFinalPool",
    blueprint: candidate,
    canvas: { width: 1080, height: 1620 },
    titleStylePreset: "auto",
    brandStyle: "yuanfangDefault",
    fontRegistry: TITLE_FONT_REGISTRY,
    fontFallback: DEFAULT_TITLE_FONT_FALLBACK,
    safetyContext: {
      forbiddenZones: pipeline.candidateResult.spatialStrategy.backgroundLayout.forbiddenZones,
    },
    renderMode: "debug",
    outputFormat: "svg",
  };
  const diagnostics = getTitleFontRegistryDiagnostics();
  const heroFont = resolveTitleFontForRole("hero");
  const leadFont = resolveTitleFontForRole("lead");
  const accentFont = resolveTitleFontForRole("accent");
  const subtitleFont = resolveTitleFontForRole("subtitle");
  const presetFont = resolveTitleFontForPreset("achievement");
  const joinedTitle = candidate.titleUnits
    .slice()
    .sort((left, right) => left.readingOrder - right.readingOrder)
    .map((unit) => unit.text)
    .join("");
  const warnings = [
    ...diagnostics.missingWarnings,
    ...heroFont.warnings,
    ...leadFont.warnings,
    ...accentFont.warnings,
    ...subtitleFont.warnings,
    ...presetFont.warnings,
  ];
  const contractReady = joinedTitle === candidate.mainTitle &&
    !candidate.isFallbackCandidate &&
    [heroFont, leadFont, accentFont, subtitleFont].every((item) => item.status !== "unavailable");

  console.log("VECTOR_CONTRACT_SOURCE", input.source);
  console.log("VECTOR_INPUT_CANDIDATE_ID", candidate.candidateId);
  console.log("VECTOR_INPUT_MAIN_TITLE", candidate.mainTitle);
  console.log("VECTOR_INPUT_TITLE_UNITS", JSON.stringify(candidate.titleUnits.map((unit) => ({
    text: unit.text,
    semanticRole: unit.semanticRole,
    visualRole: unit.visualRole,
    readingOrder: unit.readingOrder,
    allowEmphasis: unit.allowEmphasis,
  }))));
  console.log("VECTOR_TITLE_JOIN_CHECK", joinedTitle === candidate.mainTitle ? "PASS" : `FAIL:${joinedTitle}`);
  console.log("VECTOR_FONT_REGISTRY_KEYS", diagnostics.fontKeys.join(","));
  console.log("VECTOR_DEFAULT_FONT_KEY", diagnostics.defaultFontKey);
  console.log("VECTOR_HERO_FONT_RESOLVED", summarizeFont(heroFont));
  console.log("VECTOR_LEAD_FONT_RESOLVED", summarizeFont(leadFont));
  console.log("VECTOR_ACCENT_FONT_RESOLVED", summarizeFont(accentFont));
  console.log("VECTOR_SUBTITLE_FONT_RESOLVED", summarizeFont(subtitleFont));
  console.log("VECTOR_FONT_MISSING_WARNINGS", summarizeWarnings(warnings));
  console.log("VECTOR_PRESET_MAPPING", JSON.stringify(diagnostics.presetMapping));
  console.log("VECTOR_CONTRACT_READY", contractReady ? "YES" : "NO");
  console.log("VECTOR_REASON", contractReady ? "contract and font resolver are ready for renderer skeleton." : "contract or font resolver needs attention.");
  console.log("GIT_STATUS_SHORT", gitStatusShort());
}

function summarizeFont(result: TitleFontResolveResult): string {
  return JSON.stringify({
    requestedFontKey: result.requestedFontKey,
    resolvedFontKey: result.resolvedFontKey,
    family: result.family,
    filePath: result.filePath,
    weight: result.weight,
    style: result.style,
    status: result.status,
  });
}

function summarizeWarnings(warnings: VectorGlyphWarning[]): string {
  return warnings.length > 0 ? JSON.stringify(warnings) : "[]";
}

function gitStatusShort(): string {
  const value = execSync("git status --short", { encoding: "utf8" }).trim();
  return value ? value.split("\n").join(" | ") : "clean";
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error("TITLE_VECTOR_GLYPH_RENDERER_CONTRACT_TEST_FAILED", message);
  process.exit(1);
});
