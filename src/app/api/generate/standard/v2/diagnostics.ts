import type {
  StandardGenerateV2Diagnostics,
  StandardGenerateV2GeneratedBackgroundDiagnostics,
  StandardGenerateV2ProductQualityDiagnostics,
  StandardGenerateV2Request,
} from "@/models/standard-generation-api-v2";
import type { generateStandardPoster } from "@/use-cases/generate-standard-poster.use-case";

type StandardPosterResult = Awaited<ReturnType<typeof generateStandardPoster>>;
type VisualHookDiagnostics = StandardGenerateV2ProductQualityDiagnostics["visualHook"];
type VisualHookSource = VisualHookDiagnostics["source"];
type VisualHookCandidate = { phrase: string; source: VisualHookSource; score: number };
const SOURCE_WEIGHTS: Record<string, number> = { titleBrief: 78, subtitle: 60, eventBrief: 34, visualDetails: 30, mainTitle: 8 };
const GENERIC_HOOK_PHRASES = [
  "活动", "课程", "海报", "标题", "副标题", "主标题", "整体", "画面", "宣传", "招生", "公开课", "体验课", "体验营",
  "希望", "需要", "能够", "不要", "家长", "孩子", "老师", "学生", "感觉", "氛围", "主题", "内容",
];

export function buildV2Diagnostics(
  result: StandardPosterResult,
  assetWarnings: string[],
  formMappingSummary: Record<string, unknown>,
  request: StandardGenerateV2Request,
  generatedBackground?: StandardGenerateV2GeneratedBackgroundDiagnostics,
): StandardGenerateV2Diagnostics {
  const layout = result.titleCandidatePipelineResult?.candidateResult.spatialStrategy.backgroundLayout;
  return {
    selectedCandidateId: result.selectedCandidateId,
    selectedSourceCandidateId: result.selectedSourceCandidateId,
    candidateSource: result.diagnostics.candidatePipelineSource,
    spatialSource: result.diagnostics.spatialStrategySource,
    backgroundLayoutSource: layout?.source,
    formMappingSummary,
    productQualityDiagnostics: buildProductQualityDiagnostics(result, formMappingSummary, request, generatedBackground),
    ...(generatedBackground ? { generatedBackground } : {}),
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
  generatedBackground?: StandardGenerateV2GeneratedBackgroundDiagnostics,
): StandardGenerateV2ProductQualityDiagnostics {
  const mode = request.background?.mode ?? "debugFixture";
  const strategy = result.titleCandidatePipelineResult?.candidateResult.spatialStrategy;
  const titleDesignPlan = result.titleCandidatePipelineResult?.candidateResult.titleDesignPlan;
  const hook = detectVisualHook(request);
  const generatedReady = mode === "generated" && generatedBackground?.source === "standard-background-generation-v1" && !generatedBackground.errorCode;
  const backgroundCanReflectTheme = generatedReady;
  const warnings = [
    ...(backgroundCanReflectTheme ? [] : ["当前使用固定测试背景，背景不会根据用户描述中的传播重点、主题符号和活动气质生成主题画面。"]),
    ...(generatedReady ? ["当前 generated background 已根据 brief 生成背景候选，但仍需产品质量 QA，不代表 production-ready。"] : []),
    ...(generatedBackground?.warnings ?? []),
    ...(hook.possibleMismatch && hook.mismatchReason ? [hook.mismatchReason] : []),
  ];

  return {
    outputQualityMode: mode === "debugFixture" ? "debug_fixture_smoke" : (generatedReady ? "generated_background_candidate" : "product_quality_candidate"),
    backgroundMode: mode,
    backgroundLimitation: mode === "debugFixture"
      ? "debugFixture 是固定 smoke 背景，只验证 API/标题/合成链路，不代表产品视觉质量。"
      : "generated background 会尝试根据 Form v2 brief 生成主题背景候选，但仍需人工 QA 与后续安全评估。",
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
        ? "背景已由 generated background service 根据 Form v2 brief 生成候选，标题仍由系统标题层渲染。"
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
      l7PlanId: titleDesignPlan?.planId,
      scene: titleDesignPlan?.sceneStyleProfile.sceneKey,
      fontShape: titleDesignPlan?.fontShapePlan.key,
      titleStylePreset: titleDesignPlan?.rendererStylePlan.titleStylePreset,
      targetLockupAreaRatio: titleDesignPlan?.adaptiveSizingPolicy.targetLockupAreaRatio,
      primaryPatterns: titleDesignPlan?.referencePatternPlan.primary,
      allowedCompositionModes: titleDesignPlan?.lockupCompositionPlan.allowedModes,
      designQualityGates: titleDesignPlan?.designQualityGates,
    },
    warnings,
  };
}

