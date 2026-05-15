import type { RasterMeasurementResult } from "@/models/title-raster-measurement";
import type {
  VectorGlyphMeasuredBoxes,
  VectorGlyphOutputTarget,
  VectorGlyphRenderMode,
  VectorGlyphRenderSource,
  VectorGlyphRun,
  VectorGlyphSafetyResult,
  VectorGlyphWarning,
} from "@/models/title-vector-glyph-renderer";

export type TitleAssetKind = "titleRasterLayer" | "debugSvg" | "measurementSvg";

export type TitleRasterLayer = {
  input: Buffer;
  top: number;
  left: number;
  width: number;
  height: number;
  mimeType: "image/png";
  sha256: string;
  byteLength: number;
};

export type TitleAsset = {
  assetId: string;
  candidateId: string;
  sourceCandidateId?: string;
  source: VectorGlyphRenderSource;
  assetKind: TitleAssetKind;
  renderMode: VectorGlyphRenderMode;
  outputTarget: VectorGlyphOutputTarget;
  canvas: { width: number; height: number };
  rasterLayer?: TitleRasterLayer;
  debugSvg?: string;
  measurementSvg?: string;
  measuredBoxes: VectorGlyphMeasuredBoxes;
  glyphRuns: VectorGlyphRun[];
  rasterMeasurementResult?: RasterMeasurementResult;
  safety: VectorGlyphSafetyResult;
  diagnostics: Record<string, unknown>;
  warnings: VectorGlyphWarning[];
  createdAt?: string;
  reason: string;
};

export type TitleAssetHandoffResult = {
  source: "title-asset-handoff-v1";
  candidateId: string;
  titleAsset?: TitleAsset;
  diagnostics: Record<string, unknown>;
  safety?: VectorGlyphSafetyResult;
  warnings: VectorGlyphWarning[];
  reason: string;
};
