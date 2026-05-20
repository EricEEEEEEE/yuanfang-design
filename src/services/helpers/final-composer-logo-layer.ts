import sharp from "sharp";
import type {
  FinalComposerInput,
  FinalComposerLayerManifestItem,
  FinalLogoDecision,
} from "@/models/final-composer";
import type { TitleAsset } from "@/models/title-asset";
import { loadFinalLogoVariants } from "@/services/helpers/final-composer-logo-asset";
import { decideFinalLogo } from "@/services/helpers/final-composer-logo-decision";

type PreparedLogoLayer = FinalComposerLayerManifestItem & {
  input: Buffer;
};

export type PreparedLogoLayersResult = {
  layers: PreparedLogoLayer[];
  decision?: FinalLogoDecision;
  warnings: string[];
};

export async function prepareFinalLogoLayers(input: FinalComposerInput): Promise<PreparedLogoLayersResult> {
  const asset = input.brandAssets?.logo;
  if (!asset || asset.placementPolicy === "none") return { layers: [], warnings: [] };
  const loaded = await loadFinalLogoVariants(asset);
  const resolved = await decideFinalLogo({
    background: input.backgroundAsset.input,
    canvas: input.canvas,
    requestedLogo: asset,
    variants: loaded.variants,
    titleBoxes: titleObstacleBoxes(input.titleAsset),
  });
  const placement = resolved.decision.logoPlacement;
  if (!placement || !resolved.selectedVariant) {
    return { layers: [], decision: resolved.decision, warnings: [...loaded.warnings, ...resolved.warnings] };
  }

  const patch = resolved.decision.protectionPatch
    ? [await prepareLogoPatchLayer(resolved.decision)]
    : [];
  return {
    layers: [
      ...patch,
      {
        layerId: "logo",
        kind: "logo",
        sourceId: resolved.selectedVariant.key,
        top: placement.top,
        left: placement.left,
        width: placement.width,
        height: placement.height,
        opacity: 1,
        blendMode: "normal",
        input: resolved.selectedVariant.input,
      },
    ],
    decision: resolved.decision,
    warnings: [...loaded.warnings, ...resolved.warnings],
  };
}

async function prepareLogoPatchLayer(decision: FinalLogoDecision): Promise<PreparedLogoLayer> {
  const patch = decision.protectionPatch!;
  const svg = `<svg width="${patch.width}" height="${patch.height}" viewBox="0 0 ${patch.width} ${patch.height}" xmlns="http://www.w3.org/2000/svg"><rect width="${patch.width}" height="${patch.height}" rx="14" fill="${patch.fill}" opacity="${patch.opacity}"/></svg>`;
  return {
    layerId: "logoProtectionPatch",
    kind: "logoProtectionPatch",
    sourceId: "minimalProtectionPatch",
    top: patch.top,
    left: patch.left,
    width: patch.width,
    height: patch.height,
    opacity: 1,
    blendMode: "normal",
    input: await sharp(Buffer.from(svg)).png().toBuffer(),
  };
}

function titleObstacleBoxes(titleAsset: TitleAsset): Array<{ left: number; top: number; width: number; height: number }> {
  const box = titleAsset.measuredBoxes.lockupBox;
  return [{ left: box.x, top: box.y, width: box.width, height: box.height }];
}
