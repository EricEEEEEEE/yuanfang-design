import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import sharp from "sharp";
import { BRAND, type BrandLogoVariantKey } from "../src/config/brand";
import type {
  FinalBrandLayerAsset,
  FinalComposerInput,
  FinalLogoVariantAsset,
} from "../src/models/final-composer";
import type { TitleAsset } from "../src/models/title-asset";
import { composeFinalPoster } from "../src/services/final-composer.service";

const CANVAS = { width: 1080, height: 1620 };
const LOGO_WIDTH = 180;

async function main(): Promise<void> {
  assert(allRegistryVariantsAreFullLockup(), "LOGO_REGISTRY_FULL_LOCKUP");
  assert(!Object.values(BRAND.logoVariants).some((item) => item.path.includes("logo-symbol")), "LOGO_SYMBOL_NOT_IN_LOCKUP_REGISTRY");

  const light = await runCase(await flat("#f7fbff"));
  assert(["colorFullLockup", "deepBlueLockup"].includes(light.diagnostics.selectedLogoVariant ?? ""), "LIGHT_CLEAN_VARIANT");
  assert(light.diagnostics.usedProtectionPatch === false, "LIGHT_CLEAN_NO_PATCH");

  const dark = await runCase(await flat("#06254a"));
  assert(dark.diagnostics.selectedLogoVariant === "whiteLockup", "DARK_CLEAN_WHITE_LOCKUP");
  assert(dark.diagnostics.usedProtectionPatch === false, "DARK_CLEAN_NO_PATCH");

  const warm = await runCase(await flat("#fff2d6"));
  assert(warm.diagnostics.selectedLogoVariant === "deepBlueLockup", "WARM_LIGHT_DEEPBLUE");
  assert(warm.diagnostics.usedProtectionPatch === false, "WARM_LIGHT_NO_PATCH");

  const moved = await runCase(await complexTopRight());
  assert(moved.diagnostics.logoPlacement?.key !== "topRight", "COMPLEX_TOP_RIGHT_REPOSITIONED");
  assert(moved.diagnostics.usedProtectionPatch === false, "COMPLEX_TOP_RIGHT_NO_PATCH");

  const patched = await runCase(await complexAllCorners(), "repositionPreferred");
  assert(patched.diagnostics.usedProtectionPatch === true, "ALL_COMPLEX_PATCH_USED");
  assertPatchCoversFullLockup(patched.diagnostics.logoDecision);

  const colorOnly = await runCase(await flat("#06254a"), undefined, ["colorFullLockup"]);
  assert(colorOnly.warnings.some((item) => item.includes("white/light logo variant unavailable")), "MISSING_WHITE_WARNING");
  assert(colorOnly.diagnostics.usedProtectionPatch === true, "MISSING_WHITE_FAIL_SAFE_PATCH");

  const symbol = await runSymbolOnlyRejection();
  assert(!symbol.safety.passed && !symbol.output, "SYMBOL_ONLY_REJECTED");
  assert(symbol.safety.checks.some((item) => item.code === "logo_asset_full_lockup" && !item.passed), "SYMBOL_ONLY_CHECK_CODE");

  console.log("FINAL_COMPOSER_LOGO_VARIANT_PASS", {
    light: light.diagnostics.selectedLogoVariant,
    dark: dark.diagnostics.selectedLogoVariant,
    warm: warm.diagnostics.selectedLogoVariant,
    moved: moved.diagnostics.logoPlacement?.key,
    patched: patched.diagnostics.usedProtectionPatch,
    missingWhiteWarnings: colorOnly.warnings.length,
  });
}

async function runCase(
  background: Buffer,
  logoStrategyHint?: FinalBrandLayerAsset["logoStrategyHint"],
  variantKeys?: BrandLogoVariantKey[],
): Promise<Awaited<ReturnType<typeof composeFinalPoster>>> {
  const logo = await logoAsset(variantKeys, logoStrategyHint);
  const titleLayer = await transparentLayer();
  return composeFinalPoster(input(background, createTitleAsset(titleLayer), logo));
}

async function runSymbolOnlyRejection(): Promise<Awaited<ReturnType<typeof composeFinalPoster>>> {
  const data = await sharp(readFileSync(resolve(process.cwd(), BRAND.logoSymbolPath)))
    .resize({ width: LOGO_WIDTH })
    .png()
    .toBuffer({ resolveWithObject: true });
  const logo: FinalBrandLayerAsset = {
    input: data.data,
    width: data.info.width,
    height: data.info.height,
    placementPolicy: "topRight",
    fullLockup: false,
  };
  return composeFinalPoster(input(await flat("#f7fbff"), createTitleAsset(await transparentLayer()), logo));
}

