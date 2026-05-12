import {
  buildStandardPrompt,
  type StandardPromptInput,
} from "@/services/template.service";

const ERROR_STATUS: Record<string, number> = {
  INVALID_REQUEST: 400,
  INVALID_TEMPLATE_INPUT: 400,
  TEMPLATE_NOT_FOUND: 404,
  TEMPLATE_INVALID: 500,
  TEMPLATE_PREVIEW_ERROR: 500,
};

type PreviewPromptBody = {
  theme: string;
  style: string;
  element: string;
  designFamily?: string;
  layoutFamily?: string;
  displayPolicy?: string;
  productOutputType?: string;
  eventBrief?: string;
  styleBrief?: string;
  visualDetails?: string;
  avoidNotes?: string;
  visualBrief?: string;
  mainTitle: string;
  subtitle?: string;
  campusName: string;
  campusAddress?: string;
  campusPhone: string;
};

export async function POST(request: Request): Promise<Response> {
  const body = await parseJson(request);

  if (!isPreviewPromptBody(body)) {
    return errorResponse("INVALID_REQUEST");
  }

  const input = body as StandardPromptInput;

  try {
    return Response.json(buildStandardPrompt(input));
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

function isPreviewPromptBody(value: unknown): value is PreviewPromptBody {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isRequiredString(value.theme) &&
    isRequiredString(value.style) &&
    isRequiredString(value.element) &&
    isOptionalString(value.designFamily) &&
    isOptionalString(value.layoutFamily) &&
    isOptionalString(value.displayPolicy) &&
    isOptionalString(value.productOutputType) &&
    isOptionalString(value.eventBrief) &&
    isOptionalString(value.styleBrief) &&
    isOptionalString(value.visualDetails) &&
    isOptionalString(value.avoidNotes) &&
    isOptionalString(value.visualBrief) &&
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

function isOptionalString(value: unknown): boolean {
  return value === undefined || typeof value === "string";
}

function isRequiredString(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function errorCode(error: unknown): string {
  return error instanceof Error && ERROR_STATUS[error.message]
    ? error.message
    : "TEMPLATE_PREVIEW_ERROR";
}

function errorResponse(code: string): Response {
  return Response.json(
    { error: code },
    { status: ERROR_STATUS[code] ?? 500 },
  );
}
