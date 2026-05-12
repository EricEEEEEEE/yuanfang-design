import OpenAI from "openai";
import { STANDARD_FONT_LIBRARY, type StandardFontKey } from "@/config/font-library";
import { MODELS } from "@/config/models";
import { TITLE_DIRECTOR_PRESETS, type TitleDecorationKey, type TitleDirectorDecision, type TitleEmphasisMode, type TitleLineBreakMode, type TitlePlacementKey, type TitleReadabilitySupport, type TitleScaleLevel } from "@/config/title-director";
import { STANDARD_TITLE_ART_STYLES, type StandardTitleArtStyleKey } from "@/config/title-art-styles";

export type ResolveTitleDirectorInput = {
  backgroundImageBase64: string;
  mainTitle: string;
  subtitle?: string;
  designFamily?: string;
  layoutFamily?: string;
  displayPolicy?: string;
  titleArtStyle?: string;
  titleDirectorPreset?: string;
  productOutputType?: string;
  eventBrief?: string;
  styleBrief?: string;
  visualDetails?: string;
  avoidNotes?: string;
};

export type ResolveTitleDirectorResult = {
  source: "ai" | "fallback";
  decision: TitleDirectorDecision;
  reason: string;
};

const PLACEMENTS: readonly TitlePlacementKey[] = ["topCenter", "topLeft", "centerHero", "leftBlock", "rightBlock", "bottomHero", "editorialTop", "sealTitle"];
const SCALES: readonly TitleScaleLevel[] = ["normal", "large", "hero"];
const LINE_BREAK_MODES: readonly TitleLineBreakMode[] = ["auto", "balanced", "shortLines", "singleLinePreferred"];
const EMPHASIS_MODES: readonly TitleEmphasisMode[] = ["solidHero", "outlinedReadable", "editorial", "campaignImpact", "chineseSeal", "cleanReadable"];
const READABILITY: readonly TitleReadabilitySupport[] = ["none", "lightShadow", "shadowAndStroke", "softGlow", "subtleOverlay"];
const DECORATIONS: readonly TitleDecorationKey[] = ["none", "stageLight", "smallStars", "goldLine", "sealStamp", "paperTag", "bookMark", "campaignLabel", "growthArrow"];
const FONT_KEYS = Object.keys(STANDARD_FONT_LIBRARY) as StandardFontKey[];
const TITLE_ART_KEYS = Object.keys(STANDARD_TITLE_ART_STYLES) as StandardTitleArtStyleKey[];

export async function resolveTitleDirector(
  input: ResolveTitleDirectorInput,
): Promise<ResolveTitleDirectorResult> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return fallback(input, "OPENAI_API_KEY missing; used rule-based title director.");
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
      temperature: 0.2,
    });
    const content = response.choices[0]?.message?.content;
    const decision = parseDecision(content);

    if (!decision) {
      return fallback(input, "AI title director returned invalid JSON; used fallback.");
    }

    return { source: "ai", decision, reason: decision.reason };
  } catch {
    return fallback(input, "AI title director failed; used fallback.");
  }
}

function buildSystemPrompt(): string {
  return [
    "你是“远方智设”的标题导演。",
    "你不能生成图片，不能生成中文标题文字，也不能修改主标题或副标题内容。",
    "你只能根据背景图和结构化 brief，选择 Sharp 后期标题合成参数。",
    "必须只输出 JSON，不要 Markdown，不要解释。",
    `placement 只能选：${PLACEMENTS.join(" / ")}`,
    `fontKey 只能选：${FONT_KEYS.join(" / ")}`,
    `titleArtStyle 只能选：${TITLE_ART_KEYS.join(" / ")}`,
    `titleScale 和 subtitleScale 只能选：${SCALES.join(" / ")}`,
    `lineBreakMode 只能选：${LINE_BREAK_MODES.join(" / ")}`,
    `emphasisMode 只能选：${EMPHASIS_MODES.join(" / ")}`,
    `readabilitySupport 只能选：${READABILITY.join(" / ")}`,
    `decorations 只能从这些值组成数组：${DECORATIONS.join(" / ")}`,
  ].join("\n");
}

