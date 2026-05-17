import { BRAND } from "@/config/brand";
import type { BackgroundGenerationErrorCode, GeneratedBackgroundAsset, StandardImagePromptContext } from "@/models/standard-background-generation";
import type { StandardGenerationInput } from "@/models/standard-generation";
import type {
  StandardGenerateV2Diagnostics,
  StandardGenerateV2ErrorCode,
  StandardGenerateV2GeneratedBackgroundDiagnostics,
  StandardGenerateV2Request,
} from "@/models/standard-generation-api-v2";
import { generateStandardBackground } from "@/services/standard-background-generation.service";
import { createFormV2DebugBackgroundAsset } from "./fixtures";
import { detectVisualHook } from "./diagnostics";

export type StandardV2BackgroundResolution =
  | {
      ok: true;
      mode: "debugFixture" | "generated";
      backgroundAsset: StandardGenerationInput["backgroundAsset"];
      generatedBackground?: StandardGenerateV2GeneratedBackgroundDiagnostics;
      warnings: string[];
    }
  | {
      ok: false;
      status: number;
      code: StandardGenerateV2ErrorCode;
      message: string;
      diagnostics?: StandardGenerateV2Diagnostics;
    };

export async function resolveStandardV2Background(
  request: StandardGenerateV2Request,
  canvas: { width: number; height: number },
): Promise<StandardV2BackgroundResolution> {
  const mode = request.background?.mode ?? "debugFixture";
  if (mode === "debugFixture") {
    return { ok: true, mode, backgroundAsset: await createFormV2DebugBackgroundAsset(canvas), warnings: [] };
  }
  if (mode === "uploadedImage") {
    return fail(400, "unsupported_background_mode", "uploadedImage background is not supported in Standard API v2.");
  }
  if (mode !== "generated") {
    return fail(400, "unsupported_background_mode", "Unsupported background mode.");
  }

  const result = await generateStandardBackground({
    mode: "generated",
    promptContext: toPromptContext(request, canvas),
    failClosed: true,
  });
  const generatedBackground = summarizeGeneratedBackground(result);
  if (!result.ok || !result.backgroundAsset) {
    return fail(422, apiErrorCode(result.error?.code), result.error?.message ?? "Generated background failed closed.", {
      generatedBackground,
      warnings: generatedBackground.warnings ?? [],
    });
  }
  return {
    ok: true,
    mode,
    backgroundAsset: result.backgroundAsset,
    generatedBackground,
    warnings: result.warnings ?? [],
  };
}

function toPromptContext(request: StandardGenerateV2Request, canvas: { width: number; height: number }): StandardImagePromptContext {
  const hook = detectVisualHook(request);
  return {
    source: "standard-form-v2",
    brandKey: request.brandKey ?? "yuanfangDefault",
    canvas,
    form: request.form,
    title: request.title,
    visualHook: {
      primaryHook: hook.detectedPrimaryHook,
      source: hook.source,
      possibleMismatch: hook.possibleMismatch,
      mismatchReason: hook.mismatchReason,
    },
    brand: {
      brandName: BRAND.name,
      brandEnglishName: BRAND.englishName,
      palette: BRAND.colors,
      visualMotifs: ["literary growth", "reading", "education", "warm brand trust"],
      logoPolicy: "Logo is composed later by the system; reserve safe area only.",
      mascotPolicy: "Mascot is composed later by the system when enabled; do not generate it.",
      campusPolicy: "Campus info is a separate composed asset when enabled later; do not generate contact text.",
    },
    constraints: {
      forbidReadableText: true,
      forbidLogoGeneration: true,
      forbidMascotGeneration: true,
      forbidCampusTextGeneration: true,
      reserveTitleSpace: true,
      reserveLogoSpace: true,
      reserveMascotSpace: request.options?.includeMascot === true,
      reserveCampusInfoSpace: false,
    },
    avoidNotes: request.form.avoidNotes,
    outputIntent: { backgroundOnly: true, finalPoster: false },
  };
}

function summarizeGeneratedBackground(result: Awaited<ReturnType<typeof generateStandardBackground>>): StandardGenerateV2GeneratedBackgroundDiagnostics {
  const asset = result.backgroundAsset as GeneratedBackgroundAsset | undefined;
  return {
    source: result.source,
    promptHash: result.diagnostics?.promptHash,
    modelUsed: result.diagnostics?.modelUsed,
    byteLength: asset?.byteLength ?? result.diagnostics?.normalizedByteLength,
    sha256: asset?.sha256,
    originalDimensions: result.diagnostics?.originalDimensions,
    normalizedDimensions: result.diagnostics?.normalizedDimensions,
    warnings: result.warnings,
    safetyCodes: result.diagnostics?.safetyCodes,
    errorCode: result.error?.code,
    errorMessage: result.error?.message,
  };
}

function apiErrorCode(code: BackgroundGenerationErrorCode | undefined): StandardGenerateV2ErrorCode {
  if (!code) return "unknown_background_generation_error";
  return code === "openai_api_key_missing" ? "openai_api_key_missing" : code;
}

function fail(status: number, code: StandardGenerateV2ErrorCode, message: string, diagnostics?: StandardGenerateV2Diagnostics): StandardV2BackgroundResolution {
  return { ok: false, status, code, message, diagnostics };
}
