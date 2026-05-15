import { createHash } from "node:crypto";
import { writeFile } from "node:fs/promises";
import sharp from "sharp";
import type { TitleAsset } from "../src/models/title-asset";
import type { FinalComposerInput } from "../src/models/final-composer";
import { composeFinalPoster } from "../src/services/final-composer.service";

const CANVAS = { width: 1080, height: 1620 };
const OUTPUT_PATH = "/tmp/yuanfang-final-composer-v1.jpg";

async function main(): Promise<void> {
  const background = await createBackground();
  const titleLayer = await createTitleLayer();
  const logo = await createLogoLayer();
  const mascot = await createMascotLayer();
  const campusInfo = await createCampusInfoLayer();
  const titleAsset = createTitleAsset(titleLayer);
  const input = createInput(background, titleAsset, logo, mascot, campusInfo);
  const originalTitleLayerHash = sha256(titleLayer);
  const result = await composeFinalPoster(input);

  assert(result.safety.passed, "FINAL_COMPOSER_SAFETY_PASS");
  assert(result.output?.mimeType === "image/jpeg", "FINAL_COMPOSER_OUTPUT_JPEG");
  assert(result.output?.quality === 78, "FINAL_COMPOSER_QUALITY_78");
  assert(result.output?.width === CANVAS.width && result.output.height === CANVAS.height, "FINAL_COMPOSER_SIZE_MATCH");
  assert(result.diagnostics.layerOrder.join(">") === "background>titleAsset>logo>mascot>campusInfo", "FINAL_COMPOSER_LAYER_ORDER");
  assert(result.diagnostics.titleAssetSha256 === originalTitleLayerHash, "FINAL_COMPOSER_TITLE_SHA_DIAGNOSTIC");
  assert(sha256(titleLayer) === originalTitleLayerHash, "FINAL_COMPOSER_TITLE_IMMUTABLE");

  await writeFile(OUTPUT_PATH, result.output.input);

  const failedSafety = await composeFinalPoster({
    ...input,
    titleAsset: { ...titleAsset, safety: { passed: false, checks: [] } },
  });
  assert(!failedSafety.safety.passed && !failedSafety.output, "FINAL_COMPOSER_REJECTS_FAILED_TITLE_SAFETY");

  const measurementSvgAsset = await composeFinalPoster({
    ...input,
    titleAsset: { ...titleAsset, assetKind: "measurementSvg", rasterLayer: undefined },
  });
  assert(!measurementSvgAsset.safety.passed && !measurementSvgAsset.output, "FINAL_COMPOSER_REJECTS_MEASUREMENT_SVG");

  const debugSvgAsset = await composeFinalPoster({
    ...input,
    titleAsset: { ...titleAsset, assetKind: "debugSvg", rasterLayer: undefined },
  });
  assert(!debugSvgAsset.safety.passed && !debugSvgAsset.output, "FINAL_COMPOSER_REJECTS_DEBUG_SVG");

  const canvasMismatch = await composeFinalPoster({
    ...input,
    titleAsset: { ...titleAsset, canvas: { width: 720, height: 1080 } },
  });
  assert(!canvasMismatch.safety.passed && !canvasMismatch.output, "FINAL_COMPOSER_REJECTS_CANVAS_MISMATCH");

  console.log("FINAL_COMPOSER_V1_PASS", {
    outputPath: OUTPUT_PATH,
    outputBytes: result.output.byteLength,
    layerOrder: result.diagnostics.layerOrder.join(">"),
    titleAssetSha256: result.diagnostics.titleAssetSha256,
    outputSha256: result.output.sha256,
  });
}

async function createBackground(): Promise<Buffer> {
  return sharp({
    create: {
      width: CANVAS.width,
      height: CANVAS.height,
      channels: 3,
      background: "#f7fbff",
    },
  })
    .composite([
      {
        input: Buffer.from(`<svg width="${CANVAS.width}" height="${CANVAS.height}" viewBox="0 0 ${CANVAS.width} ${CANVAS.height}" xmlns="http://www.w3.org/2000/svg">
          <rect width="1080" height="1620" fill="#f7fbff"/>
          <circle cx="820" cy="360" r="260" fill="#dff4ff"/>
          <path d="M0 1240 C260 1120 520 1340 1080 1160 L1080 1620 L0 1620 Z" fill="#e6f6dc"/>
        </svg>`),
        left: 0,
        top: 0,
      },
    ])
    .png()
    .toBuffer();
}

