import OpenAI from "openai";
import { MODELS } from "@/config/models";
import {
  TITLE_REFERENCE_PATTERNS,
  type TitlePatternCandidateRole,
  type TitlePatternMutation,
  type TitleReferencePatternKey,
} from "@/config/title-reference-patterns";
import type { TextAnchor } from "@/services/background-layout-intelligence.service";
import {
  planSpatialStrategy,
  type SpatialStrategy,
  type TitleOrientationPreference,
  type TitleSpatialStrategyMode,
} from "@/services/spatial-strategy-planner.service";

export type TitleCandidateUnitRole =
  | "lead"
  | "main"
  | "accent"
  | "support";

export type TitleCandidateUnitDirection =
  | "horizontal"
  | "vertical";

export type TitleCandidateUnit = {
  text: string;
  role: TitleCandidateUnitRole;
  direction: TitleCandidateUnitDirection;
  x: number;
  y: number;
  scale: number;
  rotationDeg: number;
};

export type TitleCandidateSubtitle = {
  text: string;
  x: number;
  y: number;
  scale: number;
  placement: "below" | "side" | "verticalSide" | "none";
};

export type TitleCandidateEffectIntent =
  | "stageDepth"
  | "cleanReadable"
  | "chineseSeal"
  | "campaignImpact"
  | "editorialSoft"
  | "playfulBadge";

export type TitleCandidateDecorationIntent =
  | "none"
  | "stageLight"
  | "smallStars"
  | "medalLine"
  | "goldLine"
  | "sealStamp"
  | "paperTag"
  | "bookMark"
  | "campaignLabel"
  | "growthArrow"
  | "colorBlock"
  | "badge"
  | "playfulDot";

export type TitleCandidate = {
  candidateId: string;
  spatialAnchorId: string;
  strategyMode: TitleSpatialStrategyMode;
  orientationPreference: TitleOrientationPreference;
  patternKeys: TitleReferencePatternKey[];
  hybridStrategy: string;
  titleUnits: TitleCandidateUnit[];
  subtitle?: TitleCandidateSubtitle;
  effectIntent: TitleCandidateEffectIntent;
  decorationIntents: TitleCandidateDecorationIntent[];
  readabilityPlan: string;
  backgroundFitReason: string;
  whyNotTemplate: string;
};

export type GenerateTitleCandidatesInput = {
  backgroundImageBase64: string;
  mainTitle: string;
  subtitle?: string;
  designFamily?: string;
  layoutFamily?: string;
  displayPolicy?: string;
  productOutputType?: string;
  eventBrief?: string;
  styleBrief?: string;
  visualDetails?: string;
  avoidNotes?: string;
};

export type GenerateTitleCandidatesResult = {
  source: "ai" | "fallback";
  candidates: TitleCandidate[];
  reason: string;
  spatialStrategy: SpatialStrategy;
};

type PatternSummary = {
  key: TitleReferencePatternKey;
  label: string;
  family: string;
  unitPattern: string;
  flexibility: string;
  candidateRole: TitlePatternCandidateRole;
  canHybridWith: TitleReferencePatternKey[];
  mutationAllowed: TitlePatternMutation[];
  promptGuidance: string;
  templateRiskWarning: string;
};

type CandidateValidationDiagnostic = {
  valid: boolean;
  reason?: string;
  rawPreview?: string;
};

type AnchorPosition = {
  x: number;
  y: number;
};

const UNIT_ROLES: readonly TitleCandidateUnitRole[] = ["lead", "main", "accent", "support"];
const UNIT_DIRECTIONS: readonly TitleCandidateUnitDirection[] = ["horizontal", "vertical"];
const SUBTITLE_PLACEMENTS: readonly TitleCandidateSubtitle["placement"][] = ["below", "side", "verticalSide", "none"];
const EFFECT_INTENTS: readonly TitleCandidateEffectIntent[] = ["stageDepth", "cleanReadable", "chineseSeal", "campaignImpact", "editorialSoft", "playfulBadge"];
const DECORATION_INTENTS: readonly TitleCandidateDecorationIntent[] = ["none", "stageLight", "smallStars", "medalLine", "goldLine", "sealStamp", "paperTag", "bookMark", "campaignLabel", "growthArrow", "colorBlock", "badge", "playfulDot"];
const PATTERN_KEYS = Object.keys(TITLE_REFERENCE_PATTERNS) as TitleReferencePatternKey[];

