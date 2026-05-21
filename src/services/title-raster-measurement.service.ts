import sharp from "sharp";
import type { TitleBox } from "@/config/title-lockup-blueprint";
import type {
  RasterGlyphRunMeasurement,
  RasterInkBox,
  RasterMeasurementInput,
  RasterMeasurementResult,
  RasterMeasurementSafetyCheck,
} from "@/models/title-raster-measurement";
import {
  createRasterMeasurementIdentity,
  DEFAULT_RASTER_RUN_EXPANSION_PX,
} from "@/models/title-raster-measurement";
import type { VectorGlyphMeasuredBoxes, VectorGlyphWarning } from "@/models/title-vector-glyph-renderer";

type RawRaster = { data: Buffer; width: number; height: number; channels: number };
const DEFAULT_ALPHA_THRESHOLD = 8;

export async function measureTitleRaster(input: RasterMeasurementInput): Promise<RasterMeasurementResult> {
  const alphaThreshold = input.alphaThreshold ?? DEFAULT_ALPHA_THRESHOLD;
  const mode = input.mode ?? "hybrid";
  const runExpansionPx = input.runExpansionPx ?? DEFAULT_RASTER_RUN_EXPANSION_PX;
  const raster = await rasterize(input.measurementSvg);
  const identity = createRasterMeasurementIdentity({ ...input, alphaThreshold });
  const groupInkBox = mode === "perRun" ? null : scanAlphaBox(raster, fullBox(raster), alphaThreshold);
  const runMeasurements = mode === "group"
    ? []
    : input.glyphRuns.map((run): RasterGlyphRunMeasurement => {
      const scanBox = expandBox(run.plannedBox, runExpansionPx, raster);
      const inkBox = scanAlphaBox(raster, scanBox, alphaThreshold);
      const measuredBox = inkBox ? toTitleBox(inkBox) : undefined;
      const insidePlannedBox = Boolean(measuredBox && inside(measuredBox, run.plannedBox));
      return {
        runId: run.runId,
        text: run.text,
        role: run.role,
        plannedBox: run.plannedBox,
        scanBox,
        scanExpansionPx: runExpansionPx,
        estimatedBox: run.measuredBox,
        fill: run.fill,
        strokeWidth: run.strokeWidth,
        strokeColor: run.strokeColor,
        titleStylePreset: run.titleStylePreset,
        contrastTreatmentApplied: run.contrastTreatmentApplied,
        hierarchyTreatmentApplied: run.hierarchyTreatmentApplied,
        styleSafetyWarnings: run.styleSafetyWarnings,
        visualWeight: run.visualWeight,
        renderScaleX: run.renderScaleX,
        targetTextLength: run.targetTextLength,
        renderScaleAdjustmentApplied: run.renderScaleAdjustmentApplied,
        inkBox,
        measuredBox,
        insidePlannedBox,
        outsidePlannedBox: Boolean(measuredBox && !insidePlannedBox),
      };
    });
  const measuredBoxes = buildMeasuredBoxes(input, groupInkBox, runMeasurements);
  const safetyChecks = createSafetyChecks(input, groupInkBox, runMeasurements, measuredBoxes);
  const passed = safetyChecks.every((item) => item.passed || item.severity !== "error");
  const checks = [
    check("raster_measurement_passed", passed, "error", passed ? "Sharp raster alpha measurement passed." : "Sharp raster alpha measurement failed."),
    ...safetyChecks,
  ];
  return {
    source: "sharp-raster-measurement-v1",
    candidateId: input.candidateId,
    mode,
    runScanMode: "expanded",
    runExpansionPx,
    alphaThreshold,
    identity,
    canvas: { width: raster.width, height: raster.height },
    groupInkBox,
    runMeasurements,
    measuredBoxes,
    safety: { passed, checks },
    warnings: buildWarnings(input, groupInkBox, runMeasurements),
    reason: passed ? "Sharp raster alpha bbox measurement completed." : "Sharp raster measurement completed with safety failures.",
  };
}

async function rasterize(svg: string): Promise<RawRaster> {
  const { data, info } = await sharp(Buffer.from(svg)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height, channels: info.channels };
}

