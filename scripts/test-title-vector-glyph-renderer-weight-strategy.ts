import type { TitleLockupBlueprint } from "../src/config/title-lockup-blueprint";
import {
  DEFAULT_TITLE_FONT_FALLBACK,
  TITLE_FONT_REGISTRY,
} from "../src/config/title-font-registry";
import type { VectorGlyphRenderInput } from "../src/models/title-vector-glyph-renderer";
import { renderTitleVectorGlyph } from "../src/services/title-vector-glyph-renderer.service";

const lockupBox = { x: 300, y: 150, width: 420, height: 560, safePadding: 24, allowedOverflowPx: 0 };
const collisionPolicy = { strategy: "reject" as const, minGapPx: 12, avoidLogo: true, avoidMascot: true, avoidMainSubject: true };
const forbiddenZonePolicy = { forbiddenZoneIds: [], allowOverlap: false as const, onConflict: "reject" as const };

const blueprint: TitleLockupBlueprint = {
  candidateId: "weight-strategy-manual",
  spatialAnchorId: "manual-center-column",
  semanticSplitId: "threeStep",
  mainTitle: "成长汇报课",
  compositionMode: "verticalHeroStack",
  flowAxis: "vertical",
  orientationPreference: "verticalFirst",
  patternKeys: ["manual-weight-strategy"],
  effectIntent: "verify output target and font embedding gates",
  decorationIntents: [],
  spatialContract: {
    spatialAnchorId: "manual-center-column",
    anchorBox: { x: 260, y: 120, width: 500, height: 660 },
    lockupBox,
    flowAxis: "vertical",
    secondaryAnchorDefaultUsage: "subtitleOrAuxiliaryOnly",
    collisionPolicy,
    forbiddenZonePolicy,
    notes: ["Manual local fixture for renderer strategy contract."],
  },
  lockupBox,
  titleUnits: [
    {
      text: "成长",
      semanticRole: "lead",
      visualRole: "lead",
      unitBox: { x: 360, y: 190, width: 300, height: 96, maxWidth: 300, maxHeight: 96, rotationDeg: 0 },
      direction: "horizontal",
      visualWeight: 0.75,
      alignment: "center",
      readingOrder: 1,
      allowEmphasis: true,
    },
    {
      text: "汇报",
      semanticRole: "hero",
      visualRole: "hero",
      unitBox: { x: 330, y: 310, width: 360, height: 126, maxWidth: 360, maxHeight: 126, rotationDeg: 0 },
      direction: "horizontal",
      visualWeight: 1,
      alignment: "center",
      readingOrder: 2,
      allowEmphasis: true,
    },
    {
      text: "课",
      semanticRole: "accent",
      visualRole: "accent",
      unitBox: { x: 390, y: 460, width: 240, height: 86, maxWidth: 240, maxHeight: 86, rotationDeg: 0 },
      direction: "horizontal",
      visualWeight: 0.68,
      alignment: "center",
      readingOrder: 3,
      allowEmphasis: true,
    },
  ],
  subtitleLockup: {
    text: "看见孩子的表达力量",
    placementPolicy: "belowMainLockup",
    subtitleBox: { x: 350, y: 610, width: 320, height: 56, maxWidth: 320, maxHeight: 56, rotationDeg: 0 },
    visualWeight: 0.45,
    readingOrder: 4,
  },
  collisionPolicy,
  forbiddenZonePolicy,
  readingOrder: ["成长", "汇报", "课"],
  isFallbackCandidate: false,
  reason: "Manual fixture verifies output target, font embedding, size budget, and production safety gates.",
};

const input: VectorGlyphRenderInput = {
  source: "manual",
  blueprint,
  canvas: { width: 1000, height: 1000 },
  titleStylePreset: "achievement",
  brandStyle: "yuanfangDefault",
  fontRegistry: TITLE_FONT_REGISTRY,
  fontFallback: DEFAULT_TITLE_FONT_FALLBACK,
  renderMode: "production",
  outputFormat: "svg",
  outputTarget: "standaloneSvg",
  fontEmbedMode: "full",
};

const result = renderTitleVectorGlyph(input);
const productionFullEmbedBlocked = result.safety.checks.find((check) => check.code === "production_full_font_embed_blocked");
const rasterMeasurementRequired = result.safety.checks.find((check) => check.code === "raster_measurement_required_for_production");
const measurementResult = renderTitleVectorGlyph({
  ...input,
  renderMode: "debug",
  outputTarget: "measurementSvg",
  fontEmbedMode: undefined,
});

console.log("VECTOR_WEIGHT_STRATEGY_SOURCE", result.source);
console.log("VECTOR_WEIGHT_OUTPUT_TARGET", result.outputTarget);
console.log("VECTOR_WEIGHT_FONT_EMBED_MODE", result.fontEmbedMode);
console.log("VECTOR_WEIGHT_SVG_LENGTH", result.svg?.length ?? 0);
console.log("VECTOR_WEIGHT_SIZE_BUDGET_STATUS", result.sizeBudget.status);
console.log("VECTOR_WEIGHT_PRODUCTION_FULL_EMBED_BLOCKED", productionFullEmbedBlocked?.passed === false ? "YES" : "NO");
console.log("VECTOR_WEIGHT_RASTER_MEASUREMENT_REQUIRED", rasterMeasurementRequired?.passed === false ? "YES" : "NO");
console.log("VECTOR_WEIGHT_FONT_CACHE_KEY_PREVIEW", result.fontCacheKeyPreview.join(" | "));
console.log("VECTOR_WEIGHT_MEASUREMENT_OUTPUT_TARGET", measurementResult.outputTarget);
console.log("VECTOR_WEIGHT_MEASUREMENT_FONT_EMBED_MODE", measurementResult.fontEmbedMode);
console.log("VECTOR_WEIGHT_MEASUREMENT_SVG_LENGTH", measurementResult.svg?.length ?? 0);
console.log("VECTOR_WEIGHT_MEASUREMENT_SIZE_BUDGET_STATUS", measurementResult.sizeBudget.status);
console.log("VECTOR_WEIGHT_WARNINGS", JSON.stringify(result.warnings));
console.log("VECTOR_WEIGHT_SAFETY_CHECKS", JSON.stringify(result.safety.checks));
console.log("VECTOR_WEIGHT_REASON", result.reason);