function buildUserPrompt(input: ResolveTitleDirectorInput): string {
  return [
    `主标题：${input.mainTitle}`,
    `副标题：${input.subtitle || "未填写"}`,
    `设计家族：${input.designFamily || "未填写"}`,
    `版式家族：${input.layoutFamily || "未填写"}`,
    `显示策略：${input.displayPolicy || "未填写"}`,
    `当前标题艺术风格：${input.titleArtStyle || "未填写"}`,
    `当前标题导演预设：${input.titleDirectorPreset || "未填写"}`,
    `物料类型：${input.productOutputType || "未填写"}`,
    `活动内容：${input.eventBrief || "未填写"}`,
    `风格倾向：${input.styleBrief || "未填写"}`,
    `画面元素：${input.visualDetails || "未填写"}`,
    `规避内容：${input.avoidNotes || "未填写"}`,
    "请只输出 JSON，格式包含 placement、fontKey、titleArtStyle、titleScale、subtitleScale、lineBreakMode、emphasisMode、readabilitySupport、decorations、reason。",
  ].join("\n");
}

function parseDecision(content?: string | null): TitleDirectorDecision | undefined {
  if (!content) {
    return undefined;
  }

  try {
    const parsed: unknown = JSON.parse(stripJsonFence(content));
    return validateDecision(parsed);
  } catch {
    return undefined;
  }
}

function validateDecision(value: unknown): TitleDirectorDecision | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  if (
    !isOneOf(value.placement, PLACEMENTS) ||
    !isOneOf(value.fontKey, FONT_KEYS) ||
    !isOneOf(value.titleArtStyle, TITLE_ART_KEYS) ||
    !isOneOf(value.titleScale, SCALES) ||
    !isOneOf(value.subtitleScale, SCALES) ||
    !isOneOf(value.lineBreakMode, LINE_BREAK_MODES) ||
    !isOneOf(value.emphasisMode, EMPHASIS_MODES) ||
    !isOneOf(value.readabilitySupport, READABILITY) ||
    !Array.isArray(value.decorations) ||
    !value.decorations.every((item) => isOneOf(item, DECORATIONS)) ||
    typeof value.reason !== "string" ||
    value.reason.trim().length === 0
  ) {
    return undefined;
  }

  return { placement: value.placement, fontKey: value.fontKey, titleArtStyle: value.titleArtStyle, titleScale: value.titleScale, subtitleScale: value.subtitleScale, lineBreakMode: value.lineBreakMode, emphasisMode: value.emphasisMode, readabilitySupport: value.readabilitySupport, decorations: value.decorations, reason: value.reason.trim() };
}

function fallback(
  input: ResolveTitleDirectorInput,
  reason: string,
): ResolveTitleDirectorResult {
  const presetKey = getFallbackPresetKey(input.titleDirectorPreset, input.designFamily);
  return { source: "fallback", decision: TITLE_DIRECTOR_PRESETS[presetKey].decision, reason };
}

function getFallbackPresetKey(titleDirectorPreset?: string, designFamily?: string): string {
  if (titleDirectorPreset && TITLE_DIRECTOR_PRESETS[titleDirectorPreset]) return titleDirectorPreset;
  if (designFamily === "achievementShowcase" || designFamily === "businessLaunch") return "stageHero";
  if (designFamily === "modernChinese") return "modernChineseSeal";
  if (designFamily === "boldCampaign") return "campaignImpact";
  if (designFamily === "literaryEditorial") return "literaryEditorial";
  if (designFamily === "ipCartoonEvent") return "ipEventPlayful";
  return "cleanBrand";
}

function buildImageUrl(base64: string): string {
  const trimmed = base64.trim();
  return trimmed.startsWith("data:") ? trimmed : `data:image/jpeg;base64,${trimmed}`;
}

function stripJsonFence(content: string): string {
  return content.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "");
}

function isOneOf<T extends string>(value: unknown, allowed: readonly T[]): value is T {
  return typeof value === "string" && allowed.includes(value as T);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
