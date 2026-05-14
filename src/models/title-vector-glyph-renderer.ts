import type { StandardFontAsset, StandardFontKey } from "@/config/font-library";
import type { StandardTitleArtStyleKey } from "@/config/title-art-styles";
import type {
  TitleBox,
  TitleLockupBlueprint,
  TitleLockupUnit,
  TitleUnitBox,
} from "@/config/title-lockup-blueprint";
import type { ForbiddenZone } from "@/services/background-layout-intelligence.service";

export type { StandardFontKey, StandardTitleArtStyleKey };

export type VectorGlyphRenderSource = "pipelineFinalPool" | "debug" | "manual";
export type VectorGlyphRenderMode = "debug" | "production";
export type VectorGlyphOutputFormat = "svg" | "sharpLayer";
export type VectorGlyphRendererResultSource = "vector-glyph-renderer-v1";
export type VectorTitleLayerKind = "glyphRun" | "subtitle" | "decoration" | "debug";
export type VectorTitleRole = TitleLockupUnit["visualRole"] | "subtitle";
export type VectorGlyphWarningSeverity = "info" | "warning" | "error";
export type TitleFontResolveStatus = "available" | "fallback" | "missing" | "unavailable";
export type TitleFontPresetKey =
  | StandardTitleArtStyleKey
  | "achievement"
  | "business"
  | "clean"
  | "campaign"
  | "literary"
  | "playful"
  | "ip";

export type VectorGlyphWarning = {
  code: string;
  severity: VectorGlyphWarningSeverity;
  message: string;
  target?: string;
};

export type TitleFontFallbackPolicy = {
  defaultFontKey: StandardFontKey;
  fallbackFontKeys: StandardFontKey[];
  systemFamilies: string[];
  missingFontPolicy: "error" | "warnAndFallback";
};

export type TitleFontRegistryEntry = {
  fontKey: StandardFontKey;
  family: string;
  filePath: string;
  weight: number;
  style: "normal" | "italic" | "oblique";
  fallbackFamilies: string[];
  asset: StandardFontAsset;
};

export type TitleFontRegistry = {
  fonts: Record<StandardFontKey, TitleFontRegistryEntry>;
  defaultFontKey: StandardFontKey;
  presetFonts: Record<TitleFontPresetKey, StandardFontKey>;
  roleFonts: Record<VectorTitleRole, StandardFontKey>;
};

export type TitleFontResolveResult = {
  requestedFontKey: string | null;
  resolvedFontKey: StandardFontKey | null;
  family: string;
  filePath: string | null;
  weight: number;
  style: "normal" | "italic" | "oblique";
  fallbackFamilies: string[];
  status: TitleFontResolveStatus;
  warnings: VectorGlyphWarning[];
  reason: string;
};

export type VectorTitleLayer = {
  layerId: string;
  kind: VectorTitleLayerKind;
  role?: VectorTitleRole;
  text?: string;
  plannedBox?: TitleUnitBox | TitleBox;
  zIndex: number;
  opacity: number;
  reason: string;
};

export type VectorGlyphRun = {
  runId: string;
  text: string;
  role: VectorTitleRole;
  font: TitleFontResolveResult;
  fontSize: number;
  fill: string;
  strokeWidth: number;
  transform: string;
  plannedBox: TitleUnitBox;
  measuredBox?: TitleBox;
  visualWeight: number;
  allowEmphasis: boolean;
  rotationDeg: number;
};

export type VectorGlyphMeasuredBoxes = {
  lockupBox: TitleBox;
  unitBoxes: Array<{
    text: string;
    planned: TitleUnitBox;
    measured?: TitleBox;
  }>;
  subtitleBox?: {
    text: string;
    planned: TitleUnitBox;
    measured?: TitleBox;
  };
};

export type VectorGlyphSafetyCheck = {
  checkId: string;
  code: string;
  passed: boolean;
  severity: "error" | "warning";
  target?: string;
  reason: string;
};

export type VectorGlyphSafetyResult = {
  passed: boolean;
  checks: VectorGlyphSafetyCheck[];
};

export type VectorGlyphRenderInput = {
  source: VectorGlyphRenderSource;
  blueprint: TitleLockupBlueprint;
  canvas: { width: number; height: number };
  titleStylePreset?: TitleFontPresetKey | "auto";
  brandStyle?: "yuanfangDefault";
  fontRegistry?: TitleFontRegistry;
  fontFallback?: TitleFontFallbackPolicy;
  safetyContext?: { forbiddenZones?: ForbiddenZone[] };
  renderMode: VectorGlyphRenderMode;
  outputFormat: VectorGlyphOutputFormat;
};

export type VectorGlyphRenderResult = {
  source: VectorGlyphRendererResultSource;
  candidateId: string;
  sourceCandidateId?: string;
  svg?: string;
  sharpLayer?: { input: Buffer; top: number; left: number };
  layers: VectorTitleLayer[];
  measuredBoxes: VectorGlyphMeasuredBoxes;
  glyphRuns: VectorGlyphRun[];
  safety: VectorGlyphSafetyResult;
  warnings: VectorGlyphWarning[];
  reason: string;
};
