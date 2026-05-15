export type StandardGenerateV1Request = {
  mainTitle: string;
  subtitle?: string;
  keywords?: string[];
  sceneKey?: string;
  brandKey?: "yuanfangDefault";
  designFamily?: string;
  canvas?: {
    width?: number;
    height?: number;
  };
  background?: {
    mode: "debugFixture" | "uploadedImage" | "generated";
    imageBase64?: string;
    mimeType?: "image/png" | "image/jpeg";
  };
  options?: {
    includeLogo?: boolean;
    includeMascot?: boolean;
    includeCampusInfo?: boolean;
    outputMimeType?: "image/jpeg" | "image/png";
    jpegQuality?: number;
    debug?: boolean;
  };
};

export type StandardApiBoxSummary = { x: number; y: number; width: number; height: number };
export type StandardApiSpatialDiagnosticSummary = {
  backgroundLayoutSource?: string;
  backgroundLayoutReason?: string;
  backgroundLayoutFallbackReasonCode?: string;
  backgroundLayoutFallbackReason?: string;
  normalizationWarnings?: string[];
  spatialStrategySource?: string;
  spatialStrategyReason?: string;
  spatialFallbackReasonCode?: string;
  spatialFallbackReason?: string;
  primaryTextAnchorId?: string;
  negativeSpaceShape?: string;
  dominantFlow?: string;
  recommendedTitleFlow?: string;
  safeZones?: Array<StandardApiBoxSummary & { id: string; shape?: string; complexity?: string; confidence?: number }>;
  forbiddenZones?: Array<StandardApiBoxSummary & { id: string; reasonType?: string }>;
  textAnchors?: Array<StandardApiBoxSummary & { id: string; safeZoneId?: string; preferredOrientation?: string; priority?: number; confidence?: number }>;
};
export type StandardApiForbiddenOverlapSummary = {
  zoneId: string;
  target: "lockupBox" | "unitBox" | "subtitleBox";
  text?: string;
  overlapArea: number;
  overlapRatio: number;
};
export type StandardApiCandidateDiagnosticSummary = {
  candidateId: string;
  sourceCandidateId?: string;
  isFallbackCandidate?: boolean;
  recommendedAction?: string;
  shouldReject?: boolean;
  rejectionReasonCode?: string;
  lockupBox?: StandardApiBoxSummary;
  unitBoxes?: Array<StandardApiBoxSummary & { text: string; rotationDeg?: number }>;
  subtitleBox?: StandardApiBoxSummary | null;
  forbiddenOverlapSummary?: StandardApiForbiddenOverlapSummary[];
};

export type StandardGenerateV1Response = {
  ok: boolean;
  source: "standard-generation-api-v1";
  requestId: string;
  output?: {
    mimeType: "image/jpeg" | "image/png";
    base64: string;
    width: number;
    height: number;
    sha256: string;
    byteLength: number;
  };
  diagnostics?: {
    candidateSource?: string;
    spatialSource?: string;
    pipelineSource?: string;
    finalCandidatePoolIds?: string[];
    recommendedCandidateIds?: string[];
    rejectedCandidateIds?: string[];
    rejectionReasonCodes?: string[];
    spatialDiagnostic?: StandardApiSpatialDiagnosticSummary;
    candidateDiagnostics?: StandardApiCandidateDiagnosticSummary[];
    selectedCandidateId?: string;
    selectedSourceCandidateId?: string;
    layerOrder?: string[];
    titleAssetId?: string;
    warnings?: string[];
  };
  safety?: {
    passed: boolean;
    codes: string[];
  };
  error?: {
    code: string;
    message: string;
  };
  reason: string;
};

export type StandardGenerateV1ErrorCode =
  | "invalid_json"
  | "invalid_request"
  | "missing_main_title"
  | "invalid_canvas"
  | "invalid_background"
  | "uploaded_image_not_implemented"
  | "generated_background_not_supported_in_v1"
  | "campus_info_asset_not_supported_in_v1"
  | "generation_failed"
  | "standard_generation_api_v1_error";
