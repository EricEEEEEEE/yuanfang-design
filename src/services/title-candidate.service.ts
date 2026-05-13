import OpenAI from "openai";
import { MODELS } from "@/config/models";
import {
  TITLE_REFERENCE_PATTERNS,
  type TitlePatternCandidateRole,
  type TitlePatternMutation,
  type TitleReferencePatternKey,
} from "@/config/title-reference-patterns";

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

const UNIT_ROLES: readonly TitleCandidateUnitRole[] = ["lead", "main", "accent", "support"];
const UNIT_DIRECTIONS: readonly TitleCandidateUnitDirection[] = ["horizontal", "vertical"];
const SUBTITLE_PLACEMENTS: readonly TitleCandidateSubtitle["placement"][] = ["below", "side", "verticalSide", "none"];
const EFFECT_INTENTS: readonly TitleCandidateEffectIntent[] = ["stageDepth", "cleanReadable", "chineseSeal", "campaignImpact", "editorialSoft", "playfulBadge"];
const DECORATION_INTENTS: readonly TitleCandidateDecorationIntent[] = ["none", "stageLight", "smallStars", "medalLine", "goldLine", "sealStamp", "paperTag", "bookMark", "campaignLabel", "growthArrow", "colorBlock", "badge", "playfulDot"];
const PATTERN_KEYS = Object.keys(TITLE_REFERENCE_PATTERNS) as TitleReferencePatternKey[];

export async function generateTitleCandidates(
  input: GenerateTitleCandidatesInput,
): Promise<GenerateTitleCandidatesResult> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return fallback(input, "OPENAI_API_KEY missing; used reference-pattern fallback candidates.");
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
            { type: "text", text: buildUserPrompt(input) },
            { type: "image_url", image_url: { url: buildImageUrl(input.backgroundImageBase64), detail: "low" } },
          ],
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.65,
    });
    const candidates = parseCandidates(
      response.choices[0]?.message?.content,
      input.mainTitle,
    );

    if (!candidates) {
      return fallback(input, "AI title candidate output invalid; used fallback candidates.");
    }

    return { source: "ai", candidates, reason: "AI generated 6-12 validated reference-driven title candidates." };
  } catch {
    return fallback(input, "AI title candidate generation failed; used fallback candidates.");
  }
}

function buildSystemPrompt(): string {
  return [
    "你是远方智设的标题候选生成器。",
    "你不是排版员，不是模板选择器，不能生成图片。",
    "你不能改写中文标题；不能增字、漏字、改字。",
    "你必须基于 reference patterns 生成 6-12 个标题候选。",
    "reference patterns 是参考语法，不是固定模板，不能做固定 12 选 1。",
    "每个 candidate 可以基于 1-3 个 reference pattern 组合、变形和生成。",
    "每个 candidate 必须包含字组级 titleUnits。",
    "每个 candidate 的 titleUnits.text 按顺序拼接后必须等于 mainTitle。",
    "不要只横排一整行、竖排一整列、整句斜着放。",
    "候选之间必须有明显结构差异。",
    "必须只输出 JSON，不要 Markdown，不要解释。",
  ].join("\n");
}

function buildUserPrompt(input: GenerateTitleCandidatesInput): string {
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
    "可用 reference patterns 摘要：",
    JSON.stringify(getReferencePatternSummaries(), null, 2),
    "输出 JSON 格式：{ \"candidates\": [TitleCandidate...] }。",
    "每个 candidate 必须包含 candidateId、patternKeys、hybridStrategy、titleUnits、effectIntent、decorationIntents、readabilityPlan、backgroundFitReason、whyNotTemplate。",
    "titleUnits 每项包含 text、role、direction、x、y、scale、rotationDeg。",
    "x / y 使用 0-1000 局部归一化坐标；scale 0.7-1.8；rotationDeg -15 到 15。",
    "backgroundFitReason 必须说明它为什么适合当前背景。",
    "whyNotTemplate 必须说明它如何避免固定模板套用。",
  ].join("\n");
}

