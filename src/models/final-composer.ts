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

export type FinalBrandLayerAsset = {
  input: Buffer;
  width: number;
  height: number;
  placementPolicy: "topRight" | "topLeft" | "optional" | "none";
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
  };
  warnings: string[];
  reason: string;
};