function scanAlphaBox(raster: RawRaster, region: TitleBox, alphaThreshold: number): RasterInkBox | null {
  const x0 = clampInt(Math.ceil(region.x), 0, raster.width);
  const y0 = clampInt(Math.ceil(region.y), 0, raster.height);
  const x1 = clampInt(Math.floor(region.x + region.width), x0, raster.width);
  const y1 = clampInt(Math.floor(region.y + region.height), y0, raster.height);
  let minX = raster.width, minY = raster.height, maxX = -1, maxY = -1, alphaPixelCount = 0;
  for (let y = y0; y < y1; y += 1) {
    for (let x = x0; x < x1; x += 1) {
      const alpha = raster.data[(y * raster.width + x) * raster.channels + raster.channels - 1] ?? 0;
      if (alpha < alphaThreshold) continue;
      alphaPixelCount += 1;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  if (alphaPixelCount === 0) return null;
  return { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1, alphaPixelCount, alphaThreshold };
}

function buildMeasuredBoxes(
  input: RasterMeasurementInput,
  groupInkBox: RasterInkBox | null,
  runMeasurements: readonly RasterGlyphRunMeasurement[],
): VectorGlyphMeasuredBoxes {
  const byId = new Map(runMeasurements.map((item) => [item.runId, item]));
  const main = input.glyphRuns.filter((run) => run.role !== "subtitle");
  const subtitle = input.glyphRuns.find((run) => run.role === "subtitle");
  return {
    lockupBox: groupInkBox ? toTitleBox(groupInkBox) : input.estimatedMeasuredBoxes.lockupBox,
    unitBoxes: main.map((run) => ({ text: run.text, planned: run.plannedBox, measured: byId.get(run.runId)?.measuredBox ?? run.measuredBox })),
    ...(subtitle ? { subtitleBox: { text: subtitle.text, planned: subtitle.plannedBox, measured: byId.get(subtitle.runId)?.measuredBox ?? subtitle.measuredBox } } : {}),
  };
}

function createSafetyChecks(
  input: RasterMeasurementInput,
  groupInkBox: RasterInkBox | null,
  runMeasurements: readonly RasterGlyphRunMeasurement[],
  measuredBoxes: VectorGlyphMeasuredBoxes,
): RasterMeasurementSafetyCheck[] {
  const mainBoxes = measuredBoxes.unitBoxes.map((item) => item.measured).filter(Boolean) as TitleBox[];
  const subtitleBox = measuredBoxes.subtitleBox?.measured;
  const allBoxes = [...mainBoxes, ...(subtitleBox ? [subtitleBox] : [])];
  const subtitleOverlap = Boolean(subtitleBox && mainBoxes.some((item) => overlaps(item, subtitleBox)));
  const forbiddenOverlap = (input.forbiddenZones ?? []).some((zone) => allBoxes.some((item) => overlaps(item, zone)));
  return [
    check("alpha_bbox_exists", Boolean(groupInkBox), "error", "group raster alpha bbox must exist."),
    check("run_alpha_bbox_exists", runMeasurements.length === input.glyphRuns.length && runMeasurements.every((item) => item.inkBox), "error", "each glyph run must produce a raster alpha bbox."),
    check("unit_boxes_inside_planned", runMeasurements.every((item) => item.insidePlannedBox), "error", "each raster measuredBox must stay inside planned unitBox."),
    check("subtitle_not_overlapping_main_title", !subtitleOverlap, "error", "subtitle raster measuredBox must not overlap main title measured boxes."),
    check("forbidden_zone_overlap", !forbiddenOverlap, "error", "raster measured boxes must not overlap forbiddenZones."),
    check("candidate_traceable", input.candidateId.length > 0, "error", "candidateId must be present for measurement traceability."),
    check("measurement_svg_not_final_asset", input.outputTarget === "measurementSvg", "error", "measurementSvg must be used only as an internal measurement target."),
  ];
}

function buildWarnings(input: RasterMeasurementInput, groupInkBox: RasterInkBox | null, runs: readonly RasterGlyphRunMeasurement[]): VectorGlyphWarning[] {
  return [
    ...(groupInkBox ? [] : [warning("raster_alpha_bbox_missing", "No alpha pixels were found in the measurement SVG.", input.candidateId)]),
    ...(runs.some((run) => !run.inkBox) ? [warning("raster_run_alpha_bbox_missing", "One or more glyph runs produced no alpha bbox.", input.candidateId)] : []),
  ];
}

function fullBox(raster: RawRaster): TitleBox { return { x: 0, y: 0, width: raster.width, height: raster.height }; }
function expandBox(box: TitleBox, px: number, raster: RawRaster): TitleBox {
  const x = Math.max(0, box.x - px), y = Math.max(0, box.y - px);
  const right = Math.min(raster.width, box.x + box.width + px), bottom = Math.min(raster.height, box.y + box.height + px);
  return { x, y, width: Math.max(0, right - x), height: Math.max(0, bottom - y) };
}
function toTitleBox(box: TitleBox): TitleBox { return { x: box.x, y: box.y, width: box.width, height: box.height }; }
function check(code: string, passed: boolean, severity: "error" | "warning", reason: string): RasterMeasurementSafetyCheck { return { checkId: code, code, passed, severity, reason }; }
function warning(code: string, message: string, target: string): VectorGlyphWarning { return { code, severity: "warning", message, target }; }
function inside(inner: TitleBox, outer: TitleBox): boolean { return inner.x >= outer.x && inner.y >= outer.y && inner.x + inner.width <= outer.x + outer.width && inner.y + inner.height <= outer.y + outer.height; }
function overlaps(a: TitleBox, b: TitleBox): boolean { return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y; }
function clampInt(value: number, min: number, max: number): number { return Math.min(max, Math.max(min, value)); }
