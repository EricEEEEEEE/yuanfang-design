import type { VectorTitleRole } from "@/models/title-vector-glyph-renderer";

export const TITLE_RENDER_STYLE_PRESET = "yuanfangTitleAssetV1";
export const TITLE_BASELINE_STYLE_PRESET = "unstyledBaseline";
export type TitleRenderStylePreset = typeof TITLE_RENDER_STYLE_PRESET | typeof TITLE_BASELINE_STYLE_PRESET;

export type TitleRunStyle = {
  fill: string;
  strokeWidth: number;
  strokeColor: string;
  filterId?: string;
  letterSpacing: number;
  lineHeightFactor: number;
  widthFactor: number;
  targetWidthOccupancy: number;
  maxRenderScaleX: number;
  fontSizeCap: number;
  forceTextLength: boolean;
  contrastTreatmentApplied: boolean;
  hierarchyTreatmentApplied: boolean;
  styleSafetyWarnings: string[];
};

export function resolveTitleRenderStylePreset(value: string | undefined): TitleRenderStylePreset {
  return value === TITLE_BASELINE_STYLE_PRESET ? TITLE_BASELINE_STYLE_PRESET : TITLE_RENDER_STYLE_PRESET;
}

export function titleRunStyle(role: VectorTitleRole, weight: number, allow: boolean, fontKey: string | null, boost: boolean, preset: TitleRenderStylePreset): TitleRunStyle {
  if (preset === TITLE_BASELINE_STYLE_PRESET) return baselineRunStyle(role, weight, allow, fontKey, boost);
  const w = widthFactor(fontKey);
  if (role === "hero") return style("#FFFFFF", clamp(3.2 + weight * 0.42, 3.4, 5.2), "#00539F", "titleAssetLift", boost ? 0.86 : 1.02, w, boost ? 0.92 : 0.84, boost ? 1.08 : 0.9, boost);
  if (role === "lead") return style("#FFFFFF", allow ? clamp(2.6 + weight * 0.28, 2.8, 4.2) : 2.4, "#00539F", "titleAssetLift", boost ? 0.88 : 1.04, w, boost ? 0.88 : 0.8, boost ? 1.04 : 0.88, boost);
  if (role === "accent") return style(allow ? "#EF7A00" : "#D96A00", allow ? 2.2 : 1.6, "#FFF7ED", "titleAssetSoftShadow", boost ? 0.9 : 1.04, w, boost ? 0.84 : 0.76, boost ? 1.02 : 0.88, boost);
  if (role === "subtitle") return style("#26364F", 1.15, "#FFFFFF", "titleAssetSubtitleLift", 1.06, w, 0.68, 0.86, false, false, true);
  return style("#FFFFFF", 2.2, "#00539F", "titleAssetSoftShadow", 1.04, w, 0.76, 0.88, false);
}

export function titleStyleSvgDefs(preset: TitleRenderStylePreset): string {
  if (preset === TITLE_BASELINE_STYLE_PRESET) return `<linearGradient id="titleHeroGradient" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#004089"/><stop offset="100%" stop-color="#00A3FF"/></linearGradient><filter id="titleBaselineShadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="4" stdDeviation="3" flood-color="#001B44" flood-opacity=".28"/></filter><filter id="titleBaselineGlow" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="0" stdDeviation="4" flood-color="#5CC8FF" flood-opacity=".42"/></filter>`;
  return `<linearGradient id="titleHeroGradient" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#004089"/><stop offset="100%" stop-color="#00A3FF"/></linearGradient><filter id="titleAssetLift" x="-18%" y="-18%" width="136%" height="136%"><feDropShadow dx="0" dy="3" stdDeviation="2.4" flood-color="#003B78" flood-opacity=".36"/></filter><filter id="titleAssetSoftShadow" x="-16%" y="-16%" width="132%" height="132%"><feDropShadow dx="0" dy="2" stdDeviation="1.8" flood-color="#003B78" flood-opacity=".24"/></filter><filter id="titleAssetSubtitleLift" x="-12%" y="-12%" width="124%" height="124%"><feDropShadow dx="0" dy="1.5" stdDeviation="1.2" flood-color="#FFFFFF" flood-opacity=".42"/></filter>`;
}

function baselineRunStyle(role: VectorTitleRole, weight: number, allow: boolean, fontKey: string | null, boost: boolean): TitleRunStyle {
  const w = widthFactor(fontKey);
  if (role === "hero") return style(allow ? "url(#titleHeroGradient)" : "#004089", allow ? clamp(2 + weight * 0.35, 2, 4) : 1, "#fffaf0", allow ? "titleBaselineGlow" : undefined, 1.08, w, boost ? 0.86 : 0.76, boost ? 0.98 : 0.88, boost, false, false);
  if (role === "lead") return style("#004089", allow ? clamp(1 + weight * 0.18, 1, 2) : 0.8, "#fffaf0", allow ? "titleBaselineShadow" : undefined, 1.08, w, boost ? 0.84 : 0.74, boost ? 0.96 : 0.88, boost, false, false);
  if (role === "accent") return style(allow ? "#EF7A00" : "#C86600", allow ? 1.2 : 0.6, "#fffaf0", undefined, 1.08, w, boost ? 0.8 : 0.7, 0.88, boost, false, false);
  return style(role === "subtitle" ? "#334155" : "#475569", 0, "#334155", undefined, 1.08, w, 0.66, 0.86, false, false, false);
}

function style(fill: string, strokeWidth: number, strokeColor: string, filterId: string | undefined, lineHeightFactor: number, widthFactor: number, targetWidthOccupancy: number, fontSizeCap: number, forceTextLength: boolean, contrast = true, hierarchy = true): TitleRunStyle {
  return { fill, strokeWidth, strokeColor, ...(filterId ? { filterId } : {}), letterSpacing: 0, lineHeightFactor, widthFactor, targetWidthOccupancy, maxRenderScaleX: 2.2, fontSizeCap, forceTextLength, contrastTreatmentApplied: contrast, hierarchyTreatmentApplied: hierarchy, styleSafetyWarnings: [] };
}
function widthFactor(fontKey: string | null): number { return fontKey?.includes("Marker") || fontKey?.includes("Rounded") ? 1.04 : 1.06; }
function clamp(value: number, min: number, max: number): number { return Math.min(max, Math.max(min, value)); }
