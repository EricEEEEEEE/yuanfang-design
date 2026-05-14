import { existsSync } from "node:fs";
import path from "node:path";
import {
  STANDARD_FONT_LIBRARY,
  type StandardFontKey,
} from "@/config/font-library";
import type {
  TitleFontFallbackPolicy,
  TitleFontPresetKey,
  TitleFontRegistry,
  TitleFontRegistryEntry,
  TitleFontResolveResult,
  VectorGlyphWarning,
  VectorTitleRole,
} from "@/models/title-vector-glyph-renderer";

type ResolveOptions = {
  registry?: TitleFontRegistry;
  fallback?: TitleFontFallbackPolicy;
};
const SYSTEM_FAMILIES = ["PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", "sans-serif"];
const FONT_FAMILIES: Record<StandardFontKey, string> = {
  sourceHanSansBold: "Source Han Sans SC",
  sourceHanSerifSemiBold: "Source Han Serif SC",
  smileySans: "Smiley Sans",
  lxgwWenkaiGbMedium: "LXGW WenKai GB",
  lxgwMarkerGothic: "LXGW Marker Gothic",
  gensenRoundedBold: "GenSen Rounded TW",
};
const FONT_WEIGHTS: Record<StandardFontKey, number> = {
  sourceHanSansBold: 700,
  sourceHanSerifSemiBold: 600,
  smileySans: 700,
  lxgwWenkaiGbMedium: 500,
  lxgwMarkerGothic: 500,
  gensenRoundedBold: 700,
};
const FONT_STYLES: Partial<Record<StandardFontKey, "normal" | "italic" | "oblique">> = {
  smileySans: "oblique",
};

