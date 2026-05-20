import type { TitleBox } from "../../src/config/title-lockup-blueprint";
import type { StandardGenerationResult } from "../../src/models/standard-generation";
import type {
  TitleVisualQualityCompactRow,
  TitleVisualQualityDiagnostics,
  TitleVisualQualityMetricSources,
} from "../../src/models/title-visual-quality-diagnostics";

export type BuildTitleVisualQualityInput = {
  sampleId: string;
  sampleName: string;
  result: StandardGenerationResult;
  backgroundLuminance?: number;
};
const TARGET_LOCKUP_AREA_RATIO = 0.08;
const MIN_ACCEPTABLE_LOCKUP_AREA_RATIO = 0.06;
export function buildTitleVisualQualityDiagnostics(input: BuildTitleVisualQualityInput): TitleVisualQualityDiagnostics {
  const { result } = input;
  const asset = result.titleAssetResult?.titleAsset;
  const pipeline = result.titleCandidatePipelineResult;
  const selectedCandidateId = result.selectedCandidateId ?? asset?.candidateId ?? "none";
  const blueprint = pipeline?.finalCandidatePool.find((item) => item.candidateId === selectedCandidateId);
  const canvas = asset?.canvas ?? { width: result.output?.width ?? 0, height: result.output?.height ?? 0 };
  const canvasBox = { x: 0, y: 0, width: canvas.width, height: canvas.height };
  const lockupBox = roundBox(asset?.measuredBoxes.lockupBox ?? scaleMaybe(blueprint?.lockupBox, result));
  const measuredGroup = asset?.rasterMeasurementResult?.groupInkBox ?? undefined;
  const mainMeasured = union(asset?.rasterMeasurementResult?.runMeasurements.filter((run) => run.role !== "subtitle").map((run) => run.inkBox ?? run.measuredBox));
  const subtitleMeasured = union(asset?.rasterMeasurementResult?.runMeasurements.filter((run) => run.role === "subtitle").map((run) => run.inkBox ?? run.measuredBox));
  const mainProxy = union(asset?.glyphRuns.filter((run) => run.role !== "subtitle").map((run) => run.measuredBox ?? run.plannedBox));
  const subtitleProxy = union(asset?.glyphRuns.filter((run) => run.role === "subtitle").map((run) => run.measuredBox ?? run.plannedBox));
  const mainTitleVisibleBox = roundBox(mainMeasured ?? mainProxy);
  const subtitleVisibleBox = roundBox(subtitleMeasured ?? subtitleProxy);
  const titleAssetVisibleBox = roundBox(measuredGroup ?? union([mainTitleVisibleBox, subtitleVisibleBox]) ?? lockupBox);
  const mainTitleAreaRatio = areaRatio(mainTitleVisibleBox, canvasBox);
  const subtitleAreaRatio = areaRatio(subtitleVisibleBox, canvasBox);
  const titleAssetVisibleAreaRatio = areaRatio(titleAssetVisibleBox, canvasBox);
  const lockupBoxAreaRatio = areaRatio(lockupBox, canvasBox);
  const subtitleExpected = Boolean(blueprint?.subtitleLockup.text || subtitleVisibleBox);
  const subtitleVisible = Boolean(subtitleVisibleBox && subtitleAreaRatio > 0.0005);
  const titleCenter = titleAssetVisibleBox ? center(titleAssetVisibleBox, canvasBox) : undefined;
  const titleToCanvasWidthRatio = ratio(titleAssetVisibleBox?.width, canvas.width);
  const titleToCanvasHeightRatio = ratio(titleAssetVisibleBox?.height, canvas.height);
  const contrast = estimateContrast(asset?.glyphRuns.map((run) => run.fill), input.backgroundLuminance);
  const forbiddenZones = scaleForbiddenZones(result);
  const overlapForbidden = Boolean(titleAssetVisibleBox && forbiddenZones.some((zone) => overlapRatio(titleAssetVisibleBox, zone) > 0.02));
  const dominance = scoreDominance(titleAssetVisibleAreaRatio, titleToCanvasWidthRatio, titleToCanvasHeightRatio);
  const hierarchy = scoreHierarchy(mainTitleAreaRatio, subtitleAreaRatio, subtitleExpected, subtitleVisible);
  const subtitleSupport = scoreSubtitle(subtitleAreaRatio, subtitleExpected, subtitleVisible);
  const backgroundIntegration = clamp(82 - (overlapForbidden ? 32 : 0) - (pastedRisk(titleCenter, titleAssetVisibleAreaRatio) ? 18 : 0));
  const readability = clamp(Math.round(contrast * 0.58 + dominance * 0.42));
  const { warnings, failReasons } = diagnose({ titleAssetVisibleAreaRatio, lockupBoxAreaRatio, dominance, subtitleExpected, subtitleVisible, hierarchy, contrast, overlapForbidden, titleCenter });
  const metricSources: TitleVisualQualityMetricSources = {
    lockupBox: asset?.measuredBoxes.lockupBox ? "measured" : lockupBox ? "proxy" : "missing",
    titleAssetVisibleBox: measuredGroup ? "measured" : titleAssetVisibleBox ? "proxy" : "missing",
    mainTitleVisibleBox: mainMeasured ? "measured" : mainTitleVisibleBox ? "proxy" : "missing",
    subtitleVisibleBox: subtitleMeasured ? "measured" : subtitleVisibleBox ? "proxy" : "missing",
    contrast: input.backgroundLuminance === undefined ? "proxy" : "estimated",
    backgroundIntegration: "estimated",
  };

  return {
    source: "title-visual-quality-diagnostics-v1",
    sampleId: input.sampleId,
    sampleName: input.sampleName,
    selectedCandidateId,
    sourceCandidateId: result.selectedSourceCandidateId ?? result.diagnostics.selectedLineage?.sourceCandidateId,
    mainTitle: blueprint?.mainTitle ?? "",
    subtitle: blueprint?.subtitleLockup.text || undefined,
    canvasWidth: canvas.width,
    canvasHeight: canvas.height,
    lockupBox,
    lockupBoxAreaRatio,
    titleAssetVisibleBox,
    titleAssetVisibleAreaRatio,
    mainTitleVisibleBox,
    mainTitleAreaRatio,
    subtitleVisibleBox,
    subtitleAreaRatio,
    subtitleVisible,
    titleCenter,
    titlePlacementRegion: placement(titleCenter),
    titleToCanvasWidthRatio,
    titleToCanvasHeightRatio,
    targetLockupAreaRatio: TARGET_LOCKUP_AREA_RATIO,
    minAcceptableLockupAreaRatio: MIN_ACCEPTABLE_LOCKUP_AREA_RATIO,
    minimumScalePassed: lockupBoxAreaRatio >= MIN_ACCEPTABLE_LOCKUP_AREA_RATIO,
    estimatedTitleDominanceScore: dominance,
    estimatedHierarchyScore: hierarchy,
    estimatedSubtitleSupportScore: subtitleSupport,
    estimatedReadabilityScore: readability,
    estimatedContrastScore: contrast,
    estimatedBackgroundIntegrationScore: backgroundIntegration,
    metricSources,
    overlayMetadata: { canvasBox, lockupBox, titleAssetVisibleBox, mainTitleVisibleBox, subtitleBox: subtitleVisibleBox, logoBox: logoBox(result), forbiddenZones },
    warnings, failReasons,
    recommendation: recommendation(warnings, failReasons),
  };
}
export function toTitleVisualQualityRow(item: TitleVisualQualityDiagnostics): TitleVisualQualityCompactRow {
  return {
    sampleId: item.sampleId,
    selectedCandidateId: item.selectedCandidateId,
    titleAssetVisibleAreaRatio: item.titleAssetVisibleAreaRatio,
    lockupBoxAreaRatio: item.lockupBoxAreaRatio,
    subtitleVisible: item.subtitleVisible,
    minimumScalePassed: item.minimumScalePassed,
    estimatedTitleDominanceScore: item.estimatedTitleDominanceScore,
    warnings: item.warnings,
    recommendation: item.recommendation,
  };
}
function diagnose(input: { titleAssetVisibleAreaRatio: number; lockupBoxAreaRatio: number; dominance: number; subtitleExpected: boolean; subtitleVisible: boolean; hierarchy: number; contrast: number; overlapForbidden: boolean; titleCenter?: { x: number; y: number } }): { warnings: string[]; failReasons: string[] } {
  const warnings: string[] = []; const failReasons: string[] = [];
  if (input.titleAssetVisibleAreaRatio < 0.025) failReasons.push("titleTooSmall");
  else if (input.titleAssetVisibleAreaRatio < 0.035) warnings.push("titleTooSmall");
  if (input.lockupBoxAreaRatio < 0.06) warnings.push("lockupTooSmall");
  if (input.hierarchy < 62) warnings.push("hierarchyWeak");
  if (input.subtitleExpected && !input.subtitleVisible) warnings.push("subtitleHidden");
  if (pastedRisk(input.titleCenter, input.titleAssetVisibleAreaRatio)) warnings.push("pastedTextRisk");
  if (input.dominance < 45) failReasons.push("dominanceWeak");
  else if (input.dominance < 60) warnings.push("dominanceWeak");
  if (input.contrast < 55) warnings.push("contrastWeak");
  if (input.overlapForbidden) warnings.push("backgroundConflict");
  return { warnings, failReasons };
}
function recommendation(warnings: string[], fails: string[]): string {
  const codes = new Set([...warnings, ...fails]);
  if (codes.has("titleTooSmall") && codes.has("lockupTooSmall")) return "inspect refiner minimum lockup scale and scorer title dominance reward";
  if (codes.has("titleTooSmall")) return "inspect title asset rendering scale before changing generator";
  if (codes.has("subtitleHidden")) return "inspect subtitle retention in refiner after scale diagnostics";
  if (codes.has("pastedTextRisk")) return "inspect generator blueprint/background integration after measurements";
  if (codes.has("contrastWeak")) return "inspect render style contrast tokens";
  return "keep as baseline candidate for visual review";
}
function scoreDominance(area: number, width: number, height: number): number {
  return clamp(Math.round(Math.min(1, area / 0.055) * 55 + Math.min(1, width / 0.5) * 25 + Math.min(1, height / 0.24) * 20));
}
function scoreHierarchy(main: number, subtitle: number, expected: boolean, visible: boolean): number {
  if (!expected) return 90;
  if (!visible) return 45;
  const balance = subtitle > 0 ? main / subtitle : 99;
  if (balance >= 3 && balance <= 18) return 92;
  return balance < 2 || balance > 32 ? 55 : 74;
}
function scoreSubtitle(area: number, expected: boolean, visible: boolean): number {
  if (!expected) return 100;
  if (!visible) return 35;
  return clamp(Math.round(Math.min(1, area / 0.004) * 100));
}
function estimateContrast(fills: string[] | undefined, backgroundLuminance: number | undefined): number {
  if (backgroundLuminance === undefined || !fills?.length) return 60;
  const titleLum = fills.map(colorLum).reduce((sum, value) => sum + value, 0) / fills.length;
  const ratioValue = (Math.max(titleLum, backgroundLuminance) + 0.05) / (Math.min(titleLum, backgroundLuminance) + 0.05);
  return clamp(Math.round((Math.min(ratioValue, 7) - 1) / 6 * 100));
}
function colorLum(color: string): number {
  if (!color.startsWith("#")) return 0.25;
  const hex = color.replace("#", "").slice(0, 6);
  if (hex.length !== 6) return 0.85;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  if ([r, g, b].some((value) => Number.isNaN(value))) return 0.85;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function placement(centerPoint?: { x: number; y: number }): string {
  if (!centerPoint) return "unknown";
  const horizontal = centerPoint.x < 1 / 3 ? "left" : centerPoint.x > 2 / 3 ? "right" : "center";
  const vertical = centerPoint.y < 1 / 3 ? "top" : centerPoint.y > 2 / 3 ? "bottom" : "middle";
  return `${vertical}-${horizontal}`;
}
function scaleForbiddenZones(result: StandardGenerationResult): Array<TitleBox & { id: string; reasonType: string }> {
  const zones = result.titleCandidatePipelineResult?.candidateResult.spatialStrategy.backgroundLayout.forbiddenZones ?? [];
  const canvas = result.titleAssetResult?.titleAsset?.canvas ?? { width: 1000, height: 1000 };
  return zones.map((zone) => ({ id: zone.id, reasonType: zone.reasonType, x: round(zone.x * canvas.width / 1000), y: round(zone.y * canvas.height / 1000), width: round(zone.width * canvas.width / 1000), height: round(zone.height * canvas.height / 1000) }));
}
function logoBox(result: StandardGenerationResult): TitleBox | undefined {
  const logo = result.finalComposerResult?.layerManifest.find((item) => item.kind === "logo");
  return logo ? { x: logo.left, y: logo.top, width: logo.width, height: logo.height } : undefined;
}
function pastedRisk(centerPoint: { x: number; y: number } | undefined, area: number): boolean {
  return Boolean(centerPoint && Math.abs(centerPoint.x - 0.5) < 0.05 && Math.abs(centerPoint.y - 0.5) < 0.08 && area < 0.045);
}
function scaleMaybe(box: TitleBox | undefined, result: StandardGenerationResult): TitleBox | undefined {
  const scale = result.diagnostics.blueprintScale;
  return box && scale ? { x: box.x * scale.scaleX, y: box.y * scale.scaleY, width: box.width * scale.scaleX, height: box.height * scale.scaleY } : box;
}
function union(boxes: Array<TitleBox | null | undefined> | undefined): TitleBox | undefined {
  const valid = boxes?.filter((box): box is TitleBox => Boolean(box && box.width > 0 && box.height > 0)) ?? [];
  if (!valid.length) return undefined;
  const x1 = Math.min(...valid.map((box) => box.x)); const y1 = Math.min(...valid.map((box) => box.y));
  const x2 = Math.max(...valid.map((box) => box.x + box.width)); const y2 = Math.max(...valid.map((box) => box.y + box.height));
  return { x: x1, y: y1, width: x2 - x1, height: y2 - y1 };
}
function areaRatio(box: TitleBox | undefined, canvas: TitleBox): number { return round(box ? box.width * box.height / Math.max(1, canvas.width * canvas.height) : 0); }
function center(box: TitleBox, canvas: TitleBox): { x: number; y: number } { return { x: round((box.x + box.width / 2) / canvas.width), y: round((box.y + box.height / 2) / canvas.height) }; }
function ratio(value: number | undefined, total: number): number { return round(value ? value / Math.max(1, total) : 0); }
function overlapRatio(left: TitleBox, right: TitleBox): number { const w = Math.max(0, Math.min(left.x + left.width, right.x + right.width) - Math.max(left.x, right.x)); const h = Math.max(0, Math.min(left.y + left.height, right.y + right.height) - Math.max(left.y, right.y)); return w * h / Math.max(1, Math.min(left.width * left.height, right.width * right.height)); }
function roundBox(box: TitleBox | undefined): TitleBox | undefined { return box ? { x: round(box.x), y: round(box.y), width: round(box.width), height: round(box.height) } : undefined; }
function round(value: number): number { return Math.round(value * 10000) / 10000; }
function clamp(value: number): number { return Math.max(0, Math.min(100, value)); }