export async function generateTitleCandidates(
  input: GenerateTitleCandidatesInput,
): Promise<GenerateTitleCandidatesResult> {
  const spatialStrategy = await planSpatialStrategy(input);
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return fallback(
      input,
      "OPENAI_API_KEY missing; used spatial-strategy fallback candidates.",
      spatialStrategy,
    );
  }

  try {
    const client = new OpenAI({ apiKey });
    const response = await client.chat.completions.create({
      model: MODELS.recommendation,
      messages: [
        { role: "system", content: buildSystemPrompt() },
        {
          role: "user",
          content: [
            { type: "text", text: buildUserPrompt(input, spatialStrategy) },
            { type: "image_url", image_url: { url: buildImageUrl(input.backgroundImageBase64), detail: "low" } },
          ],
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.65,
    });
    const parsed = parseCandidatesWithDiagnostic(
      response.choices[0]?.message?.content,
      input.mainTitle,
      spatialStrategy,
    );

    if (!parsed.candidates) {
      return fallback(
        input,
        `AI title candidate output invalid: ${formatDiagnostic(parsed.diagnostic)}; used fallback candidates.`,
        spatialStrategy,
      );
    }

    return {
      source: "ai",
      candidates: parsed.candidates,
      reason: "AI generated validated reference-driven title candidates.",
      spatialStrategy,
    };
  } catch (error) {
    return fallback(
      input,
      `AI title candidate generation failed: ${errorMessage(error)}; used fallback candidates.`,
      spatialStrategy,
    );
  }
}

function buildSystemPrompt(): string {
  return [
    "你是远方智设的标题候选生成器。",
    "你不是排版员，不是模板选择器，不能生成图片。",
    "你不能改写中文标题；不能增字、漏字、改字。",
    "你必须基于 reference patterns 生成 exactly 6 个候选，不多不少。",
    "reference patterns 是参考语法，不是固定模板，不能做固定 12 选 1。",
    "每个 candidate 可以基于 1-3 个 reference pattern 组合、变形和生成。",
    "每个 candidate 必须包含字组级 titleUnits。",
    "每个 candidate 的 titleUnits.text 按顺序拼接后必须等于 mainTitle。",
    "不要只横排一整行、竖排一整列、整句斜着放。",
    "候选之间必须有明显结构差异。",
    "effectIntent 只能是以下字符串之一，不能写解释：stageDepth / cleanReadable / chineseSeal / campaignImpact / editorialSoft / playfulBadge。",
    "decorationIntents 必须是数组，数组元素只能是以下字符串，不能写解释：none / stageLight / smallStars / medalLine / goldLine / sealStamp / paperTag / bookMark / campaignLabel / growthArrow / colorBlock / badge / playfulDot。",
    "titleUnits.role 只能是：lead / main / accent / support。不能使用 badge / hero / title / primary / secondary 等其他词。",
    "titleUnits.direction 只能是：horizontal / vertical。",
    "如果你想表达“徽章感”，不要把 role 写成 badge，而是在 decorationIntents 中使用 badge，或者在 hybridStrategy / whyNotTemplate 里解释。",
    "不要把中文词语切断成无意义字组。拆分必须符合语义词组。",
    "hybridStrategy、readabilityPlan、backgroundFitReason、whyNotTemplate 每项控制在 40 个中文字符以内，不要长段解释。",
    "candidate 内部不要输出 reason 字段。",
    "必须只输出 JSON，不要 Markdown，不要解释。",
  ].join("\n");
}

function buildUserPrompt(input: GenerateTitleCandidatesInput, spatialStrategy: SpatialStrategy): string {
  const patternPool = spatialStrategy.patternPool;
  const primaryAnchor = getTextAnchorById(spatialStrategy, spatialStrategy.primaryTextAnchorId)
    ?? fallbackTextAnchor(spatialStrategy.primaryTextAnchorId);
  const exampleLeadPosition = getUnitPositionInAnchor(primaryAnchor, 0, 2, 0, spatialStrategy.orientationPreference);
  const exampleMainPosition = getUnitPositionInAnchor(primaryAnchor, 1, 2, 0, spatialStrategy.orientationPreference);
  const exampleSubtitlePosition = getSubtitlePositionInAnchor(primaryAnchor);

  return [
    `mainTitle: ${input.mainTitle}`,
    `subtitle: ${input.subtitle || "未填写"}`,
    `designFamily: ${input.designFamily || "未填写"}`,
    `layoutFamily: ${input.layoutFamily || "未填写"}`,
    `displayPolicy: ${input.displayPolicy || "未填写"}`,
    `productOutputType: ${input.productOutputType || "未填写"}`,
    `eventBrief: ${input.eventBrief || "未填写"}`,
    `styleBrief: ${input.styleBrief || "未填写"}`,
    `visualDetails: ${input.visualDetails || "未填写"}`,
    `avoidNotes: ${input.avoidNotes || "未填写"}`,
    "【Spatial Strategy】",
    `contentIntent: ${spatialStrategy.contentIntent}`,
    `strategyMode: ${spatialStrategy.strategyMode}`,
    `orientationPreference: ${spatialStrategy.orientationPreference}`,
    `primaryTextAnchorId: ${spatialStrategy.primaryTextAnchorId}`,
    `secondaryTextAnchorIds: ${spatialStrategy.secondaryTextAnchorIds.join(" / ") || "无"}`,
    `patternPool.primary: ${patternPool.primary.join(" / ")}`,
    `patternPool.secondary: ${patternPool.secondary.join(" / ")}`,
    `patternPool.exploratory: ${patternPool.exploratory.join(" / ")}`,
    `patternPool.disallowed: ${patternPool.disallowed.join(" / ")}`,
    "candidateGuidance:",
    JSON.stringify(spatialStrategy.candidateGuidance, null, 2),
    "forbiddenGuidance:",
    JSON.stringify(spatialStrategy.forbiddenGuidance, null, 2),
    "backgroundLayout.textAnchors:",
    JSON.stringify(spatialStrategy.backgroundLayout.textAnchors, null, 2),
    "backgroundLayout.forbiddenZones:",
    JSON.stringify(spatialStrategy.backgroundLayout.forbiddenZones, null, 2),
    `backgroundLayout.negativeSpaceShape: ${spatialStrategy.backgroundLayout.negativeSpaceShape}`,
    `backgroundLayout.dominantFlow: ${spatialStrategy.backgroundLayout.dominantFlow}`,
    `backgroundLayout.recommendedTitleFlow: ${spatialStrategy.backgroundLayout.recommendedTitleFlow}`,
    "推荐 primary patterns 摘要：",
    JSON.stringify(getReferencePatternSummaries(patternPool.primary), null, 2),
    "可混合 secondary patterns 摘要：",
    JSON.stringify(getReferencePatternSummaries(patternPool.secondary), null, 2),
    "少量 exploratory patterns 摘要：",
    JSON.stringify(getReferencePatternSummaries(patternPool.exploratory), null, 2),
    `禁用 disallowed pattern keys：${patternPool.disallowed.join(" / ")}`,
    "输出 JSON 格式：{ \"candidates\": [TitleCandidate...] }。",
    "candidates 数组长度必须正好是 6。",
    "每个 candidate 必须包含 spatialAnchorId、strategyMode、orientationPreference。",
    "spatialAnchorId 必须来自 primaryTextAnchorId 或 secondaryTextAnchorIds。",
    "strategyMode 必须等于 Spatial Strategy 的 strategyMode。",
    "orientationPreference 必须等于 Spatial Strategy 的 orientationPreference。",
    "candidate 1-4：必须使用 primaryTextAnchorId。",
    "candidate 5-6：可以使用 secondaryTextAnchorIds，但不得脱离空间策略。",
    "每个 titleUnit 的 x/y 必须落在 spatialAnchorId 对应 textAnchor 的 box 内。",
    "x / y 使用 0-1000 全局归一化坐标，不是局部坐标。",
    "如果 orientationPreference 是 verticalFirst：至少 4 个 candidate 必须体现竖向空间组织，可以是 vertical direction，也可以是上下错落 stack，但不能 6 个全是水平一行。",
    "patternKeys 不能包含 patternPool.disallowed。",
    "即使使用 stage/business pattern，也必须沿 verticalColumn 组织字组，不要误改成国风。",
    "reference pattern 是设计语法，不是模板；背景空间策略优先。",
    "candidate 1-4：必须使用 primary patterns，可以 1 个 pattern 或 primary+primary 混合。",
    "candidate 5：可以使用 primary + secondary。",
    "candidate 6：可以使用 secondary 或 exploratory，但不能使用 disallowed。",
    "6 个 candidates 中至少 4 个必须只使用 primary patterns，最多 2 个可以使用 secondary patterns，最多 1 个可以使用 exploratory patterns。",
    "禁止使用 disallowed pattern keys。",
    "如果使用 exploratory pattern，必须在 whyNotTemplate 或 backgroundFitReason 中说明为什么它没有偏题。",
    "不允许为了变化而使用明显不相关的 pattern。",
    "reference pattern 是参考语法，不是模板；候选之间要有结构变化，但必须围绕当前活动目标。",
    "如果 designFamily 是 achievementShowcase：不要使用 modernChineseVerticalSeal，除非 eventBrief 明确是国学/诗词/传统文化。",
    "如果 designFamily 是 achievementShowcase：不要使用 campaignDiagonalImpact，除非 eventBrief 明确是招生/报名/开班提醒。",
    "如果 designFamily 是 achievementShowcase：不要使用 ipPlayfulStack，除非 eventBrief 明确是游园会/IP/轻活动。",
    "成长汇报课优先 stage / business / clean / literary 的成果展示语法。",
    "每个 candidate 必须包含 candidateId、spatialAnchorId、strategyMode、orientationPreference、patternKeys、hybridStrategy、titleUnits、effectIntent、decorationIntents、readabilityPlan、backgroundFitReason、whyNotTemplate。",
    "titleUnits 每项包含 text、role、direction、x、y、scale、rotationDeg。",
    "scale 0.7-1.8；rotationDeg -15 到 15。",
    "backgroundFitReason 必须说明它为什么适合当前背景。",
    "whyNotTemplate 必须说明它如何避免固定模板套用。",
    "如果 mainTitle 是“成长汇报课”，优先考虑：成长 / 汇报课、成长 / 汇报 / 课、成长汇报课。",
    "禁止无意义拆分，例如：成长汇 / 报课。",
    "严格字段示例：",
    JSON.stringify({
      candidateId: "c1",
      spatialAnchorId: spatialStrategy.primaryTextAnchorId,
      strategyMode: spatialStrategy.strategyMode,
      orientationPreference: spatialStrategy.orientationPreference,
      patternKeys: ["stageSplitHero"],
      hybridStrategy: "基于 stageSplitHero，将标题拆成前导词和主视觉词。",
      titleUnits: [
        {
          text: "成长",
          role: "lead",
          direction: "horizontal",
          x: exampleLeadPosition.x,
          y: exampleLeadPosition.y,
          scale: 1.2,
          rotationDeg: 0,
        },
        {
          text: "汇报课",
          role: "main",
          direction: "horizontal",
          x: exampleMainPosition.x,
          y: exampleMainPosition.y,
          scale: 1.55,
          rotationDeg: 0,
        },
      ],
      subtitle: {
        text: "看见孩子的表达力量",
        x: exampleSubtitlePosition.x,
        y: exampleSubtitlePosition.y,
        scale: 0.75,
        placement: "below",
      },
      effectIntent: "stageDepth",
      decorationIntents: ["stageLight", "smallStars"],
      readabilityPlan: "深蓝实心字加轻描边，保证聚光区域可读。",
      backgroundFitReason: "中部聚光区较干净，适合主标题成为视觉中心。",
      whyNotTemplate: "字组拆分和大小根据标题语义生成，不是固定模板。",
    }, null, 2),
    "禁止输出：\"effectIntent\": \"突出汇报课作为视觉重心\"",
    "禁止输出：\"decorationIntents\": \"利用字组大小制造层次\"",
    "禁止输出：\"role\": \"badge\"",
    "正确写法：\"effectIntent\": \"stageDepth\"",
    "正确写法：\"decorationIntents\": [\"stageLight\", \"smallStars\"]",
    "正确写法：\"role\": \"accent\"",
  ].join("\n");
}

function getReferencePatternSummaries(keys: readonly TitleReferencePatternKey[]): PatternSummary[] {
  return keys.map((key) => {
    const pattern = TITLE_REFERENCE_PATTERNS[key];

    return {
      key,
      label: pattern.label,
      family: pattern.family,
      unitPattern: pattern.unitPattern,
      flexibility: pattern.flexibility,
      candidateRole: pattern.candidateRole,
      canHybridWith: pattern.canHybridWith,
      mutationAllowed: pattern.mutationAllowed,
      promptGuidance: pattern.promptGuidance,
      templateRiskWarning: pattern.templateRiskWarning,
    };
  });
}

function parseCandidates(
  content: string | null | undefined,
  mainTitle: string,
  spatialStrategy: SpatialStrategy,
): TitleCandidate[] | undefined {
  return parseCandidatesWithDiagnostic(content, mainTitle, spatialStrategy).candidates;
}

function parseCandidatesWithDiagnostic(
  content: string | null | undefined,
  mainTitle: string,
  spatialStrategy: SpatialStrategy,
): {
  candidates?: TitleCandidate[];
  diagnostic: CandidateValidationDiagnostic;
} {
  if (!content) {
    return { diagnostic: { valid: false, reason: "empty model content" } };
  }

  try {
    return validateCandidatesWithDiagnostic(
      JSON.parse(stripJsonFence(content)),
      mainTitle,
      spatialStrategy,
      rawPreview(content),
    );
  } catch (error) {
    return {
      diagnostic: {
        valid: false,
        reason: `JSON parse failed: ${errorMessage(error)}`,
        rawPreview: rawPreview(content),
      },
    };
  }
}

export function validateCandidates(
  value: unknown,
  mainTitle: string,
  spatialStrategy: SpatialStrategy,
): TitleCandidate[] | undefined {
  return validateCandidatesWithDiagnostic(value, mainTitle, spatialStrategy).candidates;
}

function validateCandidatesWithDiagnostic(
  value: unknown,
  mainTitle: string,
  spatialStrategy: SpatialStrategy,
  preview?: string,
): {
  candidates?: TitleCandidate[];
  diagnostic: CandidateValidationDiagnostic;
} {
  if (!isRecord(value)) {
    return failure("root is not object", preview);
  }

  if (!Array.isArray(value.candidates)) {
    return failure("candidates missing or not array", preview);
  }

  if (value.candidates.length < 6) {
    return failure(`candidates count < 6: ${value.candidates.length}`, preview);
  }

  if (value.candidates.length > 12) {
    return failure(`candidates count > 12: ${value.candidates.length}`, preview);
  }

  const normalized = value.candidates.map((candidate, index) => normalizeCandidateWithReason(candidate, mainTitle, index, spatialStrategy));
  const candidates = normalized
    .map((result) => result.candidate)
    .filter((candidate): candidate is TitleCandidate => Boolean(candidate));

  if (candidates.length < 6) {
    const invalidReasons = normalized
      .filter((result) => !result.candidate)
      .map((result) => result.reason)
      .filter(isNonEmptyString)
      .slice(0, 6)
      .join("; ");

    return failure(
      `valid candidates after filtering < 6: ${candidates.length}; ${invalidReasons}`,
      preview,
    );
  }

  if (
    spatialStrategy.orientationPreference === "verticalFirst" &&
    candidates.filter(candidateUsesVerticalOrganization).length < 4
  ) {
    return failure("verticalFirst requires at least 4 candidates with vertical organization", preview);
  }

  return {
    candidates: candidates.slice(0, 12),
    diagnostic: { valid: true },
  };
}

function failure(
  reason: string,
  preview?: string,
): {
  diagnostic: CandidateValidationDiagnostic;
} {
  return {
    diagnostic: {
      valid: false,
      reason,
      ...(preview ? { rawPreview: preview } : {}),
    },
  };
}

function normalizeCandidate(
  value: unknown,
  mainTitle: string,
  index: number,
  spatialStrategy: SpatialStrategy,
): TitleCandidate | undefined {
  return normalizeCandidateWithReason(value, mainTitle, index, spatialStrategy).candidate;
}

function normalizeCandidateWithReason(
  value: unknown,
  mainTitle: string,
  index: number,
  spatialStrategy: SpatialStrategy,
): {
  candidate?: TitleCandidate;
  reason?: string;
} {
  const label = `candidate ${index + 1}`;

  if (!isRecord(value)) {
    return { reason: `${label} filtered because root is not object` };
  }

  const patternKeys = normalizePatternKeys(value.patternKeys);
  const titleUnits = normalizeTitleUnits(value.titleUnits);
  const candidateId = typeof value.candidateId === "string" && value.candidateId.trim()
    ? value.candidateId.trim()
    : `c${index + 1}`;
  const spatialAnchorId = typeof value.spatialAnchorId === "string" ? value.spatialAnchorId.trim() : "";

  if (!patternKeys) {
    return { reason: `${label} filtered because patternKeys invalid` };
  }

  if (!matchesCandidatePatternSelection(patternKeys, index, spatialStrategy.patternPool)) {
    return { reason: `${label} filtered because patternKeys invalid for selected pool` };
  }

  if (!isAllowedSpatialAnchorId(spatialStrategy, spatialAnchorId)) {
    return { reason: `${label} filtered because spatialAnchorId invalid` };
  }

  if (index < 4 && spatialAnchorId !== spatialStrategy.primaryTextAnchorId) {
    return { reason: `${label} filtered because candidate 1-4 must use primaryTextAnchorId` };
  }

  if (value.strategyMode !== spatialStrategy.strategyMode) {
    return { reason: `${label} filtered because strategyMode mismatches spatialStrategy` };
  }

  if (value.orientationPreference !== spatialStrategy.orientationPreference) {
    return { reason: `${label} filtered because orientationPreference mismatches spatialStrategy` };
  }

  if (!titleUnits) {
    return { reason: `${label} filtered because titleUnits invalid` };
  }

  const anchor = getTextAnchorById(spatialStrategy, spatialAnchorId);

  if (!anchor) {
    return { reason: `${label} filtered because spatialAnchorId has no textAnchor` };
  }

  if (titleUnits.some((unit) => !isPointInsideAnchorBox(unit.x, unit.y, anchor))) {
    return { reason: `${label} filtered because titleUnits outside spatialAnchor box` };
  }

  const joinedTitle = titleUnits.map((unit) => unit.text).join("");

  if (joinedTitle !== mainTitle) {
    return {
      reason: `${label} filtered because titleUnits joined text !== mainTitle: "${joinedTitle}" !== "${mainTitle}"`,
    };
  }

  if (!isOneOf(value.effectIntent, EFFECT_INTENTS)) {
    return { reason: `${label} filtered because effectIntent invalid` };
  }

  if (
    !Array.isArray(value.decorationIntents) ||
    !value.decorationIntents.every((item) => isOneOf(item, DECORATION_INTENTS))
  ) {
    return { reason: `${label} filtered because decorationIntents invalid` };
  }

  if (
    !isNonEmptyString(value.hybridStrategy) ||
    !isNonEmptyString(value.readabilityPlan) ||
    !isNonEmptyString(value.backgroundFitReason) ||
    !isNonEmptyString(value.whyNotTemplate)
  ) {
    return { reason: `${label} filtered because required text fields missing` };
  }

  const subtitle = normalizeSubtitle(value.subtitle);

  return {
    candidate: {
      candidateId,
      spatialAnchorId,
      strategyMode: spatialStrategy.strategyMode,
      orientationPreference: spatialStrategy.orientationPreference,
      patternKeys,
      hybridStrategy: value.hybridStrategy.trim(),
      titleUnits,
      ...(subtitle ? { subtitle } : {}),
      effectIntent: value.effectIntent,
      decorationIntents: value.decorationIntents,
      readabilityPlan: value.readabilityPlan.trim(),
      backgroundFitReason: value.backgroundFitReason.trim(),
      whyNotTemplate: value.whyNotTemplate.trim(),
    },
  };
}

function normalizePatternKeys(value: unknown): TitleReferencePatternKey[] | undefined {
  if (!Array.isArray(value) || value.length < 1 || value.length > 3) {
    return undefined;
  }

  return value.every((key) => isOneOf(key, PATTERN_KEYS))
    ? value
    : undefined;
}

function matchesCandidatePatternSelection(
  patternKeys: TitleReferencePatternKey[],
  index: number,
  patternSelection: SpatialStrategy["patternPool"],
): boolean {
  if (patternKeys.some((key) => patternSelection.disallowed.includes(key))) {
    return false;
  }

  if (index < 4) {
    return patternKeys.every((key) => patternSelection.primary.includes(key));
  }

  if (index === 4) {
    return patternKeys.every((key) => (
      patternSelection.primary.includes(key) ||
      patternSelection.secondary.includes(key)
    ));
  }

  return patternKeys.every((key) => (
    patternSelection.primary.includes(key) ||
    patternSelection.secondary.includes(key) ||
    patternSelection.exploratory.includes(key)
  ));
}

function getAllowedSpatialAnchorIds(spatialStrategy: SpatialStrategy): string[] {
  return [spatialStrategy.primaryTextAnchorId, ...spatialStrategy.secondaryTextAnchorIds]
    .filter((id, index, ids) => id.trim().length > 0 && ids.indexOf(id) === index);
}

function isAllowedSpatialAnchorId(spatialStrategy: SpatialStrategy, spatialAnchorId: string): boolean {
  return getAllowedSpatialAnchorIds(spatialStrategy).includes(spatialAnchorId);
}

function getTextAnchorById(
  spatialStrategy: SpatialStrategy,
  spatialAnchorId: string,
): TextAnchor | undefined {
  const anchor = spatialStrategy.backgroundLayout.textAnchors.find((item) => item.id === spatialAnchorId);

  if (anchor) {
    return anchor;
  }

  return spatialAnchorId === spatialStrategy.primaryTextAnchorId
    ? fallbackTextAnchor(spatialAnchorId)
    : undefined;
}

function fallbackTextAnchor(id: string): TextAnchor {
  return {
    id,
    safeZoneId: "fallbackCenterSafeZone",
    x: 260,
    y: 160,
    width: 480,
    height: 520,
    preferredOrientation: "vertical",
    recommendedTitleFlow: "followShape",
    priority: 1,
    confidence: 0.5,
    reason: "fallback text anchor for title candidate generation.",
  };
}

function isPointInsideAnchorBox(x: number, y: number, anchor: TextAnchor): boolean {
  return (
    x >= anchor.x &&
    y >= anchor.y &&
    x <= anchor.x + anchor.width &&
    y <= anchor.y + anchor.height
  );
}

function candidateUsesVerticalOrganization(candidate: TitleCandidate): boolean {
  if (candidate.titleUnits.some((unit) => unit.direction === "vertical")) {
    return true;
  }

  if (candidate.titleUnits.length < 2) {
    return false;
  }

  const yValues = candidate.titleUnits.map((unit) => unit.y);
  const yRange = Math.max(...yValues) - Math.min(...yValues);

  return yRange >= 80;
}

function normalizeTitleUnits(value: unknown): TitleCandidateUnit[] | undefined {
  if (!Array.isArray(value) || value.length < 1 || value.length > 6) {
    return undefined;
  }

  const units = value.map(normalizeTitleUnit);

  return units.every(Boolean) ? units as TitleCandidateUnit[] : undefined;
}

function normalizeTitleUnit(value: unknown): TitleCandidateUnit | undefined {
  if (!isRecord(value) || !isNonEmptyString(value.text)) {
    return undefined;
  }

  if (
    !isOneOf(value.role, UNIT_ROLES) ||
    !isOneOf(value.direction, UNIT_DIRECTIONS) ||
    !isCoordinate(value.x) ||
    !isCoordinate(value.y) ||
    !isScale(value.scale) ||
    !isRotation(value.rotationDeg)
  ) {
    return undefined;
  }

  return {
    text: value.text,
    role: value.role,
    direction: value.direction,
    x: value.x,
    y: value.y,
    scale: value.scale,
    rotationDeg: value.rotationDeg,
  };
}

function normalizeSubtitle(value: unknown): TitleCandidateSubtitle | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (!isRecord(value) || typeof value.text !== "string") {
    return undefined;
  }

  if (
    !isCoordinate(value.x) ||
    !isCoordinate(value.y) ||
    !isScale(value.scale) ||
    !isOneOf(value.placement, SUBTITLE_PLACEMENTS)
  ) {
    return undefined;
  }

  return {
    text: value.text,
    x: value.x,
    y: value.y,
    scale: value.scale,
    placement: value.placement,
  };
}