function input(
  background: Buffer,
  titleAsset: TitleAsset,
  logo: FinalBrandLayerAsset,
): FinalComposerInput {
  return {
    canvas: CANVAS,
    backgroundAsset: { source: "debugFixture", input: background, width: CANVAS.width, height: CANVAS.height, mimeType: "image/png", sha256: sha256(background) },
    titleAsset,
    brandAssets: { logo },
    campusInfoAsset: { enabled: false },
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

async function logoAsset(
  variantKeys?: BrandLogoVariantKey[],
  logoStrategyHint?: FinalBrandLayerAsset["logoStrategyHint"],
): Promise<FinalBrandLayerAsset> {
  const variants = await logoVariants(variantKeys);
  const color = variants.find((item) => item.key === "colorFullLockup") ?? variants[0];
  return {
    input: color.input,
    width: color.width,
    height: color.height,
    placementPolicy: "topRight",
    fullLockup: true,
    logoStrategyHint,
    ...(variantKeys ? { variantAssets: variants } : {}),
  };
}

async function logoVariants(keys?: BrandLogoVariantKey[]): Promise<FinalLogoVariantAsset[]> {
  const selected = keys ?? Object.keys(BRAND.logoVariants) as BrandLogoVariantKey[];
  const out: FinalLogoVariantAsset[] = [];
  for (const key of selected) {
    const spec = BRAND.logoVariants[key];
    const data = await sharp(readFileSync(resolve(process.cwd(), spec.path)))
      .resize({ width: LOGO_WIDTH })
      .png()
      .toBuffer({ resolveWithObject: true });
    out.push({ key, input: data.data, width: data.info.width, height: data.info.height, derived: spec.derived, fullLockup: true });
  }
  return out;
}

async function flat(color: string): Promise<Buffer> {
  return sharp({ create: { width: CANVAS.width, height: CANVAS.height, channels: 4, background: color } }).png().toBuffer();
}

async function complexTopRight(): Promise<Buffer> {
  return sharp(Buffer.from(`<svg width="${CANVAS.width}" height="${CANVAS.height}" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="#f7fbff"/>
    <rect x="760" y="40" width="260" height="260" fill="#041b3d"/>
    ${Array.from({ length: 18 }, (_, i) => `<path d="M760 ${48 + i * 13} L1020 ${120 + i * 9}" stroke="${i % 2 ? "#fff" : "#ef7a00"}" stroke-width="7"/>`).join("")}
  </svg>`)).png().toBuffer();
}

async function complexAllCorners(): Promise<Buffer> {
  const cols = 30;
  const rows = 45;
  const stripes = Array.from({ length: cols * rows }, (_, i) => `<rect x="${(i % cols) * 36}" y="${Math.floor(i / cols) * 36}" width="36" height="36" fill="${i % 2 ? "#071f3f" : "#f7fbff"}"/>`).join("");
  return sharp(Buffer.from(`<svg width="${CANVAS.width}" height="${CANVAS.height}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#8fc31f"/>${stripes}</svg>`)).png().toBuffer();
}

async function transparentLayer(): Promise<Buffer> {
  return sharp({ create: { width: CANVAS.width, height: CANVAS.height, channels: 4, background: "#00000000" } }).png().toBuffer();
}

function createTitleAsset(titleLayer: Buffer): TitleAsset {
  return {
    assetId: "title-logo-variant-fixture",
    candidateId: "candidate-logo-variant-fixture",
    source: "debug",
    assetKind: "titleRasterLayer",
    renderMode: "production",
    outputTarget: "rasterLayer",
    canvas: CANVAS,
    rasterLayer: { input: titleLayer, top: 0, left: 0, width: CANVAS.width, height: CANVAS.height, mimeType: "image/png", sha256: sha256(titleLayer), byteLength: titleLayer.byteLength },
    measuredBoxes: { lockupBox: { x: 320, y: 520, width: 440, height: 280 }, unitBoxes: [] },
    glyphRuns: [],
    safety: { passed: true, checks: [{ checkId: "fixture", code: "fixture", passed: true, severity: "error", reason: "fixture title asset safety passed." }] },
    diagnostics: {},
    warnings: [],
    reason: "Fixture title asset for logo variant tests.",
  };
}

function assertPatchCoversFullLockup(decision: Awaited<ReturnType<typeof composeFinalPoster>>["diagnostics"]["logoDecision"]): void {
  assert(Boolean(decision?.protectionPatch && decision.logoPlacement), "PATCH_DIAGNOSTICS_EXIST");
  assert(decision!.protectionPatch!.width > decision!.logoPlacement!.width, "PATCH_WIDTH_COVERS_LOCKUP");
  assert(decision!.protectionPatch!.height > decision!.logoPlacement!.height, "PATCH_HEIGHT_COVERS_LOCKUP");
}

function allRegistryVariantsAreFullLockup(): boolean {
  return Object.values(BRAND.logoVariants).every((item) => item.fullLockup && item.path.includes("logo-lockup"));
}

function assert(condition: unknown, code: string): asserts condition {
  if (!condition) throw new Error(code);
}

function sha256(input: Buffer): string {
  return createHash("sha256").update(input).digest("hex");
}
main().catch((error: unknown) => {
  console.error("FINAL_COMPOSER_LOGO_VARIANT_FAILED", error instanceof Error ? error.message : String(error));
  process.exit(1);
});
