import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { StandardElementKey, StandardStyleKey, StandardThemeKey } from "@/config/scenes";
import type { ProductOutputType, StandardDesignBriefPromptFields } from "@/models/design-brief";
import {
  assertBaseTemplate,
  assertBrandRulesTemplate,
  assertPromptFragmentMap,
  TEMPLATE_INVALID,
  type BaseTemplate,
  type BrandRulesTemplate,
  type PromptFragmentMap,
} from "@/utils/template-validation";

export type StandardPromptInput = {
  theme: StandardThemeKey;
  style: StandardStyleKey;
  element: StandardElementKey;
  productOutputType?: ProductOutputType;
  eventBrief?: string;
  styleBrief?: string;
  visualDetails?: string;
  avoidNotes?: string;
  visualBrief?: string;
  mainTitle: string;
  subtitle?: string;
  campusName: string;
  campusAddress?: string;
  campusPhone: string;
};
export type StandardPromptOverlayData = {
  mainTitle: string;
  subtitle?: string;
  campusName: string;
  campusAddress?: string;
  campusPhone: string;
};
export type BuildStandardPromptResult = {
  prompt: string;
  overlayData: StandardPromptOverlayData;
  templateMeta: { theme: StandardThemeKey; style: StandardStyleKey; element: StandardElementKey };
};
const INVALID_TEMPLATE_INPUT = "INVALID_TEMPLATE_INPUT";
const TEMPLATE_NOT_FOUND = "TEMPLATE_NOT_FOUND";
const baseTemplate = loadTemplate<BaseTemplate>("templates/_base.json", assertBaseTemplate);
const brandRules = loadTemplate<BrandRulesTemplate>("templates/_brand-rules.json", assertBrandRulesTemplate);
const themeTemplates = loadTemplate<PromptFragmentMap>("templates/standard/themes.json", assertPromptFragmentMap);
const styleTemplates = loadTemplate<PromptFragmentMap>("templates/standard/styles.json", assertPromptFragmentMap);
const elementTemplates = loadTemplate<PromptFragmentMap>("templates/standard/elements.json", assertPromptFragmentMap);

export function buildStandardPrompt(input: StandardPromptInput): BuildStandardPromptResult {
  const overlayData = buildOverlayData(input);
  const themeTemplate = themeTemplates[input.theme];
  const styleTemplate = styleTemplates[input.style];
  const elementTemplate = elementTemplates[input.element];
  const structuredBriefPrompt = buildStructuredBriefPrompt(input);
  const visualBrief = normalizeOptionalText(input.visualBrief);
  const visualBriefPrompt = visualBrief
    ? [
        "",
        "【视觉主题参考】",
        visualBrief,
        "以上内容只作为画面主题和意象参考，不得生成任何文字、标题、Logo、二维码、电话或校区信息。",
      ]
    : [];

  if (!themeTemplate || !styleTemplate || !elementTemplate) {
    throw new Error(TEMPLATE_NOT_FOUND);
  }

  return {
    prompt: [
      "【品牌视觉规则】",
      `品牌名称：${brandRules.brandName}`,
      `英文名称：${brandRules.englishName}`,
      `品牌精神：${brandRules.brandSpirit.join("、")}`,
      `品牌颜色：${formatColors(brandRules.colors)}`,
      `视觉语言：${brandRules.visualLanguage.join("、")}`,
      `可用视觉母题：${brandRules.allowedVisualMotifs.join("、")}`,
      `Logo 规则：${brandRules.logoRules.join("；")}`,
      `吉祥物规则：${brandRules.mascotRules.join("；")}`,
      "",
      "【AI 生成边界】",
      baseTemplate.basePrompt,
      ...structuredBriefPrompt,
      "",
      "【主题场景】",
      themeTemplate.prompt,
      "",
      "【视觉风格】",
      styleTemplate.prompt,
      "",
      "【画面元素】",
      elementTemplate.prompt,
      ...visualBriefPrompt,
      "",
      "【版式要求】",
      baseTemplate.layoutPrompt,
      "",
      "【禁止项】",
      baseTemplate.negativePrompt.join("\n"),
    ].join("\n"),
    overlayData,
    templateMeta: {
      theme: input.theme,
      style: input.style,
      element: input.element,
    },
  };
}

function buildStructuredBriefPrompt(input: StandardPromptInput): string[] {
  const hasStructuredBrief =
    input.productOutputType !== undefined ||
    input.eventBrief !== undefined ||
    input.styleBrief !== undefined ||
    input.visualDetails !== undefined ||
    input.avoidNotes !== undefined;

  if (!hasStructuredBrief) {
    return [];
  }

  const promptFields: Partial<StandardDesignBriefPromptFields> = {
    productOutputType: normalizeOptionalText(input.productOutputType) as ProductOutputType | undefined,
    eventBrief: normalizeOptionalText(input.eventBrief),
    styleBrief: normalizeOptionalText(input.styleBrief),
    visualDetails: normalizeOptionalText(input.visualDetails),
    avoidNotes: normalizeOptionalText(input.avoidNotes),
  };

  return [
    "",
    "【结构化设计需求】",
    `物料类型：${promptFields.productOutputType || "标准活动视觉"}`,
    `活动内容：${promptFields.eventBrief || "未填写"}`,
    `风格倾向：${promptFields.styleBrief || "未填写"}`,
    `画面元素：${promptFields.visualDetails || "未填写"}`,
    `规避内容：${promptFields.avoidNotes || "未填写"}`,
    "",
    "请优先根据以上结构化设计需求生成本次背景主视觉。",
    "这些字段用于理解活动、风格、视觉元素和规避方向，不得直接生成文字、标题、Logo、二维码、电话或校区信息。",
    "请避免退回通用模板底板；应根据活动内容和画面元素形成差异化视觉记忆点。",
  ];
}

function loadTemplate<Template>(
  relativePath: string,
  assertTemplate: (value: unknown) => asserts value is Template,
): Template {
  try {
    const parsed: unknown = JSON.parse(
      readFileSync(join(process.cwd(), relativePath), "utf8"),
    );
    assertTemplate(parsed);
    return parsed;
  } catch (error) {
    if (error instanceof Error && error.message === TEMPLATE_INVALID) {
      throw error;
    }
    throw new Error(TEMPLATE_INVALID);
  }
}

function buildOverlayData(input: StandardPromptInput): StandardPromptOverlayData {
  const mainTitle = normalizeRequiredText(input.mainTitle);
  const campusName = normalizeRequiredText(input.campusName);
  const campusPhone = normalizeRequiredText(input.campusPhone);
  const subtitle = normalizeOptionalText(input.subtitle);
  const campusAddress = normalizeOptionalText(input.campusAddress);

  return {
    mainTitle,
    ...(subtitle ? { subtitle } : {}),
    campusName,
    ...(campusAddress ? { campusAddress } : {}),
    campusPhone,
  };
}

function normalizeRequiredText(value: string): string {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    throw new Error(INVALID_TEMPLATE_INPUT);
  }

  return normalizedValue;
}

function normalizeOptionalText(value?: string): string | undefined {
  return value?.trim() || undefined;
}

function formatColors(colors: Record<string, string>): string {
  return Object.entries(colors)
    .map(([name, value]) => `${name} ${value}`)
    .join("、");
}
