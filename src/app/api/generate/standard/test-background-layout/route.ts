import {
  analyzeBackgroundLayout,
  type BackgroundLayoutAnalysisInput,
} from "@/services/background-layout-intelligence.service";

const ERROR_STATUS: Record<string, number> = {
  INVALID_REQUEST: 400,
  TEST_API_DISABLED: 403,
  TEST_BACKGROUND_LAYOUT_ERROR: 500,
};

type TestBackgroundLayoutBody = {
  backgroundImageBase64: string;
  designFamily?: string;
  layoutFamily?: string;
  productOutputType?: string;
  eventBrief?: string;
  visualDetails?: string;
  avoidNotes?: string;
};

export async function POST(request: Request): Promise<Response> {
  if (process.env.ENABLE_TEST_GENERATE_API !== "true") {
    return errorResponse("TEST_API_DISABLED");
  }

  const body = await parseJson(request);

  if (!isTestBackgroundLayoutBody(body)) {
    return errorResponse("INVALID_REQUEST");
  }

  try {
    return Response.json(await analyzeBackgroundLayout(body));
  } catch {
    return errorResponse("TEST_BACKGROUND_LAYOUT_ERROR");
  }
}

async function parseJson(request: Request): Promise<unknown | null> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

function isTestBackgroundLayoutBody(
  value: unknown,
): value is BackgroundLayoutAnalysisInput & TestBackgroundLayoutBody {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isRequiredString(value.backgroundImageBase64) &&
    isOptionalString(value.designFamily) &&
    isOptionalString(value.layoutFamily) &&
    isOptionalString(value.productOutputType) &&
    isOptionalString(value.eventBrief) &&
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