export function detectVisualHook(request: StandardGenerateV2Request): VisualHookDiagnostics {
  const mainTitle = request.title.mainTitle.trim();
  const subtitle = request.title.subtitle?.trim();
  const candidate = collectPrimaryMessageCandidates(request)[0];
  const detectedPrimaryHook = candidate?.phrase || mainTitle || undefined;
  const mainTitleMismatch = Boolean(detectedPrimaryHook && mainTitle && detectedPrimaryHook !== mainTitle && !mainTitle.includes(detectedPrimaryHook));
  const titleHierarchyRisk = mainTitleMismatch ? (candidate?.source === "subtitle" ? "medium" : "high") : "none";
  return {
    detectedPrimaryHook,
    detectedPrimaryMessage: detectedPrimaryHook,
    source: candidate?.source ?? (mainTitle ? "mainTitle" : "none"),
    hookSource: candidate?.source ?? (mainTitle ? "mainTitle" : "none"),
    mainTitle,
    ...(subtitle ? { subtitle } : {}),
    possibleMismatch: mainTitleMismatch,
    mainTitleMismatch,
    titleHierarchyRisk,
    ...(mainTitleMismatch ? { mismatchReason: `检测到传播重点可能是“${detectedPrimaryHook}”，但 mainTitle 是“${mainTitle}”；标题层级应保留 mainTitle 原文，同时增强 subtitle/hook 的视觉存在感。` } : {}),
  };
}

function collectThemeHints(request: StandardGenerateV2Request): string[] {
  return collectPrimaryMessageCandidates(request).slice(0, 6).map((candidate) => candidate.phrase);
}

function collectPrimaryMessageCandidates(request: StandardGenerateV2Request): VisualHookCandidate[] {
  const mainTitle = request.title.mainTitle.trim();
  const fields: Array<[VisualHookSource, string | undefined]> = [
    ["subtitle", request.title.subtitle],
    ["titleBrief", request.form.titleBrief],
    ["eventBrief", request.form.eventBrief],
    ["visualDetails", request.form.visualDetails],
    ["mainTitle", request.title.mainTitle],
  ];
  const candidates = new Map<string, VisualHookCandidate>();
  for (const [source, value] of fields) {
    for (const phrase of extractHookPhrases(value)) {
      if (isWeakHookPhrase(phrase, mainTitle)) continue;
      const score = (SOURCE_WEIGHTS[source] ?? 1) + countInRequest(request, phrase) * 10 + Math.min(phrase.length, 16);
      const previous = candidates.get(phrase);
      candidates.set(phrase, { phrase, source: previous && previous.score > score ? previous.source : source, score: (previous?.score ?? 0) + score });
    }
  }
  return [...candidates.values()].sort((left, right) => right.score - left.score);
}

function extractHookPhrases(value: string | undefined): string[] {
  if (!value) return [];
  const chunks = value.split(/[，。；、,;：:\n]/).map(cleanHookPhrase).filter(Boolean);
  const emphasized = value.match(/(?:突出|强调|主打|围绕|展示|体现|表现|感受|看见|看到|了解|知道)([^，。；、,;：:\n]{2,24})/g) ?? [];
  return [...new Set([...chunks, ...emphasized.map(cleanHookPhrase)])];
}

function cleanHookPhrase(value: string): string {
  return value
    .replace(/(?:突出|强调|主打|围绕|展示|体现|表现|感受|看见|看到|了解|知道|希望|需要|能够|整体|画面|海报|标题|让家长|让孩子|通过|我们)/g, "")
    .replace(/[“”"'《》\s]/g, "")
    .replace(/(四个字|这些字|这个词|这种感觉|那种感觉|感觉|氛围|内容|主题|课程|体验营|体验课|公开课|活动|宣传|海报|体验)$/g, "")
    .trim();
}

function isWeakHookPhrase(phrase: string, mainTitle: string): boolean {
  if (phrase.length < 2 || phrase.length > 16) return true;
  if (!/[\p{Script=Han}A-Za-z0-9]/u.test(phrase)) return true;
  if (phrase === mainTitle) return true;
  return GENERIC_HOOK_PHRASES.includes(phrase);
}

function countInRequest(request: StandardGenerateV2Request, hint: string): number {
  return allRequestText(request).split(hint).length - 1;
}

function allRequestText(request: StandardGenerateV2Request): string {
  return [request.title.mainTitle, request.title.subtitle, request.form.eventBrief, request.form.styleBrief, request.form.visualDetails, request.form.titleBrief, request.form.avoidNotes].filter(Boolean).join(" ");
}

function stringSummary(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}