function fallback(
  input: GenerateTitleCandidatesInput,
  reason: string,
  spatialStrategy: SpatialStrategy,
): GenerateTitleCandidatesResult {
  const rawCandidates = buildFallbackCandidates(input, spatialStrategy);
  const candidates = validateCandidates({ candidates: rawCandidates }, input.mainTitle, spatialStrategy) ?? rawCandidates;

  return { source: "fallback", candidates, reason, spatialStrategy };
}

function buildFallbackCandidates(
  input: GenerateTitleCandidatesInput,
  spatialStrategy: SpatialStrategy,
): TitleCandidate[] {
  const patternGroups = getFallbackPatternGroups(spatialStrategy);
  const semanticSplits = getSemanticTitleSplits(input.mainTitle);
  const anchor = getTextAnchorById(spatialStrategy, spatialStrategy.primaryTextAnchorId)
    ?? fallbackTextAnchor(spatialStrategy.primaryTextAnchorId);

  return patternGroups.map((patternKeys, index) => {
    const titleUnits = buildFallbackUnits(
      semanticSplits[index % semanticSplits.length],
      index,
      anchor,
      spatialStrategy.orientationPreference,
    );
    const subtitlePosition = getSubtitlePositionInAnchor(anchor);
    const subtitle = input.subtitle
      ? {
          text: input.subtitle,
          x: subtitlePosition.x,
          y: subtitlePosition.y,
          scale: 0.76,
          placement: "below" as const,
        }
      : undefined;

    return {
      candidateId: `fallback-${index + 1}`,
      spatialAnchorId: spatialStrategy.primaryTextAnchorId,
      strategyMode: spatialStrategy.strategyMode,
      orientationPreference: spatialStrategy.orientationPreference,
      patternKeys,
      hybridStrategy: `基于 ${patternKeys.join(" + ")} 组合生成字组节奏，不做固定模板套用。`,
      titleUnits,
      ...(subtitle ? { subtitle } : {}),
      effectIntent: getFallbackEffectIntent(patternKeys[0]),
      decorationIntents: getFallbackDecorationIntents(patternKeys[0]),
      readabilityPlan: "使用品牌安全字体、实心标题、轻描边或阴影，保证背景上可读。",
      backgroundFitReason: "回退候选按参考语法生成多个重心和字组结构，便于后续预览筛选。",
      whyNotTemplate: "字组数量、比例、位置和参考模式组合会随标题和设计家族变化，不是固定模板 12 选 1。",
    };
  });
}

