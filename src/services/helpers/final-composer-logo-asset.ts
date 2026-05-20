import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import sharp from "sharp";
import { BRAND } from "@/config/brand";
import type {
  FinalBrandLayerAsset,
  FinalLogoVariantAsset,
  FinalLogoVariantKey,
} from "@/models/final-composer";

export type FinalLogoAssetLoadResult = {
  variants: FinalLogoVariantAsset[];
  warnings: string[];
};

export async function loadFinalLogoVariants(
  asset: FinalBrandLayerAsset,
): Promise<FinalLogoAssetLoadResult> {
  if (asset.variantAssets) {
    return {
      variants: asset.variantAssets.filter((item) => item.fullLockup),
      warnings: asset.variantAssets.every((item) => item.fullLockup)
        ? []
        : ["symbol-only logo variant rejected; Final Composer requires full lockup assets."],
    };
  }

  const variants: FinalLogoVariantAsset[] = [];
  const warnings: string[] = [];
  for (const variant of Object.values(BRAND.logoVariants)) {
    try {
      variants.push(await readVariant(variant.key, variant.path, asset.width, variant.derived));
    } catch {
      warnings.push(`logo variant ${variant.key} unavailable; skipped.`);
    }
  }

  if (variants.length === 0 && asset.fullLockup !== false) {
    variants.push({
      key: asset.variantKey ?? "colorFullLockup",
      input: asset.input,
      width: asset.width,
      height: asset.height,
      fullLockup: true,
    });
    warnings.push("logo variant registry unavailable; using supplied full-lockup logo asset as fallback.");
  }

  return { variants, warnings };
}

async function readVariant(
  key: FinalLogoVariantKey,
  path: string,
  width: number,
  derived: boolean,
): Promise<FinalLogoVariantAsset> {
  const { data, info } = await sharp(await readFile(resolve(process.cwd(), path)))
    .resize({ width })
    .png()
    .toBuffer({ resolveWithObject: true });
  return {
    key,
    input: data,
    width: info.width,
    height: info.height,
    derived,
    fullLockup: true,
  };
}
