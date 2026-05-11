import { readFileSync } from "node:fs";
import { join } from "node:path";
import type {
  StandardElementKey,
  StandardStyleKey,
  StandardThemeKey,
} from "@/config/scenes";

export type StandardPromptInput = {
  theme: StandardThemeKey;
  style: StandardStyleKey;
  element: StandardElementKey;
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
  templateMeta: {
    theme: StandardThemeKey;
    style: StandardStyleKey;
    element: StandardElementKey;
  };
};

type BaseTemplate = {
  basePrompt: string;
  layoutPrompt: string;
  negativePrompt: string[];
};

type BrandRulesTemplate = {
  brandName: string;
  englishName: string;
  brandSpirit: string[];
  colors: Record<string, string>;
  visualLanguage: string[];
  allowedVisualMotifs: string[];
  logoRules: string[];
  mascotRules: string[];
};

type PromptFragment = {
  label: string;
  purpose?: string;
  prompt: string;
};

type PromptFragmentMap<Key extends string> = Record<Key, PromptFragment>;

const INVALID_TEMPLATE_INPUT = "INVALID_TEMPLATE_INPUT";
const TEMPLATE_NOT_FOUND = "TEMPLATE_NOT_FOUND";

const baseTemplate = loadTemplate<BaseTemplate>("templates/_base.json");
const brandRules = loadTemplate<BrandRulesTemplate>("templates/_brand-rules.json");
const themeTemplates = loadTemplate<PromptFragmentMap<StandardThemeKey>>(
  "templates/standard/themes.json",
);
const styleTemplates = loadTemplate<PromptFragmentMap<StandardStyleKey>>(
  "templates/standard/styles.json",
);
const elementTemplates = loadTemplate<PromptFragmentMap<StandardElementKey>>(
  "templates/standard/elements.json",
);

export function buildStandardPrompt(
  input: StandardPromptInput,
): BuildStandardPromptResult {
  const overlayData = buildOverlayData(input);
  const themeTemplate = themeTemplates[input.theme];
  const styleTemplate = styleTemplates[input.style];
  const elementTemplate = elementTemplates[input.element];

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
      "",
      "【主题场景】",
      themeTemplate.prompt,
      "",
      "【视觉风格】",
      styleTemplate.prompt,
      "",
      "【画面元素】",
      elementTemplate.prompt,
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

function loadTemplate<Template>(relativePath: string): Template {
  const filePath = join(process.cwd(), relativePath);
  const parsed: unknown = JSON.parse(readFileSync(filePath, "utf8"));

  return parsed as Template;
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
  const normalizedValue = value?.trim();

  return normalizedValue || undefined;
}

function formatColors(colors: Record<string, string>): string {
  return Object.entries(colors)
    .map(([name, value]) => `${name} ${value}`)
    .join("、");
}