function getFallbackPatternGroups(spatialStrategy: SpatialStrategy): TitleReferencePatternKey[][] {
  const primary = spatialStrategy.patternPool.primary;
  const secondary = spatialStrategy.patternPool.secondary;
  const exploratory = spatialStrategy.patternPool.exploratory;
  const primaryFallback = primary[0] || "cleanBrandCentered";
  const secondaryFallback = secondary[0] || primaryFallback;
  const exploratoryFallback = exploratory[0] || secondaryFallback;

  return [
    [primaryFallback],
    [primary[1] || primaryFallback],
    [primary[2] || primaryFallback],
    [primaryFallback, primary[1] || primaryFallback],
    [primaryFallback, secondaryFallback],
    [secondaryFallback, exploratoryFallback],
  ];
}

function buildFallbackUnits(
  parts: string[],
  candidateIndex: number,
  anchor: TextAnchor,
  orientationPreference: TitleOrientationPreference,
): TitleCandidateUnit[] {
  return parts.map((text, index) => {
    const position = getUnitPositionInAnchor(anchor, index, parts.length, candidateIndex, orientationPreference);
    const verticalFirst = orientationPreference === "verticalFirst";

    return {
      text,
      role: getFallbackUnitRole(index, parts.length),
      direction: verticalFirst && candidateIndex !== 2 ? "vertical" : "horizontal",
      x: position.x,
      y: position.y,
      scale: Math.min(1.8, 1 + index * 0.18 + (candidateIndex % 2) * 0.08),
      rotationDeg: orientationPreference === "diagonalAllowed" && candidateIndex % 3 === 2 ? -6 : 0,
    };
  });
}

