import type {
  FinalBrandLayerAsset,
  FinalLogoCandidateScore,
  FinalLogoDecision,
  FinalLogoPlacement,
  FinalLogoVariantAsset,
  FinalLogoVariantKey,
} from "@/models/final-composer";
import {
  clamp,
  contrastScore,
  rawBackground,
  regionMetrics,
  round,
  type LogoRawImage,
  type LogoRegionMetrics,
} from "@/services/helpers/final-composer-logo-metrics";
import {
  expand,
  intersects,
  LOGO_PATCH_PADDING,
  patchFor,
  placementCandidates,
  placementPrior,
  type LogoBox,
} from "@/services/helpers/final-composer-logo-placement";

const SAFE_SCORE_MIN = 0.62;
const CONTRAST_SCORE_MIN = 0.42;
const COMPLEXITY_MAX = 0.72;

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
  const selected = [...scores].sort((left, right) => right.safeScore - left.safeScore)[0];
  const selectedVariant = variants.find((variant) => variant.key === selected?.variantKey);
  const selectedPlacement = places.find((place) => place.key === selected?.placementKey);
  if (!selected || !selectedVariant || !selectedPlacement) {
    return noLogo(input, "No inside-canvas logo placement was available.", "logo omitted; no inside-canvas logo placement was available.", scores);
  }

  const usedPatch = selected.safeScore < SAFE_SCORE_MIN || selected.contrastScore < CONTRAST_SCORE_MIN || selected.backgroundComplexity > COMPLEXITY_MAX;
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
      logoBackgroundComplexity: round(selected.backgroundComplexity),
      logoDecisionReason: decisionReason(selected, usedPatch),
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
  const prior = variantPrior(variant.key, metrics, hint) + placementPrior(place.key, hint);
  const safe = clamp(contrast * 0.46 + (1 - metrics.complexity) * 0.28 + (1 - metrics.edgeDensity) * 0.16 + prior - (overlap ? 0.45 : 0));
  return {
    variantKey: variant.key,
    placementKey: place.key,
    safeScore: round(safe),
    contrastScore: round(contrast),
    backgroundComplexity: round(metrics.complexity),
    brightness: round(metrics.brightness / 255),
    edgeClutter: round(metrics.edgeDensity),
    overlapsTitle: overlap,
    reason: `brightness=${Math.round(metrics.brightness)} complexity=${round(metrics.complexity)} contrast=${round(contrast)}`,
  };
}

function variantPrior(key: FinalLogoVariantKey, m: LogoRegionMetrics, hint: FinalBrandLayerAsset["logoStrategyHint"]): number {
  let score = hint === key ? 0.1 : 0;
  if (m.brightness < 95 && (key === "whiteLockup" || key === "monochromeLight")) score += 0.12;
  if (m.brightness > 165 && m.warmth > 6 && key === "deepBlueLockup") score += 0.16;
  if (m.brightness > 165 && m.warmth > 6 && key === "colorFullLockup") score -= 0.04;
  if (m.brightness > 185 && m.complexity < 0.32 && key === "colorFullLockup") score += 0.08;
  if (m.brightness > 205 && key === "monochromeDark") score += 0.04;
  return score;
}

function needsLightVariant(score: FinalLogoCandidateScore, variants: FinalLogoVariantAsset[]): boolean {
  const missing = !variants.some((item) => item.key === "whiteLockup" || item.key === "monochromeLight");
  return missing && score.brightness < 0.38 && score.contrastScore < CONTRAST_SCORE_MIN;
}

function decisionReason(score: FinalLogoCandidateScore, usedPatch: boolean): string {
  const base = `Selected ${score.variantKey} at ${score.placementKey}: ${score.reason}.`;
  return usedPatch ? `${base} Minimal protection patch used as last resort.` : base;
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
