import {
  generateTitleCandidates,
  type GenerateTitleCandidatesInput,
} from "@/services/title-candidate.service";

const ERROR_STATUS: Record<string, number> = {
  INVALID_REQUEST: 400,
  TEST_API_DISABLED: 403,
  TEST_TITLE_CANDIDATES_ERROR: 500,
};

type TestTitleCandidatesBody = {
  backgroundImageBase64: string;
  mainTitle: string;
  subtitle?: string;
  designFamily?: string;
  layoutFamily?: string;
  displayPolicy?: string;
  productOutputType?: string;
  eventBrief?: string;
  styleBrief?: string;
  visualDetails?: string;
  avoidNotes?: string;
};

export async function POST(request: Request): Promise<Response> {
  if (process.env.ENABLE_TEST_GENERATE_API !== "true") {
    return errorResponse("TEST_API_DISABLED");
  }

  const body = await parseJson(request);

  if (!isTestTitleCandidatesBody(body)) {
    return errorResponse("INVALID_REQUEST");
  }

  try {
    return Response.json(await generateTitleCandidates(body));
  } catch {
    return errorResponse("TEST_TITLE_CANDIDATES_ERROR");
  }
}

async function parseJson(request: Request): Promise<unknown | null> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

function isTestTitleCandidatesBody(
  value: unknown,
): value is GenerateTitleCandidatesInput & TestTitleCandidatesBody {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isRequiredString(value.backgroundImageBase64) &&
    isRequiredString(value.mainTitle) &&
    isOptionalString(value.subtitle) &&
    isOptionalString(value.designFamily) &&
    isOptionalString(value.layoutFamily) &&
    isOptionalString(value.displayPolicy) &&
    isOptionalString(value.productOutputType) &&
    isOptionalString(value.eventBrief) &&
    isOptionalString(value.styleBrief) &&
    isOptionalString(value.visualDetails) &&
    isOptionalString(value.avoidNotes)
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

function errorResponse(code: string): Response {
  return Response.json(
    { error: code },
    { status: ERROR_STATUS[code] ?? 500 },
  );
}
