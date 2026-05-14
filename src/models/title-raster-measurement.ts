import type { TitleBox, TitleUnitBox } from "@/config/title-lockup-blueprint";
import type { ForbiddenZone } from "@/services/background-layout-intelligence.service";
import type {
  VectorGlyphMeasuredBoxes,
  VectorGlyphRun,
  VectorGlyphWarning,
} from "@/models/title-vector-glyph-renderer";

export type RasterMeasurementMode = "perRun" | "group" | "hybrid";

export type RasterInkBox = TitleBox & {
  alphaPixelCount: number;
  alphaThreshold: number;
};

export type RasterGlyphRunMeasurement = {
  runId: string;
  text: string;
  role: VectorGlyphRun["role"];
  plannedBox: TitleUnitBox;
  estimatedBox?: TitleBox;
  inkBox: RasterInkBox | null;
  measuredBox?: TitleBox;
  insidePlannedBox: boolean;
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
  alphaThreshold: number;
  canvas: { width: number; height: number };
  groupInkBox: RasterInkBox | null;
  runMeasurements: RasterGlyphRunMeasurement[];
  measuredBoxes: VectorGlyphMeasuredBoxes;
  safety: { passed: boolean; checks: RasterMeasurementSafetyCheck[] };
  warnings: VectorGlyphWarning[];
  reason: string;
};
