import { generateImage } from "@/services/image-gen.service";

const ERROR_STATUS: Record<string, number> = {
  INVALID_REQUEST: 400,
  OPENAI_API_KEY_MISSING: 500,
  IMAGE_GENERATION_FAILED: 500,
  IMAGE_RESULT_EMPTY: 500,
  TEST_IMAGE_ERROR: 500,
};

type TestImageBody = {
  prompt: string;
};

export async function POST(request: Request): Promise<Response> {
  const body = await parseJson(request);

  if (!isTestImageBody(body)) {
    return errorResponse("INVALID_REQUEST");
  }

  try {
    return Response.json(await generateImage({ prompt: body.prompt }));
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

function isTestImageBody(value: unknown): value is TestImageBody {
  return (
    isRecord(value) &&
    typeof value.prompt === "string" &&
    value.prompt.trim().length > 0
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function errorCode(error: unknown): string {
  return error instanceof Error && ERROR_STATUS[error.message]
    ? error.message
    : "TEST_IMAGE_ERROR";
}

function errorResponse(code: string): Response {
  return Response.json(
    { error: code },
    { status: ERROR_STATUS[code] ?? 500 },
  );
}