function getUnitPositionInAnchor(
  anchor: TextAnchor,
  unitIndex: number,
  unitCount: number,
  candidateIndex: number,
  orientationPreference: TitleOrientationPreference,
): AnchorPosition {
  if (orientationPreference === "verticalFirst") {
    return {
      x: anchorX(anchor, 0.5 + (unitIndex - (unitCount - 1) / 2) * 0.14),
      y: anchorY(anchor, 0.2 + unitIndex * (0.58 / Math.max(1, unitCount - 1)) + candidateIndex * 0.015),
    };
  }

  if (orientationPreference === "horizontalFirst") {
    return {
      x: anchorX(anchor, 0.2 + unitIndex * (0.6 / Math.max(1, unitCount - 1))),
      y: anchorY(anchor, 0.42 + candidateIndex * 0.04),
    };
  }

  if (orientationPreference === "diagonalAllowed") {
    return {
      x: anchorX(anchor, 0.18 + unitIndex * (0.62 / Math.max(1, unitCount - 1))),
      y: anchorY(anchor, 0.25 + unitIndex * 0.18 + candidateIndex * 0.025),
    };
  }

  return {
    x: anchorX(anchor, 0.5),
    y: anchorY(anchor, 0.22 + unitIndex * (0.5 / Math.max(1, unitCount - 1)) + candidateIndex * 0.02),
  };
}

