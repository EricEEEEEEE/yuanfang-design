import type { TitleBox } from "@/config/title-lockup-blueprint";

export type TitleVisualMetricSource = "measured" | "estimated" | "proxy" | "missing";

export type TitleVisualQualityMetricSources = {
  lockupBox: TitleVisualMetricSource;
  titleAssetVisibleBox: TitleVisualMetricSource;
  mainTitleVisibleBox: TitleVisualMetricSource;
  subtitleVisibleBox: TitleVisualMetricSource;
  contrast: TitleVisualMetricSource;
  backgroundIntegration: TitleVisualMetricSource;
};

export type TitleVisualQualityOverlayMetadata = {
  canvasBox: TitleBox;
  lockupBox?: TitleBox;
  titleAssetVisibleBox?: TitleBox;
  mainTitleVisibleBox?: TitleBox;
  subtitleBox?: TitleBox;
  logoBox?: TitleBox;
  forbiddenZones: Array<TitleBox & { id: string; reasonType: string }>;
};

export type TitleVisualQualityDiagnostics = {
  source: "title-visual-quality-diagnostics-v1";
  sampleId: string;
  sampleName: string;
  selectedCandidateId: string;
  sourceCandidateId?: string;
  mainTitle: string;
  subtitle?: string;
  canvasWidth: number;
  canvasHeight: number;
  lockupBox?: TitleBox;
  lockupBoxAreaRatio: number;
  titleAssetVisibleBox?: TitleBox;
  titleAssetVisibleAreaRatio: number;
  mainTitleVisibleBox?: TitleBox;
  mainTitleAreaRatio: number;
  subtitleVisibleBox?: TitleBox;
  subtitleAreaRatio: number;
  subtitleVisible: boolean;
  titleCenter?: { x: number; y: number };
  titlePlacementRegion: string;
  titleToCanvasWidthRatio: number;
  titleToCanvasHeightRatio: number;
  targetLockupAreaRatio: number;
  minAcceptableLockupAreaRatio: number;
  minimumScalePassed: boolean;
  estimatedTitleDominanceScore: number;
  estimatedHierarchyScore: number;
  estimatedSubtitleSupportScore: number;
  estimatedReadabilityScore: number;
  estimatedContrastScore: number;
  estimatedBackgroundIntegrationScore: number;
  metricSources: TitleVisualQualityMetricSources;
  overlayMetadata: TitleVisualQualityOverlayMetadata;
  warnings: string[];
  failReasons: string[];
  recommendation: string;
};

export type TitleVisualQualityCompactRow = {
  sampleId: string;
  selectedCandidateId: string;
  titleAssetVisibleAreaRatio: number;
  lockupBoxAreaRatio: number;
  subtitleVisible: boolean;
  minimumScalePassed: boolean;
  estimatedTitleDominanceScore: number;
  warnings: string[];
  recommendation: string;
};
