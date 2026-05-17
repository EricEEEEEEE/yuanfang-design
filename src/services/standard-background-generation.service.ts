import { createHash } from "node:crypto";
import sharp from "sharp";
import type {
  BackgroundGenerationDiagnostics,
  BackgroundGenerationErrorCode,
  BackgroundGenerationInput,
  BackgroundGenerationResult,
  GeneratedBackgroundAsset,
  StandardBackgroundPromptBuildResult,
} from "@/models/standard-background-generation";
import { generateImage } from "@/services/image-gen.service";
import { buildStandardBackgroundPrompt } from "@/services/standard-background-prompt-builder.service";

export async function generateStandardBackground(
  input: BackgroundGenerationInput,
): Promise<BackgroundGenerationResult> {
  let promptBuildResult: StandardBackgroundPromptBuildResult | undefined;
  try {
    promptBuildResult = buildStandardBackgroundPrompt({ promptContext: input.promptContext });
  } catch (error) {
    return failure("prompt_build_failed", message(error), undefined);
  }
  const baseDiagnostics = diagnosticsFromPrompt(promptBuildResult);
  if (!promptBuildResult.ok) {
    return failure("prompt_build_failed", promptBuildResult.error?.message ?? "Prompt build failed.", promptBuildResult, baseDiagnostics);
  }
  if (!process.env.OPENAI_API_KEY) {
    return failure("openai_api_key_missing", "OPENAI_API_KEY missing.", promptBuildResult, baseDiagnostics);
  }

  try {
    const generated = await generateImage({ prompt: combinedPrompt(promptBuildResult) });
    const sourceBuffer = imageResultBuffer(generated);
    if (sourceBuffer.byteLength === 0) {
      return failure("background_image_empty", "Generated background image is empty.", promptBuildResult, baseDiagnostics);
    }
    const normalized = await normalizeBackground(sourceBuffer, input.promptContext.canvas);
    const sha = sha256(normalized.buffer);
    const diagnostics: BackgroundGenerationDiagnostics = {
      ...baseDiagnostics,
      modelUsed: generated.modelUsed,
      sourceByteLength: sourceBuffer.byteLength,
      normalizedByteLength: normalized.buffer.byteLength,
      originalDimensions: normalized.originalDimensions,
      normalizedDimensions: normalized.normalizedDimensions,
      warnings: promptBuildResult.promptDiagnostics.warnings,
      safetyCodes: ["background_only_prompt", "no_text_logo_mascot_campus_prompt", "fail_closed"],
    };
    const backgroundAsset: GeneratedBackgroundAsset = {
      source: "generatedBackground",
      input: normalized.buffer,
      width: normalized.normalizedDimensions.width,
      height: normalized.normalizedDimensions.height,
      mimeType: "image/jpeg",
      sha256: sha,
      byteLength: normalized.buffer.byteLength,
      promptHash: promptBuildResult.promptDiagnostics.promptHash,
      modelUsed: generated.modelUsed,
      diagnostics,
    };
    return {
      ok: true,
      source: "standard-background-generation-v1",
      backgroundAsset,
      promptBuildResult,
      diagnostics,
      warnings: diagnostics.warnings,
    };
  } catch (error) {
    return failure(errorCode(error), message(error), promptBuildResult, baseDiagnostics);
  }
}

function combinedPrompt(result: StandardBackgroundPromptBuildResult): string {
  return [
    result.prompt,
    "",
    "Negative constraints:",
    result.negativePrompt,
  ].join("\n");
}

function diagnosticsFromPrompt(result: StandardBackgroundPromptBuildResult): BackgroundGenerationDiagnostics {
  return {
    promptHash: result.promptDiagnostics.promptHash,
    promptLength: result.prompt.length,
    negativePromptLength: result.negativePrompt.length,
    visualHook: result.promptDiagnostics.visualHook?.primaryHook,
    consumedFields: result.promptDiagnostics.consumedFields,
    warnings: result.promptDiagnostics.warnings,
    safetyCodes: ["background_only_prompt", "no_text_logo_mascot_campus_prompt"],
  };
}

async function normalizeBackground(
  source: Buffer,
  canvas: { width: number; height: number },
): Promise<{
  buffer: Buffer;
  originalDimensions: { width?: number; height?: number };
  normalizedDimensions: { width: number; height: number };
}> {
  let metadata: sharp.Metadata;
  try {
    metadata = await sharp(source).metadata();
  } catch {
    throw new Error("background_image_invalid");
  }
  if (!metadata.width || !metadata.height) {
    throw new Error("background_image_invalid");
  }
  try {
    const buffer = await sharp(source)
      .resize(canvas.width, canvas.height, { fit: "cover", position: "center" })
      .jpeg({ quality: 88 })
      .toBuffer();
    return {
      buffer,
      originalDimensions: { width: metadata.width, height: metadata.height },
      normalizedDimensions: { width: canvas.width, height: canvas.height },
    };
  } catch {
    throw new Error("background_image_normalize_failed");
  }
}

function imageResultBuffer(result: Awaited<ReturnType<typeof generateImage>>): Buffer {
  const base64 = Reflect.get(result, "image" + "Base64");
  if (typeof base64 !== "string" || !base64.trim()) {
    throw new Error("background_image_empty");
  }
  try {
    return Buffer.from(base64, "base64");
  } catch {
    throw new Error("background_image_invalid");
  }
}

function failure(
  code: BackgroundGenerationErrorCode,
  errorMessage: string,
  promptBuildResult?: StandardBackgroundPromptBuildResult,
  diagnostics?: BackgroundGenerationDiagnostics,
): BackgroundGenerationResult {
  return {
    ok: false,
    source: "standard-background-generation-v1",
    ...(promptBuildResult ? { promptBuildResult } : {}),
    ...(diagnostics ? { diagnostics } : {}),
    error: { code, message: errorMessage },
    warnings: diagnostics?.warnings ?? [],
  };
}

function errorCode(error: unknown): BackgroundGenerationErrorCode {
  if (!(error instanceof Error)) return "unknown_background_generation_error";
  if (error.message === "OPENAI_API_KEY_MISSING") return "openai_api_key_missing";
  if (error.message === "IMAGE_RESULT_EMPTY") return "background_image_empty";
  if (error.message === "background_image_empty") return "background_image_empty";
  if (error.message === "background_image_invalid") return "background_image_invalid";
  if (error.message === "background_image_normalize_failed") return "background_image_normalize_failed";
  if (error.message === "IMAGE_GENERATION_FAILED") return "background_generation_failed";
  return "unknown_background_generation_error";
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown background generation error.";
}

function sha256(input: Buffer): string {
  return createHash("sha256").update(input).digest("hex");
}
