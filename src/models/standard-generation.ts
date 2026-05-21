import type {
  FinalBackgroundAsset,
  FinalBrandLayerAsset,
  FinalCampusInfoAsset,
  FinalComposerResult,
} from "@/models/final-composer";
import type { TitleAssetHandoffResult } from "@/models/title-asset";
import type {
  GenerateScoredRefinedTitleCandidatesInput,
  GenerateScoredRefinedTitleCandidatesResult,
} from "@/use-cases/generate-scored-refined-title-candidates.use-case";
import type { TitleHierarchyContext } from "@/models/title-hierarchy-context";

export type StandardGenerationSource = "standard-generation-integration-v1";

export type StandardGenerationCanvas = {
  width: number;
  height: number;
};

export type StandardGenerationRequest = {
  mainTitle: string;
  subtitle?: string;
  keywords?: string[];
  sceneKey?: string;
  brandKey?: "yuanfangDefault";
  designFamily?: string;
  layoutFamily?: string;
  displayPolicy?: string;
  productOutputType?: string;
  eventBrief?: string;
  styleBrief?: string;
  visualDetails?: string;
  avoidNotes?: string;
  titleHierarchyContext?: TitleHierarchyContext;
};

export type StandardGenerationCandidateStrategy =
  | "topRecommended"
  | "manualCandidateId";

export type StandardGenerationInput = {
  canvas: StandardGenerationCanvas;
  request: StandardGenerationRequest;
  backgroundAsset: FinalBackgroundAsset;
  brandAssets?: {
    logo?: FinalBrandLayerAsset;
    mascot?: FinalBrandLayerAsset;
  };
  campusInfoAsset?: FinalCampusInfoAsset;
  options?: {
    titleCandidateStrategy?: StandardGenerationCandidateStrategy;
    manualCandidateId?: string;
    includeLogo?: boolean;
    includeMascot?: boolean;
    includeCampusInfo?: boolean;
    outputMimeType?: "image/jpeg" | "image/png";
    jpegQuality?: number;
    debug?: boolean;
  };
  dependencies?: {
    generateTitleCandidatePipeline?: (
      input: GenerateScoredRefinedTitleCandidatesInput,
    ) => Promise<GenerateScoredRefinedTitleCandidatesResult>;
    pipelineFixtureReason?: string;
  };
};

export type StandardGenerationSafetyCheck = {
  code: string;
  passed: boolean;
  severity: "error" | "warning";
  reason: string;
};

export type StandardGenerationCandidateLineage = {
  candidateId?: string;
  sourceCandidateId?: string;
  inFinalPool: boolean;
  recommended: boolean;
  fallback: boolean;
  rejected: boolean;
  sourceTraceable: boolean;
  sourceShouldReject?: boolean;
  sourceRecommendedAction?: string;
  sourceRejectionReasonCode?: string;
  rejectionCode: string;
  productionEligible: boolean;
};

export type StandardGenerationMeasuredCandidateAttempt = {
  attemptedCandidateId: string;
  baseCandidateId?: string;
  retryEligible: boolean;
  measuredTitleAssetRatio?: number;
  measuredFinalTitleRatio?: number;
  glyphOccupancyInsideUnitBox?: number;
  glyphOccupancyInsideLockup?: number;
  renderScaleAdjustmentApplied?: boolean;
  renderSizingBlockedReason?: string;
  titleStylePreset?: string;
  contrastTreatmentApplied?: boolean;
  hierarchyTreatmentApplied?: boolean;
  titleStyleAttempted?: boolean;
  titleStyleApplied?: boolean;
  titleStyleFallbackUsed?: boolean;
  titleStyleFallbackReason?: string;
  styledMeasuredTitleAssetRatio?: number;
  baselineMeasuredTitleAssetRatio?: number;
  styleMeasuredDelta?: number;
  selectedRenderVariant?: "styled" | "baseline" | "none";
  measuredPass: boolean;
  failReason?: string;
  selectedByMeasuredRetry?: boolean;
};

export type StandardGenerationResult = {
  source: StandardGenerationSource | "diagnostic-only";
  output?: FinalComposerResult["output"];
  finalComposerResult?: FinalComposerResult;
  titleAssetResult?: TitleAssetHandoffResult;
  titleCandidatePipelineResult?: GenerateScoredRefinedTitleCandidatesResult;
  selectedCandidateId?: string;
  selectedSourceCandidateId?: string;
  diagnostics: {
    backgroundSource?: string;
    backgroundSha256?: string;
    candidatePipelineSource?: string;
    spatialStrategySource?: string;
    finalCandidatePoolIds: string[];
    recommendedCandidateIds: string[];
    attemptedCandidateIds: string[];
    measuredCandidateAttempts?: StandardGenerationMeasuredCandidateAttempt[];
    selectedByMeasuredRetry?: boolean;
    retryCount?: number;
    noMeasuredSafeTitleCandidate?: boolean;
    selectedTitleCandidateId?: string;
    titleAssetId?: string;
    finalOutputSha256?: string;
    layerOrder?: string[];
    titleAssetFailureReasons: string[];
    selectedLineage?: StandardGenerationCandidateLineage;
    pipelineFixtureUsed?: boolean;
    pipelineFixtureReason?: string;
    blueprintScale?: {
      fromCanvas: StandardGenerationCanvas;
      toCanvas: StandardGenerationCanvas;
      scaleX: number;
      scaleY: number;
    };
    titleJoinAfterScale?: "PASS" | "FAIL" | "NOT_RUN";
    warnings: string[];
  };
  safety: {
    passed: boolean;
    checks: StandardGenerationSafetyCheck[];
  };
  warnings: string[];
  reason: string;
};