function getReferencePatternSummaries(): PatternSummary[] {
  return PATTERN_KEYS.map((key) => {
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
): TitleCandidate[] | undefined {
  if (!content) {
    return undefined;
  }

  try {
    return validateCandidates(JSON.parse(stripJsonFence(content)), mainTitle);
  } catch {
    return undefined;
  }
}

export function validateCandidates(
  value: unknown,
  mainTitle: string,
): TitleCandidate[] | undefined {
  if (!isRecord(value) || !Array.isArray(value.candidates)) {
    return undefined;
  }

  if (value.candidates.length < 6 || value.candidates.length > 12) {
    return undefined;
  }

  const candidates = value.candidates
    .map((candidate, index) => normalizeCandidate(candidate, mainTitle, index))
    .filter((candidate): candidate is TitleCandidate => Boolean(candidate));

  return candidates.length >= 6 ? candidates.slice(0, 12) : undefined;
}

function normalizeCandidate(
  value: unknown,
  mainTitle: string,
  index: number,
): TitleCandidate | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const patternKeys = normalizePatternKeys(value.patternKeys);
  const titleUnits = normalizeTitleUnits(value.titleUnits);
  const candidateId = typeof value.candidateId === "string" && value.candidateId.trim()
    ? value.candidateId.trim()
    : `c${index + 1}`;

  if (
    !patternKeys ||
    !titleUnits ||
    titleUnits.map((unit) => unit.text).join("") !== mainTitle ||
    !isNonEmptyString(value.hybridStrategy) ||
    !isOneOf(value.effectIntent, EFFECT_INTENTS) ||
    !Array.isArray(value.decorationIntents) ||
    !value.decorationIntents.every((item) => isOneOf(item, DECORATION_INTENTS)) ||
    !isNonEmptyString(value.readabilityPlan) ||
    !isNonEmptyString(value.backgroundFitReason) ||
    !isNonEmptyString(value.whyNotTemplate)
  ) {
    return undefined;
  }

  const subtitle = normalizeSubtitle(value.subtitle);

  if (value.subtitle !== undefined && !subtitle) {
    return undefined;
  }

  return {
    candidateId,
    patternKeys,
    hybridStrategy: value.hybridStrategy.trim(),
    titleUnits,
    ...(subtitle ? { subtitle } : {}),
    effectIntent: value.effectIntent,
    decorationIntents: value.decorationIntents,
    readabilityPlan: value.readabilityPlan.trim(),
    backgroundFitReason: value.backgroundFitReason.trim(),
    whyNotTemplate: value.whyNotTemplate.trim(),
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
): GenerateTitleCandidatesResult {
  const rawCandidates = buildFallbackCandidates(input);
  const candidates = validateCandidates({ candidates: rawCandidates }, input.mainTitle) ?? rawCandidates;

  return { source: "fallback", candidates, reason };
}

function buildFallbackCandidates(input: GenerateTitleCandidatesInput): TitleCandidate[] {
  const patternGroups = getFallbackPatternGroups(input.designFamily);

  return patternGroups.map((patternKeys, index) => {
    const unitCount = index % 3 === 0 ? 2 : index % 3 === 1 ? 3 : 1;
    const titleUnits = buildFallbackUnits(input.mainTitle, unitCount, index);
    const subtitle = input.subtitle
      ? {
          text: input.subtitle,
          x: 350 + index * 22,
          y: 430 + index * 18,
          scale: 0.76,
          placement: "below" as const,
        }
      : undefined;

    return {
      candidateId: `fallback-${index + 1}`,
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

function getFallbackPatternGroups(designFamily?: string): TitleReferencePatternKey[][] {
  const base = getFallbackPatternKeys(designFamily);

  return [
    [base[0]],
    [base[1]],
    [base[2]],
    [base[0], base[1]],
    [base[0], base[2]],
    [base[1], base[2]],
  ];
}

function getFallbackPatternKeys(designFamily?: string): TitleReferencePatternKey[] {
  if (designFamily === "achievementShowcase") return ["stageSplitHero", "stageMedalTitle", "businessLaunchHero"];
  if (designFamily === "businessLaunch") return ["businessLaunchHero", "stageSplitHero", "cleanBrandCentered"];
  if (designFamily === "modernChinese") return ["modernChineseVerticalSeal", "modernChineseScrollTitle", "literaryMagazineBlock"];
  if (designFamily === "boldCampaign") return ["campaignDiagonalImpact", "campaignTagStack", "businessLaunchHero"];
  if (designFamily === "literaryEditorial") return ["literaryMagazineBlock", "literaryBookTitle", "modernChineseScrollTitle"];
  if (designFamily === "ipCartoonEvent") return ["ipPlayfulStack", "ipBadgeTitle", "campaignTagStack"];

  return ["cleanBrandCentered", "businessLaunchHero", "literaryBookTitle"];
}

function buildFallbackUnits(
  mainTitle: string,
  requestedUnitCount: number,
  candidateIndex: number,
): TitleCandidateUnit[] {
  const parts = splitTitleIntoUnits(mainTitle, requestedUnitCount);

  return parts.map((text, index) => ({
    text,
    role: getFallbackUnitRole(index, parts.length),
    direction: candidateIndex % 4 === 1 ? "vertical" : "horizontal",
    x: Math.min(900, 160 + index * 190 + candidateIndex * 18),
    y: Math.min(900, 220 + index * 42 + candidateIndex * 24),
    scale: Math.min(1.8, 1 + index * 0.18 + (candidateIndex % 2) * 0.08),
    rotationDeg: candidateIndex % 3 === 2 ? -6 : 0,
  }));
}

function splitTitleIntoUnits(title: string, requestedUnitCount: number): string[] {
  const characters = Array.from(title);
  const unitCount = Math.max(1, Math.min(requestedUnitCount, characters.length, 6));
  const baseSize = Math.floor(characters.length / unitCount);
  const remainder = characters.length % unitCount;
  const parts: string[] = [];
  let offset = 0;

  for (let index = 0; index < unitCount; index += 1) {
    const size = baseSize + (index < remainder ? 1 : 0);
    parts.push(characters.slice(offset, offset + size).join(""));
    offset += size;
  }

  return parts.filter(Boolean);
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
