import { createHash } from "node:crypto";
import sharp from "sharp";
import type {
  FinalBackgroundAsset,
  FinalBrandLayerAsset,
  FinalCampusInfoAsset,
  FinalComposerInput,
  FinalComposerLayerKind,
  FinalComposerLayerManifestItem,
  FinalComposerResult,
  FinalComposerSafetyCheck,
} from "@/models/final-composer";
import type { TitleAsset } from "@/models/title-asset";

const DEFAULT_JPEG_QUALITY = 78;
const EDGE_MARGIN_PX = 60;
const CAMPUS_BOTTOM_MARGIN_PX = 76;

type Placement = {
  left: number;
  top: number;
  width: number;
  height: number;
};

type PreparedLayer = FinalComposerLayerManifestItem & {
  input: Buffer;
};

export async function composeFinalPoster(
  input: FinalComposerInput,
): Promise<FinalComposerResult> {
  const safety = buildSafetyChecks(input);
  const titleLayer = input.titleAsset.rasterLayer;
  const layerManifest = titleLayer
    ? [backgroundManifest(input.backgroundAsset), titleManifest(input.titleAsset)]
    : [backgroundManifest(input.backgroundAsset)];
  const diagnostics = {
    layerOrder: layerManifest.map((item) => item.kind),
    titleAssetSha256: titleLayer?.sha256,
    backgroundSha256: input.backgroundAsset.sha256,
  };

  if (!safetyPassed(safety)) {
    return {
      source: "final-composer-v1",
      layerManifest,
      safety: { passed: false, checks: safety },
      diagnostics,
      warnings: [],
      reason: "Final Composer rejected input before composition.",
    };
  }

  const preparedLayers = buildPreparedLayers(input);
  const manifest = preparedLayers.map(({ input: _layerInput, ...item }) => item);
  const outputMimeType = input.compositionPolicy.outputMimeType ?? "image/jpeg";
  const jpegQuality = input.compositionPolicy.jpegQuality ?? DEFAULT_JPEG_QUALITY;
  let outputBuffer: Buffer;

  try {
    outputBuffer = await renderOutput(input, preparedLayers, outputMimeType, jpegQuality);
  } catch (error) {
    return {
      source: "final-composer-v1",
      layerManifest: manifest,
      safety: {
        passed: false,
        checks: [
          ...safety,
          check("output_compose_succeeded", false, "error", "Sharp composition must complete before Final Composer can return artwork."),
        ],
      },
      diagnostics: {
        layerOrder: manifest.map((item) => item.kind),
        titleAssetSha256: titleLayer?.sha256,
        backgroundSha256: input.backgroundAsset.sha256,
      },
      warnings: [...buildWarnings(input), errorMessage(error)],
      reason: "Final Composer failed during Sharp composition.",
    };
  }

  return {
    source: "final-composer-v1",
    output: {
      input: outputBuffer,
      width: input.canvas.width,
      height: input.canvas.height,
      mimeType: outputMimeType,
      ...(outputMimeType === "image/jpeg" ? { quality: jpegQuality } : {}),
      sha256: sha256(outputBuffer),
      byteLength: outputBuffer.byteLength,
    },
    layerManifest: manifest,
    safety: { passed: true, checks: safety },
    diagnostics: {
      layerOrder: manifest.map((item) => item.kind),
      titleAssetSha256: titleLayer?.sha256,
      backgroundSha256: input.backgroundAsset.sha256,
    },
    warnings: buildWarnings(input),
    reason: "Final Composer v1 composed final poster from immutable raster layers.",
  };
}

function buildPreparedLayers(input: FinalComposerInput): PreparedLayer[] {
  const layers: PreparedLayer[] = [
    { ...backgroundManifest(input.backgroundAsset), input: input.backgroundAsset.input },
    { ...titleManifest(input.titleAsset), input: input.titleAsset.rasterLayer!.input },
  ];
  const logo = prepareBrandLayer("logo", input.brandAssets?.logo, input.canvas);
  const mascot = prepareBrandLayer("mascot", input.brandAssets?.mascot, input.canvas);
  const campusInfo = prepareCampusInfoLayer(input.campusInfoAsset, input.canvas);

  return [
    ...layers,
    ...(logo ? [logo] : []),
    ...(mascot ? [mascot] : []),
    ...(campusInfo ? [campusInfo] : []),
  ];
}

function backgroundManifest(asset: FinalBackgroundAsset): FinalComposerLayerManifestItem {
  return {
    layerId: "background",
    kind: "background",
    sourceId: asset.source,
    top: 0,
    left: 0,
    width: asset.width,
    height: asset.height,
    opacity: 1,
    blendMode: "normal",
  };
}

function titleManifest(titleAsset: TitleAsset): FinalComposerLayerManifestItem {
  const layer = titleAsset.rasterLayer;

  return {
    layerId: "titleAsset",
    kind: "titleAsset",
    sourceId: titleAsset.assetId,
    top: layer?.top ?? 0,
    left: layer?.left ?? 0,
    width: layer?.width ?? 0,
    height: layer?.height ?? 0,
    opacity: 1,
    blendMode: "normal",
  };
}

