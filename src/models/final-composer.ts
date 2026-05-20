import type { BrandLogoVariantKey } from "@/config/brand";
import type { TitleAsset } from "@/models/title-asset";

export type FinalComposerSource = "final-composer-v1";

export type FinalComposerCanvas = {
  width: number;
  height: number;
};

export type FinalBackgroundAsset = {
  source: "generatedBackground" | "debugFixture" | "uploadedImage";
  input: Buffer;
  width: number;
  height: number;
  mimeType: "image/png" | "image/jpeg";
  sha256?: string;
};

export type FinalLogoVariantKey = BrandLogoVariantKey;

export type FinalLogoPlacementKey =
  | "topRight"
  | "topLeft"
  | "bottomRight"
  | "bottomLeft"
  | "upperRightSafe"
  | "upperLeftSafe";

export type FinalLogoProtectionMode = "none" | "minimalProtectionPatch";

export type FinalLogoPlacement = {
  key: FinalLogoPlacementKey;
  left: number;
  top: number;
  width: number;
  height: number;
};

export type FinalLogoVariantAsset = {
  key: FinalLogoVariantKey;
  input: Buffer;
  width: number;
  height: number;
  derived?: boolean;
  fullLockup: true;
};

export type FinalLogoCandidateScore = {
  variantKey: FinalLogoVariantKey;
  placementKey: FinalLogoPlacementKey;
  safeScore: number;
  contrastScore: number;
  brandFidelityScore: number;
  backgroundComplexity: number;
  brightness: number;
  edgeClutter: number;
  overlapsTitle: boolean;
  readable: boolean;
  reason: string;
};

export type FinalLogoDecision = {
  selectedLogoVariant?: FinalLogoVariantKey;
  logoPlacement?: FinalLogoPlacement;
  logoSafeScore?: number;
  logoContrastScore?: number;
  logoBrandFidelityScore?: number;
  logoBackgroundComplexity?: number;
  logoDecisionReason?: string;
  logoVariantReason?: string;
  colorLogoReadable?: boolean;
  selectedBecause?: string;
  rejectedColorReason?: string;
  usedProtectionPatch: boolean;
  protectionPatchReason?: string;
  protectionPatch?: {
    left: number;
    top: number;
    width: number;
    height: number;
    fill: string;
    opacity: number;
  };
  logoStrategyHint?: FinalLogoVariantKey | "repositionPreferred" | "minimalProtectionPatch";
  candidateScores: FinalLogoCandidateScore[];
};

export type FinalBrandLayerAsset = {
  input: Buffer;
  width: number;
  height: number;
  placementPolicy: "topRight" | "topLeft" | "optional" | "none";
  variantKey?: FinalLogoVariantKey;
  variantAssets?: FinalLogoVariantAsset[];
  logoStrategyHint?: FinalLogoDecision["logoStrategyHint"];
  fullLockup?: boolean;
};

export type FinalCampusInfoAsset = {
  enabled: boolean;
  input?: Buffer;
  width?: number;
  height?: number;
  placementPolicy?: "bottomBar" | "custom";
};

export type FinalCompositionPolicy = {
  respectTitleAssetBounds: true;
  doNotModifyTitleAsset: true;
  doNotReflowTitle: true;
  doNotRegenerateBackground: true;
  requireTitleAssetSafetyPassed: true;
  outputMimeType?: "image/jpeg" | "image/png";
  jpegQuality?: number;
};

export type FinalComposerInput = {
  canvas: FinalComposerCanvas;
  backgroundAsset: FinalBackgroundAsset;
  titleAsset: TitleAsset;
  brandAssets?: {
    logo?: FinalBrandLayerAsset;
    mascot?: FinalBrandLayerAsset;
  };
  campusInfoAsset?: FinalCampusInfoAsset;
  compositionPolicy: FinalCompositionPolicy;
};

export type FinalComposerLayerKind =
  | "background"
  | "titleAsset"
  | "logoProtectionPatch"
  | "logo"
  | "mascot"
  | "campusInfo";

export type FinalComposerLayerManifestItem = {
  layerId: string;
  kind: FinalComposerLayerKind;
  sourceId?: string;
  top: number;
  left: number;
  width: number;
  height: number;
  opacity: number;
  blendMode: "normal";
};

export type FinalComposerSafetyCheck = {
  code: string;
  passed: boolean;
  severity: "error" | "warning";
  reason: string;
};

export type FinalComposerResult = {
  source: FinalComposerSource;
  output?: {
    input: Buffer;
    width: number;
    height: number;
    mimeType: "image/jpeg" | "image/png";
    quality?: number;
    sha256: string;
    byteLength: number;
  };
  layerManifest: FinalComposerLayerManifestItem[];
  safety: {
    passed: boolean;
    checks: FinalComposerSafetyCheck[];
  };
  diagnostics: {
    layerOrder: string[];
    titleAssetSha256?: string;
    backgroundSha256?: string;
    outputPath?: string;
    selectedLogoVariant?: FinalLogoVariantKey;
    logoPlacement?: FinalLogoPlacement;
    logoSafeScore?: number;
    logoContrastScore?: number;
    logoBackgroundComplexity?: number;
    logoDecisionReason?: string;
    usedProtectionPatch?: boolean;
    protectionPatchReason?: string;
    candidateScores?: FinalLogoCandidateScore[];
    logoStrategyHint?: FinalLogoDecision["logoStrategyHint"];
    logoDecision?: FinalLogoDecision;
  };
  warnings: string[];
  reason: string;
};
