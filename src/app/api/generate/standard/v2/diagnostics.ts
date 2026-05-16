import type {
  StandardGenerateV2Diagnostics,
  StandardGenerateV2ProductQualityDiagnostics,
  StandardGenerateV2Request,
} from "@/models/standard-generation-api-v2";
import type { generateStandardPoster } from "@/use-cases/generate-standard-poster.use-case";

type StandardPosterResult = Awaited<ReturnType<typeof generateStandardPoster>>;
const THEME_HINTS = ["四大名著", "名著", "文学", "阅读", "书籍", "人物", "国风", "高级感", "招生", "暑期", "体验课", "体验营", "成长", "汇报课"];

export function buildV2Diagnostics(
  result: StandardPosterResult,
  assetWarnings: string[],
  formMappingSummary: Record<string, unknown>,
  request: StandardGenerateV2Request,
): StandardGenerateV2Diagnostics {
  const layout = result.titleCandidatePipelineResult?.candidateResult.spatialStrategy.backgroundLayout;
  return {
    selectedCandidateId: result.selectedCandidateId,
    selectedSourceCandidateId: result.selectedSourceCandidateId,
    candidateSource: result.diagnostics.candidatePipelineSource,
    spatialSource: result.diagnostics.spatialStrategySource,
    backgroundLayoutSource: layout?.source,
    formMappingSummary,
    productQualityDiagnostics: buildProductQualityDiagnostics(result, formMappingSummary, request),
    warnings: [...assetWarnings, ...result.warnings],
  };
}

export function backgroundFallbackCode(result: StandardPosterResult): string | undefined {
  return result.titleCandidatePipelineResult?.candidateResult.spatialStrategy.backgroundLayout.diagnostics?.fallbackReasonCode;
}

function buildProductQualityDiagnostics(
  result: StandardPosterResult,
  summary: Record<string, unknown>,
  request: StandardGenerateV2Request,
): StandardGenerateV2ProductQualityDiagnostics {
  const mode = request.background?.mode ?? "debugFixture";
  const strategy = result.titleCandidatePipelineResult?.candidateResult.spatialStrategy;
  const hook = detectVisualHook(request);
  const backgroundCanReflectTheme = mode !== "debugFixture";
  const warnings = [
    ...(backgroundCanReflectTheme ? [] : ["当前使用固定测试背景，背景不会根据活动内容、四大名著、国风、人物、书籍等描述生成主题画面。"]),
    ...(hook.possibleMismatch && hook.mismatchReason ? [hook.mismatchReason] : []),
  ];

  return {
    outputQualityMode: mode === "debugFixture" ? "debug_fixture_smoke" : "product_quality_candidate",
    backgroundMode: mode,
    backgroundLimitation: mode === "debugFixture"
      ? "debugFixture 是固定 smoke 背景，只验证 API/标题/合成链路，不代表产品视觉质量。"
      : "背景模式可能承载主题视觉，但当前 route 尚未开放该模式。",
    formFieldConsumption: {
      productOutputType: "consumed",
      eventBrief: "partially_consumed",
      styleBrief: "partially_consumed",
      visualDetails: "partially_consumed",
      titleBrief: "partially_consumed",
      avoidNotes: "partially_consumed",
      titleEmphasisWords: "partially_consumed",
    },
    visualHook: hook,
    semanticAlignment: {
      requestedThemeHints: collectThemeHints(request),
      backgroundCanReflectTheme,
      titleCanReflectTheme: true,
      limitationReason: backgroundCanReflectTheme
        ? "标题与背景均可能承载主题，但当前实现仍需产品质量验证。"
        : "Form v2 描述进入 prompt/context，但 debugFixture 背景像素固定，无法表现主题符号。",
    },
    intentDiagnostics: {
      productOutputType: request.form.productOutputType,
      designFamily: stringSummary(summary.designFamily),
      contentIntent: strategy?.contentIntent,
      sceneKey: stringSummary(summary.sceneKey),
      patternHints: strategy ? [...strategy.patternPool.primary, ...strategy.patternPool.secondary].slice(0, 6) : [],
    },
    titleDiagnostics: {
      selectedCandidateId: result.selectedCandidateId,
      selectedSourceCandidateId: result.selectedSourceCandidateId,
      titleFocus: request.title.mainTitle.trim(),
      subtitleUsedAsSupport: Boolean(request.title.subtitle?.trim()),
      titleBriefInfluence: "weak",
    },
    warnings,
  };
}

function detectVisualHook(request: StandardGenerateV2Request): StandardGenerateV2ProductQualityDiagnostics["visualHook"] {
  const mainTitle = request.title.mainTitle.trim();
  const subtitle = request.title.subtitle?.trim();
  const counts = collectThemeHints(request).map((hint) => ({ hint, count: countInRequest(request, hint), source: hookSource(request, hint) }));
  const candidate = counts.filter((item) => !mainTitle.includes(item.hint)).sort((left, right) => scoreHint(right) - scoreHint(left))[0];
  const detectedPrimaryHook = candidate?.hint || mainTitle || undefined;
  const possibleMismatch = Boolean(candidate && candidate.count >= 2);
  return {
    detectedPrimaryHook,
    source: candidate?.source ?? (mainTitle ? "mainTitle" : "none"),
    mainTitle,
    ...(subtitle ? { subtitle } : {}),
    possibleMismatch,
    ...(possibleMismatch ? { mismatchReason: `用户描述中“${candidate!.hint}”多次出现，但 mainTitle 是“${mainTitle}”；当前标题系统主要围绕 mainTitle 构图，可能导致传播重点弱化。` } : {}),
  };
}

function collectThemeHints(request: StandardGenerateV2Request): string[] {
  const text = allRequestText(request);
  return THEME_HINTS.filter((hint) => text.includes(hint));
}

function countInRequest(request: StandardGenerateV2Request, hint: string): number {
  return allRequestText(request).split(hint).length - 1;
}

function scoreHint(item: { hint: string; count: number }): number {
  return item.count * item.hint.length;
}

function hookSource(request: StandardGenerateV2Request, hint: string): StandardGenerateV2ProductQualityDiagnostics["visualHook"]["source"] {
  if (request.title.subtitle?.includes(hint)) return "subtitle";
  if (request.form.titleBrief.includes(hint)) return "titleBrief";
  if (request.form.eventBrief.includes(hint)) return "eventBrief";
  if (request.title.mainTitle.includes(hint)) return "mainTitle";
  return "none";
}

function allRequestText(request: StandardGenerateV2Request): string {
  return [request.title.mainTitle, request.title.subtitle, request.form.eventBrief, request.form.styleBrief, request.form.visualDetails, request.form.titleBrief, request.form.avoidNotes].filter(Boolean).join(" ");
}

function stringSummary(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}