function prepareBrandLayer(
  kind: Extract<FinalComposerLayerKind, "logo" | "mascot">,
  asset: FinalBrandLayerAsset | undefined,
  canvas: { width: number; height: number },
): PreparedLayer | undefined {
  if (!asset || asset.placementPolicy === "none") return undefined;
  const placement = placeBrandLayer(kind, asset, canvas);

  return {
    layerId: kind,
    kind,
    top: placement.top,
    left: placement.left,
    width: placement.width,
    height: placement.height,
    opacity: 1,
    blendMode: "normal",
    input: asset.input,
  };
}

function prepareCampusInfoLayer(
  asset: FinalCampusInfoAsset | undefined,
  canvas: { width: number; height: number },
): PreparedLayer | undefined {
  if (!asset?.enabled || !asset.input || !asset.width || !asset.height) {
    return undefined;
  }

  const placement = placeCampusInfoLayer(asset, canvas);

  return {
    layerId: "campusInfo",
    kind: "campusInfo",
    top: placement.top,
    left: placement.left,
    width: placement.width,
    height: placement.height,
    opacity: 1,
    blendMode: "normal",
    input: asset.input,
  };
}

function placeBrandLayer(
  kind: Extract<FinalComposerLayerKind, "logo" | "mascot">,
  asset: FinalBrandLayerAsset,
  canvas: { width: number; height: number },
): Placement {
  if (asset.placementPolicy === "topLeft") {
    return { left: EDGE_MARGIN_PX, top: EDGE_MARGIN_PX, width: asset.width, height: asset.height };
  }

  if (asset.placementPolicy === "topRight") {
    return {
      left: canvas.width - asset.width - EDGE_MARGIN_PX,
      top: EDGE_MARGIN_PX,
      width: asset.width,
      height: asset.height,
    };
  }

  return {
    left: canvas.width - asset.width - EDGE_MARGIN_PX,
    top: canvas.height - asset.height - EDGE_MARGIN_PX,
    width: asset.width,
    height: asset.height,
  };
}

function placeCampusInfoLayer(
  asset: FinalCampusInfoAsset,
  canvas: { width: number; height: number },
): Placement {
  const width = asset.width ?? 0;
  const height = asset.height ?? 0;

  return {
    left: Math.round((canvas.width - width) / 2),
    top: canvas.height - height - CAMPUS_BOTTOM_MARGIN_PX,
    width,
    height,
  };
}

async function renderOutput(
  input: FinalComposerInput,
  layers: PreparedLayer[],
  outputMimeType: "image/jpeg" | "image/png",
  jpegQuality: number,
): Promise<Buffer> {
  const background = await sharp(input.backgroundAsset.input)
    .resize(input.canvas.width, input.canvas.height, { fit: "cover" })
    .toBuffer();
  const overlays = layers
    .filter((layer) => layer.kind !== "background")
    .map((layer) => ({
      input: layer.input,
      left: layer.left,
      top: layer.top,
      blend: "over" as const,
    }));
  const image = sharp(background).composite(overlays);

  if (outputMimeType === "image/png") {
    return image.png().toBuffer();
  }

  return image.jpeg({ quality: jpegQuality }).toBuffer();
}

function buildSafetyChecks(input: FinalComposerInput): FinalComposerSafetyCheck[] {
  const titleLayer = input.titleAsset.rasterLayer;
  const checks: FinalComposerSafetyCheck[] = [
    check("canvas_valid", isPositiveInteger(input.canvas.width) && isPositiveInteger(input.canvas.height), "error", "canvas width and height must be positive integers."),
    check("background_asset_valid", isValidBackground(input.backgroundAsset), "error", "background asset must include a supported image buffer and positive dimensions."),
    check("title_asset_kind_raster_layer", input.titleAsset.assetKind === "titleRasterLayer", "error", "Final Composer only accepts TitleAsset.assetKind=titleRasterLayer."),
    check("title_asset_output_target_raster_layer", input.titleAsset.outputTarget === "rasterLayer", "error", "Final Composer only accepts TitleAsset.outputTarget=rasterLayer."),
    check("title_asset_render_mode_production", input.titleAsset.renderMode === "production", "error", "Final Composer only accepts production TitleAsset renderMode."),
    check("title_asset_safety_passed", input.titleAsset.safety.passed === true, "error", "Final Composer requires the upstream title asset safety gate to pass."),
    check("title_raster_layer_exists", Boolean(titleLayer), "error", "TitleAsset.rasterLayer is required for production composition."),
    check("title_raster_layer_png", titleLayer?.mimeType === "image/png", "error", "TitleAsset.rasterLayer must be a transparent PNG layer."),
    check("title_raster_layer_buffer_valid", Buffer.isBuffer(titleLayer?.input) && (titleLayer?.input.byteLength ?? 0) > 0, "error", "TitleAsset.rasterLayer.input must be a non-empty Buffer."),
    check("title_raster_layer_byte_length_valid", Number.isInteger(titleLayer?.byteLength) && (titleLayer?.byteLength ?? 0) > 0, "error", "TitleAsset.rasterLayer.byteLength metadata must be positive."),
    check("title_asset_canvas_matches", input.titleAsset.canvas.width === input.canvas.width && input.titleAsset.canvas.height === input.canvas.height, "error", "TitleAsset canvas must match Final Composer canvas."),
    check("title_asset_bounds_respected", Boolean(titleLayer && layerInsideCanvas(titleLayer, input.canvas)), "error", "TitleAsset.rasterLayer bounds must stay inside the Final Composer canvas."),
    check("debug_svg_not_used", input.titleAsset.assetKind !== "debugSvg", "error", "debugSvg is diagnostic only and cannot be used as production artwork."),
    check("measurement_svg_not_used", input.titleAsset.assetKind !== "measurementSvg", "error", "measurementSvg is diagnostic only and cannot be used as production artwork."),
    check("composition_policy_locked", isLockedPolicy(input.compositionPolicy), "error", "Final Composer requires locked no-mutation composition policy flags."),
    check("output_mime_type_supported", !input.compositionPolicy.outputMimeType || input.compositionPolicy.outputMimeType === "image/jpeg" || input.compositionPolicy.outputMimeType === "image/png", "error", "Final Composer supports image/jpeg and image/png outputs."),
    check("jpeg_quality_valid", input.compositionPolicy.jpegQuality === undefined || isValidQuality(input.compositionPolicy.jpegQuality), "error", "jpegQuality must be an integer from 1 to 100 when provided."),
    ...brandAssetChecks("logo", input.brandAssets?.logo),
    ...brandAssetChecks("mascot", input.brandAssets?.mascot),
    ...campusInfoChecks(input.campusInfoAsset),
  ];

  return checks;
}

