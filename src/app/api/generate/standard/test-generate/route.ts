import { generateImage } from "@/services/image-gen.service";
import {
  buildStandardPrompt,
  type StandardPromptInput,
} from "@/services/template.service";

const ERROR_STATUS: Record<string, number> = {
  INVALID_REQUEST: 400,
  INVALID_TEMPLATE_INPUT: 400,
  TEMPLATE_NOT_FOUND: 404,
  TEMPLATE_INVALID: 500,
  OPENAI_API_KEY_MISSING: 500,
  IMAGE_GENERATION_FAILED: 500,
  IMAGE_RESULT_EMPTY: 500,
  STANDARD_TEST_GENERATE_ERROR: 500,
};

type StandardTestGenerateBody = {
  theme: string;
  style: string;
  element: string;
  mainTitle: string;
  subtitle?: string;
  campusName: string;
  campusAddress?: string;
  campusPhone: string;
};

export async function POST(request: Request): Promise<Response> {
  const body = await parseJson(request);

  if (!isStandardTestGenerateBody(body)) {
    return errorResponse("INVALID_REQUEST");
  }

  const input = body as StandardPromptInput;

  try {
    const promptResult = buildStandardPrompt(input);
    const imageResult = await generateImage({ prompt: promptResult.prompt });

    return Response.json({
      ...imageResult,
      prompt: promptResult.prompt,
      overlayData: promptResult.overlayData,
      templateMeta: promptResult.templateMeta,
    });
  } catch (error) {
    return errorResponse(errorCode(error));
  }
}

async function parseJson(request: Request): Promise<unknown | null> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

function isStandardTestGenerateBody(
  value: unknown,
): value is StandardTestGenerateBody {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isRequiredString(value.theme) &&
    isRequiredString(value.style) &&
    isRequiredString(value.element) &&
    isRequiredString(value.mainTitle) &&
    isRequiredString(value.campusName) &&
    isRequiredString(value.campusPhone) &&
    isOptionalString(value.subtitle) &&
    isOptionalString(value.campusAddress)
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isRequiredString(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function isOptionalString(value: unknown): boolean {
  return value === undefined || typeof value === "string";
}

function errorCode(error: unknown): string {
  return error instanceof Error && ERROR_STATUS[error.message]
    ? error.message
    : "STANDARD_TEST_GENERATE_ERROR";
}

function errorResponse(code: string): Response {
  return Response.json(
    { error: code },
    { status: ERROR_STATUS[code] ?? 500 },
  );
}
