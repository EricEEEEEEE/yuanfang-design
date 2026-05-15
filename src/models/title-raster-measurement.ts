import { createHash } from "node:crypto";
import type { TitleBox, TitleUnitBox } from "@/config/title-lockup-blueprint";
import type { ForbiddenZone } from "@/services/background-layout-intelligence.service";
import type {
  VectorGlyphMeasuredBoxes,
  VectorGlyphRun,
  VectorGlyphWarning,
} from "@/models/title-vector-glyph-renderer";

export type RasterMeasurementMode = "perRun" | "group" | "hybrid";
export type RasterRunScanMode = "expanded";

export const DEFAULT_RASTER_RUN_EXPANSION_PX = 12;

export type RasterMeasurementIdentity = {
  version: "sharp-raster-measurement-v1.1";
  candidateId: string;
  canvas: { width: number; height: number };
  outputTarget: string;
  fontEmbedMode: string;
  measurementSvgHash: string;
  glyphRunCount: number;
  glyphRuns: Array<{
    runId: string;
    text: string;
    fontKey: string;
    fontSize: number;
    plannedBox: TitleUnitBox;
    transform: string;
  }>;
  alphaThreshold: number;
  measurementSignature: string;
};

export type RasterMeasurementIdentityInput = {
  candidateId: string;
  canvas: { width: number; height: number };
  outputTarget?: string;
  fontEmbedMode?: string;
  measurementSvg: string;
  glyphRuns: VectorGlyphRun[];
  alphaThreshold: number;
};

export type RasterInkBox = TitleBox & {
  alphaPixelCount: number;
  alphaThreshold: number;
};

export type RasterGlyphRunMeasurement = {
  runId: string;
  text: string;
  role: VectorGlyphRun["role"];
  plannedBox: TitleUnitBox;
  scanBox: TitleBox;
  scanExpansionPx: number;
  estimatedBox?: TitleBox;
  inkBox: RasterInkBox | null;
  measuredBox?: TitleBox;
  insidePlannedBox: boolean;
  outsidePlannedBox: boolean;
};

export type RasterMeasurementInput = {
  candidateId: string;
  measurementSvg: string;
  canvas: { width: number; height: number };
  glyphRuns: VectorGlyphRun[];
  estimatedMeasuredBoxes: VectorGlyphMeasuredBoxes;
  forbiddenZones?: ForbiddenZone[];
  mode?: RasterMeasurementMode;
  alphaThreshold?: number;
  runExpansionPx?: number;
  outputTarget?: string;
  fontEmbedMode?: string;
};

export type RasterMeasurementSafetyCheck = {
  checkId: string;
  code: string;
  passed: boolean;
  severity: "error" | "warning";
  target?: string;
  reason: string;
};

export type RasterMeasurementResult = {
  source: "sharp-raster-measurement-v1";
  candidateId: string;
  mode: RasterMeasurementMode;
  runScanMode: RasterRunScanMode;
  runExpansionPx: number;
  alphaThreshold: number;
  identity: RasterMeasurementIdentity;
  canvas: { width: number; height: number };
  groupInkBox: RasterInkBox | null;
  runMeasurements: RasterGlyphRunMeasurement[];
  measuredBoxes: VectorGlyphMeasuredBoxes;
  safety: { passed: boolean; checks: RasterMeasurementSafetyCheck[] };
  warnings: VectorGlyphWarning[];
  reason: string;
};

export function createRasterMeasurementIdentity(input: RasterMeasurementIdentityInput): RasterMeasurementIdentity {
  const payload = {
    version: "sharp-raster-measurement-v1.1" as const,
    candidateId: input.candidateId,
    canvas: { width: input.canvas.width, height: input.canvas.height },
    outputTarget: input.outputTarget ?? "measurementSvg",
    fontEmbedMode: input.fontEmbedMode ?? "none",
    measurementSvgHash: measurementSignature(input.measurementSvg),
    glyphRunCount: input.glyphRuns.length,
    glyphRuns: input.glyphRuns.map((run) => ({
      runId: run.runId,
      text: run.text,
      fontKey: run.font.resolvedFontKey ?? "none",
      fontSize: run.fontSize,
      plannedBox: run.plannedBox,
      transform: run.transform,
    })),
    alphaThreshold: input.alphaThreshold,
  };
  return { ...payload, measurementSignature: measurementSignature(payload) };
}

export function rasterMeasurementIdentityMatches(left: RasterMeasurementIdentity | undefined, right: RasterMeasurementIdentity): boolean {
  return Boolean(left && canonicalStringify(left) === canonicalStringify(right));
}

export function measurementSignature(value: unknown): string {
  const content = typeof value === "string" ? value : canonicalStringify(value);
  return createHash("sha256").update(content).digest("hex");
}

function canonicalStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalStringify).join(",")}]`;
  if (!value || typeof value !== "object") return JSON.stringify(value);
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalStringify((value as Record<string, unknown>)[key])}`).join(",")}}`;
}
