import type { FinalBrandLayerAsset, FinalLogoCandidateScore, FinalLogoDecision, FinalLogoPlacement, FinalLogoVariantAsset, FinalLogoVariantKey } from "@/models/final-composer";
import { clamp, contrastScore, rawBackground, regionMetrics, round, type LogoRawImage, type LogoRegionMetrics } from "@/services/helpers/final-composer-logo-metrics";
import { expand, intersects, LOGO_PATCH_PADDING, patchFor, placementCandidates, placementPrior, type LogoBox } from "@/services/helpers/final-composer-logo-placement";

const SAFE_SCORE_MIN = 0.62;
const CONTRAST_SCORE_MIN = 0.42;
const COMPLEXITY_MAX = 0.72;
const COLOR_CONTRAST_MIN = 0.36;

export type FinalLogoDecisionInput = {
  background: Buffer;
  canvas: { width: number; height: number };
  requestedLogo: FinalBrandLayerAsset;
  variants: FinalLogoVariantAsset[];
  titleBoxes: LogoBox[];
};

export type FinalLogoDecisionResult = {
  selectedVariant?: FinalLogoVariantAsset;
  decision: FinalLogoDecision;
  warnings: string[];
};

export async function decideFinalLogo(input: FinalLogoDecisionInput): Promise<FinalLogoDecisionResult> {
  const warnings: string[] = [];
  const variants = input.variants.filter((variant) => variant.fullLockup);
  if (variants.length === 0) return noLogo(input, "No full-lockup logo variant was available.", "logo omitted; no full-lockup logo variants available.");

  const raw = await rawBackground(input.background, input.canvas);
  const places = placementCandidates(input.canvas, variants[0], input.requestedLogo.placementPolicy);
  const scores = await scoreCandidates(raw, places, variants, input.titleBoxes, input.requestedLogo.logoStrategyHint);
  const color = bestColor(scores);
  const selected = selectCandidate(scores);
  const selectedVariant = variants.find((variant) => variant.key === selected?.variantKey);
  const selectedPlacement = places.find((place) => place.key === selected?.placementKey);
  if (!selected || !selectedVariant || !selectedPlacement) {
    return noLogo(input, "No inside-canvas logo placement was available.", "logo omitted; no inside-canvas logo placement was available.", scores);
  }

  const colorReadable = Boolean(color?.readable);
  const usedPatch = !selected.readable;
  if (needsLightVariant(selected, variants)) {
    warnings.push("white/light logo variant unavailable; avoided silent color-only logo on dark background.");
  }
  return {
    selectedVariant,
    decision: {
      selectedLogoVariant: selected.variantKey,
      logoPlacement: selectedPlacement,
      logoSafeScore: round(selected.safeScore),
      logoContrastScore: round(selected.contrastScore),
      logoBrandFidelityScore: round(selected.brandFidelityScore),
      logoBackgroundComplexity: round(selected.backgroundComplexity),
      logoDecisionReason: decisionReason(selected, usedPatch),
      logoVariantReason: variantReason(selected, color),
      colorLogoReadable: colorReadable,
      selectedBecause: selectedBecause(selected, colorReadable, usedPatch),
      rejectedColorReason: selected.variantKey === "colorFullLockup" ? undefined : rejectedColorReason(color),
      usedProtectionPatch: usedPatch,
      protectionPatchReason: usedPatch ? "All logo candidates failed safe-zone, contrast, or complexity thresholds; minimal patch covers the full lockup." : undefined,
      protectionPatch: usedPatch ? patchFor(selectedPlacement, selectedVariant.key) : undefined,
      logoStrategyHint: input.requestedLogo.logoStrategyHint,
      candidateScores: scores.slice(0, 12),
    },
    warnings,
  };
}

async function scoreCandidates(
  bg: LogoRawImage,
  places: FinalLogoPlacement[],
  variants: FinalLogoVariantAsset[],
  titleBoxes: LogoBox[],
  hint: FinalBrandLayerAsset["logoStrategyHint"],
): Promise<FinalLogoCandidateScore[]> {
  const out: FinalLogoCandidateScore[] = [];
  for (const place of places) {
    const metrics = regionMetrics(bg, expand(place, LOGO_PATCH_PADDING));
    for (const variant of variants) out.push(await scoreCandidate(bg, place, variant, metrics, titleBoxes, hint));
  }
  return out.sort((left, right) => right.safeScore - left.safeScore);
}

async function scoreCandidate(
  bg: LogoRawImage,
  place: FinalLogoPlacement,
  variant: FinalLogoVariantAsset,
  metrics: LogoRegionMetrics,
  titleBoxes: LogoBox[],
  hint: FinalBrandLayerAsset["logoStrategyHint"],
): Promise<FinalLogoCandidateScore> {
  const contrast = await contrastScore(bg, place, variant);
  const overlap = titleBoxes.some((box) => intersects(expand(place, LOGO_PATCH_PADDING), box));
  const prior = placementPrior(place.key, hint);
  const safe = clamp(contrast * 0.46 + (1 - metrics.complexity) * 0.28 + (1 - metrics.edgeDensity) * 0.16 + prior - (overlap ? 0.45 : 0));
  const brandFidelity = brandFidelityScore(variant.key, metrics, hint);
  const readable = readableCandidate(variant.key, safe, contrast, metrics.complexity, overlap);
  return {
    variantKey: variant.key,
    placementKey: place.key,
    safeScore: round(safe),
    contrastScore: round(contrast),
    brandFidelityScore: round(brandFidelity),
    backgroundComplexity: round(metrics.complexity),
    brightness: round(metrics.brightness / 255),
    edgeClutter: round(metrics.edgeDensity),
    overlapsTitle: overlap,
    readable,
    reason: `brightness=${Math.round(metrics.brightness)} complexity=${round(metrics.complexity)} contrast=${round(contrast)} brandFidelity=${round(brandFidelity)}`,
  };
}