function brandAssetChecks(
  label: "logo" | "mascot",
  asset: FinalBrandLayerAsset | undefined,
): FinalComposerSafetyCheck[] {
  if (!asset || asset.placementPolicy === "none") return [];

  return [
    check(`${label}_asset_buffer_valid`, Buffer.isBuffer(asset.input) && asset.input.byteLength > 0, "error", `${label} asset input must be a non-empty Buffer.`),
    check(`${label}_asset_dimensions_valid`, isPositiveInteger(asset.width) && isPositiveInteger(asset.height), "error", `${label} asset dimensions must be positive integers.`),
  ];
}

function campusInfoChecks(asset: FinalCampusInfoAsset | undefined): FinalComposerSafetyCheck[] {
  if (!asset?.enabled) return [];

  return [
    check("campus_info_prerendered_asset_required", Buffer.isBuffer(asset.input) && (asset.input?.byteLength ?? 0) > 0, "error", "campusInfoAsset must be pre-rendered before Final Composer."),
    check("campus_info_dimensions_valid", isPositiveInteger(asset.width) && isPositiveInteger(asset.height), "error", "campusInfoAsset width and height must be positive integers."),
  ];
}

function buildWarnings(input: FinalComposerInput): string[] {
  return [
    ...(input.titleAsset.debugSvg ? ["debugSvg retained for diagnostics but ignored by Final Composer."] : []),
    ...(input.titleAsset.measurementSvg ? ["measurementSvg retained for diagnostics but ignored by Final Composer."] : []),
  ];
}

function isValidBackground(asset: FinalBackgroundAsset): boolean {
  return (
    Buffer.isBuffer(asset.input) &&
    asset.input.byteLength > 0 &&
    isPositiveInteger(asset.width) &&
    isPositiveInteger(asset.height) &&
    (asset.mimeType === "image/png" || asset.mimeType === "image/jpeg")
  );
}

function isLockedPolicy(policy: FinalComposerInput["compositionPolicy"]): boolean {
  return (
    policy.respectTitleAssetBounds === true &&
    policy.doNotModifyTitleAsset === true &&
    policy.doNotReflowTitle === true &&
    policy.doNotRegenerateBackground === true &&
    policy.requireTitleAssetSafetyPassed === true
  );
}

function layerInsideCanvas(
  layer: { left: number; top: number; width: number; height: number },
  canvas: { width: number; height: number },
): boolean {
  return (
    layer.left >= 0 &&
    layer.top >= 0 &&
    layer.width > 0 &&
    layer.height > 0 &&
    layer.left + layer.width <= canvas.width &&
    layer.top + layer.height <= canvas.height
  );
}

function safetyPassed(checks: readonly FinalComposerSafetyCheck[]): boolean {
  return checks.every((item) => item.passed || item.severity !== "error");
}

function check(
  code: string,
  passed: boolean,
  severity: FinalComposerSafetyCheck["severity"],
  reason: string,
): FinalComposerSafetyCheck {
  return { code, passed, severity, reason };
}

function isPositiveInteger(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) > 0;
}

function isValidQuality(value: number): boolean {
  return Number.isInteger(value) && value >= 1 && value <= 100;
}

function errorMessage(error: unknown): string {
  return error instanceof Error
    ? `Sharp composition failed: ${error.message}`
    : "Sharp composition failed with an unknown error.";
}

function sha256(input: Buffer): string {
  return createHash("sha256").update(input).digest("hex");
}
