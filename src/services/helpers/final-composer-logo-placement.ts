import type {
  FinalBrandLayerAsset,
  FinalLogoDecision,
  FinalLogoPlacement,
  FinalLogoPlacementKey,
  FinalLogoVariantKey,
} from "@/models/final-composer";

export type LogoBox = { left: number; top: number; width: number; height: number };

export const LOGO_PATCH_PADDING = 18;

const EDGE = 60;

export function placementCandidates(
  canvas: { width: number; height: number },
  logo: { width: number; height: number },
  policy: FinalBrandLayerAsset["placementPolicy"],
): FinalLogoPlacement[] {
  if (policy === "none") return [];
  const top = EDGE;
  const upper = Math.round(canvas.height * 0.14);
  const bottom = canvas.height - logo.height - EDGE;
  const right = canvas.width - logo.width - EDGE;
  const raw: FinalLogoPlacement[] = [
    { key: "topRight", left: right, top, width: logo.width, height: logo.height },
    { key: "topLeft", left: EDGE, top, width: logo.width, height: logo.height },
    { key: "upperRightSafe", left: right, top: upper, width: logo.width, height: logo.height },
    { key: "upperLeftSafe", left: EDGE, top: upper, width: logo.width, height: logo.height },
    { key: "bottomRight", left: right, top: bottom, width: logo.width, height: logo.height },
    { key: "bottomLeft", left: EDGE, top: bottom, width: logo.width, height: logo.height },
  ];
  return raw.filter((item) => inside(item, canvas));
}

export function placementPrior(
  key: FinalLogoPlacementKey,
  hint: FinalBrandLayerAsset["logoStrategyHint"],
): number {
  if (hint === "repositionPreferred" && key !== "topRight") return 0.04;
  if (key === "topRight") return 0.02;
  return 0;
}

export function patchFor(
  place: FinalLogoPlacement,
  variant: FinalLogoVariantKey,
): FinalLogoDecision["protectionPatch"] {
  const lightLogo = variant === "whiteLockup" || variant === "monochromeLight";
  return {
    left: place.left - LOGO_PATCH_PADDING,
    top: place.top - LOGO_PATCH_PADDING,
    width: place.width + LOGO_PATCH_PADDING * 2,
    height: place.height + LOGO_PATCH_PADDING * 2,
    fill: lightLogo ? "#004089" : "#FFFFFF",
    opacity: lightLogo ? 0.28 : 0.42,
  };
}

export function expand(box: LogoBox, by: number): LogoBox {
  return {
    left: box.left - by,
    top: box.top - by,
    width: box.width + by * 2,
    height: box.height + by * 2,
  };
}

export function intersects(a: LogoBox, b: LogoBox): boolean {
  return a.left < b.left + b.width &&
    a.left + a.width > b.left &&
    a.top < b.top + b.height &&
    a.top + a.height > b.top;
}

function inside(box: LogoBox, canvas: { width: number; height: number }): boolean {
  return box.left >= 0 &&
    box.top >= 0 &&
    box.left + box.width <= canvas.width &&
    box.top + box.height <= canvas.height;
}