function getSubtitlePositionInAnchor(anchor: TextAnchor): AnchorPosition {
  return {
    x: anchorX(anchor, 0.5),
    y: anchorY(anchor, 0.86),
  };
}

function anchorX(anchor: TextAnchor, ratio: number): number {
  return Math.round(clamp(anchor.x + anchor.width * ratio, anchor.x + 1, anchor.x + anchor.width - 1));
}

function anchorY(anchor: TextAnchor, ratio: number): number {
  return Math.round(clamp(anchor.y + anchor.height * ratio, anchor.y + 1, anchor.y + anchor.height - 1));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function getSemanticTitleSplits(title: string): string[][] {
  if (title === "成长汇报课") {
    return [["成长", "汇报课"], ["成长", "汇报", "课"], ["成长汇报课"]];
  }

  if (title === "国学少年说") {
    return [["国学", "少年说"], ["国学少年说"]];
  }

  if (title === "春季新班招生") {
    return [["春季", "新班", "招生"], ["春季", "新班招生"], ["春季新班招生"]];
  }

  if (title === "暑假文学营") {
    return [["暑假", "文学营"], ["暑假文学营"]];
  }

  if (title === "诗词游园会") {
    return [["诗词", "游园会"], ["诗词游园会"]];
  }

  const suffixes = [
    "新班招生",
    "汇报课",
    "体验课",
    "公开课",
    "读书会",
    "游园会",
    "文学营",
    "少年说",
    "招生",
  ];
  const suffix = suffixes.find((item) => title.endsWith(item) && title.length > item.length);

  if (!suffix) {
    return [[title]];
  }

  const prefix = title.slice(0, title.length - suffix.length);

  return [[prefix, suffix], [title]];
}

function getFallbackUnitRole(index: number, unitCount: number): TitleCandidateUnitRole {
  if (unitCount === 1) return "main";
  if (index === 0) return "lead";
  if (index === unitCount - 1) return "main";
  return "accent";
}

function getFallbackEffectIntent(patternKey: TitleReferencePatternKey): TitleCandidateEffectIntent {
  const family = TITLE_REFERENCE_PATTERNS[patternKey].family;

  if (family === "stage" || family === "business") return "stageDepth";
  if (family === "chinese") return "chineseSeal";
  if (family === "campaign") return "campaignImpact";
  if (family === "literary") return "editorialSoft";
  if (family === "ip") return "playfulBadge";
  return "cleanReadable";
}

function getFallbackDecorationIntents(
  patternKey: TitleReferencePatternKey,
): TitleCandidateDecorationIntent[] {
  const family = TITLE_REFERENCE_PATTERNS[patternKey].family;

  if (family === "stage" || family === "business") return ["stageLight", "smallStars"];
  if (family === "chinese") return ["goldLine", "sealStamp"];
  if (family === "campaign") return ["campaignLabel", "growthArrow", "colorBlock"];
  if (family === "literary") return ["paperTag", "bookMark"];
  if (family === "ip") return ["badge", "playfulDot"];
  return ["none"];
}

function buildImageUrl(base64: string): string {
  const trimmed = base64.trim();
  return trimmed.startsWith("data:") ? trimmed : `data:image/jpeg;base64,${trimmed}`;
}

function stripJsonFence(content: string): string {
  return content.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "");
}

