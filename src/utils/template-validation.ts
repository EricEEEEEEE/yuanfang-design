export const TEMPLATE_INVALID = "TEMPLATE_INVALID";

export type BaseTemplate = {
  basePrompt: string;
  layoutPrompt: string;
  negativePrompt: string[];
};

export type BrandRulesTemplate = {
  brandName: string;
  englishName: string;
  brandSpirit: string[];
  colors: Record<string, string>;
  visualLanguage: string[];
  allowedVisualMotifs: string[];
  logoRules: string[];
  mascotRules: string[];
};

export type PromptFragment = {
  label: string;
  purpose?: string;
  prompt: string;
};

export type PromptFragmentMap = Record<string, PromptFragment>;

export function assertBaseTemplate(value: unknown): asserts value is BaseTemplate {
  if (
    !isRecord(value) ||
    !hasStrings(value, ["basePrompt", "layoutPrompt"]) ||
    !isStringArray(value.negativePrompt)
  ) {
    throwTemplateInvalid();
  }
}

export function assertBrandRulesTemplate(
  value: unknown,
): asserts value is BrandRulesTemplate {
  if (
    !isRecord(value) ||
    !hasStrings(value, ["brandName", "englishName"]) ||
    !hasStringArrays(value, [
      "brandSpirit",
      "visualLanguage",
      "allowedVisualMotifs",
      "logoRules",
      "mascotRules",
    ]) ||
    !isStringRecord(value.colors)
  ) {
    throwTemplateInvalid();
  }
}

export function assertPromptFragmentMap(
  value: unknown,
): asserts value is PromptFragmentMap {
  if (!isRecord(value)) {
    throwTemplateInvalid();
  }

  for (const fragment of Object.values(value)) {
    if (
      !isRecord(fragment) ||
      !hasStrings(fragment, ["label", "prompt"]) ||
      (fragment.purpose !== undefined && typeof fragment.purpose !== "string")
    ) {
      throwTemplateInvalid();
    }
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function hasStrings(record: Record<string, unknown>, fields: string[]): boolean {
  return fields.every((field) => typeof record[field] === "string");
}

function hasStringArrays(
  record: Record<string, unknown>,
  fields: string[],
): boolean {
  return fields.every((field) => isStringArray(record[field]));
}

function isStringRecord(value: unknown): value is Record<string, string> {
  return (
    isRecord(value) &&
    Object.values(value).every((item) => typeof item === "string")
  );
}

function throwTemplateInvalid(): never {
  throw new Error(TEMPLATE_INVALID);
}
