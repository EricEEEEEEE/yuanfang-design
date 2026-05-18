import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { StandardDesignFamilyKey } from "@/config/design-families";
import type { StandardLayoutFamilyKey } from "@/config/layout-families";

export type BaseTemplate = { basePrompt: string; layoutPrompt: string; negativePrompt: string[] };
export type BrandRulesTemplate = {
  brandName: string; englishName: string; brandSpirit: string[]; colors: Record<string, string>;
  visualLanguage: string[]; allowedVisualMotifs: string[]; logoRules: string[]; mascotRules: string[];
};
export type FragmentMap = Record<string, { label?: string; purpose?: string; prompt: string }>;
export type TemplateKeys = { designFamily: StandardDesignFamilyKey; layoutFamily: StandardLayoutFamilyKey; displayPolicy: string; theme: string; style: string; element: string };

export function loadTemplates() {
  return {
    base: loadJson<BaseTemplate>("templates/_base.json"),
    brand: loadJson<BrandRulesTemplate>("templates/_brand-rules.json"),
    themes: loadJson<FragmentMap>("templates/standard/themes.json"),
    styles: loadJson<FragmentMap>("templates/standard/styles.json"),
    elements: loadJson<FragmentMap>("templates/standard/elements.json"),
  };
}

function loadJson<T>(relativePath: string): T {
  return JSON.parse(readFileSync(join(process.cwd(), relativePath), "utf8")) as T;
}