function formatDiagnostic(diagnostic: CandidateValidationDiagnostic): string {
  const reason = diagnostic.reason || "unknown validation failure";
  return diagnostic.rawPreview
    ? `${reason}; rawPreview: ${diagnostic.rawPreview}`
    : reason;
}

function rawPreview(content: string): string {
  return sanitizeDiagnosticText(content, 2000);
}

function errorMessage(error: unknown): string {
  const rawMessage = error instanceof Error ? error.message : String(error);
  return sanitizeDiagnosticText(rawMessage, 500);
}

function sanitizeDiagnosticText(value: string, maxLength: number): string {
  const apiKey = process.env.OPENAI_API_KEY;
  const withoutApiKey = apiKey ? value.replaceAll(apiKey, "[redacted]") : value;
  const withoutDataImage = withoutApiKey.replace(/data:image\/[a-zA-Z+.-]+;base64,[A-Za-z0-9+/=]+/g, "[redacted-image]");
  const withoutLongToken = withoutDataImage.replace(/[A-Za-z0-9+/]{200,}={0,2}/g, "[redacted-long-token]");

  return withoutLongToken.slice(0, maxLength);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isCoordinate(value: unknown): value is number {
  return isFiniteNumber(value) && value >= 0 && value <= 1000;
}

function isScale(value: unknown): value is number {
  return isFiniteNumber(value) && value >= 0.7 && value <= 1.8;
}

function isRotation(value: unknown): value is number {
  return isFiniteNumber(value) && value >= -15 && value <= 15;
}

function isOneOf<T extends string>(value: unknown, allowed: readonly T[]): value is T {
  return typeof value === "string" && allowed.includes(value as T);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
