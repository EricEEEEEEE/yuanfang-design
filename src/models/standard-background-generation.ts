import type {
  StandardFormV2Input,
  StandardFormV2ProductOutputType,
  StandardFormV2TitleInput,
} from "@/models/standard-generation-api-v2";

export type StandardImagePromptContext = {
  source: "standard-form-v2";
  brandKey: "yuanfangDefault";
  canvas: { width: number; height: number };
  form: StandardFormV2Input;
  title: StandardFormV2TitleInput;
  visualHook?: {
    primaryHook?: string;
    source?: "mainTitle" | "subtitle" | "titleBrief" | "eventBrief" | "manual" | "none";
    possibleMismatch?: boolean;
    mismatchReason?: string;
  };
  brand: {
    brandName: string;
    brandEnglishName?: string;
    palette?: Record<string, string>;
    visualMotifs?: string[];
    logoPolicy: string;
    mascotPolicy: string;
    campusPolicy: string;
  };
  constraints: {
    forbidReadableText: true;
    forbidLogoGeneration: true;
    forbidMascotGeneration: true;
    forbidCampusTextGeneration: true;
    reserveTitleSpace: true;
    reserveLogoSpace: true;
    reserveMascotSpace?: boolean;
    reserveCampusInfoSpace?: boolean;
  };
  avoidNotes?: string;
  outputIntent: {
    backgroundOnly: true;
    finalPoster: false;
  };
};

export type StandardBackgroundPromptBuildInput = {
  promptContext: StandardImagePromptContext;
  templateMode?: "standard-v2";
  promptVersion?: string;
};

export type StandardBackgroundPromptBuildResult = {
  ok: boolean;
  source: "standard-background-prompt-builder-v1";
  prompt: string;
  negativePrompt: string;
  promptDiagnostics: {
    promptVersion: string;
    promptHash: string;
    consumedFields: string[];
    usedBrandRules: string[];
    usedTemplateSources: string[];
    visualHook?: StandardImagePromptContext["visualHook"];
    backgroundOnly: true;
    forbiddenGeneratedElements: string[];
    warnings: string[];
  };
  error?: {
    code: "invalid_prompt_context" | "template_load_failed";
    message: string;
  };
};

export type GeneratedBackgroundAsset = {
  source: "generatedBackground";
  input: Buffer;
  width: number;
  height: number;
  mimeType: "image/jpeg" | "image/png";
  sha256: string;
  byteLength?: number;
  promptHash?: string;
  modelUsed?: string;
  diagnostics?: Record<string, unknown>;
};

export type BackgroundGenerationInput = {
  mode: "generated";
  promptContext: StandardImagePromptContext;
  modelOptions?: {
    model?: string;
    quality?: "low" | "medium" | "high";
    size?: string;
  };
  failClosed: true;
};

export type BackgroundGenerationErrorCode =
  | "prompt_build_failed"
  | "openai_api_key_missing"
  | "background_generation_failed"
  | "background_image_empty"
  | "background_image_invalid"
  | "background_image_normalize_failed"
  | "unknown_background_generation_error";

export type BackgroundGenerationError = {
  code: BackgroundGenerationErrorCode;
  message: string;
};

export type BackgroundGenerationDiagnostics = {
  promptHash?: string;
  promptLength?: number;
  negativePromptLength?: number;
  modelUsed?: string;
  sourceByteLength?: number;
  normalizedByteLength?: number;
  originalDimensions?: { width?: number; height?: number };
  normalizedDimensions?: { width: number; height: number };
  visualHook?: string;
  consumedFields?: string[];
  warnings?: string[];
  safetyCodes?: string[];
};

export type BackgroundGenerationResult = {
  ok: boolean;
  source: "standard-background-generation-v1";
  backgroundAsset?: GeneratedBackgroundAsset;
  promptBuildResult?: StandardBackgroundPromptBuildResult;
  diagnostics?: BackgroundGenerationDiagnostics;
  error?: BackgroundGenerationError;
  warnings?: string[];
};

export type StandardBackgroundPromptIntent = {
  productOutputType: StandardFormV2ProductOutputType;
  designFamily?: string;
  layoutFamily?: string;
  displayPolicy?: string;
};