async function createTitleLayer(): Promise<Buffer> {
  return sharp(Buffer.from(`<svg width="${CANVAS.width}" height="${CANVAS.height}" viewBox="0 0 ${CANVAS.width} ${CANVAS.height}" xmlns="http://www.w3.org/2000/svg">
    <rect x="180" y="250" width="620" height="210" rx="32" fill="#ffffff" opacity=".72"/>
    <rect x="218" y="308" width="538" height="52" rx="26" fill="#004089"/>
    <rect x="260" y="388" width="454" height="38" rx="19" fill="#EF7A00"/>
  </svg>`))
    .ensureAlpha()
    .png()
    .toBuffer();
}

async function createLogoLayer(): Promise<Buffer> {
  return sharp({
    create: { width: 180, height: 64, channels: 4, background: "#004089" },
  })
    .png()
    .toBuffer();
}

async function createMascotLayer(): Promise<Buffer> {
  return sharp({
    create: { width: 160, height: 160, channels: 4, background: "#8FC31F" },
  })
    .png()
    .toBuffer();
}

async function createCampusInfoLayer(): Promise<Buffer> {
  return sharp({
    create: { width: 820, height: 120, channels: 4, background: "#FFFFFFCC" },
  })
    .png()
    .toBuffer();
}

function createTitleAsset(titleLayer: Buffer): TitleAsset {
  return {
    assetId: "title-asset-final-composer-fixture",
    candidateId: "candidate-final-composer-fixture",
    source: "debug",
    assetKind: "titleRasterLayer",
    renderMode: "production",
    outputTarget: "rasterLayer",
    canvas: CANVAS,
    rasterLayer: {
      input: titleLayer,
      top: 0,
      left: 0,
      width: CANVAS.width,
      height: CANVAS.height,
      mimeType: "image/png",
      sha256: sha256(titleLayer),
      byteLength: titleLayer.byteLength,
    },
    measuredBoxes: {
      lockupBox: { x: 180, y: 250, width: 620, height: 210 },
      unitBoxes: [],
    },
    glyphRuns: [],
    safety: {
      passed: true,
      checks: [
        {
          checkId: "fixture-title-safety",
          code: "fixture-title-safety",
          passed: true,
          severity: "error",
          reason: "fixture title asset safety passed.",
        },
      ],
    },
    diagnostics: {},
    warnings: [],
    reason: "Fixture title asset for Final Composer v1.",
  };
}

function createInput(
  background: Buffer,
  titleAsset: TitleAsset,
  logo: Buffer,
  mascot: Buffer,
  campusInfo: Buffer,
): FinalComposerInput {
  return {
    canvas: CANVAS,
    backgroundAsset: {
      source: "debugFixture",
      input: background,
      width: CANVAS.width,
      height: CANVAS.height,
      mimeType: "image/png",
      sha256: sha256(background),
    },
    titleAsset,
    brandAssets: {
      logo: { input: logo, width: 180, height: 64, placementPolicy: "topRight" },
      mascot: { input: mascot, width: 160, height: 160, placementPolicy: "optional" },
    },
    campusInfoAsset: {
      enabled: true,
      input: campusInfo,
      width: 820,
      height: 120,
      placementPolicy: "bottomBar",
    },
    compositionPolicy: {
      respectTitleAssetBounds: true,
      doNotModifyTitleAsset: true,
      doNotReflowTitle: true,
      doNotRegenerateBackground: true,
      requireTitleAssetSafetyPassed: true,
      outputMimeType: "image/jpeg",
      jpegQuality: 78,
    },
  };
}

function assert(condition: unknown, code: string): asserts condition {
  if (!condition) {
    throw new Error(code);
  }
}

function sha256(input: Buffer): string {
  return createHash("sha256").update(input).digest("hex");
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);

  console.error("FINAL_COMPOSER_V1_FAILED", message);
  process.exit(1);
});