function selectCandidate(scores: FinalLogoCandidateScore[]): FinalLogoCandidateScore | undefined {
  const readable = scores.filter((score) => score.readable);
  return (readable.length ? readable : scores).slice().sort(compareCandidates)[0];
}

function compareCandidates(a: FinalLogoCandidateScore, b: FinalLogoCandidateScore): number {
  return Number(b.readable) - Number(a.readable) ||
    b.brandFidelityScore - a.brandFidelityScore ||
    b.contrastScore - a.contrastScore ||
    a.backgroundComplexity - b.backgroundComplexity ||
    b.safeScore - a.safeScore;
}

function brandFidelityScore(key: FinalLogoVariantKey, m: LogoRegionMetrics, hint: FinalBrandLayerAsset["logoStrategyHint"]): number {
  const base = key === "colorFullLockup" ? 1 : key === "deepBlueLockup" ? 0.72 : key === "whiteLockup" ? 0.48 : monochromePenalty(key);
  const hintBonus = hint === key ? 0.04 : 0;
  const darkMismatch = m.brightness < 90 && (key === "colorFullLockup" || key === "deepBlueLockup") ? 0.22 : 0;
  return clamp(base + hintBonus - darkMismatch);
}

function monochromePenalty(key: FinalLogoVariantKey): number {
  if (key === "monochromeDark") return 0.34;
  if (key === "monochromeLight") return 0.3;
  return 0;
}

function readableCandidate(key: FinalLogoVariantKey, safe: number, contrast: number, complexity: number, overlap: boolean): boolean {
  const contrastMin = key === "colorFullLockup" ? COLOR_CONTRAST_MIN : CONTRAST_SCORE_MIN;
  return !overlap && safe >= SAFE_SCORE_MIN && contrast >= contrastMin && complexity <= COMPLEXITY_MAX;
}

function bestColor(scores: FinalLogoCandidateScore[]): FinalLogoCandidateScore | undefined {
  return scores.filter((score) => score.variantKey === "colorFullLockup").sort(compareCandidates)[0];
}

function needsLightVariant(score: FinalLogoCandidateScore, variants: FinalLogoVariantAsset[]): boolean {
  const missing = !variants.some((item) => item.key === "whiteLockup" || item.key === "monochromeLight");
  return missing && score.brightness < 0.38 && score.contrastScore < CONTRAST_SCORE_MIN;
}

function decisionReason(score: FinalLogoCandidateScore, usedPatch: boolean): string {
  const base = `Selected ${score.variantKey} at ${score.placementKey}: ${score.reason}.`;
  return usedPatch ? `${base} Minimal protection patch used as last resort.` : base;
}

function variantReason(score: FinalLogoCandidateScore, color: FinalLogoCandidateScore | undefined): string {
  if (score.variantKey === "colorFullLockup") return "selected colorFullLockup because it passed readability and preserves Yuanfang VI color identity.";
  if (score.variantKey === "whiteLockup") return `selected whiteLockup because colorFullLockup was not readable enough: ${rejectedColorReason(color)}.`;
  if (score.variantKey === "deepBlueLockup") return `selected deepBlueLockup as a readable adaptive full lockup: ${rejectedColorReason(color)}.`;
  return `selected low-priority monochrome fallback: ${rejectedColorReason(color)}.`;
}

function selectedBecause(score: FinalLogoCandidateScore, colorReadable: boolean, usedPatch: boolean): string {
  if (usedPatch) return "minimal_patch_last_resort";
  if (score.variantKey === "colorFullLockup") return score.placementKey === "topRight" ? "color_readable_brand_fidelity_preferred" : "moved_placement_to_preserve_color_logo";
  return colorReadable ? "adaptive_variant_won_tiebreak" : "adaptive_variant_color_not_readable";
}

function rejectedColorReason(color: FinalLogoCandidateScore | undefined): string | undefined {
  if (!color) return "colorFullLockup variant unavailable";
  if (color.readable) return undefined;
  return `colorFullLockup failed readability gate at ${color.placementKey}: safe=${color.safeScore}, contrast=${color.contrastScore}, complexity=${color.backgroundComplexity}, overlap=${color.overlapsTitle}`;
}

function noLogo(input: FinalLogoDecisionInput, reason: string, warning: string, scores: FinalLogoCandidateScore[] = []): FinalLogoDecisionResult {
  return {
    decision: {
      usedProtectionPatch: false,
      candidateScores: scores,
      logoDecisionReason: reason,
      logoStrategyHint: input.requestedLogo.logoStrategyHint,
    },
    warnings: [warning],
  };
}