export const DEFAULT_TITLE_FONT_FALLBACK: TitleFontFallbackPolicy = {
  defaultFontKey: "sourceHanSansBold",
  fallbackFontKeys: ["sourceHanSansBold", "gensenRoundedBold", "sourceHanSerifSemiBold"],
  systemFamilies: SYSTEM_FAMILIES,
  missingFontPolicy: "warnAndFallback",
};
export const TITLE_FONT_REGISTRY: TitleFontRegistry = {
  fonts: {
    sourceHanSansBold: entry("sourceHanSansBold"),
    sourceHanSerifSemiBold: entry("sourceHanSerifSemiBold"),
    smileySans: entry("smileySans"),
    lxgwWenkaiGbMedium: entry("lxgwWenkaiGbMedium"),
    lxgwMarkerGothic: entry("lxgwMarkerGothic"),
    gensenRoundedBold: entry("gensenRoundedBold"),
  },
  defaultFontKey: "sourceHanSansBold",
  presetFonts: {
    achievement: "sourceHanSansBold",
    business: "sourceHanSansBold",
    clean: "sourceHanSansBold",
    cleanBrand: "sourceHanSansBold",
    stageGlow: "sourceHanSansBold",
    modernChinese: "sourceHanSerifSemiBold",
    literary: "lxgwWenkaiGbMedium",
    literaryEditorial: "lxgwWenkaiGbMedium",
    campaign: "smileySans",
    boldCampaign: "smileySans",
    playful: "lxgwMarkerGothic",
    ip: "lxgwMarkerGothic",
    ipEvent: "lxgwMarkerGothic",
  },
  roleFonts: {
    hero: "sourceHanSansBold",
    lead: "sourceHanSansBold",
    accent: "gensenRoundedBold",
    support: "sourceHanSansBold",
    subtitle: "sourceHanSansBold",
  },
};
export function resolveTitleFont(
  fontKey: StandardFontKey | string | null | undefined,
  options: ResolveOptions = {},
): TitleFontResolveResult {
  const registry = options.registry ?? TITLE_FONT_REGISTRY;
  const fallback = options.fallback ?? DEFAULT_TITLE_FONT_FALLBACK;
  const requestedFontKey = fontKey ?? null;
  const warnings: VectorGlyphWarning[] = [];
  const direct = isStandardFontKey(fontKey, registry) ? registry.fonts[fontKey] : null;

  if (!direct && requestedFontKey) {
    warnings.push(warning("unknown_font_key", `fontKey not registered: ${requestedFontKey}`, "fontKey"));
  }
  if (direct && fontFileAvailable(direct)) {
    return result(requestedFontKey, direct.fontKey, direct, "available", warnings, "requested font is available.");
  }
  if (direct) {
    warnings.push(warning("missing_font_file", `font file missing: ${direct.filePath}`, direct.fontKey));
  }
  if (fallback.missingFontPolicy === "error") {
    return result(requestedFontKey, direct?.fontKey ?? null, direct ?? null, "missing", warnings, "font missing and fallback policy is error.");
  }

  for (const fallbackKey of [fallback.defaultFontKey, ...fallback.fallbackFontKeys]) {
    const fallbackEntry = registry.fonts[fallbackKey];
    if (fallbackEntry && fontFileAvailable(fallbackEntry)) {
      warnings.push(warning("fallback_font_used", `using fallback font: ${fallbackKey}`, fallbackKey));
      return result(requestedFontKey, fallbackKey, fallbackEntry, "fallback", warnings, "resolved through fallback chain.");
    }
  }
  warnings.push(warning("no_font_available", "no registered font file is available.", "fontRegistry"));
  return result(requestedFontKey, null, null, "unavailable", warnings, "no registered font resolved.");
}
export function resolveTitleFontForRole(
  role: VectorTitleRole,
  options: ResolveOptions = {},
): TitleFontResolveResult {
  const registry = options.registry ?? TITLE_FONT_REGISTRY;
  return resolveTitleFont(registry.roleFonts[role] ?? registry.defaultFontKey, options);
}
export function resolveTitleFontForPreset(
  preset: TitleFontPresetKey | "auto" | null | undefined,
  options: ResolveOptions = {},
): TitleFontResolveResult {
  const registry = options.registry ?? TITLE_FONT_REGISTRY;
  const key = preset && preset !== "auto" ? registry.presetFonts[preset] : registry.defaultFontKey;
  return resolveTitleFont(key ?? registry.defaultFontKey, options);
}
export function getTitleFontRegistryDiagnostics(
  options: ResolveOptions = {},
): {
  fontKeys: StandardFontKey[];
  defaultFontKey: StandardFontKey;
  missingWarnings: VectorGlyphWarning[];
  presetMapping: TitleFontRegistry["presetFonts"];
  roleMapping: TitleFontRegistry["roleFonts"];
} {
  const registry = options.registry ?? TITLE_FONT_REGISTRY;
  const fontKeys = Object.keys(registry.fonts) as StandardFontKey[];
  const missingWarnings = fontKeys
    .filter((fontKey) => !fontFileAvailable(registry.fonts[fontKey]))
    .map((fontKey) => warning("missing_font_file", `font file missing: ${registry.fonts[fontKey].filePath}`, fontKey));
  return {
    fontKeys,
    defaultFontKey: registry.defaultFontKey,
    missingWarnings,
    presetMapping: registry.presetFonts,
    roleMapping: registry.roleFonts,
  };
}
function entry(fontKey: StandardFontKey): TitleFontRegistryEntry {
  const asset = STANDARD_FONT_LIBRARY[fontKey];
  return {
    fontKey,
    family: FONT_FAMILIES[fontKey],
    filePath: asset.filePath,
    weight: FONT_WEIGHTS[fontKey],
    style: FONT_STYLES[fontKey] ?? "normal",
    fallbackFamilies: SYSTEM_FAMILIES,
    asset,
  };
}
function isStandardFontKey(value: unknown, registry: TitleFontRegistry): value is StandardFontKey {
  return typeof value === "string" && value in registry.fonts;
}
function fontFileAvailable(entryValue: TitleFontRegistryEntry): boolean {
  return entryValue.filePath.length > 0 && existsSync(path.resolve(process.cwd(), entryValue.filePath));
}
function warning(code: string, message: string, target: string): VectorGlyphWarning {
  return { code, severity: "warning", message, target };
}
function result(
  requestedFontKey: string | null,
  resolvedFontKey: StandardFontKey | null,
  entryValue: TitleFontRegistryEntry | null,
  status: TitleFontResolveResult["status"],
  warnings: VectorGlyphWarning[],
  reason: string,
): TitleFontResolveResult {
  return {
    requestedFontKey,
    resolvedFontKey,
    family: entryValue?.family ?? SYSTEM_FAMILIES.join(", "),
    filePath: entryValue?.filePath ?? null,
    weight: entryValue?.weight ?? 400,
    style: entryValue?.style ?? "normal",
    fallbackFamilies: entryValue?.fallbackFamilies ?? SYSTEM_FAMILIES,
    status,
    warnings,
    reason,
  };
}
