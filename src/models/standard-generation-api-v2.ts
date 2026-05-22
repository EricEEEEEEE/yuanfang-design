export type StandardGenerateV2Source = "standard-api-v2";
export type StandardFormV2ProductOutputType =
  | "achievementShowcase"
  | "enrollment"
  | "festival"
  | "classReview"
  | "parentNotice"
  | "socialPost";

export type StandardFormV2Input = {
  productOutputType: StandardFormV2ProductOutputType;
  eventBrief: string;
  styleBrief: string;
  visualDetails?: string;
  titleBrief: string;
  avoidNotes?: string;
};

export type StandardFormV2TitleInput = {
  mainTitle: string;
  subtitle?: string;
  titleEmphasisWords?: string[];
};

export type StandardFormV2Background = {
  mode: "debugFixture" | "generated" | "uploadedImage";
};

export type StandardFormV2Options = {
  includeLogo?: boolean;
  includeMascot?: boolean;
  includeCampusInfo?: boolean;
  outputMimeType?: "image/jpeg";
  jpegQuality?: number;
  debug?: boolean;
};

export type StandardGenerateV2Request = {
  source?: "standard-form-v2";
  brandKey?: "yuanfangDefault";
  canvas?: { width: number; height: number };
  form: StandardFormV2Input;
  title: StandardFormV2TitleInput;
  background?: StandardFormV2Background;
  options?: StandardFormV2Options;
};

export type StandardGenerateV2Output = {
  mimeType: "image/jpeg";
  base64: string;
  width: number;
  height: number;
  sha256: string;
  byteLength: number;
};

export type StandardGenerateV2FieldConsumption = "consumed" | "partially_consumed" | "diagnostic_only";

export type StandardGenerateV2ProductQualityDiagnostics = {
  outputQualityMode: "debug_fixture_smoke" | "generated_background_candidate" | "product_quality_candidate";
  backgroundMode: StandardFormV2Background["mode"];
  backgroundLimitation: string;
  formFieldConsumption: {
    productOutputType: "consumed";
    eventBrief: StandardGenerateV2FieldConsumption;
    styleBrief: StandardGenerateV2FieldConsumption;
    visualDetails: StandardGenerateV2FieldConsumption;
    titleBrief: StandardGenerateV2FieldConsumption;
    avoidNotes: StandardGenerateV2FieldConsumption;
    titleEmphasisWords: StandardGenerateV2FieldConsumption;
  };
  visualHook: {
    detectedPrimaryHook?: string;
    detectedPrimaryMessage?: string;
    source: "mainTitle" | "subtitle" | "titleBrief" | "eventBrief" | "visualDetails" | "manual" | "none";
    hookSource?: "mainTitle" | "subtitle" | "titleBrief" | "eventBrief" | "visualDetails" | "manual" | "none";
    mainTitle: string;
    subtitle?: string;
    possibleMismatch: boolean;
    mainTitleMismatch?: boolean;
    titleHierarchyRisk?: "none" | "medium" | "high";
    mismatchReason?: string;
  };
  semanticAlignment: {
    requestedThemeHints: string[];
    backgroundCanReflectTheme: boolean;
    titleCanReflectTheme: boolean;
    limitationReason: string;
  };
  intentDiagnostics: {
    productOutputType?: string;
    designFamily?: string;
    contentIntent?: string;
    sceneKey?: string;
    patternHints?: string[];
  };
  titleDiagnostics: {
    selectedCandidateId?: string;
    selectedSourceCandidateId?: string;
    titleFocus?: string;
    subtitleUsedAsSupport?: boolean;
    titleBriefInfluence?: "strong" | "partial" | "weak" | "none";
  };
  warnings: string[];
};

export type StandardGenerateV2GeneratedBackgroundDiagnostics = {
  source?: "standard-background-generation-v1";
  promptHash?: string;
  modelUsed?: string;
  byteLength?: number;
  sha256?: string;
  originalDimensions?: { width?: number; height?: number };
  normalizedDimensions?: { width: number; height: number };
  warnings?: string[];
  safetyCodes?: string[];
  errorCode?: string;
  errorMessage?: string;
};

export type StandardGenerateV2Diagnostics = {
  selectedCandidateId?: string;
  selectedSourceCandidateId?: string;
  candidateSource?: string;
  spatialSource?: string;
  backgroundLayoutSource?: string;
  formMappingSummary?: Record<string, unknown>;
  productQualityDiagnostics?: StandardGenerateV2ProductQualityDiagnostics;
  generatedBackground?: StandardGenerateV2GeneratedBackgroundDiagnostics;
  warnings?: string[];
};

export type StandardGenerateV2Safety = {
  passed: boolean;
  codes: string[];
};

export type StandardGenerateV2ErrorCode =
  | "invalid_json"
  | "invalid_request"
  | "missing_main_title"
  | "invalid_title_length"
  | "invalid_product_output_type"
  | "event_brief_too_short"
  | "style_brief_too_short"
  | "avoid_notes_too_long"
  | "unsupported_background_mode"
  | "campus_info_not_supported"
  | "prompt_build_failed"
  | "background_generation_failed"
  | "background_image_empty"
  | "background_image_invalid"
  | "background_image_normalize_failed"
  | "unknown_background_generation_error"
  | "generation_fail_closed"
  | "no_output"
  | "openai_api_key_missing"
  | "insufficient_credit"
  | "credit_gate_unavailable"
  | "unauthorized"
  | "internal_error";

export type StandardGenerateV2Error = {
  code: StandardGenerateV2ErrorCode;
  message: string;
  userMessage: string;
};

export type StandardGenerateV2Response = {
  ok: boolean;
  source: StandardGenerateV2Source;
  requestId: string;
  output?: StandardGenerateV2Output;
  diagnostics?: StandardGenerateV2Diagnostics;
  safety?: StandardGenerateV2Safety;
  error?: StandardGenerateV2Error;
  reason: string;
};
